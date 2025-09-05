#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.rest_handler.smart_video_generation import SmartVideoGenerator
import json

def regenerate_with_project_method():
    """使用项目现有方法重新生成分镜视频"""
    project_name = "完美世界"
    
    # 读取真实场景数据
    real_scenes_file = os.path.join("temp", project_name, "real_scenes.json")
    with open(real_scenes_file, 'r', encoding='utf-8') as f:
        real_scenes = json.load(f)
    
    print(f"读取到 {len(real_scenes)} 个真实场景")
    
    # 更新所有分镜JSON文件的时间信息
    storyboard_dir = os.path.join("temp", project_name, "storyboard")
    
    for i, scene in enumerate(real_scenes):
        scene_id = scene['scene_id']
        start_time = scene['start_time']
        end_time = scene['end_time']
        duration = scene['duration']
        
        print(f"更新分镜 {i}: {start_time:.2f}s - {end_time:.2f}s (时长: {duration:.2f}s)")
        
        # 读取现有的分镜JSON文件
        storyboard_json_file = os.path.join(storyboard_dir, f"storyboard_{i}.json")
        if os.path.exists(storyboard_json_file):
            with open(storyboard_json_file, 'r', encoding='utf-8') as f:
                storyboard_data = json.load(f)
            
            # 更新时间信息
            storyboard_data['start_time'] = start_time
            storyboard_data['end_time'] = end_time
            storyboard_data['duration'] = duration
            storyboard_data['scene_id'] = scene_id
            
            # 保存更新后的JSON文件
            with open(storyboard_json_file, 'w', encoding='utf-8') as f:
                json.dump(storyboard_data, f, ensure_ascii=False, indent=2)
            
            print(f"已更新分镜JSON文件: {storyboard_json_file}")
        else:
            print(f"警告：分镜JSON文件不存在 {storyboard_json_file}")
    
    print("\n所有分镜JSON文件已更新，现在使用项目方法重新生成视频...")
    
    # 使用项目的SmartVideoGenerator重新生成视频
    generator = SmartVideoGenerator()
    
    # 配置视频参数
    video_config = {
        'width': 1920,
        'height': 818,
        'fps': 25,
        'default_duration': 3.0
    }
    
    try:
        result = generator.generate_individual_storyboard_videos(project_name, video_config)
        
        if result['success']:
            print(f"\n成功！已重新生成 {len(result['generated_videos'])} 个分镜视频")
            for video_info in result['generated_videos']:
                print(f"分镜{video_info['index']}: {video_info['video_path']} (时长: {video_info['duration']:.2f}s)")
        else:
            print(f"\n生成失败: {result.get('error', '未知错误')}")
            print(f"消息: {result.get('message', '')}")
            
    except Exception as e:
        print(f"\n调用项目方法失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    regenerate_with_project_method()