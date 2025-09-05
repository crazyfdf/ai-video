#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json
import os
from moviepy.editor import VideoFileClip

def regenerate_storyboards_with_real_scenes():
    project_name = "完美世界"
    
    # 读取真实场景数据
    real_scenes_file = os.path.join("temp", project_name, "real_scenes.json")
    with open(real_scenes_file, 'r', encoding='utf-8') as f:
        real_scenes = json.load(f)
    
    print(f"读取到 {len(real_scenes)} 个真实场景")
    
    # 原始视频路径
    video_path = os.path.join("temp", project_name, "videos", "GM-TeamPerfect_World2021155AVCGB1080P_online-video-cutter.com_20250831_111015.mp4")
    
    # 检查原始视频是否存在
    if not os.path.exists(video_path):
        print(f"错误：原始视频文件不存在 {video_path}")
        return
    
    print(f"使用原始视频: {video_path}")
    
    # 分镜目录
    storyboard_dir = os.path.join("temp", project_name, "storyboard")
    videos_dir = os.path.join("temp", project_name, "videos")
    
    # 确保目录存在
    os.makedirs(storyboard_dir, exist_ok=True)
    os.makedirs(videos_dir, exist_ok=True)
    
    # 加载原始视频
    video_clip = VideoFileClip(video_path)
    print(f"原始视频时长: {video_clip.duration:.2f}秒")
    
    # 为每个场景生成分镜视频
    for i, scene in enumerate(real_scenes):
        scene_id = scene['scene_id']
        start_time = scene['start_time']
        end_time = scene['end_time']
        duration = scene['duration']
        
        print(f"\n处理场景 {scene_id}: {start_time:.2f}s - {end_time:.2f}s (时长: {duration:.2f}s)")
        
        # 读取现有的分镜JSON文件
        storyboard_json_file = os.path.join(storyboard_dir, f"storyboard_{i}.json")
        if os.path.exists(storyboard_json_file):
            with open(storyboard_json_file, 'r', encoding='utf-8') as f:
                storyboard_data = json.load(f)
            
            # 更新时间信息
            storyboard_data['start_time'] = start_time
            storyboard_data['end_time'] = end_time
            storyboard_data['duration'] = duration
            
            # 保存更新后的JSON文件
            with open(storyboard_json_file, 'w', encoding='utf-8') as f:
                json.dump(storyboard_data, f, ensure_ascii=False, indent=2)
            
            print(f"已更新分镜JSON文件: {storyboard_json_file}")
        else:
            print(f"警告：分镜JSON文件不存在 {storyboard_json_file}")
            continue
        
        # 生成新的分镜视频
        try:
            # 从原始视频中裁剪对应时间段
            scene_clip = video_clip.subclip(start_time, end_time)
            
            # 输出视频文件路径
            output_video_path = os.path.join(videos_dir, f"storyboard_{i}.mp4")
            
            # 保存视频片段
            scene_clip.write_videofile(
                output_video_path,
                codec='libx264',
                audio_codec='aac',
                verbose=False,
                logger=None
            )
            
            # 释放资源
            scene_clip.close()
            
            print(f"已生成分镜视频: {output_video_path} (时长: {duration:.2f}s)")
            
        except Exception as e:
            print(f"生成分镜视频失败: {e}")
            continue
    
    # 释放原始视频资源
    video_clip.close()
    
    print(f"\n完成！已基于真实场景时间重新生成 {len(real_scenes)} 个分镜视频")

if __name__ == '__main__':
    regenerate_storyboards_with_real_scenes()