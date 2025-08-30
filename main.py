import logging
import os

from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS

# 旧的角色处理器已删除
from backend.rest_handler.image import (
    generate_images,
    generate_single_image,
    get_local_images,
    save_generated_image_to_recipe,
)
from backend.rest_handler.init import (
    get_initial,
    get_model_config,
    get_novel_fragments,
    load_novel,
    load_prompt,
    save_combined_fragments,
    save_model_config,
    save_novel,
    save_prompt,
)
from backend.rest_handler.prompt import (
    extract_scene_from_texts,
    get_prompts_en,
    save_prompt_en,
    save_prompt_zh,
)
from backend.rest_handler.civitai_proxy import (
    proxy_civitai_request,
    search_models,
    get_model_by_id,
    get_model_version_by_id,
    test_civitai_connection,
)
from backend.rest_handler.comfyui_lora_manager import (
    test_comfyui_connection,
    get_comfyui_loras,
    get_comfyui_recipes,
    save_image_to_comfyui_recipe,
    search_comfyui_civitai_models,
)
from backend.rest_handler.video import generate_video, get_video
from backend.tts.tts import generate_audio_files
from backend.util.constant import image_dir, video_dir

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(levelname)s - %(message)s [File: %(filename)s, Line: %(lineno)d]",
)


# novel
@app.route("/api/get/novel/fragments", methods=["GET"])  # 获取片段
def api_get_novel_fragments():
    return get_novel_fragments()


@app.route("/api/save/novel/fragments", methods=["POST"])  # 切割片段
def api_save_combined_fragments():
    return save_combined_fragments()


# prompts
@app.route("/api/get/novel/prompts", methods=["GET"])  # 提取场景
def api_extract_scene_from_texts():
    return extract_scene_from_texts()


@app.route("/api/novel/prompts/en", methods=["GET"])  # 获取英文提示词
def api_get_prompts_en():
    return get_prompts_en()


@app.route("/api/novel/prompt/en", methods=["POST"])  # 保存英文提示词
def api_save_prompt_en():
    return save_prompt_en()


@app.route("/api/novel/prompt/zh", methods=["POST"])  # 保存中文提示词
def api_save_prompt_zh():
    return save_prompt_zh()


# image
@app.route("/api/novel/images", methods=["POST"])  # 一键生成
def api_generate_image():
    return generate_images()


@app.route("/api/novel/image", methods=["POST"])  # 重新生成图片
def api_get_local_image():
    return generate_single_image()


@app.route("/api/novel/images", methods=["GET"])  # 获取本地图片
def api_get_local_images():
    return get_local_images()


# 初始化
@app.route("/api/novel/initial", methods=["GET"])  # 初始化
def api_get_initial():
    return get_initial()


# tts
@app.route("/api/novel/audio", methods=["POST"])  # 生成音频
def api_generate_audio_files():
    return generate_audio_files()


# 旧的角色接口已删除，现在使用新的角色信息保存接口


# 获取小说文本
@app.route("/api/novel/load", methods=["GET"])
def api_load_novel():
    return load_novel()


# 保存小说文本
@app.route("/api/novel/save", methods=["POST"])
def api_save_novel():
    return save_novel()


# 获取文生图prompt
@app.route("/api/prompt/load", methods=["GET"])
def api_load_prompt():
    return load_prompt()


# 保存文生图prompt
@app.route("/api/prompt/save", methods=["POST"])
def api_save_prompt():
    return save_prompt()


# 读取视频
@app.route("/api/novel/video", methods=["GET"])
def api_get_video():
    return get_video()


# 生成视频
@app.route("/api/novel/video", methods=["POST"])
def api_generate_video():
    return generate_video()


# 加载视频数据
@app.route("/api/load/video/data", methods=["GET"])
def api_load_video_data():
    from backend.rest_handler.video import load_video_data
    return load_video_data()


@app.route("/api/model/config", methods=["GET"])
def api_get_model_config():
    return get_model_config()


@app.route("/api/model/config", methods=["POST"])
def api_save_model_config():
    return save_model_config()


