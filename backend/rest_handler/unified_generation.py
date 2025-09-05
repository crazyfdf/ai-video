import json
import logging
import os
from flask import jsonify, request
from backend.llm.llm import query_llm
from backend.util.project_file_manager import get_project_dir
from backend.util.file import save_file
from backend.ai.prompt_engine import AIPromptEngine
from backend.rest_handler.storyboard import validate_unified_generation_format

class UnifiedGenerationHandler:
    """统一的主体与分镜生成处理器"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.prompt_engine = AIPromptEngine()
    
    def generate_subjects_and_storyboard_from_novel(self, project_name, novel_content, processing_mode="novel"):
        """基于小说内容生成主体和分镜"""
        try:
            # 使用新的提示词引擎获取系统提示词
            system_prompt = self.prompt_engine.get_subject_generation_prompt(
                content_info=novel_content,
                processing_mode=processing_mode
            )
            user_prompt = f"""请分析以下小说内容，提取所有重要主体（包括角色、场景、道具、特效等）并生成分镜脚本：

{novel_content}

请按照JSON格式返回结果。"""
            
            # 调用AI接口
            response = query_llm(user_prompt, system_prompt, "unified_generation", 1)
            
            # 保存AI原始响应
            self._save_raw_llm_response(project_name, response, "novel")
            
            # 解析AI响应
            try:
                result = json.loads(response)
            except json.JSONDecodeError as e:
                # 尝试修复JSON格式
                result = self._fix_json_response(response)
            
            # 保存结果到项目目录
            self._save_generation_result(project_name, result, "novel")
            
            return {
                "success": True,
                "data": result,
                "message": "主体与分镜生成完成"
            }
            
        except Exception as e:
            self.logger.error(f"Novel-based generation failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "生成失败"
            }
    
    def generate_subjects_and_storyboard_from_video(self, project_name, video_path, scenes_data, transcription_data):
        """基于视频内容生成主体和分镜"""
        try:
            # 构建视频内容信息
            video_content_info = self._build_video_content_info(scenes_data, transcription_data)
            
            # 使用新的提示词引擎获取系统提示词
            system_prompt = self.prompt_engine.get_subject_generation_prompt(
                content_info=video_content_info,
                processing_mode="video"
            )
            
            # 构建用户提示词，包含场景信息和转录文本
            user_prompt = self._build_video_analysis_prompt(scenes_data, transcription_data)
            
            # 调用AI接口
            response = query_llm(user_prompt, system_prompt, "unified_generation_video", 1)
            
            # 保存AI原始响应
            self._save_raw_llm_response(project_name, response, "video")
            
            # 解析AI响应
            try:
                result = json.loads(response)
            except json.JSONDecodeError as e:
                result = self._fix_json_response(response)
            
            # 保存结果到项目目录
            self._save_generation_result(project_name, result, "video")
            
            return {
                "success": True,
                "data": result,
                "message": "基于视频的主体与分镜生成完成"
            }
            
        except Exception as e:
            self.logger.error(f"Video-based generation failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "视频分析生成失败"
            }
    
    def _build_video_content_info(self, scenes_data, transcription_data):
        """构建视频内容信息"""
        content_info = {
            "type": "video",
            "scenes": scenes_data,
            "transcription": transcription_data
        }
        return json.dumps(content_info, ensure_ascii=False)
    
    def _build_video_analysis_prompt(self, scenes_data, transcription_data):
        """构建视频分析的用户提示词"""
        prompt = "请分析以下视频内容：\n\n"
        
        # 添加场景信息
        prompt += "=== 场景切分信息 ===\n"
        for i, scene in enumerate(scenes_data):
            prompt += f"场景 {i+1}: {scene['start_time']:.2f}s - {scene['end_time']:.2f}s\n"
        
        # 添加转录信息
        prompt += "\n=== 音频转录 ===\n"
        for segment in transcription_data:
            prompt += f"[{segment['start']:.2f}s - {segment['end']:.2f}s] {segment['text']}\n"
        
        prompt += "\n请根据以上信息生成主体和分镜脚本。"
        
        return prompt
    
    def _fix_json_response(self, response):
        """尝试修复AI返回的JSON格式"""
        try:
            # 移除可能的markdown标记
            cleaned = response.strip()
            if cleaned.startswith('```json'):
                cleaned = cleaned[7:]  # 移除```json
            if cleaned.endswith('```'):
                cleaned = cleaned[:-3]  # 移除结尾的```
            
            # 清理换行符和多余空格
            cleaned = cleaned.strip()
            
            # 尝试解析
            result = json.loads(cleaned)
            self.logger.info("JSON解析成功")
            return result
        except json.JSONDecodeError as e:
            self.logger.error(f"JSON解析失败: {str(e)}")
            self.logger.error(f"原始响应长度: {len(response)}")
            self.logger.error(f"清理后内容前100字符: {cleaned[:100] if cleaned else 'None'}")
            
            # 尝试从不完整的JSON中提取有用信息
            try:
                # 如果JSON不完整，尝试找到summary和subjects部分
                if '"summary"' in cleaned and '"subjects"' in cleaned:
                    # 尝试构建基本结构
                    import re
                    summary_match = re.search(r'"summary"\s*:\s*"([^"]+)"', cleaned)
                    summary = summary_match.group(1) if summary_match else "部分解析成功"
                    
                    # 返回部分解析的结构
                    return {
                        "summary": summary,
                        "subjects": {
                            "characters": [],
                            "scenes": [],
                            "props": [],
                            "effects": []
                        },
                        "storyboard": []
                    }
            except Exception as parse_error:
                self.logger.error(f"部分解析也失败: {str(parse_error)}")
            
            # 如果所有解析都失败，返回基本结构
            return {
                "summary": "解析失败",
                "subjects": {
                    "characters": [],
                    "scenes": [],
                    "props": [],
                    "effects": []
                },
                "storyboard": []
            }
        except Exception as e:
            self.logger.error(f"其他解析错误: {str(e)}")
            return {
                "summary": "解析失败",
                "subjects": {
                    "characters": [],
                    "scenes": [],
                    "props": [],
                    "effects": []
                },
                "storyboard": []
            }
    
    def _save_generation_result(self, project_name, result, source_type):
        """保存生成结果到项目目录，按照标准LLM响应格式"""
        try:
            from datetime import datetime
            project_dir = get_project_dir(project_name)
            
            # 构建标准LLM响应格式的数据结构
            llm_response_data = {
                'request_id': f'unified_generation_{source_type}_{int(datetime.now().timestamp())}',
                'timestamp': datetime.now().isoformat(),
                'model': 'unified-generation-model',
                'prompt': f'Generate subjects and storyboard from {source_type}',
                'choices': [{
                    'finish_reason': 'stop',
                    'index': 0,
                    'logprobs': None,
                    'message': {
                        'content': json.dumps(result, ensure_ascii=False),
                        'role': 'assistant'
                    }
                }],
                'usage': {
                    'prompt_tokens': 0,
                    'completion_tokens': 0,
                    'total_tokens': 0
                }
            }
            
            # 格式校验
            is_valid, validation_message = validate_unified_generation_format(llm_response_data)
            if not is_valid:
                self.logger.error(f"生成的unified_generation_{source_type}.json格式验证失败: {validation_message}")
                raise ValueError(f"生成的文件格式不符合规范: {validation_message}")
            
            # 保存完整结果 - 统一使用unified_generation_novel.json文件名
            result_file = os.path.join(project_dir, "unified_generation_novel.json")
            save_file(result_file, json.dumps(llm_response_data, ensure_ascii=False, indent=2))
            self.logger.info(f"unified_generation_novel.json格式验证通过并保存成功")
            
            # 分别保存主体信息
            self._save_subjects_separately(project_name, result.get('subjects', {}))
            
            # 保存分镜信息
            self._save_storyboard_separately(project_name, result.get('storyboard', []))
            
        except Exception as e:
            self.logger.error(f"Failed to save generation result: {str(e)}")
            raise
    
    def _save_raw_llm_response(self, project_name, raw_response, source_type):
        """保存AI大模型的原始响应，格式与latest_llm_response文件一致"""
        try:
            from datetime import datetime
            project_dir = get_project_dir(project_name)
            
            # 构建LLM响应格式的数据结构
            llm_response_data = {
                'choices': [{
                    'finish_reason': 'stop',
                    'index': 0,
                    'logprobs': None,
                    'message': {
                        'content': raw_response,
                        'role': 'assistant'
                    }
                }],
                'created': int(datetime.now().timestamp()),
                'model': 'unified-generation-model',
                'object': 'chat.completion'
            }
            
            # 根据source_type确定文件名
            if source_type == 'video':
                filename = 'latest_llm_response_video_generation.json'
            else:
                filename = 'latest_llm_response_unified_generation.json'
            
            # 保存到文件
            latest_file_path = os.path.join(project_dir, filename)
            save_file(latest_file_path, json.dumps(llm_response_data, ensure_ascii=False, indent=2))
            
            self.logger.info(f"Raw LLM response saved to {latest_file_path}")
            
        except Exception as e:
            self.logger.error(f"Failed to save raw LLM response: {str(e)}")
    
    def _save_subjects_separately(self, project_name, subjects):
        """分别保存各类主体信息"""
        project_dir = get_project_dir(project_name)
        
        # 保存角色主体
        if subjects.get('characters'):
            char_dir = os.path.join(project_dir, 'character')
            os.makedirs(char_dir, exist_ok=True)
            for i, char in enumerate(subjects['characters']):
                # 确保角色数据包含必要字段
                char_data = {
                    "name": char.get('name', f'角色{i+1}'),
                    "type": "character",
                    "description": char.get('description', ''),
                    "english_prompt": char.get('english_prompt', char.get('englishPrompt', '')),
                    "appearance_details": char.get('appearance_details', char.get('initial_appearance', '')),
                    "personality": char.get('personality', ''),
                    "age_range": char.get('age_range', char.get('age', '')),
                    "gender": char.get('gender', '未指定')
                }
                char_file = os.path.join(char_dir, f"{char_data['name']}.json")
                save_file(char_file, json.dumps(char_data, ensure_ascii=False, indent=2))
        
        # 保存场景主体
        if subjects.get('scenes'):
            scene_dir = os.path.join(project_dir, 'scene')
            os.makedirs(scene_dir, exist_ok=True)
            for i, scene in enumerate(subjects['scenes']):
                # 确保场景数据包含必要字段
                scene_data = {
                    "name": scene.get('name', f'场景{i+1}'),
                    "type": "scene",
                    "description": scene.get('description', ''),
                    "english_prompt": scene.get('english_prompt', scene.get('englishPrompt', '')),
                    "atmosphere": scene.get('atmosphere', '中性氛围'),
                    "location_type": scene.get('location_type', scene.get('period', '室内/室外待定')),
                    "time_period": scene.get('time_period', '当代')
                }
                scene_file = os.path.join(scene_dir, f"{scene_data['name']}.json")
                save_file(scene_file, json.dumps(scene_data, ensure_ascii=False, indent=2))
        
        # 保存道具主体
        if subjects.get('props'):
            prop_dir = os.path.join(project_dir, 'props')
            os.makedirs(prop_dir, exist_ok=True)
            for i, prop in enumerate(subjects['props']):
                # 确保道具数据包含必要字段
                prop_data = {
                    "name": prop.get('name', f'道具{i+1}'),
                    "type": "prop",
                    "description": prop.get('description', ''),
                    "english_prompt": prop.get('english_prompt', prop.get('englishPrompt', '')),
                    "function": prop.get('function', '功能待定'),
                    "material": prop.get('material', '材质待定'),
                    "size_scale": prop.get('size_scale', '中等尺寸')
                }
                prop_file = os.path.join(prop_dir, f"{prop_data['name']}.json")
                save_file(prop_file, json.dumps(prop_data, ensure_ascii=False, indent=2))
        
        # 保存特效主体
        if subjects.get('effects'):
            effect_dir = os.path.join(project_dir, 'effects')
            os.makedirs(effect_dir, exist_ok=True)
            for i, effect in enumerate(subjects['effects']):
                # 确保特效数据包含必要字段
                effect_data = {
                    "name": effect.get('name', f'特效{i+1}'),
                    "type": "effect",
                    "description": effect.get('description', ''),
                    "english_prompt": effect.get('english_prompt', effect.get('englishPrompt', '')),
                    "duration_type": effect.get('duration_type', '短暂'),
                    "intensity_level": effect.get('intensity_level', '中等'),
                    "visual_style": effect.get('visual_style', '标准视觉效果')
                }
                effect_file = os.path.join(effect_dir, f"{effect_data['name']}.json")
                save_file(effect_file, json.dumps(effect_data, ensure_ascii=False, indent=2))
    
    def _save_storyboard_separately(self, project_name, storyboard):
        """保存分镜信息"""
        project_dir = get_project_dir(project_name)
        storyboard_dir = os.path.join(project_dir, 'storyboard')
        os.makedirs(storyboard_dir, exist_ok=True)
        
        for i, scene in enumerate(storyboard):
            scene_file = os.path.join(storyboard_dir, f"storyboard_{i+1}.json")
            save_file(scene_file, json.dumps(scene, ensure_ascii=False, indent=2))


# API接口函数
def generate_unified_subjects_and_storyboard():
    """统一的主体与分镜生成API接口"""
    try:
        # 强制设置请求编码
        if request.content_type and 'charset' not in request.content_type:
            request.charset = 'utf-8'
        
        data = request.get_json(force=True)
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        project_name = data.get('projectName')
        processing_mode = data.get('processingMode', 'novel')  # 'novel' 或 'video'
        
        if not project_name:
            return jsonify({"error": "Project name is required"}), 400
        
        # 确保项目名称是正确的字符串格式
        if isinstance(project_name, bytes):
            project_name = project_name.decode('utf-8')
        
        # 尝试重新编码以确保正确性
        try:
            project_name = project_name.encode('latin1').decode('utf-8')
        except (UnicodeDecodeError, UnicodeEncodeError):
            # 如果重新编码失败，保持原样
            pass
        
        # 记录调试信息
        logging.info(f"Processing project: {project_name} (type: {type(project_name)})")
        logging.info(f"Project name encoded: {project_name.encode('utf-8')}")
        
        handler = UnifiedGenerationHandler()
        
        if processing_mode == 'novel':
            novel_content = data.get('novelContent')
            if not novel_content:
                return jsonify({"error": "Novel content is required for novel mode"}), 400
            
            result = handler.generate_subjects_and_storyboard_from_novel(
                project_name, novel_content, processing_mode
            )
        
        elif processing_mode == 'video':
            video_path = data.get('videoPath')
            scenes_data = data.get('scenesData', [])
            transcription_data = data.get('transcriptionData', [])
            
            if not video_path:
                return jsonify({"error": "Video path is required for video mode"}), 400
            
            result = handler.generate_subjects_and_storyboard_from_video(
                project_name, video_path, scenes_data, transcription_data
            )
        
        else:
            return jsonify({"error": "Invalid processing mode"}), 400
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        logging.error(f"Unified generation API error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "API调用失败"
        })