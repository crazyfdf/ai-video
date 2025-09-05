import json
import logging
import os
import subprocess
import tempfile
from datetime import datetime
from flask import jsonify, request
from backend.util.project_file_manager import get_project_dir
from backend.util.file import save_file
from backend.video.scene_detection import VideoSceneDetector, create_scene_detector, detect_video_scenes_cli
from backend.audio.transcription import AudioTranscriber
from backend.audio.audio_effects import AudioEffectsExtractor
from backend.ai.video_analysis import VideoFrameAnalyzer
from backend.llm.llm_service import get_llm_service

class VideoProcessingHandler:
    """视频处理器：场景检测和音频转录"""
    
    def __init__(self, llm_service=None, detector_type='content'):
        self.logger = logging.getLogger(__name__)
        self.scene_detector = create_scene_detector(detector_type=detector_type)
        self.audio_transcriber = AudioTranscriber()
        self.audio_effects_extractor = AudioEffectsExtractor()
        self.llm_service = llm_service or get_llm_service()
        self.frame_analyzer = VideoFrameAnalyzer(self.llm_service)
    
    def detect_scenes(self, video_path, threshold=30.0, detector_type='content', 
                     output_dir=None, save_images=True, split_video=False):
        """使用PySceneDetect检测视频场景"""
        try:
            # 使用CLI风格的场景检测函数
            result = detect_video_scenes_cli(
                video_path=video_path,
                output_dir=output_dir,
                threshold=threshold,
                detector_type=detector_type,
                save_images=save_images,
                split_video=split_video
            )
            
            return {
                "success": True,
                "scenes": result.get('scenes', []),
                "total_scenes": result.get('total_scenes', 0),
                "output_files": result.get('output_files', {}),
                "message": f"检测到 {result.get('total_scenes', 0)} 个场景"
            }
                
        except Exception as e:
            import traceback
            error_traceback = traceback.format_exc()
            self.logger.error(f"Scene detection failed: {str(e)}")
            self.logger.error(f"Full traceback: {error_traceback}")
            print(f"ERROR: Scene detection failed: {str(e)}")
            print(f"TRACEBACK: {error_traceback}")
            return {
                "success": False,
                "error": str(e),
                "traceback": error_traceback,
                "message": "场景检测失败"
            }
    
    def extract_keyframes(self, video_path, scenes, project_name):
        """从每个场景提取关键帧"""
        try:
            # 创建输出目录
            output_dir = get_project_dir(project_name, 'video_keyframes')
            
            # 使用场景检测器提取关键帧
            keyframes = self.scene_detector.extract_keyframes(video_path, scenes, output_dir)
            
            return {
                "success": True,
                "keyframes": keyframes,
                "message": f"提取了 {len(keyframes)} 个关键帧"
            }
            
        except Exception as e:
            self.logger.error(f"Keyframe extraction failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "关键帧提取失败"
            }
    
    def transcribe_audio(self, video_path, model="base", language=None):
        """使用Whisper转录视频音频"""
        try:
            # 设置转录器模型
            self.audio_transcriber.model_name = model
            
            # 转录视频音频
            result = self.audio_transcriber.transcribe_video_audio(video_path, language)
            
            return result
            
        except Exception as e:
            self.logger.error(f"Audio transcription failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "音频转录失败"
            }
    
    def analyze_video_frames(self, project_name, scene_data=None):
        """
        分析视频关键帧，生成画面描述和主体识别
        
        Args:
            project_name: 项目名称
            scene_data: 场景数据（可选，如果不提供则从文件读取）
            
        Returns:
            分析结果
        """
        try:
            project_dir = get_project_dir(project_name)
            keyframes_dir = os.path.join(project_dir, "keyframes")
            
            if not os.path.exists(keyframes_dir):
                return {
                    "success": False,
                    "error": "Keyframes directory not found",
                    "message": "关键帧目录不存在，请先进行场景检测"
                }
            
            # 如果没有提供场景数据，尝试从文件读取
            if scene_data is None:
                scenes_file = os.path.join(project_dir, "scenes.json")
                if os.path.exists(scenes_file):
                    with open(scenes_file, 'r', encoding='utf-8') as f:
                        scene_data = json.load(f)
                else:
                    return {
                        "success": False,
                        "error": "Scene data not found",
                        "message": "场景数据不存在，请先进行场景检测"
                    }
            
            analysis_results = {
                "project_name": project_name,
                "total_scenes": len(scene_data.get("scenes", [])),
                "scenes": [],
                "analysis_timestamp": datetime.now().isoformat()
            }
            
            # 分析每个场景的关键帧
            for scene in scene_data.get("scenes", []):
                scene_id = scene.get("scene_id", 0)
                keyframes = scene.get("keyframes", [])
                
                if keyframes:
                    self.logger.info(f"Analyzing {len(keyframes)} keyframes for scene {scene_id}")
                    
                    # 构建关键帧文件路径
                    frame_paths = []
                    for frame_info in keyframes:
                        frame_filename = frame_info.get("filename")
                        if frame_filename:
                            frame_path = os.path.join(keyframes_dir, frame_filename)
                            if os.path.exists(frame_path):
                                frame_paths.append(frame_path)
                    
                    if frame_paths:
                        # 分析场景帧
                        scene_analysis = self.frame_analyzer.analyze_scene_frames(frame_paths, scene_id)
                        
                        if scene_analysis.get("success"):
                            scene_data = scene_analysis["scene_analysis"]
                            
                            # 使用LLM生成更详细的场景描述
                            if scene_data.get("frames"):
                                frame_analyses = [frame["analysis"] for frame in scene_data["frames"]]
                                scene_context = {
                                    "scene_id": scene_id,
                                    "duration": scene.get("duration", 0)
                                }
                                enhanced_description = self.llm_service.generate_scene_description(
                                    frame_analyses, scene_context
                                )
                                scene_data["enhanced_description"] = enhanced_description
                            
                            analysis_results["scenes"].append(scene_data)
                        else:
                            self.logger.error(f"Scene {scene_id} analysis failed: {scene_analysis.get('error')}")
            
            # 保存分析结果
            analysis_file = os.path.join(project_dir, "frame_analysis.json")
            with open(analysis_file, 'w', encoding='utf-8') as f:
                json.dump(analysis_results, f, ensure_ascii=False, indent=2)
            
            self.logger.info(f"Frame analysis completed for {len(analysis_results['scenes'])} scenes")
            
            return {
                "success": True,
                "analysis_results": analysis_results,
                "analysis_file": analysis_file,
                "message": f"关键帧分析完成，共分析 {len(analysis_results['scenes'])} 个场景"
            }
            
        except Exception as e:
            self.logger.error(f"Video frame analysis failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "视频帧分析失败"
            }
    
    def generate_storyboard_from_analysis(self, project_name, analysis_data=None, transcription_data=None):
        """
        基于视频分析结果生成分镜脚本
        
        Args:
            project_name: 项目名称
            analysis_data: 视频分析数据（可选，如果不提供则从文件读取）
            transcription_data: 音频转录数据（可选）
            
        Returns:
            分镜脚本生成结果
        """
        try:
            project_dir = get_project_dir(project_name)
            
            # 如果没有提供分析数据，尝试从文件读取
            if analysis_data is None:
                analysis_file = os.path.join(project_dir, "frame_analysis.json")
                if os.path.exists(analysis_file):
                    with open(analysis_file, 'r', encoding='utf-8') as f:
                        analysis_data = json.load(f)
                else:
                    return {
                        "success": False,
                        "error": "Analysis data not found",
                        "message": "视频分析数据不存在，请先进行视频分析"
                    }
            
            # 提取场景描述
            scene_descriptions = []
            for scene in analysis_data.get("scenes", []):
                description = scene.get("enhanced_description") or scene.get("scene_summary", "")
                scene_descriptions.append(description)
            
            # 获取音频转录（如果有）
            audio_text = ""
            if transcription_data:
                if isinstance(transcription_data, dict) and "segments" in transcription_data:
                    audio_text = " ".join([seg.get("text", "") for seg in transcription_data["segments"]])
                elif isinstance(transcription_data, str):
                    audio_text = transcription_data
            
            # 生成分镜脚本
            storyboard_scripts = self.llm_service.generate_storyboard_script(
                scene_descriptions, audio_text
            )
            
            # 构建完整的分镜数据
            storyboard_data = {
                "project_name": project_name,
                "total_scenes": len(storyboard_scripts),
                "scripts": storyboard_scripts,
                "generation_timestamp": datetime.now().isoformat(),
                "source_analysis": analysis_data.get("analysis_timestamp"),
                "audio_included": bool(audio_text)
            }
            
            # 保存分镜脚本
            storyboard_dir = os.path.join(project_dir, "storyboard")
            os.makedirs(storyboard_dir, exist_ok=True)
            
            for i, script in enumerate(storyboard_scripts):
                script_file = os.path.join(storyboard_dir, f"storyboard_{i}.json")
                script_data = {
                    "index": i,
                    "scene_id": script.get("scene_index", i) + 1,
                    "script": script,
                    "generated_from_video": True,
                    "generation_timestamp": datetime.now().isoformat()
                }
                
                with open(script_file, 'w', encoding='utf-8') as f:
                    json.dump(script_data, f, ensure_ascii=False, indent=2)
            
            # 保存总体分镜数据
            storyboard_summary_file = os.path.join(project_dir, "storyboard_summary.json")
            with open(storyboard_summary_file, 'w', encoding='utf-8') as f:
                json.dump(storyboard_data, f, ensure_ascii=False, indent=2)
            
            self.logger.info(f"Storyboard generation completed for {len(storyboard_scripts)} scenes")
            
            return {
                "success": True,
                "storyboard_data": storyboard_data,
                "storyboard_files": [f"storyboard_{i}.json" for i in range(len(storyboard_scripts))],
                "summary_file": "storyboard_summary.json",
                "message": f"分镜脚本生成完成，共生成 {len(storyboard_scripts)} 个场景的分镜"
            }
            
        except Exception as e:
            self.logger.error(f"Storyboard generation failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "分镜脚本生成失败"
            }
    
    def process_video_complete(self, project_name, video_path):
        """完整的视频处理流程"""
        try:
            # 使用场景检测器进行完整分析
            self.logger.info("开始完整视频分析...")
            output_base_dir = get_project_dir(project_name, '')
            
            analysis_result = self.scene_detector.analyze_video_scenes(
                video_path, project_name, output_base_dir
            )
            
            # 保存分析结果到项目目录
            self._save_video_processing_result(project_name, analysis_result)
            
            return {
                "success": True,
                "analysis": analysis_result,
                "message": "视频分析完成"
            }
            
        except Exception as e:
            self.logger.error(f"Video processing failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "视频处理失败"
            }
    
    def _parse_scene_csv(self, csv_file):
        """解析PySceneDetect输出的CSV文件"""
        scenes = []
        
        try:
            import csv
            with open(csv_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    scenes.append({
                        "scene_id": len(scenes),
                        "start_time": float(row['Start Time (seconds)']),
                        "end_time": float(row['End Time (seconds)']),
                        "length": float(row['Length (seconds)'])
                    })
        except Exception as e:
            self.logger.error(f"Failed to parse scene CSV: {str(e)}")
            
        return scenes
    
    def _extract_frame(self, video_path, time_seconds, scene_id, frame_id):
        """使用FFmpeg提取单个帧"""
        try:
            # 创建输出文件名
            output_filename = f"scene_{scene_id}_frame_{frame_id}.jpg"
            output_path = os.path.join(tempfile.gettempdir(), output_filename)
            
            # 构建FFmpeg命令
            cmd = [
                "ffmpeg",
                "-i", video_path,
                "-ss", str(time_seconds),
                "-vframes", "1",
                "-y",  # 覆盖输出文件
                output_path
            ]
            
            # 执行命令
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0 and os.path.exists(output_path):
                return output_path
            else:
                self.logger.error(f"FFmpeg frame extraction failed: {result.stderr}")
                return None
                
        except Exception as e:
            self.logger.error(f"Frame extraction error: {str(e)}")
            return None
    
    def _save_video_processing_result(self, project_name, results):
        """保存视频处理结果"""
        try:
            project_dir = get_project_dir(project_name)
            
            # 保存完整结果
            result_file = os.path.join(project_dir, "video_processing_result.json")
            save_file(result_file, json.dumps(results, ensure_ascii=False, indent=2))
            
            # 分别保存各部分结果
            if 'scenes' in results:
                scenes_file = os.path.join(project_dir, "video_scenes.json")
                save_file(scenes_file, json.dumps(results['scenes'], ensure_ascii=False, indent=2))
            
            if 'transcription' in results:
                transcription_file = os.path.join(project_dir, "video_transcription.json")
                save_file(transcription_file, json.dumps(results['transcription'], ensure_ascii=False, indent=2))
            
            if 'keyframes' in results:
                keyframes_file = os.path.join(project_dir, "video_keyframes.json")
                save_file(keyframes_file, json.dumps(results['keyframes'], ensure_ascii=False, indent=2))
            
        except Exception as e:
            self.logger.error(f"Failed to save video processing result: {str(e)}")
            raise


# API接口函数
def process_video_scenes():
    """视频场景检测API"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        project_name = data.get('projectName')
        video_path = data.get('videoPath')
        threshold = data.get('threshold', 30.0)
        detector_type = data.get('detectorType', 'content')  # 'content' 或 'threshold'
        save_images = data.get('saveImages', True)
        split_video = data.get('splitVideo', False)
        
        if not project_name or not video_path:
            return jsonify({"error": "Project name and video path are required"}), 400
        
        # 设置输出目录为项目目录
        output_dir = get_project_dir(project_name, 'video_scenes')
        
        handler = VideoProcessingHandler(detector_type=detector_type)
        result = handler.detect_scenes(
            video_path=video_path, 
            threshold=threshold,
            detector_type=detector_type,
            output_dir=output_dir,
            save_images=save_images,
            split_video=split_video
        )
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        logging.error(f"Video scene detection API error: {str(e)}")
        logging.error(f"Full traceback: {error_traceback}")
        print(f"ERROR: Video scene detection failed: {str(e)}")
        print(f"TRACEBACK: {error_traceback}")
        return jsonify({
            "success": False,
            "error": str(e),
            "traceback": error_traceback,
            "message": "场景检测API调用失败"
        }), 500


def extract_video_keyframes():
    """提取视频关键帧API"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided",
                "message": "请提供项目名称和视频路径"
            }), 400
        
        project_name = data.get('projectName')
        video_path = data.get('videoPath')
        
        if not project_name or not video_path:
            return jsonify({
                "success": False,
                "error": "Missing required parameters",
                "message": "项目名称和视频路径不能为空"
            }), 400
        
        # 检查视频文件是否存在
        if not os.path.exists(video_path):
            return jsonify({
                "success": False,
                "error": "Video file not found",
                "message": f"视频文件不存在: {video_path}"
            }), 404
        
        # 首先检查是否已有场景数据
        scenes_file = os.path.join(get_project_dir(project_name, 'video_analysis'), 'scenes.json')
        scenes = []
        
        if os.path.exists(scenes_file):
            try:
                with open(scenes_file, 'r', encoding='utf-8') as f:
                    scenes_data = json.load(f)
                    scenes = scenes_data.get('scenes', [])
                logging.info(f"Loaded {len(scenes)} scenes from existing file")
            except Exception as e:
                logging.warning(f"Failed to load existing scenes: {e}")
        
        # 如果没有场景数据，先进行场景检测
        if not scenes:
            handler = VideoProcessingHandler()
            scene_result = handler.detect_scenes(
                video_path=video_path,
                output_dir=get_project_dir(project_name, 'video_analysis'),
                save_images=False,
                split_video=False
            )
            
            if not scene_result['success']:
                return jsonify({
                    "success": False,
                    "error": scene_result.get('error', 'Scene detection failed'),
                    "message": "场景检测失败，无法提取关键帧"
                }), 500
            
            scenes = scene_result['scenes']
        
        # 提取关键帧
        handler = VideoProcessingHandler()
        result = handler.extract_keyframes(video_path, scenes, project_name)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        logging.error(f"Extract keyframes API error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "关键帧提取API调用失败"
        }), 500


