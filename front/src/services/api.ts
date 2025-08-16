import { 
  Character, Subject, StoryboardElement, CompleteStoryboardData, APIConfig,
  VoiceProfile, SceneDialogue, AudioDesign, ArtStyleGuide,
  VoiceDesignRequest, DialogueGenerationRequest, AudioDesignRequest, ArtStyleRequest
} from '../types';

const BASE_URL = 'http://localhost:1198';

export class APIService {
  // 获取初始化数据
  static async initialize() {
    const response = await fetch(`${BASE_URL}/api/novel/initial`);
    if (!response.ok) {
      throw new Error('Failed to initialize');
    }
    return response.json();
  }

  // 获取模型配置
  static async getModelConfig(): Promise<APIConfig> {
    const response = await fetch(`${BASE_URL}/api/model/config`);
    if (!response.ok) {
      throw new Error('Failed to get API configuration');
    }
    return response.json();
  }

  // 加载角色信息
  static async loadCharacterInfo() {
    const response = await fetch(`${BASE_URL}/api/load/story/info`);
    if (response.ok) {
      return response.json();
    }
    return null;
  }

  // 保存角色信息
  static async saveCharacterInfo(data: { summary: string; characters: Character[] }) {
    const projectName = (window as any).currentProjectName || 'default';
    const response = await fetch(`${BASE_URL}/api/save/character/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, projectName }),
    });
    if (!response.ok) {
      throw new Error('Failed to save character info');
    }
  }

  // 加载场景描述
  static async loadSceneDescriptions() {
    const response = await fetch(`${BASE_URL}/api/load/scene/descriptions`);
    if (response.ok) {
      return response.json();
    }
    return [];
  }

  // 保存场景描述
  static async saveSceneDescriptions(descriptions: string[]) {
    const projectName = (window as any).currentProjectName || 'default';
    const response = await fetch(`${BASE_URL}/api/save/scene/descriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descriptions, projectName }),
    });
    if (!response.ok) {
      throw new Error('Failed to save scene descriptions');
    }
  }

  // 加载分镜脚本
  static async loadStoryboards() {
    const response = await fetch(`${BASE_URL}/api/load/storyboards`);
    if (response.ok) {
      return response.json();
    }
    return [];
  }

  // 保存分镜脚本
  static async saveStoryboards(storyboards: string[]) {
    const projectName = (window as any).currentProjectName || 'default';
    const response = await fetch(`${BASE_URL}/api/save/storyboards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyboards, projectName }),
    });
    if (!response.ok) {
      throw new Error('Failed to save storyboards');
    }
  }

  // 加载完整分镜数据
  static async loadCompleteStoryboardData() {
    const response = await fetch(`${BASE_URL}/api/load/complete/storyboard`);
    if (response.ok) {
      return response.json();
    }
    return null;
  }

  // 保存完整分镜数据
  static async saveCompleteStoryboardData(data: CompleteStoryboardData) {
    const response = await fetch(`${BASE_URL}/api/save/complete/storyboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to save complete storyboard data');
    }
  }

  // 加载主体数据
  static async loadSubjects() {
    try {
      const response = await fetch(`${BASE_URL}/api/load/subjects`);
      if (response.ok) {
        const data = await response.json();
        console.log('Subjects loaded from backend:', data);
        return data;
      }
      throw new Error('Backend API not available');
    } catch (error) {
      // 如果后端不可用，尝试从本地存储加载
      console.warn('Backend not available, loading from localStorage:', error);
      try {
        const localData = localStorage.getItem('subjects_data');
        if (localData) {
          const data = JSON.parse(localData);
          console.log('Subjects loaded from localStorage:', data);
          return data;
        }
      } catch (localError) {
        console.error('Failed to load from localStorage:', localError);
      }

      // 返回默认数据
      return { characterSubjects: [], sceneSubjects: [], novelScenes: '' };
    }
  }

  // 保存主体数据
  static async saveSubjects(data: {
    characterSubjects: Subject[];
    sceneSubjects: Subject[];
    novelScenes: string;
  }) {
    try {
      const response = await fetch(`${BASE_URL}/api/save/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Backend API not available');
      }
      console.log('Subjects saved to backend successfully');
    } catch (error) {
      // 如果后端不可用，使用本地存储作为后备
      console.warn('Backend not available, saving to localStorage:', error);
      try {
        localStorage.setItem('subjects_data', JSON.stringify(data));
        console.log('Subjects saved to localStorage successfully');
      } catch (localError) {
        console.error('Failed to save to localStorage:', localError);
        throw new Error('Failed to save subjects to both backend and localStorage');
      }
    }
  }

  // 上传主体图片 - 使用现有的角色图片上传端点
  static async uploadSubjectImage(file: File, subjectType: 'character' | 'scene' = 'character') {
    const formData = new FormData();
    formData.append('image', file);

    // 使用现有的上传端点
    const endpoint = subjectType === 'character'
      ? `${BASE_URL}/api/upload/character/image`
      : `${BASE_URL}/api/upload/scene/image`;

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }
    return response.json();
  }

  // 生成图片
  static async generateImage(prompt: string, apiKey: string) {
    const response = await fetch("https://api.easyai.tech/v1/images/generations", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        prompt,
        size: "1024x1024",
        model: "角色形象制作",
        n: 1
      })
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }
    return response.json();
  }

  // AI 聊天完成
  static async chatCompletion(messages: any[], config: APIConfig, maxTokens: number = 4000) {
    const response = await fetch(config.url || 'https://api.sambanova.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apikey}`
      },
      body: JSON.stringify({
        model: config.model || 'Meta-Llama-3.1-405B-Instruct',
        messages,
        temperature: 0.7,
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }
    return response.json();
  }

  // 保存故事信息
  static async saveStoryInfo(data: { summary: string; characters: Character[] }) {
    const response = await fetch(`${BASE_URL}/api/save/story/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to save story info');
    }
  }

  // 加载图片
  static async loadImages() {
    const response = await fetch(`${BASE_URL}/api/load/images`);
    if (response.ok) {
      return response.json();
    }
    return {};
  }

  // 保存图片
  static async saveImage(index: number, imageUrl: string, description: string = '') {
    try {
      // 获取当前项目名称
      const projectName = (window as any).currentProjectName || 'default';
      
      const response = await fetch(`${BASE_URL}/api/save/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index, imageUrl, description, projectName }),
      });
      if (!response.ok) {
        throw new Error('Backend API not available');
      }
      console.log(`Image saved to backend: index ${index}, project: ${projectName}, url: ${imageUrl}`);
    } catch (error) {
      // 如果后端不可用，使用本地存储作为后备
      console.warn('Backend not available, saving image to localStorage:', error);
      try {
        const projectName = (window as any).currentProjectName || 'default';
        const imageData = { index, imageUrl, description, projectName, timestamp: Date.now() };
        const existingImages = JSON.parse(localStorage.getItem('saved_images') || '[]');

        // 更新或添加图片数据
        const updatedImages = existingImages.filter((img: any) => img.index !== index || img.projectName !== projectName);
        updatedImages.push(imageData);

        localStorage.setItem('saved_images', JSON.stringify(updatedImages));
        console.log(`Image saved to localStorage: index ${index}, project: ${projectName}`);
      } catch (localError) {
        console.error('Failed to save image to localStorage:', localError);
        // 不抛出错误，允许应用继续运行
      }
    }
  }

  // 加载角色图片
  static async loadCharacterImages() {
    const response = await fetch(`${BASE_URL}/api/load/character/images`);
    if (response.ok) {
      return response.json();
    }
    return null;
  }

  // 加载场景图片
  static async loadSceneImages() {
    const response = await fetch(`${BASE_URL}/api/load/scene/images`);
    if (response.ok) {
      return response.json();
    }
    return null;
  }

  // 加载视频数据
  static async loadVideoData() {
    try {
      const response = await fetch(`${BASE_URL}/api/load/video/data`);
      if (response.ok) {
        return response.json();
      }
      // 如果API不存在（404），返回null而不是抛出错误
      if (response.status === 404) {
        return null;
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      // 静默处理网络错误或404错误
      console.log('Video data API not available');
      return null;
    }
  }

  // 保存视频提示词
  static async saveVideoPrompt(index: number, prompt: string) {
    const response = await fetch(`${BASE_URL}/api/save/video/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index, prompt }),
    });
    if (!response.ok) {
      throw new Error('Failed to save video prompt');
    }
  }

  // 加载分镜元素
  static async loadStoryboardElements() {
    try {
      const response = await fetch(`${BASE_URL}/api/load/storyboard/elements`);
      if (response.ok) {
        const data = await response.json();
        console.log('Storyboard elements loaded from backend:', data);
        return data;
      }
      throw new Error('Backend API not available');
    } catch (error) {
      // 如果后端不可用，从本地存储加载
      console.warn('Backend not available, loading storyboard elements from localStorage:', error);
      try {
        const localData = localStorage.getItem('storyboard_elements');
        if (localData) {
          const data = JSON.parse(localData);
          console.log('Storyboard elements loaded from localStorage:', data);
          return data;
        }
      } catch (localError) {
        console.error('Failed to load storyboard elements from localStorage:', localError);
      }
      return [];
    }
  }

  // 保存分镜元素
  static async saveStoryboardElements(elements: StoryboardElement[]) {
    try {
      const response = await fetch(`${BASE_URL}/api/save/storyboard/elements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(elements),
      });
      if (!response.ok) {
        throw new Error('Backend API not available');
      }
      console.log('Storyboard elements saved to backend successfully');
    } catch (error) {
      // 如果后端不可用，使用本地存储作为后备
      console.warn('Backend not available, saving storyboard elements to localStorage:', error);
      try {
        localStorage.setItem('storyboard_elements', JSON.stringify(elements));
        console.log('Storyboard elements saved to localStorage successfully');
      } catch (localError) {
        console.error('Failed to save storyboard elements to localStorage:', localError);
        // 不抛出错误，允许应用继续运行
      }
    }
  }

  // 保存角色图片
  static async saveCharacterImage(characterIndex: number, imageUrl: string, characterInfo: Character) {
    const projectName = (window as any).currentProjectName || 'default';
    const response = await fetch(`${BASE_URL}/api/save/character/image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        character_index: characterIndex,
        character_name: characterInfo.name || `character_${characterIndex}`,
        imageUrl: imageUrl,
        character_info: characterInfo,
        projectName
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to save character image');
    }
  }

  // 获取LoRA列表
  static async getLoraList(): Promise<string[]> {
    try {
      const response = await fetch('https://ai-comfyui.top/api/draw/getLoraListById/6894059a938a9045597ffe1c');
      if (!response.ok) {
        throw new Error(`Failed to fetch LoRA list: ${response.status}`);
      }
      const loraList = await response.json();
      return Array.isArray(loraList) ? loraList : [];
    } catch (error) {
      console.error('Error fetching LoRA list:', error);
      return [];
    }
  }

  // 生成图片（支持LoRA）
  static async generateImageWithLora(prompt: string, apiKey: string, lora?: string, count: number = 4, width: number = 1024, height: number = 1024) {
    const requestData = {
      positive: prompt,
      n: count, // 生成图片数量
      model: "角色形象制作", // 添加必需的model参数
      workflow_name: "角色形象制作", // 添加必需的workflow_name参数
      size: `${width}x${height}`, // 动态尺寸参数
      ...(lora && { lora_name: lora })
    };

    console.log('Generating images with LoRA:', requestData);

    const response = await fetch("https://ai-comfyui.top/api/v1/images/generations", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`API请求失败: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('API Response:', result);

    // 检查返回数据的结构
    if (!result) {
      throw new Error('API返回空数据');
    }

    // 尝试不同的数据结构
    if (result.data && Array.isArray(result.data)) {
      return result;
    } else if (Array.isArray(result)) {
      // 如果直接返回数组
      return { data: result };
    } else if (result.images && Array.isArray(result.images)) {
      // 如果返回的是images字段
      return { data: result.images };
    } else if (result.url) {
      // 如果返回单个URL
      return { data: [{ url: result.url }] };
    } else if (result.urls && Array.isArray(result.urls)) {
      // 如果返回URLs数组
      return { data: result.urls.map((url: string) => ({ url })) };
    } else {
      console.error('Unexpected API response structure:', result);
      throw new Error('API返回数据格式不正确');
    }
  }

  // 生成主体图片（使用新的数据结构）
  static async generateSubjectImage(prompt: string, apiKey: string, lora?: string, count: number = 4, width: number = 1024, height: number = 1024) {
    const requestData = {
      positive: prompt,
      n: count, // 生成图片数量
      model: "角色形象制作", // 添加必需的model参数
      workflow_name: "角色形象制作", // 添加必需的workflow_name参数
      size: `${width}x${height}`, // 动态尺寸参数
      ...(lora && { lora_name: lora })
    };

    console.log('Generating subject images with data:', requestData);

    const response = await fetch("https://ai-comfyui.top/api/v1/images/generations", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      throw new Error(`主体图片生成API请求失败: ${response.status}`);
    }
    return response.json();
  }

  // 保存主体图片
  static async saveSubjectImage(subjectId: string, imageUrl: string, subjectType: 'character' | 'scene') {
    try {
      const response = await fetch(`${BASE_URL}/api/save/subject/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId, imageUrl, subjectType }),
      });
      if (!response.ok) {
        throw new Error('Backend API not available');
      }
      console.log(`Subject image saved to backend: ${subjectId}`);
    } catch (error) {
      // 如果后端不可用，使用本地存储作为后备
      console.warn('Backend not available, saving subject image to localStorage:', error);
      try {
        const imageData = { subjectId, imageUrl, subjectType, timestamp: Date.now() };
        const existingImages = JSON.parse(localStorage.getItem('subject_images') || '[]');

        // 更新或添加图片数据
        const updatedImages = existingImages.filter((img: any) => img.subjectId !== subjectId);
        updatedImages.push(imageData);

        localStorage.setItem('subject_images', JSON.stringify(updatedImages));
        console.log(`Subject image saved to localStorage: ${subjectId}`);
      } catch (localError) {
        console.error('Failed to save subject image to localStorage:', localError);
      }
    }
  }

  // 保存分镜LoRA选择
  static async saveSceneLoraSelection(sceneIndex: number, lora: string) {
    try {
      // 直接使用本地存储，避免CORS问题
      const key = `scene_lora_${sceneIndex}`;
      localStorage.setItem(key, lora);
      console.log(`Saved scene LoRA selection: ${sceneIndex} -> ${lora}`);
    } catch (error) {
      console.error('Error saving scene LoRA selection to localStorage:', error);
    }
  }

  // 加载保存的图片
  static async loadSavedImages(): Promise<any[]> {
    try {
      const response = await fetch(`${BASE_URL}/api/load/images`);
      if (response.ok) {
        const data = await response.json();
        console.log('Images loaded from backend:', data);
        return data;
      }
      throw new Error('Backend API not available');
    } catch (error) {
      // 如果后端不可用，从本地存储加载
      console.warn('Backend not available, loading images from localStorage:', error);
      try {
        const localImages = localStorage.getItem('saved_images');
        if (localImages) {
          const data = JSON.parse(localImages);
          console.log('Images loaded from localStorage:', data);
          return data;
        }
      } catch (localError) {
        console.error('Failed to load images from localStorage:', localError);
      }
      return [];
    }
  }

  // 加载主体图片
  static async loadSubjectImages(): Promise<any[]> {
    try {
      const response = await fetch(`${BASE_URL}/api/load/subject/images`);
      if (response.ok) {
        const data = await response.json();
        console.log('Subject images loaded from backend:', data);
        return data;
      }
      throw new Error('Backend API not available');
    } catch (error) {
      // 如果后端不可用，从本地存储加载
      console.warn('Backend not available, loading subject images from localStorage:', error);
      try {
        const localImages = localStorage.getItem('subject_images');
        if (localImages) {
          const data = JSON.parse(localImages);
          console.log('Subject images loaded from localStorage:', data);
          return data;
        }
      } catch (localError) {
        console.error('Failed to load subject images from localStorage:', localError);
      }
      return [];
    }
  }

  // 加载分镜LoRA选择
  static async loadSceneLoraSelections(): Promise<{ [key: number]: string }> {
    try {
      // 从本地存储加载
      const selections: { [key: number]: string } = {};
      for (let i = 0; i < 100; i++) { // 假设最多100个场景
        const key = `scene_lora_${i}`;
        const lora = localStorage.getItem(key);
        if (lora) {
          selections[i] = lora;
        }
      }
      console.log('Loaded scene LoRA selections:', selections);
      return selections;
    } catch (error) {
      console.error('Error loading scene LoRA selections:', error);
      return {};
    }
  }

  // 专业功能API方法

  // 角色音色设计
  static async generateCharacterVoiceDesign(request: VoiceDesignRequest) {
    const response = await fetch(`${BASE_URL}/api/professional/character/voice/design`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...request,
        projectName: request.projectName || (window as any).currentProjectName || 'default'
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to generate character voice design');
    }
    return response.json();
  }

  static async generateCharacterVoiceAudio(characterId: string, text: string, voiceSettings?: any) {
    const response = await fetch(`${BASE_URL}/api/professional/character/voice/audio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        characterId,
        text,
        voiceSettings,
        projectName: (window as any).currentProjectName || 'default'
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to generate character voice audio');
    }
    return response.json();
  }

  static async saveCharacterVoiceDesign(characterId: string, voiceProfile: VoiceProfile, projectName?: string) {
    const response = await fetch(`${BASE_URL}/api/professional/character/voice/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        characterId,
        voiceProfile,
        projectName: projectName || (window as any).currentProjectName || 'default'
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to save character voice design');
    }
    return response.json();
  }

  static async loadCharacterVoiceDesign(characterId: string, projectName?: string) {
    const params = new URLSearchParams({
      characterId,
      projectName: projectName || (window as any).currentProjectName || 'default'
    });
    const response = await fetch(`${BASE_URL}/api/professional/character/voice/load?${params}`);
    if (response.ok) {
      return response.json();
    }
    return null;
  }

  // 分镜台词生成
  static async generateSceneDialogue(request: DialogueGenerationRequest) {
    const response = await fetch(`${BASE_URL}/api/professional/scene/dialogue/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...request,
        projectName: request.projectName || (window as any).currentProjectName || 'default'
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to generate scene dialogue');
    }
    return response.json();
  }

  static async saveSceneDialogue(sceneId: string, dialogue: SceneDialogue, projectName?: string) {
    const response = await fetch(`${BASE_URL}/api/professional/scene/dialogue/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sceneId,
        dialogue,
        projectName: projectName || (window as any).currentProjectName || 'default'
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to save scene dialogue');
    }
    return response.json();
  }

  static async loadSceneDialogue(sceneId: string, projectName?: string) {
    const params = new URLSearchParams({
      sceneId,
      projectName: projectName || (window as any).currentProjectName || 'default'
    });
    const response = await fetch(`${BASE_URL}/api/professional/scene/dialogue/load?${params}`);
    if (response.ok) {
      return response.json();
    }
    return null;
  }

  // 环境音效设计
  static async generateEnvironmentAudioDesign(request: AudioDesignRequest) {
    const response = await fetch(`${BASE_URL}/api/professional/scene/audio/design`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...request,
        projectName: request.projectName || (window as any).currentProjectName || 'default'
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to generate environment audio design');
    }
    return response.json();
  }

  static async saveEnvironmentAudioDesign(sceneId: string, audioDesign: AudioDesign, projectName?: string) {
    const response = await fetch(`${BASE_URL}/api/professional/scene/audio/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sceneId,
        audioDesign,
        projectName: projectName || (window as any).currentProjectName || 'default'
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to save environment audio design');
    }
    return response.json();
  }

  static async loadEnvironmentAudioDesign(sceneId: string, projectName?: string) {
    const params = new URLSearchParams({
      sceneId,
      projectName: projectName || (window as any).currentProjectName || 'default'
    });
    const response = await fetch(`${BASE_URL}/api/professional/scene/audio/load?${params}`);
    if (response.ok) {
      return response.json();
    }
    return null;
  }

  // 美术风格定义
  static async generateArtStyleGuide(request: ArtStyleRequest) {
    const response = await fetch(`${BASE_URL}/api/professional/art/style/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...request,
        projectName: request.projectName || (window as any).currentProjectName || 'default'
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to generate art style guide');
    }
    return response.json();
  }

  static async saveArtStyleGuide(artStyleGuide: ArtStyleGuide, projectName?: string) {
    const response = await fetch(`${BASE_URL}/api/professional/art/style/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artStyleGuide,
        projectName: projectName || (window as any).currentProjectName || 'default'
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to save art style guide');
    }
    return response.json();
  }

  static async loadArtStyleGuide(projectName?: string) {
    const params = new URLSearchParams({
      projectName: projectName || (window as any).currentProjectName || 'default'
    });
    const response = await fetch(`${BASE_URL}/api/professional/art/style/load?${params}`);
    if (response.ok) {
      return response.json();
    }
    return null;
  }

  // 专业功能列表
  static async listProfessionalFeatures(projectName?: string) {
    const params = new URLSearchParams({
      projectName: projectName || (window as any).currentProjectName || 'default'
    });
    const response = await fetch(`${BASE_URL}/api/professional/features/list?${params}`);
    if (response.ok) {
      return response.json();
    }
    return {
      projectName: projectName || 'default',
      characterVoices: [],
      sceneDialogues: [],
      audioDesigns: [],
      hasArtStyleGuide: false
    };
  }

  // 生成场景元素图片
  static async generateSceneElement(prompt: string, apiKey: string, lora?: string, width: number = 1024, height: number = 1024, count: number = 4) {
    const requestData = {
      positive: prompt,
      n: count,
      model: "角色形象制作",
      workflow_name: "角色形象制作",
      size: `${width}x${height}`,
      ...(lora && { lora_name: lora })
    };

    console.log('Generating scene element images with data:', requestData);

    const response = await fetch("https://ai-comfyui.top/api/v1/images/generations", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      throw new Error(`场景元素生成API请求失败: ${response.status}`);
    }
    return response.json();
  }

  // 生成台词（自动）
  static async generateDialogueForScene(sceneDescription: string, characters: string[], config: APIConfig) {
    const messages = [
      {
        role: 'system',
        content: `你是一个专业的编剧，擅长为影视作品创作自然、生动的台词。请根据场景描述和角色信息，为每个角色生成合适的台词。

要求：
1. 台词要符合角色性格和场景氛围
2. 语言要自然流畅，符合口语习惯
3. 每句台词不超过50字
4. 包含适当的情感表达
5. 返回JSON格式，包含角色名和台词

返回格式示例：
{
  "dialogues": [
    {"character": "角色名", "text": "台词内容", "emotion": "情感"},
    {"character": "角色名", "text": "台词内容", "emotion": "情感"}
  ]
}`
      },
      {
        role: 'user',
        content: `场景描述：${sceneDescription}\n\n角色列表：${characters.join(', ')}\n\n请为这个场景生成台词。`
      }
    ];

    return this.chatCompletion(messages, config, 2000);
  }
}