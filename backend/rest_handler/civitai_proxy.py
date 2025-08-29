from flask import request, jsonify
import requests
import logging
from typing import Dict, Any, Optional
import os

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

CIVITAI_API_KEY = '66947eb33d3c18e975a8aa520466d92a'
CIVITAI_BASE_URL = 'https://civitai.com/api/v1'

# Civitai镜像URL列表（按优先级排序）
CIVITAI_MIRROR_URLS = [
    "https://api.tzone03.xyz",  # 国内镜像API
    "https://civitai.com/api/v1",  # 主站点
    "https://api.civitai.com/v1",  # 备用API域名
]

# 代理配置 - 可以通过环境变量设置
PROXY_CONFIG = {
    'http': os.getenv('HTTP_PROXY'),
    'https': os.getenv('HTTPS_PROXY')
} if os.getenv('HTTP_PROXY') or os.getenv('HTTPS_PROXY') else None

def make_civitai_request(endpoint: str, params: dict = None, method: str = 'GET', timeout: int = 60):
    """
    通过多个镜像URL尝试访问Civitai API
    """
    headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Novel2Video/1.0'
    }
    
    if CIVITAI_API_KEY:
        headers['Authorization'] = f'Bearer {CIVITAI_API_KEY}'
    
    last_error = None
    
    for i, base_url in enumerate(CIVITAI_MIRROR_URLS):
        try:
            url = f"{base_url}{endpoint}"
            logger.info(f"Attempt {i+1}/{len(CIVITAI_MIRROR_URLS)}: Trying {method} request to: {url}")
            
            if PROXY_CONFIG:
                logger.info(f"Using proxy: {PROXY_CONFIG}")
            
            # 增加连接超时时间
            if method.upper() == 'GET':
                response = requests.get(url, params=params, headers=headers, timeout=(15, timeout), proxies=PROXY_CONFIG)
            elif method.upper() == 'POST':
                response = requests.post(url, json=params, headers=headers, timeout=(15, timeout), proxies=PROXY_CONFIG)
            else:
                raise ValueError(f'Unsupported HTTP method: {method}')
            
            # 如果请求成功，返回响应
            if response.status_code == 200:
                logger.info(f"Successfully connected to {url} (attempt {i+1})")
                return response
            else:
                logger.warning(f"Request to {url} failed with status {response.status_code}: {response.text[:200]}")
                last_error = f"HTTP {response.status_code}: {response.text[:200]}"
                
        except requests.exceptions.Timeout as e:
            logger.warning(f"Timeout connecting to {base_url}: {str(e)}")
            last_error = f"Timeout: {str(e)}"
            continue
        except requests.exceptions.ConnectionError as e:
            logger.warning(f"Connection error to {base_url}: {str(e)}")
            last_error = f"Connection error: {str(e)}"
            continue
        except requests.exceptions.RequestException as e:
            logger.warning(f"Request to {base_url} failed: {str(e)}")
            last_error = f"Request error: {str(e)}"
            continue
        except Exception as e:
            logger.warning(f"Unexpected error with {base_url}: {str(e)}")
            last_error = f"Unexpected error: {str(e)}"
            continue
    
    # 如果所有URL都失败了，抛出最后一个错误
    logger.error(f"All {len(CIVITAI_MIRROR_URLS)} Civitai URLs failed. Last error: {last_error}")
    raise requests.exceptions.RequestException(f"All Civitai URLs failed. Last error: {last_error}")

def proxy_civitai_request():
    """
    代理Civitai API请求，解决前端跨域问题
    """
    try:
        # 获取请求参数
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Missing request data'}), 400
        
        endpoint = data.get('endpoint')
        params = data.get('params', {})
        method = data.get('method', 'GET')
        
        if not endpoint:
            return jsonify({'error': 'Missing endpoint'}), 400
        
        # 构建完整的URL
        url = f"{CIVITAI_BASE_URL}{endpoint}"
        
        # 设置请求头
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Novel2Video/1.0'
        }
        
        if CIVITAI_API_KEY:
            headers['Authorization'] = f'Bearer {CIVITAI_API_KEY}'
        
        # 发送请求到Civitai API
        logger.info(f"Proxying request to Civitai: {method} {url}")
        if PROXY_CONFIG:
            logger.info(f"Using proxy: {PROXY_CONFIG}")
        
        if method.upper() == 'GET':
            response = requests.get(url, params=params, headers=headers, timeout=30, proxies=PROXY_CONFIG)
        elif method.upper() == 'POST':
            response = requests.post(url, json=params, headers=headers, timeout=30, proxies=PROXY_CONFIG)
        else:
            return jsonify({'error': f'Unsupported method: {method}'}), 400
        
        # 检查响应状态
        if response.status_code == 200:
            logger.info(f"Civitai API request successful: {response.status_code}")
            return jsonify(response.json())
        else:
            logger.error(f"Civitai API request failed: {response.status_code} - {response.text}")
            return jsonify({
                'error': f'Civitai API request failed: {response.status_code}',
                'details': response.text
            }), response.status_code
            
    except requests.exceptions.Timeout:
        logger.error("Civitai API request timeout")
        return jsonify({'error': 'Request timeout'}), 408
    except requests.exceptions.ConnectionError:
        logger.error("Civitai API connection error")
        return jsonify({'error': 'Connection error'}), 503
    except requests.exceptions.RequestException as e:
        logger.error(f"Civitai API request error: {str(e)}")
        return jsonify({'error': f'Request error: {str(e)}'}), 500
    except Exception as e:
        logger.error(f"Unexpected error in Civitai proxy: {str(e)}")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