def analyze_video_frames():
    """视频关键帧AI分析API"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        project_name = data.get('projectName')
        if not project_name:
            return jsonify({"error": "Project name is required"}), 400
        
        # 可选参数
        scene_data = data.get('sceneData')  # 场景数据
        
        handler = VideoProcessingHandler()
        result = handler.analyze_video_frames(project_name, scene_data)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        logging.error(f"Video frame analysis API error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "视频帧分析API调用失败"
        }), 500


def generate_storyboard_from_video():
    """基于视频分析生成分镜脚本API"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        project_name = data.get('projectName')
        if not project_name:
            return jsonify({"error": "Project name is required"}), 400
        
        # 可选参数
        analysis_data = data.get('analysisData')  # 视频分析数据
        transcription_data = data.get('transcriptionData')  # 音频转录数据
        
        handler = VideoProcessingHandler()
        result = handler.generate_storyboard_from_analysis(
            project_name, analysis_data, transcription_data
        )
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        logging.error(f"Storyboard generation API error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "分镜脚本生成API调用失败"
        }), 500


def transcribe_video_audio():
    """视频音频转录API"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        project_name = data.get('projectName')
        video_path = data.get('videoPath')
        model = data.get('model', 'base')
        language = data.get('language')  # 可选的语言参数
        
        if not project_name or not video_path:
            return jsonify({"error": "Project name and video path are required"}), 400
        
        handler = VideoProcessingHandler()
        result = handler.transcribe_audio(video_path, model, language)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        logging.error(f"Video transcription API error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "音频转录API调用失败"
        }), 500


def process_video_complete():
    """完整视频处理API"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        project_name = data.get('projectName')
        video_path = data.get('videoPath')
        
        if not project_name or not video_path:
            return jsonify({"error": "Project name and video path are required"}), 400
        
        handler = VideoProcessingHandler()
        result = handler.process_video_complete(project_name, video_path)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        logging.error(f"Complete video processing API error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "完整视频处理失败"
        }), 500

