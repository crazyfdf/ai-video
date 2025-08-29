import json
import logging
import os
import time
from datetime import datetime

from flask import jsonify, request
from backend.util.constant import get_project_dir

# 创建scene_descriptions目录路径（保持向后兼容）
def get_scene_descriptions_dir(project_name):
    """获取场景描述目录"""
    return get_project_dir(project_name, 'scene_descriptions')

# 清理旧版按项保存的txt文件，仅保留JSON文件
# 会删除如 0.txt、1.txt、storyboard_0.txt、wan22_0.txt 等遗留文件
# 该清理在保存与加载相关数据时触发一次，避免目录堆积历史无用文件

def clean_legacy_txt_files(scene_dir: str):
    try:
        if not os.path.exists(scene_dir):
            return
        for filename in os.listdir(scene_dir):
            full_path = os.path.join(scene_dir, filename)
            if not os.path.isfile(full_path):
                continue
            name, ext = os.path.splitext(filename)
            if ext.lower() != '.txt':
                continue
            # 删除旧版分散txt文件
            if name.isdigit() or name.startswith('storyboard_') or name.startswith('wan22_') or filename.startswith('raw_ai_response_') or filename == 'latest_raw_response.txt':
                try:
                    os.remove(full_path)
                    logging.info(f"Removed legacy txt file: {full_path}")
                except Exception as e:
                    logging.warning(f"Failed to remove legacy file {full_path}: {e}")
    except Exception as e:
        logging.warning(f"Error during cleaning legacy txt files in {scene_dir}: {e}")

def save_scene_descriptions():
    """保存所有画面描述到temp/{project_name}/scene_descriptions文件夹"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # 支持新的数据格式（包含projectName）和旧格式（直接是数组）
        if isinstance(data, list):
            descriptions = data
            return jsonify({'error': 'Project name is required'}), 400
        else:
            descriptions = data.get('descriptions', [])
            project_name = data.get('projectName')
            if not project_name:
                return jsonify({'error': 'Project name is required'}), 400
        
        if not descriptions or not isinstance(descriptions, list):
            return jsonify({'error': 'Invalid descriptions data provided'}), 400
        
        # 创建项目专用的scene_descriptions目录
        project_scene_dir = get_project_dir(project_name, 'scene_descriptions')
        os.makedirs(project_scene_dir, exist_ok=True)
        # 清理遗留txt文件
        clean_legacy_txt_files(project_scene_dir)
        
        # 只保存完整的描述列表到JSON文件
        all_descriptions_path = os.path.join(project_scene_dir, 'all_descriptions.json')
        with open(all_descriptions_path, 'w', encoding='utf-8') as f:
            json.dump(descriptions, f, ensure_ascii=False, indent=2)
        
        logging.info(f"Scene descriptions saved successfully to project {project_name}: {len(descriptions)} descriptions")
        return jsonify({'message': f'Scene descriptions saved successfully to project {project_name}: {len(descriptions)} descriptions'}), 200
        
    except Exception as e:
        logging.error(f'Error saving scene descriptions: {e}')
        return jsonify({'error': str(e)}), 500

def load_scene_descriptions():
    """从temp/{project_name}/scene_descriptions文件夹加载画面描述"""
    try:
        project_name = request.args.get('project_name')
        if not project_name:
            return jsonify({'error': 'Project name is required'}), 400
        scene_descriptions_dir = get_scene_descriptions_dir(project_name)
        # 清理遗留txt文件
        clean_legacy_txt_files(scene_descriptions_dir)
        
        all_descriptions_path = os.path.join(scene_descriptions_dir, 'all_descriptions.json')
        
        if not os.path.exists(all_descriptions_path):
            return jsonify([]), 200
        
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
        project_name = data.get('project_name')
        if not project_name:
            return jsonify({'error': 'Project name is required'}), 400
        
        # 获取项目专用的scene_descriptions目录
        scene_descriptions_dir = get_scene_descriptions_dir(project_name)
        
        # 确保scene_descriptions目录存在
        os.makedirs(scene_descriptions_dir, exist_ok=True)
        # 清理遗留txt文件
        clean_legacy_txt_files(scene_descriptions_dir)
        
        # 只更新完整的描述列表JSON文件
        all_descriptions_path = os.path.join(scene_descriptions_dir, 'all_descriptions.json')
        descriptions = []
        
        if os.path.exists(all_descriptions_path):
            with open(all_descriptions_path, 'r', encoding='utf-8') as f:
                descriptions = json.load(f)
        
        # 确保列表足够长
        while len(descriptions) <= index:
            descriptions.append('')
        
        descriptions[index] = description
        
        # 保存更新后的描述列表
        with open(all_descriptions_path, 'w', encoding='utf-8') as f:
            json.dump(descriptions, f, ensure_ascii=False, indent=2)
        
        return jsonify({'success': True}), 200
    except Exception as e:
        logging.error(f'Error saving scene description: {e}')
        return jsonify({'error': str(e)}), 500

def save_storyboard_elements():
    """保存故事板元素"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # 支持新的数据格式（包含elements和project_name）和旧格式（直接是数组）
        if isinstance(data, list):
            elements = data
            return jsonify({'error': 'Project name is required'}), 400
        else:
            elements = data.get('elements', data)  # 如果有elements字段就用，否则用整个data
            project_name = data.get('project_name')
            if not project_name:
                return jsonify({'error': 'Project name is required'}), 400
        
        scene_descriptions_dir = get_scene_descriptions_dir(project_name)
        
        # 确保scene_descriptions目录存在
        os.makedirs(scene_descriptions_dir, exist_ok=True)
        
        # 故事板元素数据现在直接保存在各个scene_X.json文件的elements_layout字段中
        # 不再需要单独的storyboard_elements.json文件
        
        logging.info(f"Storyboard elements saved successfully to project {project_name}: {len(elements)} items")
        return jsonify({'message': 'Storyboard elements saved successfully'}), 200
        
    except Exception as e:
        logging.error(f'Error saving storyboard elements: {e}')
        return jsonify({'error': str(e)}), 500

