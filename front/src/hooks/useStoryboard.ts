import { useState, useCallback, useEffect } from 'react';
import { Character, Subject, StoryboardElement } from '../types';
import { APIService } from '../services/api';
import { safeImageUrl, createPlaceholderSVG, sanitizeScenePrompt } from '../utils/helpers';
import { showToast } from '../app/toast';

export const useStoryboard = (currentProject?: any) => {
  const [fragments, setFragments] = useState<string[]>([]);
  const [storyboards, setStoryboards] = useState<string[]>([]);
  const [sceneDescriptions, setSceneDescriptions] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [characterImages, setCharacterImages] = useState<string[]>([]);

  const [storyboardRequiredElements, setStoryboardRequiredElements] = useState<StoryboardElement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [sceneImages, setSceneImages] = useState<string[]>([]);
  const [videoPrompts, setVideoPrompts] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [characterDialogues, setCharacterDialogues] = useState<string[]>([]);
  const [soundEffects, setSoundEffects] = useState<string[]>([]);

  // 初始化数据
  const initialize = useCallback(async () => {
    try {
      // 检查是否有当前项目
      const projectName = (window as any).currentProjectName;
      if (!projectName) {
        console.log('No project selected, skipping data initialization');
        setLoaded(true);
        return;
      }
      
      const data = await APIService.initialize();
      setFragments(data.fragments || []);
      
      // 正确处理初始图片URL
      const initialImages = (data.images || []).map((imageUrl: string) => 
        safeImageUrl(imageUrl)
      );
      setImages(initialImages);
      
    
      await Promise.all([
        loadCharacterInfo(),
        loadSceneDescriptions(),
        loadStoryboards(),
        loadCompleteStoryboardData(),
        loadSavedImages(),
        loadCharacterImages(),
        loadStoryboardElements(),
        loadVideoData(),
      ]);
      
      // 场景图片将通过useEffect在fragments变化时自动加载
      
      setLoaded(true);
    } catch (error) {
      console.error('Error initializing data:', error);
      setLoaded(false);
    }
  }, []);

  // 加载角色信息
  const loadCharacterInfo = useCallback(async () => {
    try {
      const projectName = (window as any).currentProjectName;
      if (!projectName) {
        console.log('No project selected, skipping character info loading');
        return;
      }
      
      const data = await APIService.loadCharacterInfo();
      if (data) {

        setCharacters(data.characters || []);
        
        if (data.characters && data.characters.length > 0) {
          // 检查是否有临时存储的图片映射
          const tempImageMap = (window as any).tempCharacterImageMap;
          if (tempImageMap && Object.keys(tempImageMap).length > 0) {
            // 应用临时存储的图片
            const loadedImages = data.characters.map((_: any, index: number) => {
              return tempImageMap[index] || createPlaceholderSVG();
            });
            setCharacterImages(loadedImages);
            // 清除临时存储
            delete (window as any).tempCharacterImageMap;
            console.log(`Applied temporarily stored character images for ${data.characters.length} characters`);
          } else {
            // 没有临时图片，使用占位符
            const placeholders = data.characters.map(() => createPlaceholderSVG());
            setCharacterImages(placeholders);
          }
        }
      }
    } catch (error) {
      console.error('Error loading character info:', error);
    }
  }, []);

  // 加载场景描述
  const loadSceneDescriptions = useCallback(async () => {
    try {
      const projectName = (window as any).currentProjectName;
      if (!projectName) {
        console.log('No project selected, skipping scene descriptions loading');
        return;
      }
      
      const data = await APIService.loadSceneDescriptions();
      // 从完整的storyboard对象中提取wan22_prompt字段
      const descriptions = (data || []).map((scene: any) => 
        sanitizeScenePrompt(scene.wan22_prompt || scene.scene_description || '')
      );
      setSceneDescriptions(descriptions);
    } catch (error) {
      console.error('Error loading scene descriptions:', error);
    }
  }, []);

  // 加载分镜脚本
  const loadStoryboards = useCallback(async () => {
    try {
      const projectName = (window as any).currentProjectName;
      if (!projectName) {
        console.log('No project selected, skipping storyboards loading');
        return;
      }
      
      const data = await APIService.loadStoryboards();
      setStoryboards(data || []);
    } catch (error) {
      console.error('Error loading storyboards:', error);
    }
  }, []);

  // 加载完整分镜数据
  const loadCompleteStoryboardData = useCallback(async () => {
    try {
      const projectName = (window as any).currentProjectName;
      if (!projectName) {
        console.log('No project selected, skipping complete storyboard data loading');
        return;
      }
      
      const data = await APIService.loadCompleteStoryboardData();
      if (data && data.scenes && data.scenes.length > 0) {
        const scenes = data.scenes;
        const newFragments = scenes.map((scene: any) => scene.novel_fragment || '');
        const newStoryboards = scenes.map((scene: any) => scene.storyboard || '');
        const newDescriptions = scenes.map((scene: any) => sanitizeScenePrompt(scene.wan22_prompt || scene.scene_description || ''));
        const newCharacterDialogues = scenes.map((scene: any) => scene.character_dialogue || '[无台词]');
        const newSoundEffects = scenes.map((scene: any) => scene.sound_effects || '[环境音效待生成]');
        
        // 始终更新数据，确保页面刷新时能重新加载
        setFragments(newFragments);
        setStoryboards(newStoryboards);
        setSceneDescriptions(newDescriptions);
        setCharacterDialogues(newCharacterDialogues);
        setSoundEffects(newSoundEffects);
        
        // 提取分镜图片数据
        const newImages = scenes.map((scene: any) => {
          if (scene.images && scene.images.length > 0) {
            return safeImageUrl(scene.images[0]); // 使用第一张图片
          }
          return createPlaceholderSVG();
        });
        
        // 更新图片数组
        setImages(newImages);
        
        console.log(`Loaded complete storyboard data: ${scenes.length} scenes`);
      }
    } catch (error) {
      console.error('Error loading complete storyboard data:', error);
    }
  }, [fragments.length, storyboards.length, sceneDescriptions.length, characterDialogues.length, soundEffects.length, images.length]);

  // 生成故事和角色
  const generateStoryAndCharacters = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // 首先检查是否存在已保存的故事生成数据
      try {
        const projectName = (window as any).currentProjectName;
        if (projectName) {
          showToast('检查是否存在已保存的故事数据...');
          const response = await APIService.loadStoryGenerationData();
          
          if (response && response.exists) {
            // 文件存在时直接从文件加载，不管内容是否完整
            if (response.data) {
              const existingData = response.data;
              
              // 处理角色数据
              if (existingData.characters && existingData.characters.length > 0) {
                const processedCharacters = existingData.characters.map((char: any) => ({
                  name: char.name,
                  gender: char.gender,
                  age: char.age || '未知',
                  height: char.height || '未知',
                  weight: char.weight || '未知',
                  appearance: char.initial_appearance || char.appearance,
                  personality: char.personality || '',
                  role: char.role || '',
                  englishPrompt: char.englishPrompt || ''
                }));
                
                setCharacters(processedCharacters);
                
                showToast(`从已保存文件加载完成！角色: ${processedCharacters.length}个，场景: ${existingData.scenes?.length || 0}个`);
              } else {
                showToast('文件存在但没有角色数据，已从文件加载');
              }
              
              // 如果有场景数据，也加载场景
              if (existingData.scenes && existingData.scenes.length > 0) {
                if (typeof window !== 'undefined') {
                  (window as any).generatedScenes = existingData.scenes;
                }
              }
            } else {
              showToast('文件存在但内容为空，已从文件加载');
            }
            
            return; // 文件存在时直接返回，不继续执行API生成
          }
        }
      } catch (loadError) {
        console.log('未找到已保存的故事数据，将重新生成:', loadError);
      }
      
      // 如果没有已保存的数据，则重新生成
      showToast('开始生成故事梗概和角色信息，请等待...');
      
      const config = await APIService.getModelConfig();
      
      // 获取小说内容 - 优先使用项目设置中的内容
      let fullNovelContent = '';
      
      // 1. 优先使用项目设置中的小说内容
      if (currentProject?.novelContent) {
        fullNovelContent = currentProject.novelContent;
      }
      // 2. 如果项目设置中没有，使用fragments或从API获取
      else {
        if (fragments.length > 0) {
          fullNovelContent = fragments.join('\n\n');
        } else {
          const projectName = (window as any).currentProjectName;
    if (!projectName) {
      console.error('Project name is required');
      return;
    }
          const response = await fetch(`http://localhost:1198/api/get/novel/fragments?project_name=${encodeURIComponent(projectName)}`);
          if (response.ok) {
            const rawFragments = await response.json();
            fullNovelContent = rawFragments.join('\n\n');
          } else {
            throw new Error('无法获取小说内容，请在项目设置中输入小说内容或加载小说文件');
          }
        }
      }
      
      if (!fullNovelContent.trim()) {
        throw new Error('小说内容为空，请在项目设置中输入小说内容');
      }
      

      const systemPrompt = `你是一个专业的小说分析师。请根据提供的小说内容，生成所有角色信息和主要场景信息。

重要要求：
1. 必须提取所有出现的角色（主角、配角、次要角色都要包含）
2. 角色外观描述必须是初始登场时的样子，不要描述后期受伤或变化后的状态
3. 根据角色描述和年龄推测合理的身高体重（符合角色设定）
4. 必须提取小说中的主要场景环境（不同时期、不同地点的重要场景）
5. 为每个角色和场景生成专业的英文AI图像生成提示词
6. 场景提示词必须只描述环境，不包含任何人物

请严格按照以下JSON格式返回：
{
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
1. 所有角色的初始登场信息（完整健康状态，包含身高体重推测）
2. 小说中的主要场景环境（不同时期、地点的重要场景）

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

      // 保存LLM完整响应数据
      try {
        const projectName = (window as any).currentProjectName || '猛鬼世界';
        await APIService.saveLLMCompleteResponse(result, 'story_generation', projectName);
        console.log('LLM完整响应数据已保存');
      } catch (saveError) {
        console.error('保存LLM响应数据失败:', saveError);
        // 不影响主流程，继续执行
      }

      const content = result.choices[0].message.content;
      
      // 添加JSON修复逻辑
      let parsedContent;
      try {
        parsedContent = JSON.parse(content);
      } catch (parseError) {
        console.error('JSON解析失败，尝试修复:', parseError);
        console.log('原始内容:', content);
        
        // 尝试修复被截断的JSON
        let fixedContent = content.trim();
        
        // 如果JSON被截断，尝试补全
        if (!fixedContent.endsWith('}')) {
          // 查找最后一个完整的对象或数组
          const lastCompleteIndex = Math.max(
            fixedContent.lastIndexOf('},'),
            fixedContent.lastIndexOf('],'),
            fixedContent.lastIndexOf('"}')
          );
          
          if (lastCompleteIndex > 0) {
            // 截取到最后一个完整的结构
            fixedContent = fixedContent.substring(0, lastCompleteIndex + 1);
            
            // 补全缺失的结构
            const openBraces = (fixedContent.match(/{/g) || []).length;
            const closeBraces = (fixedContent.match(/}/g) || []).length;
            const openBrackets = (fixedContent.match(/\[/g) || []).length;
            const closeBrackets = (fixedContent.match(/\]/g) || []).length;
            
            // 补全缺失的括号
            for (let i = 0; i < openBrackets - closeBrackets; i++) {
              fixedContent += ']';
            }
            for (let i = 0; i < openBraces - closeBraces; i++) {
              fixedContent += '}';
            }
          }
        }
        
        try {
          parsedContent = JSON.parse(fixedContent);
          console.log('JSON修复成功');
        } catch (secondError) {
          console.error('JSON修复失败:', secondError);
          throw new Error(`AI返回的数据格式错误，无法解析JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        }
      }
      
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
  const generateSceneStoryboards = useCallback(async (selectedChapters?: number[], dataSource?: 'api' | 'file') => {
    try {
      // 如果是从文件加载数据
      if (dataSource === 'file') {
        showToast('正在从最近文件加载分镜数据...');
        
        try {
          // 尝试从complete_storyboard.json加载
          const completeData = await APIService.loadStoryboardDataFromFile('complete_storyboard.json');
          
          if (completeData && completeData.scenes && completeData.scenes.length > 0) {
            // 直接处理文件加载的数据
            const scenes = completeData.scenes || [];
            const totalScenes = completeData.total_scenes || scenes.length;
            
            if (scenes.length === 0) {
              throw new Error('未生成任何分镜场景');
            }
            
            // 验证数据完整性
            let missingDialogueCount = 0;
            let missingSoundEffectsCount = 0;
            
            scenes.forEach((scene: any, index: number) => {
              if (!scene.character_dialogue) {
                missingDialogueCount++;
                console.warn(`场景${index + 1}缺少character_dialogue字段`);
              }
              if (!scene.sound_effects) {
                missingSoundEffectsCount++;
                console.warn(`场景${index + 1}缺少sound_effects字段`);
              }
            });
            
            if (missingDialogueCount > 0 || missingSoundEffectsCount > 0) {
              showToast(`警告：数据不完整 - 缺少${missingDialogueCount}个台词字段，${missingSoundEffectsCount}个音效字段。已使用默认值填充。`);
            }
            
            // 提取数据
            const newFragments = scenes.map((scene: any) => scene.novel_fragment || '');
            const newStoryboards = scenes.map((scene: any) => scene.storyboard || '');
            const newDescriptions = scenes.map((scene: any) => sanitizeScenePrompt(scene.wan22_prompt || scene.scene_description || ''));
            const newCharacterDialogues = scenes.map((scene: any) => scene.character_dialogue || '[无台词]');
            const newSoundEffects = scenes.map((scene: any) => scene.sound_effects || '[环境音效待生成]');
            
            // 提取分镜元素
            const newStoryboardElements: StoryboardElement[] = scenes.map((scene: any, index: number) => {
              const elements = scene.required_elements || {};
              return {
                scene_index: index,
                characters: elements.characters || [],
                character_subjects: elements.character_subjects || [],
                scene_subjects: elements.scene_subjects || [],
                scene_prompt: elements.scene_prompt || '',
                elements_layout: scene.elements_layout || []
              };
            });
            
            // 更新状态
            setFragments(newFragments);
            setStoryboards(newStoryboards);
            setSceneDescriptions(newDescriptions);
            setCharacterDialogues(newCharacterDialogues);
            setSoundEffects(newSoundEffects);
            setStoryboardRequiredElements(newStoryboardElements);
            setImages(newFragments.map(() => createPlaceholderSVG()));
            setLoaded(true);
            
            // 统计分镜元素
            const totalCharacterSubjects = newStoryboardElements.reduce((sum: number, elem: StoryboardElement) => sum + (elem.character_subjects?.length || 0), 0);
            const totalSceneSubjects = newStoryboardElements.reduce((sum: number, elem: StoryboardElement) => sum + (elem.scene_subjects?.length || 0), 0);
            
            showToast(`分镜从文件加载完成！共${scenes.length}个场景，已分析${totalCharacterSubjects}个角色主体和${totalSceneSubjects}个场景主体`);
            return;
          }
        } catch (error) {
          console.warn('从complete_storyboard.json加载失败，尝试从latest_llm_response加载:', error);
        }
        
        try {
          // 尝试从latest_llm_response_storyboard_generation.json加载
          const llmData = await APIService.loadStoryboardDataFromFile('latest_llm_response_storyboard_generation.json');
          
          if (llmData && llmData.choices && llmData.choices[0] && llmData.choices[0].message) {
            const content = llmData.choices[0].message.content;
            const parsedContent = JSON.parse(content);
            
            if (parsedContent.scenes && parsedContent.scenes.length > 0) {
              // 直接处理文件加载的数据
              const scenes = parsedContent.scenes || [];
              const totalScenes = parsedContent.total_scenes || scenes.length;
              
              if (scenes.length === 0) {
                throw new Error('未生成任何分镜场景');
              }
              
              // 验证数据完整性
              let missingDialogueCount = 0;
              let missingSoundEffectsCount = 0;
              
              scenes.forEach((scene: any, index: number) => {
                if (!scene.character_dialogue) {
                  missingDialogueCount++;
                  console.warn(`场景${index + 1}缺少character_dialogue字段`);
                }
                if (!scene.sound_effects) {
                  missingSoundEffectsCount++;
                  console.warn(`场景${index + 1}缺少sound_effects字段`);
                }
              });
              
              if (missingDialogueCount > 0 || missingSoundEffectsCount > 0) {
                showToast(`警告：数据不完整 - 缺少${missingDialogueCount}个台词字段，${missingSoundEffectsCount}个音效字段。已使用默认值填充。`);
              }
              
              // 提取数据
              const newFragments = scenes.map((scene: any) => scene.novel_fragment || '');
              const newStoryboards = scenes.map((scene: any) => scene.storyboard || '');
              const newDescriptions = scenes.map((scene: any) => sanitizeScenePrompt(scene.wan22_prompt || scene.scene_description || ''));
              const newCharacterDialogues = scenes.map((scene: any) => scene.character_dialogue || '[无台词]');
              const newSoundEffects = scenes.map((scene: any) => scene.sound_effects || '[环境音效待生成]');
              
              // 提取分镜元素
              const newStoryboardElements: StoryboardElement[] = scenes.map((scene: any, index: number) => {
                const elements = scene.required_elements || {};
                return {
                  scene_index: index,
                  characters: elements.characters || [],
                  character_subjects: elements.character_subjects || [],
                  scene_subjects: elements.scene_subjects || [],
                  scene_prompt: elements.scene_prompt || '',
                  elements_layout: scene.elements_layout || []
                };
              });
              
              // 更新状态
              setFragments(newFragments);
              setStoryboards(newStoryboards);
              setSceneDescriptions(newDescriptions);
              setCharacterDialogues(newCharacterDialogues);
              setSoundEffects(newSoundEffects);
              setStoryboardRequiredElements(newStoryboardElements);
              setImages(newFragments.map(() => createPlaceholderSVG()));
              setLoaded(true);
              
              // 统计分镜元素
              const totalCharacterSubjects = newStoryboardElements.reduce((sum: number, elem: StoryboardElement) => sum + (elem.character_subjects?.length || 0), 0);
              const totalSceneSubjects = newStoryboardElements.reduce((sum: number, elem: StoryboardElement) => sum + (elem.scene_subjects?.length || 0), 0);
              
              showToast(`分镜从文件加载完成！共${scenes.length}个场景，已分析${totalCharacterSubjects}个角色主体和${totalSceneSubjects}个场景主体`);
              return;
            }
          }
        } catch (error) {
          console.error('从latest_llm_response加载失败:', error);
          showToast('从最近文件加载失败，请检查文件是否存在或重新生成');
          return; // 直接返回，不继续执行API生成逻辑
        }
      }
      
      showToast('开始生成分镜脚本...');
      
      if (characters.length === 0) {
        showToast('请先生成故事梗概和角色信息');
        return;
      }
      
      const config = await APIService.getModelConfig();
      
      // 获取项目尺寸设置
      let projectWidth = 1280;
      let projectHeight = 720;
      
      if (currentProject?.defaultSizeConfig) {
        projectWidth = currentProject.defaultSizeConfig.width || 1280;
        projectHeight = currentProject.defaultSizeConfig.height || 720;
      } else {
        // 使用默认配置
        projectWidth = 1280;
        projectHeight = 720;
      }
      
      // 获取小说内容 - 支持选定章节
      let novelContent = '';
      let sourceFragments: string[] = [];
      
      // 1. 优先使用项目设置中的小说内容
      if (currentProject?.novelContent) {
        // 如果项目设置中有完整内容，需要按行分割成fragments
        sourceFragments = currentProject.novelContent.split('\n\n').filter((f: string) => f.trim());
      }
      // 2. 如果项目设置中没有，使用fragments或从API获取
      else {
        if (fragments.length > 0) {
          sourceFragments = fragments;
        } else {
          try {
            const projectName = (window as any).currentProjectName;
    if (!projectName) {
      console.error('Project name is required');
      return;
    }
            const response = await fetch(`http://localhost:1198/api/get/novel/fragments?project_name=${encodeURIComponent(projectName)}`);
            if (response.ok) {
              sourceFragments = await response.json();
            } else {
              throw new Error('无法获取小说内容，请在项目设置中输入小说内容或加载小说文件');
            }
          } catch (error) {
            throw new Error('无法获取小说内容，请在项目设置中输入小说内容或加载小说文件');
          }
        }
      }
      
      // 根据选定章节过滤内容
      if (selectedChapters && selectedChapters.length > 0) {
        const selectedFragments = selectedChapters
          .filter(index => index >= 0 && index < sourceFragments.length)
          .map(index => sourceFragments[index]);
        novelContent = selectedFragments.join('\n\n');
        showToast(`正在为选定的${selectedChapters.length}个章节生成分镜脚本...`);
      } else {
        novelContent = sourceFragments.join('\n\n');
      }
      
      if (!novelContent.trim()) {
        throw new Error('小说内容为空，请在项目设置中输入小说内容');
      }
      
      // 构建角色信息字符串
      const charactersInfo = characters.map(char => 
        `@${char.name}: ${char.gender}, ${char.age}, ${char.appearance}`
      ).join('\n');
      
      const systemPrompt = `你是专业的分镜脚本师。请将小说内容分解为分镜场景。

故事梗概：[已移除]

角色信息：
${charactersInfo}

**重要要求：**
1. 必须返回完整有效的JSON格式
2. 不能有编码问题或乱码
3. 确保JSON结构完整，不被截断

**分镜要求：**
- 包含镜头类型和角度
- 描述角色外观和动作
- 场景环境描述
- 场景环境英文提示词（wan22_prompt 和 required_elements.scene_prompt）必须为纯环境描述，严禁任何与人类相关的词汇（person, people, character, man, woman, boy, girl, human, figure, silhouette, body, face, hand, arm, leg, head, clothing, dress, shirt, pants, shoes, hat, jacket, uniform, standing, sitting, walking, running 等；以及中文：人物、角色、人影、身影、人、男、女、他、她、它、身体、脸、手、腿、头、肖像、背影、侧影、轮廓、剪影、服装、衣服、姿态、动作、手势等）；如原文出现人物或动作请完全忽略，仅聚焦地点/建筑/室内外环境/自然/天气/光线/氛围/物件等非生命元素；并且显式包含：uninhabited, no human presence, no human traces, empty of people, no human figures, no human activity

**JSON格式要求：**
{
  "total_scenes": 场景数量,
  "scenes": [
    {
      "scene_id": 1,
      "novel_fragment": "小说片段",
      "storyboard": "分镜描述",
      "wan22_prompt": "masterpiece, best quality, ultra detailed, 8k, photorealistic, [英文描述]",
      "character_dialogue": "台词或[无台词]",
      "sound_effects": "音效描述",
      "elements_layout": [
        {
          "element_type": "scene",
          "name": "场景名",
          "prompt": "场景描述",
          "x": 0,
          "y": 0,
          "width": ${projectWidth},
          "height": ${projectHeight}
        }
      ],
      "required_elements": {
        "characters": ["角色列表"],
        "character_subjects": ["@角色名"],
        "scene_subjects": ["@场景名"],
        "scene_prompt": "场景描述"
      }
    }
  ]
}

**关键：只返回JSON内容，确保格式正确，避免编码问题！**
- 专业音效师级别的场景音效描述
- 包含环境音、动作音效、情绪音效
- 具体描述音效类型、强度、时长
- 例如："轻柔的风声，脚步声在石板路上回响，远处传来鸟鸣声，营造宁静祥和氛围"

**重要提醒：你必须为每个场景生成character_dialogue和sound_effects字段，这是必需的！**

**重要：必须返回有效的JSON格式，不能有任何格式错误、重复结构或编码问题！**

请严格按照以下JSON格式返回，确保每个场景都包含character_dialogue、sound_effects和elements_layout字段：
{
  "total_scenes": 场景总数,
  "scenes": [
    {
      "scene_id": 场景编号,
      "novel_fragment": "对应的小说片段内容",
      "storyboard": "专业分镜脚本描述（包含镜头类型、角度、构图等）",
      "wan22_prompt": "masterpiece, best quality, ultra detailed, 8k, photorealistic, cinematic lighting, [详细的ComfyUI WAN2.2格式描述]",
      "character_dialogue": "角色台词内容或[无台词]",
      "sound_effects": "专业音效师提示词，描述环境音、动作音效等",
      "elements_layout": [
        {
          "element_type": "scene",
          "name": "场景名称",
          "prompt": "场景描述",
          "x": 0,
          "y": 0,
          "width": ${projectWidth},
          "height": ${projectHeight}
        },
        {
          "element_type": "character",
          "name": "角色名称",
          "prompt": "角色描述",
          "x": "根据位置分析的x坐标",
          "y": "根据位置分析的y坐标",
          "width": "根据范围分析的宽度",
          "height": "根据范围分析的高度"
        }
      ],
      "required_elements": {
        "characters": ["出现的角色名称列表"],
        "character_subjects": ["需要的角色主体标签，格式：@角色名"],
        "scene_subjects": ["需要的场景主体标签，格式：@场景名"],
        "scene_prompt": "场景环境描述"
      }
    }
  ]
}

**JSON格式要求：**
1. 必须是完整有效的JSON，不能有语法错误
2. 不能有重复的字段或结构
3. 字符串必须用双引号包围
4. 数字不能用引号包围
5. 最后一个元素后不能有逗号
6. 确保所有括号正确闭合`;

      const userPrompt = `小说内容：
${novelContent}

请将小说分解为分镜场景。

**必需字段（每个场景都必须包含）：**
- scene_id: 场景编号（数字）
- novel_fragment: 小说片段（字符串）
- storyboard: 分镜描述（字符串）
- wan22_prompt: 英文提示词（字符串，以"masterpiece, best quality"开头，且为纯环境描述，需显式包含"uninhabited, no human presence, no human traces, empty of people, no human figures, no human activity"）
- character_dialogue: 台词或"[无台词]"（字符串）
- sound_effects: 音效描述（字符串）
- elements_layout: 布局数组（至少包含一个scene元素）
- required_elements: 对象，包含characters、character_subjects、scene_subjects、scene_prompt（scene_prompt同样为纯环境英文提示词，严禁任何人物相关词汇）

**重要：**
1. 只返回JSON内容，不要其他文字
2. 确保JSON格式完整有效
3. 避免中文编码问题
4. 不能有语法错误或重复结构
5. 确保所有括号正确闭合

请返回符合上述格式的完整JSON。`;

      const result = await APIService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], config, 12000);

      // 保存LLM完整响应数据
      try {
        const projectName = (window as any).currentProjectName || '猛鬼世界';
        await APIService.saveLLMCompleteResponse(result, 'storyboard_generation', projectName);
        console.log('LLM完整响应数据已保存');
      } catch (saveError) {
        console.error('保存LLM响应数据失败:', saveError);
        // 不影响主流程，继续执行
      }

      const content = result.choices[0].message.content;
      
      // 添加调试日志
      console.log('AI返回的原始内容:', content);
      console.log('内容长度:', content.length);
      
      // 检查内容是否以JSON格式开始和结束
      const trimmedContent = content.trim();
      if (!trimmedContent.startsWith('{') || !trimmedContent.endsWith('}')) {
        console.error('AI返回的内容不是有效的JSON格式');
        throw new Error('AI返回的内容格式不正确，请重新生成');
      }
      
      try {
        // 解析JSON响应
        const parsedContent = JSON.parse(trimmedContent);
        
        // 直接处理API生成的数据
        const scenes = parsedContent.scenes || [];
        const totalScenes = parsedContent.total_scenes || scenes.length;
        
        if (scenes.length === 0) {
          throw new Error('未生成任何分镜场景');
        }
        
        if (scenes.length < 20) {
          showToast(`警告：只生成了${scenes.length}个场景，建议重新生成以获得更多场景`);
        }
        
        // 验证数据完整性
        let missingDialogueCount = 0;
        let missingSoundEffectsCount = 0;
        
        scenes.forEach((scene: any, index: number) => {
          if (!scene.character_dialogue) {
            missingDialogueCount++;
            console.warn(`场景${index + 1}缺少character_dialogue字段`);
          }
          if (!scene.sound_effects) {
            missingSoundEffectsCount++;
            console.warn(`场景${index + 1}缺少sound_effects字段`);
          }
        });
        
        if (missingDialogueCount > 0 || missingSoundEffectsCount > 0) {
          showToast(`警告：数据不完整 - 缺少${missingDialogueCount}个台词字段，${missingSoundEffectsCount}个音效字段。已使用默认值填充。`);
        }
        
        // 提取数据
        const newFragments = scenes.map((scene: any) => scene.novel_fragment || '');
        const newStoryboards = scenes.map((scene: any) => scene.storyboard || '');
        const newDescriptions = scenes.map((scene: any) => sanitizeScenePrompt(scene.wan22_prompt || scene.scene_description || ''));
        const newCharacterDialogues = scenes.map((scene: any) => scene.character_dialogue || '[无台词]');
        const newSoundEffects = scenes.map((scene: any) => scene.sound_effects || '[环境音效待生成]');
        
        // 提取分镜元素
        const newStoryboardElements: StoryboardElement[] = scenes.map((scene: any, index: number) => {
          const elements = scene.required_elements || {};
          return {
            scene_index: index,
            characters: elements.characters || [],
            character_subjects: elements.character_subjects || [],
            scene_subjects: elements.scene_subjects || [],
            scene_prompt: elements.scene_prompt || '',
            elements_layout: scene.elements_layout || []
          };
        });
        
        // 更新状态
        setFragments(newFragments);
        setStoryboards(newStoryboards);
        setSceneDescriptions(newDescriptions);
        setCharacterDialogues(newCharacterDialogues);
        setSoundEffects(newSoundEffects);
        setStoryboardRequiredElements(newStoryboardElements);
        setImages(newFragments.map(() => createPlaceholderSVG()));
        
        // API生成时保存数据
        const fullStoryboardData = {
          total_scenes: totalScenes,
          generated_at: new Date().toISOString(),
          story_summary: '',
          characters: characters,
          // raw_ai_response字段已废弃，不再保存
          scenes: scenes.map((scene: any, index: number) => ({
            scene_id: scene.scene_id || index + 1,
            novel_fragment: scene.novel_fragment || '',
            storyboard: scene.storyboard || '',
            wan22_prompt: sanitizeScenePrompt(scene.wan22_prompt || scene.scene_description || ''),
            character_dialogue: scene.character_dialogue || '[无台词]',
            sound_effects: scene.sound_effects || '[环境音效待生成]',
            required_elements: scene.required_elements || {},
            generated_at: new Date().toISOString()
          }))
        };
        
        await APIService.saveCompleteStoryboardData(fullStoryboardData);
        await APIService.saveSceneDescriptions(newDescriptions);
        await APIService.saveStoryboards(newStoryboards);
        await APIService.saveStoryboardElements(newStoryboardElements);
        
        setLoaded(true);
        
        // 统计分镜元素
        const totalCharacterSubjects = newStoryboardElements.reduce((sum: number, elem: StoryboardElement) => sum + (elem.character_subjects?.length || 0), 0);
        const totalSceneSubjects = newStoryboardElements.reduce((sum: number, elem: StoryboardElement) => sum + (elem.scene_subjects?.length || 0), 0);
        
        showToast(`分镜生成完成！共${scenes.length}个场景，已分析${totalCharacterSubjects}个角色主体和${totalSceneSubjects}个场景主体`);
        
        // 继续执行LoRA推荐逻辑
        try {
          showToast('正在为分镜场景搜索最合适的LoRA模型...');
          
          // 收集所有唯一的角色和场景描述
          const uniqueCharacterPrompts = new Set<string>();
          const uniqueScenePrompts = new Set<string>();
          
          scenes.forEach((scene: any) => {
            // 收集角色描述
            if (scene.required_elements?.characters) {
              scene.required_elements.characters.forEach((charName: string) => {
                const character = characters.find(c => c.name === charName);
                if (character?.englishPrompt) {
                  uniqueCharacterPrompts.add(character.englishPrompt);
                }
              });
            }
            
            // 收集场景描述
            if (scene.wan22_prompt) {
              uniqueScenePrompts.add(scene.wan22_prompt);
            }
            if (scene.required_elements?.scene_prompt) {
              uniqueScenePrompts.add(scene.required_elements.scene_prompt);
            }
          });
          
          const allPrompts = [...Array.from(uniqueCharacterPrompts), ...Array.from(uniqueScenePrompts)];
          
          if (allPrompts.length > 0) {
            // 为每个提示词搜索LoRA模型
            const loraRecommendations = [];
            
            for (const prompt of allPrompts.slice(0, 5)) { // 限制搜索数量避免API限制
              try {
                const searchResults = await APIService.searchCivitaiModels({
                  query: prompt.substring(0, 100), // 限制查询长度
                  types: ['LORA'],
                  sort: 'Highest Rated',
                  limit: 3
                });
                
                if (searchResults.items && searchResults.items.length > 0) {
                  loraRecommendations.push({
                    prompt: prompt.substring(0, 50) + '...',
                    models: searchResults.items.slice(0, 2) // 每个提示词推荐2个模型
                  });
                }
                
                // 添加延迟避免API限制
                await new Promise(resolve => setTimeout(resolve, 1000));
              } catch (searchError) {
                console.warn('LoRA搜索失败:', searchError);
              }
            }
            
            if (loraRecommendations.length > 0) {
              // 保存LoRA推荐结果
              const loraRecommendationData = {
                generated_at: new Date().toISOString(),
                total_scenes: scenes.length,
                recommendations: loraRecommendations,
                search_summary: {
                  character_prompts_count: uniqueCharacterPrompts.size,
                  scene_prompts_count: uniqueScenePrompts.size,
                  total_recommendations: loraRecommendations.reduce((sum, rec) => sum + rec.models.length, 0)
                }
              };
              
              // 保存推荐结果到后端
              try {
                await APIService.saveLoraRecommendations(loraRecommendationData);
                showToast(`LoRA模型推荐完成！为${loraRecommendations.length}个场景类型找到了${loraRecommendationData.search_summary.total_recommendations}个推荐模型`);
              } catch (saveError) {
                console.error('保存LoRA推荐失败:', saveError);
                showToast('LoRA推荐生成成功，但保存失败');
              }
            } else {
              showToast('未找到合适的LoRA模型推荐');
            }
          }
        } catch (loraError) {
          console.error('LoRA模型搜索失败:', loraError);
          showToast('LoRA模型搜索失败，但分镜生成已完成');
        }
        
      } catch (parseError) {
        console.error('JSON解析失败:', parseError);
        console.error('解析失败的内容:', trimmedContent.substring(0, 1000) + '...');
        
        // 尝试找到JSON格式问题的具体位置
        if (parseError instanceof SyntaxError) {
          const errorMessage = parseError.message;
          console.error('JSON语法错误详情:', errorMessage);
          showToast(`JSON格式错误: ${errorMessage}`);
        } else {
          showToast('分镜数据格式解析失败，请重试');
        }
      }
      
    } catch (error) {
      console.error('Error generating storyboards:', error);
      showToast(`分镜生成失败: ${(error as Error).message}`);
      setLoaded(false);
    }
  }, [characters, fragments]);

  // 加载保存的图片
  const loadSavedImages = useCallback(async () => {
    try {
      const projectName = (window as any).currentProjectName;
      if (!projectName) {
        console.log('No project selected, skipping saved images loading');
        return;
      }
      
      // 首先尝试从分镜数据中加载图片
      try {
        const storyboardData = await APIService.loadCompleteStoryboardData();
        if (storyboardData && storyboardData.scenes && storyboardData.scenes.length > 0) {
          const storyboardImages = storyboardData.scenes.map((scene: any) => {
            if (scene.images && scene.images.length > 0) {
              return safeImageUrl(scene.images[0]);
            }
            return createPlaceholderSVG();
          });
          setImages(storyboardImages);
          console.log('Storyboard images loaded successfully');
          return;
        }
      } catch (storyboardError) {
        console.log('No storyboard images found, trying saved images');
      }
      
      // 如果没有分镜图片，则从保存的图片中加载
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
      const projectName = (window as any).currentProjectName;
      if (!projectName) {
        console.log('No project selected, skipping character images loading');
        return;
      }
      
      const data = await APIService.loadCharacterImages();
      
      if (data && data.character_images && Array.isArray(data.character_images)) {
        // 创建一个按角色索引映射的图片数组
        const imageMap: { [key: number]: string } = {};
        
        // 将后端返回的图片按character_index映射
        data.character_images.forEach((imageInfo: any) => {
          if (imageInfo && imageInfo.image_url && typeof imageInfo.character_index === 'number') {
            imageMap[imageInfo.character_index] = safeImageUrl(`${imageInfo.image_url}?v=${Date.now()}`);
          }
        });
        
        // 如果有角色信息，根据角色数量创建图片数组；否则暂存，待角色加载后再设置
        if (characters.length > 0) {
          const loadedImages = characters.map((_, index) => imageMap[index] || createPlaceholderSVG());
          setCharacterImages(loadedImages);
          console.log(`Loaded character images for ${characters.length} characters, ${Object.keys(imageMap).length} images found`);
        } else if (Object.keys(imageMap).length > 0) {
          // 临时存储图片映射
          (window as any).tempCharacterImageMap = imageMap;
          console.log(`Temporarily stored ${Object.keys(imageMap).length} character images`);
        }
      }
    } catch (error) {
      console.error('Error loading character images:', error);
    }
  }, [characters.length]);

  // 加载分镜元素
  const loadStoryboardElements = useCallback(async () => {
    try {
      const projectName = (window as any).currentProjectName;
      if (!projectName) {
        console.log('No project selected, skipping storyboard elements loading');
        return;
      }
      
      // 从各个scene_X.json文件中加载elements_layout数据
      const data = await APIService.loadStoryboardElements();
      setStoryboardRequiredElements(data || []);
    } catch (error) {
      console.error('Error loading storyboard elements:', error);
      // 如果加载失败，尝试从完整分镜数据中提取
      try {
        const completeData = await APIService.loadCompleteStoryboardData();
        if (completeData && completeData.scenes) {
          const elements = completeData.scenes.map((scene: any, index: number) => ({
            scene_index: index,
            characters: scene.required_elements?.characters || [],
            character_subjects: scene.required_elements?.character_subjects || [],
            scene_subjects: scene.required_elements?.scene_subjects || [],
            scene_prompt: scene.required_elements?.scene_prompt || '',
            elements_layout: scene.elements_layout || []
          }));
          setStoryboardRequiredElements(elements);
        }
      } catch (fallbackError) {
        console.error('Fallback loading also failed:', fallbackError);
      }
     }
   }, []);

  // 加载场景图片
  const loadSceneImages = useCallback(async () => {
    try {
      const projectName = (window as any).currentProjectName;
      if (!projectName) {
        console.log('No project selected, skipping scene images loading');
        return;
      }
      
      const data = await APIService.loadSceneImages();
      
      if (data && data.scene_images && Array.isArray(data.scene_images)) {
        const imageMap: { [key: number]: string } = {};
        data.scene_images.forEach((imageInfo: any) => {
          if (imageInfo && imageInfo.image_url && typeof imageInfo.scene_index === 'number') {
            if (!imageMap[imageInfo.scene_index]) {
              imageMap[imageInfo.scene_index] = safeImageUrl(`${imageInfo.image_url}?v=${Date.now()}`);
            }
          }
        });

        // 删除：嵌套在 loadSceneImages 内部的 useEffect（无效）
        // 确保在 fragments 加载完成后再次加载场景图片，避免初始化时并发导致的竞态
        // useEffect(() => {
        //   if (fragments.length > 0) {
        //     loadSceneImages();
        //   }
        // }, [fragments.length, loadSceneImages]);
      
        if (fragments.length > 0) {
          const loadedImages = fragments.map((_, index) => imageMap[index] || "");
          setSceneImages(loadedImages);
          console.log(`Loaded scene images for ${fragments.length} fragments, ${Object.keys(imageMap).length} images found`);
        } else {
          console.log('No fragments available, cannot map scene images');
        }
      } else if (fragments.length > 0) {
        setSceneImages(fragments.map(() => ""));
      }
    } catch (error) {
      console.error('Error loading scene images:', error);
      if (fragments.length > 0) {
        setSceneImages(fragments.map(() => ""));
      }
    }
  }, [fragments.length]);

  // 在 fragments 变化时触发场景图片加载
  useEffect(() => {
    if (fragments.length > 0) {
      console.log('Fragments loaded, triggering scene images load:', fragments.length);
      loadSceneImages();
    }
  }, [fragments.length, loadSceneImages]);

  // 加载视频数据
  const loadVideoData = useCallback(async () => {
    try {
      const projectName = (window as any).currentProjectName;
      if (!projectName) {
        console.log('No project selected, skipping video data loading');
        return;
      }
      
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

    storyboardRequiredElements,
    isLoading,
    loaded,
    sceneImages,
    videoPrompts,
    videos,
    characterDialogues,
    soundEffects,
    
    // 设置器
    setFragments,
    setStoryboards,
    setSceneDescriptions,
    setImages,
    setCharacters,
    setCharacterImages,

    setStoryboardRequiredElements,
    setSceneImages,
    setVideoPrompts,
    setVideos,
    setCharacterDialogues,
    setSoundEffects,
    
    // 方法
    initialize,
    generateStoryAndCharacters,
    generateSceneStoryboards,
  };
};