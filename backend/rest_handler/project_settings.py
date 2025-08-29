"""项目设置管理器
负责项目设置的保存、加载和管理
"""

import json
import logging
import os
from datetime import datetime
from flask import jsonify, request
from backend.util.file import get_project_dir


def save_project_settings():
    """保存项目设置到JSON文件"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        project_name = data.get('projectName')
        if not project_name:
            return jsonify({"error": "Project name is required"}), 400
        
        # 构建项目设置数据
        settings = {
            "projectName": project_name,
            "projectInfo": {
                "id": data.get('projectId', project_name),
                "name": project_name,
                "description": data.get('description', ''),
                "createdAt": data.get('createdAt', datetime.now().isoformat()),
                "updatedAt": datetime.now().isoformat()
            },
            "defaultSizeConfig": data.get('defaultSizeConfig', {
                "aspectRatio": "16:9",
                "quality": "fhd",
                "width": 1920,
                "height": 1080
            }),
            "novelContent": data.get('novelContent', ''),
            "globalSettings": {
                "imageGeneration": {
                    "defaultAspectRatio": data.get('defaultSizeConfig', {}).get('aspectRatio', '16:9'),
                    "defaultQuality": data.get('defaultSizeConfig', {}).get('quality', 'fhd'),
                    "defaultWidth": data.get('defaultSizeConfig', {}).get('width', 1920),
                    "defaultHeight": data.get('defaultSizeConfig', {}).get('height', 1080)
                },
                "textGeneration": {
                    "baseNovelContent": data.get('novelContent', '')
                }
            },
            "lastUpdated": datetime.now().isoformat(),
            "version": "1.0.0"
        }
        
        # 获取项目目录
        project_dir = get_project_dir(project_name)
        if not os.path.exists(project_dir):
            os.makedirs(project_dir, exist_ok=True)
        
        # 保存项目设置文件
        settings_file = os.path.join(project_dir, "project_settings.json")
        with open(settings_file, 'w', encoding='utf-8') as f:
            json.dump(settings, f, ensure_ascii=False, indent=2)
        
        # 项目设置已保存到project_settings.json，不再需要project_info.json
        
        logging.info(f"Project settings saved successfully for project: {project_name}")
        
        return jsonify({
            "success": True,
            "message": "项目设置保存成功",
            "projectName": project_name,
            "settingsFile": settings_file
        }), 200
        
    except Exception as e:
        logging.error(f"Error saving project settings: {str(e)}")
        return jsonify({"error": f"保存项目设置失败: {str(e)}"}), 500


def load_project_settings():
    """加载项目设置"""
    try:
        project_name = request.args.get('projectName')
        if not project_name:
            return jsonify({"error": "Project name is required"}), 400
        
        # 获取项目目录
        project_dir = get_project_dir(project_name)
        settings_file = os.path.join(project_dir, "project_settings.json")
        
        if not os.path.exists(settings_file):
            # 如果设置文件不存在，返回默认设置
            default_settings = {
                "projectName": project_name,
                "projectInfo": {
                    "id": project_name,
                    "name": project_name,
                    "description": "",
                    "createdAt": datetime.now().isoformat(),
                    "updatedAt": datetime.now().isoformat()
                },
                "defaultSizeConfig": {
                    "aspectRatio": "16:9",
                    "quality": "fhd",
                    "width": 1920,
                    "height": 1080
                },
                "novelContent": "",
                "globalSettings": {
                    "imageGeneration": {
                        "defaultAspectRatio": "16:9",
                        "defaultQuality": "fhd",
                        "defaultWidth": 1920,
                        "defaultHeight": 1080
                    },
                    "textGeneration": {
                        "baseNovelContent": ""
                    }
                },
                "lastUpdated": datetime.now().isoformat(),
                "version": "1.0.0"
            }
            
            return jsonify(default_settings), 200
        
        # 读取设置文件
        with open(settings_file, 'r', encoding='utf-8') as f:
            settings = json.load(f)
        
        logging.info(f"Project settings loaded successfully for project: {project_name}")
        
        return jsonify(settings), 200
        
    except Exception as e:
        logging.error(f"Error loading project settings: {str(e)}")
        return jsonify({"error": f"加载项目设置失败: {str(e)}"}), 500


def get_global_settings():
    """获取全局设置（从默认项目或配置文件）"""
    try:
        # 直接返回系统默认设置，不再依赖default项目
        
        # 返回系统默认设置
        default_global_settings = {
            "defaultSizeConfig": {
                "aspectRatio": "16:9",
                "quality": "fhd",
                "width": 1920,
                "height": 1080
            },
            "novelContent": "",
            "globalSettings": {
                "imageGeneration": {
                    "defaultAspectRatio": "16:9",
                    "defaultQuality": "fhd",
                    "defaultWidth": 1920,
                    "defaultHeight": 1080
                },
                "textGeneration": {
                    "baseNovelContent": ""
                }
            }
        }
        
        return jsonify(default_global_settings), 200
        
    except Exception as e:
        logging.error(f"Error getting global settings: {str(e)}")
        return jsonify({"error": f"获取全局设置失败: {str(e)}"}), 500