def load_storyboard_elements():
    """从complete_storyboard.json直接加载故事板元素，并提取主体信息"""
    try:
        project_name = request.args.get('project_name')
        if not project_name:
            return jsonify({'error': 'Project name is required'}), 400
        project_dir = get_project_dir(project_name)
        
        # 直接从latest_llm_response_storyboard_generation.json加载数据
        latest_storyboard_path = os.path.join(project_dir, 'latest_llm_response_storyboard_generation.json')
        if not os.path.exists(latest_storyboard_path):
            return jsonify([]), 200
            
        with open(latest_storyboard_path, 'r', encoding='utf-8') as f:
            storyboard_data = json.load(f)
        
        # 提取所有唯一的主体信息
        character_subjects = set()
        scene_subjects = set()
        
        # 从complete_storyboard.json的scenes中提取主体信息
        scenes = storyboard_data.get('scenes', [])
        for scene in scenes:
            # 从required_elements中提取主体信息
            required_elements = scene.get('required_elements', {})
            
            # 提取角色主体
            character_subjects_list = required_elements.get('character_subjects', [])
            for char_subject in character_subjects_list:
                if char_subject.startswith('@'):
                    char_name = char_subject[1:]  # 去掉@符号
                    # 从elements_layout中找到对应的prompt
                    char_prompt = ''
                    elements_layout = scene.get('elements_layout', [])
                    for element in elements_layout:
                        if element.get('element_type') == 'character' and element.get('name') == char_name:
                            char_prompt = element.get('prompt', '')
                            break
                    character_subjects.add((char_name, char_prompt))
            
            # 提取场景主体
            scene_subjects_list = required_elements.get('scene_subjects', [])
            for scene_subject in scene_subjects_list:
                if scene_subject.startswith('@'):
                    scene_name = scene_subject[1:]  # 去掉@符号
                    # 从elements_layout中找到对应的prompt
                    scene_prompt = ''
                    elements_layout = scene.get('elements_layout', [])
                    for element in elements_layout:
                        if element.get('element_type') == 'scene' and element.get('name') == scene_name:
                            scene_prompt = element.get('prompt', '')
                            break
                    scene_subjects.add((scene_name, scene_prompt))
        
        # 加载角色图片信息
        def load_character_image_info(character_name):
            character_dir = get_project_dir(project_name, 'character')
            if os.path.exists(character_dir):
                for filename in os.listdir(character_dir):
                    if filename.startswith(character_name) and filename.endswith('_info.json'):
                        info_path = os.path.join(character_dir, filename)
                        try:
                            with open(info_path, 'r', encoding='utf-8') as f:
                                info = json.load(f)
                            return info.get('image_url', '')
                        except Exception:
                            continue
            return ''
        
        # 加载场景图片信息
        def load_scene_image_info(scene_name):
            scene_descriptions_dir = get_project_dir(project_name, 'scene_descriptions')
            if os.path.exists(scene_descriptions_dir):
                for filename in os.listdir(scene_descriptions_dir):
                    if scene_name.lower() in filename.lower() and filename.endswith('_info.json'):
                        info_path = os.path.join(scene_descriptions_dir, filename)
                        try:
                            with open(info_path, 'r', encoding='utf-8') as f:
                                info = json.load(f)
                            return info.get('image_url', '')
                        except Exception:
                            continue
            return ''
        
        # 加载主体图片信息
        def load_subject_image_info(subject_name, subject_type):
            if subject_type == 'character':
                target_dir = get_project_dir(project_name, 'character')
                # 从character_X.json文件中查找
                if os.path.exists(target_dir):
                    for filename in os.listdir(target_dir):
                        if filename.startswith('character_') and filename.endswith('.json'):
                            char_path = os.path.join(target_dir, filename)
                            try:
                                with open(char_path, 'r', encoding='utf-8') as f:
                                    char_data = json.load(f)
                                if char_data.get('name') == subject_name:
                                    return char_data.get('image_url', '')
                            except Exception:
                                continue
            else:
                target_dir = get_project_dir(project_name, 'scene_descriptions')
                # 从scene_X.json文件中查找
                if os.path.exists(target_dir):
                    for filename in os.listdir(target_dir):
                        if filename.startswith('scene_') and filename.endswith('.json'):
                            scene_path = os.path.join(target_dir, filename)
                            try:
                                with open(scene_path, 'r', encoding='utf-8') as f:
                                    scene_data = json.load(f)
                                # 检查场景名称或ID是否匹配
                                scene_id = scene_data.get('scene_id', filename.replace('scene_', '').replace('.json', ''))
                                if str(scene_id) == str(subject_name) or f'场景{scene_id}' == subject_name:
                                    # 返回第一张图片的URL（如果有的话）
                                    images = scene_data.get('images', [])
                                    if images and isinstance(images[0], dict):
                                        return images[0].get('image_url', images[0].get('local_url', ''))
                            except Exception:
                                continue
            return ''
        
        # 构建返回的元素列表
        result_elements = []
        
        # 添加角色主体
        for name, prompt in character_subjects:
            photo = load_character_image_info(name) or load_subject_image_info(name, 'character')
            result_elements.append({
                'elementType': 'character',
                'name': name,
                'prompt': prompt,
                'photo': photo,
                'lora': '',   # 可以后续从配置加载
                'subjectInfo': None
            })
        
        # 添加场景主体
        for name, prompt in scene_subjects:
            photo = load_scene_image_info(name) or load_subject_image_info(name, 'scene')
            result_elements.append({
                'elementType': 'scene', 
                'name': name,
                'prompt': prompt,
                'photo': photo,
                'lora': '',   # 可以后续从配置加载
                'subjectInfo': None
            })
        
        # 补充空元素以满足前端期望的4个元素
        while len(result_elements) < 4:
            result_elements.append({
                'elementType': '',
                'name': 'undefined',
                'prompt': '',
                'photo': '',
                'lora': '',
                'subjectInfo': None
            })
        
        logging.info(f"Storyboard elements loaded successfully: {len(result_elements)} elements")
        return jsonify(result_elements), 200
        
    except Exception as e:
        logging.error(f'Error loading storyboard elements: {e}')
        return jsonify({'error': str(e)}), 500


