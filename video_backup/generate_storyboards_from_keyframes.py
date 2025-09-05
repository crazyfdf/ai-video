#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
基于每个场景的第一个关键帧生成分镜脚本和主体管理数据
"""

import os
import json
import glob
from datetime import datetime
from backend.ai.video_analysis import VideoFrameAnalyzer
from backend.util.project_file_manager import get_project_dir
from backend.llm.llm_service import LLMService

def analyze_keyframe_and_generate_storyboard(project_name, scene_id, keyframe_path):
    """
    基于关键帧图片使用AI分析生成分镜脚本
    """
    print(f"正在分析场景 {scene_id} 的关键帧: {keyframe_path}")
    
    try:
        # 初始化AI分析器
        llm_service = LLMService()
        analyzer = VideoFrameAnalyzer(llm_service)
        
        # 分析关键帧图片
        analysis_result = analyzer.analyze_frame(keyframe_path, "comprehensive")
        
        if not analysis_result.get("success", False):
            print(f"图片分析失败: {analysis_result.get('error', '未知错误')}")
            # 使用默认描述作为后备方案
            scene_description = f"完美世界第{scene_id}个场景，展现修炼世界的奇幻景象"
            characters = [{"name": "石昊", "description": "完美世界主角"}]
            objects = []
        else:
            # 从AI分析结果中提取信息
            ai_analysis = analysis_result.get("analysis", {})
            scene_description = ai_analysis.get("scene_description", f"完美世界第{scene_id}个场景")
            
            # 提取角色信息
            detected_characters = ai_analysis.get("characters", [])
            characters = []
            for char in detected_characters:
                if isinstance(char, dict):
                    characters.append({
                        "name": char.get("name", "未知角色"),
                        "description": char.get("description", "角色描述")
                    })
                else:
                    characters.append({
                        "name": str(char),
                        "description": f"{char}在完美世界中的形象"
                    })
            
            # 如果没有检测到角色，添加默认主角
            if not characters:
                characters.append({"name": "石昊", "description": "完美世界主角"})
            
            # 提取物体信息
            objects = ai_analysis.get("objects", [])
            
            print(f"AI分析结果 - 场景: {scene_description}")
            print(f"检测到角色: {[c['name'] for c in characters]}")
            
    except Exception as e:
        print(f"AI分析过程中出现错误: {str(e)}")
        # 使用默认描述作为后备方案
        scene_description = f"完美世界第{scene_id}个场景，展现修炼世界的奇幻景象"
        characters = [{"name": "石昊", "description": "完美世界主角"}]
        objects = []
    
    # 基于AI分析结果生成分镜脚本内容
    try:
        # 使用AI生成小说片段
        novel_fragment_prompt = f"""基于以下场景描述，为完美世界小说生成一段简短的叙述文字（50字以内）：
场景描述：{scene_description}
角色：{', '.join([c['name'] for c in characters])}

要求：
1. 符合完美世界的世界观和风格
2. 描述要生动具体
3. 体现场景的氛围和特点
4. 字数控制在50字以内"""
        
        novel_fragment_result = llm_service.query_text(novel_fragment_prompt, "你是一个专业的小说创作助手，擅长创作玄幻修真类小说。")
        novel_fragment = novel_fragment_result.strip() if novel_fragment_result else f"完美世界第{scene_id}个场景，展现修炼世界的精彩故事。"
        
        # 使用AI生成音效描述
        sound_effects_prompt = f"""基于以下场景描述，生成合适的音效描述（30字以内）：
场景：{scene_description}

