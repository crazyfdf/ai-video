import json
import logging
import os
import re
import time
from datetime import datetime

import requests
from flask import jsonify, request

from backend.util.constant import get_project_dir


def save_subjects():
    """保存主体数据 - 角色保存到character文件夹，场景保存到scene文件夹"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # 获取项目名称
        project_name = data.get('projectName')
        if not project_name:
            return jsonify({"error": "Project name is required"}), 400
        
        # 获取主体数据
        character_subjects = data.get('characterSubjects', [])
        scene_subjects = data.get('sceneSubjects', [])
        
        # 创建必要的目录
        character_dir = get_project_dir(project_name, 'character')
        scene_dir = get_project_dir(project_name, 'scene')
        os.makedirs(character_dir, exist_ok=True)
        os.makedirs(scene_dir, exist_ok=True)
        
        # 清理旧文件 - 删除所有现有的主体文件，然后重新保存
        # 这样可以处理主体名称变更、删除等情况
        for filename in os.listdir(character_dir):
            if filename.endswith('.json'):
                os.remove(os.path.join(character_dir, filename))
        
        for filename in os.listdir(scene_dir):
            if filename.endswith('.json'):
                os.remove(os.path.join(scene_dir, filename))
        
        # 检测并处理主体名称冲突
        used_char_names = set()
        used_scene_names = set()
        
        # 保存角色主体到character文件夹（使用角色名称命名）
        for i, char_subject in enumerate(character_subjects):
            char_name = char_subject.get('name', f'character_{i}').strip()
            # 清理文件名中的非法字符，保留中文字符
            import re
            # 移除Windows文件名中的非法字符，但保留中文、字母、数字、空格、连字符、下划线
            safe_char_name = re.sub(r'[<>:"/\\|?*]', '', char_name).strip()
            if not safe_char_name:
                safe_char_name = f'character_{i}'
            
            # 处理名称冲突
            original_name = safe_char_name
            counter = 1
            while safe_char_name in used_char_names:
                safe_char_name = f"{original_name}_{counter}"
                counter += 1
            used_char_names.add(safe_char_name)
            
            char_file = os.path.join(character_dir, f"{safe_char_name}.json")
            char_data = {
                "id": char_subject.get('id', i),
                "name": char_name,  # 直接使用用户输入的名称
                "appearance": char_subject.get('description', ''),
                "description": char_subject.get('description', ''),
                "tag": char_subject.get('tag', ''),
                "englishPrompt": char_subject.get('tag', ''),
                "selectedLora": char_subject.get('selectedLora', ''),
                "image_url": char_subject.get('images', [''])[0] if char_subject.get('images') else '',
                "images": [{
                    "image_url": char_subject.get('images', [''])[0] if char_subject.get('images') else '',
                    "generated_at": char_subject.get('createdAt', ''),
                    "type": "ai_generated"
                }] if char_subject.get('images') else [],
                "createdAt": char_subject.get('createdAt', '')
            }
            
            with open(char_file, "w", encoding="utf-8") as f:
                json.dump(char_data, f, ensure_ascii=False, indent=2)
        
        # 保存场景主体到scene文件夹（使用场景名称命名）
        for i, scene_subject in enumerate(scene_subjects):
            scene_name = scene_subject.get('name', f'scene_{i}').strip()
            # 清理文件名中的非法字符，保留中文字符
            import re
            # 移除Windows文件名中的非法字符，但保留中文、字母、数字、空格、连字符、下划线
            safe_scene_name = re.sub(r'[<>:"/\\|?*]', '', scene_name).strip()
            if not safe_scene_name:
                safe_scene_name = f'scene_{i}'
            
            # 处理名称冲突
            original_name = safe_scene_name
            counter = 1
            while safe_scene_name in used_scene_names:
                safe_scene_name = f"{original_name}_{counter}"
                counter += 1
            used_scene_names.add(safe_scene_name)
            
            scene_file = os.path.join(scene_dir, f"{safe_scene_name}.json")
            scene_data = {
                "id": scene_subject.get('id', i),
                "name": scene_name,  # 直接使用用户输入的名称
                "description": scene_subject.get('description', ''),
                "tag": scene_subject.get('tag', ''),
                "englishPrompt": scene_subject.get('tag', ''),
                "selectedLora": scene_subject.get('selectedLora', ''),
                "image_url": scene_subject.get('images', [''])[0] if scene_subject.get('images') else '',
                "images": [{
                    "image_url": scene_subject.get('images', [''])[0] if scene_subject.get('images') else '',
                    "generated_at": scene_subject.get('createdAt', ''),
                    "type": "ai_generated"
                }] if scene_subject.get('images') else [],
                "createdAt": scene_subject.get('createdAt', '')
            }
            
            with open(scene_file, "w", encoding="utf-8") as f:
                json.dump(scene_data, f, ensure_ascii=False, indent=2)

        logging.info(f"Subjects saved successfully: {len(character_subjects)} characters to {character_dir}, {len(scene_subjects)} scenes to {scene_dir}")
        return jsonify({"message": "Subjects saved successfully", "character_count": len(character_subjects), "scene_count": len(scene_subjects)}), 200

    except Exception as e:
        logging.error(f"Error saving subjects: {str(e)}")
        return jsonify({"error": f"Failed to save subjects: {str(e)}"}), 500


def load_subjects():
    """加载主体数据"""
    try:
        # 获取项目名称参数
        project_name = request.args.get('projectName', '猛鬼世界')  # 默认项目名称
        
        # 使用项目规范的temp目录结构
        project_dir = get_project_dir(project_name, '')
        
        # 默认数据结构
        default_data = {
            "characterSubjects": [],
            "sceneSubjects": []
        }
        
        # 直接从实际的文件夹结构加载数据（不再依赖subjects.json）
        character_dir = get_project_dir(project_name, "character")
        # 场景主体统一从 scene 目录读取
        
        character_subjects = []
        scene_subjects = []
        
        # 加载角色主体数据 - 从character文件夹中的所有.json文件
        if os.path.exists(character_dir):
            for filename in os.listdir(character_dir):
                if filename.endswith('.json'):
                    file_path = os.path.join(character_dir, filename)
                    try:
                        with open(file_path, "r", encoding="utf-8") as f:
                            char_data = json.load(f)
                        
                        # 转换为Subject格式
                        # 正确处理images字段 - 可能是对象数组或字符串数组
                        images_list = []
                        if char_data.get("images") and isinstance(char_data["images"], list):
                            for img in char_data["images"]:
                                if isinstance(img, dict) and img.get("image_url"):
                                    images_list.append(img["image_url"])
                                elif isinstance(img, str):
                                    images_list.append(img)
                        elif char_data.get("image_url"):
                            images_list.append(char_data["image_url"])
                        
                        # 获取创建时间
                        created_at = ""
                        if char_data.get("images") and isinstance(char_data["images"], list) and len(char_data["images"]) > 0:
                            first_image = char_data["images"][0]
                            if isinstance(first_image, dict):
                                created_at = first_image.get("generated_at", "")
                        
                        # 使用当前列表长度作为ID（角色文件使用名称命名，不是索引）
                        file_id = len(character_subjects)
                        
                        subject = {
                            "id": file_id,
                            "name": char_data.get("name", ""),
                            "description": char_data.get("appearance", ""),
                            "tag": char_data.get("englishPrompt", ""),
                            "images": images_list,
                            "createdAt": created_at,
                            "selectedLora": char_data.get("selectedLora", ""),
                            "photo": images_list[0] if images_list else "",
                            "lora": char_data.get("selectedLora", ""),
                            "prompt": char_data.get("englishPrompt", "")
                        }
                        character_subjects.append(subject)
                        
                    except Exception as e:
                        logging.warning(f"Failed to load character file {filename}: {str(e)}")
        
        # 加载场景主体数据 - 从scene文件夹加载所有.json文件（使用场景名称命名）
        scene_dir = get_project_dir(project_name, "scene")
        if os.path.exists(scene_dir):
            for filename in os.listdir(scene_dir):
                if filename.endswith('.json'):
                    file_path = os.path.join(scene_dir, filename)
                    try:
                        with open(file_path, "r", encoding="utf-8") as f:
                            scene_data = json.load(f)
                        
                        # 正确处理images字段 - 可能是对象数组或字符串数组
                        images_list = []
                        if scene_data.get("images") and isinstance(scene_data["images"], list):
                            for img in scene_data["images"]:
                                if isinstance(img, dict) and img.get("image_url"):
                                    images_list.append(img["image_url"])
                                elif isinstance(img, str):
                                    images_list.append(img)
                        elif scene_data.get("image_url"):
                            images_list.append(scene_data["image_url"])
                        
                        # 获取创建时间
                        created_at = ""
                        if scene_data.get("images") and isinstance(scene_data["images"], list) and len(scene_data["images"]) > 0:
                            first_image = scene_data["images"][0]
                            if isinstance(first_image, dict):
                                created_at = first_image.get("generated_at", "")
                        if not created_at:
                            created_at = scene_data.get("createdAt", "")
                        
                        # 使用当前列表长度作为ID（场景文件使用名称命名，不是索引）
                        file_id = len(scene_subjects)
                        
                        # 确保场景主体数据有必要的字段
                        if 'name' in scene_data:
                            # 转换为Subject格式，优先使用originalName显示
                            display_name = scene_data.get("originalName", scene_data.get("name", ""))
                            subject = {
                                "id": file_id,
                                "name": display_name,  # 使用原始名称显示
                                "description": scene_data.get("description", ""),
                                "tag": scene_data.get("tag", scene_data.get("englishPrompt", "")),
                                "images": images_list,
                                "createdAt": created_at,
                                "selectedLora": scene_data.get("selectedLora", ""),
                                "photo": images_list[0] if images_list else "",
                                "lora": scene_data.get("selectedLora", ""),
                                "prompt": scene_data.get("englishPrompt", scene_data.get("tag", ""))
                            }
                            scene_subjects.append(subject)
                        
                    except Exception as e:
                        logging.warning(f"Failed to load scene file {filename}: {str(e)}")
        
        
        
        # 尝试从旧的目录结构加载（向后兼容）
        old_characters_dir = get_project_dir(project_name, "characters")
        old_scenes_dir = get_project_dir(project_name, "scenes")
        
        # 加载旧格式的角色主体数据
        if os.path.exists(old_characters_dir) and not character_subjects:
            for filename in os.listdir(old_characters_dir):
                if filename.endswith('_generated_info.json'):
                    file_path = os.path.join(old_characters_dir, filename)
                    try:
                        with open(file_path, "r", encoding="utf-8") as f:
                            char_data = json.load(f)
                        
                        # 转换为Subject格式
                        subject = {
                            "id": char_data.get("character_index", 0),
                            "name": char_data.get("character_name", ""),
                            "description": char_data.get("character_info", {}).get("appearance", ""),
                            "tag": char_data.get("character_info", {}).get("englishPrompt", ""),
                            "images": [char_data.get("image_url", "")] if char_data.get("image_url") else [],
                            "createdAt": char_data.get("generated_at", ""),
                            "selectedLora": "",
                            "photo": char_data.get("image_url", ""),
                            "lora": "",
                            "prompt": char_data.get("character_info", {}).get("englishPrompt", "")
                        }
                        character_subjects.append(subject)
                        
                    except Exception as e:
                        logging.warning(f"Failed to load old character file {filename}: {str(e)}")
        
        # 加载旧格式的场景主体数据
        if os.path.exists(old_scenes_dir) and not scene_subjects:
            for filename in os.listdir(old_scenes_dir):
                if filename.endswith('_info.json'):
                    file_path = os.path.join(old_scenes_dir, filename)
                    try:
                        with open(file_path, "r", encoding="utf-8") as f:
                            scene_data = json.load(f)
                        
                        # 转换为Subject格式
                        subject = {
                            "id": scene_data.get("scene_index", 0),
                            "name": scene_data.get("scene_name", "场景"),
                            "description": scene_data.get("scene_description", ""),
                            "tag": scene_data.get("scene_prompt", ""),
                            "images": scene_data.get("scene_images", []),
                            "createdAt": scene_data.get("generated_at", ""),
                            "selectedLora": "",
                            "photo": scene_data.get("scene_images", [""])[0] if scene_data.get("scene_images") else "",
                            "lora": "",
                            "prompt": scene_data.get("scene_prompt", "")
                        }
                        scene_subjects.append(subject)
                        
                    except Exception as e:
                        logging.warning(f"Failed to load old scene file {filename}: {str(e)}")
        
        # 旧数据已加载，不再保存到subjects.json文件
        if character_subjects or scene_subjects:
            logging.info(f"Legacy data loaded: {len(character_subjects)} characters, {len(scene_subjects)} scenes")
        
        data = {
            "characterSubjects": character_subjects,
            "sceneSubjects": scene_subjects
        }
        
        logging.info(f"Subjects loaded successfully from project {project_name}: {len(character_subjects)} characters, {len(scene_subjects)} scenes")
        return jsonify(data), 200

    except Exception as e:
        logging.error(f"Error loading subjects: {str(e)}")
        return jsonify({"error": f"Failed to load subjects: {str(e)}"}), 500


# --- New: Subject images save/load ---

def save_subject_image():
    """保存主体图片（通用：角色/场景主体均可）"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        subject_id = str(data.get('subjectId', '')).strip()
        image_url = data.get('imageUrl', '').strip()
        subject_type = data.get('subjectType', 'character')
        project_name = data.get('projectName')
        if not project_name:
          return jsonify({'error': 'projectName is required'}), 400

        if not subject_id or not image_url:
            return jsonify({"error": "subjectId and imageUrl are required"}), 400

        # 根据主体类型选择目录
        if subject_type == 'character':
            images_dir = get_project_dir(project_name, 'character')
        else:
            images_dir = get_project_dir(project_name, 'scene')
        os.makedirs(images_dir, exist_ok=True)

        # 判断是否为上传图片（需要下载保存）还是生成图片（只保存URL）
        is_upload = data.get('isUpload', False)  # 前端传递是否为上传图片的标志
        
        # 构建图片信息
        image_info = {
            "image_url": image_url,
            "saved_at": datetime.now().isoformat(),
            "is_upload": is_upload
        }
        
        if is_upload:
            # 上传图片：下载并保存到本地
            try:
                resp = requests.get(image_url, timeout=30)
                resp.raise_for_status()
                content_type = resp.headers.get('content-type', '')
                if 'jpeg' in content_type or 'jpg' in content_type:
                    ext = '.jpg'
                elif 'png' in content_type:
                    ext = '.png'
                elif 'webp' in content_type:
                    ext = '.webp'
                else:
                    # 从URL猜测
                    if image_url.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                        ext = os.path.splitext(image_url)[1]
                    else:
                        ext = '.jpg'
                ts = int(time.time())
                filename = f"{subject_id}_{ts}{ext}"
                file_path = os.path.join(images_dir, filename)
                with open(file_path, 'wb') as f:
                    f.write(resp.content)
                
                image_info["filename"] = filename
                image_info["file_size"] = len(resp.content)
                image_info["local_url"] = f"/temp/{project_name}/{'character' if subject_type == 'character' else 'scene'}/{filename}"
                
            except Exception as de:
                logging.error(f"Failed to download uploaded image: {de}")
                return jsonify({"error": f"Failed to download image: {str(de)}"}), 500
        else:
            # 生成图片：只保存URL信息，不下载文件
            image_info["local_url"] = image_url  # 直接使用原始URL

        # 将图片信息合并到对应的JSON文件中
        if subject_type == 'character':
            # 查找角色JSON文件（按名称命名，支持中文）
            target_file = None
            target_data = None

            # 1) 优先尝试直接根据名称匹配同名文件
            safe_name = re.sub(r'[<>:"/\\|?*]', '', subject_id).strip()
            direct_path = os.path.join(images_dir, f"{safe_name}.json")
            if os.path.exists(direct_path):
                target_file = direct_path
                try:
                    with open(target_file, 'r', encoding='utf-8') as f:
                        target_data = json.load(f)
                except Exception:
                    target_data = {}

            # 2) 回退：遍历所有.json文件，读取"name"字段匹配
            if not target_file:
                for fname in os.listdir(images_dir):
                    if not fname.endswith('.json'):
                        continue
                    fpath = os.path.join(images_dir, fname)
                    try:
                        with open(fpath, 'r', encoding='utf-8') as f:
                            data_json = json.load(f)
                        if data_json.get('name') == subject_id:
                            target_file = fpath
                            target_data = data_json
                            break
                    except Exception:
                        continue

            if target_file:
                if 'images' not in target_data or not isinstance(target_data['images'], list):
                    target_data['images'] = []
                target_data['images'].append(image_info)
                # 若主图为空则同步
                if not target_data.get('image_url'):
                    target_data['image_url'] = image_info.get('image_url') or image_info.get('local_url', '')
                with open(target_file, 'w', encoding='utf-8') as f:
                    json.dump(target_data, f, ensure_ascii=False, indent=2)
        else:
            # 场景图片：按“场景主体名.json”保存
            target_file = None
            target_data = None

            safe_name = re.sub(r'[<>:"/\\|?*]', '', subject_id).strip()
            direct_path = os.path.join(images_dir, f"{safe_name}.json")
            if os.path.exists(direct_path):
                target_file = direct_path
                try:
                    with open(target_file, 'r', encoding='utf-8') as f:
                        target_data = json.load(f)
                except Exception:
                    target_data = {}

            if not target_file:
                # 遍历所有.json，通过name匹配
                for fname in os.listdir(images_dir):
                    if not fname.endswith('.json'):
                        continue
                    fpath = os.path.join(images_dir, fname)
                    try:
                        with open(fpath, 'r', encoding='utf-8') as f:
                            data_json = json.load(f)
                        if data_json.get('name') == subject_id:
                            target_file = fpath
                            target_data = data_json
                            break
                    except Exception:
                        continue

            # 最后回退：如果subject_id是数字，兼容 scene_{id}.json
            if not target_file and subject_id.isdigit():
                fallback_path = os.path.join(images_dir, f"scene_{int(subject_id)}.json")
                if os.path.exists(fallback_path):
                    target_file = fallback_path
                    try:
                        with open(target_file, 'r', encoding='utf-8') as f:
                            target_data = json.load(f)
                    except Exception:
                        target_data = {}

            if target_file:
                if 'images' not in target_data or not isinstance(target_data['images'], list):
                    target_data['images'] = []
                target_data['images'].append(image_info)
                if not target_data.get('image_url'):
                    target_data['image_url'] = image_info.get('image_url') or image_info.get('local_url', '')
                with open(target_file, 'w', encoding='utf-8') as f:
                    json.dump(target_data, f, ensure_ascii=False, indent=2)
            else:
                logging.warning(f"Could not find scene file for subject name/id: {subject_id}")

        logging.info(f"Subject image saved: subject {subject_id} (project {project_name})")
        return jsonify({'message': 'Subject image saved successfully', 'image_info': image_info}), 200

    except Exception as e:
        logging.error(f"Error saving subject image: {e}")
        return jsonify({'error': str(e)}), 500