def save_two_step_generation_data():
    """保存两步骤生成的数据（分镜脚本和WAN2.2提示词）"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        project_name = data.get('project_name')
        if not project_name:
          return jsonify({'error': 'project_name is required'}), 400
        scene_descriptions_dir = get_scene_descriptions_dir(project_name)
        
        # 确保scene_descriptions目录存在
        os.makedirs(scene_descriptions_dir, exist_ok=True)
        # 清理遗留txt文件
        clean_legacy_txt_files(scene_descriptions_dir)
        
        # 分镜脚本数据现在直接保存在各个scene_X.json文件中
        # 不再需要单独的storyboards.json文件
        
        # 只保存WAN2.2提示词数据到JSON文件
        if 'wan22_prompts' in data:
            wan22_path = os.path.join(scene_descriptions_dir, 'wan22_prompts.json')
            with open(wan22_path, 'w', encoding='utf-8') as f:
                json.dump(data['wan22_prompts'], f, ensure_ascii=False, indent=2)
        
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
        project_name = request.args.get('project_name')
        if not project_name:
          return jsonify({'error': 'project_name is required'}), 400
        scene_descriptions_dir = get_scene_descriptions_dir(project_name)
        
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
    """保存完整的分镜数据，不再保存到individual scene files，而是直接保存到latest_llm_response_storyboard_generation.json"""
    try:
        from backend.util.latest_storyboard_parser import LatestStoryboardParser
        
        logging.info(f"收到保存完整分镜数据请求，Content-Type: {request.content_type}")
        
        try:
            data = request.json
            logging.info(f"解析的JSON数据: {data}")
        except Exception as json_error:
            logging.error(f"JSON解析失败: {json_error}")
            return jsonify({'error': f'JSON解析失败: {str(json_error)}'}), 400
            
        if not data:
            logging.error("未提供数据")
            return jsonify({'error': 'No data provided'}), 400
        
        project_name = data.get('project_name')
        if not project_name:
          return jsonify({'error': 'project_name is required'}), 400
        
        # 使用新的解析器保存数据
        parser = LatestStoryboardParser()
        success = parser.save_latest_storyboard_data(project_name, data)
        
        if not success:
            logging.error(f"Failed to save storyboard data for project: {project_name}")
            return jsonify({'error': 'Failed to save storyboard data'}), 500
        
        scenes_count = len(data.get('scenes', []))
        
        logging.info(f"Complete storyboard data saved successfully to latest_llm_response_storyboard_generation.json for project {project_name}")
        return jsonify({
            'message': 'Complete storyboard data saved successfully to latest_llm_response_storyboard_generation.json',
            'validation_status': 'passed',
            'scenes_count': scenes_count,
            'project_name': project_name
        }), 200
        
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        logging.error(f'Error saving complete storyboard data: {e}')
        logging.error(f'Full traceback: {error_traceback}')
        return jsonify({'error': str(e)}), 500

# save_raw_ai_response函数已废弃，不再使用


def save_llm_complete_response():
    """保存LLM完整响应数据到temp/project_name目录"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        project_name = data.get('projectName')
        if not project_name:
            return jsonify({'error': 'projectName is required'}), 400
        response_data = data.get('responseData')
        response_type = data.get('responseType', 'unknown')  # 'story_generation' 或 'storyboard_generation'
        
        if not response_data:
            return jsonify({'error': 'No response data provided'}), 400
        
        # 创建项目目录
        project_dir = get_project_dir(project_name, "")
        os.makedirs(project_dir, exist_ok=True)
        
        # 只保存最新的响应到固定文件名
        latest_filename = f'latest_llm_response_{response_type}.json'
        latest_path = os.path.join(project_dir, latest_filename)
        
        with open(latest_path, 'w', encoding='utf-8') as f:
            json.dump(response_data, f, ensure_ascii=False, indent=2)
        
        logging.info(f"LLM complete response saved successfully to {project_name}: {latest_filename}")
        return jsonify({
            'message': f'LLM complete response saved successfully',
            'filename': latest_filename,
            'path': f'/temp/{project_name}/{latest_filename}'
        }), 200
        
    except Exception as e:
        logging.error(f'Error saving LLM complete response: {e}')
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
        # 使用项目相对路径，如果没有项目名则使用默认路径
        project_name = request.form.get('projectName')
        if not project_name:
            return jsonify({'error': 'projectName is required'}), 400
        images_dir = get_project_dir(project_name, 'images/scenes')
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
        relative_path = f"/temp/{project_name}/images/scenes/{filename}"
        return jsonify({
            'message': 'Scene image uploaded successfully',
            'image_url': relative_path,
            'image': {
                'scene_index': int(scene_index),
                'filename': filename,
                'image_url': relative_path,
                'uploaded_at': image_info.get('uploaded_at'),
                'file_size': image_info.get('file_size', 0)
            }
        }), 200
    except Exception as ie:
        logging.error(f'Error uploading scene image: {ie}')
        return jsonify({'error': str(ie)}), 500

