from flask import request, jsonify
import logging
from typing import Dict, Any, List
from ..translation.baidu_translate import translate_text, translate_prompts

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def translate_single_text():
    """
    翻译单个文本的API接口
    
    请求格式:
    {
        "text": "待翻译的中文文本",
        "from_lang": "zh",  # 可选，默认为中文
        "to_lang": "en"     # 可选，默认为英文
    }
    
    返回格式:
    {
        "success": true,
        "original_text": "原文",
        "translated_text": "译文",
        "from_lang": "zh",
        "to_lang": "en"
    }
    """
    try:
        data = request.get_json()
        
        # 验证请求数据
        if not data:
            return jsonify({
                'success': False,
                'error': '请求数据为空'
            }), 400
        
        text = data.get('text')
        if not text:
            return jsonify({
                'success': False,
                'error': '缺少待翻译文本'
            }), 400
        
        if not text.strip():
            return jsonify({
                'success': False,
                'error': '待翻译文本不能为空'
            }), 400
        
        from_lang = data.get('from_lang', 'zh')
        to_lang = data.get('to_lang', 'en')
        
        # 调用翻译服务
        result = translate_text(text.strip(), from_lang, to_lang)
        
        if result.get('success', False):
            logger.info(f'文本翻译成功: {text[:30]}...')
            return jsonify(result)
        else:
            logger.error(f'文本翻译失败: {result.get("error_message", "未知错误")}')
            return jsonify(result), 500
            
    except Exception as e:
        logger.error(f'翻译接口异常: {e}')
        return jsonify({
            'success': False,
            'error': f'服务器错误: {str(e)}'
        }), 500


def translate_batch_texts():
    """
    批量翻译文本的API接口
    
    请求格式:
    {
        "texts": ["文本1", "文本2", "文本3"],
        "from_lang": "zh",  # 可选，默认为中文
        "to_lang": "en"     # 可选，默认为英文
    }
    
    返回格式:
    {
        "success": true,
        "total_count": 3,
        "success_count": 3,
        "failed_count": 0,
        "results": [
            {
                "index": 0,
                "success": true,
                "original_text": "原文1",
                "translated_text": "译文1"
            },
            ...
        ]
    }
    """
    try:
        data = request.get_json()
        
        # 验证请求数据
        if not data:
            return jsonify({
                'success': False,
                'error': '请求数据为空'
            }), 400
        
        texts = data.get('texts')
        if not texts:
            return jsonify({
                'success': False,
                'error': '缺少待翻译文本列表'
            }), 400
        
        if not isinstance(texts, list):
            return jsonify({
                'success': False,
                'error': '文本列表格式无效'
            }), 400
        
        if len(texts) == 0:
            return jsonify({
                'success': False,
                'error': '文本列表不能为空'
            }), 400
        
        # 限制批量翻译数量
        if len(texts) > 50:
            return jsonify({
                'success': False,
                'error': '批量翻译文本数量不能超过50个'
            }), 400
        
        from_lang = data.get('from_lang', 'zh')
        to_lang = data.get('to_lang', 'en')
        
        # 调用批量翻译服务
        result = translate_prompts(texts)
        
        # 添加成功标识
        result['success'] = True
        
        logger.info(f'批量翻译完成: 总数{result["total_count"]}, 成功{result["success_count"]}, 失败{result["failed_count"]}')
        return jsonify(result)
        
    except Exception as e:
        logger.error(f'批量翻译接口异常: {e}')
        return jsonify({
            'success': False,
            'error': f'服务器错误: {str(e)}'
        }), 500


def translate_prompts_for_image_generation():
    """
    专门为图像生成翻译提示词的API接口
    
    请求格式:
    {
        "prompts": ["中文提示词1", "中文提示词2"],
        "project_name": "项目名称"  # 可选，用于日志记录
    }
    
    返回格式:
    {
        "success": true,
        "translated_prompts": ["English prompt 1", "English prompt 2"],
        "translation_details": [
            {
                "original": "中文提示词1",
                "translated": "English prompt 1",
                "success": true
            },
            ...
        ]
    }
    """
    try:
        data = request.get_json()
        
        # 验证请求数据
        if not data:
            return jsonify({
                'success': False,
                'error': '请求数据为空'
            }), 400
        
        prompts = data.get('prompts')
        if not prompts:
            return jsonify({
                'success': False,
                'error': '缺少提示词列表'
            }), 400
        
        # 支持字符串和列表两种格式
        if isinstance(prompts, str):
            prompts = [prompts]  # 将字符串转换为单元素列表
        elif not isinstance(prompts, list):
            return jsonify({
                'success': False,
                'error': '提示词格式无效，应为字符串或字符串列表'
            }), 400
        
        if len(prompts) == 0:
            return jsonify({
                'success': False,
                'error': '提示词列表不能为空'
            }), 400
        
        project_name = data.get('project_name', '未知项目')
        
        # 调用批量翻译服务
        batch_result = translate_prompts(prompts)
        
        # 处理翻译结果
        translated_prompts = []
        translation_details = []
        
        for result in batch_result['results']:
            if result.get('success', False):
                translated_prompts.append(result['translated_text'])
                translation_details.append({
                    'original': result['original_text'],
                    'translated': result['translated_text'],
                    'success': True
                })
            else:
                # 翻译失败时使用原文
                translated_prompts.append(result['original_text'])
                translation_details.append({
                    'original': result['original_text'],
                    'translated': result['original_text'],
                    'success': False,
                    'error': result.get('error_message', '翻译失败')
                })
        
        response_data = {
            'success': True,
            'translated_prompts': translated_prompts,
            'translation_details': translation_details,
            'total_count': batch_result['total_count'],
            'success_count': batch_result['success_count'],
            'failed_count': batch_result['failed_count']
        }
        
        logger.info(f'项目 {project_name} 的提示词翻译完成: 总数{batch_result["total_count"]}, 成功{batch_result["success_count"]}')
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f'提示词翻译接口异常: {e}')
        return jsonify({
            'success': False,
            'error': f'服务器错误: {str(e)}'
        }), 500


def test_translation_service():
    """
    测试翻译服务的API接口
    
    返回格式:
    {
        "success": true,
        "message": "翻译服务正常",
        "test_result": {
            "original": "测试文本",
            "translated": "Test text"
        }
    }
    """
    try:
        # 测试翻译一个简单的文本
        test_text = "测试文本"
        result = translate_text(test_text)
        
        if result.get('success', False):
            return jsonify({
                'success': True,
                'message': '翻译服务正常',
                'test_result': {
                    'original': result['original_text'],
                    'translated': result['translated_text']
                }
            })
        else:
            return jsonify({
                'success': False,
                'message': '翻译服务异常',
                'error': result.get('error_message', '未知错误')
            }), 500
            
    except Exception as e:
        logger.error(f'翻译服务测试异常: {e}')
        return jsonify({
            'success': False,
            'message': '翻译服务测试失败',
            'error': f'服务器错误: {str(e)}'
        }), 500