def search_models():
    """
    搜索Civitai模型
    """
    try:
        # 获取查询参数
        params = {}
        for key in ['query', 'tag', 'username', 'types', 'sort', 'period', 'rating', 
                   'favorites', 'hidden', 'primaryFileOnly', 'allowNoCredit', 
                   'allowDerivatives', 'allowDifferentLicenses', 'allowCommercialUse', 
                   'nsfw', 'limit', 'page']:
            value = request.args.get(key)
            if value is not None:
                if key == 'types' and value:
                    # 处理数组参数
                    params[key] = value.split(',')
                elif key in ['favorites', 'hidden', 'primaryFileOnly', 'allowNoCredit', 
                           'allowDerivatives', 'allowDifferentLicenses', 'allowCommercialUse', 'nsfw']:
                    # 处理布尔参数
                    params[key] = value.lower() in ['true', '1', 'yes']
                elif key in ['rating', 'limit', 'page']:
                    # 处理数字参数
                    try:
                        params[key] = int(value)
                    except ValueError:
                        continue
                else:
                    params[key] = value
        
        # 发送请求
        logger.info(f"Searching Civitai models with params: {params}")
        response = make_civitai_request('/models', params=params, timeout=30)
        
        if response.status_code == 200:
            logger.info("Civitai models search successful")
            return jsonify(response.json())
        else:
            logger.error(f"Civitai models search failed: {response.status_code} - {response.text}")
            return jsonify({
                'error': f'Search failed: {response.status_code}',
                'details': response.text
            }), response.status_code
            
    except requests.exceptions.Timeout:
        logger.error("Civitai API search timeout")
        return jsonify({'error': 'Request timeout'}), 408
    except requests.exceptions.ConnectionError:
        logger.error("Civitai API search connection error")
        return jsonify({'error': 'Connection error'}), 503
    except Exception as e:
        logger.error(f"Civitai API search failed: {str(e)}")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

def get_model_by_id(model_id: int):
    """
    根据ID获取Civitai模型详情
    """
    try:
        logger.info(f"Getting Civitai model by ID: {model_id}")
        response = make_civitai_request(f'/models/{model_id}', timeout=30)
        
        if response.status_code == 200:
            logger.info(f"Civitai model {model_id} retrieved successfully")
            return jsonify(response.json())
        else:
            logger.error(f"Failed to get Civitai model {model_id}: {response.status_code} - {response.text}")
            return jsonify({
                'error': f'Failed to get model: {response.status_code}',
                'details': response.text
            }), response.status_code
            
    except requests.exceptions.Timeout:
        logger.error(f"Timeout getting Civitai model {model_id}")
        return jsonify({'error': 'Request timeout'}), 408
    except requests.exceptions.ConnectionError:
        logger.error(f"Connection error getting Civitai model {model_id}")
        return jsonify({'error': 'Connection error'}), 503
    except Exception as e:
        logger.error(f"Error getting Civitai model {model_id}: {str(e)}")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

def get_model_version_by_id(version_id: int):
    """
    根据ID获取Civitai模型版本详情
    """
    try:
        logger.info(f"Getting Civitai model version by ID: {version_id}")
        response = make_civitai_request(f'/model-versions/{version_id}', timeout=30)
        
        if response.status_code == 200:
            logger.info(f"Civitai model version {version_id} retrieved successfully")
            return jsonify(response.json())
        else:
            logger.error(f"Failed to get Civitai model version {version_id}: {response.status_code} - {response.text}")
            return jsonify({
                'error': f'Failed to get model version: {response.status_code}',
                'details': response.text
            }), response.status_code
            
    except requests.exceptions.Timeout:
        logger.error(f"Timeout getting Civitai model version {version_id}")
        return jsonify({'error': 'Request timeout'}), 408
    except requests.exceptions.ConnectionError:
        logger.error(f"Connection error getting Civitai model version {version_id}")
        return jsonify({'error': 'Connection error'}), 503
    except Exception as e:
        logger.error(f"Error getting Civitai model version {version_id}: {str(e)}")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

def test_civitai_connection():
    """
    测试Civitai API连接
    """
    try:
        # 测试参数
        params = {
            'limit': 1,
            'query': 'test'
        }
        
        logger.info("Testing Civitai API connection")
        response = make_civitai_request('/models', params=params, timeout=10)
        
        data = response.json()
        return jsonify({
            'status': 'success',
            'message': 'Civitai API connection successful',
            'data': {
                'total_items': data.get('metadata', {}).get('totalItems', 0),
                'response_time': response.elapsed.total_seconds()
            }
        })
            
    except requests.exceptions.Timeout:
        logger.error("Civitai API connection timeout")
        return jsonify({
            'status': 'error',
            'message': 'Civitai API connection timeout'
        }), 408
    except requests.exceptions.RequestException as e:
        logger.error(f"Civitai API connection failed: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Civitai API connection failed: {str(e)}'
        }), 500