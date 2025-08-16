import json
import logging
import os
from flask import request, jsonify

from backend.util.constant import character_dir

def save_character_info():
    """保存角色信息到temp/{project_name}/character文件夹"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        project_name = data.get('projectName', 'default')
        
        # 创建项目专用的character目录
        project_character_dir = os.path.join('temp', project_name, 'character')
        os.makedirs(project_character_dir, exist_ok=True)
        
        # 保存完整的角色信息
        character_info_path = os.path.join(project_character_dir, 'character_info.json')
        with open(character_info_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        # 保存故事梗概
        if 'summary' in data:
            summary_path = os.path.join(project_character_dir, 'story_summary.txt')
            with open(summary_path, 'w', encoding='utf-8') as f:
                f.write(data['summary'])
        
        # 保存每个角色的详细信息
        if 'characters' in data:
            for i, character in enumerate(data['characters']):
                char_file_path = os.path.join(project_character_dir, f'character_{i}.json')
                with open(char_file_path, 'w', encoding='utf-8') as f:
                    json.dump(character, f, ensure_ascii=False, indent=2)
        
        logging.info(f"Character info saved successfully to project {project_name}")
        return jsonify({'message': f'Character info saved successfully to project {project_name}'}), 200
        
    except Exception as e:
        logging.error(f'Error saving character info: {e}')
        return jsonify({'error': str(e)}), 500

def load_character_info():
    """从temp/character文件夹加载角色信息"""
    try:
        character_info_path = os.path.join(character_dir, 'character_info.json')
        
        if not os.path.exists(character_info_path):
            return jsonify({'summary': '', 'characters': []}), 200
        
        with open(character_info_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        logging.info(f"Character info loaded successfully")
        return jsonify(data), 200
        
    except Exception as e:
        logging.error(f'Error loading character info: {e}')
        return jsonify({'error': str(e)}), 500

def save_story_info():
    """保存故事信息（兼容性接口）"""
    return save_character_info()

def save_wan22_character_info():
    """保存ComfyUI WAN2.2格式的角色信息"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # 确保character目录存在
        os.makedirs(character_dir, exist_ok=True)
        
        # 保存WAN2.2格式的角色信息
        wan22_character_path = os.path.join(character_dir, 'wan22_character_info.json')
        with open(wan22_character_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        # 保存每个角色的WAN2.2 LoRA格式描述
        if 'characters' in data:
            for i, character in enumerate(data['characters']):
                # 保存原始角色信息
                char_file_path = os.path.join(character_dir, f'wan22_character_{i}.json')
                with open(char_file_path, 'w', encoding='utf-8') as f:
                    json.dump(character, f, ensure_ascii=False, indent=2)
                
                # 保存LoRA格式的提示词
                if 'lora_prompt' in character:
                    lora_file_path = os.path.join(character_dir, f'character_{i}_lora.txt')
                    with open(lora_file_path, 'w', encoding='utf-8') as f:
                        f.write(character['lora_prompt'])
        
        logging.info(f"WAN2.2 character info saved successfully")
        return jsonify({'message': 'WAN2.2 character info saved successfully'}), 200
        
    except Exception as e:
        logging.error(f'Error saving WAN2.2 character info: {e}')
        return jsonify({'error': str(e)}), 500

def load_wan22_character_info():
    """加载ComfyUI WAN2.2格式的角色信息"""
    try:
        wan22_character_path = os.path.join(character_dir, 'wan22_character_info.json')
        
        if not os.path.exists(wan22_character_path):
            return jsonify({'summary': '', 'characters': []}), 200
        
        with open(wan22_character_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        logging.info(f"WAN2.2 character info loaded successfully")
        return jsonify(data), 200
        
    except Exception as e:
        logging.error(f'Error loading WAN2.2 character info: {e}')
        return jsonify({'error': str(e)}), 500