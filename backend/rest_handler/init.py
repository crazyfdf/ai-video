import json
import logging
import os
import shutil
from datetime import datetime

from flask import jsonify, request

from backend.util.constant import (
    config_path,
    image_dir,
    novel_fragments_dir,
    prompt_path,
    prompts_dir,
    prompts_en_dir,
    get_project_dir,
    get_project_base_dir,
)
from backend.util.file import (
    read_file,
    read_files_from_directory,
    read_lines_from_directory,
    read_lines_from_directory_utf8,
    save_list_to_files,
)


def handle_error(status_code, message, error):
    response = jsonify({"error": message, "details": str(error)})
    response.status_code = status_code
    return response


def save_lines_to_files(file_name):
    try:
        with open(file_name, "r", encoding="utf-8") as file:
            lines = file.readlines()
            linesWithContent = []
            for line in lines:
                line = line.strip()
                if line:
                    linesWithContent.append(line)
            for i, line in enumerate(linesWithContent):
                file_path = os.path.join(novel_fragments_dir, f"{i}.txt")
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(line)
    except Exception as e:
        return e
    return None


def save_lines_to_files_with_path(file_name, output_dir):
    """将文件按行分割并保存到指定目录"""
    try:
        with open(file_name, "r", encoding="utf-8") as file:
            lines = file.readlines()
            linesWithContent = []
            for line in lines:
                line = line.strip()
                if line:
                    linesWithContent.append(line)
            for i, line in enumerate(linesWithContent):
                file_path = os.path.join(output_dir, f"{i}.txt")
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(line)
    except Exception as e:
        return e
    return None


def save_combined_fragments():
    data = request.json
    if not data:
        return handle_error(400, "Invalid request", "No data provided")
    
    fragments = data if isinstance(data, list) else data.get('fragments', [])
    project_name = data.get('project_name') if isinstance(data, dict) else None
    if not project_name:
        return jsonify({'error': 'project_name is required'}), 400
    
    if not isinstance(fragments, list):
        return handle_error(400, "Invalid request", "Expected a list of strings")

    try:
        # 使用项目专用的fragments目录
        project_fragments_dir = get_project_dir(project_name, 'fragments')
        
        if os.path.exists(project_fragments_dir):
            shutil.rmtree(project_fragments_dir, ignore_errors=True)
        os.makedirs(project_fragments_dir, exist_ok=True)
        error = save_list_to_files(fragments, project_fragments_dir, 0)
        if error:
            return handle_error(500, "Failed to save", error)
    except Exception as e:
        return handle_error(500, "Failed to process request", e)

    return jsonify({"message": "Fragments saved successfully"}), 200


def get_novel_fragments():
    try:
        # 使用项目路径查找小说内容
        project_name = request.args.get('project_name')
        if not project_name:
            return jsonify({'error': 'project_name is required'}), 400
        
        # 从project_settings.json读取小说内容
        project_settings_path = os.path.join(get_project_base_dir(project_name), 'project_settings.json')
        novel_content = ""
        
        if os.path.exists(project_settings_path):
            with open(project_settings_path, 'r', encoding='utf-8') as f:
                project_settings = json.load(f)
                novel_content = project_settings.get('novelContent', '')
        
        # 如果没有找到小说内容，返回错误
        # 注意：已移除对novel.txt的向后兼容支持，现在只从project_settings.json读取
        
        if not novel_content.strip():
            return handle_error(404, "Novel content not found", f"No novel content found for project {project_name}")
        
        # 使用项目专用的fragments目录
        project_fragments_dir = get_project_dir(project_name, 'fragments')
        
        if os.path.exists(project_fragments_dir):
            shutil.rmtree(project_fragments_dir, ignore_errors=True)
        os.makedirs(project_fragments_dir, exist_ok=True)
        
        # 将小说内容按行分割并保存到fragments
        lines = novel_content.strip().split('\n')
        lines_with_content = [line.strip() for line in lines if line.strip()]
        
        for i, line in enumerate(lines_with_content):
            file_path = os.path.join(project_fragments_dir, f"{i}.txt")
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(line)
        
        return jsonify(lines_with_content), 200
        
    except Exception as e:
        logging.error(e)
        return handle_error(500, "Failed to process request", e)


