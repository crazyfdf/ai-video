from flask import Blueprint, request, jsonify
import os
import json
import requests
from datetime import datetime
from typing import Dict, List, Any
import logging
from ..util.file import ensure_directory_exists

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

lora_manager_bp = Blueprint('lora_manager', __name__)

# ComfyUI-LoRA-Manager 配置
COMFYUI_LORA_PATH = os.path.join(os.getcwd(), 'ComfyUI', 'models', 'loras')
COMFYUI_RECIPES_PATH = os.path.join(os.getcwd(), 'ComfyUI', 'custom_nodes', 'ComfyUI-LoRA-Manager', 'recipes')
CIVITAI_API_KEY = '66947eb33d3c18e975a8aa520466d92a'

@lora_manager_bp.route('/api/lora/download', methods=['POST'])
def download_lora():
    """下载 LoRA 模型到 ComfyUI 目录"""
    try:
        data = request.get_json()
        model_id = data.get('model_id')
        version_id = data.get('version_id')
        download_url = data.get('download_url')
        file_name = data.get('file_name')
        model_name = data.get('model_name', f'model_{model_id}')
        
        if not all([model_id, version_id, download_url, file_name]):
            return jsonify({
                'success': False,
                'error': '缺少必要参数: model_id, version_id, download_url, file_name'
            }), 400
        
        # 确保 LoRA 目录存在
        ensure_directory_exists(COMFYUI_LORA_PATH)
        
        # 构建文件路径
        safe_file_name = sanitize_filename(file_name)
        file_path = os.path.join(COMFYUI_LORA_PATH, safe_file_name)
        
        # 检查文件是否已存在
        if os.path.exists(file_path):
            logger.info(f'LoRA 文件已存在: {file_path}')
            return jsonify({
                'success': True,
                'message': 'LoRA 文件已存在',
                'file_path': file_path,
                'file_name': safe_file_name
            })
        
        # 下载文件
        logger.info(f'开始下载 LoRA: {download_url} -> {file_path}')
        
        headers = {}
        if CIVITAI_API_KEY:
            headers['Authorization'] = f'Bearer {CIVITAI_API_KEY}'
        
        response = requests.get(download_url, headers=headers, stream=True)
        response.raise_for_status()
        
        # 保存文件
        with open(file_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        
        logger.info(f'LoRA 下载完成: {file_path}')
        
        return jsonify({
            'success': True,
            'message': 'LoRA 下载成功',
            'file_path': file_path,
            'file_name': safe_file_name,
            'model_id': model_id,
            'version_id': version_id
        })
        
    except requests.RequestException as e:
        logger.error(f'下载 LoRA 失败: {e}')
        return jsonify({
            'success': False,
            'error': f'下载失败: {str(e)}'
        }), 500
    except Exception as e:
        logger.error(f'下载 LoRA 时发生错误: {e}')
        return jsonify({
            'success': False,
            'error': f'服务器错误: {str(e)}'
        }), 500

@lora_manager_bp.route('/api/lora/recipes/save', methods=['POST'])
def save_lora_recipe():
    """保存 LoRA 配方到 ComfyUI-LoRA-Manager"""
    try:
        data = request.get_json()
        recipe_type = data.get('type')  # 'character' 或 'scene'
        lora_info = data.get('lora_info')
        project_id = data.get('project_id')
        
        if not all([recipe_type, lora_info]):
            return jsonify({
                'success': False,
                'error': '缺少必要参数: type, lora_info'
            }), 400
        
        # 确保 Recipes 目录存在
        ensure_directory_exists(COMFYUI_RECIPES_PATH)
        
        # 构建配方文件名
        recipe_name = f"{project_id}_{recipe_type}_{lora_info.get('id', 'unknown')}"
        recipe_file = os.path.join(COMFYUI_RECIPES_PATH, f"{recipe_name}.json")
        
        # 构建配方数据
        recipe_data = {
            'name': recipe_name,
            'description': f"{recipe_type.title()} LoRA for {lora_info.get('name', 'Unknown')}",
            'type': recipe_type,
            'project_id': project_id,
            'lora_info': {
                'id': lora_info.get('id'),
                'name': lora_info.get('name'),
                'description': lora_info.get('description'),
                'model_version': lora_info.get('modelVersion', {}),
                'trained_words': lora_info.get('modelVersion', {}).get('trainedWords', []),
                'base_model': lora_info.get('modelVersion', {}).get('baseModel', ''),
                'download_url': lora_info.get('modelVersion', {}).get('downloadUrl', '')
            },
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat(),
            'civitai_model_id': lora_info.get('id'),
            'civitai_version_id': lora_info.get('modelVersion', {}).get('id')
        }
        
        # 保存配方文件
        with open(recipe_file, 'w', encoding='utf-8') as f:
            json.dump(recipe_data, f, ensure_ascii=False, indent=2)
        
        logger.info(f'LoRA 配方保存成功: {recipe_file}')
        
        return jsonify({
            'success': True,
            'message': 'LoRA 配方保存成功',
            'recipe_file': recipe_file,
            'recipe_name': recipe_name,
            'recipe_data': recipe_data
        })
        
    except Exception as e:
        logger.error(f'保存 LoRA 配方时发生错误: {e}')
        return jsonify({
            'success': False,
            'error': f'服务器错误: {str(e)}'
        }), 500

@lora_manager_bp.route('/api/lora/recipes/list', methods=['GET'])
def list_lora_recipes():
    """列出所有 LoRA 配方"""
    try:
        project_id = request.args.get('project_id')
        recipe_type = request.args.get('type')  # 可选过滤器
        
        if not os.path.exists(COMFYUI_RECIPES_PATH):
            return jsonify({
                'success': True,
                'recipes': [],
                'message': 'Recipes 目录不存在'
            })
        
        recipes = []
        
        # 遍历配方文件
        for file_name in os.listdir(COMFYUI_RECIPES_PATH):
            if file_name.endswith('.json'):
                file_path = os.path.join(COMFYUI_RECIPES_PATH, file_name)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        recipe_data = json.load(f)
                    
                    # 应用过滤器
                    if project_id and recipe_data.get('project_id') != project_id:
                        continue
                    
                    if recipe_type and recipe_data.get('type') != recipe_type:
                        continue
                    
                    recipes.append(recipe_data)
                    
                except Exception as e:
                    logger.warning(f'读取配方文件失败 {file_path}: {e}')
                    continue
        
        # 按创建时间排序
        recipes.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        return jsonify({
            'success': True,
            'recipes': recipes,
            'count': len(recipes)
        })
        
    except Exception as e:
        logger.error(f'列出 LoRA 配方时发生错误: {e}')
        return jsonify({
            'success': False,
            'error': f'服务器错误: {str(e)}'
        }), 500

@lora_manager_bp.route('/api/lora/recipes/delete', methods=['DELETE'])
def delete_lora_recipe():
    """删除 LoRA 配方"""
    try:
        data = request.get_json()
        recipe_name = data.get('recipe_name')
        
        if not recipe_name:
            return jsonify({
                'success': False,
                'error': '缺少必要参数: recipe_name'
            }), 400
        
        recipe_file = os.path.join(COMFYUI_RECIPES_PATH, f"{recipe_name}.json")
        
        if not os.path.exists(recipe_file):
            return jsonify({
                'success': False,
                'error': '配方文件不存在'
            }), 404
        
        os.remove(recipe_file)
        logger.info(f'LoRA 配方删除成功: {recipe_file}')
        
        return jsonify({
            'success': True,
            'message': 'LoRA 配方删除成功'
        })
        
    except Exception as e:
        logger.error(f'删除 LoRA 配方时发生错误: {e}')
        return jsonify({
            'success': False,
            'error': f'服务器错误: {str(e)}'
        }), 500

@lora_manager_bp.route('/api/lora/status', methods=['GET'])
def get_lora_manager_status():
    """获取 LoRA 管理器状态"""
    try:
        status = {
            'comfyui_lora_path': COMFYUI_LORA_PATH,
            'comfyui_recipes_path': COMFYUI_RECIPES_PATH,
            'lora_path_exists': os.path.exists(COMFYUI_LORA_PATH),
            'recipes_path_exists': os.path.exists(COMFYUI_RECIPES_PATH),
            'civitai_api_configured': bool(CIVITAI_API_KEY)
        }
        
        # 统计 LoRA 文件数量
        if status['lora_path_exists']:
            lora_files = [f for f in os.listdir(COMFYUI_LORA_PATH) if f.endswith(('.safetensors', '.ckpt', '.pt'))]
            status['lora_count'] = len(lora_files)
        else:
            status['lora_count'] = 0
        
        # 统计配方数量
        if status['recipes_path_exists']:
            recipe_files = [f for f in os.listdir(COMFYUI_RECIPES_PATH) if f.endswith('.json')]
            status['recipe_count'] = len(recipe_files)
        else:
            status['recipe_count'] = 0
        
        return jsonify({
            'success': True,
            'status': status
        })
        
    except Exception as e:
        logger.error(f'获取 LoRA 管理器状态时发生错误: {e}')
        return jsonify({
            'success': False,
            'error': f'服务器错误: {str(e)}'
        }), 500

def sanitize_filename(filename: str) -> str:
    """清理文件名，移除不安全字符"""
    import re
    # 移除或替换不安全字符
    filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
    # 移除多余的空格和点
    filename = re.sub(r'\s+', '_', filename.strip())
    filename = filename.strip('.')
    return filename


def save_lora_recommendations():
    """保存LoRA推荐结果到temp目录"""
    try:
        data = request.get_json()
        
        # 验证必要字段
        if not data:
            return jsonify({
                'success': False,
                'error': '请求数据为空'
            }), 400
        
        project_name = data.get('project_name')
        recommendations = data.get('recommendations')
        
        if not project_name:
            return jsonify({
                'success': False,
                'error': '缺少项目名称'
            }), 400
        
        if not recommendations or not isinstance(recommendations, list):
            return jsonify({
                'success': False,
                'error': 'LoRA推荐数据无效'
            }), 400
        
        # 验证推荐数据结构
        for i, rec in enumerate(recommendations):
            if not isinstance(rec, dict):
                return jsonify({
                    'success': False,
                    'error': f'推荐项 {i+1} 数据格式无效'
                }), 400
            
            required_fields = ['id', 'name', 'description']
            for field in required_fields:
                if field not in rec:
                    return jsonify({
                        'success': False,
                        'error': f'推荐项 {i+1} 缺少必要字段: {field}'
                    }), 400
        
        # 创建temp目录下的项目文件夹
        temp_dir = os.path.join(os.getcwd(), 'temp')
        project_temp_dir = os.path.join(temp_dir, project_name)
        ensure_directory_exists(project_temp_dir)
        
        # 保存推荐结果
        recommendations_file = os.path.join(project_temp_dir, 'lora_recommendations.json')
        
        save_data = {
            'project_name': project_name,
            'recommendations': recommendations,
            'generated_at': datetime.now().isoformat(),
            'total_count': len(recommendations)
        }
        
        with open(recommendations_file, 'w', encoding='utf-8') as f:
            json.dump(save_data, f, ensure_ascii=False, indent=2)
        
        logger.info(f'LoRA推荐结果已保存到: {recommendations_file}')
        
        return jsonify({
            'success': True,
            'message': 'LoRA推荐结果保存成功',
            'file_path': recommendations_file,
            'recommendations_count': len(recommendations)
        })
        
    except Exception as e:
        logger.error(f'保存LoRA推荐结果时发生错误: {e}')
        return jsonify({
            'success': False,
            'error': f'服务器错误: {str(e)}'
        }), 500