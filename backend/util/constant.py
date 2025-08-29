import os
import re

# 默认基础目录，可以通过环境变量或参数覆盖
default_base_dir = os.path.join(os.getcwd(), "temp")

def sanitize_project_name(project_name):
    """清理项目名称，确保在Windows文件系统中有效"""
    if not project_name or project_name.strip() == "":
        raise ValueError("Project name is required")
    
    # 移除或替换Windows文件系统不允许的字符
    # Windows不允许的字符: < > : " | ? * \ /
    # 同时处理一些特殊情况
    sanitized = re.sub(r'[<>:"|?*\\/]', '_', project_name)
    
    # 移除前后空格
    sanitized = sanitized.strip()
    
    # 如果清理后为空，使用默认名称
    if not sanitized:
        raise ValueError("Project name is required")
    
    # 限制长度，避免路径过长
    if len(sanitized) > 50:
        sanitized = sanitized[:50]
    
    return sanitized

def get_project_base_dir(project_name):
    if not project_name:
        raise ValueError("Project name is required")
    """获取项目的基础目录"""
    clean_name = sanitize_project_name(project_name)
    return os.path.join(os.getcwd(), "temp", clean_name)

def get_project_dir(project_name, sub_dir):
    """获取项目的子目录"""
    return os.path.join(get_project_base_dir(project_name), sub_dir)

# 保持向后兼容的全局变量
base_dir = default_base_dir
image_dir = os.path.join(base_dir, "image")
character_dir = os.path.join(base_dir, "character")
novel_fragments_dir = os.path.join(base_dir, "fragments")
prompts_dir = os.path.join(base_dir, "prompts")
prompts_en_dir = os.path.join(base_dir, "promptsEn")
audio_dir = os.path.join(base_dir, "audio")
video_dir = os.path.join(base_dir, "video")
prompt_path = "prompt.txt"
config_path = "config.json"