def upload_character_image():
    """上传角色图片"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        character_index = request.form.get('character_index', '0')
        character_name = request.form.get('character_name', f'character_{character_index}')
        character_info = request.form.get('character_info', '{}')
        project_name = request.form.get('projectName')
        if not project_name:
            return jsonify({'error': 'projectName is required'}), 400   
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # 确保images目录存在
        images_dir = get_project_dir(project_name, 'images/characters')
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
        
       # 返回相对路径，保证前端可以直接使用 result.image_url
        relative_path = f"/temp/{project_name}/images/characters/{filename}"
        return jsonify({
            'message': 'Character image uploaded successfully',
            'image_url': relative_path,
            'image': {
                'character_index': int(character_index),
                'character_name': character_name,
                'filename': filename,
                'image_url': relative_path,
                'uploaded_at': image_info.get('uploaded_at'),
                'file_size': image_info.get('file_size', 0)
            }
        }), 200
    except Exception as e:
        logging.error(f'Error uploading character image: {e}')
        return jsonify({'error': str(e)}), 500

def save_scene_image():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        scene_index = data.get('scene_index')
        scene_description = data.get('scene_description', '')
        image_url = data.get('image_url', '')
        project_name = data.get('projectName')
        if not project_name:
            return jsonify({'error': 'projectName is required'}), 400
        
        images_dir = get_project_dir(project_name, 'images/scenes')
        os.makedirs(images_dir, exist_ok=True)
        
        image_info = {
            'scene_index': scene_index,
            'image_url': image_url,
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
    """保存角色图片（AI生成的）到对应的character_X.json文件中"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        character_index = data.get('character_index', 0)
        character_name = data.get('character_name', f'character_{character_index}')
        image_url = data.get('imageUrl', '')
        character_info = data.get('character_info', {})
        project_name = data.get('projectName')
        if not project_name:
            return jsonify({'error': 'projectName is required'}), 400
        
        if not image_url:
            return jsonify({'error': 'No image URL provided'}), 400
        
        # 使用character目录而不是images/characters目录
        character_dir = get_project_dir(project_name, 'character')
        os.makedirs(character_dir, exist_ok=True)
        
        # 构建图片信息
        image_info = {
            'image_url': image_url,
            'generated_at': datetime.now().isoformat(),
            'type': 'ai_generated'
        }
        
        # 查找对应的character_X.json文件
        character_file_path = os.path.join(character_dir, f'character_{character_index}.json')
        
        if os.path.exists(character_file_path):
            # 读取现有的角色数据
            with open(character_file_path, 'r', encoding='utf-8') as f:
                character_data = json.load(f)
            
            # 添加或更新图片信息
            if 'images' not in character_data:
                character_data['images'] = []
            
            # 检查是否已存在相同的图片URL，避免重复添加
            existing_urls = [img.get('image_url') for img in character_data['images']]
            if image_url not in existing_urls:
                character_data['images'].append(image_info)
            
            # 更新角色的主要图片URL（如果没有设置的话）
            if 'image_url' not in character_data or not character_data['image_url']:
                character_data['image_url'] = image_url
            
            # 保存更新后的角色数据
            with open(character_file_path, 'w', encoding='utf-8') as f:
                json.dump(character_data, f, ensure_ascii=False, indent=2)
            
            logging.info(f"Character image merged successfully into character_{character_index}.json: {character_name}")
            return jsonify({'message': 'Character image merged successfully into character file'}), 200
        else:
            # 如果角色文件不存在，创建一个新的角色文件
            character_data = {
                'name': character_name,
                'image_url': image_url,
                'images': [image_info],
                'created_at': datetime.now().isoformat()
            }
            
            # 如果提供了角色信息，合并进去
            if character_info:
                character_data.update(character_info)
            
            with open(character_file_path, 'w', encoding='utf-8') as f:
                json.dump(character_data, f, ensure_ascii=False, indent=2)
            
            logging.info(f"New character file created with image: character_{character_index}.json")
            return jsonify({'message': 'New character file created with image'}), 200
        
    except Exception as e:
        logging.error(f'Error saving character image: {e}')
        return jsonify({'error': str(e)}), 500

