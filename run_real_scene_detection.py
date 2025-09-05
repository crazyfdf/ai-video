#!/usr/bin/env python
# -*- coding: utf-8 -*-

from backend.video.scene_detection import VideoSceneDetector
import os
import json

def main():
    # 视频文件路径
    video_path = 'temp/完美世界/videos/GM-TeamPerfect_World2021155AVCGB1080P_online-video-cutter.com_20250831_111015.mp4'
    
    # 检查视频文件是否存在
    if not os.path.exists(video_path):
        print(f"错误：视频文件不存在 {video_path}")
        return
    
    print(f"开始检测视频场景: {video_path}")
    
    # 创建场景检测器（不使用统计文件）
    detector = VideoSceneDetector(threshold=30.0, detector_type='content')
    
    # 执行场景检测（不使用统计文件）
    scenes = detector.detect_scenes(video_path, stats_file=None, save_stats=False)
    
    print(f"检测到 {len(scenes)} 个场景:")
    
    # 显示前10个场景的信息
    for i, scene in enumerate(scenes[:10]):
        print(f"场景{scene['scene_id']}: {scene['start_time']:.2f}s - {scene['end_time']:.2f}s (时长: {scene['duration']:.2f}s)")
    
    if len(scenes) > 10:
        print(f"... 还有 {len(scenes) - 10} 个场景")
    
    # 保存场景数据
    output_dir = 'temp/完美世界'
    os.makedirs(output_dir, exist_ok=True)
    
    output_file = os.path.join(output_dir, 'real_scenes.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(scenes, f, ensure_ascii=False, indent=2)
    
    print(f"场景数据已保存到 {output_file}")
    
    # 显示总体统计
    total_duration = sum(scene['duration'] for scene in scenes)
    print(f"\n总体统计:")
    print(f"- 总场景数: {len(scenes)}")
    print(f"- 总时长: {total_duration:.2f}秒")
    print(f"- 平均场景时长: {total_duration/len(scenes):.2f}秒")

if __name__ == '__main__':
    main()