def get_initial():
    try:
        novels, error = read_lines_from_directory(novel_fragments_dir)
        if error:
            return handle_error(500, "Failed to read fragments", error)

        prompts, error = read_lines_from_directory(prompts_dir)
        if error:
            return handle_error(500, "Failed to read prompts", error)

        prompts_en, error = read_lines_from_directory_utf8(prompts_en_dir)
        if error:
            return handle_error(500, "Failed to read prompts", error)

        files = read_files_from_directory(image_dir)
        images = []

        for file in files:
            if not os.path.isdir(file):
                image_path = os.path.join("/images", file)
                images.append(image_path)

        data = {
            "fragments": novels,
            "images": images,
            "prompts": prompts,
            "promptsEn": prompts_en,
        }
    except Exception as e:
        logging.error(e)
        return handle_error(500, "Failed to process request", e)

    return jsonify(data), 200


def load_novel():
    try:
        # 从project_settings.json读取小说内容
        project_name = request.args.get('project_name')
        if not project_name:
            return jsonify({'error': 'project_name is required'}), 400
        project_settings_path = os.path.join(get_project_base_dir(project_name), 'project_settings.json')
        
        if os.path.exists(project_settings_path):
            with open(project_settings_path, 'r', encoding='utf-8') as f:
                project_settings = json.load(f)
                content = project_settings.get('novelContent', '')
                if content:
                    return jsonify({"content": content}), 200
        
        # 如果project_settings.json中没有内容，返回空内容
        return jsonify({"content": ""}), 200
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def save_novel():
    try:
        data = request.get_json()
        content = data.get("content", "")
        project_name = data.get("project_name")
        if not project_name:
            return jsonify({'error': 'project_name is required'}), 400
        
        # 保存到project_settings.json
        project_settings_path = os.path.join(get_project_base_dir(project_name), 'project_settings.json')
        
        if os.path.exists(project_settings_path):
            with open(project_settings_path, 'r', encoding='utf-8') as f:
                project_settings = json.load(f)
        else:
            # 创建新的project_settings.json
            now = datetime.now().isoformat()
            project_settings = {
                "projectName": project_name,
                "projectInfo": {
                    "id": project_name,
                    "name": project_name,
                    "description": "",
                    "createdAt": now,
                    "updatedAt": now
                },
                "defaultSizeConfig": {
                    "aspectRatio": "16:9",
                    "quality": "fhd",
                    "width": 1920,
                    "height": 1080
                },
                "novelContent": "",
                "globalSettings": {
                    "imageGeneration": {
                        "defaultAspectRatio": "16:9",
                        "defaultQuality": "fhd",
                        "defaultWidth": 1920,
                        "defaultHeight": 1080
                    },
                    "textGeneration": {
                        "baseNovelContent": ""
                    }
                },
                "lastUpdated": now,
                "version": "1.0.0"
            }
        
        # 更新小说内容和更新时间
        project_settings["novelContent"] = content
        project_settings["lastUpdated"] = datetime.now().isoformat()
        if "projectInfo" in project_settings:
            project_settings["projectInfo"]["updatedAt"] = datetime.now().isoformat()
        
        # 保存更新后的project_settings.json
        with open(project_settings_path, 'w', encoding='utf-8') as f:
            json.dump(project_settings, f, ensure_ascii=False, indent=2)

        return jsonify({"message": "保存成功！"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def load_prompt():
    try:
        content = read_file(prompt_path)
        return jsonify({"content": content}), 200
    except FileNotFoundError:
        return jsonify({"content": ""}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def save_prompt():
    try:
        data = request.get_json()
        content = data.get("content", "")

        with open(prompt_path, "w", encoding="utf-8") as file:
            file.write(content)

        return jsonify({"message": "保存成功！"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def get_model_config():
    if not os.path.exists(config_path) or os.path.getsize(config_path) == 0:
        with open(config_path, "w", encoding="utf-8") as file:
            json.dump(
                {"model": "", "url": "", "apikey": "", "address2": "", "address3": ""},
                file,
            )
    try:
        with open(config_path, "r", encoding="utf-8") as file:
            data = json.load(file)
            logging.info(data["url"])
        return jsonify(data)
    except Exception as e:
        logging.error(f"Error reading addresses: {e}")
        return "Error reading addresses", 500


def save_model_config():
    try:
        data = request.json
        key = data.get("key")
        value = data.get("value")
        with open(config_path, "r", encoding="utf-8") as file:
            addresses = json.load(file)
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except json.JSONDecodeError:
                pass  # If it's not a JSON string, keep it as is
        addresses[key] = value
        with open(config_path, "w", encoding="utf-8") as file:
            json.dump(addresses, file, ensure_ascii=False, indent=4)
        return "Address saved successfully", 200
    except Exception as e:
        logging.error(f"Error saving {key}: {e}")
        return f"Error saving {key}", 500
