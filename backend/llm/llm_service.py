import logging
import json
from typing import Dict, List, Any, Optional
from backend.llm.openai import query_openai
from backend.llm.sambanova import query_samba_nova
from backend.llm.siliconflow import query_silicon_flow
from backend.util.file import get_config
from openai import OpenAI

class LLMService:
    """LLM服务类，支持文本和多模态图像分析"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.config = get_config()
        self._init_client()
    
    def _init_client(self):
        """初始化OpenAI客户端"""
        try:
            self.client = OpenAI(
                api_key=self.config.get("apikey"),
                base_url=self.config.get("url")
            )
        except Exception as e:
            self.logger.error(f"Failed to initialize OpenAI client: {str(e)}")
            self.client = None
    
    def chat_completion(self, messages: List[Dict], model: str = None, temperature: float = 0.7) -> Optional[Dict]:
        """通用聊天完成接口，支持多模态输入"""
        try:
            if not self.client:
                self.logger.error("OpenAI client not initialized")
                return None
            
            model_name = model or self.config.get("model", "gpt-4o")
            
            response = self.client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=temperature,
                stream=False
            )
            
            return {
                "choices": [{
                    "message": {
                        "content": response.choices[0].message.content
                    }
                }]
            }
            
        except Exception as e:
            self.logger.error(f"Chat completion failed: {str(e)}")
            return None
    
    def analyze_image(self, image_base64: str, prompt: str, model: str = None) -> Optional[Dict]:
        """分析图像内容"""
        try:
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}"
                            }
                        }
                    ]
                }
            ]
            
            return self.chat_completion(messages, model)
            
        except Exception as e:
            self.logger.error(f"Image analysis failed: {str(e)}")
            return None
    
    def generate_scene_description(self, keyframe_analyses: List[Dict], scene_context: Dict = None) -> str:
        """根据关键帧分析生成场景描述"""
        try:
            # 构建提示词
            prompt = """基于以下关键帧分析结果，生成一个连贯的场景描述：

"""
            
            for i, analysis in enumerate(keyframe_analyses):
                prompt += f"关键帧 {i+1}：{analysis.get('description', '无描述')}\n"
            
            if scene_context:
                prompt += f"\n场景时长：{scene_context.get('duration', 0):.1f}秒\n"
                prompt += f"场景ID：{scene_context.get('scene_id', 'unknown')}\n"
            
            prompt += "\n请生成一个简洁但详细的场景描述，包括：\n"
            prompt += "1. 主要视觉元素和构图\n"
            prompt += "2. 人物动作和表情\n"
            prompt += "3. 环境氛围和色调\n"
            prompt += "4. 镜头运动和视角\n"
            prompt += "\n请用中文回答，控制在200字以内。"
            
            messages = [
                {"role": "user", "content": prompt}
            ]
            
            response = self.chat_completion(messages, temperature=0.3)
            
            if response and "choices" in response:
                return response["choices"][0]["message"]["content"]
            else:
                return "场景描述生成失败"
                
        except Exception as e:
            self.logger.error(f"Scene description generation failed: {str(e)}")
            return "场景描述生成失败"
    
    def generate_storyboard_script(self, scene_descriptions: List[str], audio_transcription: str = None) -> List[Dict]:
        """生成分镜脚本"""
        try:
            storyboard_scripts = []
            
            for i, description in enumerate(scene_descriptions):
                prompt = f"""基于以下场景描述，生成分镜脚本：

场景描述：{description}
"""
                
                if audio_transcription:
                    prompt += f"\n音频内容：{audio_transcription}\n"
                
                prompt += """\n请生成包含以下元素的分镜脚本：
1. 镜头类型（特写/中景/远景等）
2. 拍摄角度（正面/侧面/俯视等）
3. 镜头运动（静止/推拉/摇移等）
4. 重点表现内容
5. 情感氛围

请以JSON格式返回，包含以下字段：
{
  "shot_type": "镜头类型",
  "camera_angle": "拍摄角度",
  "camera_movement": "镜头运动",
  "focus_elements": ["重点元素1", "重点元素2"],
  "emotional_tone": "情感氛围",
  "description": "详细描述"
}"""
                
                messages = [
                    {"role": "user", "content": prompt}
                ]
                
                response = self.chat_completion(messages, temperature=0.5)
                
                if response and "choices" in response:
                    content = response["choices"][0]["message"]["content"]
                    
                    try:
                        # 尝试解析JSON响应
                        script_data = json.loads(content)
                        script_data["scene_index"] = i
                        storyboard_scripts.append(script_data)
                    except json.JSONDecodeError:
                        # 如果不是JSON格式，创建基础结构
                        storyboard_scripts.append({
                            "scene_index": i,
                            "shot_type": "中景",
                            "camera_angle": "正面",
                            "camera_movement": "静止",
                            "focus_elements": ["主要内容"],
                            "emotional_tone": "中性",
                            "description": content
                        })
                else:
                    # 创建默认脚本
                    storyboard_scripts.append({
                        "scene_index": i,
                        "shot_type": "中景",
                        "camera_angle": "正面",
                        "camera_movement": "静止",
                        "focus_elements": ["场景内容"],
                        "emotional_tone": "中性",
                        "description": description
                    })
            
            return storyboard_scripts
            
        except Exception as e:
            self.logger.error(f"Storyboard script generation failed: {str(e)}")
            return []
    
    def query_text(self, input_text: str, system_content: str = None, model_name: str = None, temperature: float = 0.7) -> str:
        """文本查询接口（兼容原有接口）"""
        try:
            url = self.config.get("url", "")
            
            # 根据URL选择不同的服务
            if "sambanova" in url.lower():
                return query_samba_nova(input_text, system_content, model_name, temperature)
            else:
                return query_openai(input_text, system_content, model_name, temperature)
                
        except Exception as e:
            self.logger.error(f"Text query failed: {str(e)}")
            return f"查询失败: {str(e)}"
    
    def translate_text(self, input_text: str) -> str:
        """文本翻译"""
        translate_sys = "把输入完全翻译成英文，不要输出翻译文本以外的内容，只需要输出翻译后的文本。如果包含翻译之外的内容，则重新输出"
        return query_silicon_flow(input_text, translate_sys, 0.01)

# 全局LLM服务实例
_llm_service_instance = None

def get_llm_service() -> LLMService:
    """获取LLM服务实例（单例模式）"""
    global _llm_service_instance
    if _llm_service_instance is None:
        _llm_service_instance = LLMService()
    return _llm_service_instance