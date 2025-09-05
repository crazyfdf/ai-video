#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
验证unified_generation_novel.json文件格式的脚本
"""

import json
import os
import sys

# 添加backend路径
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.rest_handler.storyboard import validate_unified_generation_format

def validate_file(project_name):
    """验证指定项目的unified_generation_novel.json文件"""
    try:
        project_dir = f"d:\\novel2video\\temp\\{project_name}"
        file_path = os.path.join(project_dir, 'unified_generation_novel.json')
        
        print(f"验证文件: {file_path}")
        
        if not os.path.exists(file_path):
            print(f"❌ 文件不存在: {file_path}")
            return False
        
        # 读取文件
        with open(file_path, 'r', encoding='utf-8') as f:
            file_data = json.load(f)
        
        print(f"✅ 文件读取成功，大小: {os.path.getsize(file_path)} 字节")
        
        # 验证格式
        is_valid, message = validate_unified_generation_format(file_data)
        
        if is_valid:
            print(f"✅ 格式验证通过: {message}")
            
            # 检查content内容
            if 'choices' in file_data and len(file_data['choices']) > 0:
                content = file_data['choices'][0]['message']['content']
                if isinstance(content, str):
                    try:
                        parsed_content = json.loads(content)
                        print(f"✅ Content JSON解析成功")
                        
                        # 检查关键字段
                        if 'subjects' in parsed_content:
                            subjects = parsed_content['subjects']
                            print(f"✅ 包含subjects字段")
                            
                            if 'characters' in subjects:
                                print(f"  - 角色数量: {len(subjects['characters'])}")
                            if 'scenes' in subjects:
                                print(f"  - 场景数量: {len(subjects['scenes'])}")
                            if 'props' in subjects:
                                print(f"  - 道具数量: {len(subjects['props'])}")
                            if 'effects' in subjects:
                                print(f"  - 特效数量: {len(subjects['effects'])}")
                        
                        if 'storyboard' in parsed_content:
                            storyboard = parsed_content['storyboard']
                            print(f"✅ 包含storyboard字段，分镜数量: {len(storyboard)}")
                        
                        return True
                    except json.JSONDecodeError as e:
                        print(f"❌ Content JSON解析失败: {str(e)}")
                        return False
                else:
                    print(f"✅ Content是对象格式")
                    return True
            else:
                print(f"❌ 文件结构异常")
                return False
        else:
            print(f"❌ 格式验证失败: {message}")
            return False
            
    except Exception as e:
        print(f"❌ 验证过程中发生错误: {str(e)}")
        return False

if __name__ == "__main__":
    project_name = "猛鬼世界"
    print(f"开始验证项目 '{project_name}' 的unified_generation_novel.json文件格式...\n")
    
    success = validate_file(project_name)
    
    if success:
        print(f"\n🎉 项目 '{project_name}' 的文件格式验证通过！")
    else:
        print(f"\n💥 项目 '{project_name}' 的文件格式验证失败！")