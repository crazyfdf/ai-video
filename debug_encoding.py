from backend.util.constant import get_project_base_dir, sanitize_project_name
import os
import json

# 模拟API请求
project_name = '猛鬼世界'
print(f'1. 原始项目名: {project_name}')
print(f'2. 项目名类型: {type(project_name)}')
print(f'3. 项目名编码: {project_name.encode("utf-8")}')

# 测试sanitize_project_name
sanitized = sanitize_project_name(project_name)
print(f'4. Sanitized项目名: {sanitized}')
print(f'5. Sanitized项目名类型: {type(sanitized)}')

# 测试get_project_base_dir
project_dir = get_project_base_dir(project_name)
print(f'6. 项目目录: {project_dir}')
print(f'7. 项目目录类型: {type(project_dir)}')

# 检查目录是否存在
print(f'8. 目录是否存在: {os.path.exists(project_dir)}')

# 构建文件路径
file_path = os.path.join(project_dir, 'unified_generation_novel.json')
print(f'9. 文件路径: {file_path}')
print(f'10. 文件是否存在: {os.path.exists(file_path)}')

# 模拟JSON请求数据
request_data = {'projectName': project_name}
print(f'11. 请求数据: {request_data}')
print(f'12. JSON序列化: {json.dumps(request_data, ensure_ascii=False)}')

# 检查temp目录下的实际文件夹
temp_dir = os.path.join(os.getcwd(), 'temp')
if os.path.exists(temp_dir):
    print(f'13. temp目录内容: {os.listdir(temp_dir)}')
    for item in os.listdir(temp_dir):
        item_path = os.path.join(temp_dir, item)
        if os.path.isdir(item_path):
            print(f'    - 目录: {item} (编码: {item.encode("utf-8")})')