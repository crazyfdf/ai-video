#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试主体和分镜的增删改查操作
验证文件管理是否正确处理名称冲突、位置变化等情况
"""

import json
import os
import requests
import time
from typing import Dict, List

# 测试配置
BASE_URL = "http://localhost:1198"
TEST_PROJECT = "测试项目CRUD"

class CRUDTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.project_name = TEST_PROJECT
        self.test_results = []
    
    def log_test(self, test_name: str, success: bool, message: str = ""):
        """记录测试结果"""
        status = "✓" if success else "✗"
        print(f"{status} {test_name}: {message}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message
        })
    
    def test_character_subject_operations(self):
        """测试角色主体的增删改查操作"""
        print("\n=== 测试角色主体操作 ===")
        
        # 1. 创建初始角色主体
        initial_characters = [
            {
                "id": 1,
                "name": "张三",
                "description": "主角，年轻的冒险者",
                "tag": "young adventurer, brave, determined",
                "images": ["http://example.com/zhangsan.jpg"],
                "createdAt": "2024-01-01T00:00:00Z",
                "selectedLora": "adventure_style"
            },
            {
                "id": 2,
                "name": "李四",
                "description": "智者，经验丰富的导师",
                "tag": "wise mentor, experienced, calm",
                "images": ["http://example.com/lisi.jpg"],
                "createdAt": "2024-01-01T00:00:00Z",
                "selectedLora": "wisdom_style"
            }
        ]
        
        # 保存初始角色
        response = self._save_subjects(initial_characters, [])
        self.log_test("创建初始角色主体", response.status_code == 200, f"状态码: {response.status_code}")
        
        # 验证文件是否正确创建
        char_dir = f"d:\\novel2video\\temp\\{self.project_name}\\character"
        expected_files = ["张三.json", "李四.json"]
        actual_files = os.listdir(char_dir) if os.path.exists(char_dir) else []
        files_match = all(f in actual_files for f in expected_files)
        self.log_test("角色文件正确创建", files_match, f"期望: {expected_files}, 实际: {actual_files}")
        
        # 2. 测试名称冲突处理
        conflict_characters = initial_characters + [
            {
                "id": 3,
                "name": "张三",  # 重复名称
                "description": "另一个张三",
                "tag": "another character",
                "images": ["http://example.com/zhangsan2.jpg"],
                "createdAt": "2024-01-01T00:00:00Z",
                "selectedLora": "default"
            }
        ]
        
        response = self._save_subjects(conflict_characters, [])
        self.log_test("处理名称冲突", response.status_code == 200, f"状态码: {response.status_code}")
        
        # 验证冲突处理
        actual_files = os.listdir(char_dir) if os.path.exists(char_dir) else []
        has_conflict_resolution = "张三_1.json" in actual_files or len([f for f in actual_files if f.startswith("张三")]) > 1
        self.log_test("名称冲突正确处理", has_conflict_resolution, f"文件: {actual_files}")
        
        # 3. 测试主体名称修改
        modified_characters = [
            {
                "id": 1,
                "name": "张三丰",  # 修改名称
                "description": "主角，年轻的冒险者",
                "tag": "young adventurer, brave, determined",
                "images": ["http://example.com/zhangsanfeng.jpg"],
                "createdAt": "2024-01-01T00:00:00Z",
                "selectedLora": "adventure_style"
            },
            {
                "id": 2,
                "name": "李四",
                "description": "智者，经验丰富的导师",
                "tag": "wise mentor, experienced, calm",
                "images": ["http://example.com/lisi.jpg"],
                "createdAt": "2024-01-01T00:00:00Z",
                "selectedLora": "wisdom_style"
            }
        ]
        
        response = self._save_subjects(modified_characters, [])
        self.log_test("修改主体名称", response.status_code == 200, f"状态码: {response.status_code}")
        
        # 验证旧文件被清理，新文件被创建
        actual_files = os.listdir(char_dir) if os.path.exists(char_dir) else []
        has_new_name = "张三丰.json" in actual_files
        no_old_name = "张三.json" not in actual_files
        self.log_test("名称修改文件管理", has_new_name and no_old_name, f"文件: {actual_files}")
        
        # 4. 测试删除主体
        reduced_characters = [modified_characters[1]]  # 只保留李四
        
        response = self._save_subjects(reduced_characters, [])
        self.log_test("删除主体", response.status_code == 200, f"状态码: {response.status_code}")
        
        # 验证文件被正确删除
        actual_files = os.listdir(char_dir) if os.path.exists(char_dir) else []
        only_lisi = actual_files == ["李四.json"]
        self.log_test("删除主体文件管理", only_lisi, f"文件: {actual_files}")
    
    def test_scene_subject_operations(self):
        """测试场景主体的增删改查操作"""
        print("\n=== 测试场景主体操作 ===")
        
        # 类似角色主体的测试逻辑
        initial_scenes = [
            {
                "id": 1,
                "name": "森林",
                "description": "神秘的古老森林",
                "tag": "ancient forest, mysterious, dark",
                "images": ["http://example.com/forest.jpg"],
                "createdAt": "2024-01-01T00:00:00Z",
                "selectedLora": "nature_style"
            }
        ]
        
        response = self._save_subjects([], initial_scenes)
        self.log_test("创建场景主体", response.status_code == 200, f"状态码: {response.status_code}")
        
        # 验证场景文件
        scene_dir = f"d:\\novel2video\\temp\\{self.project_name}\\scene"
        actual_files = os.listdir(scene_dir) if os.path.exists(scene_dir) else []
        has_scene_file = "森林.json" in actual_files
        self.log_test("场景文件正确创建", has_scene_file, f"文件: {actual_files}")
    
    def test_storyboard_operations(self):
        """测试分镜的增删改查操作"""
        print("\n=== 测试分镜操作 ===")
        
        # 1. 创建初始分镜
        initial_storyboards = [
            {
                "scene_id": 1,
                "novel_fragment": "张三走进了森林",
                "storyboard": "主角进入神秘森林的场景",
                "wan22_prompt": "forest entrance scene",
                "character_dialogue": "张三：这里看起来很神秘",
                "sound_effects": "风声，树叶沙沙声",
                "elements_layout": [],
                "required_elements": {},
                "description": "开场场景",
                "images": [],
                "generation_info": {}
            },
            {
                "scene_id": 2,
                "novel_fragment": "他遇到了李四",
                "storyboard": "两人相遇的场景",
                "wan22_prompt": "character meeting scene",
                "character_dialogue": "李四：年轻人，你来这里做什么？",
                "sound_effects": "脚步声",
                "elements_layout": [],
                "required_elements": {},
                "description": "角色相遇",
                "images": [],
                "generation_info": {}
            }
        ]
        
        response = self._save_storyboards(initial_storyboards)
        self.log_test("创建初始分镜", response.status_code == 200, f"状态码: {response.status_code}")
        
        # 验证分镜文件
        storyboard_dir = f"d:\\novel2video\\temp\\{self.project_name}\\storyboard"
        expected_files = ["storyboard_1.json", "storyboard_2.json"]
        actual_files = os.listdir(storyboard_dir) if os.path.exists(storyboard_dir) else []
        files_match = all(f in actual_files for f in expected_files)
        self.log_test("分镜文件正确创建", files_match, f"期望: {expected_files}, 实际: {actual_files}")
        
        # 2. 测试分镜位置变化（重新排序）
        reordered_storyboards = [initial_storyboards[1], initial_storyboards[0]]  # 交换顺序
        
        response = self._save_storyboards(reordered_storyboards)
        self.log_test("分镜位置变化", response.status_code == 200, f"状态码: {response.status_code}")
        
        # 验证文件重新组织
        actual_files = os.listdir(storyboard_dir) if os.path.exists(storyboard_dir) else []
        still_has_files = len(actual_files) == 2
        self.log_test("分镜重新组织", still_has_files, f"文件: {actual_files}")
        
        # 3. 测试删除分镜
        reduced_storyboards = [reordered_storyboards[0]]  # 只保留一个
        
        response = self._save_storyboards(reduced_storyboards)
        self.log_test("删除分镜", response.status_code == 200, f"状态码: {response.status_code}")
        
        # 验证文件被正确删除
        actual_files = os.listdir(storyboard_dir) if os.path.exists(storyboard_dir) else []
        only_one_file = len(actual_files) == 1 and "storyboard_1.json" in actual_files
        self.log_test("删除分镜文件管理", only_one_file, f"文件: {actual_files}")
    
    def _save_subjects(self, characters: List[Dict], scenes: List[Dict]):
        """保存主体数据"""
        data = {
            "projectName": self.project_name,
            "characterSubjects": characters,
            "sceneSubjects": scenes
        }
        return requests.post(f"{self.base_url}/api/save/subjects", json=data)
    
    def _save_storyboards(self, storyboards: List[Dict]):
        """保存分镜数据"""
        data = {
            "projectName": self.project_name,
            "storyboards": storyboards
        }
        return requests.post(f"{self.base_url}/api/save/storyboard/descriptions", json=data)
    
    def run_all_tests(self):
        """运行所有测试"""
        print(f"开始测试项目: {self.project_name}")
        print(f"后端地址: {self.base_url}")
        
        try:
            self.test_character_subject_operations()
            self.test_scene_subject_operations()
            self.test_storyboard_operations()
        except Exception as e:
            print(f"测试过程中出现错误: {e}")
        
        # 输出测试总结
        print("\n=== 测试总结 ===")
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        print(f"总测试数: {total_tests}")
        print(f"通过: {passed_tests}")
        print(f"失败: {failed_tests}")
        if total_tests > 0:
            print(f"成功率: {passed_tests/total_tests*100:.1f}%")
        else:
            print("成功率: 无测试运行")
        
        if failed_tests > 0:
            print("\n失败的测试:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['message']}")

if __name__ == "__main__":
    tester = CRUDTester()
    tester.run_all_tests()