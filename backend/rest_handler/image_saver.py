import json
import logging
import os
import requests
from flask import request, jsonify
from datetime import datetime

from backend.util.constant import image_dir

def save_image_to_temp():
    """保存图片到temp/{project_name}/image文件夹"""
    try:
        data = request.json
        if not data or 'index' not in data or 'imageUrl' not in data:
            return jsonify({'error': 'Invalid data provided'}), 400
        
        index = data['index']
        image_url = data['imageUrl']
        description = data.get('description', '')
        project_name = data.get('projectName', 'default')
        
        # 创建项目专用的image目录
        project_image_dir = os.path.join('temp', project_name, 'image')
        os.makedirs(project_image_dir, exist_ok=True)
        
        # 下载图片
        try:
            response = requests.get(image_url, timeout=30)
            response.raise_for_status()
            
            # 确定文件扩展名
            content_type = response.headers.get('content-type', '')
            if 'jpeg' in content_type or 'jpg' in content_type:
                ext = '.jpg'
            elif 'png' in content_type:
                ext = '.png'
            elif 'webp' in content_type:
                ext = '.webp'
            else:
                ext = '.jpg'  # 默认使用jpg
            
            # 保存图片文件
            image_filename = f'{index}{ext}'
            image_path = os.path.join(project_image_dir, image_filename)
            
            with open(image_path, 'wb') as f:
                f.write(response.content)
            
            # 保存图片信息到JSON文件
            info_data = {
                'index': index,
                'filename': image_filename,
                'original_url': image_url,
                'description': description,
                'project_name': project_name,
                'saved_at': datetime.now().isoformat(),
                'file_size': len(response.content)
            }
            
            info_path = os.path.join(project_image_dir, f'{index}_info.json')
            with open(info_path, 'w', encoding='utf-8') as f:
                json.dump(info_data, f, ensure_ascii=False, indent=2)
            
            # 更新图片索引文件
            update_image_index(index, info_data, project_name)
            
            logging.info(f"Image {index} saved successfully to project {project_name}: {image_filename}")
            return jsonify({
                'message': f'Image {index} saved successfully to project {project_name}',
                'filename': image_filename,
                'local_path': f'/temp/{project_name}/image/{image_filename}'
            }), 200
            
        except requests.RequestException as e:
            logging.error(f'Error downloading image: {e}')
            return jsonify({'error': f'Failed to download image: {str(e)}'}), 500
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def update_image_index(index, info_data, project_name='default'):
    """更新图片索引文件"""
    try:
        project_image_dir = os.path.join('temp', project_name, 'image')
        index_path = os.path.join(project_image_dir, 'image_index.json')
        
        # 读取现有索引
        image_index = {}
        if os.path.exists(index_path):
            with open(index_path, 'r', encoding='utf-8') as f:
                image_index = json.load(f)
        
        # 更新索引
        image_index[str(index)] = info_data
        
        # 保存索引
        with open(index_path, 'w', encoding='utf-8') as f:
            json.dump(image_index, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logging.error(f'Error updating image index for project {project_name}: {e}')


def load_images_from_temp():
    """从temp/image文件夹加载图片信息"""
    try:
        index_path = os.path.join(image_dir, 'image_index.json')
        
        if not os.path.exists(index_path):
            return jsonify({}), 200
        
        with open(index_path, 'r', encoding='utf-8') as f:
            image_index = json.load(f)
        
        # 构建返回数据，包含本地路径
        result = {}
        for index, info in image_index.items():
            result[index] = {
                'filename': info['filename'],
                'local_path': f'/images/{info["filename"]}',
                'description': info.get('description', ''),
                'saved_at': info.get('saved_at', ''),
                'file_size': info.get('file_size', 0)
            }
        
        logging.info(f"Images loaded successfully: {len(result)} images")
        return jsonify(result), 200
    except Exception as e:
        logging.error(f'Error loading images: {e}')
        return jsonify({'error': str(e)}), 500


def get_image_stats():
    """获取图片统计信息"""
    try:
        if not os.path.exists(image_dir):
            return {'total_images': 0, 'total_size': 0}
        
        total_images = 0
        total_size = 0
        
        for filename in os.listdir(image_dir):
            if filename.endswith(('.jpg', '.jpeg', '.png', '.webp')):
                total_images += 1
                file_path = os.path.join(image_dir, filename)
                total_size += os.path.getsize(file_path)
        
        return {
            'total_images': total_images,
            'total_size': total_size,
            'total_size_mb': round(total_size / (1024 * 1024), 2)
        }
        
    except Exception as e:
        logging.error(f'Error getting image stats: {e}')
        return {'total_images': 0, 'total_size': 0}