# 新增：加载场景图片信息

def load_scene_images():
    """加载场景图片信息"""
    try:
        project_name = request.args.get('projectName')
        if not project_name:
            return jsonify({'error': 'projectName is required'}), 400
        images_dir = get_project_dir(project_name, 'images/scenes')

        if not os.path.exists(images_dir):
            return jsonify({'scene_images': []}), 200

        scene_images = []

        # 扫描场景图片目录中的信息文件
        for filename in os.listdir(images_dir):
            if filename.endswith('_info.json'):
                info_path = os.path.join(images_dir, filename)
                try:
                    with open(info_path, 'r', encoding='utf-8') as f:
                        image_info = json.load(f)

                    # 如果存在图片文件名，则构造可访问的URL
                    if 'filename' in image_info:
                        image_path = os.path.join(images_dir, image_info['filename'])
                        if os.path.exists(image_path):
                            image_info['image_url'] = f'/temp/{project_name}/images/scenes/{image_info["filename"]}'

                    scene_images.append(image_info)
                except Exception as ie:
                    logging.warning(f'Error reading scene image info {filename}: {ie}')
                    continue

        # 按scene_index排序
        scene_images.sort(key=lambda x: x.get('scene_index', 0))

        logging.info(f"Scene images loaded successfully: {len(scene_images)} images")
        return jsonify({'scene_images': scene_images}), 200

    except Exception as e:
        logging.error(f'Error loading scene images: {e}')
        return jsonify({'error': str(e)}), 500


