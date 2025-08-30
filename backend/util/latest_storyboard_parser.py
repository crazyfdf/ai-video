import json
import logging
import os
from typing import Dict, List, Any, Optional
from datetime import datetime

class LatestStoryboardParser:
    """解析latest_llm_response_storyboard_generation.json文件的工具类"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def parse_latest_storyboard_file(self, file_path: str) -> Optional[Dict[str, Any]]:
        """解析latest_llm_response_storyboard_generation.json文件
        
        Args:
            file_path: JSON文件路径
            
        Returns:
            解析后的分镜数据，格式与complete_storyboard.json兼容
        """
        try:
            if not os.path.exists(file_path):
                self.logger.warning(f"Latest storyboard file not found: {file_path}")
                return None
            
            with open(file_path, 'r', encoding='utf-8') as f:
                raw_data = json.load(f)
            
            # 从LLM响应中提取分镜数据
            storyboard_data = self._extract_storyboard_from_llm_response(raw_data)
            
            if not storyboard_data:
                self.logger.error("Failed to extract storyboard data from LLM response")
                return None
            
            # 转换为标准格式
            standardized_data = self._convert_to_standard_format(storyboard_data)
            
            return standardized_data
            
        except Exception as e:
            self.logger.error(f"Error parsing latest storyboard file: {e}")
            return None
    
    def _extract_storyboard_from_llm_response(self, raw_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """从LLM响应中提取分镜数据"""
        try:
            # 获取choices中的第一个响应
            if 'choices' not in raw_data or not raw_data['choices']:
                self.logger.error("No choices found in LLM response")
                return None
            
            first_choice = raw_data['choices'][0]
            if 'message' not in first_choice or 'content' not in first_choice['message']:
                self.logger.error("No message content found in LLM response")
                return None
            
            content = first_choice['message']['content']
            
            # 解析JSON内容
            storyboard_data = json.loads(content)
            
            return storyboard_data
            
        except json.JSONDecodeError as e:
            self.logger.error(f"Failed to parse JSON content from LLM response: {e}")
            return None
        except Exception as e:
            self.logger.error(f"Error extracting storyboard from LLM response: {e}")
            return None
    
    def _convert_to_standard_format(self, storyboard_data: Dict[str, Any]) -> Dict[str, Any]:
        """将分镜数据转换为标准格式"""
        try:
            # 提取场景数据
            scenes = storyboard_data.get('scenes', [])
            
            # 构建标准格式的数据结构
            standardized_data = {
                'total_scenes': len(scenes),
                'generated_at': datetime.now().isoformat() + 'Z',
                'story_summary': self._extract_story_summary(scenes),
                'characters': self._extract_characters(scenes),
                'scenes': self._standardize_scenes(scenes)
            }
            
            return standardized_data
            
        except Exception as e:
            self.logger.error(f"Error converting to standard format: {e}")
            return {}
    
    def _extract_story_summary(self, scenes: List[Dict[str, Any]]) -> str:
        """从场景中提取故事摘要"""
        try:
            # 合并所有场景的小说片段来生成摘要
            fragments = []
            for scene in scenes:
                fragment = scene.get('novel_fragment', '')
                if fragment:
                    fragments.append(fragment)
            
            # 简单地连接前几个片段作为摘要
            summary_fragments = fragments[:3]  # 取前3个片段
            return ' '.join(summary_fragments)
            
        except Exception as e:
            self.logger.error(f"Error extracting story summary: {e}")
            return "故事摘要提取失败"
    
    def _extract_characters(self, scenes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """从场景中提取角色信息"""
        try:
            characters_dict = {}
            
            for scene in scenes:
                required_elements = scene.get('required_elements', {})
                characters_list = required_elements.get('characters', [])
                
                for char_name in characters_list:
                    if char_name not in characters_dict and char_name != '人群':
                        # 创建基本的角色信息
                        characters_dict[char_name] = {
                            'name': char_name,
                            'gender': '未知',
                            'age': '未知',
                            'height': '未知',
                            'weight': '未知',
                            'appearance': f'{char_name}的外观描述',
                            'personality': f'{char_name}的性格特征',
                            'role': '角色',
                            'englishPrompt': f'masterpiece, best quality, ultra detailed, 8k, photorealistic, {char_name}'
                        }
            
            return list(characters_dict.values())
            
        except Exception as e:
            self.logger.error(f"Error extracting characters: {e}")
            return []
    
    def _standardize_scenes(self, scenes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """标准化场景数据"""
        try:
            standardized_scenes = []
            
            for scene in scenes:
                standardized_scene = {
                    'scene_id': scene.get('scene_id', 0),
                    'novel_fragment': scene.get('novel_fragment', ''),
                    'storyboard': scene.get('storyboard', ''),
                    'wan22_prompt': scene.get('wan22_prompt', ''),
                    'character_dialogue': scene.get('character_dialogue', ''),
                    'sound_effects': scene.get('sound_effects', ''),
                    'required_elements': scene.get('required_elements', {}),
                    'generated_at': datetime.now().isoformat() + 'Z',
                    'description': scene.get('storyboard', '')  # 使用storyboard作为description
                }
                
                # 添加elements_layout如果存在
                if 'elements_layout' in scene:
                    standardized_scene['elements_layout'] = scene['elements_layout']
                
                # 添加images字段如果存在
                if 'images' in scene:
                    standardized_scene['images'] = scene['images']
                
                # 添加generation_info字段如果存在
                if 'generation_info' in scene:
                    standardized_scene['generation_info'] = scene['generation_info']
                
                standardized_scenes.append(standardized_scene)
            
            return standardized_scenes
            
        except Exception as e:
            self.logger.error(f"Error standardizing scenes: {e}")
            return []
    
    def get_latest_storyboard_path(self, project_name: str) -> str:
        """获取latest_llm_response_storyboard_generation.json文件路径"""
        from backend.util.constant import get_project_base_dir
        
        project_dir = get_project_base_dir(project_name)
        return os.path.join(project_dir, 'latest_llm_response_storyboard_generation.json')
    
    def load_latest_storyboard_data(self, project_name: str) -> Optional[Dict[str, Any]]:
        """加载指定项目的最新分镜数据
        
        Args:
            project_name: 项目名称
            
        Returns:
            标准化的分镜数据
        """
        latest_file_path = self.get_latest_storyboard_path(project_name)
        return self.parse_latest_storyboard_file(latest_file_path)
    
    def save_latest_storyboard_data(self, project_name: str, storyboard_data: Dict[str, Any]) -> bool:
        """保存分镜数据到latest_llm_response_storyboard_generation.json文件
        
        Args:
            project_name: 项目名称
            storyboard_data: 分镜数据
            
        Returns:
            保存是否成功
        """
        try:
            from backend.util.constant import get_project_base_dir
            
            project_dir = get_project_base_dir(project_name)
            latest_file_path = os.path.join(project_dir, 'latest_llm_response_storyboard_generation.json')
            
            # 构建LLM响应格式的数据结构
            llm_response_data = {
                'choices': [{
                    'finish_reason': 'stop',
                    'index': 0,
                    'logprobs': None,
                    'message': {
                        'content': json.dumps(storyboard_data, ensure_ascii=False),
                        'role': 'assistant'
                    }
                }],
                'created': int(datetime.now().timestamp()),
                'model': 'gpt-4',
                'object': 'chat.completion'
            }
            
            # 保存到文件
            with open(latest_file_path, 'w', encoding='utf-8') as f:
                json.dump(llm_response_data, f, ensure_ascii=False, indent=2)
            
            self.logger.info(f"Storyboard data saved to {latest_file_path}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error saving storyboard data: {e}")
            return False