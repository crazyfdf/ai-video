import json
import logging
import os

from flask import jsonify, request

from backend.util.constant import character_dir, get_project_dir


def save_character_info():
    """保存角色信息到projects/{project_name}/character文件夹和temp目录"""
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # JSON格式校验
        try:
            # 验证数据结构完整性
            if not isinstance(data, dict):
                raise ValueError("数据必须是JSON对象格式")
            

            
            if "characters" not in data or not isinstance(data["characters"], list):
                raise ValueError("缺少有效的角色列表(characters)字段")
            
            # 验证角色数据完整性
            for i, character in enumerate(data["characters"]):
                if not isinstance(character, dict):
                    raise ValueError(f"角色{i+1}数据格式错误")
                
                required_fields = ["name", "gender", "appearance"]
                for field in required_fields:
                    if field not in character or not character[field]:
                        raise ValueError(f"角色{i+1}缺少必需字段: {field}")
            
            # 尝试序列化验证JSON格式
            json.dumps(data, ensure_ascii=False)
            
        except (ValueError, TypeError) as validation_error:
            logging.error(f"JSON格式校验失败: {validation_error}")
            return jsonify({"error": f"数据格式校验失败: {str(validation_error)}"}), 400

        project_name = data.get("projectName")
        if not project_name:
            return jsonify({"error": "No project selected"}), 400

        # 创建项目专用的character目录
        project_character_dir = get_project_dir(project_name, "character")
        os.makedirs(project_character_dir, exist_ok=True)



        # 保存每个角色的详细信息到individual文件
        if "characters" in data:
            for i, character in enumerate(data["characters"]):
                char_file_path = os.path.join(
                    project_character_dir, f"character_{i}.json"
                )
                with open(char_file_path, "w", encoding="utf-8") as f:
                    json.dump(character, f, ensure_ascii=False, indent=2)

        # 注意：角色信息已经保存到正确的temp/{project_name}/character目录
        # 不需要重复保存到其他位置

        logging.info(f"Character info saved successfully to project {project_name}")
        return (
            jsonify(
                {
                    "message": f"Character info saved successfully to project {project_name}",
                    "validation_status": "passed",
                    "characters_count": len(data.get("characters", [])),
                    "temp_path": project_character_dir
                }
            ),
            200,
        )

    except Exception as e:
        logging.error(f"Error saving character info: {e}")
        return jsonify({"error": str(e)}), 500


def load_character_info():
    """从individual character_X.json文件重新构建角色信息"""
    try:
        # 从请求参数中获取项目名称
        project_name = request.args.get('projectName')
        if not project_name:
            return jsonify({"error": "No project selected"}), 400
        
        # 使用项目特定的character目录
        project_character_dir = get_project_dir(project_name, "character")
        

        
        # 加载所有individual角色文件
        characters = []
        i = 0
        while True:
            char_file_path = os.path.join(project_character_dir, f"character_{i}.json")
            if not os.path.exists(char_file_path):
                break
            
            try:
                with open(char_file_path, "r", encoding="utf-8") as f:
                    character_data = json.load(f)
                    characters.append(character_data)
                i += 1
            except Exception as char_error:
                logging.warning(f"Error loading character_{i}.json: {char_error}")
                break
        
        # 构建完整的数据结构
        data = {
            "summary": "",
            "characters": characters
        }

        logging.info(f"Character info loaded successfully from individual files in project {project_name}, found {len(characters)} characters")
        return jsonify(data), 200

    except Exception as e:
        logging.error(f"Error loading character info: {e}")
        return jsonify({"error": str(e)}), 500


def save_story_info():
    """保存故事信息（兼容性接口）"""
    return save_character_info()


def save_wan22_character_info():
    """保存ComfyUI WAN2.2格式的角色信息"""
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # 确保character目录存在
        os.makedirs(character_dir, exist_ok=True)

        # 保存WAN2.2格式的角色信息
        wan22_character_path = os.path.join(character_dir, "wan22_character_info.json")
        with open(wan22_character_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        # 保存每个角色的WAN2.2 LoRA格式描述
        if "characters" in data:
            for i, character in enumerate(data["characters"]):
                # 保存原始角色信息
                char_file_path = os.path.join(
                    character_dir, f"wan22_character_{i}.json"
                )
                with open(char_file_path, "w", encoding="utf-8") as f:
                    json.dump(character, f, ensure_ascii=False, indent=2)

                # 保存LoRA格式的提示词
                if "lora_prompt" in character:
                    lora_file_path = os.path.join(
                        character_dir, f"character_{i}_lora.txt"
                    )
                    with open(lora_file_path, "w", encoding="utf-8") as f:
                        f.write(character["lora_prompt"])

        logging.info(f"WAN2.2 character info saved successfully")
        return jsonify({"message": "WAN2.2 character info saved successfully"}), 200

    except Exception as e:
        logging.error(f"Error saving WAN2.2 character info: {e}")
        return jsonify({"error": str(e)}), 500


def load_wan22_character_info():
    """加载ComfyUI WAN2.2格式的角色信息"""
    try:
        wan22_character_path = os.path.join(character_dir, "wan22_character_info.json")

        if not os.path.exists(wan22_character_path):
            return jsonify({"summary": "", "characters": []}), 200

        with open(wan22_character_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        logging.info(f"WAN2.2 character info loaded successfully")
        return jsonify(data), 200

    except Exception as e:
        logging.error(f"Error loading WAN2.2 character info: {e}")
        return jsonify({"error": str(e)}), 500
