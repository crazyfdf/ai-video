#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
基于关键帧生成增强的分镜脚本和主体管理数据
由于LLM不支持图像分析，使用预设模板和基本信息
"""

import os
import json
from datetime import datetime
from backend.util.project_file_manager import get_project_dir

# 预设的场景描述模板
SCENE_TEMPLATES = {
    1: {
        "description": "开场镜头，展现宏大的世界观背景",
        "storyboard": "广角镜头展现完美世界的壮丽景色，远山连绵，云雾缭绕",
        "characters": ["主角"],
        "scene_type": "外景-远景"
    },
    2: {
        "description": "角色登场，展现主要人物",
        "storyboard": "中景镜头，主角出现在画面中，表情坚毅",
        "characters": ["主角"],
        "scene_type": "人物特写"
    },
    3: {
        "description": "环境展示，世界细节描绘",
        "storyboard": "环境细节镜头，展现完美世界的独特地貌和建筑",
        "characters": [],
        "scene_type": "环境展示"
    }
}

# 默认场景模板
DEFAULT_SCENE = {
    "description": "场景展示，展现故事情节发展",
    "storyboard": "镜头展现当前场景的关键内容和氛围",
    "characters": [],
    "scene_type": "一般场景"
}

# 角色信息模板
CHARACTER_TEMPLATES = {
    "主角": {
        "name": "主角",
        "appearance": "英俊的青年男性，身材挺拔，眼神坚毅，散发着不凡的气质",
        "description": "完美世界的主要角色，拥有强大的天赋和不屈的意志",
        "tag": "masterpiece, best quality, ultra detailed, 8k, photorealistic, handsome young man, tall figure, determined eyes, extraordinary temperament, fantasy character",
        "personality": "坚韧不拔，勇敢无畏，有强烈的正义感"
    },
    "女主角": {
        "name": "女主角",
        "appearance": "美丽的少女，长发飘逸，气质优雅，眼神清澈",
        "description": "完美世界的重要角色，拥有特殊的能力和善良的心",
        "tag": "masterpiece, best quality, ultra detailed, 8k, photorealistic, beautiful girl, flowing long hair, elegant temperament, clear eyes, fantasy character",
        "personality": "善良温柔，聪明机智，内心坚强"
    },
    "长者": {
        "name": "长者",
        "appearance": "年长的智者，白发苍苍，面容慈祥，身着古朴长袍",
        "description": "拥有丰富经验和智慧的长者，是主角的引路人",
        "tag": "masterpiece, best quality, ultra detailed, 8k, photorealistic, elderly wise man, white hair, kind face, ancient robes, fantasy character",
        "personality": "睿智深沉，慈祥和蔼，经验丰富"
    }
}

def get_scene_info(scene_id):
    """
    获取场景信息
    """
    if scene_id in SCENE_TEMPLATES:
        return SCENE_TEMPLATES[scene_id]
    
    # 根据场景ID生成动态描述
    if scene_id <= 5:
        template = SCENE_TEMPLATES[1]  # 开场类型
    elif scene_id <= 10:
        template = SCENE_TEMPLATES[2]  # 人物类型
    elif scene_id <= 15:
        template = SCENE_TEMPLATES[3]  # 环境类型
    else:
        template = DEFAULT_SCENE
    
    # 自定义描述
    custom_template = template.copy()
    custom_template["description"] = f"场景{scene_id}: {template['description']}"
    custom_template["storyboard"] = f"场景{scene_id}的镜头: {template['storyboard']}"
    
    return custom_template

def generate_enhanced_storyboard(project_name, scene_id, keyframe_path):
    """
    生成增强的分镜脚本
    """
    print(f"正在生成场景 {scene_id} 的分镜脚本")
    
    # 获取场景信息
    scene_info = get_scene_info(scene_id)
    
    # 生成分镜脚本数据
    storyboard_data = {
        "scene_id": scene_id,
        "novel_fragment": f"场景{scene_id}: {scene_info['description']}",
        "storyboard": scene_info['storyboard'],
        "wan22_prompt": f"masterpiece, best quality, ultra detailed, 8k, photorealistic, cinematic lighting, {scene_info['storyboard']}",
        "character_dialogue": "[根据剧情需要添加台词]",
        "sound_effects": f"适合{scene_info['scene_type']}的环境音效和背景音乐",
        "elements_layout": [
            {
                "element_type": "scene",
                "name": f"场景{scene_id}",
                "prompt": scene_info['storyboard'],
                "x": 0,
                "y": 0,
                "width": 1280,
                "height": 720
            }
        ],
        "required_elements": {
            "characters": scene_info['characters'],
            "character_subjects": [f"@{char}" for char in scene_info['characters']],
            "scene_subjects": [f"@场景{scene_id}"],
            "scene_prompt": scene_info['storyboard']
        },
        "generated_at": datetime.now().isoformat(),
        "description": scene_info['storyboard'],
        "images": [],
        "generation_info": {
            "type": "基于关键帧增强生成",
            "timestamp": int(datetime.now().timestamp() * 1000),
            "keyframe_source": keyframe_path,
            "scene_type": scene_info['scene_type']
        }
    }
    
    return storyboard_data, scene_info['characters']

def save_enhanced_character_subject(project_name, character_name):
    """
    保存增强的角色主体数据
    """
    character_dir = get_project_dir(project_name, 'character')
    os.makedirs(character_dir, exist_ok=True)
    
    character_file = os.path.join(character_dir, f"{character_name}.json")
    
    # 检查是否已存在
    if os.path.exists(character_file):
        print(f"角色 {character_name} 已存在，跳过")
        return
    
    # 获取角色模板
    if character_name in CHARACTER_TEMPLATES:
        char_template = CHARACTER_TEMPLATES[character_name]
    else:
        # 使用默认模板
        char_template = {
            "name": character_name,
            "appearance": f"{character_name}的外观描述",
            "description": f"{character_name}的角色描述",
            "tag": f"masterpiece, best quality, ultra detailed, 8k, photorealistic, {character_name}, fantasy character",
            "personality": f"{character_name}的性格特点"
        }
    
    # 构建角色数据
    character_json = {
        "id": hash(character_name) % 1000,
        "name": char_template["name"],
        "appearance": char_template["appearance"],
        "description": char_template["description"],
        "tag": char_template["tag"],
        "englishPrompt": char_template["tag"],
        "selectedLora": "",
        "image_url": "",
        "images": [],
        "createdAt": datetime.now().isoformat(),
        "personality": char_template.get("personality", ""),
        "character_type": "主要角色" if character_name in CHARACTER_TEMPLATES else "次要角色"
    }
    
    with open(character_file, 'w', encoding='utf-8') as f:
        json.dump(character_json, f, ensure_ascii=False, indent=2)
    
    print(f"已保存增强角色主体: {character_name}")

def save_enhanced_scene_subject(project_name, scene_id, scene_description, scene_type):
    """
    保存增强的场景主体数据
    """
    scene_dir = get_project_dir(project_name, 'scene')
    os.makedirs(scene_dir, exist_ok=True)
    
    scene_name = f"场景{scene_id}"
    scene_file = os.path.join(scene_dir, f"{scene_name}.json")
    
    # 检查是否已存在
    if os.path.exists(scene_file):
        print(f"场景 {scene_name} 已存在，跳过")
        return
    
    # 构建场景数据
    scene_json = {
        "id": scene_id,
        "name": scene_name,
        "description": scene_description,
        "tag": f"masterpiece, best quality, ultra detailed, 8k, photorealistic, {scene_description}",
        "englishPrompt": f"masterpiece, best quality, ultra detailed, 8k, photorealistic, {scene_description}",
        "selectedLora": "",
        "image_url": "",
        "images": [],
        "createdAt": datetime.now().isoformat(),
        "scene_type": scene_type,
        "atmosphere": "根据场景内容调整氛围"
    }
    
    with open(scene_file, 'w', encoding='utf-8') as f:
        json.dump(scene_json, f, ensure_ascii=False, indent=2)
    
    print(f"已保存增强场景主体: {scene_name}")

def save_enhanced_storyboard(project_name, scene_id, storyboard_data):
    """
    保存增强的分镜脚本
    """
    storyboard_dir = get_project_dir(project_name, 'storyboard')
    os.makedirs(storyboard_dir, exist_ok=True)
    
    storyboard_file = os.path.join(storyboard_dir, f"storyboard_{scene_id-1}.json")
    
    with open(storyboard_file, 'w', encoding='utf-8') as f:
        json.dump(storyboard_data, f, ensure_ascii=False, indent=2)
    
    print(f"已保存增强分镜脚本: storyboard_{scene_id-1}.json")

def main():
    project_name = "完美世界"
    keyframes_dir = get_project_dir(project_name, 'video_keyframes')
    
    print(f"开始生成增强的分镜脚本和主体数据: {project_name}")
    print(f"关键帧目录: {keyframes_dir}")
    
    # 获取所有第一个关键帧
    first_keyframes = []
    for scene_id in range(1, 24):  # 场景1-23
        keyframe_pattern = os.path.join(keyframes_dir, f"scene_{scene_id}_keyframe_1.jpg")
        if os.path.exists(keyframe_pattern):
            first_keyframes.append((scene_id, keyframe_pattern))
        else:
            print(f"警告: 场景 {scene_id} 的第一个关键帧不存在")
    
    print(f"找到 {len(first_keyframes)} 个第一关键帧")
    
    # 收集所有角色
    all_characters = set()
    
    # 处理每个关键帧
    for scene_id, keyframe_path in first_keyframes:
        try:
            # 生成增强分镜脚本
            storyboard_data, characters = generate_enhanced_storyboard(project_name, scene_id, keyframe_path)
            
            # 保存分镜脚本
            save_enhanced_storyboard(project_name, scene_id, storyboard_data)
            
            # 收集角色
            all_characters.update(characters)
            
            # 保存场景主体
            scene_info = get_scene_info(scene_id)
            save_enhanced_scene_subject(project_name, scene_id, storyboard_data['storyboard'], scene_info['scene_type'])
            
            print(f"场景 {scene_id} 增强处理完成")
                
        except Exception as e:
            print(f"处理场景 {scene_id} 时出错: {str(e)}")
            continue
    
    # 保存所有角色主体
    print("\n正在保存角色主体...")
    for character_name in all_characters:
        save_enhanced_character_subject(project_name, character_name)
    
    print("\n所有场景增强处理完成！")
    print("生成的文件:")
    print(f"- 增强分镜脚本: temp/{project_name}/storyboard/storyboard_*.json")
    print(f"- 增强角色主体: temp/{project_name}/character/*.json")
    print(f"- 增强场景主体: temp/{project_name}/scene/*.json")
    print(f"- 总计角色数量: {len(all_characters)}")
    print(f"- 总计场景数量: {len(first_keyframes)}")

if __name__ == "__main__":
    main()