from backend.util.constant import sanitize_project_name, get_project_base_dir
import os

project_name = '猛鬼世界'
print(f'Original project name: {project_name}')
print(f'Sanitized project name: {sanitize_project_name(project_name)}')

path = get_project_base_dir(project_name)
file_path = os.path.join(path, 'unified_generation_novel.json')

print(f'Project dir: {path}')
print(f'File path: {file_path}')
print(f'File exists: {os.path.exists(file_path)}')
print(f'Directory exists: {os.path.exists(path)}')

# 列出目录内容
if os.path.exists(path):
    print(f'Directory contents: {os.listdir(path)}')
else:
    print('Directory does not exist')
    # 检查实际存在的目录
    temp_dir = os.path.join(os.getcwd(), 'temp')
    if os.path.exists(temp_dir):
        print(f'Temp directory contents: {os.listdir(temp_dir)}')