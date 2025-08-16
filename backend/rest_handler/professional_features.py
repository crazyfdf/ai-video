"""
专业功能控制器
处理角色音色设计、分镜台词生成、环境音效设计和美术风格定义
"""

import json
import logging
import requests
from flask import request, jsonify
from typing import Dict, Any, Optional, List

from backend.ai.prompt_engine import AIPromptEngine
from backend.util.project_file_manager import ProjectFileManager
from backend.rest_handler.init import get_model_config

class ProfessionalFeaturesHandler:
    def __init__(self):
        self.prompt_engine = AIPromptEngine()
        self.file_manager = ProjectFileManager()
        self.logger = logging.getLogger(__name__)
    
    def _get_ai_config(self) -> Dict[str, Any]:
        """获取AI配置"""
        try:
            config_response = get_model_config()
            if hasattr(config_response, 'get_json'):
                return config_response.get_json()
            return config_response
        except Exception as e:
            self.logger.error(f"Failed to get AI config: {e}")
            return {
                'url': 'https://api.sambanova.ai/v1/chat/completions',
                'apikey': '',
                'model': 'Meta-Llama-3.1-405B-Instruct'
            }
    
    def _call_ai_service(self, prompt: str, max_tokens: int = 4000) -> Optional[str]:
        """调用AI服务"""
        try:
            config = self._get_ai_config()
            
            if not config.get('apikey'):
                self.logger.error("AI API key not configured")
                return None
            
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f"Bearer {config['apikey']}"
            }
            
            data = {
                'model': config.get('model', 'Meta-Llama-3.1-405B-Instruct'),
                'messages': [
                    {
                        'role': 'user',
                        'content': prompt
                    }
                ],
                'temperature': 0.7,
                'max_tokens': max_tokens
            }
            
            response = requests.post(
                config.get('url', 'https://api.sambanova.ai/v1/chat/completions'),
                headers=headers,
                json=data,
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                if 'choices' in result and len(result['choices']) > 0:
                    return result['choices'][0]['message']['content']
                else:
                    self.logger.error(f"Unexpected AI response format: {result}")
                    return None
            else:
                self.logger.error(f"AI service error: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            self.logger.error(f"Error calling AI service: {e}")
            return None
    
    def _validate_request_data(self, required_fields: List[str], data: Dict[str, Any]) -> Optional[str]:
        """验证请求数据"""
        for field in required_fields:
            if field not in data or not data[field]:
                return f"Missing required field: {field}"
        return None
    
    def _get_project_name(self, data: Dict[str, Any]) -> str:
        """获取项目名称"""
        return data.get('projectName', 'default')

# 角色音色设计功能
def generate_character_voice_design():
    """生成角色音色设计"""
    handler = ProfessionalFeaturesHandler()
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # 验证必需字段
        error = handler._validate_request_data(['characterInfo'], data)
        if error:
            return jsonify({'error': error}), 400
        
        # 获取参数
        character_info = data['characterInfo']
        scene_context = data.get('sceneContext', '')
        emotional_state = data.get('emotionalState', '')
        
        # 生成提示词
        prompt = handler.prompt_engine.get_voice_design_prompt(
            character_info, scene_context, emotional_state
        )
        
        # 调用AI服务
        ai_response = handler._call_ai_service(prompt)
        if not ai_response:
            return jsonify({'error': 'Failed to generate voice design'}), 500
        
        # 构造响应
        result = {
            'characterInfo': character_info,
            'sceneContext': scene_context,
            'emotionalState': emotional_state,
            'voiceDesign': ai_response,
            'prompt': prompt
        }
        
        return jsonify(result)
        
    except Exception as e:
        handler.logger.error(f"Error in generate_character_voice_design: {e}")
        return jsonify({'error': 'Internal server error'}), 500

def save_character_voice_design():
    """保存角色音色设计"""
    handler = ProfessionalFeaturesHandler()
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # 验证必需字段
        error = handler._validate_request_data(['characterId', 'voiceProfile'], data)
        if error:
            return jsonify({'error': error}), 400
        
        project_name = handler._get_project_name(data)
        character_id = data['characterId']
        voice_profile = data['voiceProfile']
        
        # 确保项目结构存在
        handler.file_manager.create_project_structure(project_name)
        
        # 保存音色配置
        success = handler.file_manager.save_character_voice_profile(
            project_name, character_id, voice_profile
        )
        
        if success:
            return jsonify({'message': 'Voice design saved successfully'})
        else:
            return jsonify({'error': 'Failed to save voice design'}), 500
            
    except Exception as e:
        handler.logger.error(f"Error in save_character_voice_design: {e}")
        return jsonify({'error': 'Internal server error'}), 500

def load_character_voice_design():
    """加载角色音色设计"""
    handler = ProfessionalFeaturesHandler()
    
    try:
        project_name = request.args.get('projectName', 'default')
        character_id = request.args.get('characterId')
        
        if not character_id:
            return jsonify({'error': 'Missing characterId parameter'}), 400
        
        # 加载音色配置
        voice_data = handler.file_manager.load_character_voice_profile(
            project_name, character_id
        )
        
        if voice_data:
            return jsonify(voice_data)
        else:
            return jsonify({'error': 'Voice design not found'}), 404
            
    except Exception as e:
        handler.logger.error(f"Error in load_character_voice_design: {e}")
        return jsonify({'error': 'Internal server error'}), 500

# 分镜台词生成功能
def generate_scene_dialogue():
    """生成分镜台词"""
    handler = ProfessionalFeaturesHandler()
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # 验证必需字段
        error = handler._validate_request_data(['sceneDescription', 'characters', 'storyContext'], data)
        if error:
            return jsonify({'error': error}), 400
        
        # 获取参数
        scene_description = data['sceneDescription']
        characters = data['characters']
        story_context = data['storyContext']
        emotional_tone = data.get('emotionalTone', '')
        scene_duration = data.get('sceneDuration', '')
        
        # 生成提示词
        prompt = handler.prompt_engine.get_dialogue_generation_prompt(
            scene_description, characters, story_context, emotional_tone, scene_duration
        )
        
        # 调用AI服务
        ai_response = handler._call_ai_service(prompt)
        if not ai_response:
            return jsonify({'error': 'Failed to generate dialogue'}), 500
        
        # 构造响应
        result = {
            'sceneDescription': scene_description,
            'characters': characters,
            'storyContext': story_context,
            'emotionalTone': emotional_tone,
            'sceneDuration': scene_duration,
            'dialogue': ai_response,
            'prompt': prompt
        }
        
        return jsonify(result)
        
    except Exception as e:
        handler.logger.error(f"Error in generate_scene_dialogue: {e}")
        return jsonify({'error': 'Internal server error'}), 500

def save_scene_dialogue():
    """保存分镜台词"""
    handler = ProfessionalFeaturesHandler()
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # 验证必需字段
        error = handler._validate_request_data(['sceneId', 'dialogue'], data)
        if error:
            return jsonify({'error': error}), 400
        
        project_name = handler._get_project_name(data)
        scene_id = data['sceneId']
        dialogue = data['dialogue']
        
        # 确保项目结构存在
        handler.file_manager.create_project_structure(project_name)
        
        # 保存台词
        success = handler.file_manager.save_scene_dialogue(
            project_name, scene_id, dialogue
        )
        
        if success:
            return jsonify({'message': 'Dialogue saved successfully'})
        else:
            return jsonify({'error': 'Failed to save dialogue'}), 500
            
    except Exception as e:
        handler.logger.error(f"Error in save_scene_dialogue: {e}")
        return jsonify({'error': 'Internal server error'}), 500

def load_scene_dialogue():
    """加载分镜台词"""
    handler = ProfessionalFeaturesHandler()
    
    try:
        project_name = request.args.get('projectName', 'default')
        scene_id = request.args.get('sceneId')
        
        if not scene_id:
            return jsonify({'error': 'Missing sceneId parameter'}), 400
        
        # 加载台词
        dialogue_data = handler.file_manager.load_scene_dialogue(
            project_name, scene_id
        )
        
        if dialogue_data:
            return jsonify(dialogue_data)
        else:
            return jsonify({'error': 'Dialogue not found'}), 404
            
    except Exception as e:
        handler.logger.error(f"Error in load_scene_dialogue: {e}")
        return jsonify({'error': 'Internal server error'}), 500

# 环境音效设计功能
def generate_environment_audio_design():
    """生成环境音效设计"""
    handler = ProfessionalFeaturesHandler()
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # 验证必需字段
        error = handler._validate_request_data(['sceneDescription'], data)
        if error:
            return jsonify({'error': error}), 400
        
        # 获取参数
        scene_description = data['sceneDescription']
        time_setting = data.get('timeSetting', '')
        location = data.get('location', '')
        weather = data.get('weather', '')
        mood = data.get('mood', '')
        duration = data.get('duration', '')
        
        # 生成提示词
        prompt = handler.prompt_engine.get_audio_design_prompt(
            scene_description, time_setting, location, weather, mood, duration
        )
        
        # 调用AI服务
        ai_response = handler._call_ai_service(prompt)
        if not ai_response:
            return jsonify({'error': 'Failed to generate audio design'}), 500
        
        # 构造响应
        result = {
            'sceneDescription': scene_description,
            'timeSetting': time_setting,
            'location': location,
            'weather': weather,
            'mood': mood,
            'duration': duration,
            'audioDesign': ai_response,
            'prompt': prompt
        }
        
        return jsonify(result)
        
    except Exception as e:
        handler.logger.error(f"Error in generate_environment_audio_design: {e}")
        return jsonify({'error': 'Internal server error'}), 500

def save_environment_audio_design():
    """保存环境音效设计"""
    handler = ProfessionalFeaturesHandler()
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # 验证必需字段
        error = handler._validate_request_data(['sceneId', 'audioDesign'], data)
        if error:
            return jsonify({'error': error}), 400
        
        project_name = handler._get_project_name(data)
        scene_id = data['sceneId']
        audio_design = data['audioDesign']
        
        # 确保项目结构存在
        handler.file_manager.create_project_structure(project_name)
        
        # 保存音效设计
        success = handler.file_manager.save_audio_design(
            project_name, scene_id, audio_design
        )
        
        if success:
            return jsonify({'message': 'Audio design saved successfully'})
        else:
            return jsonify({'error': 'Failed to save audio design'}), 500
            
    except Exception as e:
        handler.logger.error(f"Error in save_environment_audio_design: {e}")
        return jsonify({'error': 'Internal server error'}), 500

def load_environment_audio_design():
    """加载环境音效设计"""
    handler = ProfessionalFeaturesHandler()
    
    try:
        project_name = request.args.get('projectName', 'default')
        scene_id = request.args.get('sceneId')
        
        if not scene_id:
            return jsonify({'error': 'Missing sceneId parameter'}), 400
        
        # 加载音效设计
        audio_data = handler.file_manager.load_audio_design(
            project_name, scene_id
        )
        
        if audio_data:
            return jsonify(audio_data)
        else:
            return jsonify({'error': 'Audio design not found'}), 404
            
    except Exception as e:
        handler.logger.error(f"Error in load_environment_audio_design: {e}")
        return jsonify({'error': 'Internal server error'}), 500

# 美术风格定义功能
def generate_art_style_guide():
    """生成美术风格指南"""
    handler = ProfessionalFeaturesHandler()
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # 验证必需字段
        error = handler._validate_request_data(['projectType', 'storyTheme'], data)
        if error:
            return jsonify({'error': error}), 400
        
        # 获取参数
        project_type = data['projectType']
        story_theme = data['storyTheme']
        target_audience = data.get('targetAudience', '')
        emotional_tone = data.get('emotionalTone', '')
        time_period = data.get('timePeriod', '')
        location_style = data.get('locationStyle', '')
        
        # 生成提示词
        prompt = handler.prompt_engine.get_art_style_prompt(
            project_type, story_theme, target_audience, emotional_tone, time_period, location_style
        )
        
        # 调用AI服务
        ai_response = handler._call_ai_service(prompt)
        if not ai_response:
            return jsonify({'error': 'Failed to generate art style guide'}), 500
        
        # 构造响应
        result = {
            'projectType': project_type,
            'storyTheme': story_theme,
            'targetAudience': target_audience,
            'emotionalTone': emotional_tone,
            'timePeriod': time_period,
            'locationStyle': location_style,
            'artStyleGuide': ai_response,
            'prompt': prompt
        }
        
        return jsonify(result)
        
    except Exception as e:
        handler.logger.error(f"Error in generate_art_style_guide: {e}")
        return jsonify({'error': 'Internal server error'}), 500

def save_art_style_guide():
    """保存美术风格指南"""
    handler = ProfessionalFeaturesHandler()
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # 验证必需字段
        error = handler._validate_request_data(['artStyleGuide'], data)
        if error:
            return jsonify({'error': error}), 400
        
        project_name = handler._get_project_name(data)
        art_style_guide = data['artStyleGuide']
        
        # 确保项目结构存在
        handler.file_manager.create_project_structure(project_name)
        
        # 保存美术风格指南
        success = handler.file_manager.save_art_style_guide(
            project_name, art_style_guide
        )
        
        if success:
            return jsonify({'message': 'Art style guide saved successfully'})
        else:
            return jsonify({'error': 'Failed to save art style guide'}), 500
            
    except Exception as e:
        handler.logger.error(f"Error in save_art_style_guide: {e}")
        return jsonify({'error': 'Internal server error'}), 500

def load_art_style_guide():
    """加载美术风格指南"""
    handler = ProfessionalFeaturesHandler()
    
    try:
        project_name = request.args.get('projectName', 'default')
        
        # 加载美术风格指南
        style_data = handler.file_manager.load_art_style_guide(project_name)
        
        if style_data:
            return jsonify(style_data)
        else:
            return jsonify({'error': 'Art style guide not found'}), 404
            
    except Exception as e:
        handler.logger.error(f"Error in load_art_style_guide: {e}")
        return jsonify({'error': 'Internal server error'}), 500

# 角色音频生成功能
def generate_character_voice_audio():
    """为角色生成音频"""
    import asyncio
    import os
    import edge_tts
    from backend.util.constant import audio_dir
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        character_id = data.get('characterId', '')
        text = data.get('text', '')
        voice_settings = data.get('voiceSettings', {})
        project_name = data.get('projectName', 'default')
        
        if not character_id or not text:
            return jsonify({'error': 'characterId and text are required'}), 400
        
        # 确保音频目录存在
        project_audio_dir = os.path.join(audio_dir, project_name, 'characters')
        os.makedirs(project_audio_dir, exist_ok=True)
        
        # 根据角色选择合适的语音
        voice_map = {
            'female': 'zh-CN-XiaoxiaoNeural',  # 女性角色
            'male': 'zh-CN-YunxiNeural',       # 男性角色
            'default': 'zh-CN-XiaoxiaoNeural'
        }
        
        # 从voice_settings中获取语音类型，默认为女性
        gender = voice_settings.get('gender', 'female').lower()
        voice = voice_map.get(gender, voice_map['default'])
        
        # 语音参数
        rate = voice_settings.get('rate', '+35%')
        pitch = voice_settings.get('pitch', '+0Hz')
        
        # 生成音频文件名
        audio_filename = f"{character_id}_voice_sample.mp3"
        audio_path = os.path.join(project_audio_dir, audio_filename)
        
        # 使用edge-tts生成音频
        async def generate_audio():
            communicate = edge_tts.Communicate(
                text=text,
                voice=voice,
                rate=rate,
                pitch=pitch
            )
            await communicate.save(audio_path)
        
        # 运行异步函数
        asyncio.run(generate_audio())
        
        # 返回音频文件的URL
        audio_url = f"/api/audio/{project_name}/characters/{audio_filename}"
        
        return jsonify({
            'success': True,
            'audioUrl': audio_url,
            'audioPath': audio_path,
            'characterId': character_id,
            'voiceSettings': {
                'voice': voice,
                'rate': rate,
                'pitch': pitch
            }
        })
        
    except Exception as e:
        logging.error(f"Error in generate_character_voice_audio: {e}")
        return jsonify({'error': f'Failed to generate audio: {str(e)}'}), 500

# 项目管理功能
def list_professional_features():
    """列出项目的所有专业功能数据"""
    handler = ProfessionalFeaturesHandler()
    
    try:
        project_name = request.args.get('projectName', 'default')
        
        result = {
            'projectName': project_name,
            'characterVoices': handler.file_manager.list_character_voice_profiles(project_name),
            'sceneDialogues': handler.file_manager.list_scene_dialogues(project_name),
            'audioDesigns': handler.file_manager.list_audio_designs(project_name),
            'hasArtStyleGuide': handler.file_manager.load_art_style_guide(project_name) is not None
        }
        
        return jsonify(result)
        
    except Exception as e:
        handler.logger.error(f"Error in list_professional_features: {e}")
        return jsonify({'error': 'Internal server error'}), 500