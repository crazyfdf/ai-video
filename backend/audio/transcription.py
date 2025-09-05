import os
import logging
import tempfile
from typing import Dict, List, Any, Optional

try:
    import whisper
except ImportError:
    whisper = None

class AudioTranscriber:
    """音频转录器，基于OpenAI Whisper"""
    
    def __init__(self, model_name: str = "base"):
        """
        初始化音频转录器
        
        Args:
            model_name: Whisper模型名称 (tiny, base, small, medium, large)
        """
        self.logger = logging.getLogger(__name__)
        self.model_name = model_name
        self.model = None
        
        if whisper is None:
            self.logger.error("Whisper not installed. Please install with: pip install openai-whisper")
            raise ImportError("Whisper not installed")
    
    def load_model(self) -> bool:
        """加载Whisper模型"""
        try:
            if self.model is None:
                self.logger.info(f"Loading Whisper model: {self.model_name}")
                self.model = whisper.load_model(self.model_name)
                self.logger.info("Whisper model loaded successfully")
            return True
        except Exception as e:
            self.logger.error(f"Failed to load Whisper model: {str(e)}")
            return False
    
    def transcribe_audio(self, audio_path: str, language: Optional[str] = None) -> Dict[str, Any]:
        """
        转录音频文件
        
        Args:
            audio_path: 音频文件路径
            language: 指定语言代码 (如 'zh', 'en')，None为自动检测
            
        Returns:
            转录结果字典
        """
        try:
            if not self.load_model():
                return {
                    "success": False,
                    "error": "Failed to load Whisper model",
                    "message": "模型加载失败"
                }
            
            if not os.path.exists(audio_path):
                return {
                    "success": False,
                    "error": f"Audio file not found: {audio_path}",
                    "message": "音频文件不存在"
                }
            
            self.logger.info(f"Transcribing audio: {audio_path}")
            
            # 转录参数
            transcribe_options = {}
            if language:
                transcribe_options['language'] = language
            
            # 执行转录
            result = self.model.transcribe(audio_path, **transcribe_options)
            
            # 格式化结果
            segments = []
            for segment in result.get('segments', []):
                segments.append({
                    "id": segment.get('id', 0),
                    "start": segment['start'],
                    "end": segment['end'],
                    "text": segment['text'].strip(),
                    "confidence": segment.get('avg_logprob', 0),
                    "no_speech_prob": segment.get('no_speech_prob', 0)
                })
            
            transcription_result = {
                "text": result['text'].strip(),
                "language": result.get('language', 'unknown'),
                "segments": segments,
                "duration": segments[-1]['end'] if segments else 0
            }
            
            self.logger.info(f"Transcription completed. Language: {transcription_result['language']}, Duration: {transcription_result['duration']:.2f}s")
            
            return {
                "success": True,
                "transcription": transcription_result,
                "message": "音频转录完成"
            }
            
        except Exception as e:
            self.logger.error(f"Audio transcription failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "音频转录失败"
            }
    
    def transcribe_video_audio(self, video_path: str, language: Optional[str] = None) -> Dict[str, Any]:
        """
        从视频中提取音频并转录
        
        Args:
            video_path: 视频文件路径
            language: 指定语言代码
            
        Returns:
            转录结果字典
        """
        try:
            if not os.path.exists(video_path):
                return {
                    "success": False,
                    "error": f"Video file not found: {video_path}",
                    "message": "视频文件不存在"
                }
            
            # 创建临时音频文件
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_audio:
                temp_audio_path = temp_audio.name
            
            try:
                # 使用moviepy提取音频
                from moviepy.editor import VideoFileClip
                
                self.logger.info(f"Extracting audio from video: {video_path}")
                video = VideoFileClip(video_path)
                audio = video.audio
                
                if audio is None:
                    return {
                        "success": False,
                        "error": "No audio track found in video",
                        "message": "视频中未找到音频轨道"
                    }
                
                # 导出音频
                audio.write_audiofile(temp_audio_path, verbose=False, logger=None)
                audio.close()
                video.close()
                
                # 转录音频
                result = self.transcribe_audio(temp_audio_path, language)
                
                return result
                
            finally:
                # 清理临时文件
                if os.path.exists(temp_audio_path):
                    os.unlink(temp_audio_path)
                    
        except Exception as e:
            self.logger.error(f"Video audio transcription failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "视频音频转录失败"
            }
    
    def get_supported_languages(self) -> List[str]:
        """获取支持的语言列表"""
        if whisper is None:
            return []
        
        try:
            # Whisper支持的语言
            languages = list(whisper.tokenizer.LANGUAGES.keys())
            return sorted(languages)
        except Exception as e:
            self.logger.error(f"Failed to get supported languages: {str(e)}")
            return []
    
    def get_available_models(self) -> List[str]:
        """获取可用的模型列表"""
        return ["tiny", "base", "small", "medium", "large"]