# 新增：项目管理相关接口
@app.route("/api/projects/list", methods=["GET"])
def api_projects_list():
    """列出temp目录下的所有项目。
    - 自动扫描 temp 目录下的子文件夹
    - 从 project_settings.json 读取项目信息
    - 如果不存在，则基于文件夹名构建默认项目信息
    返回前端期望的结构：[{ id, name, description, createdAt, updatedAt }]
    """
    import os
    import json
    from datetime import datetime

    temp_dir = os.path.join(os.getcwd(), "temp")
    projects = []

    if not os.path.exists(temp_dir):
        return jsonify(projects), 200

    for name in os.listdir(temp_dir):
        project_path = os.path.join(temp_dir, name)
        if not os.path.isdir(project_path):
            continue
        settings_file = os.path.join(project_path, "project_settings.json")
        project = None
        if os.path.exists(settings_file):
            try:
                with open(settings_file, "r", encoding="utf-8") as f:
                    settings = json.load(f)
                project_info = settings.get("projectInfo", {})
                project = {
                    "id": project_info.get("id") or name,
                    "name": project_info.get("name") or name,
                    "description": project_info.get("description", ""),
                    "createdAt": project_info.get("createdAt") or datetime.fromtimestamp(os.path.getctime(project_path)).isoformat(),
                    "updatedAt": project_info.get("updatedAt") or datetime.fromtimestamp(os.path.getmtime(project_path)).isoformat(),
                }
            except Exception:
                project = None
        if project is None:
            # 使用默认信息
            created_at = datetime.fromtimestamp(os.path.getctime(project_path)).isoformat()
            updated_at = datetime.fromtimestamp(os.path.getmtime(project_path)).isoformat()
            project = {
                "id": name,
                "name": name,
                "description": f"项目 {name}",
                "createdAt": created_at,
                "updatedAt": updated_at,
            }
        projects.append(project)

    # 将项目名称按修改时间降序排列，最近更新的排前面
    projects.sort(key=lambda p: p.get("updatedAt", ""), reverse=True)
    return jsonify(projects), 200


