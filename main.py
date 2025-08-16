import os
from flask import Flask, send_from_directory
from flask_cors import CORS
import logging

# 旧的角色处理器已删除
from backend.rest_handler.image import generate_images, get_local_images, generate_single_image
from backend.rest_handler.init import get_initial, get_novel_fragments, load_novel, save_combined_fragments, save_novel, \
    save_prompt, load_prompt, get_model_config, save_model_config
from backend.rest_handler.prompt import extract_scene_from_texts, get_prompts_en, save_prompt_en, save_prompt_zh
from backend.rest_handler.video import generate_video, get_video
from backend.tts.tts import generate_audio_files
from backend.util.constant import image_dir, video_dir

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s [File: %(filename)s, Line: %(lineno)d]'
)

# novel
@app.route('/api/get/novel/fragments', methods=['GET']) # 获取片段
def api_get_novel_fragments():
    return get_novel_fragments()

@app.route('/api/save/novel/fragments', methods=['POST']) # 切割片段
def api_save_combined_fragments():
    return save_combined_fragments()

# prompts
@app.route('/api/get/novel/prompts', methods=['GET']) # 提取场景
def api_extract_scene_from_texts():
    return extract_scene_from_texts()

@app.route('/api/novel/prompts/en', methods=['GET']) # 获取英文提示词
def api_get_prompts_en():
    return get_prompts_en()

@app.route('/api/novel/prompt/en', methods=['POST']) # 保存英文提示词
def api_save_prompt_en():
    return save_prompt_en()

@app.route('/api/novel/prompt/zh', methods=['POST']) # 保存中文提示词
def api_save_prompt_zh():
    return save_prompt_zh()

# image
@app.route('/api/novel/images', methods=['POST']) # 一键生成
def api_generate_image():
    return generate_images()

@app.route('/api/novel/image', methods=['POST']) # 重新生成图片
def api_get_local_image():
    return generate_single_image()

@app.route('/api/novel/images', methods=['GET']) # 获取本地图片
def api_get_local_images():
    return get_local_images()

# 初始化
@app.route('/api/novel/initial', methods=['GET']) # 初始化
def api_get_initial():
    return get_initial()

# tts
@app.route('/api/novel/audio', methods=['POST']) # 生成音频
def api_generate_audio_files():
    return generate_audio_files()

# 旧的角色接口已删除，现在使用新的角色信息保存接口

# 获取小说文本
@app.route('/api/novel/load', methods=['GET'])
def api_load_novel():
    return load_novel()

# 保存小说文本
@app.route('/api/novel/save', methods=['POST'])
def api_save_novel():
    return save_novel()

# 获取文生图prompt
@app.route('/api/prompt/load', methods=['GET'])
def api_load_prompt():
    return load_prompt()

# 保存文生图prompt
@app.route('/api/prompt/save', methods=['POST'])
def api_save_prompt():
    return save_prompt()

# 读取视频
@app.route('/api/novel/video', methods=['GET'])
def api_get_video():
   return get_video()

# 生成视频
@app.route('/api/novel/video', methods=['POST'])
def api_generate_video():
   return generate_video()

@app.route('/api/model/config', methods=['GET'])
def api_get_model_config():
   return get_model_config()

@app.route('/api/model/config', methods=['POST'])
def api_save_model_config():
    return save_model_config()

# 角色信息相关接口
@app.route('/api/save/character/info', methods=['POST'])
def api_save_character_info():
    from backend.rest_handler.character_info import save_character_info
    return save_character_info()

@app.route('/api/load/character/info', methods=['GET'])
def api_load_character_info():
    from backend.rest_handler.character_info import load_character_info
    return load_character_info()

@app.route('/api/save/story/info', methods=['POST'])
def api_save_story_info():
    from backend.rest_handler.character_info import save_story_info
    return save_story_info()

@app.route('/api/load/story/info', methods=['GET'])
def api_load_story_info():
    from backend.rest_handler.character_info import load_character_info
    return load_character_info()

# 画面描述相关接口
@app.route('/api/save/scene/descriptions', methods=['POST'])
def api_save_scene_descriptions():
    from backend.rest_handler.scene_description import save_scene_descriptions
    return save_scene_descriptions()

@app.route('/api/load/scene/descriptions', methods=['GET'])
def api_load_scene_descriptions():
    from backend.rest_handler.scene_description import load_scene_descriptions
    return load_scene_descriptions()

@app.route('/api/save/scene/description', methods=['POST'])
def api_save_single_scene_description():
    from backend.rest_handler.scene_description import save_single_scene_description
    return save_single_scene_description()

# 分镜脚本相关接口
@app.route('/api/save/storyboards', methods=['POST'])
def api_save_storyboards():
    from backend.rest_handler.scene_description import save_storyboards
    return save_storyboards()

@app.route('/api/load/storyboards', methods=['GET'])
def api_load_storyboards():
    from backend.rest_handler.scene_description import load_storyboards
    return load_storyboards()

@app.route('/api/save/complete/storyboard', methods=['POST'])
def api_save_complete_storyboard():
    from backend.rest_handler.scene_description import save_complete_storyboard_data
    return save_complete_storyboard_data()

@app.route('/api/load/complete/storyboard', methods=['GET'])
def api_load_complete_storyboard():
    from backend.rest_handler.scene_description import load_complete_storyboard_data
    return load_complete_storyboard_data()

@app.route('/api/load/character/images', methods=['GET'])
def api_load_character_images():
    from backend.rest_handler.scene_description import load_character_images
    return load_character_images()

@app.route('/api/save/character/image', methods=['POST'])
def api_save_character_image():
    from backend.rest_handler.scene_description import save_character_image
    return save_character_image()

@app.route('/api/upload/character/image', methods=['POST'])
def api_upload_character_image():
    from backend.rest_handler.scene_description import upload_character_image
    return upload_character_image()

# 图片保存相关接口
@app.route('/api/save/image', methods=['POST'])
def api_save_image():
    from backend.rest_handler.image_saver import save_image_to_temp
    return save_image_to_temp()

@app.route('/api/load/images', methods=['GET'])
def api_load_images():
    from backend.rest_handler.image_saver import load_images_from_temp
    return load_images_from_temp()

@app.route('/videos/<path:filename>')
def serve_videos(filename):
    return send_from_directory(video_dir, filename)

@app.route('/images/<path:filename>')
def serve_images(filename):
    logging.info(f"Requested image: {filename}")
    file_path = os.path.join(image_dir, filename)
    logging.debug(f"Full path: {file_path}")
    if not os.path.exists(file_path):
        logging.error(f"File not found: {file_path}")
        return "File not found", 404
    return send_from_directory(image_dir, filename)

@app.route('/temp/<path:filename>')
def serve_temp_files(filename):
    logging.info(f"Requested temp file: {filename}")
    temp_dir = os.path.join(os.getcwd(), 'temp')
    file_path = os.path.join(temp_dir, filename)
    logging.debug(f"Full temp path: {file_path}")
    if not os.path.exists(file_path):
        logging.error(f"Temp file not found: {file_path}")
        return "File not found", 404
    
    # 获取文件所在的目录和文件名
    directory = os.path.dirname(file_path)
    filename_only = os.path.basename(file_path)
    return send_from_directory(directory, filename_only)

if __name__ == '__main__':
    logging.info(f"Current working directory:{os.getcwd()}")
    app.run(host='localhost', port=1198)
