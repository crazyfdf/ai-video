import logging
import requests
from flask import jsonify, request


def get_lora_list_proxy():
    """代理获取LoRA列表接口"""
    try:
        # 直接访问ai-comfyui.top的API
        response = requests.get(
            'https://ai-comfyui.top/api/draw/getLoraListById/68a91e69cb037f63d249afe8',
            timeout=30,
            verify=False  # 忽略SSL证书验证
        )
        
        if response.status_code == 200:
            lora_list = response.json()
            return jsonify(lora_list if isinstance(lora_list, list) else [])
        else:
            logging.error(f"Failed to fetch LoRA list: {response.status_code}")
            return jsonify([])  # 返回空列表作为备用
            
    except Exception as e:
        logging.error(f"Error fetching LoRA list: {e}")
        return jsonify([])  # 返回空列表作为备用


# 分区控制参数获取接口已移除，前端直接调用ai-comfyui.top接口


# 分区控制图片生成接口已移除，前端直接调用ai-comfyui.top接口