要求：
1. 描述环境音效和背景声音
2. 符合完美世界的奇幻修真氛围
3. 字数控制在30字以内"""
        
        sound_effects_result = llm_service.query_text(sound_effects_prompt, "你是一个专业的音效设计师。")
        sound_effects = sound_effects_result.strip() if sound_effects_result else "环境音效，根据场景内容调整"
        
    except Exception as e:
        print(f"AI生成内容时出现错误: {str(e)}")
        novel_fragment = f"完美世界第{scene_id}个场景，展现修炼世界的精彩故事。"
        sound_effects = "环境音效，根据场景内容调整"
    
    storyboard_data = {
        "scene_id": scene_id,
        "novel_fragment": novel_fragment,
        "storyboard": scene_description,
        "wan22_prompt": f"masterpiece, best quality, ultra detailed, 8k, photorealistic, cinematic lighting, perfect world fantasy setting, {scene_description}, ancient cultivation world, mystical atmosphere",
        "character_dialogue": "[无台词]",
        "sound_effects": sound_effects,
        "elements_layout": [
            {
                "element_type": "scene",
                "name": f"场景{scene_id}",
                "prompt": scene_description,
                "x": 0,
                "y": 0,
                "width": 1280,
                "height": 720
            }
        ],
        "required_elements": {
            "characters": [char['name'] for char in characters if 'name' in char],
            "character_subjects": [f"@{char['name']}" for char in characters if 'name' in char],
            "scene_subjects": [f"@场景{scene_id}"],
            "scene_prompt": scene_description
        },
        "generated_at": datetime.now().isoformat(),
        "description": scene_description,
        "images": [],
        "generation_info": {
            "type": "基于关键帧生成",
            "timestamp": int(datetime.now().timestamp() * 1000),
            "keyframe_source": keyframe_path
        }
    }
    
    return storyboard_data, characters, objects

def save_character_subject(project_name, character_data):
    """
    保存角色主体数据，基于AI分析结果生成详细信息
    """
    character_dir = get_project_dir(project_name, 'character')
    os.makedirs(character_dir, exist_ok=True)
    
    character_file = os.path.join(character_dir, f"{character_data['name']}.json")
    
    # 检查是否已存在
    if os.path.exists(character_file):
        print(f"角色 {character_data['name']} 已存在，跳过")
        return
    
    char_name = character_data['name']
    char_description = character_data.get('description', f"{char_name}在完美世界中的形象")
    
    # 使用AI生成角色详细信息
    try:
        llm_service = LLMService()
        
        # 生成角色外观描述
        appearance_prompt = f"""基于角色名称和描述，为完美世界小说中的角色生成详细的外观描述（50字以内）：
角色名称：{char_name}
角色描述：{char_description}

要求：
1. 符合完美世界的世界观和风格
2. 描述要生动具体
3. 体现角色的特点和气质
4. 字数控制在50字以内"""
        
        appearance_result = llm_service.query_text(appearance_prompt, "你是一个专业的角色设计师，擅长创作玄幻修真类小说角色。")
        appearance = appearance_result.strip() if appearance_result else f"{char_name}在完美世界中的形象"
        
        # 生成角色性格描述
        personality_prompt = f"""基于角色名称和描述，为完美世界小说中的角色生成性格特点（30字以内）：
角色名称：{char_name}
角色描述：{char_description}

