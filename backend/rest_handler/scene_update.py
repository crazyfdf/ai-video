import json
import logging
import os
from flask import request, jsonify
from backend.util.file_util import get_project_dir


def update_single_scene(scene_index):
    """
    更新单个scene文件
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        project_name = data.get('projectName')
        if not project_name:
            return jsonify({"error": "Project name is required"}), 400
        
        # 获取 scene 目录
        scene_dir = get_project_dir(project_name, 'scene')
        
        # 确保目录存在
        os.makedirs(scene_dir, exist_ok=True)
        
        # scene文件路径
        scene_file_path = os.path.join(scene_dir, f'scene_{scene_index}.json')
        
        # 读取现有的scene文件，如果不存在则创建新的
        scene_data = {}
        if os.path.exists(scene_file_path):
            try:
                with open(scene_file_path, 'r', encoding='utf-8') as f:
                    scene_data = json.load(f)
            except Exception as e:
                logging.warning(f"Failed to read existing scene file {scene_file_path}: {e}")
                scene_data = {}
        
        # 更新scene数据
        if 'elements_layout' in data:
            scene_data['elements_layout'] = data['elements_layout']
        
        if 'required_elements' in data:
            scene_data['required_elements'] = data['required_elements']
        
        # 如果有图片数据，也保存到scene文件中
        if 'images' in data:
            scene_data['images'] = data['images']
        
        # 如果有生成信息，也保存到scene文件中
        if 'generation_info' in data:
            scene_data['generation_info'] = data['generation_info']
        
        # 保存更新后的scene文件
        with open(scene_file_path, 'w', encoding='utf-8') as f:
            json.dump(scene_data, f, ensure_ascii=False, indent=2)
        
        logging.info(f"Successfully updated scene file: {scene_file_path}")
        
        return jsonify({
            "success": True,
            "message": f"Scene {scene_index} updated successfully",
            "scene_file": f"scene_{scene_index}.json"
        })
        
    except Exception as e:
        logging.error(f"Error updating scene {scene_index}: {str(e)}")
        return jsonify({"error": str(e)}), 500