def save_storyboards():
    """保存分镜脚本，现在通过latest_llm_response_storyboard_generation.json处理"""
    try:
        request_data = request.json
        if not request_data:
            return jsonify({'error': 'No data provided'}), 400
        
        # 支持新的数据格式（包含projectName）和旧格式（直接是数组）
        if isinstance(request_data, list):
            storyboards = request_data
            return jsonify({'error': 'Project name is required'}), 400
        else:
            storyboards = request_data.get('storyboards', [])
            project_name = request_data.get('projectName')
            if not project_name:
                return jsonify({'error': 'Project name is required'}), 400
        
        if not storyboards:
            return jsonify({'error': 'No storyboards data provided'}), 400
        
        # 构建完整的分镜数据结构
        storyboard_data = {
            'total_scenes': len(storyboards),
            'generated_at': datetime.now().isoformat(),
            'story_summary': '',
            'characters': [],
            'scenes': storyboards
        }
        
        # 使用新的解析器保存数据
        from backend.util.latest_storyboard_parser import LatestStoryboardParser
        parser = LatestStoryboardParser()
        success = parser.save_latest_storyboard_data(project_name, storyboard_data)
        
        if not success:
            logging.error(f"Failed to save storyboard data for project: {project_name}")
            return jsonify({'error': 'Failed to save storyboard data'}), 500
        
        logging.info(f"Storyboards saved successfully to latest_llm_response_storyboard_generation.json for project {project_name}: {len(storyboards)} items")
        return jsonify({'message': f'Storyboards saved successfully to project {project_name}'}), 200
        
    except Exception as e:
        logging.error(f'Error saving storyboards: {e}')
        return jsonify({'error': str(e)}), 500


