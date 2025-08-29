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
    const projectName = (window as any).currentProjectName;
    if (!projectName) {
      throw new Error('No project selected');
    }
    const response = await fetch(`${BASE_URL}/api/load/story/info?projectName=${encodeURIComponent(projectName)}`);
    if (response.ok) {
      return response.json();
    }
    return null;
  }

  // 保存角色信息
  static async saveCharacterInfo(data: { summary: string; characters: Character[] }) {
    const projectName = (window as any).currentProjectName;
    if (!projectName) {
      throw new Error('No project selected');
    }
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
    const projectName = (window as any).currentProjectName || '猛鬼世界';
    const response = await fetch(`${BASE_URL}/api/load/scene/descriptions?project_name=${encodeURIComponent(projectName)}`);
    if (response.ok) {
      return response.json();
    }
    return [];
  }

  // 保存场景描述
  static async saveSceneDescriptions(descriptions: string[]) {
    const projectName = (window as any).currentProjectName || '猛鬼世界';
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
    const projectName = (window as any).currentProjectName || '猛鬼世界';
    const response = await fetch(`${BASE_URL}/api/load/storyboards?projectName=${encodeURIComponent(projectName)}`);
    if (response.ok) {
      return response.json();
    }
    return [];
  }

  // 保存分镜脚本
  static async saveStoryboards(storyboards: string[]) {
    const projectName = (window as any).currentProjectName || '猛鬼世界';
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
    const projectName = (window as any).currentProjectName || '猛鬼世界';
    const response = await fetch(`${BASE_URL}/api/load/complete/storyboard?projectName=${encodeURIComponent(projectName)}`);
    if (response.ok) {
      return response.json();
    }
    return null;
  }

  // 保存完整分镜数据
  static async saveCompleteStoryboardData(data: CompleteStoryboardData) {
    const projectName = (window as any).currentProjectName || '猛鬼世界';
    const dataWithProject = { ...data, project_name: projectName };
    const response = await fetch(`${BASE_URL}/api/save/complete/storyboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataWithProject),
    });
    if (!response.ok) {
      throw new Error('Failed to save complete storyboard data');
    }
  }

  // 加载主体数据
  static async loadSubjects(projectName: string = '猛鬼世界') {
    try {
      const response = await fetch(`${BASE_URL}/api/load/subjects?projectName=${encodeURIComponent(projectName)}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Subjects loaded from backend:', data);
        return data;
      }
      throw new Error('Backend API not available');
    } catch (error) {
      console.error('Error loading subjects:', error);
      // 返回默认数据
      return { characterSubjects: [], sceneSubjects: [], novelScenes: '' };
    }
  }

  // 保存主体数据
  static async saveSubjects(data: {
    characterSubjects: Subject[];
    sceneSubjects: Subject[];
  }) {
    try {
      // 获取当前项目名称
      const projectName = (window as any).currentProjectName;
      if (!projectName) {
        throw new Error('No project selected');
      }
      
      const response = await fetch(`${BASE_URL}/api/save/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, projectName }),
      });
      if (!response.ok) {
        throw new Error('Failed to save subjects to backend');
      }
      console.log('Subjects saved to backend successfully');
    } catch (error) {
      console.error('Error saving subjects:', error);
      throw error;
    }
  }

  // 上传主体图片 - 使用现有的角色图片上传端点
  static async uploadSubjectImage(file: File, subjectType: 'character' | 'scene' = 'character') {
    const formData = new FormData();
    formData.append('image', file);
    const projectName = (window as any).currentProjectName;
    if (!projectName) {
      throw new Error('No project selected');
    }
    formData.append('projectName', projectName);

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
  static async generateImage(prompt: string, apiKey: string, width: number = 1024, height: number = 1024, model: string = "角色形象制作") {
    // 翻译中文提示词为英文
    let translatedPrompt = prompt;
    try {
      console.log('原始提示词:', prompt);
      const translateResult = await this.translatePrompts(prompt);
      if (translateResult.success && translateResult.translated_prompts) {
        translatedPrompt = Array.isArray(translateResult.translated_prompts) 
          ? translateResult.translated_prompts[0] 
          : translateResult.translated_prompts;
        console.log('翻译后提示词:', translatedPrompt);
      } else {
        console.warn('翻译失败，使用原始提示词:', translateResult.message || '未知错误');
      }
    } catch (error) {
      console.warn('翻译服务异常，使用原始提示词:', error);
    }

    const response = await fetch("https://api.easyai.tech/v1/images/generations", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        prompt: translatedPrompt,
        width,
        height,
        model,
        n: 1
      })
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }
    return response.json();
  }

  // AI 聊天完成
  static async chatCompletion(messages: any[], config: APIConfig, maxTokens?: number) {
    const requestBody: any = {
      model: config.model || 'Meta-Llama-3.1-405B-Instruct',
      messages,
      temperature: 0.7
    };
    
    // 只有当明确指定maxTokens时才添加max_tokens限制
    if (maxTokens && maxTokens > 0) {
      requestBody.max_tokens = maxTokens;
    }
    
    const response = await fetch(config.url || 'https://api.sambanova.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apikey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }
    return response.json();
  }

  // 保存LLM完整响应数据
  static async saveLLMCompleteResponse(responseData: any, responseType: string, projectName: string = '猛鬼世界') {
    try {
      const response = await fetch(`${BASE_URL}/api/save/llm/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectName,
          responseData,
          responseType
        })
      });
      
      if (!response.ok) {
        throw new Error(`保存LLM响应失败: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('保存LLM完整响应数据失败:', error);
      throw error;
    }
  }

  // 保存故事信息
  static async saveStoryInfo(data: { summary: string; characters: Character[] }) {
    const projectName = (window as any).currentProjectName || '猛鬼世界';
    const response = await fetch(`${BASE_URL}/api/save/story/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, projectName }),
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
  static async saveImage(index: number, imageUrl: string, description: string = '', isUpload: boolean = false) {
    try {
      // 获取当前项目名称
      const projectName = (window as any).currentProjectName;
      if (!projectName) {
        throw new Error('No project selected');
      }
      
      const response = await fetch(`${BASE_URL}/api/save/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index, imageUrl, description, projectName, isUpload }),
      });
      if (!response.ok) {
        throw new Error('Failed to save image');
      }
      console.log(`Image saved to backend: index ${index}, project: ${projectName}, url: ${imageUrl}`);
    } catch (error) {
      console.error('Error saving image:', error);
      throw error;
    }
  }

  // 加载角色图片
  static async loadCharacterImages() {
    const projectName = (window as any).currentProjectName;
    if (!projectName) {
      throw new Error('No project selected');
    }
    const response = await fetch(`${BASE_URL}/api/load/character/images?projectName=${encodeURIComponent(projectName)}`);
    if (response.ok) {
      return response.json();
    }
    return null;
  }

  // 加载场景图片
  static async loadSceneImages() {
    const projectName = (window as any).currentProjectName;
    if (!projectName) {
      throw new Error('No project selected');
    }
    const response = await fetch(`${BASE_URL}/api/load/scene/images?projectName=${encodeURIComponent(projectName)}`);
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



  // 保存分镜元素到各个scene_X.json文件
  static async saveStoryboardElements(elements: StoryboardElement[]) {
    try {
      const projectName = (window as any).currentProjectName || '猛鬼世界';
      
      // 将每个元素保存到对应的scene_X.json文件中
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const sceneIndex = element.scene_index || (i + 1);
        
        // 构建要更新的场景数据
        const sceneUpdateData = {
          elements_layout: element.elements_layout || [],
          required_elements: {
            character_subjects: element.character_subjects || [],
            scene_subjects: element.scene_subjects || [],
            scene_prompt: element.scene_prompt || ''
          }
        };
        
        // 调用更新单个场景文件的API
        const response = await fetch(`${BASE_URL}/api/update/scene/${sceneIndex}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_name: projectName,
            scene_data: sceneUpdateData
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to save scene ${sceneIndex} elements`);
        }
      }
      
      console.log('Storyboard elements saved to scene files successfully');
    } catch (error) {
      console.error('Error saving storyboard elements:', error);
      throw error;
    }
  }

  // 保存角色图片
  static async saveCharacterImage(characterIndex: number, imageUrl: string, characterInfo: Character) {
    const projectName = (window as any).currentProjectName;
    if (!projectName) {
      throw new Error('Project name is required');
    }
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
    // 本地备用LoRA列表
    const fallbackLoraList = [];

    try {
      const response = await fetch('http://localhost:1198/api/proxy/lora/list');
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
  static async generateImageWithLora(prompt: string, apiKey: string, lora?: string, count: number = 4, width: number = 1024, height: number = 1024, model: string = "角色形象制作") {
    // 翻译中文提示词为英文
    let translatedPrompt = prompt;
    try {
      console.log('原始提示词:', prompt);
      const translateResult = await this.translatePrompts(prompt);
      if (translateResult.success && translateResult.translated_prompts) {
        translatedPrompt = Array.isArray(translateResult.translated_prompts) 
          ? translateResult.translated_prompts[0] 
          : translateResult.translated_prompts;
        console.log('翻译后提示词:', translatedPrompt);
      } else {
        console.warn('翻译失败，使用原始提示词:', translateResult.message || '未知错误');
      }
    } catch (error) {
      console.warn('翻译服务异常，使用原始提示词:', error);
    }

    // 兼容多LoRA格式：例如 "<lora:path:1.00>,<lora:path2:0.75>"
    const hasLoraTags = (val?: string) => !!val && /<\s*lora\s*:/i.test(val);

    // 默认以翻译后的提示词作为positive
    let positive = translatedPrompt;

    const requestData: any = {
      positive,
      n: count, // 生成图片数量
      model, // 动态model参数
      workflow_name: model, // 动态workflow_name参数
      width, // 宽度参数
      height // 高度参数
    };

    if (lora) {
      if (hasLoraTags(lora)) {
        // 多LoRA标签：使用lora参数而不是拼接到提示词中
        requestData.lora = lora;
      } else {
        // 旧版：单一LoRA路径
        requestData.lora_name = lora;
      }
    }

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
      throw new Error(`图片生成API请求失败: ${response.status}`);
    }
    return response.json();
  }

  // 从文件加载故事梗概和角色数据
  static async loadStoryDataFromFile(filePath: string) {
    try {
      const projectName = (window as any).currentProjectName || '猛鬼世界';
      const response = await fetch(`${BASE_URL}/api/load/file/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, projectName }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load data from file: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Error loading story data from file:', error);
      throw error;
    }
  }

  // 从latest_llm_response_story_generation.json加载角色和场景数据
  static async loadStoryGenerationData() {
    try {
      const projectName = (window as any).currentProjectName || '猛鬼世界';
      const response = await fetch(`${BASE_URL}/api/load/story/generation?projectName=${encodeURIComponent(projectName)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load story generation data: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Error loading story generation data:', error);
      throw error;
    }
  }

  // 从文件加载分镜脚本数据
  static async loadStoryboardDataFromFile(filePath: string) {
    try {
      const projectName = (window as any).currentProjectName || '猛鬼世界';
      // 根据文件路径确定文件类型
      let fileType = 'storyboard'; // 默认为storyboard类型，对应latest_llm_response_storyboard_generation.json
      if (filePath.includes('complete_storyboard.json')) {
        fileType = 'complete';
      }
      
      const params = new URLSearchParams({
        projectName: projectName,
        file_type: fileType
      });
      
      const response = await fetch(`${BASE_URL}/api/load/file/data?${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load storyboard data from file: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Error loading storyboard data from file:', error);
      throw error;
    }
  }

  // 生成主体图片（使用新的数据结构）
  static async generateSubjectImage(prompt: string, apiKey: string, lora?: string, count: number = 4, width: number = 1024, height: number = 1024, model: string = "角色形象制作") {
    // 翻译中文提示词为英文
    let translatedPrompt = prompt;
    try {
      console.log('原始提示词:', prompt);
      const translateResult = await this.translatePrompts(prompt);
      if (translateResult.success && translateResult.translated_prompts) {
        translatedPrompt = Array.isArray(translateResult.translated_prompts) 
          ? translateResult.translated_prompts[0] 
          : translateResult.translated_prompts;
        console.log('翻译后提示词:', translatedPrompt);
      } else {
        console.warn('翻译失败，使用原始提示词:', translateResult.message || '未知错误');
      }
    } catch (error) {
      console.warn('翻译服务异常，使用原始提示词:', error);
    }

    const hasLoraTags = (val?: string) => !!val && /<\s*lora\s*:/i.test(val);

    let positive = translatedPrompt;

    const requestData: any = {
      positive,
      n: count, // 生成图片数量
      model, // 动态model参数
      workflow_name: model, // 动态workflow_name参数
      width, // 宽度参数
      height // 高度参数
    };

    // 兼容多LoRA标签：当 lora 中包含 <lora:...> 标签时，直接拼接到 positive，并跳过 lora_name
    if (lora) {
      if (hasLoraTags(lora)) {
        requestData.positive = `${positive}, ${lora}`;
      } else {
        requestData.lora_name = lora;
      }
    }

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
  static async saveSubjectImage(subjectId: string, imageUrl: string, subjectType: 'character' | 'scene', isUpload: boolean = false) {
    try {
      const projectName = (window as any).currentProjectName;
      if (!projectName) {
        throw new Error('No project selected');
      }
      const response = await fetch(`${BASE_URL}/api/save/subject/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId, imageUrl, subjectType, projectName, isUpload }),
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
      const projectName = (window as any).currentProjectName;
      if (!projectName) {
        throw new Error('No project selected');
      }
      const response = await fetch(`${BASE_URL}/api/save/scene/lora/selection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          scene_index: sceneIndex, 
          lora_selection: lora,
          project_name: projectName
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to save scene LoRA selection');
      }
      console.log(`Saved scene LoRA selection: ${sceneIndex} -> ${lora}`);
    } catch (error) {
      console.error('Error saving scene LoRA selection:', error);
      throw error;
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
      throw new Error('Failed to load images');
    } catch (error) {
      console.error('Error loading images:', error);
      return [];
    }
  }

  // 加载主体图片
  static async loadSubjectImages(): Promise<any[]> {
    try {
      const projectName = (window as any).currentProjectName;
      if (!projectName) {
        throw new Error('No project selected');
      }
      const params = new URLSearchParams({ project_name: projectName });
      const response = await fetch(`${BASE_URL}/api/load/subject/images?${params}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Subject images loaded from backend:', data);
        return data;
      }
      throw new Error('Backend API not available');
    } catch (error) {
      console.error('Error loading subject images:', error);
      return [];
    }
  }

  // 加载分镜LoRA选择
  static async loadSceneLoraSelections(): Promise<{ [key: number]: string }> {
    try {
      const projectName = (window as any).currentProjectName;
      if (!projectName) {
        throw new Error('No project selected');
      }
      const response = await fetch(`${BASE_URL}/api/load/scene/lora/selections?projectName=${encodeURIComponent(projectName)}`);
      if (!response.ok) {
        throw new Error('Failed to load scene LoRA selections');
      }
      const selections = await response.json();
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
        projectName: request.projectName || (window as any).currentProjectName || (() => { throw new Error('No project selected'); })()
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
        projectName: (window as any).currentProjectName || (() => { throw new Error('No project selected'); })()
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
        projectName: projectName || (window as any).currentProjectName || (() => { throw new Error('No project selected'); })()
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
      projectName: projectName || (window as any).currentProjectName || (() => { throw new Error('No project selected'); })()
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
        projectName: request.projectName || (window as any).currentProjectName || (() => { throw new Error('No project selected'); })()
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
        projectName: projectName || (window as any).currentProjectName || (() => { throw new Error('No project selected'); })()
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
      projectName: projectName || (window as any).currentProjectName || (() => { throw new Error('No project selected'); })()
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
        projectName: request.projectName || (window as any).currentProjectName || (() => { throw new Error('No project selected'); })()
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
        projectName: projectName || (window as any).currentProjectName || (() => { throw new Error('No project selected'); })()
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
      projectName: projectName || (window as any).currentProjectName || (() => { throw new Error('No project selected'); })()
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
        projectName: request.projectName || (window as any).currentProjectName || (() => { throw new Error('No project selected'); })()
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
        projectName: projectName || (window as any).currentProjectName || (() => { throw new Error('No project selected'); })()
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to save art style guide');
    }
    return response.json();
  }

  static async loadArtStyleGuide(projectName?: string) {
    const params = new URLSearchParams({
      projectName: projectName || (window as any).currentProjectName || (() => { throw new Error('No project selected'); })()
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
      projectName: projectName || (window as any).currentProjectName || (() => { throw new Error('Project name is required'); })()
    });
    const response = await fetch(`${BASE_URL}/api/professional/features/list?${params}`);
    if (response.ok) {
      return response.json();
    }
    return {
      projectName: projectName || (() => { throw new Error('Project name is required'); })(),
      characterVoices: [],
      sceneDialogues: [],
      audioDesigns: [],
      hasArtStyleGuide: false
    };
  }

  // 生成场景元素图片
  static async generateSceneElement(prompt: string, apiKey: string, lora?: string, width: number = 1024, height: number = 1024, count: number = 4, model: string = "场景制作") {
    // 翻译中文提示词为英文
    let translatedPrompt = prompt;
    try {
      console.log('原始提示词:', prompt);
      const translateResult = await this.translatePrompts(prompt);
      if (translateResult.success && translateResult.translated_prompts) {
        translatedPrompt = Array.isArray(translateResult.translated_prompts) 
          ? translateResult.translated_prompts[0] 
          : translateResult.translated_prompts;
        console.log('翻译后提示词:', translatedPrompt);
      } else {
        console.warn('翻译失败，使用原始提示词:', translateResult.message || '未知错误');
      }
    } catch (error) {
      console.warn('翻译服务异常，使用原始提示词:', error);
    }

    const hasLoraTags = (val?: string) => !!val && /<\s*lora\s*:/i.test(val);

    let positive = translatedPrompt;

    const requestData: any = {
      positive: positive,
      n: count,
      model, // 动态model参数
      workflow_name: model, // 动态workflow_name参数
      width, // 宽度参数
      height // 高度参数
    };

    if (lora) {
      if (hasLoraTags(lora)) {
        // 多LoRA标签：直接合并到提示词
        requestData.positive = `${positive}, ${lora}`;
      } else {
        // 旧版：单一LoRA路径
        (requestData as any).lora_name = lora;
      }
    }

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

  // 获取工作流定义（分区控制）
  static async getWorkflowDefinition(workflowId: string = '68a91e69cb037f63d249afe8'): Promise<any> {
    const url = `https://ai-comfyui.top/api//workflow/${workflowId}`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      throw new Error(`获取工作流定义失败: ${res.status}`);
    }
    return res.json();
  }

  // 从工作流定义构建分区控制参数映射
  static buildRegionParamMappingFromWorkflow(data: any) {
    try {
      const params: any[] = data?.data?.params || data?.params || [];
      const findByTitle = (title: string) => params.find(p => p.title === title)?.name;

      // 顶层画布宽高
      const imageWidthKey = findByTitle('宽度') || 'width';
      const imageHeightKey = findByTitle('高度') || 'height';

      // 场景/元素参数
      const mapping = {
        image: {
          width: imageWidthKey,
          height: imageHeightKey,
        },
        elements: [
          {
            lora: findByTitle('lora') || 'custom_string',
            photo: findByTitle('photo') || 'custom_string_4',
            x: findByTitle('x') || 'custom_number_2',
            y: findByTitle('y') || 'custom_number_3',
            width: findByTitle('width') || 'custom_number',
            height: findByTitle('height') || 'custom_number_1',
            positive: findByTitle('positive') || 'positive',
          },
          {
            lora: findByTitle('lora_1') || 'custom_string_1',
            photo: findByTitle('photo_1') || 'custom_string_5',
            x: findByTitle('x_1') || 'custom_number_6',
            y: findByTitle('y_1') || 'custom_number_7',
            width: findByTitle('width_1') || 'custom_number_4',
            height: findByTitle('height_1') || 'custom_number_5',
            positive: findByTitle('positive_1') || 'positive_1',
          },
          {
            lora: findByTitle('lora_2') || 'custom_string_2',
            photo: findByTitle('photo_2') || 'custom_string_6',
            x: findByTitle('x_2') || 'custom_number_10',
            y: findByTitle('y_2') || 'custom_number_11',
            width: findByTitle('width_2') || 'custom_number_8',
            height: findByTitle('height_2') || 'custom_number_9',
            positive: findByTitle('positive_2') || 'positive_2',
          },
          {
            lora: findByTitle('lora_3') || 'custom_string_3',
            photo: findByTitle('photo_3') || 'custom_string_7',
            x: findByTitle('x_3') || 'custom_number_14',
            y: findByTitle('y_3') || 'custom_number_15',
            width: findByTitle('width_3') || 'custom_number_12',
            height: findByTitle('height_3') || 'custom_number_13',
            positive: findByTitle('positive_3') || 'positive_3',
          }
        ]
      };

      return mapping;
    } catch (e) {
      // 兜底：返回默认映射
      return {
        image: { width: 'width', height: 'height' },
        elements: [
          { lora: 'custom_string', photo: 'custom_string_4', x: 'custom_number_2', y: 'custom_number_3', width: 'custom_number', height: 'custom_number_1', positive: 'positive' },
          { lora: 'custom_string_1', photo: 'custom_string_5', x: 'custom_number_6', y: 'custom_number_7', width: 'custom_number_4', height: 'custom_number_5', positive: 'positive_1' },
          { lora: 'custom_string_2', photo: 'custom_string_6', x: 'custom_number_10', y: 'custom_number_11', width: 'custom_number_8', height: 'custom_number_9', positive: 'positive_2' },
          { lora: 'custom_string_3', photo: 'custom_string_7', x: 'custom_number_14', y: 'custom_number_15', width: 'custom_number_12', height: 'custom_number_13', positive: 'positive_3' },
        ]
      };
    }
  }

  // 获取分区控制参数映射
  static async getRegionControlParamMapping(workflowId: string = '68a91e69cb037f63d249afe8') {
    try {
      const def = await this.getWorkflowDefinition(workflowId);
      const mapping = this.buildRegionParamMappingFromWorkflow(def);
      return mapping;
    } catch (e) {
      // 失败时也提供默认映射
      const fallback = {
        image: { width: 'width', height: 'height' },
        elements: [
          { lora: 'custom_string', photo: 'custom_string_4', x: 'custom_number_2', y: 'custom_number_3', width: 'custom_number', height: 'custom_number_1', positive: 'positive' },
          { lora: 'custom_string_1', photo: 'custom_string_5', x: 'custom_number_6', y: 'custom_number_7', width: 'custom_number_4', height: 'custom_number_5', positive: 'positive_1' },
          { lora: 'custom_string_2', photo: 'custom_string_6', x: 'custom_number_10', y: 'custom_number_11', width: 'custom_number_8', height: 'custom_number_9', positive: 'positive_2' },
          { lora: 'custom_string_3', photo: 'custom_string_7', x: 'custom_number_14', y: 'custom_number_15', width: 'custom_number_12', height: 'custom_number_13', positive: 'positive_3' },
        ]
      };
      return fallback;
    }
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

  // 移除getRegionControlParams方法，直接使用标准接口

  // 使用分区控制接口生成图片
  static async generateImageWithRegionControl(params: any, apiKey: string) {
    const requestData = {
      workflow_name: "分区控制",
      model: "分区控制",
      ...params
    };
    
    console.log('Generating image with region control:', requestData);
    
    const response = await fetch('https://ai-comfyui.top/api/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestData),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Region control API Error Response:', errorText);
      throw new Error(`分区控制图片生成失败: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Region control API Response:', result);
    return result;
  }

  // 保存LoRA推荐结果
  static async saveLoraRecommendations(data: any) {
    const projectName = (window as any).currentProjectName;
    if (!projectName) {
      throw new Error('Project name is required');
    }
    const response = await fetch(`${BASE_URL}/api/lora/recommendations/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, projectName }),
    });
    if (!response.ok) {
      throw new Error('Failed to save LoRA recommendations');
    }
    return response.json();
  }

  // 翻译提示词（专用于图像生成）
  static async translatePrompts(prompts: string | string[]) {
    const response = await fetch(`${BASE_URL}/api/translate/prompts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompts })
    });

    if (!response.ok) {
      throw new Error(`翻译请求失败: ${response.status}`);
    }
    return response.json();
  }

  // 单个文本翻译
  static async translateText(text: string) {
    const response = await fetch(`${BASE_URL}/api/translate/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      throw new Error(`翻译请求失败: ${response.status}`);
    }
    return response.json();
  }

  // 从complete_storyboard.json加载分镜元素
  static async loadStoryboardElements(projectName?: string) {
    const params = new URLSearchParams({
      projectName: projectName || (window as any).currentProjectName || (() => { throw new Error('Project name is required'); })()
    });
    const response = await fetch(`${BASE_URL}/api/load/storyboard/elements?${params}`);
    if (!response.ok) {
      throw new Error('Failed to load storyboard elements');
    }
    return response.json();
  }

  // 搜索Civitai模型
  static async searchCivitaiModels(params: {
    query?: string;
    types?: string[];
    sort?: string;
    limit?: number;
    [key: string]: any;
  }) {
    try {
      const url = new URL(`${BASE_URL}/api/civitai/models`);
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              value.forEach(v => url.searchParams.append(key, v.toString()));
            } else {
              url.searchParams.append(key, value.toString());
            }
          }
        });
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Civitai models search failed:', error);
      throw error;
    }
  }

  // 项目设置管理
  static async saveProjectSettings(data: {
    projectName?: string;
    projectId?: string;
    description?: string;
    createdAt?: string;
    defaultSizeConfig?: any;
    novelContent?: string;
  }) {
    try {
      const projectName = data.projectName || (window as any).currentProjectName;
    if (!projectName) {
      throw new Error('Project name is required');
    }
      
      const response = await fetch(`${BASE_URL}/api/project/settings/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, projectName }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save project settings');
      }
      
      console.log('Project settings saved successfully');
      return response.json();
    } catch (error) {
      console.error('Error saving project settings:', error);
      throw error;
    }
  }

  static async loadProjectSettings(projectName?: string) {
    try {
      const name = projectName || (window as any).currentProjectName;
    if (!name) {
      throw new Error('Project name is required');
    }
      
      const response = await fetch(`${BASE_URL}/api/project/settings/load?projectName=${encodeURIComponent(name)}`);
      
      if (!response.ok) {
        throw new Error('Failed to load project settings');
      }
      
      return response.json();
    } catch (error) {
      console.error('Error loading project settings:', error);
      throw error;
    }
  }

  static async getGlobalSettings() {
    try {
      const response = await fetch(`${BASE_URL}/api/global/settings`);
      
      if (!response.ok) {
        throw new Error('Failed to get global settings');
      }
      
      return response.json();
    } catch (error) {
      console.error('Error getting global settings:', error);
      throw error;
    }
  }
}