"""智能分镜视频生成模块
基于项目中的关键帧、分镜数据和音效生成智能视频
"""

import os
import json
import logging
from datetime import datetime
from flask import jsonify, request
from moviepy.editor import ImageClip, AudioFileClip, concatenate_videoclips, CompositeVideoClip
from backend.util.file import get_project_dir

# 配置日志
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class SmartVideoGenerator:
    """智能分镜视频生成器"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def generate_individual_storyboard_videos(self, project_name, video_config=None):
        """为每个分镜生成单独的视频文件"""
        try:
            self.logger.info(f"开始为项目 {project_name} 生成单个分镜视频")
            
            # 加载项目数据
            project_data = self._load_project_data(project_name)
            
            # 获取分镜数据
            storyboard_data = self._load_storyboard_data(project_name)
            if not storyboard_data:
                return {
                    "success": False,
                    "error": "未找到分镜数据",
                    "message": "请先生成分镜脚本"
                }
            
            # 获取关键帧图片
            keyframes = self._get_keyframe_images(project_name)
            if not keyframes:
                return {
                    "success": False,
                    "error": "未找到关键帧图片",
                    "message": "请先提取视频关键帧"
                }
            
            # 获取音效文件
            audio_file = self._get_audio_file(project_name)
            
            # 生成视频配置
            config = self._prepare_video_config(video_config, project_data)
            
            # 为每个分镜生成单独的视频
            generated_videos = []
            videos_dir = get_project_dir(project_name, 'videos')
            os.makedirs(videos_dir, exist_ok=True)
            
            self.logger.info(f"开始处理 {len(storyboard_data)} 个分镜")
            for i, storyboard in enumerate(storyboard_data):
                try:
                    self.logger.info(f"处理分镜 {i}: scene_id={storyboard.get('scene_id')}, duration={storyboard.get('duration')}")
                    video_path = self._generate_single_storyboard_video(
                        project_name, storyboard, i, keyframes, audio_file, config
                    )
                    if video_path:
                        generated_videos.append({
                            "index": i,
                            "storyboard_id": storyboard.get('index', i),
                            "video_path": f"/temp/{project_name}/videos/storyboard_{i}.mp4",
                            "duration": storyboard.get('duration', config.get('default_duration', 3.0)),
                            "scene_description": storyboard.get('scene_description', ''),
                            "dialogue": storyboard.get('dialogue', '')
                        })
                        self.logger.info(f"分镜 {i} 视频生成成功: {video_path}")
                    else:
                        self.logger.warning(f"分镜 {i} 视频生成失败")
                except Exception as e:
                    self.logger.error(f"生成分镜 {i} 视频时出错: {str(e)}")
                    import traceback
                    self.logger.error(f"详细错误信息: {traceback.format_exc()}")
                    continue
            
            # 保存生成信息
            generation_info = {
                "project_name": project_name,
                "total_storyboards": len(storyboard_data),
                "generated_videos": len(generated_videos),
                "videos": generated_videos,
                "has_audio": audio_file is not None,
                "config": config,
                "generated_at": datetime.now().isoformat()
            }
            
            self._save_individual_generation_info(project_name, generation_info)
            
            return {
                "success": True,
                "generated_videos": generated_videos,
                "generation_info": generation_info,
                "message": f"成功生成 {len(generated_videos)} 个分镜视频"
            }
            
        except Exception as e:
            self.logger.error(f"单个分镜视频生成失败: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "单个分镜视频生成失败"
            }
    
    def generate_smart_storyboard_video(self, project_name, video_config=None):
        """生成智能分镜视频（合并版本）"""
        try:
            self.logger.info(f"开始为项目 {project_name} 生成智能分镜视频")
            
            # 加载项目数据
            project_data = self._load_project_data(project_name)
            
            # 获取分镜数据
            storyboard_data = self._load_storyboard_data(project_name)
            if not storyboard_data:
                return {
                    "success": False,
                    "error": "未找到分镜数据",
                    "message": "请先生成分镜脚本"
                }
            
            # 获取关键帧图片
            keyframes = self._get_keyframe_images(project_name)
            if not keyframes:
                return {
                    "success": False,
                    "error": "未找到关键帧图片",
                    "message": "请先提取视频关键帧"
                }
            
            # 获取音效文件
            audio_file = self._get_audio_file(project_name)
            
            # 生成视频配置
            config = self._prepare_video_config(video_config, project_data)
            
            # 创建视频片段
            video_clips = self._create_video_clips(storyboard_data, keyframes, audio_file, config)
            
            # 合成最终视频
            output_path = self._compose_final_video(project_name, video_clips, config)
            
            # 保存生成信息
            generation_info = {
                "project_name": project_name,
                "video_path": output_path,
                "storyboard_count": len(storyboard_data),
                "keyframes_used": len(keyframes),
                "has_audio": audio_file is not None,
                "config": config,
                "generated_at": datetime.now().isoformat()
            }
            
            self._save_generation_info(project_name, generation_info)
            
            return {
                "success": True,
                "video_path": f"/temp/{project_name}/videos/smart_storyboard_video.mp4",
                "generation_info": generation_info,
                "message": "智能分镜视频生成成功"
            }
            
        except Exception as e:
            self.logger.error(f"智能分镜视频生成失败: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "智能分镜视频生成失败"
            }
    
    def _load_project_data(self, project_name):
        """加载项目数据"""
        try:
            project_file = os.path.join(get_project_dir(project_name, ''), 'project_settings.json')
            if os.path.exists(project_file):
                with open(project_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            return {}
        except Exception as e:
            self.logger.warning(f"加载项目数据失败: {e}")
            return {}
    
    def _load_storyboard_data(self, project_name):
        """加载分镜数据"""
        storyboard_dir = get_project_dir(project_name, 'storyboard')
        storyboard_data = []
        
        if not os.path.exists(storyboard_dir):
            return storyboard_data
        
        # 获取所有分镜文件
        storyboard_files = [f for f in os.listdir(storyboard_dir) if f.startswith('storyboard_') and f.endswith('.json')]
        storyboard_files.sort(key=lambda x: int(x.split('_')[1].split('.')[0]))
        
        for file in storyboard_files:
            try:
                with open(os.path.join(storyboard_dir, file), 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    storyboard_data.append(data)
            except Exception as e:
                self.logger.warning(f"加载分镜文件 {file} 失败: {e}")
        
        return storyboard_data
    
    def _get_keyframe_images(self, project_name):
        """获取关键帧图片"""
        keyframes_dir = get_project_dir(project_name, 'video_keyframes')
        keyframes = []
        
        if not os.path.exists(keyframes_dir):
            return keyframes
        
        # 获取所有关键帧图片
        image_files = [f for f in os.listdir(keyframes_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        image_files.sort()
        
        for file in image_files:
            keyframes.append(os.path.join(keyframes_dir, file))
        
        return keyframes
    
    def _get_audio_file(self, project_name):
        """获取音效文件"""
        effects_dir = get_project_dir(project_name, 'effects')
        audio_file = os.path.join(effects_dir, 'full_audio.wav')
        
        if os.path.exists(audio_file):
            return audio_file
        return None
    
    def _prepare_video_config(self, video_config, project_data):
        """准备视频配置"""
        default_config = {
            "fps": 24,
            "width": 1920,
            "height": 1080,
            "default_duration": 3.0,  # 默认每个分镜3秒
            "transition_duration": 0.0,  # 转场时间设置为0，不使用转场效果
            "use_audio": True,
            "audio_fade_in": 0.5,
            "audio_fade_out": 0.5
        }
        
        # 从项目数据中获取尺寸配置
        if project_data.get('dimensions'):
            dims = project_data['dimensions']
            default_config['width'] = dims.get('width', 1920)
            default_config['height'] = dims.get('height', 1080)
        
        # 合并用户配置
        if video_config:
            default_config.update(video_config)
        
        return default_config
    
    def _create_video_clips(self, storyboard_data, keyframes, audio_file, config):
        """创建视频片段"""
        clips = []
        
        # 如果有音频文件，加载它
        audio_clip = None
        if audio_file and config.get('use_audio', True):
            try:
                audio_clip = AudioFileClip(audio_file)
                if config.get('audio_fade_in', 0) > 0:
                    audio_clip = audio_clip.audio_fadein(config['audio_fade_in'])
                if config.get('audio_fade_out', 0) > 0:
                    audio_clip = audio_clip.audio_fadeout(config['audio_fade_out'])
                self.logger.info(f"音频文件加载成功，总时长: {audio_clip.duration:.1f}秒")
            except Exception as e:
                self.logger.warning(f"加载音频文件失败: {e}")
                audio_clip = None
        
        # 为每个分镜创建视频片段
        for i, storyboard in enumerate(storyboard_data):
            try:
                # 选择对应的关键帧图片
                image_path = self._select_keyframe_for_storyboard(storyboard, keyframes, i)
                
                if not image_path or not os.path.exists(image_path):
                    self.logger.warning(f"分镜 {i} 未找到对应的关键帧图片")
                    continue
                
                # 确定片段时长 - 优先使用分镜的实际时长
                duration = storyboard.get('duration', config['default_duration'])
                if duration <= 0 or duration > 30:  # 限制最大时长为30秒
                    duration = config['default_duration']
                
                # 创建图片片段
                image_clip = ImageClip(image_path, duration=duration)
                image_clip = image_clip.resize((config['width'], config['height']))
                
                # 不添加淡入淡出效果
                # transition_duration = config.get('transition_duration', 0.5)
                # if transition_duration > 0 and duration > transition_duration * 2:
                #     image_clip = image_clip.fadein(transition_duration).fadeout(transition_duration)
                
                # 如果有音频且分镜有时间信息，裁剪对应的音频片段
                if audio_clip and storyboard.get('start_time') is not None and storyboard.get('end_time') is not None:
                    start_time = storyboard['start_time']
                    end_time = storyboard['end_time']
                    
                    # 确保时间范围有效
                    if start_time < audio_clip.duration and end_time <= audio_clip.duration and start_time < end_time:
                        segment_audio = audio_clip.subclip(start_time, end_time)
                        # 调整图片片段时长以匹配音频
                        audio_duration = segment_audio.duration
                        image_clip = image_clip.set_duration(audio_duration)
                        image_clip = image_clip.set_audio(segment_audio)
                        
                        self.logger.info(f"分镜 {i}: 使用音频片段 {start_time:.1f}s - {end_time:.1f}s (时长: {audio_duration:.1f}s)")
                else:
                    self.logger.info(f"分镜 {i}: 使用默认时长 {duration:.1f}s")
                
                clips.append(image_clip)
                
            except Exception as e:
                self.logger.warning(f"创建分镜 {i} 的视频片段失败: {e}")
                continue
        
        return clips
    
    def _select_keyframe_for_storyboard(self, storyboard, keyframes, index):
        """为分镜选择对应的关键帧"""
        if not keyframes:
            self.logger.warning(f"分镜 {index}: 没有可用的关键帧")
            return None
            
        # 方法1: 根据场景ID选择（优先方法）
        scene_id = storyboard.get('scene_id')
        if scene_id:
            # 查找对应场景的关键帧
            scene_keyframes = [kf for kf in keyframes if f'scene_{scene_id}_' in os.path.basename(kf)]
            if scene_keyframes:
                # 选择该场景的第一个关键帧
                selected_keyframe = scene_keyframes[0]
                self.logger.info(f"分镜 {index}: 根据场景ID {scene_id} 选择关键帧 {os.path.basename(selected_keyframe)}")
                return selected_keyframe
            else:
                self.logger.warning(f"分镜 {index}: 未找到场景ID {scene_id} 对应的关键帧")
        
        # 方法2: 根据索引选择
        if index < len(keyframes):
            selected_keyframe = keyframes[index]
            self.logger.info(f"分镜 {index}: 根据索引选择关键帧 {os.path.basename(selected_keyframe)}")
            return selected_keyframe
        
        # 方法3: 循环选择
        selected_keyframe = keyframes[index % len(keyframes)]
        self.logger.info(f"分镜 {index}: 循环选择关键帧 {os.path.basename(selected_keyframe)} (索引: {index % len(keyframes)})")
        return selected_keyframe
    
    def _compose_final_video(self, project_name, video_clips, config):
        """合成最终视频"""
        if not video_clips:
            raise Exception("没有可用的视频片段")
        
        # 合成视频
        final_video = concatenate_videoclips(video_clips, method="compose")
        
        # 确保输出目录存在
        videos_dir = get_project_dir(project_name, 'videos')
        os.makedirs(videos_dir, exist_ok=True)
        
        # 输出路径
        output_path = os.path.join(videos_dir, 'smart_storyboard_video.mp4')
        
        # 写入视频文件
        final_video.write_videofile(
            output_path,
            fps=config['fps'],
            codec='libx264',
            audio_codec='aac'
        )
        
        # 清理资源
        final_video.close()
        for clip in video_clips:
            clip.close()
        
        return output_path
    
    def _save_generation_info(self, project_name, generation_info):
        """保存生成信息"""
        try:
            videos_dir = get_project_dir(project_name, 'videos')
            info_file = os.path.join(videos_dir, 'smart_video_generation_info.json')
            
            with open(info_file, 'w', encoding='utf-8') as f:
                json.dump(generation_info, f, ensure_ascii=False, indent=2)
                
        except Exception as e:
            self.logger.warning(f"保存生成信息失败: {e}")
    
    def _generate_single_storyboard_video(self, project_name, storyboard, index, keyframes, audio_file, config):
        """生成单个分镜的视频文件"""
        try:
            self.logger.info(f"开始生成分镜 {index} 视频，分镜数据: {storyboard}")
            
            # 获取原视频文件路径
            original_video_path = self._get_original_video_path(project_name)
            if not original_video_path or not os.path.exists(original_video_path):
                self.logger.warning(f"分镜 {index} 未找到原视频文件，回退到图片模式")
                return self._generate_single_storyboard_video_from_image(project_name, storyboard, index, keyframes, audio_file, config)
            
            self.logger.info(f"分镜 {index}: 使用原视频文件: {original_video_path}")
            
            # 获取分镜时间信息
            start_time = storyboard.get('start_time')
            end_time = storyboard.get('end_time')
            
            if start_time is None or end_time is None:
                self.logger.warning(f"分镜 {index} 缺少时间信息，回退到图片模式")
                return self._generate_single_storyboard_video_from_image(project_name, storyboard, index, keyframes, audio_file, config)
            
            # 从原视频裁剪片段
            from moviepy.editor import VideoFileClip
            original_clip = VideoFileClip(original_video_path)
            
            # 确保时间范围有效
            if start_time >= original_clip.duration or end_time > original_clip.duration or start_time >= end_time:
                self.logger.warning(f"分镜 {index} 时间范围无效 ({start_time:.1f}s - {end_time:.1f}s)，原视频时长: {original_clip.duration:.1f}s")
                original_clip.close()
                return self._generate_single_storyboard_video_from_image(project_name, storyboard, index, keyframes, audio_file, config)
            
            # 裁剪视频片段
            video_clip = original_clip.subclip(start_time, end_time)
            
            # 保持原视频尺寸，不进行强制调整
            # video_clip = video_clip.resize((config['width'], config['height']))  # 已注释，保持原尺寸
            
            # 不添加淡入淡出效果
            # transition_duration = min(config.get('transition_duration', 0.5), video_clip.duration / 4)
            # if transition_duration > 0:
            #     video_clip = video_clip.fadein(transition_duration).fadeout(transition_duration)
            
            self.logger.info(f"分镜 {index}: 成功裁剪视频片段 {start_time:.1f}s - {end_time:.1f}s (时长: {video_clip.duration:.1f}s)")
            
            # 注意：视频片段已经包含原始音频，通常不需要额外处理
            # 但如果需要替换音频，可以在这里处理
            
            # 确保输出目录存在
            videos_dir = get_project_dir(project_name, 'videos')
            os.makedirs(videos_dir, exist_ok=True)
            
            # 输出路径
            output_path = os.path.join(videos_dir, f'storyboard_{index}.mp4')
            
            # 写入视频文件
            self.logger.info(f"分镜 {index}: 开始写入视频文件到: {output_path}")
            self.logger.info(f"分镜 {index}: 写入前 video_clip 类型: {type(video_clip)}")
            self.logger.info(f"分镜 {index}: 写入前 video_clip 时长: {video_clip.duration:.1f}s")
            self.logger.info(f"分镜 {index}: 写入前 video_clip 尺寸: {video_clip.size}")
            
            try:
                video_clip.write_videofile(
                    output_path,
                    fps=config['fps'],
                    codec='libx264',
                    audio_codec='aac',
                    verbose=False,
                    logger=None
                )
                self.logger.info(f"分镜 {index}: 视频文件写入成功")
            except Exception as e:
                self.logger.error(f"分镜 {index}: 写入视频文件时出错: {e}")
                raise
            
            # 清理资源
            video_clip.close()
            original_clip.close()
            
            self.logger.info(f"分镜 {index} 视频生成完成: {output_path}")
            return output_path
            
        except Exception as e:
            self.logger.error(f"生成分镜 {index} 视频失败: {str(e)}")
            return None
    
    def _get_original_video_path(self, project_name):
        """获取原视频文件路径"""
        try:
            # 首先从项目设置文件中获取视频路径
            project_dir = get_project_dir(project_name, '')
            settings_file = os.path.join(project_dir, 'project_settings.json')
            
            if os.path.exists(settings_file):
                try:
                    with open(settings_file, 'r', encoding='utf-8') as f:
                        settings = json.load(f)
                    
                    # 检查videoPath字段
                    video_path = settings.get('videoPath')
                    if video_path and os.path.exists(video_path):
                        self.logger.info(f"从项目设置中找到原视频文件: {video_path}")
                        return video_path
                    
                    # 检查videos数组中的视频
                    videos = settings.get('videos', [])
                    if videos:
                        for video_info in videos:
                            video_path = video_info.get('videoPath')
                            if video_path and os.path.exists(video_path):
                                self.logger.info(f"从视频列表中找到原视频文件: {video_path}")
                                return video_path
                except Exception as e:
                    self.logger.warning(f"读取项目设置文件失败: {e}")
            
            # 回退方案：检查videos目录下的视频文件
            videos_dir = get_project_dir(project_name, 'videos')
            if os.path.exists(videos_dir):
                video_extensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv']
                for file in os.listdir(videos_dir):
                    # 跳过生成的分镜视频
                    if file.startswith('storyboard_') or file.startswith('smart_'):
                        continue
                    
                    if any(file.lower().endswith(ext) for ext in video_extensions):
                        video_path = os.path.join(videos_dir, file)
                        self.logger.info(f"在videos目录中找到原视频文件: {video_path}")
                        return video_path
            
            self.logger.warning(f"项目 {project_name} 未找到原视频文件")
            return None
        except Exception as e:
            self.logger.error(f"获取原视频路径时出错: {e}")
            return None
    
    def _generate_single_storyboard_video_from_image(self, project_name, storyboard, index, keyframes, audio_file, config):
        """从图片生成单个分镜视频（回退方法）"""
        try:
            self.logger.info(f"分镜 {index}: 使用图片模式生成视频")
            
            # 选择对应的关键帧图片
            image_path = self._select_keyframe_for_storyboard(storyboard, keyframes, index)
            
            if not image_path or not os.path.exists(image_path):
                self.logger.warning(f"分镜 {index} 未找到对应的关键帧图片")
                return None
            
            # 确定片段时长
            duration = storyboard.get('duration', config['default_duration'])
            if duration <= 0 or duration > 30:  # 限制最大时长为30秒
                duration = config['default_duration']
            
            # 创建图片片段
            image_clip = ImageClip(image_path, duration=duration)
            image_clip = image_clip.resize((config['width'], config['height']))
            
            # 不添加淡入淡出效果
            # transition_duration = config.get('transition_duration', 0.5)
            # if transition_duration > 0 and duration > transition_duration * 2:
            #     image_clip = image_clip.fadein(transition_duration).fadeout(transition_duration)
            
            # 处理音频
            if audio_file and os.path.exists(audio_file):
                try:
                    audio_clip = AudioFileClip(audio_file)
                    
                    # 如果分镜有时间信息，裁剪对应的音频片段
                    if storyboard.get('start_time') is not None and storyboard.get('end_time') is not None:
                        start_time = storyboard['start_time']
                        end_time = storyboard['end_time']
                        
                        # 确保时间范围有效
                        if start_time < audio_clip.duration and end_time <= audio_clip.duration and start_time < end_time:
                            segment_audio = audio_clip.subclip(start_time, end_time)
                            audio_duration = segment_audio.duration
                            image_clip = image_clip.set_duration(audio_duration)
                            image_clip = image_clip.set_audio(segment_audio)
                            
                            self.logger.info(f"分镜 {index}: 使用音频片段 {start_time:.1f}s - {end_time:.1f}s (时长: {audio_duration:.1f}s)")
                        else:
                            self.logger.warning(f"分镜 {index}: 音频时间范围无效")
                    
                except Exception as e:
                    self.logger.error(f"处理分镜 {index} 音频时出错: {e}")
            
            # 确保输出目录存在
            videos_dir = get_project_dir(project_name, 'videos')
            os.makedirs(videos_dir, exist_ok=True)
            
            # 输出路径
            output_path = os.path.join(videos_dir, f'storyboard_{index}.mp4')
            
            # 写入视频文件
            self.logger.info(f"分镜 {index}: 开始写入图片视频文件到: {output_path}")
            
            try:
                image_clip.write_videofile(
                    output_path,
                    fps=config['fps'],
                    codec='libx264',
                    audio_codec='aac' if image_clip.audio else None,
                    verbose=False,
                    logger=None
                )
                self.logger.info(f"分镜 {index}: 图片视频文件写入成功")
            except Exception as e:
                self.logger.error(f"分镜 {index}: 写入图片视频文件时出错: {e}")
                raise
            
            # 清理资源
            if hasattr(image_clip, 'audio') and image_clip.audio:
                image_clip.audio.close()
            image_clip.close()
            
            return output_path
            
        except Exception as e:
            self.logger.error(f"从图片生成分镜 {index} 视频失败: {str(e)}")
            return None
    
    def _save_individual_generation_info(self, project_name, generation_info):
        """保存单个分镜视频生成信息"""
        try:
            videos_dir = get_project_dir(project_name, 'videos')
            os.makedirs(videos_dir, exist_ok=True)
            
            info_file = os.path.join(videos_dir, 'individual_videos_info.json')
            with open(info_file, 'w', encoding='utf-8') as f:
                json.dump(generation_info, f, ensure_ascii=False, indent=2)
            
            self.logger.info(f"单个分镜视频生成信息已保存: {info_file}")
        except Exception as e:
            self.logger.warning(f"保存单个分镜视频生成信息失败: {e}")


# API接口函数
def generate_smart_storyboard_video():
    """生成智能分镜视频API（合并版本）"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        project_name = data.get('projectName')
        if not project_name:
            return jsonify({"error": "Project name is required"}), 400
        
        # 视频配置（可选）
        video_config = data.get('videoConfig', {})
        
        generator = SmartVideoGenerator()
        result = generator.generate_smart_storyboard_video(project_name, video_config)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        logging.error(f"Smart storyboard video generation API error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "智能分镜视频生成API调用失败"
        }), 500

def generate_individual_storyboard_videos():
    """生成单个分镜视频API"""
    try:
        print("[DEBUG] API函数被调用")
        logging.info("[DEBUG] API函数被调用")
        
        data = request.get_json()
        print(f"[DEBUG] 接收到的数据: {data}")
        logging.info(f"[DEBUG] 接收到的数据: {data}")
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        project_name = data.get('projectName')
        print(f"[DEBUG] 项目名称: {project_name}")
        logging.info(f"[DEBUG] 项目名称: {project_name}")
        
        if not project_name:
            return jsonify({"error": "Project name is required"}), 400
        
        # 视频配置（可选）
        video_config = data.get('videoConfig', {})
        print(f"[DEBUG] 视频配置: {video_config}")
        logging.info(f"[DEBUG] 视频配置: {video_config}")
        
        generator = SmartVideoGenerator()
        result = generator.generate_individual_storyboard_videos(project_name, video_config)
        
        print(f"[DEBUG] 生成结果: {result}")
        logging.info(f"[DEBUG] 生成结果: {result}")
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        logging.error(f"Individual storyboard videos generation API error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "单个分镜视频生成API调用失败"
        }), 500