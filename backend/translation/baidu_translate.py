import hashlib
import random
import time
import requests
import json
from typing import Optional, Dict, Any
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BaiduTranslator:
    """百度翻译API服务类"""
    
    def __init__(self, app_id: str, secret_key: str):
        """
        初始化百度翻译服务
        
        Args:
            app_id: 百度翻译API的APP ID
            secret_key: 百度翻译API的密钥
        """
        self.app_id = app_id
        self.secret_key = secret_key
        self.api_url = 'https://fanyi-api.baidu.com/api/trans/vip/translate'
    
    def _generate_sign(self, query: str, salt: str) -> str:
        """
        生成百度翻译API签名
        
        Args:
            query: 待翻译文本
            salt: 随机数
            
        Returns:
            签名字符串
        """
        # 拼接字符串：appid+q+salt+密钥
        sign_str = self.app_id + query + salt + self.secret_key
        # MD5加密
        md5 = hashlib.md5()
        md5.update(sign_str.encode('utf-8'))
        return md5.hexdigest()
    
    def translate(self, text: str, from_lang: str = 'zh', to_lang: str = 'en') -> Optional[Dict[str, Any]]:
        """
        翻译文本
        
        Args:
            text: 待翻译的文本
            from_lang: 源语言，默认为中文(zh)
            to_lang: 目标语言，默认为英文(en)
            
        Returns:
            翻译结果字典，包含原文和译文
        """
        try:
            # 生成随机数
            salt = str(random.randint(32768, 65536))
            
            # 生成签名
            sign = self._generate_sign(text, salt)
            
            # 构建请求参数
            params = {
                'q': text,
                'from': from_lang,
                'to': to_lang,
                'appid': self.app_id,
                'salt': salt,
                'sign': sign
            }
            
            # 发送请求
            response = requests.get(self.api_url, params=params, timeout=10)
            response.raise_for_status()
            
            # 解析响应
            result = response.json()
            
            # 检查是否有错误
            if 'error_code' in result:
                error_code = result['error_code']
                error_msg = self._get_error_message(error_code)
                logger.error(f'百度翻译API错误: {error_code} - {error_msg}')
                return {
                    'success': False,
                    'error_code': error_code,
                    'error_message': error_msg,
                    'original_text': text
                }
            
            # 提取翻译结果
            if 'trans_result' in result and result['trans_result']:
                translated_text = result['trans_result'][0]['dst']
                logger.info(f'翻译成功: {text[:50]}... -> {translated_text[:50]}...')
                return {
                    'success': True,
                    'original_text': text,
                    'translated_text': translated_text,
                    'from_lang': from_lang,
                    'to_lang': to_lang
                }
            else:
                logger.error('百度翻译API返回结果格式异常')
                return {
                    'success': False,
                    'error_message': '翻译结果格式异常',
                    'original_text': text
                }
                
        except requests.exceptions.Timeout:
            logger.error('百度翻译API请求超时')
            return {
                'success': False,
                'error_message': '请求超时',
                'original_text': text
            }
        except requests.exceptions.RequestException as e:
            logger.error(f'百度翻译API请求异常: {e}')
            return {
                'success': False,
                'error_message': f'网络请求异常: {str(e)}',
                'original_text': text
            }
        except Exception as e:
            logger.error(f'翻译过程中发生未知错误: {e}')
            return {
                'success': False,
                'error_message': f'未知错误: {str(e)}',
                'original_text': text
            }
    
    def _get_error_message(self, error_code: str) -> str:
        """
        根据错误代码获取错误信息
        
        Args:
            error_code: 百度翻译API错误代码
            
        Returns:
            错误信息描述
        """
        error_messages = {
            '52001': 'APP ID无效',
            '52002': '签名错误',
            '52003': '访问频率受限',
            '54000': '必填参数为空',
            '54001': '签名错误',
            '54003': '访问频率受限',
            '54004': '账户余额不足',
            '54005': '长query请求频繁',
            '58000': '客户端IP非法',
            '58001': '译文语言方向不支持',
            '58002': '服务当前已关闭',
            '90107': '认证未通过或未生效'
        }
        return error_messages.get(error_code, f'未知错误代码: {error_code}')
    
    def batch_translate(self, texts: list, from_lang: str = 'zh', to_lang: str = 'en') -> Dict[str, Any]:
        """
        批量翻译文本
        
        Args:
            texts: 待翻译的文本列表
            from_lang: 源语言，默认为中文(zh)
            to_lang: 目标语言，默认为英文(en)
            
        Returns:
            批量翻译结果
        """
        results = []
        failed_count = 0
        
        for i, text in enumerate(texts):
            if not text or not text.strip():
                results.append({
                    'index': i,
                    'success': False,
                    'error_message': '文本为空',
                    'original_text': text
                })
                failed_count += 1
                continue
            
            # 添加延时避免频率限制
            if i > 0:
                time.sleep(0.1)
            
            result = self.translate(text.strip(), from_lang, to_lang)
            result['index'] = i
            results.append(result)
            
            if not result.get('success', False):
                failed_count += 1
        
        return {
            'total_count': len(texts),
            'success_count': len(texts) - failed_count,
            'failed_count': failed_count,
            'results': results
        }


# 全局翻译器实例
_translator_instance = None

def get_translator() -> BaiduTranslator:
    """
    获取百度翻译器实例（单例模式）
    
    Returns:
        百度翻译器实例
    """
    global _translator_instance
    if _translator_instance is None:
        # 百度翻译API配置
        APP_ID = '20250114002253283'
        SECRET_KEY = '8L9oJlSiVIfJvdqbPz_P'
        _translator_instance = BaiduTranslator(APP_ID, SECRET_KEY)
    return _translator_instance


def translate_text(text: str, from_lang: str = 'zh', to_lang: str = 'en') -> Dict[str, Any]:
    """
    翻译单个文本的便捷函数
    
    Args:
        text: 待翻译文本
        from_lang: 源语言
        to_lang: 目标语言
        
    Returns:
        翻译结果
    """
    translator = get_translator()
    return translator.translate(text, from_lang, to_lang)


def translate_prompts(prompts: list) -> Dict[str, Any]:
    """
    翻译提示词列表的便捷函数
    
    Args:
        prompts: 中文提示词列表
        
    Returns:
        批量翻译结果
    """
    translator = get_translator()
    return translator.batch_translate(prompts, 'zh', 'en')