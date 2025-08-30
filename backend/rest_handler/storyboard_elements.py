import json
import logging
import os
from flask import jsonify, request
from backend.util.constant import get_project_base_dir, get_project_dir
from backend.util.latest_storyboard_parser import LatestStoryboardParser


def load_storyboard_elements():
    """从各个storyboard_X.json文件中加载分镜元素数据"""
    try:
        project_name = request.args.get('projectName')
        if not project_name:
            return jsonify({'error': 'No project selected'}), 400
        project_dir = get_project_dir(project_name, 'storyboard')
        
        storyboard_elements = []
        
        # 扫描storyboard目录中的所有storyboard_X.json文件
        if os.path.exists(project_dir):
            scene_files = [f for f in os.listdir(project_dir) if f.startswith('storyboard_') and f.endswith('.json')]
            scene_files.sort(key=lambda x: int(x.split('_')[1].split('.')[0]))  # 按数字排序
            
            for scene_file in scene_files:
                scene_path = os.path.join(project_dir, scene_file)
                try:
                    with open(scene_path, 'r', encoding='utf-8') as f:
                        scene_data = json.load(f)
                    
                    # 提取场景索引
                    scene_index = int(scene_file.split('_')[1].split('.')[0])
                    
                    # 构建分镜元素数据
                    elements = scene_data.get('required_elements', {})
                    element = {
                        'scene_index': scene_index,
                        'characters': elements.get('characters', []),
                        'character_subjects': elements.get('character_subjects', []),
                        'scene_subjects': elements.get('scene_subjects', []),
                        'scene_prompt': elements.get('scene_prompt', ''),
                        'elements_layout': scene_data.get('elements_layout', [])
                    }
                    
                    storyboard_elements.append(element)
                    
                except Exception as file_error:
                    logging.error(f"读取场景文件 {scene_file} 失败: {str(file_error)}")
                    continue
        
        # 如果没有找到scene文件，尝试从latest_llm_response_storyboard_generation.json加载作为备用
        if not storyboard_elements:
            project_base_dir = get_project_dir(project_name, '')
            llm_response_file = os.path.join(project_base_dir, 'latest_llm_response_storyboard_generation.json')
            
            if os.path.exists(llm_response_file):
                with open(llm_response_file, 'r', encoding='utf-8') as f:
                    llm_data = json.load(f)
                
                # 解析LLM响应中的分镜数据
                if 'choices' in llm_data and llm_data['choices']:
                    content = llm_data['choices'][0]['message']['content']
                    parsed_content = json.loads(content)
                    
                    if 'scenes' in parsed_content:
                        scenes = parsed_content['scenes']
                        
                        # 提取分镜元素
                        for index, scene in enumerate(scenes):
                            elements = scene.get('required_elements', {})
                            
                            element = {
                                'scene_index': index,
                                'characters': elements.get('characters', []),
                                'character_subjects': elements.get('character_subjects', []),
                                'scene_subjects': elements.get('scene_subjects', []),
                                'scene_prompt': elements.get('scene_prompt', ''),
                                'elements_layout': scene.get('elements_layout', [])
                            }
                            
                            storyboard_elements.append(element)
        
        # 补充图片信息
        for element in storyboard_elements:
            # 为角色主体补充图片信息
            for char_subject in element['character_subjects']:
                if isinstance(char_subject, dict):
                    char_subject['image'] = char_subject.get('image', '')
            
            # 为场景主体补充图片信息
            for scene_subject in element['scene_subjects']:
                if isinstance(scene_subject, dict):
                    scene_subject['image'] = scene_subject.get('image', '')
        
        return jsonify(storyboard_elements), 200
        
    except Exception as e:
        logging.error(f"加载分镜元素失败: {str(e)}")
        return jsonify({'error': str(e)}), 500