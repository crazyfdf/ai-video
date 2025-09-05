import os
import logging
import tempfile
from typing import Dict, List, Any, Optional
from moviepy.editor import VideoFileClip, AudioFileClip
import numpy as np
from backend.util.project_file_manager import get_project_dir

class AudioEffectsExtractor:
    """音效提取器：从视频中提取和分离音效"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def extract_audio_from_video(self, video_path: str, project_name: str) -> Dict[str, Any]:
        """从视频中提取完整音频"""
        try:
            if not os.path.exists(video_path):
                return {
                    "success": False,
                    "error": f"Video file not found: {video_path}",
                    "message": "视频文件不存在"
                }
            
            # 创建音效输出目录
            effects_dir = get_project_dir(project_name, 'effects')
            os.makedirs(effects_dir, exist_ok=True)
            
            # 使用moviepy提取音频
            self.logger.info(f"Extracting audio from video: {video_path}")
            video = VideoFileClip(video_path)
            audio = video.audio
            
            if audio is None:
                return {
                    "success": False,
                    "error": "No audio track found in video",
                    "message": "视频中未找到音频轨道"
                }
            
            # 导出完整音频
            full_audio_path = os.path.join(effects_dir, "full_audio.wav")
            audio.write_audiofile(full_audio_path, verbose=False, logger=None)
            
            # 获取音频信息
            duration = audio.duration
            fps = audio.fps if hasattr(audio, 'fps') else 44100
            
            audio.close()
            video.close()
            
            return {
                "success": True,
                "audio_path": full_audio_path,
                "duration": duration,
                "fps": fps,
                "message": f"成功提取音频，时长: {duration:.2f}秒"
            }
            
        except Exception as e:
            self.logger.error(f"Audio extraction failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "音频提取失败"
            }
    
    def extract_scene_audio(self, video_path: str, scenes: List[Dict], project_name: str) -> Dict[str, Any]:
        """按场景提取音频片段"""
        try:
            if not os.path.exists(video_path):
                return {
                    "success": False,
                    "error": f"Video file not found: {video_path}",
                    "message": "视频文件不存在"
                }
            
            # 创建场景音频输出目录
            scene_audio_dir = get_project_dir(project_name, 'scene_audio')
            os.makedirs(scene_audio_dir, exist_ok=True)
            
            video = VideoFileClip(video_path)
            audio = video.audio
            
            if audio is None:
                return {
                    "success": False,
                    "error": "No audio track found in video",
                    "message": "视频中未找到音频轨道"
                }
            
            scene_audio_files = []
            
            for scene in scenes:
                scene_id = scene.get('scene_id', 'unknown')
                start_time = scene.get('start_time', 0)
                duration = scene.get('duration', 1)
                end_time = start_time + duration
                
                # 提取场景音频片段
                scene_audio = audio.subclip(start_time, end_time)
                scene_audio_path = os.path.join(scene_audio_dir, f"scene_{scene_id}_audio.wav")
                
                scene_audio.write_audiofile(scene_audio_path, verbose=False, logger=None)
                
                scene_audio_files.append({
                    "scene_id": scene_id,
                    "audio_path": scene_audio_path,
                    "start_time": start_time,
                    "duration": duration,
                    "end_time": end_time
                })
                
                scene_audio.close()
            
            audio.close()
            video.close()
            
            return {
                "success": True,
                "scene_audio_files": scene_audio_files,
                "total_scenes": len(scene_audio_files),
                "message": f"成功提取 {len(scene_audio_files)} 个场景音频"
            }
            
        except Exception as e:
            self.logger.error(f"Scene audio extraction failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "场景音频提取失败"
            }
    
    def separate_audio_effects(self, audio_path: str, project_name: str) -> Dict[str, Any]:
        """分离音效（简单的音频处理，分离背景音和前景音）"""
        try:
            if not os.path.exists(audio_path):
                return {
                    "success": False,
                    "error": f"Audio file not found: {audio_path}",
                    "message": "音频文件不存在"
                }
            
            # 创建分离音效输出目录
            separated_dir = get_project_dir(project_name, 'separated_audio')
            os.makedirs(separated_dir, exist_ok=True)
            
            # 加载音频
            audio_clip = AudioFileClip(audio_path)
            
            # 获取音频数据
            audio_array = audio_clip.to_soundarray()
            
            if len(audio_array.shape) == 2:  # 立体声
                # 分离左右声道
                left_channel = audio_array[:, 0]
                right_channel = audio_array[:, 1]
                
                # 计算中央声道（通常是人声）
                center_channel = (left_channel + right_channel) / 2
                
                # 计算侧声道（通常是音效和背景音）
                side_channel = (left_channel - right_channel) / 2
                
                # 保存分离的音频
                center_path = os.path.join(separated_dir, "center_audio.wav")
                side_path = os.path.join(separated_dir, "side_audio.wav")
                
                # 创建新的音频剪辑
                from moviepy.audio.AudioClip import AudioArrayClip
                
                center_clip = AudioArrayClip(center_channel.reshape(-1, 1), fps=audio_clip.fps)
                side_clip = AudioArrayClip(side_channel.reshape(-1, 1), fps=audio_clip.fps)
                
                center_clip.write_audiofile(center_path, verbose=False, logger=None)
                side_clip.write_audiofile(side_path, verbose=False, logger=None)
                
                center_clip.close()
                side_clip.close()
                
                separated_files = {
                    "center_audio": center_path,  # 中央声道（主要是人声）
                    "side_audio": side_path,     # 侧声道（主要是音效）
                }
                
            else:  # 单声道
                # 对于单声道，只能做简单的频率分离
                mono_path = os.path.join(separated_dir, "mono_audio.wav")
                audio_clip.write_audiofile(mono_path, verbose=False, logger=None)
                
                separated_files = {
                    "mono_audio": mono_path
                }
            
            audio_clip.close()
            
            return {
                "success": True,
                "separated_files": separated_files,
                "message": "音频分离完成"
            }
            
        except Exception as e:
            self.logger.error(f"Audio separation failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "音频分离失败"
            }
    
    def extract_all_effects(self, video_path: str, scenes: List[Dict], project_name: str) -> Dict[str, Any]:
        """提取所有音效（完整流程）"""
        try:
            results = {
                "success": True,
                "extracted_files": {},
                "message": "音效提取完成"
            }
            
            # 1. 提取完整音频
            full_audio_result = self.extract_audio_from_video(video_path, project_name)
            if not full_audio_result["success"]:
                return full_audio_result
            
            results["extracted_files"]["full_audio"] = full_audio_result["audio_path"]
            
            # 2. 按场景提取音频
            scene_audio_result = self.extract_scene_audio(video_path, scenes, project_name)
            if scene_audio_result["success"]:
                results["extracted_files"]["scene_audio"] = scene_audio_result["scene_audio_files"]
            
            # 3. 分离音效
            separation_result = self.separate_audio_effects(full_audio_result["audio_path"], project_name)
            if separation_result["success"]:
                results["extracted_files"]["separated_audio"] = separation_result["separated_files"]
            
            return results
            
        except Exception as e:
            self.logger.error(f"Complete audio effects extraction failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "完整音效提取失败"
            }