def upload_character_voice():
    """上传角色音色文件"""
    try:
        if 'voice' not in request.files:
            return jsonify({'error': 'No voice file provided'}), 400
        
        file = request.files['voice']
        character_index = request.form.get('character_index', '0')
        character_name = request.form.get('character_name', f'character_{character_index}')
        project_name = request.form.get('projectName')
        if not project_name:
            return jsonify({'error': 'projectName is required'}), 400
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # 确保voices目录存在
        voices_dir = get_project_dir(project_name, 'voices/characters')
        os.makedirs(voices_dir, exist_ok=True)
        
        # 生成文件名
        file_extension = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else 'mp3'
        filename = f'{character_name}_{int(time.time())}.{file_extension}'
        file_path = os.path.join(voices_dir, filename)
        
        # 保存文件
        file.save(file_path)
        
        # 保存音色文件信息
        voice_info = {
            'character_index': int(character_index),
            'character_name': character_name,
            'filename': filename,
            'file_path': file_path,
            'uploaded_at': datetime.now().isoformat(),
            'file_size': os.path.getsize(file_path)
        }
        
        # 保存到JSON文件
        project_dir = get_project_dir(project_name, '')
        voices_info_file = os.path.join(project_dir, 'character_voices.json')
        voices_data = []
        if os.path.exists(voices_info_file):
            with open(voices_info_file, 'r', encoding='utf-8') as f:
                voices_data = json.load(f)
        
        # 移除同一角色的旧音色文件记录
        voices_data = [v for v in voices_data if v.get('character_index') != int(character_index)]
        voices_data.append(voice_info)
        
        with open(voices_info_file, 'w', encoding='utf-8') as f:
            json.dump(voices_data, f, ensure_ascii=False, indent=2)
        
        # 返回音色文件URL
        voice_url = f'/temp/{project_name}/voices/characters/{filename}'
        
        logging.info(f"Character voice uploaded successfully: {character_name} -> {filename}")
        return jsonify({
            'message': 'Voice file uploaded successfully',
            'voice_url': voice_url,
            'filename': filename,
            'character_name': character_name
        }), 200
        
    except Exception as e:
        logging.error(f'Error uploading character voice: {e}')
        return jsonify({'error': str(e)}), 500


def load_storyboards():
    """从latest_llm_response_storyboard_generation.json加载分镜脚本数据"""
    try:
        from backend.util.latest_storyboard_parser import LatestStoryboardParser
        
        project_name = request.args.get('projectName')
        if not project_name:
            return jsonify({'error': 'projectName is required'}), 400
        
        # 使用新的解析器加载数据
        parser = LatestStoryboardParser()
        storyboard_data = parser.load_latest_storyboard_data(project_name)
        
        if not storyboard_data:
            logging.warning(f"Latest storyboard file not found for project: {project_name}")
            return jsonify({'storyboards': []}), 200
        
        # 提取分镜脚本数据
        storyboards = storyboard_data.get('scenes', [])
        
        logging.info(f"Storyboards loaded successfully from latest_llm_response_storyboard_generation.json for project {project_name}: {len(storyboards)} items")
        return jsonify({'storyboards': storyboards}), 200
        
    except Exception as e:
        logging.error(f'Error loading storyboards: {e}')
        return jsonify({'error': str(e)}), 500


def load_complete_storyboard_data():
    """从latest_llm_response_storyboard_generation.json加载完整分镜数据"""
    try:
        from backend.util.latest_storyboard_parser import LatestStoryboardParser
        
        project_name = request.args.get('projectName')
        if not project_name:
            return jsonify({'error': 'projectName is required'}), 400
        
        # 使用新的解析器加载数据
        parser = LatestStoryboardParser()
        storyboard_data = parser.load_latest_storyboard_data(project_name)
        
        if not storyboard_data:
            logging.warning(f"Latest storyboard file not found for project: {project_name}")
            result = {'scenes': [], 'total_scenes': 0, 'characters': [], 'story_summary': '', 'generated_at': ''}
            return jsonify(result), 200
        
        logging.info(f"Complete storyboard data loaded from latest_llm_response_storyboard_generation.json for project {project_name}: {storyboard_data.get('total_scenes', 0)} scenes")
        return jsonify(storyboard_data), 200
        
    except Exception as e:
        logging.error(f'Error loading complete storyboard data: {e}')
        return jsonify({'error': str(e)}), 500