@app.route("/api/projects/create", methods=["POST"])
def api_projects_create():
    """创建项目：在 temp/{name} 下生成文件夹和 project_settings.json"""
    import os
    import json
    from datetime import datetime

    try:
        data = request.get_json() or {}
        name = (data.get("name") or data.get("projectName") or "").strip()
        if not name:
            return jsonify({"error": "项目名称不能为空"}), 400

        temp_dir = os.path.join(os.getcwd(), "temp")
        project_path = os.path.join(temp_dir, name)
        os.makedirs(project_path, exist_ok=True)

        # 默认的项目设置
        now = datetime.now().isoformat()
        settings = {
            "projectName": name,
            "projectInfo": {
                "id": data.get("id") or name,
                "name": name,
                "description": data.get("description", ""),
                "createdAt": data.get("createdAt", now),
                "updatedAt": data.get("updatedAt", now)
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

        settings_file = os.path.join(project_path, "project_settings.json")
        with open(settings_file, "w", encoding="utf-8") as f:
            json.dump(settings, f, ensure_ascii=False, indent=2)

        # 更新当前项目状态
        current_project_file = os.path.join(os.getcwd(), "current_project.json")
        info = settings["projectInfo"]
        current_project_data = {
            "currentProject": {
                "id": info["id"],
                "name": info["name"],
                "description": info.get("description", ""),
                "createdAt": info["createdAt"],
                "updatedAt": info["updatedAt"]
            },
            "lastUpdated": now
        }
        with open(current_project_file, "w", encoding="utf-8") as f:
            json.dump(current_project_data, f, ensure_ascii=False, indent=2)

        return jsonify({"success": True, "project": {
            "id": info["id"],
            "name": info["name"],
            "description": info.get("description", ""),
            "createdAt": info["createdAt"],
            "updatedAt": info["updatedAt"],
        }}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/projects/current", methods=["GET"])
def api_get_current_project():
    """获取当前选择的项目"""
    import os
    import json
    
    try:
        current_project_file = os.path.join(os.getcwd(), "current_project.json")
        if os.path.exists(current_project_file):
            with open(current_project_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            return jsonify(data), 200
        else:
            return jsonify({"currentProject": None, "lastUpdated": None}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/projects/current", methods=["POST"])
def api_set_current_project():
    """设置当前选择的项目"""
    import os
    import json
    from datetime import datetime
    
    try:
        data = request.get_json() or {}
        project = data.get("project")
        if not project:
            return jsonify({"error": "项目信息不能为空"}), 400
        
        current_project_file = os.path.join(os.getcwd(), "current_project.json")
        current_project_data = {
            "currentProject": project,
            "lastUpdated": datetime.now().isoformat()
        }
        
        with open(current_project_file, "w", encoding="utf-8") as f:
            json.dump(current_project_data, f, ensure_ascii=False, indent=2)
        
        return jsonify({"success": True, "currentProject": project}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/projects/update", methods=["POST"])
def api_projects_update():
    """更新项目信息，包括小说内容等设置"""
    import os
    import json
    from datetime import datetime
    
    try:
        data = request.get_json() or {}
        project_id = data.get("id")
        project_name = data.get("name")
        
        if not project_id or not project_name:
            return jsonify({"error": "项目ID和名称不能为空"}), 400
        
        # 更新项目设置文件
        temp_dir = os.path.join(os.getcwd(), "temp")
        project_path = os.path.join(temp_dir, project_name)
        
        if not os.path.exists(project_path):
            return jsonify({"error": "项目不存在"}), 404
        
        settings_file = os.path.join(project_path, "project_settings.json")
        
        # 读取现有项目设置
        settings = {}
        if os.path.exists(settings_file):
            try:
                with open(settings_file, "r", encoding="utf-8") as f:
                    settings = json.load(f)
            except Exception:
                pass
        
        # 确保projectInfo存在
        if "projectInfo" not in settings:
            settings["projectInfo"] = {}
        
        # 更新项目信息
        settings["projectInfo"].update({
            "id": project_id,
            "name": project_name,
            "description": data.get("description", settings["projectInfo"].get("description", "")),
            "updatedAt": datetime.now().isoformat()
        })
        
        settings["projectName"] = project_name
        settings["lastUpdated"] = datetime.now().isoformat()
        
        # 更新其他设置
        if "defaultSizeConfig" in data:
            settings["defaultSizeConfig"] = data["defaultSizeConfig"]
        if "novelContent" in data:
            settings["novelContent"] = data["novelContent"]
        
        # 保存更新后的项目设置
        with open(settings_file, "w", encoding="utf-8") as f:
            json.dump(settings, f, ensure_ascii=False, indent=2)
        
        return jsonify({"success": True, "project": settings["projectInfo"]}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/projects/<project_id>/files", methods=["GET"])
def api_get_project_files(project_id):
    """获取项目文件列表"""
    try:
        # 这里可以根据project_id获取项目文件
        # 暂时返回空列表，避免404错误
        return jsonify([]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/projects/files/save", methods=["POST"])
def api_save_project_file():
    """保存项目文件"""
    try:
        data = request.get_json() or {}
        # 这里可以实现项目文件保存逻辑
        # 暂时返回成功响应，避免错误
        return jsonify({"success": True, "message": "File saved successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# 角色信息相关接口
@app.route("/api/save/character/info", methods=["POST"])
def api_save_character_info():
    from backend.rest_handler.character_info import save_character_info

    return save_character_info()


@app.route("/api/load/character/info", methods=["GET"])
def api_load_character_info():
    from backend.rest_handler.character_info import load_character_info

    return load_character_info()


@app.route("/api/save/story/info", methods=["POST"])
def api_save_story_info():
    from backend.rest_handler.character_info import save_story_info

    return save_story_info()


@app.route("/api/load/story/info", methods=["GET"])
def api_load_story_info():
    from backend.rest_handler.character_info import load_character_info

    return load_character_info()


# 分镜描述相关接口
@app.route("/api/save/storyboard/descriptions", methods=["POST"])
def api_save_storyboard_descriptions():
    from backend.rest_handler.storyboard import save_scene_descriptions

    return save_scene_descriptions()


@app.route("/api/load/storyboard/descriptions", methods=["GET"])
def api_load_storyboard_descriptions():
    from backend.rest_handler.storyboard import load_scene_descriptions

    return load_scene_descriptions()


@app.route("/api/save/storyboard/description", methods=["POST"])
def api_save_single_storyboard_description():
    from backend.rest_handler.storyboard import save_single_scene_description

    return save_single_scene_description()


# 分镜脚本相关接口
@app.route("/api/save/storyboards", methods=["POST"])
def api_save_storyboards():
    from backend.rest_handler.storyboard import save_storyboards

    return save_storyboards()


@app.route("/api/load/storyboards", methods=["GET"])
def api_load_storyboards():
    from backend.rest_handler.storyboard import load_storyboards

    return load_storyboards()


@app.route("/api/save/complete/storyboard", methods=["POST"])
def api_save_complete_storyboard():
    logging.info("API路由 /api/save/complete/storyboard 被调用")
    try:
        from backend.rest_handler.storyboard import save_complete_storyboard_data
        logging.info("成功导入 save_complete_storyboard_data 函数")
        result = save_complete_storyboard_data()
        logging.info(f"函数调用成功，返回: {result}")
        return result
    except Exception as e:
        logging.error(f"API调用出错: {e}")
        import traceback
        logging.error(f"错误堆栈: {traceback.format_exc()}")
        return {"error": str(e)}, 500


@app.route("/api/load/complete/storyboard", methods=["GET"])
def api_load_complete_storyboard():
    from backend.rest_handler.storyboard import load_complete_storyboard_data

    return load_complete_storyboard_data()


@app.route("/api/save/llm/response", methods=["POST"])
def api_save_llm_complete_response():
    """保存LLM完整响应数据"""
    import traceback
    try:
        from backend.rest_handler.storyboard import save_llm_complete_response
        logging.info("调用save_llm_complete_response函数")
        result = save_llm_complete_response()
        logging.info(f"save_llm_complete_response返回结果: {result}")
        return result
    except Exception as e:
        logging.error(f"save_llm_complete_response发生错误: {str(e)}")
        logging.error(f"错误堆栈: {traceback.format_exc()}")
        return {"error": str(e)}, 500


@app.route("/api/load/story/generation", methods=["GET"])
def api_load_story_generation_data():
    """从latest_llm_response_story_generation.json加载角色和场景数据"""
    from backend.rest_handler.storyboard import load_story_generation_data
    return load_story_generation_data()


@app.route("/api/load/character/images", methods=["GET"])
def api_load_character_images():
    from backend.rest_handler.storyboard import load_character_images

    return load_character_images()


@app.route("/api/save/character/image", methods=["POST"])
def api_save_character_image():
    from backend.rest_handler.storyboard import save_character_image

    return save_character_image()


@app.route("/api/upload/character/image", methods=["POST"])
def api_upload_character_image():
    from backend.rest_handler.storyboard import upload_character_image

    return upload_character_image()


# 新增：场景图片上传接口，保持与前端一致的端点
@app.route("/api/upload/scene/image", methods=["POST"])
def api_upload_scene_image():
    from backend.rest_handler.storyboard import upload_scene_image

    return upload_scene_image()

# 新增：场景图片加载接口
@app.route("/api/load/scene/images", methods=["GET"])
def api_load_scene_images():
    from backend.rest_handler.storyboard import load_scene_images
    return load_scene_images()

# 新增：更新单个场景文件接口
@app.route("/api/update/scene/file", methods=["POST"])
def api_update_scene_file():
    from backend.rest_handler.storyboard import update_scene_file
    return update_scene_file()


@app.route("/api/upload/character/voice", methods=["POST"])
def api_upload_character_voice():
    from backend.rest_handler.storyboard import upload_character_voice

    return upload_character_voice()


@app.route("/api/save/storyboard/elements", methods=["POST"])
def api_save_storyboard_elements():
    from backend.rest_handler.storyboard import save_storyboard_elements

    return save_storyboard_elements()


# 已移除重复路由，使用storyboard_elements.py中的实现


@app.route("/api/load/file/data", methods=["GET"])
def api_load_file_data():
    from backend.rest_handler.storyboard import load_file_data

    return load_file_data()


@app.route("/api/save/subjects", methods=["POST"])
def api_save_subjects():
    from backend.rest_handler.subjects import save_subjects

    return save_subjects()


@app.route("/api/load/subjects", methods=["GET"])
def api_load_subjects():
    from backend.rest_handler.subjects import load_subjects

    return load_subjects()


@app.route("/api/save/subject/image", methods=["POST"])
def api_save_subject_image():
    from backend.rest_handler.subjects import save_subject_image
    return save_subject_image()


@app.route("/api/load/subject/images", methods=["GET"])
def api_load_subject_images():
    from backend.rest_handler.subjects import load_subject_images
    return load_subject_images()


# 分镜元素加载接口
@app.route("/api/load/storyboard/elements", methods=["GET"])
def api_load_storyboard_elements_from_json():
    from backend.rest_handler.storyboard_elements import load_storyboard_elements
    return load_storyboard_elements()


# 项目设置管理接口
@app.route("/api/project/settings/save", methods=["POST"])
def api_save_project_settings():
    from backend.rest_handler.project_settings import save_project_settings
    return save_project_settings()


@app.route("/api/project/settings/load", methods=["GET"])
def api_load_project_settings():
    from backend.rest_handler.project_settings import load_project_settings
    return load_project_settings()


@app.route("/api/global/settings", methods=["GET"])
def api_get_global_settings():
    from backend.rest_handler.project_settings import get_global_settings
    return get_global_settings()


@app.route("/api/save/image", methods=["POST"])
def api_save_image():
    from backend.rest_handler.image_saver import save_image_to_temp

    return save_image_to_temp()


@app.route("/api/load/images", methods=["GET"])
def api_load_images():
    from backend.rest_handler.image_saver import load_images_from_temp

    return load_images_from_temp()





@app.route("/videos/<path:filename>")
def serve_videos(filename):
    return send_from_directory(video_dir, filename)


@app.route("/images/<path:filename>")
def serve_images(filename):
    logging.info(f"Requested image: {filename}")
    file_path = os.path.join(image_dir, filename)
    logging.debug(f"Full path: {file_path}")
    if not os.path.exists(file_path):
        logging.error(f"File not found: {file_path}")
        return "File not found", 404
    return send_from_directory(image_dir, filename)


@app.route("/temp/<path:filename>")
def serve_temp_files(filename):
    logging.info(f"Requested temp file: {filename}")
    temp_dir = os.path.join(os.getcwd(), "temp")
    file_path = os.path.join(temp_dir, filename)
    logging.debug(f"Full temp path: {file_path}")
    if not os.path.exists(file_path):
        logging.error(f"Temp file not found: {file_path}")
        return "File not found", 404

    # 获取文件所在的目录和文件名
    directory = os.path.dirname(file_path)
    filename_only = os.path.basename(file_path)
    return send_from_directory(directory, filename_only)


# 保持向后兼容的projects路由
@app.route("/projects/<path:filename>")
def serve_project_files(filename):
    logging.info(f"Requested project file (deprecated): {filename}")
    # 重定向到temp路由
    return serve_temp_files(filename)


# 测试路由
@app.route("/api/test", methods=["GET"])
def api_test():
    logging.info("测试路由被调用")
    return {"status": "success", "message": "Test route working"}

@app.route("/api/debug/storyboard", methods=["POST"])
def api_debug_storyboard():
    logging.info("调试路由被调用")
    return {"message": "调试路由正常工作"}

# 代理接口
@app.route("/api/proxy/lora/list", methods=["GET"])
def api_proxy_lora_list():
    from backend.rest_handler.proxy import get_lora_list_proxy
    return get_lora_list_proxy()


# LoRA 管理器接口
@app.route("/api/lora/download", methods=["POST"])
def api_lora_download():
    from backend.rest_handler.lora_manager import download_lora
    return download_lora()


@app.route("/api/lora/recipes/save", methods=["POST"])
def api_save_lora_recipe():
    from backend.rest_handler.lora_manager import save_lora_recipe
    return save_lora_recipe()


@app.route("/api/lora/recipes/list", methods=["GET"])
def api_list_lora_recipes():
    from backend.rest_handler.lora_manager import list_lora_recipes
    return list_lora_recipes()


@app.route("/api/lora/recipes/delete", methods=["DELETE"])
def api_delete_lora_recipe():
    from backend.rest_handler.lora_manager import delete_lora_recipe
    return delete_lora_recipe()


@app.route("/api/lora/status", methods=["GET"])
def api_get_lora_manager_status():
    from backend.rest_handler.lora_manager import get_lora_manager_status
    return get_lora_manager_status()


@app.route("/api/lora/recommendations/save", methods=["POST"])
def api_save_lora_recommendations():
    from backend.rest_handler.lora_manager import save_lora_recommendations
    return save_lora_recommendations()


# 翻译服务接口
@app.route("/api/translate/text", methods=["POST"])
def api_translate_text():
    from backend.rest_handler.translation import translate_single_text
    return translate_single_text()


@app.route("/api/translate/batch", methods=["POST"])
def api_translate_batch():
    from backend.rest_handler.translation import translate_batch_texts
    return translate_batch_texts()


@app.route("/api/translate/prompts", methods=["POST"])
def api_translate_prompts():
    from backend.rest_handler.translation import translate_prompts_for_image_generation
    return translate_prompts_for_image_generation()


@app.route("/api/translate/test", methods=["GET"])
def api_test_translation():
    from backend.rest_handler.translation import test_translation_service
    return test_translation_service()


# Civitai API 代理服务
@app.route("/api/civitai/proxy", methods=["POST"])
def api_civitai_proxy():
    """Civitai API 代理请求"""
    return proxy_civitai_request()


@app.route("/api/civitai/models", methods=["GET"])
def api_civitai_search_models():
    """搜索Civitai模型"""
    return search_models()


@app.route("/api/civitai/models/<int:model_id>", methods=["GET"])
def api_civitai_get_model(model_id):
    """根据ID获取Civitai模型"""
    return get_model_by_id(model_id)


@app.route("/api/civitai/model-versions/<int:version_id>", methods=["GET"])
def api_civitai_get_model_version(version_id):
    """根据ID获取Civitai模型版本"""
    return get_model_version_by_id(version_id)


@app.route("/api/civitai/test", methods=["GET"])
def api_civitai_test():
    """测试Civitai API连接"""
    return test_civitai_connection()


# Scene LoRA 相关接口
@app.route("/api/save/scene/lora", methods=["POST"])
def api_save_scene_lora():
    from backend.rest_handler.scene_lora import save_scene_lora
    return save_scene_lora()


# 更新单个scene文件接口
@app.route("/api/update/scene/<int:scene_index>", methods=["POST"])
def api_update_scene(scene_index):
    from backend.rest_handler.scene_update import update_single_scene
    return update_single_scene(scene_index)


@app.route("/api/load/scene/lora/selections", methods=["GET"])
def api_load_scene_lora_selections():
    from backend.rest_handler.scene_lora import load_scene_loras
    return load_scene_loras()


# ComfyUI LoRA Manager API routes
@app.route("/api/comfyui/test", methods=["GET"])
def api_comfyui_test():
    return test_comfyui_connection()


@app.route("/api/comfyui/loras", methods=["GET"])
def api_comfyui_get_loras():
    return get_comfyui_loras()


@app.route("/api/comfyui/recipes", methods=["GET"])
def api_comfyui_get_recipes():
    return get_comfyui_recipes()


@app.route("/api/comfyui/recipes/save-image", methods=["POST"])
def api_comfyui_save_image_to_recipe():
    return save_image_to_comfyui_recipe()


@app.route("/api/comfyui/civitai/search", methods=["GET"])
def api_comfyui_search_civitai():
    return search_comfyui_civitai_models()


@app.route("/api/images/save-to-recipe", methods=["POST"])
def api_save_image_to_recipe():
    return save_generated_image_to_recipe()


# 分区控制参数路由已移除，前端直接调用ai-comfyui.top接口


# 分区控制图片生成路由已移除，前端直接调用ai-comfyui.top接口


if __name__ == "__main__":
    logging.info(f"Current working directory:{os.getcwd()}")
    app.run(host="localhost", port=1198)
