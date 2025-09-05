"""视频处理模块
负责视频上传、场景检测、音频转录和分镜生成
"""

import os
import json
import logging
from datetime import datetime
from flask import jsonify, request
from werkzeug.utils import secure_filename
from backend.util.file import get_project_dir

# 配置日志
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# 允许的视频文件扩展名
ALLOWED_VIDEO_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'webm'}

def allowed_video_file(filename):
    """检查文件是否为允许的视频格式"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_VIDEO_EXTENSIONS

def upload_video():
    """处理视频文件上传"""
    try:
        # 检查是否有文件上传
        if 'video' not in request.files:
            return jsonify({"error": "没有上传视频文件"}), 400
        
        file = request.files['video']
        project_name = request.form.get('projectName')
        
        if not project_name:
            return jsonify({"error": "项目名称不能为空"}), 400
        
        if file.filename == '':
            return jsonify({"error": "没有选择文件"}), 400
        
        if not allowed_video_file(file.filename):
            return jsonify({"error": "不支持的视频格式"}), 400
        
        # 获取项目目录
        project_dir = get_project_dir(project_name)
        video_dir = os.path.join(project_dir, "videos")
        
        # 确保视频目录存在
        os.makedirs(video_dir, exist_ok=True)
        
        # 生成安全的文件名
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        name, ext = os.path.splitext(filename)
        safe_filename = f"{name}_{timestamp}{ext}"
        
        # 保存文件
        video_path = os.path.join(video_dir, safe_filename)
        file.save(video_path)
        
        # 记录视频信息
        video_info = {
            "originalName": file.filename,
            "savedName": safe_filename,
            "videoPath": video_path,
            "relativePath": f"/temp/{project_name}/videos/{safe_filename}",
            "uploadTime": datetime.now().isoformat(),
            "fileSize": os.path.getsize(video_path),
            "status": "uploaded"
        }
        
        # 保存视频信息到项目设置
        try:
            settings_file = os.path.join(project_dir, "project_settings.json")
            settings = {}
            
            if os.path.exists(settings_file):
                with open(settings_file, 'r', encoding='utf-8') as f:
                    settings = json.load(f)
            
            if "videos" not in settings:
                settings["videos"] = []
            
            settings["videos"].append(video_info)
            # 设置videoPath为当前上传的视频路径
            settings["videoPath"] = video_path
            settings["lastUpdated"] = datetime.now().isoformat()
            
            with open(settings_file, 'w', encoding='utf-8') as f:
                json.dump(settings, f, ensure_ascii=False, indent=2)
                
        except Exception as e:
            logger.warning(f"Failed to update project settings: {e}")
        
        logger.info(f"Video uploaded successfully: {safe_filename} for project: {project_name}")
        
        return jsonify({
            "success": True,
            "message": "视频上传成功",
            "videoPath": video_path,
            "relativePath": video_info["relativePath"],
            "videoInfo": video_info
        }), 200
        
    except Exception as e:
        logger.error(f"Error uploading video: {str(e)}")
        return jsonify({"error": f"视频上传失败: {str(e)}"}), 500

def process_video():
    """处理视频：场景检测 + 音频转录 + 分镜生成"""
    print("=== PROCESS_VIDEO FUNCTION CALLED ===")
    logging.info("=== PROCESS_VIDEO FUNCTION CALLED ===")
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        project_name = data.get('projectName')
        video_path = data.get('videoPath')
        
        if not project_name or not video_path:
            return jsonify({"error": "项目名称和视频路径不能为空"}), 400
        
        # 添加详细的文件存在性检查和日志
        logging.info(f"video_handler.py - 原始视频文件路径: {video_path}")
        logging.info(f"video_handler.py - 项目名称: {project_name}")
        logging.info(f"video_handler.py - 路径类型: {type(video_path)}")
        
        # 处理中文路径编码问题
        try:
            # 确保路径使用正确的编码
            if isinstance(video_path, str):
                # 尝试重新编码路径以处理中文字符
                video_path_fixed = video_path.encode('utf-8').decode('utf-8')
                logging.info(f"video_handler.py - 修复后路径: {video_path_fixed}")
            else:
                video_path_fixed = video_path
        except Exception as e:
            logging.error(f"video_handler.py - 路径编码修复失败: {e}")
            video_path_fixed = video_path
        
        # 规范化路径
        normalized_path = os.path.normpath(video_path_fixed)
        logging.info(f"video_handler.py - 规范化路径: {normalized_path}")
        
        if not os.path.exists(normalized_path):
            logging.error(f"video_handler.py - 视频文件不存在: {normalized_path}")
            # 尝试列出父目录内容
            parent_dir = os.path.dirname(normalized_path)
            if os.path.exists(parent_dir):
                files = os.listdir(parent_dir)
                logging.error(f"video_handler.py - 父目录 {parent_dir} 内容: {files}")
            else:
                logging.error(f"video_handler.py - 父目录也不存在: {parent_dir}")
            return jsonify({"error": "视频文件不存在"}), 404
        
        logging.info(f"video_handler.py - 视频文件存在，继续处理: {normalized_path}")
        # 使用规范化路径
        video_path = normalized_path
        
        # 获取项目目录
        project_dir = get_project_dir(project_name)
        
        # 创建处理结果目录
        results_dir = os.path.join(project_dir, "video_analysis")
        os.makedirs(results_dir, exist_ok=True)
        
        # 开始视频处理流程
        processing_result = {
            "projectName": project_name,
            "videoPath": video_path,
            "startTime": datetime.now().isoformat(),
            "status": "processing",
            "steps": []
        }
        
        # 步骤1: 场景检测
        try:
            scene_result = detect_scenes(video_path, results_dir)
            processing_result["steps"].append({
                "step": "scene_detection",
                "status": "completed",
                "result": scene_result,
                "timestamp": datetime.now().isoformat()
            })
        except Exception as e:
            logger.error(f"Scene detection failed: {e}")
            processing_result["steps"].append({
                "step": "scene_detection",
                "status": "failed",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })
        
        # 步骤2: 音频转录
        try:
            transcription_result = transcribe_audio(video_path, results_dir)
            processing_result["steps"].append({
                "step": "audio_transcription",
                "status": "completed",
                "result": transcription_result,
                "timestamp": datetime.now().isoformat()
            })
        except Exception as e:
            logger.error(f"Audio transcription failed: {e}")
            processing_result["steps"].append({
                "step": "audio_transcription",
                "status": "failed",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })
        
        # 步骤3: 生成分镜
        try:
            storyboard_result = generate_storyboard(project_name, processing_result)
            processing_result["steps"].append({
                "step": "storyboard_generation",
                "status": "completed",
                "result": storyboard_result,
                "timestamp": datetime.now().isoformat()
            })
        except Exception as e:
            logger.error(f"Storyboard generation failed: {e}")
            processing_result["steps"].append({
                "step": "storyboard_generation",
                "status": "failed",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })
        
        # 步骤4: 生成剪映草稿
        try:
            draft_result = generate_jianying_draft(project_name, processing_result)
            processing_result["steps"].append({
                "step": "jianying_draft",
                "status": "completed",
                "result": draft_result,
                "timestamp": datetime.now().isoformat()
            })
        except Exception as e:
            logger.error(f"JianYing draft generation failed: {e}")
            processing_result["steps"].append({
                "step": "jianying_draft",
                "status": "failed",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })
        
        # 完成处理
        processing_result["status"] = "completed"
        processing_result["endTime"] = datetime.now().isoformat()
        
        # 保存处理结果
        result_file = os.path.join(results_dir, "processing_result.json")
        with open(result_file, 'w', encoding='utf-8') as f:
            json.dump(processing_result, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Video processing completed for project: {project_name}")
        
        return jsonify({
            "success": True,
            "message": "视频处理完成",
            "result": processing_result
        }), 200
        
    except Exception as e:
        logger.error(f"Error processing video: {str(e)}")
        return jsonify({"error": f"视频处理失败: {str(e)}"}), 500

def detect_scenes(video_path, results_dir):
    """使用PySceneDetect进行场景检测"""
    # 这里先返回模拟数据，后续实现真实的场景检测
    scenes = [
        {"start_time": 0.0, "end_time": 10.5, "scene_id": 1},
        {"start_time": 10.5, "end_time": 25.3, "scene_id": 2},
        {"start_time": 25.3, "end_time": 42.1, "scene_id": 3}
    ]
    
    # 保存场景检测结果
    scenes_file = os.path.join(results_dir, "scenes.json")
    with open(scenes_file, 'w', encoding='utf-8') as f:
        json.dump(scenes, f, ensure_ascii=False, indent=2)
    
    return {
        "scenes_count": len(scenes),
        "scenes": scenes,
        "scenes_file": scenes_file
    }

def transcribe_audio(video_path, results_dir):
    """使用Whisper进行音频转录"""
    # 这里先返回模拟数据，后续实现真实的音频转录
    transcription = {
        "segments": [
            {"start": 0.0, "end": 5.2, "text": "欢迎来到这个精彩的故事"},
            {"start": 5.2, "end": 12.8, "text": "在一个遥远的王国里，住着一位勇敢的骑士"},
            {"start": 12.8, "end": 20.1, "text": "他即将踏上一段冒险的旅程"}
        ],
        "full_text": "欢迎来到这个精彩的故事。在一个遥远的王国里，住着一位勇敢的骑士。他即将踏上一段冒险的旅程。"
    }
    
    # 保存转录结果
    transcription_file = os.path.join(results_dir, "transcription.json")
    with open(transcription_file, 'w', encoding='utf-8') as f:
        json.dump(transcription, f, ensure_ascii=False, indent=2)
    
    return {
        "segments_count": len(transcription["segments"]),
        "transcription": transcription,
        "transcription_file": transcription_file
    }

def generate_storyboard(project_name, processing_result):
    """根据场景和转录结果生成分镜"""
    # 这里先返回模拟数据，后续实现真实的分镜生成
    storyboards = []
    
    # 从处理结果中获取场景和转录信息
    scenes = []
    transcription_segments = []
    
    for step in processing_result["steps"]:
        if step["step"] == "scene_detection" and step["status"] == "completed":
            scenes = step["result"]["scenes"]
        elif step["step"] == "audio_transcription" and step["status"] == "completed":
            transcription_segments = step["result"]["transcription"]["segments"]
    
    # 生成分镜
    for i, scene in enumerate(scenes):
        # 找到对应时间段的转录文本
        scene_text = ""
        for segment in transcription_segments:
            if segment["start"] >= scene["start_time"] and segment["end"] <= scene["end_time"]:
                scene_text += segment["text"] + " "
        
        storyboard = {
            "index": i,
            "scene_id": scene["scene_id"],
            "start_time": scene["start_time"],
            "end_time": scene["end_time"],
            "duration": scene["end_time"] - scene["start_time"],
            "dialogue": scene_text.strip(),
            "scene_description": f"场景 {scene['scene_id']}: {scene_text[:50]}...",
            "visual_prompt": f"根据视频内容生成的场景 {scene['scene_id']}",
            "generated_from_video": True,
            "timestamp": datetime.now().isoformat()
        }
        
        storyboards.append(storyboard)
    
    # 保存分镜到项目目录
    project_dir = get_project_dir(project_name)
    storyboard_dir = os.path.join(project_dir, "storyboard")
    os.makedirs(storyboard_dir, exist_ok=True)
    
    for storyboard in storyboards:
        storyboard_file = os.path.join(storyboard_dir, f"storyboard_{storyboard['index']}.json")
        with open(storyboard_file, 'w', encoding='utf-8') as f:
            json.dump(storyboard, f, ensure_ascii=False, indent=2)
    
    return {
        "storyboards_count": len(storyboards),
        "storyboards": storyboards,
        "storyboard_dir": storyboard_dir
    }

def generate_jianying_draft(project_name, processing_result):
    """生成剪映草稿文件"""
    # 这里先返回模拟数据，后续实现真实的剪映草稿生成
    project_dir = get_project_dir(project_name)
    draft_dir = os.path.join(project_dir, "jianying_draft")
    os.makedirs(draft_dir, exist_ok=True)
    
    # 生成基本的剪映草稿结构
    draft_data = {
        "version": "1.0.0",
        "project_name": project_name,
        "created_time": datetime.now().isoformat(),
        "tracks": [],
        "materials": []
    }
    
    # 保存草稿文件
    draft_file = os.path.join(draft_dir, "draft.json")
    with open(draft_file, 'w', encoding='utf-8') as f:
        json.dump(draft_data, f, ensure_ascii=False, indent=2)
    
    return {
        "draft_file": draft_file,
        "draft_dir": draft_dir,
        "message": "剪映草稿生成完成"
    }