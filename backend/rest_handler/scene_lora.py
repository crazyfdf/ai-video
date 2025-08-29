import json
import logging
import os

from flask import jsonify, request
from backend.util.constant import get_project_dir

# 数据文件路径（动态获取）
# SCENE_LORA_FILE = "temp/scene_loras.json"  # 已弃用，使用动态路径


def save_scene_lora():
    """保存分镜LoRA选择"""
    try:
        data = request.get_json()
        scene_index = data.get("scene_index")
        lora = data.get("lora", "")
        project_name = data.get("projectName")
        if not project_name:
            return jsonify({"success": False, "error": "Project name is required"}), 400

        logging.info(f"Saving scene LoRA: scene_index={scene_index}, lora={lora}")

        # 获取项目文件路径
        project_dir = get_project_dir(project_name, '')
        scene_lora_file = os.path.join(project_dir, 'scene_loras.json')
        os.makedirs(os.path.dirname(scene_lora_file), exist_ok=True)

        # 加载现有数据
        scene_loras = {}
        if os.path.exists(scene_lora_file):
            try:
                with open(scene_lora_file, "r", encoding="utf-8") as f:
                    scene_loras = json.load(f)
            except (json.JSONDecodeError, FileNotFoundError):
                scene_loras = {}

        # 更新数据
        scene_loras[str(scene_index)] = lora

        # 保存数据
        with open(scene_lora_file, "w", encoding="utf-8") as f:
            json.dump(scene_loras, f, ensure_ascii=False, indent=2)

        logging.info(f"Scene LoRA saved successfully for scene {scene_index}")
        return jsonify({"success": True, "message": "Scene LoRA saved successfully"})

    except Exception as e:
        logging.error(f"Error saving scene LoRA: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


def load_scene_loras():
    """加载所有分镜LoRA选择"""
    try:
        project_name = request.args.get('projectName')
        if not project_name:
            return jsonify({"error": "Project name is required"}), 400
        project_dir = get_project_dir(project_name, '')
        scene_lora_file = os.path.join(project_dir, 'scene_loras.json')
        if not os.path.exists(scene_lora_file):
            logging.info("Scene LoRA file not found, returning empty data")
            return jsonify({})

        with open(scene_lora_file, "r", encoding="utf-8") as f:
            scene_loras = json.load(f)

        # 转换键为整数（前端需要）
        result = {}
        for key, value in scene_loras.items():
            try:
                result[int(key)] = value
            except ValueError:
                # 如果键不能转换为整数，跳过
                continue

        logging.info(f"Loaded scene LoRAs: {result}")
        return jsonify(result)

    except Exception as e:
        logging.error(f"Error loading scene LoRAs: {str(e)}")
        return jsonify({"error": str(e)}), 500