要求：
1. 符合完美世界的世界观
2. 性格描述要具体明确
3. 字数控制在30字以内"""
        
        personality_result = llm_service.query_text(personality_prompt, "你是一个专业的角色设计师。")
        personality = personality_result.strip() if personality_result else "待补充"
        
        # 判断角色类型
        if char_name == "石昊":
            character_type = "主要角色"
            description = "完美世界的主角，拥有至尊骨，天赋异禀，性格坚韧不拔，勇敢无畏"
        elif "村民" in char_name or "村" in char_name:
            character_type = "配角"
            description = char_description
        elif "对手" in char_name or "敌" in char_name:
            character_type = "对手角色"
            description = char_description
        else:
            character_type = "其他角色"
            description = char_description
            
    except Exception as e:
        print(f"AI生成角色信息时出现错误: {str(e)}")
        # 使用默认值
        appearance = f"{char_name}在完美世界中的形象"
        personality = "待补充"
        character_type = "其他角色"
        description = char_description
    
    # 构建角色数据
    character_json = {
        "id": character_data.get('id', 0),
        "name": char_name,
        "appearance": appearance,
        "description": description,
        "tag": f"masterpiece, best quality, ultra detailed, 8k, photorealistic, perfect world character, {appearance}, ancient cultivation world",
        "englishPrompt": f"masterpiece, best quality, ultra detailed, 8k, photorealistic, perfect world character, {appearance}, ancient cultivation world",
        "selectedLora": "",
        "image_url": "",
        "images": [],
        "createdAt": datetime.now().isoformat(),
        "personality": personality,
        "character_type": character_type
    }
    
    with open(character_file, 'w', encoding='utf-8') as f:
        json.dump(character_json, f, ensure_ascii=False, indent=2)
    
    print(f"已保存角色主体: {character_data['name']}")

def save_scene_subject(project_name, scene_id, scene_description):
    """
    保存场景主体数据
    """
    scene_dir = get_project_dir(project_name, 'scene')
    os.makedirs(scene_dir, exist_ok=True)
    
    scene_name = f"场景{scene_id}"
    scene_file = os.path.join(scene_dir, f"{scene_name}.json")
    
    # 检查是否已存在
    if os.path.exists(scene_file):
        print(f"场景 {scene_name} 已存在，跳过")
        return
    
    # 场景类型映射
    scene_types = {
        1: "外景-远景",
        2: "内景-村落", 
        3: "外景-禁地",
        4: "内景-修炼室",
        5: "外景-战斗场"
    }
    
    # 氛围映射
    atmosphere_map = {
        1: "神秘壮观，远古气息浓郁",
        2: "温馨祥和，生活气息浓厚",
        3: "紧张危险，充满未知威胁", 
        4: "神秘修炼，灵气充沛",
        5: "激烈战斗，能量澎湃"
    }
    
    scene_type = scene_types.get(scene_id, "外景-通用")
    atmosphere = atmosphere_map.get(scene_id, "奇幻修炼世界氛围")
    
    # 构建场景数据
    scene_json = {
        "id": scene_id,
        "name": scene_name,
        "description": scene_description,
        "tag": f"masterpiece, best quality, ultra detailed, 8k, photorealistic, perfect world fantasy setting, {scene_description}, ancient cultivation world",
        "englishPrompt": f"masterpiece, best quality, ultra detailed, 8k, photorealistic, perfect world fantasy setting, {scene_description}, ancient cultivation world",
        "selectedLora": "",
        "image_url": "",
        "images": [],
        "createdAt": datetime.now().isoformat(),
        "scene_type": scene_type,
        "atmosphere": atmosphere
    }
    
    with open(scene_file, 'w', encoding='utf-8') as f:
        json.dump(scene_json, f, ensure_ascii=False, indent=2)
    
    print(f"已保存场景主体: {scene_name}")

def save_storyboard(project_name, scene_id, storyboard_data):
    """
    保存分镜脚本
    """
    storyboard_dir = get_project_dir(project_name, 'storyboard')
    os.makedirs(storyboard_dir, exist_ok=True)
    
    storyboard_file = os.path.join(storyboard_dir, f"storyboard_{scene_id-1}.json")
    
    with open(storyboard_file, 'w', encoding='utf-8') as f:
        json.dump(storyboard_data, f, ensure_ascii=False, indent=2)
    
    print(f"已保存分镜脚本: storyboard_{scene_id-1}.json")

def main():
    project_name = "完美世界"
    keyframes_dir = get_project_dir(project_name, 'video_keyframes')
    
    print(f"开始处理项目: {project_name}")
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
    
    # 处理每个关键帧
    for scene_id, keyframe_path in first_keyframes:
        try:
            # 分析关键帧并生成分镜脚本
            result = analyze_keyframe_and_generate_storyboard(project_name, scene_id, keyframe_path)
            
            if result:
                storyboard_data, characters, objects = result
                
                # 保存分镜脚本
                save_storyboard(project_name, scene_id, storyboard_data)
                
                # 保存角色主体
                for char in characters:
                    if 'name' in char and char['name']:
                        save_character_subject(project_name, char)
                
                # 保存场景主体
                save_scene_subject(project_name, scene_id, storyboard_data['storyboard'])
                
                print(f"场景 {scene_id} 处理完成")
            else:
                print(f"场景 {scene_id} 处理失败")
                
        except Exception as e:
            print(f"处理场景 {scene_id} 时出错: {str(e)}")
            continue
    
    print("\n所有场景处理完成！")
    print("生成的文件:")
    print(f"- 分镜脚本: temp/{project_name}/storyboard/storyboard_*.json")
    print(f"- 角色主体: temp/{project_name}/character/*.json")
    print(f"- 场景主体: temp/{project_name}/scene/*.json")

if __name__ == "__main__":
    main()