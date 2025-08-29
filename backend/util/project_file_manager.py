"""
项目文件管理器
负责专业功能文件的保存、加载和管理
"""

import json
import logging
import os
import shutil
from datetime import datetime
from typing import Any, Dict, List, Optional


class ProjectFileManager:
    def __init__(self, base_path: str = None):
        # 如果没有指定base_path，使用当前工作目录下的temp文件夹
        if base_path is None:
            self.base_path = os.path.join(os.getcwd(), "temp")
        else:
            self.base_path = base_path
        self.logger = logging.getLogger(__name__)

        # 专业功能目录结构
        self.directories = {
            "character_voices": "character_voices",
            "scene_dialogues": "scene_dialogues",
            "scene_audio": "scene_audio",
            "art_style": "art_style",
        }

    def _ensure_directory_exists(self, directory_path: str) -> bool:
        """确保目录存在，如果不存在则创建"""
        try:
            os.makedirs(directory_path, exist_ok=True)
            return True
        except Exception as e:
            self.logger.error(f"Failed to create directory {directory_path}: {e}")
            return False

    def _get_project_path(self, project_name: str) -> str:
        """获取项目根目录路径"""
        return os.path.join(self.base_path, project_name)

    def _get_feature_directory(self, project_name: str, feature_type: str) -> str:
        """获取专业功能目录路径"""
        if feature_type not in self.directories:
            raise ValueError(f"Unknown feature type: {feature_type}")

        return os.path.join(
            self._get_project_path(project_name), self.directories[feature_type]
        )

    def _add_metadata(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """为数据添加元数据"""
        now = datetime.now().isoformat()
        if "createdAt" not in data:
            data["createdAt"] = now
        data["updatedAt"] = now
        return data

    def _save_json_file(self, file_path: str, data: Dict[str, Any]) -> bool:
        """保存JSON文件"""
        try:
            # 确保目录存在
            directory = os.path.dirname(file_path)
            if not self._ensure_directory_exists(directory):
                return False

            # 添加元数据
            data_with_metadata = self._add_metadata(data.copy())

            # 原子性写入：先写入临时文件，然后重命名
            temp_file = file_path + ".tmp"
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(data_with_metadata, f, ensure_ascii=False, indent=2)

            # 重命名为最终文件
            os.rename(temp_file, file_path)

            self.logger.info(f"Successfully saved file: {file_path}")
            return True

        except Exception as e:
            self.logger.error(f"Failed to save file {file_path}: {e}")
            # 清理临时文件
            temp_file = file_path + ".tmp"
            if os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                except:
                    pass
            return False

    def _load_json_file(self, file_path: str) -> Optional[Dict[str, Any]]:
        """加载JSON文件"""
        try:
            if not os.path.exists(file_path):
                self.logger.warning(f"File not found: {file_path}")
                return None

            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            self.logger.info(f"Successfully loaded file: {file_path}")
            return data

        except Exception as e:
            self.logger.error(f"Failed to load file {file_path}: {e}")
            return None

    def _create_backup(self, file_path: str) -> bool:
        """创建文件备份"""
        try:
            if not os.path.exists(file_path):
                return True

            backup_path = file_path + ".backup"
            shutil.copy2(file_path, backup_path)
            self.logger.info(f"Created backup: {backup_path}")
            return True

        except Exception as e:
            self.logger.error(f"Failed to create backup for {file_path}: {e}")
            return False

    # 角色音色配置管理
    def save_character_voice_profile(
        self, project_name: str, character_id: str, voice_profile: Dict[str, Any]
    ) -> bool:
        """保存角色音色配置"""
        try:
            directory = self._get_feature_directory(project_name, "character_voices")
            file_path = os.path.join(directory, f"{character_id}_voice_profile.json")

            # 创建备份
            self._create_backup(file_path)

            # 保存数据
            data = {
                "characterId": character_id,
                "voiceProfile": voice_profile,
                "projectName": project_name,
            }

            return self._save_json_file(file_path, data)

        except Exception as e:
            self.logger.error(f"Failed to save character voice profile: {e}")
            return False

    def load_character_voice_profile(
        self, project_name: str, character_id: str
    ) -> Optional[Dict[str, Any]]:
        """加载角色音色配置"""
        try:
            directory = self._get_feature_directory(project_name, "character_voices")
            file_path = os.path.join(directory, f"{character_id}_voice_profile.json")

            return self._load_json_file(file_path)

        except Exception as e:
            self.logger.error(f"Failed to load character voice profile: {e}")
            return None

    def list_character_voice_profiles(self, project_name: str) -> List[str]:
        """列出项目中所有角色音色配置"""
        try:
            directory = self._get_feature_directory(project_name, "character_voices")
            if not os.path.exists(directory):
                return []

            profiles = []
            for filename in os.listdir(directory):
                if filename.endswith("_voice_profile.json"):
                    character_id = filename.replace("_voice_profile.json", "")
                    profiles.append(character_id)

            return profiles

        except Exception as e:
            self.logger.error(f"Failed to list character voice profiles: {e}")
            return []

    # 分镜台词管理
    def save_scene_dialogue(
        self, project_name: str, scene_id: str, dialogue: Dict[str, Any]
    ) -> bool:
        """保存分镜台词"""
        try:
            directory = self._get_feature_directory(project_name, "scene_dialogues")
            file_path = os.path.join(directory, f"{scene_id}_dialogue.json")

            # 创建备份
            self._create_backup(file_path)

            # 保存数据
            data = {
                "sceneId": scene_id,
                "dialogue": dialogue,
                "projectName": project_name,
            }

            return self._save_json_file(file_path, data)

        except Exception as e:
            self.logger.error(f"Failed to save scene dialogue: {e}")
            return False

    def load_scene_dialogue(
        self, project_name: str, scene_id: str
    ) -> Optional[Dict[str, Any]]:
        """加载分镜台词"""
        try:
            directory = self._get_feature_directory(project_name, "scene_dialogues")
            file_path = os.path.join(directory, f"{scene_id}_dialogue.json")

            return self._load_json_file(file_path)

        except Exception as e:
            self.logger.error(f"Failed to load scene dialogue: {e}")
            return None

    def list_scene_dialogues(self, project_name: str) -> List[str]:
        """列出项目中所有分镜台词"""
        try:
            directory = self._get_feature_directory(project_name, "scene_dialogues")
            if not os.path.exists(directory):
                return []

            dialogues = []
            for filename in os.listdir(directory):
                if filename.endswith("_dialogue.json"):
                    scene_id = filename.replace("_dialogue.json", "")
                    dialogues.append(scene_id)

            return dialogues

        except Exception as e:
            self.logger.error(f"Failed to list scene dialogues: {e}")
            return []

    # 环境音效设计管理
    def save_audio_design(
        self, project_name: str, scene_id: str, audio_design: Dict[str, Any]
    ) -> bool:
        """保存音效设计"""
        try:
            directory = self._get_feature_directory(project_name, "scene_audio")
            file_path = os.path.join(directory, f"{scene_id}_audio_design.json")

            # 创建备份
            self._create_backup(file_path)

            # 保存数据
            data = {
                "sceneId": scene_id,
                "audioDesign": audio_design,
                "projectName": project_name,
            }

            return self._save_json_file(file_path, data)

        except Exception as e:
            self.logger.error(f"Failed to save audio design: {e}")
            return False

    def load_audio_design(
        self, project_name: str, scene_id: str
    ) -> Optional[Dict[str, Any]]:
        """加载音效设计"""
        try:
            directory = self._get_feature_directory(project_name, "scene_audio")
            file_path = os.path.join(directory, f"{scene_id}_audio_design.json")

            return self._load_json_file(file_path)

        except Exception as e:
            self.logger.error(f"Failed to load audio design: {e}")
            return None

    def list_audio_designs(self, project_name: str) -> List[str]:
        """列出项目中所有音效设计"""
        try:
            directory = self._get_feature_directory(project_name, "scene_audio")
            if not os.path.exists(directory):
                return []

            designs = []
            for filename in os.listdir(directory):
                if filename.endswith("_audio_design.json"):
                    scene_id = filename.replace("_audio_design.json", "")
                    designs.append(scene_id)

            return designs

        except Exception as e:
            self.logger.error(f"Failed to list audio designs: {e}")
            return []

    # 美术风格指南管理
    def save_art_style_guide(
        self, project_name: str, art_style_guide: Dict[str, Any]
    ) -> bool:
        """保存美术风格指南"""
        try:
            directory = self._get_feature_directory(project_name, "art_style")
            file_path = os.path.join(directory, "art_style_guide.json")

            # 创建备份
            self._create_backup(file_path)

            # 保存数据
            data = {"projectName": project_name, "artStyleGuide": art_style_guide}

            return self._save_json_file(file_path, data)

        except Exception as e:
            self.logger.error(f"Failed to save art style guide: {e}")
            return False

    def load_art_style_guide(self, project_name: str) -> Optional[Dict[str, Any]]:
        """加载美术风格指南"""
        try:
            directory = self._get_feature_directory(project_name, "art_style")
            file_path = os.path.join(directory, "art_style_guide.json")

            return self._load_json_file(file_path)

        except Exception as e:
            self.logger.error(f"Failed to load art style guide: {e}")
            return None

    # 项目管理功能
    def create_project_structure(self, project_name: str) -> bool:
        """创建项目的完整目录结构"""
        try:
            project_path = self._get_project_path(project_name)

            # 创建所有专业功能目录
            for feature_type in self.directories.keys():
                directory = self._get_feature_directory(project_name, feature_type)
                if not self._ensure_directory_exists(directory):
                    return False

            # 创建项目设置文件
            now = datetime.now().isoformat()
            project_settings = {
                "projectName": project_name,
                "projectInfo": {
                    "id": project_name,
                    "name": project_name,
                    "description": "",
                    "createdAt": now,
                    "updatedAt": now
                },
                "defaultSizeConfig": {
                    "aspectRatio": "16:9",
                    "quality": "fhd",
                    "width": 1920,
                    "height": 1080
                },
                "novelContent": "",
                "sceneTime": "",
                "globalSettings": {
                    "imageGeneration": {
                        "defaultAspectRatio": "16:9",
                        "defaultQuality": "fhd",
                        "defaultWidth": 1920,
                        "defaultHeight": 1080
                    },
                    "textGeneration": {
                        "baseNovelContent": ""
                    },
                    "sceneSettings": {
                        "defaultSceneTime": ""
                    }
                },
                "features": list(self.directories.keys()),
                "lastUpdated": now,
                "version": "1.0.0"
            }

            settings_file = os.path.join(project_path, "project_settings.json")
            self._save_json_file(settings_file, project_settings)

            self.logger.info(f"Created project structure for: {project_name}")
            return True

        except Exception as e:
            self.logger.error(f"Failed to create project structure: {e}")
            return False

    def delete_project(self, project_name: str) -> bool:
        """删除整个项目"""
        try:
            project_path = self._get_project_path(project_name)
            if os.path.exists(project_path):
                shutil.rmtree(project_path)
                self.logger.info(f"Deleted project: {project_name}")
            return True

        except Exception as e:
            self.logger.error(f"Failed to delete project {project_name}: {e}")
            return False

    def list_projects(self) -> List[str]:
        """列出所有项目"""
        try:
            if not os.path.exists(self.base_path):
                return []

            projects = []
            for item in os.listdir(self.base_path):
                item_path = os.path.join(self.base_path, item)
                if os.path.isdir(item_path):
                    # 检查是否有项目设置文件
                    settings_file = os.path.join(item_path, "project_settings.json")
                    if os.path.exists(settings_file):
                        projects.append(item)

            return projects

        except Exception as e:
            self.logger.error(f"Failed to list projects: {e}")
            return []

    def get_project_info(self, project_name: str) -> Optional[Dict[str, Any]]:
        """获取项目信息"""
        try:
            project_path = self._get_project_path(project_name)
            settings_file = os.path.join(project_path, "project_settings.json")

            settings = self._load_json_file(settings_file)
            if settings:
                # 返回项目信息部分
                return settings.get("projectInfo", {})
            return None

        except Exception as e:
            self.logger.error(f"Failed to get project info: {e}")
            return None

    def export_project_data(self, project_name: str, export_path: str) -> bool:
        """导出项目数据"""
        try:
            project_path = self._get_project_path(project_name)
            if not os.path.exists(project_path):
                self.logger.error(f"Project not found: {project_name}")
                return False

            # 创建导出目录
            os.makedirs(export_path, exist_ok=True)

            # 复制整个项目目录
            export_project_path = os.path.join(export_path, project_name)
            shutil.copytree(project_path, export_project_path)

            self.logger.info(f"Exported project {project_name} to {export_path}")
            return True

        except Exception as e:
            self.logger.error(f"Failed to export project: {e}")
            return False

    def import_project_data(self, import_path: str, project_name: str = None) -> bool:
        """导入项目数据"""
        try:
            if not os.path.exists(import_path):
                self.logger.error(f"Import path not found: {import_path}")
                return False

            # 如果没有指定项目名，使用目录名
            if not project_name:
                project_name = os.path.basename(import_path)

            project_path = self._get_project_path(project_name)

            # 如果项目已存在，创建备份
            if os.path.exists(project_path):
                backup_path = (
                    project_path + "_backup_" + datetime.now().strftime("%Y%m%d_%H%M%S")
                )
                shutil.move(project_path, backup_path)
                self.logger.info(f"Created backup: {backup_path}")

            # 复制导入的项目
            shutil.copytree(import_path, project_path)

            self.logger.info(f"Imported project to {project_name}")
            return True

        except Exception as e:
            self.logger.error(f"Failed to import project: {e}")
            return False


# 全局函数，用于其他模块直接调用
def get_project_dir(project_name: str, sub_dir: str = "") -> str:
    """获取项目目录路径的全局函数
    
    Args:
        project_name: 项目名称
        sub_dir: 子目录路径（可选）
    
    Returns:
        完整的项目目录路径
    """
    base_path = os.path.join(os.getcwd(), "temp")
    project_path = os.path.join(base_path, project_name)
    
    if sub_dir:
        return os.path.join(project_path, sub_dir)
    else:
        return project_path
