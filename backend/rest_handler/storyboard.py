import json
import logging
import os
import time
from datetime import datetime

from flask import jsonify, request
from backend.util.constant import get_project_dir


def _cleanup_and_reorganize_storyboard_files(project_name: str, storyboards: list):
    """清理并重新组织分镜文件，处理位置变化和删除情况"""
    try:
        storyboard_dir = get_project_dir(project_name, 'storyboard')
        os.makedirs(storyboard_dir, exist_ok=True)
        
        # 删除所有现有的分镜文件
        for filename in os.listdir(storyboard_dir):
            if filename.startswith('storyboard_') and filename.endswith('.json'):
                file_path = os.path.join(storyboard_dir, filename)
                os.remove(file_path)
                logging.info(f"Removed old storyboard file: {filename}")
        
        # 重新保存分镜文件，按新的索引顺序
        for index, storyboard in enumerate(storyboards):
            storyboard_file = os.path.join(storyboard_dir, f'storyboard_{index + 1}.json')
            
            # 确保分镜数据包含必要的字段
            storyboard_data = {
                'scene_id': index + 1,
                'novel_fragment': storyboard.get('novel_fragment', ''),
                'storyboard': storyboard.get('storyboard', ''),
                'wan22_prompt': storyboard.get('wan22_prompt', ''),
                'character_dialogue': storyboard.get('character_dialogue', ''),
                'sound_effects': storyboard.get('sound_effects', ''),
                'elements_layout': storyboard.get('elements_layout', []),
                'required_elements': storyboard.get('required_elements', {}),
                'generated_at': storyboard.get('generated_at', datetime.now().isoformat()),
                'description': storyboard.get('description', ''),
                'images': storyboard.get('images', []),
                'generation_info': storyboard.get('generation_info', {})
            }
            
            with open(storyboard_file, 'w', encoding='utf-8') as f:
                json.dump(storyboard_data, f, ensure_ascii=False, indent=2)
            
            logging.info(f"Saved storyboard file: storyboard_{index + 1}.json")
        
        logging.info(f"Successfully reorganized {len(storyboards)} storyboard files for project {project_name}")
        
    except Exception as e:
        logging.error(f"Error in _cleanup_and_reorganize_storyboard_files: {e}")
        raise e
        
    except Exception as e:
        logging.error(f"Error cleaning up and reorganizing storyboard files: {e}")
        raise e

# 创建storyboard目录路径（保持向后兼容）
def get_scene_descriptions_dir(project_name):
    """获取项目的storyboard目录路径"""
    return get_project_dir(project_name, 'storyboard')

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
    """保存所有画面描述到temp/{project_name}/storyboard文件夹"""
    try:
        data = request.json
        logging.info(f"Received scene descriptions save request: {data}")
        if not data:
            logging.error("No data provided in request")
            return jsonify({'error': 'No data provided'}), 400
        
        # 支持新的数据格式（包含projectName）和旧格式（直接是数组）
        if isinstance(data, list):
            descriptions = data
            return jsonify({'error': 'Project name is required'}), 400
        else:
            # 支持descriptions字段（旧格式）和storyboards字段（新格式）
            descriptions = data.get('descriptions', data.get('storyboards', []))
            project_name = data.get('projectName')
            logging.info(f"Extracted project_name: {project_name}, descriptions count: {len(descriptions)}")
            if not project_name:
                logging.error("Project name is required in request data")
                return jsonify({'error': 'Project name is required'}), 400
        
        if not descriptions or not isinstance(descriptions, list):
            logging.error(f"Invalid descriptions data: {descriptions}")
            return jsonify({'error': 'Invalid descriptions data provided'}), 400
        
        # 创建项目专用的storyboard目录
        project_scene_dir = get_project_dir(project_name, 'storyboard')
        os.makedirs(project_scene_dir, exist_ok=True)
        # 清理遗留txt文件
        clean_legacy_txt_files(project_scene_dir)
        
        # 使用清理和重新组织函数来处理分镜文件
        _cleanup_and_reorganize_storyboard_files(project_name, descriptions)
        
        logging.info(f"Scene descriptions saved successfully to project {project_name}: {len(descriptions)} descriptions")
        return jsonify({'message': f'Scene descriptions saved successfully to project {project_name}: {len(descriptions)} descriptions'}), 200
        
    except Exception as e:
        logging.error(f'Error saving scene descriptions: {e}')
        return jsonify({'error': str(e)}), 500