def load_story_generation_data():
    """从latest_llm_response_story_generation.json加载角色和场景数据"""
    try:
        project_name = request.args.get('projectName')
        if not project_name:
            return jsonify({'error': 'projectName is required'}), 400
        
        # 构建文件路径
        project_dir = get_project_dir(project_name, "")
        story_file_path = os.path.join(project_dir, 'latest_llm_response_story_generation.json')
        
        if not os.path.exists(story_file_path):
            logging.warning(f"Story generation file not found for project: {project_name}")
            return jsonify({'exists': False, 'data': None}), 200
        
        # 读取文件内容
        with open(story_file_path, 'r', encoding='utf-8') as f:
            story_data = json.load(f)
        
        # 解析LLM响应格式
        if 'choices' in story_data and story_data['choices']:
            content = story_data['choices'][0]['message']['content']
            parsed_content = json.loads(content)
            
            logging.info(f"Story generation data loaded from latest_llm_response_story_generation.json for project {project_name}")
            return jsonify({
                'exists': True, 
                'data': parsed_content
            }), 200
        else:
            logging.error(f"Invalid story generation file format for project: {project_name}")
            return jsonify({'exists': False, 'data': None}), 200
        
    except Exception as e:
        logging.error(f'Error loading story generation data: {e}')
        return jsonify({'error': str(e)}), 500


def load_file_data():
    """从指定文件加载数据"""
    try:
        project_name = request.args.get('projectName')
        if not project_name:
            return jsonify({'error': 'projectName is required'}), 400
        file_type = request.args.get('file_type', 'storyboard')  # storyboard 或 complete
        
        project_scene_dir = get_project_dir(project_name, 'scene_descriptions')
        
        # 根据文件类型选择对应的处理方式
        if file_type == 'storyboard':
            file_path = os.path.join(project_scene_dir, 'latest_llm_response_storyboard_generation.json')
            
            if not os.path.exists(file_path):
                logging.warning(f"File not found: {file_path}")
                return jsonify({'error': f'File not found: {os.path.basename(file_path)}'}), 404
            
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            logging.info(f"File data loaded successfully from {os.path.basename(file_path)}")
            return jsonify(data), 200
            
        elif file_type == 'complete':
            # 对于complete类型，调用load_complete_storyboard_data函数重新构建数据
            # 临时设置request参数
            original_args = request.args
            request.args = request.args.copy()
            
            # 调用load_complete_storyboard_data函数
            response = load_complete_storyboard_data()
            
            # 恢复原始参数
            request.args = original_args
            
            return response
            
        else:
            return jsonify({'error': 'Invalid file_type parameter'}), 400
        
    except Exception as e:
        logging.error(f'Error loading file data: {e}')
        return jsonify({'error': str(e)}), 500


def load_character_images():
    """从character_X.json文件中加载角色图片信息"""
    try:
        project_name = request.args.get('projectName')
        if not project_name:
            return jsonify({'error': 'projectName is required'}), 400
        character_dir = get_project_dir(project_name, 'character')
        
        if not os.path.exists(character_dir):
            return jsonify({'character_images': []}), 200
        
        character_images = []
        
        # 扫描所有character_X.json文件
        i = 0
        while True:
            char_file_path = os.path.join(character_dir, f'character_{i}.json')
            if not os.path.exists(char_file_path):
                break
            
            try:
                with open(char_file_path, 'r', encoding='utf-8') as f:
                    character_data = json.load(f)
                
                # 提取角色的图片信息
                if 'images' in character_data and isinstance(character_data['images'], list):
                    for image_info in character_data['images']:
                        # 添加角色信息到图片数据中
                        enhanced_image_info = {
                            **image_info,
                            'character_name': character_data.get('name', f'character_{i}'),
                            'character_index': i
                        }
                        character_images.append(enhanced_image_info)
                
                # 如果角色有主要图片URL，也添加进去
                if 'image_url' in character_data and character_data['image_url']:
                    main_image_info = {
                        'image_url': character_data['image_url'],
                        'character_name': character_data.get('name', f'character_{i}'),
                        'character_index': i,
                        'type': 'main_image',
                        'generated_at': character_data.get('created_at', '')
                    }
                    # 检查是否已存在相同的图片URL，避免重复
                    existing_urls = [img.get('image_url') for img in character_images]
                    if character_data['image_url'] not in existing_urls:
                        character_images.append(main_image_info)
                
                i += 1
                
            except Exception as e:
                logging.warning(f"Error loading character_{i}.json: {e}")
                break
        
        logging.info(f"Loaded {len(character_images)} character images from {i} character files for project {project_name}")
        return jsonify({'character_images': character_images}), 200
        
    except Exception as e:
        logging.error(f"Error loading character images: {e}")
        return jsonify({'error': str(e)}), 500