def extract_audio_effects():
    """提取音效API"""
    try:
        data = request.get_json()
        project_name = data.get('projectName')
        video_path = data.get('videoPath')
        
        if not project_name:
            return jsonify({
                "success": False,
                "error": "Missing projectName parameter",
                "message": "缺少项目名称参数"
            }), 400
        
        if not video_path:
            return jsonify({
                "success": False,
                "error": "Missing videoPath parameter",
                "message": "缺少视频路径参数"
            }), 400
        
        # 确保项目名称和路径的正确编码
        if isinstance(project_name, bytes):
            project_name = project_name.decode('utf-8')
        if isinstance(video_path, bytes):
            video_path = video_path.decode('utf-8')
        
        # 规范化视频路径
        video_path = os.path.normpath(video_path)
        
        # 检查视频文件是否存在
        if not os.path.exists(video_path):
            return jsonify({
                "success": False,
                "error": f"Video file not found: {video_path}",
                "message": "视频文件不存在"
            }), 404
        
        # 创建项目目录（确保中文路径正确处理）
        try:
            effects_dir = get_project_dir(project_name, 'effects')
        except Exception as e:
            return jsonify({
                "success": False,
                "error": f"Failed to create project directory: {str(e)}",
                "message": "创建项目目录失败"
            }), 500
        
        # 加载场景数据
        scenes_file = os.path.join(effects_dir, 'scenes.json')
        scenes = []
        
        if os.path.exists(scenes_file):
            with open(scenes_file, 'r', encoding='utf-8') as f:
                scenes_data = json.load(f)
                scenes = scenes_data.get('scenes', [])
        else:
            # 如果没有场景数据，先进行场景检测
            handler = VideoProcessingHandler()
            scene_result = handler.detect_scenes(video_path, output_dir=effects_dir)
            if scene_result['success']:
                scenes = scene_result['scenes']
        
        # 提取音效
        handler = VideoProcessingHandler()
        result = handler.audio_effects_extractor.extract_all_effects(video_path, scenes, project_name)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        logging.error(f"Audio effects extraction API error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "音效提取失败"
        }), 500
