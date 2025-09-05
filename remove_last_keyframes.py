#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
删除每个场景的最后一帧关键帧图片
"""

import os
import json
import logging
from collections import defaultdict

# 设置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def remove_last_keyframes():
    """
    删除每个场景的最后一帧关键帧图片
    """
    project_name = "完美世界"
    keyframes_dir = f"temp/{project_name}/video_keyframes"
    
    if not os.path.exists(keyframes_dir):
        logger.error(f"关键帧目录不存在: {keyframes_dir}")
        return
    
    # 获取所有关键帧文件
    keyframe_files = [f for f in os.listdir(keyframes_dir) if f.lower().endswith('.jpg')]
    
    # 按场景分组关键帧
    scene_keyframes = defaultdict(list)
    
    for filename in keyframe_files:
        # 解析文件名: scene_{scene_id}_keyframe_{index}.jpg
        if filename.startswith('scene_') and '_keyframe_' in filename:
            parts = filename.replace('.jpg', '').split('_')
            if len(parts) >= 4:
                try:
                    scene_id = int(parts[1])
                    keyframe_index = int(parts[3])
                    scene_keyframes[scene_id].append((keyframe_index, filename))
                except ValueError:
                    logger.warning(f"无法解析文件名: {filename}")
    
    # 删除每个场景的最后一帧
    deleted_count = 0
    
    for scene_id, keyframes in scene_keyframes.items():
        if len(keyframes) > 1:  # 只有当场景有多个关键帧时才删除最后一帧
            # 按关键帧索引排序
            keyframes.sort(key=lambda x: x[0])
            
            # 获取最后一帧
            last_keyframe = keyframes[-1]
            last_filename = last_keyframe[1]
            last_filepath = os.path.join(keyframes_dir, last_filename)
            
            try:
                os.remove(last_filepath)
                logger.info(f"删除场景 {scene_id} 的最后一帧: {last_filename}")
                deleted_count += 1
            except Exception as e:
                logger.error(f"删除文件失败 {last_filepath}: {str(e)}")
        else:
            logger.info(f"场景 {scene_id} 只有 {len(keyframes)} 个关键帧，跳过删除")
    
    logger.info(f"总共删除了 {deleted_count} 个关键帧文件")
    
    # 显示删除后的统计信息
    remaining_files = [f for f in os.listdir(keyframes_dir) if f.lower().endswith('.jpg')]
    remaining_scene_keyframes = defaultdict(int)
    
    for filename in remaining_files:
        if filename.startswith('scene_') and '_keyframe_' in filename:
            parts = filename.replace('.jpg', '').split('_')
            if len(parts) >= 4:
                try:
                    scene_id = int(parts[1])
                    remaining_scene_keyframes[scene_id] += 1
                except ValueError:
                    pass
    
    logger.info("删除后各场景关键帧数量:")
    for scene_id in sorted(remaining_scene_keyframes.keys()):
        count = remaining_scene_keyframes[scene_id]
        logger.info(f"  场景 {scene_id}: {count} 个关键帧")
    
    logger.info(f"删除后总关键帧数量: {len(remaining_files)}")

if __name__ == "__main__":
    remove_last_keyframes()