def load_scene_descriptions():
    """从temp/{project_name}/storyboard文件夹加载画面描述"""
    try:
        project_name = request.args.get('project_name')
        if not project_name:
            return jsonify({'error': 'Project name is required'}), 400
        scene_descriptions_dir = get_project_dir(project_name, 'storyboard')
        # 清理遗留txt文件
        clean_legacy_txt_files(scene_descriptions_dir)
        
        descriptions = []
        
        if not os.path.exists(scene_descriptions_dir):
            return jsonify(descriptions), 200
        
        # 从单独的分镜文件中加载数据
        storyboard_files = [f for f in os.listdir(scene_descriptions_dir) if f.startswith('storyboard_') and f.endswith('.json')]
        storyboard_files.sort(key=lambda x: int(x.split('_')[1].split('.')[0]))  # 按数字排序
        
        for filename in storyboard_files:
            file_path = os.path.join(scene_descriptions_dir, filename)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    description = json.load(f)
                    descriptions.append(description)
            except Exception as e:
                logging.warning(f"Error loading storyboard file {filename}: {e}")
                continue
        
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
        
        # 获取项目专用的storyboard目录
        scene_descriptions_dir = get_scene_descriptions_dir(project_name)
        
        # 确保storyboard目录存在
        os.makedirs(scene_descriptions_dir, exist_ok=True)
        # 清理遗留txt文件
        clean_legacy_txt_files(scene_descriptions_dir)
        
        # 保存到单独的分镜文件
        storyboard_file = os.path.join(scene_descriptions_dir, f'storyboard_{index + 1}.json')
        
        # 如果是字符串描述，转换为完整的分镜对象
        if isinstance(description, str):
            storyboard_data = {
                'scene_id': index + 1,
                'novel_fragment': '',
                'storyboard': description,
                'wan22_prompt': '',
                'character_dialogue': '',
                'sound_effects': '',
                'elements_layout': [],
                'required_elements': {},
                'generated_at': datetime.now().isoformat(),
                'description': description,
                'images': [],
                'generation_info': {}
            }
        else:
            storyboard_data = description
            storyboard_data['scene_id'] = index + 1
        
        # 保存分镜文件
        with open(storyboard_file, 'w', encoding='utf-8') as f:
            json.dump(storyboard_data, f, ensure_ascii=False, indent=2)
        
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
        
        # 加载角色图片信息 - 从分镜文件中查找
        def load_character_image_info(character_name):
            storyboard_dir = get_project_dir(project_name, 'storyboard')
            if os.path.exists(storyboard_dir):
                for filename in os.listdir(storyboard_dir):
                    if filename.startswith('storyboard_') and filename.endswith('.json'):
                        storyboard_path = os.path.join(storyboard_dir, filename)
                        try:
                            with open(storyboard_path, 'r', encoding='utf-8') as f:
                                storyboard_data = json.load(f)
                            # 检查elements_layout中是否有该角色的图片
                            elements_layout = storyboard_data.get('elements_layout', [])
                            for element in elements_layout:
                                if (element.get('element_type') == 'character' and 
                                    element.get('name') == character_name and 
                                    element.get('photo')):
                                    return element.get('photo')
                            # 检查images字段中是否有图片
                            images = storyboard_data.get('images', [])
                            if images:
                                return images[0] if isinstance(images[0], str) else images[0].get('image_url', '') if isinstance(images[0], dict) else ''
                        except Exception:
                            continue
            return ''
        
        # 加载场景图片信息 - 从分镜文件中查找
        def load_scene_image_info(scene_name):
            storyboard_dir = get_project_dir(project_name, 'storyboard')
            if os.path.exists(storyboard_dir):
                for filename in os.listdir(storyboard_dir):
                    if filename.startswith('storyboard_') and filename.endswith('.json'):
                        storyboard_path = os.path.join(storyboard_dir, filename)
                        try:
                            with open(storyboard_path, 'r', encoding='utf-8') as f:
                                storyboard_data = json.load(f)
                            # 检查elements_layout中是否有该场景的图片
                            elements_layout = storyboard_data.get('elements_layout', [])
                            for element in elements_layout:
                                if (element.get('element_type') == 'scene' and 
                                    element.get('name') == scene_name and 
                                    element.get('photo')):
                                    return element.get('photo')
                            # 检查images字段中是否有图片
                            images = storyboard_data.get('images', [])
                            if images:
                                return images[0] if isinstance(images[0], str) else images[0].get('image_url', '') if isinstance(images[0], dict) else ''
                        except Exception:
                            continue
            return ''
        
        # 加载主体图片信息
        def load_subject_image_info(subject_name, subject_type):
            if subject_type == 'character':
                target_dir = get_project_dir(project_name, 'character')
                # 从按名称命名的角色文件中查找
                if os.path.exists(target_dir):
                    for filename in os.listdir(target_dir):
                        if filename.endswith('.json'):
                            char_path = os.path.join(target_dir, filename)
                            try:
                                with open(char_path, 'r', encoding='utf-8') as f:
                                    char_data = json.load(f)
                                if char_data.get('name') == subject_name:
                                    images = char_data.get('images', [])
                                    if images and isinstance(images[0], dict):
                                        return images[0].get('image_url', images[0].get('local_url', ''))
                                    elif images and isinstance(images[0], str):
                                        return images[0]
                                    return char_data.get('image_url', '')
                            except Exception:
                                continue
            else:
                target_dir = get_project_dir(project_name, 'scene')
                # 从按名称命名的场景文件中查找
                if os.path.exists(target_dir):
                    for filename in os.listdir(target_dir):
                        if filename.endswith('.json'):
                            scene_path = os.path.join(target_dir, filename)
                            try:
                                with open(scene_path, 'r', encoding='utf-8') as f:
                                    scene_data = json.load(f)
                                if scene_data.get('name') == subject_name:
                                    # 返回第一张图片的URL（如果有的话）
                                    images = scene_data.get('images', [])
                                    if images and isinstance(images[0], dict):
                                        return images[0].get('image_url', images[0].get('local_url', ''))
                                    elif images and isinstance(images[0], str):
                                        return images[0]
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
    """从各个scene_X.json文件加载场景图片信息"""
    try:
        project_name = request.args.get('projectName')
        if not project_name:
            return jsonify({'error': 'projectName is required'}), 400
        
        scene_images = []
        
        # 首先从scene目录加载（主要数据源）
        scene_dir = get_project_dir(project_name, 'scene')
        if os.path.exists(scene_dir):
            for filename in os.listdir(scene_dir):
                if filename.endswith('.json'):
                    scene_file_path = os.path.join(scene_dir, filename)
                    try:
                        with open(scene_file_path, 'r', encoding='utf-8') as f:
                            scene_data = json.load(f)
                        
                        # 尝试从文件名或数据中获取scene索引
                        scene_index = 0
                        if filename.startswith('scene_'):
                            # 旧格式：scene_X.json
                            scene_index = int(filename.replace('scene_', '').replace('.json', ''))
                        elif '场景' in filename:
                            # 新格式：场景X.json
                            try:
                                scene_index = int(filename.replace('场景', '').replace('.json', ''))
                            except ValueError:
                                # 如果无法从文件名提取索引，使用数据中的id或默认值
                                scene_index = scene_data.get('id', 0) % 1000  # 取id的后三位作为索引
                        else:
                            # 新的场景主体命名格式：场景名称.json（如"古宅.json"）
                            # 优先使用scene_data中的index字段
                            if 'index' in scene_data:
                                scene_index = scene_data['index']
                            elif 'scene_index' in scene_data:
                                scene_index = scene_data['scene_index']
                            elif 'id' in scene_data:
                                scene_index = scene_data['id']
                            else:
                                # 如果没有明确的索引，使用文件名的hash值模1000作为索引
                                # 这样可以确保相同文件名总是得到相同的索引
                                import hashlib
                                scene_index = int(hashlib.md5(filename.encode()).hexdigest(), 16) % 1000
                        
                        # 如果scene文件中有images字段，则添加到结果中
                        if 'images' in scene_data and scene_data['images']:
                            for image_info in scene_data['images']:
                                if isinstance(image_info, dict):
                                    scene_image_info = {
                                        'scene_index': scene_index,
                                        'image_url': image_info.get('image_url', image_info.get('local_url', '')),
                                        'generation_info': image_info.get('generation_info', {}),
                                        'saved_at': image_info.get('saved_at', ''),
                                        'is_upload': image_info.get('is_upload', False)
                                    }
                                elif isinstance(image_info, str):
                                    scene_image_info = {
                                        'scene_index': scene_index,
                                        'image_url': image_info,
                                        'generation_info': scene_data.get('generation_info', {})
                                    }
                                scene_images.append(scene_image_info)
                        
                        # 如果有主图片（image_url字段），也添加到结果中
                        if scene_data.get('image_url'):
                            scene_image_info = {
                                'scene_index': scene_index,
                                'image_url': scene_data['image_url'],
                                'generation_info': scene_data.get('generation_info', {}),
                                'is_main_image': True
                            }
                            scene_images.append(scene_image_info)
                            
                    except Exception as ie:
                        logging.warning(f'Error reading scene file {filename}: {ie}')
                        continue
        
        # 仅从 scene 目录加载场景图片信息，不再回退到已废弃的 scene_descriptions 目录

        # 获取fragments数量，确保为所有fragments提供场景图片占位符
        fragments_dir = get_project_dir(project_name, 'fragments')
        max_fragment_index = -1
        if os.path.exists(fragments_dir):
            for filename in os.listdir(fragments_dir):
                if filename.endswith('.txt') and filename.replace('.txt', '').isdigit():
                    fragment_index = int(filename.replace('.txt', ''))
                    max_fragment_index = max(max_fragment_index, fragment_index)
        
        # 创建一个包含所有fragment索引的完整场景图片列表
        complete_scene_images = []
        scene_image_map = {img['scene_index']: img for img in scene_images}
        
        # 为每个fragment创建场景图片条目
        for i in range(max_fragment_index + 1):
            if i in scene_image_map:
                # 使用实际的场景图片数据
                complete_scene_images.append(scene_image_map[i])
            else:
                # 创建占位符条目
                complete_scene_images.append({
                    'scene_index': i,
                    'image_url': '',
                    'generation_info': {},
                    'saved_at': '',
                    'is_upload': False,
                    'is_placeholder': True
                })
        
        # 按scene_index排序
        complete_scene_images.sort(key=lambda x: x.get('scene_index', 0))

        logging.info(f"Scene images loaded successfully: {len(complete_scene_images)} total entries ({len(scene_images)} with actual images, {len(complete_scene_images) - len(scene_images)} placeholders)")
        return jsonify({'scene_images': complete_scene_images}), 200

    except Exception as e:
        logging.error(f'Error loading scene images: {e}')
        return jsonify({'error': str(e)}), 500


