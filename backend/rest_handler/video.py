import os
import time
import json
import logging

from flask import jsonify, request

from backend.util.constant import video_dir, get_project_dir
from backend.util.file import make_dir, remove_all
from backend.util.movie import create_video_with_audio_images


def get_video():
    """
    Endpoint to fetch the initial video.
    """
    try:
        video_data = {"videoUrl": os.path.join("/videos", "video.mp4")}
        return jsonify(video_data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def generate_video():
    """
    Endpoint to generate a new video.
    """
    try:
        remove_all(video_dir)
        make_dir(video_dir)
        create_video_with_audio_images()
        now = int(time.time())
        new_video_data = {
            "videoUrl": os.path.join("/videos", "video.mp4") + f"?v={now}"
        }
        return jsonify(new_video_data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def load_video_data():
    """
    加载视频数据，包括视频提示词和视频列表
    """
    try:
        project_name = request.args.get('project_name')
        if not project_name:
            return jsonify({'error': 'No project selected'}), 400
        
        # 加载视频提示词
        video_prompts = []
        prompts_dir = get_project_dir(project_name, 'prompts')
        if os.path.exists(prompts_dir):
            prompts_file = os.path.join(prompts_dir, 'video_prompts.json')
            if os.path.exists(prompts_file):
                with open(prompts_file, 'r', encoding='utf-8') as f:
                    video_prompts = json.load(f)
        
        # 加载视频列表
        videos = []
        videos_dir = get_project_dir(project_name, 'videos')
        if os.path.exists(videos_dir):
            # 扫描视频文件
            for filename in os.listdir(videos_dir):
                if filename.lower().endswith(('.mp4', '.avi', '.mov', '.mkv')):
                    video_info = {
                        'filename': filename,
                        'video_url': f'/temp/{project_name}/videos/{filename}',
                        'created_at': os.path.getctime(os.path.join(videos_dir, filename))
                    }
                    videos.append(video_info)
            
            # 按创建时间排序
            videos.sort(key=lambda x: x['created_at'], reverse=True)
        
        # 如果没有项目特定的视频，检查全局视频目录
        if not videos and os.path.exists(video_dir):
            for filename in os.listdir(video_dir):
                if filename.lower().endswith(('.mp4', '.avi', '.mov', '.mkv')):
                    video_info = {
                        'filename': filename,
                        'video_url': f'/videos/{filename}',
                        'created_at': os.path.getctime(os.path.join(video_dir, filename))
                    }
                    videos.append(video_info)
            
            videos.sort(key=lambda x: x['created_at'], reverse=True)
        
        result = {
            'video_prompts': video_prompts,
            'videos': videos
        }
        
        logging.info(f"Video data loaded successfully for project {project_name}: {len(video_prompts)} prompts, {len(videos)} videos")
        return jsonify(result), 200
        
    except Exception as e:
        logging.error(f'Error loading video data: {e}')
        return jsonify({'error': str(e)}), 500
