import json
import logging
import os
import re
import shutil
from typing import List

from backend.util.constant import config_path


def read_lines_from_directory_utf8(directory):
    if not os.path.exists(directory):
        logging.info(f"dir {directory} doesn't exist")
        return None, None
    try:
        files = os.listdir(directory)
    except OSError as e:
        print(f"Error reading directory {directory}: {e}")
        return None, e

    # Regular expression to extract numbers from filenames
    regex = re.compile(r"\d+")

    # List to store filenames and their corresponding numbers
    file_list = []

    for file in files:
        if file.endswith(".txt"):
            matches = regex.findall(file)
            if matches:
                try:
                    number = int(matches[0])
                    file_list.append((file, number))
                except ValueError:
                    continue

    # Sort files based on the extracted number
    file_list.sort(key=lambda x: x[1])

    lines = []
    for file, _ in file_list:
        try:
            with open(os.path.join(directory, file), "r", encoding="utf-8") as f:
                lines.append(f.read())
        except OSError as e:
            print(f"Error reading file {file}: {e}")
            continue

    return lines, None


def read_lines_from_directory(directory):
    if not os.path.exists(directory):
        logging.info(f"dir {directory} doesn't exist")
        return None, None
    try:
        files = os.listdir(directory)
    except OSError as e:
        print(f"Error reading directory {directory}: {e}")
        return None, e

    # Regular expression to extract numbers from filenames
    regex = re.compile(r"\d+")

    # List to store filenames and their corresponding numbers
    file_list = []

    for file in files:
        if file.endswith(".txt"):
            matches = regex.findall(file)
            if matches:
                try:
                    number = int(matches[0])
                    file_list.append((file, number))
                except ValueError:
                    continue

    # Sort files based on the extracted number
    file_list.sort(key=lambda x: x[1])

    lines = []
    for file, _ in file_list:
        try:
            with open(os.path.join(directory, file), "r", encoding="utf-8") as f:
                lines.append(f.read())
        except OSError as e:
            print(f"Error reading file {file}: {e}")
            continue

    return lines, None


def read_files_from_directory(dir_path: str) -> List[os.DirEntry]:
    """
    Reads all files from the specified directory, sorts them by numeric order
    extracted from their filenames, and returns them as a list of os.DirEntry objects.

    :param dir_path: Path to the directory containing the files.
    :return: List of os.DirEntry objects sorted by numeric order.
    """
    # Regular expression to extract numbers from filenames
    if not os.path.exists(dir_path):
        return []
    number_re = re.compile(r"\d+")

    # List to store tuples of (os.DirEntry, number)
    file_list = []

    # Iterate over directory entries
    with os.scandir(dir_path) as entries:
        for entry in entries:
            if entry.is_file():
                # Extract number from filename
                match = number_re.search(entry.name)
                if match:
                    number = int(match.group())
                    file_list.append((entry, number))

    # Sort files by the extracted number
    file_list.sort(key=lambda x: x[1])

    # Extract sorted os.DirEntry objects
    sorted_files = [entry.name for entry, _ in file_list]

    return sorted_files


def save_list_to_files(input_list, path, offset):
    try:
        for i, line in enumerate(input_list):
            file_path = os.path.join(path, f"{i + offset}.txt")
            with open(file_path, "w", encoding="utf-8") as file:
                file.write(line)
    except Exception as e:
        return e
    return None


def remove_all(directory):
    if os.path.exists(directory):
        shutil.rmtree(directory, ignore_errors=True)


def make_dir(directory):
    os.makedirs(directory, exist_ok=True)


def read_file(path):
    with open(path, "r", encoding="utf-8") as file:
        content = file.read()
        return content


def get_project_dir(project_name, sub_dir=None):
    """
    获取项目目录路径
    
    :param project_name: 项目名称
    :param sub_dir: 子目录名称（可选）
    :return: 项目目录的完整路径
    """
    base_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "temp", project_name)
    
    if sub_dir:
        full_path = os.path.join(base_dir, sub_dir)
    else:
        full_path = base_dir
    
    # 确保目录存在
    os.makedirs(full_path, exist_ok=True)
    
    return full_path


def get_config():
    if not os.path.exists(config_path) or os.path.getsize(config_path) == 0:
        with open(config_path, "w", encoding="utf-8") as file:
            json.dump(
                {
                    "address1": "",
                    "address2": "",
                    "address3": "",
                    "address3Type": "",
                    "comfyuiNodeApi": "",
                },
                file,
            )
    try:
        with open(config_path, "r", encoding="utf-8") as file:
            return json.load(file)
    except Exception as e:
        raise
