import os
import logging
import base64
from typing import Dict, List, Any, Optional
from PIL import Image
import io

class VideoFrameAnalyzer:
    """视频关键帧AI分析器"""
    
    def __init__(self, llm_service=None):
        """
        初始化视频帧分析器
        
        Args:
            llm_service: LLM服务实例，用于图像分析
        """
        self.logger = logging.getLogger(__name__)
        self.llm_service = llm_service
    
    def analyze_frame(self, image_path: str, analysis_type: str = "comprehensive") -> Dict[str, Any]:
        """
        分析单个关键帧
        
        Args:
            image_path: 图片文件路径
            analysis_type: 分析类型 (comprehensive, subjects, description)
            
        Returns:
            分析结果字典
        """
        try:
            if not os.path.exists(image_path):
                return {
                    "success": False,
                    "error": f"Image file not found: {image_path}",
                    "message": "图片文件不存在"
                }
            
            # 读取并编码图片
            image_base64 = self._encode_image_to_base64(image_path)
            if not image_base64:
                return {
                    "success": False,
                    "error": "Failed to encode image",
                    "message": "图片编码失败"
                }
            
            # 根据分析类型生成提示词
            prompt = self._generate_analysis_prompt(analysis_type)
            
            # 调用LLM进行图像分析
            if self.llm_service:
                analysis_result = self._analyze_with_llm(image_base64, prompt)
            else:
                # 如果没有LLM服务，返回基础分析
                analysis_result = self._basic_image_analysis(image_path)
            
            return {
                "success": True,
                "analysis": analysis_result,
                "image_path": image_path,
                "analysis_type": analysis_type,
                "message": "关键帧分析完成"
            }
            
        except Exception as e:
            self.logger.error(f"Frame analysis failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "关键帧分析失败"
            }
    
    def analyze_scene_frames(self, scene_frames: List[str], scene_id: int) -> Dict[str, Any]:
        """
        分析场景中的所有关键帧
        
        Args:
            scene_frames: 场景关键帧路径列表
            scene_id: 场景ID
            
        Returns:
            场景分析结果
        """
        try:
            scene_analysis = {
                "scene_id": scene_id,
                "frame_count": len(scene_frames),
                "frames": [],
                "scene_summary": "",
                "identified_subjects": [],
                "dominant_colors": [],
                "scene_type": "",
                "lighting_conditions": "",
                "camera_angle": ""
            }
            
            # 分析每个关键帧
            for i, frame_path in enumerate(scene_frames):
                self.logger.info(f"Analyzing frame {i+1}/{len(scene_frames)} for scene {scene_id}")
                
                frame_result = self.analyze_frame(frame_path, "comprehensive")
                if frame_result["success"]:
                    scene_analysis["frames"].append({
                        "frame_index": i,
                        "frame_path": frame_path,
                        "analysis": frame_result["analysis"]
                    })
            
            # 生成场景总结
            if scene_analysis["frames"]:
                scene_analysis["scene_summary"] = self._generate_scene_summary(scene_analysis["frames"])
                scene_analysis["identified_subjects"] = self._extract_scene_subjects(scene_analysis["frames"])
            
            return {
                "success": True,
                "scene_analysis": scene_analysis,
                "message": f"场景 {scene_id} 分析完成"
            }
            
        except Exception as e:
            self.logger.error(f"Scene frames analysis failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": "场景帧分析失败"
            }
    
    def _encode_image_to_base64(self, image_path: str) -> Optional[str]:
        """将图片编码为base64字符串"""
        try:
            with Image.open(image_path) as img:
                # 调整图片大小以减少token消耗
                max_size = (1024, 1024)
                img.thumbnail(max_size, Image.Resampling.LANCZOS)
                
                # 转换为RGB格式
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # 编码为base64
                buffer = io.BytesIO()
                img.save(buffer, format='JPEG', quality=85)
                img_bytes = buffer.getvalue()
                
                return base64.b64encode(img_bytes).decode('utf-8')
                
        except Exception as e:
            self.logger.error(f"Image encoding failed: {str(e)}")
            return None
    
    def _generate_analysis_prompt(self, analysis_type: str) -> str:
        """生成分析提示词"""
        base_prompt = "请分析这张图片，"
        
        if analysis_type == "comprehensive":
            return base_prompt + """提供以下信息：
1. 画面描述：详细描述画面中的内容、构图、色彩等
2. 主体识别：识别画面中的人物、物体、场景元素
3. 情感氛围：描述画面传达的情感和氛围
4. 技术特征：分析拍摄角度、光线条件、景深等
5. 故事元素：推测可能的故事情节或场景背景

请以JSON格式返回结果。"""
        
        elif analysis_type == "subjects":
            return base_prompt + """重点识别画面中的主体元素：
1. 人物：性别、年龄、服装、表情、动作
2. 物体：重要道具、家具、工具等
3. 场景：室内/室外、具体地点、环境特征
4. 特效：光效、粒子、魔法等特殊效果

请以JSON格式返回结果。"""
        
        elif analysis_type == "description":
            return base_prompt + """生成详细的画面描述：
1. 整体构图和视觉重点
2. 色彩搭配和光影效果
3. 人物动作和表情
4. 环境氛围和细节
5. 适合用于AI绘画的提示词

请以JSON格式返回结果。"""
        
        else:
            return base_prompt + "描述这张图片的主要内容。"
    
    def _analyze_with_llm(self, image_base64: str, prompt: str) -> Dict[str, Any]:
        """使用LLM分析图像"""
        try:
            # 构建多模态请求
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
            
            # 调用LLM服务
            response = self.llm_service.chat_completion(messages)
            
            # 解析响应
            if response and "choices" in response:
                content = response["choices"][0]["message"]["content"]
                
                # 尝试解析JSON响应
                try:
                    import json
                    analysis_data = json.loads(content)
                    return analysis_data
                except json.JSONDecodeError:
                    # 如果不是JSON格式，返回文本描述
                    return {
                        "description": content,
                        "subjects": [],
                        "emotions": "",
                        "technical_features": "",
                        "story_elements": ""
                    }
            
            return {"error": "No valid response from LLM"}
            
        except Exception as e:
            self.logger.error(f"LLM analysis failed: {str(e)}")
            return {"error": str(e)}
    
    def _basic_image_analysis(self, image_path: str) -> Dict[str, Any]:
        """基础图像分析（不使用LLM）"""
        try:
            with Image.open(image_path) as img:
                # 获取基本图像信息
                width, height = img.size
                mode = img.mode
                format_name = img.format
                
                # 分析主要颜色
                colors = self._analyze_dominant_colors(img)
                
                return {
                    "description": f"图像尺寸: {width}x{height}, 格式: {format_name}",
                    "subjects": ["未识别"],
                    "dominant_colors": colors,
                    "technical_features": {
                        "width": width,
                        "height": height,
                        "mode": mode,
                        "format": format_name
                    },
                    "analysis_method": "basic"
                }
                
        except Exception as e:
            return {"error": str(e)}
    
    def _analyze_dominant_colors(self, img: Image.Image, num_colors: int = 5) -> List[str]:
        """分析图像主要颜色"""
        try:
            # 缩小图像以加速处理
            img_small = img.resize((150, 150))
            
            # 转换为RGB
            if img_small.mode != 'RGB':
                img_small = img_small.convert('RGB')
            
            # 获取颜色数据
            colors = img_small.getcolors(maxcolors=256*256*256)
            if not colors:
                return []
            
            # 排序并获取主要颜色
            colors.sort(key=lambda x: x[0], reverse=True)
            dominant_colors = []
            
            for count, color in colors[:num_colors]:
                hex_color = "#{:02x}{:02x}{:02x}".format(*color)
                dominant_colors.append(hex_color)
            
            return dominant_colors
            
        except Exception as e:
            self.logger.error(f"Color analysis failed: {str(e)}")
            return []
    
    def _generate_scene_summary(self, frames: List[Dict]) -> str:
        """生成场景总结"""
        if not frames:
            return "无可用帧数据"
        
        # 提取所有帧的描述
        descriptions = []
        for frame in frames:
            analysis = frame.get("analysis", {})
            if "description" in analysis:
                descriptions.append(analysis["description"])
        
        if descriptions:
            return f"场景包含 {len(frames)} 个关键帧，主要内容：" + "; ".join(descriptions[:3])
        else:
            return f"场景包含 {len(frames)} 个关键帧"
    
    def _extract_scene_subjects(self, frames: List[Dict]) -> List[str]:
        """提取场景中的主体"""
        all_subjects = set()
        
        for frame in frames:
            analysis = frame.get("analysis", {})
            subjects = analysis.get("subjects", [])
            
            if isinstance(subjects, list):
                all_subjects.update(subjects)
            elif isinstance(subjects, str):
                all_subjects.add(subjects)
        
        return list(all_subjects)
    
    def get_analysis_types(self) -> List[str]:
        """获取支持的分析类型"""
        return ["comprehensive", "subjects", "description"]