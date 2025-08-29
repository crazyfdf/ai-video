import json
import logging
import os
from datetime import datetime

import requests
from flask import jsonify, request

from backend.util.constant import image_dir, get_project_dir


def save_image_to_temp():
    """保存图片到temp/{project_name}/scene_descriptions文件夹"""
    try:
        data = request.json
        if not data or "index" not in data or "imageUrl" not in data:
            return jsonify({"error": "Invalid data provided"}), 400

        index = data["index"]
        image_url = data["imageUrl"]
        description = data.get("description", "")
        project_name = data.get("projectName")
        if not project_name:
            return jsonify({"error": "No project selected"}), 400

        # 创建项目专用的scene_descriptions目录
        project_image_dir = get_project_dir(project_name, "scene_descriptions")
        os.makedirs(project_image_dir, exist_ok=True)

        # 判断是否为上传图片（需要下载保存）还是生成图片（只保存URL）
        is_upload = data.get("isUpload", False)  # 前端传递是否为上传图片的标志
        
        # 构建图片信息
        image_info = {
            "index": index,
            "original_url": image_url,
            "description": description,
            "project_name": project_name,
            "saved_at": datetime.now().isoformat(),
            "is_upload": is_upload
        }
        
        if is_upload:
            # 上传图片：下载并保存到本地
            try:
                response = requests.get(image_url, timeout=30)
                response.raise_for_status()

                # 确定文件扩展名
                content_type = response.headers.get("content-type", "")
                if "jpeg" in content_type or "jpg" in content_type:
                    ext = ".jpg"
                elif "png" in content_type:
                    ext = ".png"
                elif "webp" in content_type:
                    ext = ".webp"
                else:
                    ext = ".jpg"  # 默认使用jpg

                # 保存图片文件
                image_filename = f"{index}{ext}"
                image_path = os.path.join(project_image_dir, image_filename)

                with open(image_path, "wb") as f:
                    f.write(response.content)
                
                image_info["filename"] = image_filename
                image_info["file_size"] = len(response.content)
                image_info["local_path"] = f"/temp/{project_name}/scene_descriptions/{image_filename}"
                
            except requests.RequestException as e:
                logging.error(f"Error downloading image: {e}")
                return jsonify({"error": f"Failed to download image: {str(e)}"}), 500
        else:
            # 生成图片：只保存URL信息，不下载文件
            image_info["filename"] = None
            image_info["file_size"] = 0
            image_info["local_path"] = image_url  # 直接使用原始URL

        # 更新或创建图片索引文件
        index_path = os.path.join(project_image_dir, "image_index.json")
        if os.path.exists(index_path):
            with open(index_path, "r", encoding="utf-8") as f:
                index_data = json.load(f)
        else:
            index_data = {"images": {}}
        
        # 确保images字段存在且为字典
        if "images" not in index_data:
            index_data["images"] = {}
            
        index_data["images"][str(index)] = image_info
        
        with open(index_path, "w", encoding="utf-8") as f:
            json.dump(index_data, f, ensure_ascii=False, indent=2)

        logging.info(
            f"Image {index} {'downloaded and saved' if is_upload else 'URL saved'} successfully to project {project_name}: {image_info.get('filename') or 'URL only'}"
        )
        return (
            jsonify(
                {
                    "message": f"Image {index} {'saved' if is_upload else 'URL recorded'} successfully to project {project_name}",
                    "filename": image_info.get("filename"),
                    "local_path": image_info.get("local_path"),
                    "is_upload": is_upload
                }
            ),
            200,
        )



    except Exception as e:
        return jsonify({"error": str(e)}), 500


def update_image_index(index, info_data, project_name=None):
    """更新图片索引文件"""
    try:
        project_image_dir = get_project_dir(project_name, "scene_descriptions")
        index_path = os.path.join(project_image_dir, "image_index.json")

        # 读取现有索引
        image_index = {}
        if os.path.exists(index_path):
            with open(index_path, "r", encoding="utf-8") as f:
                image_index = json.load(f)

        # 更新索引
        image_index[str(index)] = info_data

        # 保存索引
        with open(index_path, "w", encoding="utf-8") as f:
            json.dump(image_index, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logging.error(f"Error updating image index for project {project_name}: {e}")


def load_images_from_temp():
    """从temp/{project_name}/scene_descriptions文件夹加载图片信息"""
    try:
        # 从查询参数获取项目名称，兼容 projectName 和 project_name
        project_name = request.args.get('projectName') or request.args.get('project_name')
        if not project_name:
            return jsonify({"error": "No project selected"}), 400
        project_image_dir = get_project_dir(project_name, "scene_descriptions")
        index_path = os.path.join(project_image_dir, "image_index.json")

        if not os.path.exists(index_path):
            return jsonify({}), 200

        with open(index_path, "r", encoding="utf-8") as f:
            image_index = json.load(f)

        # 构建返回数据，包含本地路径（指向 /temp/{project_name}/scene_descriptions）
        result = {}
        images_data = image_index.get("images", image_index)  # 兼容新旧格式
        for index, info in images_data.items():
            result[index] = {
                "filename": info.get("filename"),
                "local_path": info.get("local_path", f"/temp/{project_name}/scene_descriptions/{info.get('filename', '')}"),
                "description": info.get("description", ""),
                "saved_at": info.get("saved_at", ""),
                "file_size": info.get("file_size", 0),
            }

        logging.info(f"Images loaded successfully for project {project_name}: {len(result)} images")
        return jsonify(result), 200
    except Exception as e:
        logging.error(f"Error loading images: {e}")
        return jsonify({"error": str(e)}), 500


def get_image_stats():
    """获取图片统计信息"""
    try:
        if not os.path.exists(image_dir):
            return {"total_images": 0, "total_size": 0}

        total_images = 0
        total_size = 0

        for filename in os.listdir(image_dir):
            if filename.endswith((".jpg", ".jpeg", ".png", ".webp")):
                total_images += 1
                file_path = os.path.join(image_dir, filename)
                total_size += os.path.getsize(file_path)

        return {
            "total_images": total_images,
            "total_size": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
        }

    except Exception as e:
        logging.error(f"Error getting image stats: {e}")
        return {"total_images": 0, "total_size": 0}
