import requests
import json
import logging
from typing import Dict, List, Optional, Any
from flask import jsonify

logger = logging.getLogger(__name__)

class ComfyUILoRAManagerClient:
    """ComfyUI LoRA Manager API客户端"""
    
    def __init__(self, base_url: str = "http://localhost:8188"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.timeout = 30
    
    def _make_request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """发送HTTP请求"""
        url = f"{self.base_url}{endpoint}"
        try:
            response = self.session.request(method, url, **kwargs)
            response.raise_for_status()
            return response
        except requests.exceptions.RequestException as e:
            logger.error(f"ComfyUI LoRA Manager API request failed: {e}")
            raise
    
    def test_connection(self) -> bool:
        """测试与ComfyUI LoRA Manager的连接"""
        try:
            response = self._make_request('GET', '/loras')
            return response.status_code == 200
        except Exception as e:
            logger.error(f"ComfyUI LoRA Manager connection test failed: {e}")
            return False
    
    def get_loras(self) -> Optional[List[Dict]]:
        """获取LoRA列表"""
        try:
            response = self._make_request('GET', '/api/loras')
            return response.json()
        except Exception as e:
            logger.error(f"Failed to get LoRAs: {e}")
            return None
    
    def get_recipes(self) -> Optional[List[Dict]]:
        """获取Recipes列表"""
        try:
            response = self._make_request('GET', '/api/recipes')
            return response.json()
        except Exception as e:
            logger.error(f"Failed to get recipes: {e}")
            return None
    
    def create_recipe(self, recipe_data: Dict) -> Optional[Dict]:
        """创建新的Recipe"""
        try:
            response = self._make_request('POST', '/api/recipes', json=recipe_data)
            return response.json()
        except Exception as e:
            logger.error(f"Failed to create recipe: {e}")
            return None
    
    def save_image_to_recipe(self, image_path: str, recipe_name: str, metadata: Dict) -> Optional[Dict]:
        """保存图片到Recipe"""
        try:
            # 构建Recipe数据
            recipe_data = {
                'name': recipe_name,
                'image_path': image_path,
                'metadata': metadata,
                'timestamp': metadata.get('timestamp'),
                'loras': metadata.get('loras', []),
                'prompt': metadata.get('prompt', ''),
                'negative_prompt': metadata.get('negative_prompt', ''),
                'settings': {
                    'steps': metadata.get('steps', 20),
                    'cfg_scale': metadata.get('cfg_scale', 7.0),
                    'sampler': metadata.get('sampler', 'euler'),
                    'scheduler': metadata.get('scheduler', 'normal'),
                    'seed': metadata.get('seed', -1),
                    'width': metadata.get('width', 512),
                    'height': metadata.get('height', 512)
                }
            }
            
            return self.create_recipe(recipe_data)
        except Exception as e:
            logger.error(f"Failed to save image to recipe: {e}")
            return None
    
    def get_civitai_models(self, query: str = '', limit: int = 20) -> Optional[Dict]:
        """通过ComfyUI LoRA Manager搜索Civitai模型"""
        try:
            params = {'query': query, 'limit': limit}
            response = self._make_request('GET', '/api/civitai/models', params=params)
            return response.json()
        except Exception as e:
            logger.error(f"Failed to search Civitai models: {e}")
            return None
    
    def download_model(self, model_url: str, save_path: str = None) -> Optional[Dict]:
        """下载模型"""
        try:
            data = {
                'url': model_url,
                'save_path': save_path
            }
            response = self._make_request('POST', '/api/download', json=data)
            return response.json()
        except Exception as e:
            logger.error(f"Failed to download model: {e}")
            return None

# 全局客户端实例
comfyui_lora_manager = ComfyUILoRAManagerClient()

# Flask路由处理函数
def test_comfyui_connection():
    """测试ComfyUI LoRA Manager连接"""
    try:
        is_connected = comfyui_lora_manager.test_connection()
        if is_connected:
            return jsonify({
                'status': 'success',
                'message': 'ComfyUI LoRA Manager connection successful',
                'url': comfyui_lora_manager.base_url
            }), 200
        else:
            return jsonify({
                'status': 'error',
                'message': 'ComfyUI LoRA Manager connection failed'
            }), 503
    except Exception as e:
        logger.error(f"ComfyUI LoRA Manager test error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'ComfyUI LoRA Manager test failed: {str(e)}'
        }), 500

def get_comfyui_loras():
    """获取ComfyUI LoRA Manager中的LoRA列表"""
    try:
        loras = comfyui_lora_manager.get_loras()
        if loras is not None:
            return jsonify({
                'status': 'success',
                'data': loras
            }), 200
        else:
            return jsonify({
                'status': 'error',
                'message': 'Failed to fetch LoRAs'
            }), 500
    except Exception as e:
        logger.error(f"Get LoRAs error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Get LoRAs failed: {str(e)}'
        }), 500

def get_comfyui_recipes():
    """获取ComfyUI LoRA Manager中的Recipes列表"""
    try:
        recipes = comfyui_lora_manager.get_recipes()
        if recipes is not None:
            return jsonify({
                'status': 'success',
                'data': recipes
            }), 200
        else:
            return jsonify({
                'status': 'error',
                'message': 'Failed to fetch recipes'
            }), 500
    except Exception as e:
        logger.error(f"Get recipes error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Get recipes failed: {str(e)}'
        }), 500

def save_image_to_comfyui_recipe():
    """保存生成的图片到ComfyUI LoRA Manager的Recipe"""
    from flask import request
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided'
            }), 400
        
        image_path = data.get('image_path')
        recipe_name = data.get('recipe_name')
        metadata = data.get('metadata', {})
        
        if not image_path or not recipe_name:
            return jsonify({
                'status': 'error',
                'message': 'image_path and recipe_name are required'
            }), 400
        
        result = comfyui_lora_manager.save_image_to_recipe(image_path, recipe_name, metadata)
        if result:
            return jsonify({
                'status': 'success',
                'message': 'Image saved to recipe successfully',
                'data': result
            }), 200
        else:
            return jsonify({
                'status': 'error',
                'message': 'Failed to save image to recipe'
            }), 500
    except Exception as e:
        logger.error(f"Save image to recipe error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Save image to recipe failed: {str(e)}'
        }), 500

def search_comfyui_civitai_models():
    """通过ComfyUI LoRA Manager搜索Civitai模型"""
    from flask import request
    
    try:
        query = request.args.get('query', '')
        limit = int(request.args.get('limit', 20))
        
        result = comfyui_lora_manager.get_civitai_models(query, limit)
        if result:
            return jsonify({
                'status': 'success',
                'data': result
            }), 200
        else:
            return jsonify({
                'status': 'error',
                'message': 'Failed to search Civitai models'
            }), 500
    except Exception as e:
        logger.error(f"Search Civitai models error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Search Civitai models failed: {str(e)}'
        }), 500