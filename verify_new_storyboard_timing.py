#!/usr/bin/env python
# -*- coding: utf-8 -*-

from moviepy.editor import VideoFileClip
import json
import os

def verify_new_storyboard_timing():
    # 读取真实场景数据
    scenes_file = 'temp/完美世界/real_scenes.json'
    with open(scenes_file, 'r', encoding='utf-8') as f:
        scenes = json.load(f)
    
    print("验证分镜视频时长是否与真实场景匹配:")
    print("=" * 60)
    
    # 测试几个代表性的分镜
    test_indices = [0, 1, 5, 10, 15, 20, 22]
    
    for i in test_indices:
        if i < len(scenes):
            scene = scenes[i]
            expected_duration = scene['duration']
            
            video_path = f"temp/完美世界/videos/storyboard_{i}.mp4"
            if os.path.exists(video_path):
                try:
                    video_clip = VideoFileClip(video_path)
                    actual_duration = video_clip.duration
                    video_clip.close()
                    
                    difference = abs(actual_duration - expected_duration)
                    status = "✓ 匹配" if difference < 0.1 else "✗ 不匹配"
                    
                    print(f"分镜{i}: 预期={expected_duration:.2f}s, 实际={actual_duration:.2f}s, 差异={difference:.2f}s {status}")
                except Exception as e:
                    print(f"分镜{i}: 读取视频失败 - {e}")
            else:
                print(f"分镜{i}: 视频文件不存在")
    
    print("\n" + "=" * 60)
    print("验证完成！")

if __name__ == '__main__':
    verify_new_storyboard_timing()