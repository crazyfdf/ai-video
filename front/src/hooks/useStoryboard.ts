import { useState, useCallback } from 'react';
import { Character, Subject, StoryboardElement } from '../types';
import { APIService } from '../services/api';
import { safeImageUrl } from '../utils/helpers';
import { showToast } from '../app/toast';

export const useStoryboard = () => {
  const [fragments, setFragments] = useState<string[]>([]);
  const [storyboards, setStoryboards] = useState<string[]>([]);
  const [sceneDescriptions, setSceneDescriptions] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [characterImages, setCharacterImages] = useState<string[]>([]);
  const [storySummary, setStorySummary] = useState<string>('');
  const [storyboardRequiredElements, setStoryboardRequiredElements] = useState<StoryboardElement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [sceneImages, setSceneImages] = useState<string[]>([]);
  const [videoPrompts, setVideoPrompts] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);

  // 初始化数据
  const initialize = useCallback(async () => {
    try {
      const data = await APIService.initialize();
      setFragments(data.fragments || []);
      
      // 正确处理初始图片URL
      const initialImages = (data.images || []).map((imageUrl: string) => 
        safeImageUrl(imageUrl)
      );
      setImages(initialImages);
      
      // 加载其他数据
      await Promise.all([
        loadCharacterInfo(),
        loadSceneDescriptions(),
        loadStoryboards(),
        loadCompleteStoryboardData(),
        loadSavedImages(),
        loadCharacterImages(),
        loadStoryboardElements(),
        loadSceneImages(),
        loadVideoData(),
      ]);
      
      setLoaded(true);
    } catch (error) {
      console.error('Error initializing data:', error);
      setLoaded(false);
    }
  }, []);

  // 加载角色信息
  const loadCharacterInfo = useCallback(async () => {
    try {
      const data = await APIService.loadCharacterInfo();
      if (data) {
        setStorySummary(data.summary || '');
        setCharacters(data.characters || []);
        
        if (data.characters && data.characters.length > 0) {
          const placeholders = data.characters.map(() => "http://localhost:1198/images/placeholder.png");
          setCharacterImages(placeholders);
        }
      }
    } catch (error) {
      console.error('Error loading character info:', error);
    }
  }, []);

  // 加载场景描述
  const loadSceneDescriptions = useCallback(async () => {
    try {
      const data = await APIService.loadSceneDescriptions();
      setSceneDescriptions(data || []);
    } catch (error) {
      console.error('Error loading scene descriptions:', error);
    }
  }, []);

  // 加载分镜脚本
  const loadStoryboards = useCallback(async () => {
    try {
      const data = await APIService.loadStoryboards();
      setStoryboards(data || []);
    } catch (error) {
      console.error('Error loading storyboards:', error);
    }
  }, []);

  // 加载完整分镜数据
  const loadCompleteStoryboardData = useCallback(async () => {
    try {
      const data = await APIService.loadCompleteStoryboardData();
      if (data && data.scenes && data.scenes.length > 0) {
        const scenes = data.scenes;
        const newFragments = scenes.map((scene: any) => scene.novel_fragment || '');
        const newStoryboards = scenes.map((scene: any) => scene.storyboard || '');
        const newDescriptions = scenes.map((scene: any) => scene.wan22_prompt || scene.scene_description || '');
        
        // 只有当当前没有数据时才更新
        if (fragments.length === 0) {
          setFragments(newFragments);
        }
        if (storyboards.length === 0) {
          setStoryboards(newStoryboards);
        }
        if (sceneDescriptions.length === 0) {
          setSceneDescriptions(newDescriptions);
        }
        
        // 初始化图片占位符
        if (images.length === 0) {
          setImages(newFragments.map(() => "http://localhost:1198/images/placeholder.png"));
        }
        
        console.log(`Loaded complete storyboard data: ${scenes.length} scenes`);
      }
    } catch (error) {
      console.error('Error loading complete storyboard data:', error);
    }
  }, [fragments.length, storyboards.length, sceneDescriptions.length, images.length]);

  // 生成故事和角色
  const generateStoryAndCharacters = useCallback(async () => {
    try {
      setIsLoading(true);
      showToast('开始生成故事梗概和角色信息，请等待...');
      
      const config = await APIService.getModelConfig();
      
      // 获取小说内容
      let fullNovelContent = '';
      if (fragments.length > 0) {
        fullNovelContent = fragments.join('\n\n');
      } else {
        const response = await fetch('http://localhost:1198/api/get/novel/fragments');
        if (response.ok) {
          const rawFragments = await response.json();
          fullNovelContent = rawFragments.join('\n\n');
        } else {
          throw new Error('无法获取小说内容，请先加载小说文件');
        }
      }
      
      const systemPrompt = `你是一个专业的小说分析师。请根据提供的小说内容，生成故事梗概、所有角色信息和主要场景信息。

重要要求：
1. 必须提取所有出现的角色（主角、配角、次要角色都要包含）
2. 角色外观描述必须是初始登场时的样子，不要描述后期受伤或变化后的状态
3. 根据角色描述和年龄推测合理的身高体重（符合角色设定）
4. 必须提取小说中的主要场景环境（不同时期、不同地点的重要场景）
5. 为每个角色和场景生成专业的英文AI图像生成提示词
6. 场景提示词必须只描述环境，不包含任何人物

请严格按照以下JSON格式返回：
{
  "summary": "简洁的故事梗概",
  "characters": [
    {
      "name": "角色姓名",
      "gender": "男性/女性",
      "age": "年龄描述",
      "height": "身高推测（如：165cm、180cm等）",
      "weight": "体重推测（如：50kg、70kg等）",
      "initial_appearance": "初始登场时的完整外观描述（健康状态，不包含任何伤残）",
      "personality": "性格特点",
      "role": "在故事中的角色定位",
      "englishPrompt": "masterpiece, best quality, ultra detailed, 8k, photorealistic, [详细的英文角色外观描述，适合AI图像生成]"
    }
  ],
  "scenes": [
    {
      "name": "场景名称",
      "description": "场景的中文描述",
      "period": "故事中的时期或阶段",
      "importance": "在故事中的重要性",
      "englishPrompt": "masterpiece, best quality, ultra detailed, 8k, photorealistic, cinematic lighting, [详细的英文环境场景描述，不包含人物]"
    }
  ]
}`;

      const userPrompt = `小说内容：
${fullNovelContent}

请仔细分析这部小说，提取：
1. 简洁的故事梗概
2. 所有角色的初始登场信息（完整健康状态，包含身高体重推测）
3. 小说中的主要场景环境（不同时期、地点的重要场景）

要求：
- 角色外观只描述初始登场时的样子
- 根据角色年龄、性别、描述推测合理的身高体重
- 场景只描述环境，不包含人物
- 提取故事不同阶段的重要场景
- 为角色和场景生成英文AI图像提示词
- 严格按照JSON格式返回`;

      const result = await APIService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], config);

      const content = result.choices[0].message.content;
      const parsedContent = JSON.parse(content);
      
      if (!parsedContent.summary || !parsedContent.characters) {
        throw new Error('返回数据格式不完整');
      }
      
      const validCharacters = parsedContent.characters.filter((char: any) => 
        char.name && char.gender && char.initial_appearance
      );
      
      if (validCharacters.length === 0) {
        throw new Error('未提取到有效的角色信息');
      }
      
      // 处理场景数据
      const validScenes = (parsedContent.scenes || []).filter((scene: any) => 
        scene.name && scene.description && scene.englishPrompt
      );
      
      // 更新状态
      setStorySummary(parsedContent.summary);
      const processedCharacters = validCharacters.map((char: any) => ({
        name: char.name,
        gender: char.gender,
        age: char.age || '未知',
        height: char.height || '未知',
        weight: char.weight || '未知',
        appearance: char.initial_appearance,
        personality: char.personality || '',
        role: char.role || '',
        englishPrompt: char.englishPrompt || ''
      }));
      
      setCharacters(processedCharacters);
      
      // 保存角色信息
      await APIService.saveCharacterInfo({
        summary: parsedContent.summary,
        characters: processedCharacters
      });
      
      // 如果有场景数据，创建场景主体
      if (validScenes.length > 0) {
        // 这里需要调用场景主体创建功能
        // 由于架构限制，我们需要通过回调来处理
        if (typeof window !== 'undefined') {
          (window as any).generatedScenes = validScenes;
        }
      }
      
      showToast(`提取完成！角色: ${validCharacters.length}个，场景: ${validScenes.length}个`);
      
    } catch (error) {
      console.error('Error generating story and characters:', error);
      showToast(`生成失败: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }, [fragments]);

  // 生成分镜脚本
  const generateSceneStoryboards = useCallback(async () => {
    try {
      showToast('开始生成分镜脚本...');
      
      if (characters.length === 0) {
        showToast('请先生成故事梗概和角色信息');
        return;
      }
      
      const config = await APIService.getModelConfig();
      
      // 获取完整小说内容
      let novelContent = '';
      
      if (fragments.length > 0) {
        novelContent = fragments.join('\n\n');
      } else {
        try {
          const response = await fetch('http://localhost:1198/api/get/novel/fragments');
          if (response.ok) {
            const rawFragments = await response.json();
            novelContent = rawFragments.join('\n\n');
          } else {
            throw new Error('无法获取小说内容，请先加载小说文件');
          }
        } catch (error) {
          throw new Error('无法获取小说内容，请先加载小说文件');
        }
      }
      
      // 构建角色信息字符串
      const charactersInfo = characters.map(char => 
        `@${char.name}: ${char.gender}, ${char.age}, ${char.appearance}`
      ).join('\n');
      
      const systemPrompt = `你是一个专业的电影分镜脚本师。

故事梗概：${storySummary}

角色信息：
${charactersInfo}

请根据小说内容，将其分解为完整的分镜场景，确保覆盖整个故事。每个分镜包含：
1. 对应的小说片段
2. 专业的分镜脚本描述
3. ComfyUI WAN2.2格式的画面描述

分镜要求：
- 镜头类型：特写(CU)、近景(MS)、中景(WS)、远景(LS)、全景(ELS)
- 镜头角度：平视、俯视、仰视、侧面
- 详细描述角色外观（严格按照角色信息）
- 包含角色动作、表情、场景环境、光线氛围
- 细分重要场景，不遗漏任何情节
- 确保场景数量完整

ComfyUI WAN2.2格式要求：
- 质量标签：masterpiece, best quality, ultra detailed, 8k
- 技术标签：photorealistic, cinematic lighting, depth of field
- 主体描述：角色特征、年龄、性别、外观
- 动作描述：具体动作、表情、姿态
- 场景描述：环境、背景、道具
- 镜头描述：角度、景别、构图

请严格按照以下JSON格式返回：
{
  "total_scenes": 场景总数,
  "scenes": [
    {
      "scene_id": 场景编号,
      "novel_fragment": "对应的小说片段内容",
      "storyboard": "专业分镜脚本描述（包含镜头类型、角度、构图等）",
      "wan22_prompt": "masterpiece, best quality, ultra detailed, 8k, photorealistic, cinematic lighting, [详细的ComfyUI WAN2.2格式描述]",
      "required_elements": {
        "characters": ["出现的角色名称列表"],
        "character_subjects": ["需要的角色主体标签，格式：@角色名"],
        "scene_subjects": ["需要的场景主体标签，格式：@场景名"],
        "scene_prompt": "场景环境描述"
      }
    }
  ]
}`;

      const userPrompt = `小说内容：
${novelContent}

请将这部小说完整分解为详细的分镜场景，要求：
1. 覆盖整个故事，不遗漏任何重要情节
2. 保证镜头数量能覆盖到整部小说
3. 每个场景包含对应的小说片段
4. 分镜脚本要专业详细（镜头类型、角度、构图）
5. ComfyUI WAN2.2描述要包含角色的具体外观特征
6. 细分重要对话、动作、转场等场景
7. 确保场景连贯性和完整性

**重要：同时分析每个分镜的所需元素：**
- characters: 该分镜中出现的所有角色名称
- character_subjects: 需要的角色主体标签（格式：@角色名）
- scene_subjects: 需要的场景主体标签（格式：@场景描述，如@古宅庭院、@森林小径等）
- scene_prompt: 场景环境的详细描述

请返回完整的JSON格式结果，包含所有场景和对应的required_elements。`;

      const result = await APIService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], config, 12000);

      const content = result.choices[0].message.content;
      
      try {
        // 解析JSON响应
        const parsedContent = JSON.parse(content);
        const scenes = parsedContent.scenes || [];
        const totalScenes = parsedContent.total_scenes || scenes.length;
        
        if (scenes.length === 0) {
          throw new Error('未生成任何分镜场景');
        }
        
        if (scenes.length < 20) {
          showToast(`警告：只生成了${scenes.length}个场景，建议重新生成以获得更多场景`);
        }
        
        // 提取数据
        const newFragments = scenes.map((scene: any) => scene.novel_fragment || '');
        const newStoryboards = scenes.map((scene: any) => scene.storyboard || '');
        const newDescriptions = scenes.map((scene: any) => scene.wan22_prompt || scene.scene_description || '');
        
        // 提取分镜元素
        const newStoryboardElements = scenes.map((scene: any, index: number) => {
          const elements = scene.required_elements || {};
          return {
            scene_index: index,
            characters: elements.characters || [],
            character_subjects: elements.character_subjects || [],
            scene_subjects: elements.scene_subjects || [],
            scene_prompt: elements.scene_prompt || ''
          };
        });
        
        // 更新状态
        setFragments(newFragments);
        setStoryboards(newStoryboards);
        setSceneDescriptions(newDescriptions);
        setStoryboardRequiredElements(newStoryboardElements);
        setImages(newFragments.map(() => "http://localhost:1198/images/placeholder.png"));
        
        // 保存完整的分镜数据
        const fullStoryboardData = {
          total_scenes: totalScenes,
          generated_at: new Date().toISOString(),
          story_summary: storySummary,
          characters: characters,
          raw_ai_response: content,
          scenes: scenes.map((scene: any, index: number) => ({
            scene_id: scene.scene_id || index + 1,
            novel_fragment: scene.novel_fragment || '',
            storyboard: scene.storyboard || '',
            wan22_prompt: scene.wan22_prompt || scene.scene_description || '',
            required_elements: scene.required_elements || {},
            generated_at: new Date().toISOString()
          }))
        };
        
        // 保存数据
        await APIService.saveCompleteStoryboardData(fullStoryboardData);
        await APIService.saveSceneDescriptions(newDescriptions);
        await APIService.saveStoryboards(newStoryboards);
        await APIService.saveStoryboardElements(newStoryboardElements);
        
        setLoaded(true);
        
        // 统计分镜元素
        const totalCharacterSubjects = newStoryboardElements.reduce((sum, elem) => sum + (elem.character_subjects?.length || 0), 0);
        const totalSceneSubjects = newStoryboardElements.reduce((sum, elem) => sum + (elem.scene_subjects?.length || 0), 0);
        
        showToast(`分镜生成完成！共${scenes.length}个场景，已分析${totalCharacterSubjects}个角色主体和${totalSceneSubjects}个场景主体`);
        
      } catch (parseError) {
        console.error('JSON解析失败:', parseError);
        showToast('分镜数据格式解析失败，请重试');
      }
      
    } catch (error) {
      console.error('Error generating storyboards:', error);
      showToast(`分镜生成失败: ${(error as Error).message}`);
      setLoaded(false);
    }
  }, [characters, fragments, storySummary]);

  // 加载保存的图片
  const loadSavedImages = useCallback(async () => {
    try {
      const imageData = await APIService.loadImages();
      
      // 更新图片数组
      const updatedImages = [...images];
      Object.entries(imageData).forEach(([index, info]: [string, any]) => {
        const numIndex = parseInt(index);
        if (!isNaN(numIndex) && info.local_path) {
          updatedImages[numIndex] = safeImageUrl(`${info.local_path}?v=${Date.now()}`);
        }
      });
      
      setImages(updatedImages);
      console.log('Saved images loaded successfully');
    } catch (error) {
      console.error('Error loading saved images:', error);
    }
  }, [images]);

  // 加载角色图片
  const loadCharacterImages = useCallback(async () => {
    try {
      const data = await APIService.loadCharacterImages();
      
      if (data && data.character_images && Array.isArray(data.character_images)) {
        const loadedImages = data.character_images.map((imageInfo: any) => {
          if (imageInfo && imageInfo.image_url) {
            return safeImageUrl(`${imageInfo.image_url}?v=${Date.now()}`);
          }
          return "http://localhost:1198/images/placeholder.png";
        });
        
        setCharacterImages(loadedImages);
        console.log(`Loaded ${loadedImages.length} character images`);
      } else {
        // 如果没有保存的角色图片，根据角色数量初始化占位符
        if (characters.length > 0) {
          setCharacterImages(characters.map(() => "http://localhost:1198/images/placeholder.png"));
        }
      }
    } catch (error) {
      console.error('Error loading character images:', error);
      // 如果加载失败，根据角色数量初始化占位符
      if (characters.length > 0) {
        setCharacterImages(characters.map(() => "http://localhost:1198/images/placeholder.png"));
      }
    }
  }, [characters.length]);

  // 加载分镜元素
  const loadStoryboardElements = useCallback(async () => {
    try {
      const data = await APIService.loadStoryboardElements();
      setStoryboardRequiredElements(data || []);
    } catch (error) {
      console.error('Error loading storyboard elements:', error);
    }
  }, []);

  // 加载场景图片
  const loadSceneImages = useCallback(async () => {
    try {
      const data = await APIService.loadSceneImages();
      
      if (data && data.scene_images && Array.isArray(data.scene_images)) {
        const loadedImages = data.scene_images.map((imageInfo: any) => {
          if (imageInfo && imageInfo.image_url) {
            return safeImageUrl(`${imageInfo.image_url}?v=${Date.now()}`);
          }
          return "";
        });
        
        setSceneImages(loadedImages);
        console.log(`Loaded ${loadedImages.length} scene images`);
      } else {
        // 如果没有保存的场景图片，根据片段数量初始化空数组
        if (fragments.length > 0) {
          setSceneImages(fragments.map(() => ""));
        }
      }
    } catch (error) {
      console.error('Error loading scene images:', error);
      // 如果加载失败，根据片段数量初始化空数组
      if (fragments.length > 0) {
        setSceneImages(fragments.map(() => ""));
      }
    }
  }, [fragments.length]);

  // 加载视频数据
  const loadVideoData = useCallback(async () => {
    try {
      // 先尝试加载视频数据，如果失败则初始化空数组
      try {
        const data = await APIService.loadVideoData();
        
        if (data) {
          // 加载视频提示词
          if (data.video_prompts && Array.isArray(data.video_prompts)) {
            setVideoPrompts(data.video_prompts);
          } else if (fragments.length > 0) {
            setVideoPrompts(fragments.map(() => ""));
          }
          
          // 加载视频
          if (data.videos && Array.isArray(data.videos)) {
            const loadedVideos = data.videos.map((videoInfo: any) => {
              if (videoInfo && videoInfo.video_url) {
                return `http://localhost:1198${videoInfo.video_url}?v=${Date.now()}`;
              }
              return "";
            });
            setVideos(loadedVideos);
          } else if (fragments.length > 0) {
            setVideos(fragments.map(() => ""));
          }
        }
      } catch (apiError) {
        // 如果API不存在，静默处理并初始化空数组
        console.log('Video data API not available, initializing empty arrays');
        if (fragments.length > 0) {
          setVideoPrompts(fragments.map(() => ""));
          setVideos(fragments.map(() => ""));
        }
      }
    } catch (error) {
      console.error('Error loading video data:', error);
      // 如果加载失败，根据片段数量初始化空数组
      if (fragments.length > 0) {
        setVideoPrompts(fragments.map(() => ""));
        setVideos(fragments.map(() => ""));
      }
    }
  }, [fragments.length]);

  return {
    // 状态
    fragments,
    storyboards,
    sceneDescriptions,
    images,
    characters,
    characterImages,
    storySummary,
    storyboardRequiredElements,
    isLoading,
    loaded,
    sceneImages,
    videoPrompts,
    videos,
    
    // 设置器
    setFragments,
    setStoryboards,
    setSceneDescriptions,
    setImages,
    setCharacters,
    setCharacterImages,
    setStorySummary,
    setStoryboardRequiredElements,
    setSceneImages,
    setVideoPrompts,
    setVideos,
    
    // 方法
    initialize,
    generateStoryAndCharacters,
    generateSceneStoryboards,
  };
};