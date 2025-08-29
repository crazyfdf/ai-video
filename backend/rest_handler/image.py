import asyncio
import logging
import os
import re

from flask import jsonify, request

from backend.image.image import generate_image, generate_images_single
from backend.util.constant import image_dir, prompts_en_dir
from backend.util.file import make_dir, read_lines_from_directory, remove_all
from backend.rest_handler.comfyui_lora_manager import save_image_to_comfyui_recipe


def handle_error(message, err):
    return jsonify({"error": message}), 500


async def async_generate_images(lines):
    try:
        await generate_image(lines)
    except Exception as e:
        logging.error(e)
        raise e


async def async_generate_image_single(content, index):
    try:
        await generate_images_single(
            content,
            index,
        )
    except Exception as e:
        logging.error(e)
        raise


def generate_images():
    try:
        remove_all(image_dir)
        make_dir(image_dir)
    except Exception as e:
        return handle_error("Failed to manage directory", e)
    try:
        lines, err = read_lines_from_directory(prompts_en_dir)
        if err:
            return handle_error("Failed to read fragments", err)
        asyncio.run(async_generate_images(lines))
    except Exception as e:
        return handle_error("Failed to read fragments", e)
    return jsonify({"status": "Image generation started"}), 200


def save_generated_image_to_recipe():
    """将生成的主体图保存到ComfyUI-LoRA-Manager的Recipes中"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        image_path = data.get('image_path')
        recipe_name = data.get('recipe_name')
        prompt = data.get('prompt', '')
        negative_prompt = data.get('negative_prompt', '')
        
        if not image_path or not recipe_name:
            return jsonify({"error": "image_path and recipe_name are required"}), 400
        
        # 检查图片文件是否存在
        if not os.path.exists(image_path):
            return jsonify({"error": "Image file not found"}), 404
        
        # 准备元数据
        metadata = {
            'prompt': prompt,
            'negative_prompt': negative_prompt,
            'source': 'novel2video_generated',
            'timestamp': str(int(asyncio.get_event_loop().time()))
        }
        
        # 调用ComfyUI LoRA Manager的API保存图片到Recipe
        result = save_image_to_comfyui_recipe()
        
        if result and result[1] == 200:
            return jsonify({
                "status": "success",
                "message": f"Image saved to recipe '{recipe_name}' successfully"
            }), 200
        else:
            return jsonify({
                "status": "error", 
                "message": "Failed to save image to ComfyUI LoRA Manager"
            }), 500
            
    except Exception as e:
        logging.error(f"Error saving image to recipe: {e}")
        return jsonify({"error": str(e)}), 500


def get_local_images():
    try:
        files = os.listdir(image_dir)
    except Exception as e:
        return jsonify({"error": "Failed to read image directory"}), 500

    image_map = {}
    for file in files:
        if not os.path.isdir(file):
            matches = re.match(r"(\d+)\.png", file)
            if matches:
                key = matches.group(1)
                abs_path = os.path.join("/images", file)
                image_map[key] = abs_path

    return jsonify(image_map), 200


def generate_single_image():
    try:
        req = request.get_json()
        if not req or "index" not in req or "content" not in req:
            return jsonify({"error": "parse request body failed"}), 400
        file = os.path.join("/images", str(req["index"]) + ".png")
        asyncio.run(async_generate_image_single(req["content"], req["index"]))
    except Exception as e:
        return handle_error("Failed to read fragments", e)
    return jsonify({"status": "Image generation started", "url": file}), 200