def update_scene_file():
    """更新单个scene文件，添加生成的图片URL"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        project_name = data.get('projectName')
        scene_index = data.get('sceneIndex')
        image_url = data.get('imageUrl')
        generation_info = data.get('generationInfo', {})
        
        if not project_name or scene_index is None or not image_url:
            return jsonify({'error': 'projectName, sceneIndex and imageUrl are required'}), 400
        
        # 优先更新scene目录中的文件
        scene_dir = get_project_dir(project_name, 'scene')
        if not os.path.exists(scene_dir):
            os.makedirs(scene_dir, exist_ok=True)
        
        scene_file_path = os.path.join(scene_dir, f'scene_{scene_index}.json')
        
        # 读取现有的scene文件或创建新的
        scene_data = {}
        if os.path.exists(scene_file_path):
            try:
                with open(scene_file_path, 'r', encoding='utf-8') as f:
                    scene_data = json.load(f)
            except Exception as e:
                logging.warning(f'Error reading existing scene file {scene_file_path}: {e}')
                scene_data = {}
        else:
            # 如果 scene 目录中没有该文件，则从空结构开始，杜绝从已废弃目录回退
            scene_data = {}
        
        # 确保images字段存在并且是正确的格式
        if 'images' not in scene_data:
            scene_data['images'] = []
        
        # 构建图片信息对象
        image_info = {
            'image_url': image_url,
            'saved_at': datetime.now().isoformat(),
            'is_upload': False
        }
        if generation_info:
            image_info['generation_info'] = generation_info
        
        # 检查是否已存在相同的图片URL
        existing_image = None
        for img in scene_data['images']:
            if isinstance(img, dict) and img.get('image_url') == image_url:
                existing_image = img
                break
            elif isinstance(img, str) and img == image_url:
                existing_image = img
                break
        
        if not existing_image:
            scene_data['images'].append(image_info)
        
        # 设置主图片URL（向后兼容）
        scene_data['image_url'] = image_url
        
        # 更新生成信息
        if generation_info:
            scene_data['generation_info'] = generation_info
        
        # 更新时间戳
        scene_data['updated_at'] = datetime.now().isoformat()
        
        # 保存更新后的scene文件到scene目录
        with open(scene_file_path, 'w', encoding='utf-8') as f:
            json.dump(scene_data, f, ensure_ascii=False, indent=2)
        
        logging.info(f"Scene file updated successfully: {scene_file_path}")
        return jsonify({
            'success': True,
            'message': f'Scene {scene_index} updated successfully',
            'scene_data': scene_data
        }), 200
        
    except Exception as e:
        logging.error(f'Error updating scene file: {e}')
        return jsonify({'error': str(e)}), 500


def save_storyboards():
    """保存分镜脚本，现在通过latest_llm_response_storyboard_generation.json处理"""
    try:
        request_data = request.json
        logging.info(f"Received storyboard save request: {request_data}")
        if not request_data:
            logging.error("No data provided in request")
            return jsonify({'error': 'No data provided'}), 400
        
        # 支持新的数据格式（包含projectName）和旧格式（直接是数组）
        if isinstance(request_data, list):
            storyboards = request_data
            project_name = request.args.get('projectName')
            logging.info(f"List format detected, project_name from args: {project_name}")
            if not project_name:
                logging.error("Project name is required for list format")
                return jsonify({'error': 'Project name is required'}), 400
        else:
            storyboards = request_data.get('storyboards', [])
            project_name = request_data.get('projectName')
            logging.info(f"Object format detected, project_name: {project_name}, storyboards count: {len(storyboards)}")
            if not project_name:
                logging.error("Project name is required in request data")
                return jsonify({'error': 'Project name is required'}), 400

        if not storyboards:
            logging.error("No storyboards data provided")
            return jsonify({'error': 'No storyboards data provided'}), 400
        
        # 清理并重新组织分镜文件
        _cleanup_and_reorganize_storyboard_files(project_name, storyboards)
        
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
        
        scenes_count = len(data.get('scenes', []))
        
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
        
        # 根据文件类型选择对应的处理方式
        if file_type == 'storyboard':
            # 与前端保持一致：从 latest_llm_response_storyboard_generation.json 加载
            parser = LatestStoryboardParser(project_name)
            data = parser.load_latest_storyboard_json()
            if data is None:
                logging.warning("latest_llm_response_storyboard_generation.json not found or invalid")
                return jsonify({'error': 'File not found: latest_llm_response_storyboard_generation.json'}), 404
            return jsonify(data), 200
        elif file_type == 'complete':
            return load_complete_storyboard_data()
        else:
            return jsonify({'error': f'Unsupported file_type: {file_type}'}), 400
    except Exception as e:
        logging.error(f'Error loading file data: {e}')
        return jsonify({'error': str(e)}), 500


def load_character_images():
    """从角色主体文件中加载角色图片信息"""
    try:
        project_name = request.args.get('projectName')
        if not project_name:
            return jsonify({'error': 'projectName is required'}), 400
        character_dir = get_project_dir(project_name, 'character')
        
        if not os.path.exists(character_dir):
            return jsonify({'character_images': []}), 200
        
        character_images = []
        character_index = 0
        
        # 扫描character目录下的所有.json文件
        for filename in os.listdir(character_dir):
            if filename.endswith('.json'):
                char_file_path = os.path.join(character_dir, filename)
                try:
                    with open(char_file_path, 'r', encoding='utf-8') as f:
                        character_data = json.load(f)
                    
                    # 提取角色的图片信息
                    if 'images' in character_data and isinstance(character_data['images'], list):
                        for image_info in character_data['images']:
                            # 添加角色信息到图片数据中
                            enhanced_image_info = {
                                **image_info,
                                'character_name': character_data.get('name', filename.replace('.json', '')),
                                'character_index': character_index
                            }
                            character_images.append(enhanced_image_info)
                    
                    # 如果角色有主要图片URL，也添加进去
                    if 'image_url' in character_data and character_data['image_url']:
                        main_image_info = {
                            'image_url': character_data['image_url'],
                            'character_name': character_data.get('name', filename.replace('.json', '')),
                            'character_index': character_index,
                            'type': 'main_image',
                            'generated_at': character_data.get('created_at', '')
                        }
                        # 检查是否已存在相同的图片URL，避免重复
                        existing_urls = [img.get('image_url') for img in character_images]
                        if character_data['image_url'] not in existing_urls:
                            character_images.append(main_image_info)
                    
                    character_index += 1
                    
                except Exception as e:
                    logging.warning(f"Error loading character file {filename}: {e}")
                    continue
        
        logging.info(f"Loaded {len(character_images)} character images from {character_index} character files for project {project_name}")
        return jsonify({'character_images': character_images}), 200
        
    except Exception as e:
        logging.error(f"Error loading character images: {e}")
        return jsonify({'error': str(e)}), 500