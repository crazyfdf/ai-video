"""
AI提示词引擎
负责管理和格式化专业功能的AI提示词模板
"""

import logging
from typing import Any, Dict


class AIPromptEngine:
    def __init__(self):
        self.prompts = self._load_professional_prompts()
        self.logger = logging.getLogger(__name__)

    def _load_professional_prompts(self) -> Dict[str, str]:
        """加载专业提示词模板"""
        return {
            "character_voice_design": """你是一位拥有20年经验的专业配音导演和声音指导。你精通各种配音技巧，了解不同年龄、性格、背景角色的声音特征，并能为配音演员提供精确的指导建议。

请根据以下角色信息，设计详细的音色方案：

角色信息：{character_info}
场景背景：{scene_context}
情感状态：{emotional_state}

请提供以下内容：
1. **基础音色特征**：
   - 音调高低（具体Hz范围）
   - 语速节奏（每分钟字数）
   - 音量控制（强弱变化）
   - 音质特点（清亮/沙哑/温润等）

2. **情感表达方式**：
   - 开心时的声音变化
   - 愤怒时的声音特点
   - 悲伤时的音色调整
   - 紧张时的语调变化

3. **配音技巧指导**：
   - 呼吸控制要点
   - 口型和发音建议
   - 情感层次处理
   - 与其他角色的声音区分

4. **参考示例**：
   - 类似的知名角色声音
   - 推荐的配音演员类型
   - 录音时的技术要求

请以专业配音导演的身份，用专业术语和实用建议来回答。""",
            "scene_dialogue_generation": """你是一位资深的专业编剧和配音导演，拥有丰富的影视剧本创作经验和配音指导经验。你擅长创作自然流畅的对话，能够通过台词展现角色性格、推进剧情发展，并为每个角色分析最适合的配音角色类型。

请根据以下分镜信息，创作专业的台词内容：

分镜描述：{scene_description}
参与角色：{characters}
剧情背景：{story_context}
情感基调：{emotional_tone}
场景时长：{scene_duration}
角色音色信息：{character_voices}

请提供以下内容：
1. **主要台词**：
   - 符合角色性格的对话
   - 推进剧情的关键台词
   - 体现角色关系的互动
   - 营造氛围的表达

2. **配音角色分析**：
   - 为每个说话的角色分析最适合的配音角色类型
   - 根据角色年龄、性格、身份推荐配音风格
   - 考虑已上传的音色文件特点（如有）
   - 提供具体的配音指导建议

3. **台词技巧分析**：
   - 每句台词的情感重点
   - 语调和节奏建议
   - 停顿和重音位置
   - 与画面的配合要点

4. **表演指导**：
   - 角色的内心活动
   - 肢体语言配合
   - 眼神和表情建议
   - 与其他角色的互动方式

5. **替代方案**：
   - 不同情感强度的版本
   - 适合不同演员风格的调整
   - 时长调整的台词变化

请确保台词自然流畅，符合角色身份，并能有效推进剧情发展。同时为每个角色提供详细的配音角色分析和指导。""",
            "environment_audio_design": """你是一位专业的音效设计师和声音工程师，拥有丰富的影视音效制作经验。你精通各种环境音效的设计和制作，能够通过声音营造沉浸式的场景氛围。

请根据以下场景信息，设计完整的环境音效方案：

场景描述：{scene_description}
时间设定：{time_setting}
地点环境：{location}
天气状况：{weather}
情感氛围：{mood}
场景时长：{duration}

请提供以下内容：
1. **主要环境音**：
   - 基础环境音（如风声、水声、城市噪音等）
   - 音量层次（dB范围）
   - 频率特征（Hz范围）
   - 持续时间和变化

2. **背景音效**：
   - 远景音效（远处的声音）
   - 中景音效（中等距离的声音）
   - 近景音效（近距离的细节音）
   - 各层次的音量平衡

3. **特殊音效**：
   - 突出情感的音效
   - 增强戏剧张力的声音
   - 转场和过渡音效
   - 与剧情相关的特定音效

4. **技术参数**：
   - 录音设备建议
   - 后期处理要求（EQ、压缩、混响等）
   - 立体声定位
   - 与对话和音乐的混音比例

5. **制作建议**：
   - 音效素材来源
   - 录制技巧和注意事项
   - 后期制作流程
   - 质量控制标准

请以专业音效设计师的角度，提供详细的技术指导和创意建议。""",
            "art_style_definition": """你是一位经验丰富的美术指导和视觉设计师，拥有深厚的影视美术设计背景。你精通各种艺术风格，能够为影视作品制定统一的视觉风格指南，并指导整个美术团队的创作方向。

请根据以下项目信息，制定完整的美术风格指南：

项目类型：{project_type}
故事主题：{story_theme}
目标观众：{target_audience}
情感基调：{emotional_tone}
时代背景：{time_period}
地域特色：{location_style}

请提供以下内容：
1. **整体视觉风格**：
   - 艺术风格定位（写实/风格化/抽象等）
   - 视觉参考和灵感来源
   - 整体美学理念
   - 与故事主题的呼应

2. **色彩方案**：
   - 主色调选择和理由
   - 辅助色彩搭配
   - 不同场景的色彩变化
   - 色彩的情感表达功能
   - 具体色值参考（RGB/HSV）

3. **构图和镜头语言**：
   - 画面构图原则
   - 镜头运动风格
   - 景深和焦点运用
   - 光影处理方式

4. **角色设计指导**：
   - 角色造型风格
   - 服装设计方向
   - 化妆和发型风格
   - 道具设计原则

5. **场景设计指导**：
   - 场景设计风格
   - 布景和陈设原则
   - 材质和纹理运用
   - 空间层次处理

6. **技术实现建议**：
   - 拍摄技术要求
   - 后期调色方案
   - 特效风格指导
   - 质量控制标准

请以专业美术指导的身份，提供系统性的视觉指导方案。""",
            "comprehensive_creative_guidance": """你是一位资深的影视制作顾问，同时具备导演、编剧、美术指导和音效设计的综合经验。你能够统筹考虑短片制作的各个环节，确保各专业领域的协调配合。

请根据以下项目信息，提供综合的创作指导：

项目概述：{project_overview}
制作预算：{budget_level}
制作周期：{production_timeline}
团队规模：{team_size}
技术条件：{technical_resources}

请提供以下内容：
1. **创作优先级**：
   - 各专业环节的重要性排序
   - 资源分配建议
   - 制作流程规划

2. **风格统一性**：
   - 各专业领域的协调要点
   - 统一风格的实现方法
   - 质量控制检查点

3. **实用建议**：
   - 成本控制要点
   - 效率提升方法
   - 常见问题预防

4. **创新元素**：
   - 提升作品质量的创意建议
   - 技术创新的应用可能
   - 差异化竞争优势

请以资深制作顾问的身份，提供全面而实用的指导建议。""",
        }

    def get_voice_design_prompt(
        self, character_info: str, scene_context: str = "", emotional_state: str = ""
    ) -> str:
        """获取角色音色设计提示词"""
        try:
            template = self.prompts["character_voice_design"]
            return template.format(
                character_info=character_info,
                scene_context=scene_context or "通用场景",
                emotional_state=emotional_state or "正常状态",
            )
        except Exception as e:
            self.logger.error(f"Error generating voice design prompt: {e}")
            return self.prompts["character_voice_design"]

    def get_dialogue_generation_prompt(
        self,
        scene_description: str,
        characters: str,
        story_context: str,
        emotional_tone: str = "",
        scene_duration: str = "",
        character_voices: str = "",
    ) -> str:
        """获取台词生成提示词"""
        try:
            template = self.prompts["scene_dialogue_generation"]
            return template.format(
                scene_description=scene_description,
                characters=characters,
                story_context=story_context,
                emotional_tone=emotional_tone or "自然",
                scene_duration=scene_duration or "2-3分钟",
                character_voices=character_voices or "暂无音色信息",
            )
        except Exception as e:
            self.logger.error(f"Error generating dialogue prompt: {e}")
            return self.prompts["scene_dialogue_generation"]

    def get_audio_design_prompt(
        self,
        scene_description: str,
        time_setting: str = "",
        location: str = "",
        weather: str = "",
        mood: str = "",
        duration: str = "",
    ) -> str:
        """获取音效设计提示词"""
        try:
            template = self.prompts["environment_audio_design"]
            return template.format(
                scene_description=scene_description,
                time_setting=time_setting or "夜晚",
                location=location or "户外",
                weather=weather or "晴朗",
                mood=mood or "神秘",
                duration=duration or "2-3分钟",
            )
        except Exception as e:
            self.logger.error(f"Error generating audio design prompt: {e}")
            return self.prompts["environment_audio_design"]

    def get_art_style_prompt(
        self,
        project_type: str,
        story_theme: str,
        target_audience: str = "",
        emotional_tone: str = "",
        time_period: str = "",
        location_style: str = "",
    ) -> str:
        """获取美术风格提示词"""
        try:
            template = self.prompts["art_style_definition"]
            return template.format(
                project_type=project_type,
                story_theme=story_theme,
                target_audience=target_audience or "成年观众",
                emotional_tone=emotional_tone or "悬疑",
                time_period=time_period or "现代",
                location_style=location_style or "都市",
            )
        except Exception as e:
            self.logger.error(f"Error generating art style prompt: {e}")
            return self.prompts["art_style_definition"]

    def get_comprehensive_guidance_prompt(
        self,
        project_overview: str,
        budget_level: str = "",
        production_timeline: str = "",
        team_size: str = "",
        technical_resources: str = "",
    ) -> str:
        """获取综合创作指导提示词"""
        try:
            template = self.prompts["comprehensive_creative_guidance"]
            return template.format(
                project_overview=project_overview,
                budget_level=budget_level or "中等预算",
                production_timeline=production_timeline or "3-6个月",
                team_size=team_size or "小型团队",
                technical_resources=technical_resources or "标准设备",
            )
        except Exception as e:
            self.logger.error(f"Error generating comprehensive guidance prompt: {e}")
            return self.prompts["comprehensive_creative_guidance"]

    def validate_prompt_parameters(
        self, prompt_type: str, parameters: Dict[str, Any]
    ) -> bool:
        """验证提示词参数的完整性"""
        required_params = {
            "character_voice_design": ["character_info"],
            "scene_dialogue_generation": [
                "scene_description",
                "characters",
                "story_context",
            ],
            "environment_audio_design": ["scene_description"],
            "art_style_definition": ["project_type", "story_theme"],
            "comprehensive_creative_guidance": ["project_overview"],
        }

        if prompt_type not in required_params:
            return False

        for param in required_params[prompt_type]:
            if param not in parameters or not parameters[param]:
                self.logger.warning(
                    f"Missing required parameter '{param}' for prompt type '{prompt_type}'"
                )
                return False

        return True

    def get_prompt_by_type(self, prompt_type: str, parameters: Dict[str, Any]) -> str:
        """根据类型和参数获取格式化的提示词"""
        if not self.validate_prompt_parameters(prompt_type, parameters):
            self.logger.error(f"Invalid parameters for prompt type: {prompt_type}")
            return ""

        try:
            if prompt_type == "character_voice_design":
                return self.get_voice_design_prompt(
                    parameters.get("character_info", ""),
                    parameters.get("scene_context", ""),
                    parameters.get("emotional_state", ""),
                )
            elif prompt_type == "scene_dialogue_generation":
                return self.get_dialogue_generation_prompt(
                    parameters.get("scene_description", ""),
                    parameters.get("characters", ""),
                    parameters.get("story_context", ""),
                    parameters.get("emotional_tone", ""),
                    parameters.get("scene_duration", ""),
                )
            elif prompt_type == "environment_audio_design":
                return self.get_audio_design_prompt(
                    parameters.get("scene_description", ""),
                    parameters.get("time_setting", ""),
                    parameters.get("location", ""),
                    parameters.get("weather", ""),
                    parameters.get("mood", ""),
                    parameters.get("duration", ""),
                )
            elif prompt_type == "art_style_definition":
                return self.get_art_style_prompt(
                    parameters.get("project_type", ""),
                    parameters.get("story_theme", ""),
                    parameters.get("target_audience", ""),
                    parameters.get("emotional_tone", ""),
                    parameters.get("time_period", ""),
                    parameters.get("location_style", ""),
                )
            elif prompt_type == "comprehensive_creative_guidance":
                return self.get_comprehensive_guidance_prompt(
                    parameters.get("project_overview", ""),
                    parameters.get("budget_level", ""),
                    parameters.get("production_timeline", ""),
                    parameters.get("team_size", ""),
                    parameters.get("technical_resources", ""),
                )
            else:
                self.logger.error(f"Unknown prompt type: {prompt_type}")
                return ""
        except Exception as e:
            self.logger.error(f"Error getting prompt for type {prompt_type}: {e}")
            return ""
