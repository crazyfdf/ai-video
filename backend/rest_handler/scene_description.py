import json
import logging
import os
import time
from datetime import datetime
from flask import request, jsonify

# 创建scene_descriptions目录路径
scene_descriptions_dir = os.path.join('temp', 'scene_descriptions')

def save_scene_descriptions():
    """保存所有画面描述到temp/{project_name}/scene_descriptions文件夹"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # 支持新的数据格式（包含projectName）和旧格式（直接是数组）
        if isinstance(data, list):
            descriptions = data
            project_name = 'default'
        else:
            descriptions = data.get('descriptions', [])
            project_name = data.get('projectName', 'default')
        
        if not descriptions or not isinstance(descriptions, list):
            return jsonify({'error': 'Invalid descriptions data provided'}), 400
        
        # 创建项目专用的scene_descriptions目录
        project_scene_dir = os.path.join('temp', project_name, 'scene_descriptions')
        os.makedirs(project_scene_dir, exist_ok=True)
        
        # 保存每个描述到单独的文件
        for i, description in enumerate(descriptions):
            desc_file_path = os.path.join(project_scene_dir, f'{i}.txt')
            with open(desc_file_path, 'w', encoding='utf-8') as f:
                f.write(description)
        
        # 保存完整的描述列表
        all_descriptions_path = os.path.join(project_scene_dir, 'all_descriptions.json')
        with open(all_descriptions_path, 'w', encoding='utf-8') as f:
            json.dump(descriptions, f, ensure_ascii=False, indent=2)
        
        logging.info(f"Scene descriptions saved successfully to project {project_name}: {len(descriptions)} descriptions")
        return jsonify({'message': f'Scene descriptions saved successfully to project {project_name}: {len(descriptions)} descriptions'}), 200
        
    except Exception as e:
        logging.error(f'Error saving scene descriptions: {e}')
        return jsonify({'error': str(e)}), 500

def load_scene_descriptions():
    """从temp/scene_descriptions文件夹加载画面描述"""
    try:
        all_descriptions_path = os.path.join(scene_descriptions_dir, 'all_descriptions.json')
        
        if not os.path.exists(all_descriptions_path):
            # 如果没有完整文件，尝试从单个文件加载
            descriptions = []
            if os.path.exists(scene_descriptions_dir):
                files = [f for f in os.listdir(scene_descriptions_dir) if f.endswith('.txt')]
                files.sort(key=lambda x: int(x.split('.')[0]) if x.split('.')[0].isdigit() else 0)
                
                for file in files:
                    file_path = os.path.join(scene_descriptions_dir, file)
                    with open(file_path, 'r', encoding='utf-8') as f:
                        descriptions.append(f.read())
            
            return jsonify(descriptions), 200
        
        with open(all_descriptions_path, 'r', encoding='utf-8') as f:
            descriptions = json.load(f)
        
        logging.info(f"Scene descriptions loaded successfully: {len(descriptions)} descriptions")
        return jsonify(descriptions), 200
        
    except Exception as e:
        logging.error(f'Error loading scene descriptions: {e}')
        return jsonify({'error': str(e)}), 500

def save_single_scene_description():
    """保存单个画面描述"""
    try:
        data = request.json
        if not data or 'index' not in data or 'description' not in data:
            return jsonify({'error': 'Invalid data provided'}), 400
        
        index = data['index']
        description = data['description']
        
        # 确保scene_descriptions目录存在
        os.makedirs(scene_descriptions_dir, exist_ok=True)
        
        # 保存单个描述文件
        desc_file_path = os.path.join(scene_descriptions_dir, f'{index}.txt')
        with open(desc_file_path, 'w', encoding='utf-8') as f:
            f.write(description)
        
        # 更新完整的描述列表
        all_descriptions_path = os.path.join(scene_descriptions_dir, 'all_descriptions.json')
        descriptions = []
        
        if os.path.exists(all_descriptions_path):
            with open(all_descriptions_path, 'r', encoding='utf-8') as f:
                descriptions = json.load(f)
        
        # 确保列表足够长
        while len(descriptions) <= index:
            descriptions.append('')
        
        descriptions[index] = description
    try:
        elements_path = os.path.join(scene_descriptions_dir, 'storyboard_elements.json')
        if not os.path.exists(elements_path):
            return jsonify([]), 200
        with open(elements_path, 'r', encoding='utf-8') as f:
            elements = json.load(f)
        return jsonify(elements), 200
    except Exception as e:
        logging.error(f'Error loading storyboard elements: {e}')
        return jsonify({'error': str(e)}), 500


def save_two_step_generation_data():
    """保存两步骤生成的数据（分镜脚本和WAN2.2提示词）"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # 确保scene_descriptions目录存在
        os.makedirs(scene_descriptions_dir, exist_ok=True)
        
        # 保存分镜脚本数据
        if 'storyboards' in data:
            storyboards_path = os.path.join(scene_descriptions_dir, 'storyboards.json')
            with open(storyboards_path, 'w', encoding='utf-8') as f:
                json.dump(data['storyboards'], f, ensure_ascii=False, indent=2)
            
            # 保存每个分镜脚本到单独文件
            for i, storyboard in enumerate(data['storyboards']):
                storyboard_file_path = os.path.join(scene_descriptions_dir, f'storyboard_{i}.txt')
                with open(storyboard_file_path, 'w', encoding='utf-8') as f:
                    f.write(storyboard)
        
        # 保存WAN2.2提示词数据
        if 'wan22_prompts' in data:
            wan22_path = os.path.join(scene_descriptions_dir, 'wan22_prompts.json')
            with open(wan22_path, 'w', encoding='utf-8') as f:
                json.dump(data['wan22_prompts'], f, ensure_ascii=False, indent=2)
            
            # 保存每个WAN2.2提示词到单独文件
            for i, prompt in enumerate(data['wan22_prompts']):
                prompt_file_path = os.path.join(scene_descriptions_dir, f'wan22_{i}.txt')
                with open(prompt_file_path, 'w', encoding='utf-8') as f:
                    f.write(prompt)
        
        # 保存完整的两步骤数据
        full_data_path = os.path.join(scene_descriptions_dir, 'two_step_generation.json')
        with open(full_data_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        logging.info(f"Two-step generation data saved successfully")
        return jsonify({'message': 'Two-step generation data saved successfully'}), 200
        
    except Exception as e:
        logging.error(f'Error saving two-step generation data: {e}')
        return jsonify({'error': str(e)}), 500

def load_two_step_generation_data():
    """加载两步骤生成的数据"""
    try:
        full_data_path = os.path.join(scene_descriptions_dir, 'two_step_generation.json')
        
        if not os.path.exists(full_data_path):
            return jsonify({'storyboards': [], 'wan22_prompts': []}), 200
        
        with open(full_data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        logging.info(f"Two-step generation data loaded successfully")
        return jsonify(data), 200
        
    except Exception as e:
        logging.error(f'Error loading two-step generation data: {e}')
        return jsonify({'error': str(e)}), 500

def save_complete_storyboard_data():
    """保存完整的分镜数据"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # 确保scene_descriptions目录存在
        os.makedirs(scene_descriptions_dir, exist_ok=True)
        
        # 保存完整的分镜数据
        complete_data_path = os.path.join(scene_descriptions_dir, 'complete_storyboard.json')
        with open(complete_data_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        # 保存每个场景到单独文件
        if 'scenes' in data:
            for i, scene in enumerate(data['scenes']):
                scene_file_path = os.path.join(scene_descriptions_dir, f'scene_{i+1}.json')
                with open(scene_file_path, 'w', encoding='utf-8') as f:
                    json.dump(scene, f, ensure_ascii=False, indent=2)
        
        # 保存原始AI响应
        if 'raw_ai_response' in data:
            raw_response_path = os.path.join(scene_descriptions_dir, 'raw_ai_response.txt')
            with open(raw_response_path, 'w', encoding='utf-8') as f:
                f.write(data['raw_ai_response'])
        
        logging.info(f"Complete storyboard data saved successfully")
        return jsonify({'message': 'Complete storyboard data saved successfully'}), 200
        
    except Exception as e:
        logging.error(f'Error saving complete storyboard data: {e}')
        return jsonify({'error': str(e)}), 500

def save_raw_ai_response():
    """保存原始AI响应"""
    try:
        data = request.json
        if not data or 'raw_response' not in data:
            return jsonify({'error': 'No raw response provided'}), 400
        
        # 确保scene_descriptions目录存在
        os.makedirs(scene_descriptions_dir, exist_ok=True)
        
        # 保存原始响应
        timestamp = data.get('timestamp', '')
        response_type = data.get('type', 'unknown')
        
        filename = f'raw_ai_response_{response_type}_{timestamp.replace(":", "-").replace(".", "-")}.txt'
        raw_response_path = os.path.join(scene_descriptions_dir, filename)
        
        with open(raw_response_path, 'w', encoding='utf-8') as f:
            f.write(data['raw_response'])
        
        # 也保存到通用文件
        general_path = os.path.join(scene_descriptions_dir, 'latest_raw_response.txt')
        with open(general_path, 'w', encoding='utf-8') as f:
            f.write(data['raw_response'])
        
        logging.info(f"Raw AI response saved successfully")
        return jsonify({'message': 'Raw AI response saved successfully'}), 200
        
    except Exception as e:
        logging.error(f'Error saving raw AI response: {e}')
        return jsonify({'error': str(e)}), 500

def upload_scene_image():
    """上传场景图片"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        scene_index = request.form.get('scene_index', '0')
        scene_description = request.form.get('scene_description', '')
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # 确保images目录存在
        images_dir = os.path.join('temp', 'images', 'scenes')
        os.makedirs(images_dir, exist_ok=True)
        
        # 生成文件名
        file_extension = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else 'jpg'
        filename = f'scene_{scene_index}_{int(time.time())}.{file_extension}'
        file_path = os.path.join(images_dir, filename)
        
        # 保存文件
        file.save(file_path)
        
        # 保存图片信息
        image_info = {
            'scene_index': int(scene_index),
            'filename': filename,
            'file_path': file_path,
            'scene_description': scene_description,
            'uploaded_at': datetime.now().isoformat(),
            'file_size': os.path.getsize(file_path)
        }
        
        info_path = os.path.join(images_dir, f'scene_{scene_index}_info.json')
        with open(info_path, 'w', encoding='utf-8') as f:
            json.dump(image_info, f, ensure_ascii=False, indent=2)
        
        # 返回相对路径
        relative_path = f'/temp/images/scenes/{filename}'
                        info['image_url'] = f"/temp/images/scenes/{info['filename']}"
                    scene_images.append(info)
                except Exception as ie:
                    logging.warning(f"Failed to read scene image info {filename}: {ie}")
                    continue
        # 按scene_index排序
        scene_images.sort(key=lambda x: x.get('scene_index', 0))
        return jsonify({'scene_images': scene_images}), 200
    except Exception as e:
        logging.error(f'Error loading scene images: {e}')
        return jsonify({'error': str(e)}), 500

def upload_character_image():
    """上传角色图片"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        character_index = request.form.get('character_index', '0')
        character_name = request.form.get('character_name', f'character_{character_index}')
        character_info = request.form.get('character_info', '{}')
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # 确保images目录存在
        images_dir = os.path.join('temp', 'images', 'characters')
        os.makedirs(images_dir, exist_ok=True)
        
        # 生成文件名
        file_extension = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else 'jpg'
        filename = f'{character_name}_{int(time.time())}.{file_extension}'
        file_path = os.path.join(images_dir, filename)
        
        # 保存文件
        file.save(file_path)
        
        # 保存图片信息
        image_info = {
            'character_index': int(character_index),
            'character_name': character_name,
            'filename': filename,
            'file_path': file_path,
            'character_info': json.loads(character_info) if character_info != '{}' else {},
            'uploaded_at': datetime.now().isoformat(),
            'file_size': os.path.getsize(file_path)
        }
        
        info_path = os.path.join(images_dir, f'{character_name}_info.json')
        with open(info_path, 'w', encoding='utf-8') as f:
            json.dump(image_info, f, ensure_ascii=False, indent=2)
        
            'scene_description': scene_description,
            'generated_at': datetime.now().isoformat(),
            'type': 'ai_generated'
        }
        info_path = os.path.join(images_dir, f'scene_{scene_index}_generated_info.json')
        with open(info_path, 'w', encoding='utf-8') as f:
            json.dump(image_info, f, ensure_ascii=False, indent=2)
        
        logging.info(f"Scene image info saved successfully: index {scene_index}")
        return jsonify({'message': 'Scene image info saved successfully'}), 200
    except Exception as e:
        logging.error(f'Error saving scene image info: {e}')
        return jsonify({'error': str(e)}), 500

def save_character_image():
    """保存角色图片（AI生成的）"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        character_index = data.get('character_index', 0)
        character_name = data.get('character_name', f'character_{character_index}')
        image_url = data.get('imageUrl', '')
        character_info = data.get('character_info', {})
        
        if not image_url:
            return jsonify({'error': 'No image URL provided'}), 400
        
        # 确保images目录存在
        images_dir = os.path.join('temp', 'images', 'characters')
        os.makedirs(images_dir, exist_ok=True)
        
        # 保存图片信息
        image_info = {
            'character_index': character_index,
            'character_name': character_name,
            'image_url': image_url,
            'character_info': character_info,
            'generated_at': datetime.now().isoformat(),
            'type': 'ai_generated'
        }
        
        info_path = os.path.join(images_dir, f'{character_name}_generated_info.json')
        with open(info_path, 'w', encoding='utf-8') as f:
            json.dump(image_info, f, ensure_ascii=False, indent=2)
        
        logging.info(f"Character image info saved successfully: {character_name}")
        return jsonify({'message': 'Character image info saved successfully'}), 200
        
    except Exception as e:
        logging.error(f'Error saving character image info: {e}')
        return jsonify({'error': str(e)}), 500

def load_storyboards():
    """加载分镜脚本"""
    try:
        storyboards_path = os.path.join(scene_descriptions_dir, 'storyboards.json')
        
        if not os.path.exists(storyboards_path):
            return jsonify([]), 200
        
        with open(storyboards_path, 'r', encoding='utf-8') as f:
            storyboards = json.load(f)
        
        logging.info(f"Storyboards loaded successfully: {len(storyboards)} items")
        return jsonify(storyboards), 200
        
    except Exception as e:
        logging.error(f'Error loading storyboards: {e}')
        return jsonify({'error': str(e)}), 500

def load_complete_storyboard_data():
    """加载完整的分镜数据"""
    try:
        complete_data_path = os.path.join(scene_descriptions_dir, 'complete_storyboard.json')
        
        if not os.path.exists(complete_data_path):
            return jsonify({'scenes': []}), 200
        
        with open(complete_data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        logging.info(f"Complete storyboard data loaded successfully")
        return jsonify(data), 200
        
    except Exception as e:
        logging.error(f'Error loading complete storyboard data: {e}')
        return jsonify({'error': str(e)}), 500

def load_character_images():
    """加载角色图片信息"""
    try:
        images_dir = os.path.join('temp', 'images', 'characters')
        
        if not os.path.exists(images_dir):
            return jsonify({'character_images': []}), 200
        
        character_images = []
        
        # 扫描角色图片目录
        for filename in os.listdir(images_dir):
            if filename.endswith('_info.json') or filename.endswith('_generated_info.json'):
                info_path = os.path.join(images_dir, filename)
                try:
                    with open(info_path, 'r', encoding='utf-8') as f:
                        image_info = json.load(f)
                    
                    # 检查图片文件是否存在
                    if 'filename' in image_info:
                        image_path = os.path.join(images_dir, image_info['filename'])
                        if os.path.exists(image_path):
                            image_info['image_url'] = f'/temp/images/characters/{image_info["filename"]}'
                    elif 'image_url' in image_info:
                        # AI生成的图片，直接使用URL
                        pass
                    
                    character_images.append(image_info)
                    
                except Exception as e:
                    logging.warning(f'Error reading character image info {filename}: {e}')
                    continue
        
        # 按角色索引排序
        character_images.sort(key=lambda x: x.get('character_index', 0))
        
        logging.info(f"Character images loaded successfully: {len(character_images)} images")
        return jsonify({'character_images': character_images}), 200
        
    except Exception as e:
        logging.error(f'Error loading character images: {e}')
        return jsonify({'error': str(e)}), 500

def save_storyboards():
    """保存分镜脚本到temp/{project_name}/scene_descriptions文件夹"""
    try:
        request_data = request.json
        if not request_data:
            return jsonify({'error': 'No data provided'}), 400
        
        # 支持新的数据格式（包含projectName）和旧格式（直接是数组）
        if isinstance(request_data, list):
            data = request_data
            project_name = 'default'
        else:
            data = request_data.get('storyboards', [])
            project_name = request_data.get('projectName', 'default')
        
        if not data:
            return jsonify({'error': 'No storyboards data provided'}), 400
        
        # 创建项目专用的scene_descriptions目录
        project_scene_dir = os.path.join('temp', project_name, 'scene_descriptions')
        os.makedirs(project_scene_dir, exist_ok=True)
        
        # 保存分镜脚本数据
        storyboards_path = os.path.join(project_scene_dir, 'storyboards.json')
        with open(storyboards_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        # 保存每个分镜脚本到单独文件
        for i, storyboard in enumerate(data):
            storyboard_file_path = os.path.join(project_scene_dir, f'storyboard_{i}.txt')
            with open(storyboard_file_path, 'w', encoding='utf-8') as f:
                f.write(storyboard)
        
        logging.info(f"Storyboards saved successfully to project {project_name}: {len(data)} items")
        return jsonify({'message': f'Storyboards saved successfully to project {project_name}'}), 200
        
    except Exception as e:
        logging.error(f'Error saving storyboards: {e}')
        return jsonify({'error': str(e)}), 500