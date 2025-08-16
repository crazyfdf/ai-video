import json
import os
from flask import request, jsonify
import logging

# 数据文件路径
SCENE_LORA_FILE = 'temp/scene_loras.json'

def save_scene_lora():
    """保存分镜LoRA选择"""
    try:
        data = request.get_json()
        scene_index = data.get('scene_index')
        lora = data.get('lora', '')
        
        logging.info(f"Saving scene LoRA: scene_index={scene_index}, lora={lora}")
        
        # 确保temp目录存在
        os.makedirs('temp', exist_ok=True)
        
        # 加载现有数据
        scene_loras = {}
        if os.path.exists(SCENE_LORA_FILE):
            try:
                with open(SCENE_LORA_FILE, 'r', encoding='utf-8') as f:
                    scene_loras = json.load(f)
            except (json.JSONDecodeError, FileNotFoundError):
                scene_loras = {}
        
        # 更新数据
        scene_loras[str(scene_index)] = lora
        
        # 保存数据
        with open(SCENE_LORA_FILE, 'w', encoding='utf-8') as f:
            json.dump(scene_loras, f, ensure_ascii=False, indent=2)
        
        logging.info(f"Scene LoRA saved successfully for scene {scene_index}")
        return jsonify({'success': True, 'message': 'Scene LoRA saved successfully'})
        
    except Exception as e:
        logging.error(f"Error saving scene LoRA: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

def load_scene_loras():
    """加载所有分镜LoRA选择"""
    try:
        if not os.path.exists(SCENE_LORA_FILE):
            logging.info("Scene LoRA file not found, returning empty data")
            return jsonify({})
        
        with open(SCENE_LORA_FILE, 'r', encoding='utf-8') as f:
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
        return jsonify({'error': str(e)}), 500