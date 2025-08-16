import json
import logging
import os
from datetime import datetime
from flask import request, jsonify


def save_novel_to_project():
    """保存小说内容到temp/{project_name}/novels文件夹"""
    try:
        data = request.json
        if not data or 'content' not in data:
            return jsonify({'error': 'No content provided'}), 400
        
        content = data['content']
        project_name = data.get('projectName', 'default')
        title = data.get('title', f'小说_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
        
        # 创建项目专用的novels目录
        project_novels_dir = os.path.join('temp', project_name, 'novels')
        os.makedirs(project_novels_dir, exist_ok=True)
        
        # 保存小说内容
        novel_filename = f"{title}.txt"
        novel_path = os.path.join(project_novels_dir, novel_filename)
        
        with open(novel_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # 保存小说信息
        info_data = {
            'title': title,
            'filename': novel_filename,
            'project_name': project_name,
            'content_length': len(content),
            'saved_at': datetime.now().isoformat()
        }
        
        info_path = os.path.join(project_novels_dir, f"{title}_info.json")
        with open(info_path, 'w', encoding='utf-8') as f:
            json.dump(info_data, f, ensure_ascii=False, indent=2)
        
        # 更新小说索引
        update_novel_index(project_name, title, info_data)
        
        logging.info(f"Novel '{title}' saved successfully to project {project_name}")
        return jsonify({
            'message': f'Novel saved successfully to project {project_name}',
            'title': title,
            'filename': novel_filename,
            'local_path': f'/temp/{project_name}/novels/{novel_filename}'
        }), 200
        
    except Exception as e:
        logging.error(f'Error saving novel: {e}')
        return jsonify({'error': str(e)}), 500


def save_prompt_to_project():
    """保存提示词到temp/{project_name}/prompts文件夹"""
    try:
        data = request.json
        if not data or 'content' not in data:
            return jsonify({'error': 'No content provided'}), 400
        
        content = data['content']
        project_name = data.get('projectName', 'default')
        title = data.get('title', f'提示词_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
        
        # 创建项目专用的prompts目录
        project_prompts_dir = os.path.join('temp', project_name, 'prompts')
        os.makedirs(project_prompts_dir, exist_ok=True)
        
        # 保存提示词内容
        prompt_filename = f"{title}.txt"
        prompt_path = os.path.join(project_prompts_dir, prompt_filename)
        
        with open(prompt_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # 保存提示词信息
        info_data = {
            'title': title,
            'filename': prompt_filename,
            'project_name': project_name,
            'content_length': len(content),
            'saved_at': datetime.now().isoformat()
        }
        
        info_path = os.path.join(project_prompts_dir, f"{title}_info.json")
        with open(info_path, 'w', encoding='utf-8') as f:
            json.dump(info_data, f, ensure_ascii=False, indent=2)
        
        # 更新提示词索引
        update_prompt_index(project_name, title, info_data)
        
        logging.info(f"Prompt '{title}' saved successfully to project {project_name}")
        return jsonify({
            'message': f'Prompt saved successfully to project {project_name}',
            'title': title,
            'filename': prompt_filename,
            'local_path': f'/temp/{project_name}/prompts/{prompt_filename}'
        }), 200
        
    except Exception as e:
        logging.error(f'Error saving prompt: {e}')
        return jsonify({'error': str(e)}), 500


def update_novel_index(project_name, title, info_data):
    """更新小说索引文件"""
    try:
        project_novels_dir = os.path.join('temp', project_name, 'novels')
        index_path = os.path.join(project_novels_dir, 'novel_index.json')
        
        # 读取现有索引
        novel_index = {}
        if os.path.exists(index_path):
            with open(index_path, 'r', encoding='utf-8') as f:
                novel_index = json.load(f)
        
        # 更新索引
        novel_index[title] = info_data
        
        # 保存索引
        with open(index_path, 'w', encoding='utf-8') as f:
            json.dump(novel_index, f, ensure_ascii=False, indent=2)
            
    except Exception as e:
        logging.error(f'Error updating novel index for project {project_name}: {e}')


def update_prompt_index(project_name, title, info_data):
    """更新提示词索引文件"""
    try:
        project_prompts_dir = os.path.join('temp', project_name, 'prompts')
        index_path = os.path.join(project_prompts_dir, 'prompt_index.json')
        
        # 读取现有索引
        prompt_index = {}
        if os.path.exists(index_path):
            with open(index_path, 'r', encoding='utf-8') as f:
                prompt_index = json.load(f)
        
        # 更新索引
        prompt_index[title] = info_data
        
        # 保存索引
        with open(index_path, 'w', encoding='utf-8') as f:
            json.dump(prompt_index, f, ensure_ascii=False, indent=2)
            
    except Exception as e:
        logging.error(f'Error updating prompt index for project {project_name}: {e}')


def load_project_novels(project_name='default'):
    """加载项目的所有小说"""
    try:
        project_novels_dir = os.path.join('temp', project_name, 'novels')
        index_path = os.path.join(project_novels_dir, 'novel_index.json')
        
        if not os.path.exists(index_path):
            return jsonify({}), 200
        
        with open(index_path, 'r', encoding='utf-8') as f:
            novel_index = json.load(f)
        
        logging.info(f"Novels loaded successfully from project {project_name}: {len(novel_index)} novels")
        return jsonify(novel_index), 200
        
    except Exception as e:
        logging.error(f'Error loading novels from project {project_name}: {e}')
        return jsonify({'error': str(e)}), 500


def load_project_prompts(project_name='default'):
    """加载项目的所有提示词"""
    try:
        project_prompts_dir = os.path.join('temp', project_name, 'prompts')
        index_path = os.path.join(project_prompts_dir, 'prompt_index.json')
        
        if not os.path.exists(index_path):
            return jsonify({}), 200
        
        with open(index_path, 'r', encoding='utf-8') as f:
            prompt_index = json.load(f)
        
        logging.info(f"Prompts loaded successfully from project {project_name}: {len(prompt_index)} prompts")
        return jsonify(prompt_index), 200
        
    except Exception as e:
        logging.error(f'Error loading prompts from project {project_name}: {e}')
        return jsonify({'error': str(e)}), 500