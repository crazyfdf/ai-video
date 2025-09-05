import os
import cv2
import numpy as np
from scenedetect import VideoManager, SceneManager, FrameTimecode
from scenedetect.detectors import ContentDetector, ThresholdDetector
from scenedetect.stats_manager import StatsManager
from scenedetect.video_splitter import split_video_ffmpeg
from typing import List, Dict, Tuple, Optional
import logging
import json
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VideoSceneDetector:
    """视频场景检测器
    
    基于PySceneDetect实现，支持多种检测算法：
    - ContentDetector: 基于内容变化检测场景切换
    - ThresholdDetector: 基于亮度阈值检测淡入淡出
    """
    
    def __init__(self, threshold: float = 30.0, detector_type: str = 'content'):
        """
        初始化场景检测器
        
        Args:
            threshold: 场景切换阈值，值越小越敏感
            detector_type: 检测器类型 ('content' 或 'threshold')
        """
        self.threshold = threshold
        self.detector_type = detector_type
        self.stats_manager = None
    
    def detect_scenes(self, video_path: str, stats_file: Optional[str] = None, 
                     save_stats: bool = True) -> List[Dict]:
        """
        检测视频中的场景切换点
        
        Args:
            video_path: 视频文件路径
            stats_file: 统计文件路径，用于缓存帧指标以加速后续检测
            save_stats: 是否保存统计文件
            
        Returns:
            场景列表，每个场景包含开始时间、结束时间等信息
        """
        try:
            # 处理中文路径编码问题
            if isinstance(video_path, bytes):
                video_path = video_path.decode('utf-8')
            
            # 规范化路径
            video_path = os.path.normpath(video_path)
            
            # 验证文件存在
            logger.info(f"检查视频文件路径: {video_path}")
            logger.info(f"路径类型: {type(video_path)}")
            logger.info(f"路径编码: {video_path.encode('utf-8') if isinstance(video_path, str) else 'Not a string'}")
            
            if not os.path.exists(video_path):
                logger.error(f"视频文件不存在: {video_path}")
                # 尝试列出父目录内容
                parent_dir = os.path.dirname(video_path)
                if os.path.exists(parent_dir):
                    files = os.listdir(parent_dir)
                    logger.error(f"父目录 {parent_dir} 内容: {files}")
                else:
                    logger.error(f"父目录也不存在: {parent_dir}")
                raise FileNotFoundError(f"视频文件不存在: {video_path}")
            
            logger.info(f"视频文件存在，继续处理: {video_path}")
            
            # 创建视频管理器
            video_manager = VideoManager([video_path])
            scene_manager = SceneManager()
            
            # 创建统计管理器（如果需要）
            if stats_file or save_stats:
                if not stats_file:
                    # 自动生成统计文件名
                    base_name = os.path.splitext(os.path.basename(video_path))[0]
                    stats_file = f"{base_name}.stats.csv"
                
                self.stats_manager = StatsManager()
                
                # 尝试加载现有统计文件
                if os.path.exists(stats_file):
                    logger.info(f"加载统计文件: {stats_file}")
                    self.stats_manager.load_from_csv(stats_file)
            
            # 根据检测器类型添加相应的检测器
            if self.detector_type == 'content':
                # 内容检测器：用于检测视频场景之间的快速切换
                detector = ContentDetector(threshold=self.threshold)
                logger.info(f"使用内容检测器，阈值: {self.threshold}")
            elif self.detector_type == 'threshold':
                # 阈值检测器：用于检测淡入淡出效果
                detector = ThresholdDetector(threshold=self.threshold)
                logger.info(f"使用阈值检测器，阈值: {self.threshold}")
            else:
                raise ValueError(f"不支持的检测器类型: {self.detector_type}")
            
            scene_manager.add_detector(detector)
            
            # 开始检测
            video_manager.start()
            
            # 新版本PySceneDetect不再支持stats_manager参数
            try:
                # 尝试使用旧版本API
                scene_manager.detect_scenes(frame_source=video_manager, 
                                          stats_manager=self.stats_manager)
            except TypeError:
                # 使用新版本API
                scene_manager.detect_scenes(frame_source=video_manager)
            
            # 获取场景列表
            scene_list = scene_manager.get_scene_list()
            
            # 保存统计文件
            if self.stats_manager and save_stats and stats_file:
                logger.info(f"保存统计文件: {stats_file}")
                self.stats_manager.save_to_csv(stats_file)
            
            scenes = []
            for i, (start_time, end_time) in enumerate(scene_list):
                scene_info = {
                    'scene_id': i + 1,
                    'start_time': start_time.get_seconds(),
                    'end_time': end_time.get_seconds(),
                    'duration': (end_time - start_time).get_seconds(),
                    'start_frame': start_time.get_frames(),
                    'end_frame': end_time.get_frames(),
                    'start_timecode': str(start_time),
                    'end_timecode': str(end_time)
                }
                scenes.append(scene_info)
            
            video_manager.release()
            
            logger.info(f"使用{self.detector_type}检测器检测到 {len(scenes)} 个场景")
            return scenes
            
        except Exception as e:
            logger.error(f"场景检测失败: {str(e)}")
            raise
    
    def detect_and_save_scenes(self, video_path: str, output_dir: str, 
                              save_images: bool = True, split_video: bool = False,
                              stats_file: Optional[str] = None) -> Dict:
        """
        检测场景并保存相关文件（类似命令行 scenedetect 功能）
        
        Args:
            video_path: 视频文件路径
            output_dir: 输出目录
            save_images: 是否保存每个场景的图像
            split_video: 是否分割视频
            stats_file: 统计文件路径
            
        Returns:
            包含场景信息和文件路径的字典
        """
        try:
            # 确保输出目录存在
            os.makedirs(output_dir, exist_ok=True)
            
            # 检测场景
            scenes = self.detect_scenes(video_path, stats_file, save_stats=True)
            
            # 生成场景列表CSV文件
            csv_file = os.path.join(output_dir, f"{os.path.splitext(os.path.basename(video_path))[0]}-Scenes.csv")
            self._save_scenes_csv(scenes, csv_file)
            
            result = {
                'video_path': video_path,
                'scenes': scenes,
                'csv_file': csv_file,
                'output_dir': output_dir,
                'total_scenes': len(scenes)
            }
            
            # 保存场景图像
            if save_images:
                image_files = self._save_scene_images(video_path, scenes, output_dir)
                result['scene_images'] = image_files
            
            # 分割视频
            if split_video:
                video_files = self.split_video_by_scenes(video_path, scenes, output_dir)
                result['split_videos'] = video_files
            
            logger.info(f"场景检测完成，输出目录: {output_dir}")
            return result
            
        except Exception as e:
            logger.error(f"场景检测和保存失败: {str(e)}")
            raise
    
    def _save_scenes_csv(self, scenes: List[Dict], csv_file: str):
        """保存场景列表到CSV文件"""
        import csv
        
        with open(csv_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            
            # 写入时间码列表
            timecodes = [scene['start_timecode'] for scene in scenes]
            timecodes.append(scenes[-1]['end_timecode'] if scenes else '00:00.0')
            writer.writerow(['Timecode List:'] + timecodes)
            writer.writerow([])  # 空行
            
            # 写入表头
            headers = [
                'Scene Number', 'Start Frame', 'Start Timecode', 'Start Time (seconds)',
                'End Frame', 'End Timecode', 'End Time (seconds)',
                'Length (frames)', 'Length (timecode)', 'Length (seconds)'
            ]
            writer.writerow(headers)
            
            # 写入场景数据
            for scene in scenes:
                duration_frames = scene['end_frame'] - scene['start_frame']
                duration_timecode = f"{scene['duration']:.3f}s"
                
                row = [
                    scene['scene_id'],
                    scene['start_frame'],
                    scene['start_timecode'],
                    f"{scene['start_time']:.3f}",
                    scene['end_frame'],
                    scene['end_timecode'],
                    f"{scene['end_time']:.3f}",
                    duration_frames,
                    duration_timecode,
                    f"{scene['duration']:.3f}"
                ]
                writer.writerow(row)
        
        logger.info(f"场景列表已保存到: {csv_file}")
    
    def _save_scene_images(self, video_path: str, scenes: List[Dict], output_dir: str) -> List[str]:
        """为每个场景保存代表性图像"""
        try:
            # 处理中文路径编码问题
            if isinstance(video_path, bytes):
                video_path = video_path.decode('utf-8')
            if isinstance(output_dir, bytes):
                output_dir = output_dir.decode('utf-8')
            
            # 规范化路径
            video_path = os.path.normpath(video_path)
            output_dir = os.path.normpath(output_dir)
            
            cap = cv2.VideoCapture(video_path)
            fps = cap.get(cv2.CAP_PROP_FPS)
            image_files = []
            
            for scene in scenes:
                scene_id = scene['scene_id']
                start_time = scene['start_time']
                duration = scene['duration']
                
                # 选择场景中间的帧作为代表图像
                mid_time = start_time + duration / 2
                mid_frame = int(mid_time * fps)
                
                # 定位到目标帧
                cap.set(cv2.CAP_PROP_POS_FRAMES, mid_frame)
                ret, frame = cap.read()
                
                if ret:
                    # 保存图像
                    base_name = os.path.splitext(os.path.basename(video_path))[0]
                    image_filename = f"{base_name}-Scene-{scene_id:03d}.jpg"
                    image_path = os.path.join(output_dir, image_filename)
                    
                    # 使用cv2.imencode和文件写入来处理中文路径
                    success, encoded_img = cv2.imencode('.jpg', frame)
                    if success:
                        with open(image_path, 'wb') as f:
                            f.write(encoded_img.tobytes())
                        image_files.append(image_path)
                        logger.info(f"保存场景 {scene_id} 图像: {image_filename}")
                    else:
                        logger.error(f"编码场景 {scene_id} 图像失败")
            
            cap.release()
            return image_files
            
        except Exception as e:
            logger.error(f"保存场景图像失败: {str(e)}")
            raise
    
    def extract_keyframes(self, video_path: str, scenes: List[Dict], output_dir: str) -> List[Dict]:
        """
        从每个场景中提取关键帧
        
        Args:
            video_path: 视频文件路径
            scenes: 场景列表
            output_dir: 输出目录
            
        Returns:
            关键帧信息列表
        """
        try:
            # 处理中文路径编码问题
            if isinstance(video_path, bytes):
                video_path = video_path.decode('utf-8')
            if isinstance(output_dir, bytes):
                output_dir = output_dir.decode('utf-8')
            
            # 规范化路径
            video_path = os.path.normpath(video_path)
            output_dir = os.path.normpath(output_dir)
            
            # 确保输出目录存在
            os.makedirs(output_dir, exist_ok=True)
            
            cap = cv2.VideoCapture(video_path)
            fps = cap.get(cv2.CAP_PROP_FPS)
            
            keyframes = []
            
            for scene in scenes:
                scene_id = scene['scene_id']
                start_time = scene['start_time']
                duration = scene['duration']
                
                # 根据场景时长决定提取的关键帧数量
                if duration < 2:  # 短场景提取3帧
                    num_keyframes = 3
                elif duration < 5:  # 中等场景提取4帧
                    num_keyframes = 4
                else:  # 长场景提取5帧
                    num_keyframes = 5
                
                # 在场景时间范围内均匀分布关键帧
                for i in range(num_keyframes):
                    # 计算关键帧时间点
                    if num_keyframes == 1:
                        keyframe_time = start_time + duration / 2
                    else:
                        keyframe_time = start_time + (duration * i / (num_keyframes - 1))
                    
                    keyframe_frame = int(keyframe_time * fps)
                    
                    # 定位到目标帧
                    cap.set(cv2.CAP_PROP_POS_FRAMES, keyframe_frame)
                    ret, frame = cap.read()
                    
                    if ret:
                        # 保存关键帧
                        keyframe_filename = f"scene_{scene_id}_keyframe_{i+1}.jpg"
                        keyframe_path = os.path.join(output_dir, keyframe_filename)
                        
                        # 使用cv2.imencode和文件写入来处理中文路径
                        success, encoded_img = cv2.imencode('.jpg', frame)
                        if success:
                            with open(keyframe_path, 'wb') as f:
                                f.write(encoded_img.tobytes())
                            
                            keyframe_info = {
                                'scene_id': scene_id,
                                'keyframe_index': i + 1,
                                'timestamp': keyframe_time,
                                'frame_number': keyframe_frame,
                                'filename': keyframe_filename,
                                'path': keyframe_path
                            }
                            keyframes.append(keyframe_info)
                            
                            logger.info(f"提取场景 {scene_id} 关键帧 {i+1}: {keyframe_filename}")
                        else:
                            logger.error(f"编码场景 {scene_id} 关键帧 {i+1} 失败")
            
            cap.release()
            return keyframes
            
        except Exception as e:
            logger.error(f"关键帧提取失败: {str(e)}")
            raise
    
    def split_video_by_scenes(self, video_path: str, scenes: List[Dict], output_dir: str) -> List[str]:
        """
        按场景分割视频
        
        Args:
            video_path: 视频文件路径
            scenes: 场景列表
            output_dir: 输出目录
            
        Returns:
            分割后的视频文件路径列表
        """
        try:
            # 确保输出目录存在
            os.makedirs(output_dir, exist_ok=True)
            
            # 构建场景时间列表
            scene_list = []
            for scene in scenes:
                start_time = scene['start_time']
                end_time = scene['end_time']
                scene_list.append((start_time, end_time))
            
            # 使用ffmpeg分割视频
            output_files = []
            for i, (start_time, end_time) in enumerate(scene_list):
                output_filename = f"scene_{i+1}.mp4"
                output_path = os.path.join(output_dir, output_filename)
                
                # 使用moviepy进行视频分割
                from moviepy.editor import VideoFileClip
                
                with VideoFileClip(video_path) as video:
                    scene_clip = video.subclip(start_time, end_time)
                    scene_clip.write_videofile(output_path, verbose=False, logger=None)
                
                output_files.append(output_path)
                logger.info(f"分割场景 {i+1}: {output_filename}")
            
            return output_files
            
        except Exception as e:
            logger.error(f"视频分割失败: {str(e)}")
            raise
    
    def analyze_video_scenes(self, video_path: str, project_name: str, output_base_dir: str) -> Dict:
        """
        完整的视频场景分析流程
        
        Args:
            video_path: 视频文件路径
            project_name: 项目名称
            output_base_dir: 输出基础目录
            
        Returns:
            分析结果字典
        """
        try:
            # 创建项目输出目录
            project_output_dir = os.path.join(output_base_dir, project_name, 'video_analysis')
            keyframes_dir = os.path.join(project_output_dir, 'keyframes')
            scenes_dir = os.path.join(project_output_dir, 'scenes')
            
            os.makedirs(project_output_dir, exist_ok=True)
            os.makedirs(keyframes_dir, exist_ok=True)
            os.makedirs(scenes_dir, exist_ok=True)
            
            # 1. 检测场景
            logger.info("开始场景检测...")
            scenes = self.detect_scenes(video_path)
            
            # 2. 提取关键帧
            logger.info("开始提取关键帧...")
            keyframes = self.extract_keyframes(video_path, scenes, keyframes_dir)
            
            # 3. 分割视频（可选）
            # split_videos = self.split_video_by_scenes(video_path, scenes, scenes_dir)
            
            # 构建分析结果
            analysis_result = {
                'video_path': video_path,
                'project_name': project_name,
                'total_scenes': len(scenes),
                'scenes': scenes,
                'keyframes': keyframes,
                'output_directories': {
                    'base': project_output_dir,
                    'keyframes': keyframes_dir,
                    'scenes': scenes_dir
                },
                'analysis_timestamp': __import__('datetime').datetime.now().isoformat()
            }
            
            # 保存分析结果
            import json
            result_file = os.path.join(project_output_dir, 'scene_analysis.json')
            with open(result_file, 'w', encoding='utf-8') as f:
                json.dump(analysis_result, f, ensure_ascii=False, indent=2)
            
            logger.info(f"场景分析完成，结果保存到: {result_file}")
            return analysis_result
            
        except Exception as e:
            logger.error(f"视频场景分析失败: {str(e)}")
            raise

def create_scene_detector(threshold: float = 30.0, detector_type: str = 'content') -> VideoSceneDetector:
    """
    创建场景检测器实例
    
    Args:
        threshold: 场景切换阈值
            - 对于ContentDetector: 值越小越敏感，推荐范围 15.0-50.0
            - 对于ThresholdDetector: 黑电平阈值，推荐范围 8.0-16.0
        detector_type: 检测器类型
            - 'content': 基于内容变化检测，适用于快速剪切的视频
            - 'threshold': 基于亮度阈值检测，适用于有淡入淡出效果的视频
        
    Returns:
        VideoSceneDetector实例
    """
    return VideoSceneDetector(threshold=threshold, detector_type=detector_type)

def detect_video_scenes_cli(video_path: str, output_dir: str = None, 
                           threshold: float = 30.0, detector_type: str = 'content',
                           save_images: bool = True, split_video: bool = False,
                           stats_file: str = None) -> Dict:
    """
    命令行风格的场景检测函数（类似 scenedetect 命令）
    
    Args:
        video_path: 输入视频文件路径
        output_dir: 输出目录，默认为视频文件所在目录
        threshold: 检测阈值
        detector_type: 检测器类型 ('content' 或 'threshold')
        save_images: 是否保存场景图像
        split_video: 是否分割视频
        stats_file: 统计文件路径
        
    Returns:
        检测结果字典
        
    Example:
        # 基本用法
        result = detect_video_scenes_cli('demo.mp4')
        
        # 高级用法
        result = detect_video_scenes_cli(
            video_path='demo.mp4',
            output_dir='./output',
            threshold=25.0,
            detector_type='content',
            save_images=True,
            split_video=True
        )
    """
    try:
        # 添加详细的文件检查日志
        logger.info(f"CLI函数接收到的视频路径: {video_path}")
        logger.info(f"路径类型: {type(video_path)}")
        
        # 处理中文路径编码问题
        if isinstance(video_path, bytes):
            video_path = video_path.decode('utf-8')
        
        # 规范化路径
        video_path = os.path.normpath(video_path)
        logger.info(f"规范化后的路径: {video_path}")
        
        # 验证文件存在
        if not os.path.exists(video_path):
            logger.error(f"CLI函数中视频文件不存在: {video_path}")
            # 尝试列出父目录内容
            parent_dir = os.path.dirname(video_path)
            if os.path.exists(parent_dir):
                files = os.listdir(parent_dir)
                logger.error(f"父目录 {parent_dir} 内容: {files}")
            else:
                logger.error(f"父目录也不存在: {parent_dir}")
            raise FileNotFoundError(f"视频文件不存在: {video_path}")
        
        logger.info(f"CLI函数中视频文件存在，继续处理: {video_path}")
        
        # 设置默认输出目录
        if output_dir is None:
            output_dir = os.path.dirname(os.path.abspath(video_path))
        
        # 创建检测器
        detector = create_scene_detector(threshold=threshold, detector_type=detector_type)
        
        # 执行检测
        result = detector.detect_and_save_scenes(
            video_path=video_path,
            output_dir=output_dir,
            save_images=save_images,
            split_video=split_video,
            stats_file=stats_file
        )
        
        logger.info(f"场景检测完成: {result['total_scenes']} 个场景")
        return result
        
    except Exception as e:
        logger.error(f"CLI场景检测失败: {str(e)}")
        raise