def load_subject_images():
    """加载主体图片（返回扁平列表）"""
    try:
        # 兼容 projectName 与 project_name 两种参数
        project_name = request.args.get('projectName') or request.args.get('project_name')
        if not project_name:
            return jsonify({'error': 'projectName is required'}), 400
        character_dir = get_project_dir(project_name, 'character')
        scene_dir = get_project_dir(project_name, 'scene')
        
        results = []
        
        # 从角色文件加载图片
        if os.path.exists(character_dir):
            for filename in os.listdir(character_dir):
                if filename.endswith('.json'):
                    char_path = os.path.join(character_dir, filename)
                    try:
                        with open(char_path, 'r', encoding='utf-8') as f:
                            char_data = json.load(f)
                        
                        # 提取角色的图片信息
                        char_name = char_data.get('name', '')
                        char_index = os.path.splitext(filename)[0]
                        
                        # 添加主图片（image_url）
                        if char_data.get('image_url'):
                            image_info = {
                                'image_url': char_data['image_url'],
                                'subject_type': 'character',
                                'subject_name': char_name,
                                'subject_index': char_index,
                                'saved_at': char_data.get('generated_at', ''),
                                'is_main_image': True
                            }
                            results.append(image_info)
                        
                        # 添加其他图片（images字段）
                        if char_data.get('images'):
                            for img in char_data['images']:
                                if isinstance(img, dict):
                                    image_info = {
                                        'image_url': img.get('image_url', img.get('local_url', '')),
                                        'subject_type': 'character',
                                        'subject_name': char_name,
                                        'subject_index': char_index,
                                        'saved_at': img.get('saved_at', ''),
                                        'is_upload': img.get('is_upload', False),
                                        'is_main_image': False
                                    }
                                    results.append(image_info)
                    except Exception as e:
                        logging.warning(f"Failed to read character file {filename}: {e}")
        
        # 从场景文件加载图片 - 优先从scene文件夹加载
        scene_dir = get_project_dir(project_name, 'scene')
        if os.path.exists(scene_dir):
            for filename in os.listdir(scene_dir):
                if filename.endswith('.json'):
                    scene_path = os.path.join(scene_dir, filename)
                    try:
                        with open(scene_path, 'r', encoding='utf-8') as f:
                            scene_data = json.load(f)
                        
                        # 提取场景的图片信息
                        scene_name = scene_data.get('name', os.path.splitext(filename)[0])
                        scene_index = os.path.splitext(filename)[0]
                        
                        # 添加主图片（image_url）
                        if scene_data.get('image_url'):
                            image_info = {
                                'image_url': scene_data['image_url'],
                                'subject_type': 'scene',
                                'subject_name': scene_name,
                                'subject_index': scene_index,
                                'saved_at': scene_data.get('createdAt', ''),
                                'is_main_image': True
                            }
                            results.append(image_info)
                        
                        # 添加其他图片（images字段）
                        if scene_data.get('images'):
                            for img in scene_data['images']:
                                if isinstance(img, dict):
                                    image_info = {
                                        'image_url': img.get('image_url', img.get('local_url', '')),
                                        'subject_type': 'scene',
                                        'subject_name': scene_name,
                                        'subject_index': scene_index,
                                        'saved_at': img.get('saved_at', ''),
                                        'is_upload': img.get('is_upload', False),
                                        'is_main_image': False
                                    }
                                    results.append(image_info)
                    except Exception as e:
                        logging.warning(f"Failed to read scene file {filename}: {e}")
        
        
        
        # 按时间排序
        results.sort(key=lambda x: x.get('saved_at', ''), reverse=True)
        logging.info(f"Subject images loaded successfully: {len(results)} images")
        return jsonify(results), 200
    except Exception as e:
        logging.error(f"Error loading subject images: {e}")
        return jsonify({'error': str(e)}), 500