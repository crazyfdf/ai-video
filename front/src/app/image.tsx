"use client"

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { ToastContainer } from "react-toastify";
import { useStoryboard } from '../hooks/useStoryboard';
import { useSubjects } from '../hooks/useSubjects';
import { SubjectCreationModal } from '../components/SubjectCreationModal';
import { StorySceneManagement } from '../components/StorySceneManagement';
import { StoryboardCard } from '../components/StoryboardCard';
import { ReactSelectLoraSelector } from '../components/ReactSelectLoraSelector';
import { APIService } from '../services/api';
import { safeImageUrl } from '../utils/helpers';
import { showToast } from './toast';
import '../styles/components.css';

// 项目管理相关类型
interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectFile {
  id: string;
  projectId: string;
  type: 'novel' | 'prompt' | 'image' | 'character' | 'scene';
  name: string;
  content?: string;
  url?: string;
  metadata?: any;
  createdAt: string;
}

export default function AIImageGenerator() {
  // 使用自定义 hooks
  const {
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
    setStoryboards,
    setSceneDescriptions,
    setStorySummary,
    setVideoPrompts,
    setVideos,
    setImages,
    setCharacters,
    setCharacterImages,
    initialize,
    generateStoryAndCharacters: originalGenerateStoryAndCharacters,
    generateSceneStoryboards,
  } = useStoryboard();

  const {
    characterSubjects,
    sceneSubjects,
    novelScenes,
    isCreatingSubject,
    subjectCreationMode,
    setIsCreatingSubject,
    createCharacterSubject,
    createSceneSubject,
    createNewSceneSubject,
    createNewCharacterSubject,
    uploadSubjectImage,
    updateNovelScenes,
    updateSceneSubject,
    loadSubjects,
  } = useSubjects();

  // 预览状态
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);
  const [isVideoPreviewOpen, setIsVideoPreviewOpen] = useState<boolean>(false);

  // 视频相关状态
  const [isGeneratingVideo, setIsGeneratingVideo] = useState<boolean>(false);
  
  // 额外角色图片状态
  const [additionalCharacterImages, setAdditionalCharacterImages] = useState<{[key: number]: string[]}>({});
  
  // 折叠状态管理
  const [characterPanelCollapsed, setCharacterPanelCollapsed] = useState<boolean>(false);
  const [scenePanelCollapsed, setScenePanelCollapsed] = useState<boolean>(false);
  const [characterItemsCollapsed, setCharacterItemsCollapsed] = useState<{[key: number]: boolean}>({});
  const [sceneItemsCollapsed, setSceneItemsCollapsed] = useState<{[key: number]: boolean}>({});
  
  // LoRA相关状态
  const [loraList, setLoraList] = useState<string[]>([]);
  const [isLoadingLora, setIsLoadingLora] = useState<boolean>(false);
  const [sceneLoraSelections, setSceneLoraSelections] = useState<{[key: number]: string}>({});
  const [isSmartGenerating, setIsSmartGenerating] = useState<{[key: number]: boolean}>({});

  // 项目管理状态
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  // 完整故事内容状态
  const [fullStoryContent, setFullStoryContent] = useState('');

  // 增强版的生成故事和角色函数，同时生成场景主体
  const generateStoryAndCharacters = async () => {
    try {
      // 调用原始函数
      await originalGenerateStoryAndCharacters();
      
      // 检查是否有生成的场景数据
      const generatedScenes = (window as any).generatedScenes;
      if (generatedScenes && generatedScenes.length > 0) {
        // 为每个场景创建主体
        for (const scene of generatedScenes) {
          try {
            await createSceneSubject(scene.name, scene.englishPrompt, []);
            showToast(`场景主体 "${scene.name}" 创建成功`);
          } catch (error) {
            console.error(`Error creating scene subject ${scene.name}:`, error);
          }
        }
        
        // 清理临时数据
        delete (window as any).generatedScenes;
        
        showToast(`场景主体创建完成！共创建${generatedScenes.length}个场景主体`);
      }
    } catch (error) {
      console.error('Error in enhanced generate story and characters:', error);
      showToast(`生成失败: ${(error as Error).message}`);
    }
  };

  useEffect(() => {
    initialize();
    loadLoraList();
    loadSceneLoraSelections();
    loadProjects();
    
    // 检查是否有当前项目，如果没有则强制显示项目创建模态框
    const currentProjectId = localStorage.getItem('current_project_id');
    if (!currentProjectId) {
      setShowProjectModal(true);
    }
  }, [initialize]);

  // 项目管理功能
  const loadProjects = async () => {
    try {
      const savedProjects = localStorage.getItem('ai_projects');
      if (savedProjects) {
        const projectList = JSON.parse(savedProjects);
        setProjects(projectList);
        
        // 如果有当前项目ID，加载该项目
        const currentProjectId = localStorage.getItem('current_project_id');
        if (currentProjectId) {
          const project = projectList.find((p: Project) => p.id === currentProjectId);
          if (project) {
            setCurrentProject(project);
            loadProjectFiles(project.id);
            // 设置全局项目名称，供后端使用
            (window as any).currentProjectName = project.name;
          }
        }
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const createProject = async () => {
    if (!newProjectName.trim()) {
      showToast('请输入项目名称');
      return;
    }

    const newProject: Project = {
      id: Date.now().toString(),
      name: newProjectName.trim(),
      description: newProjectDescription.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    localStorage.setItem('ai_projects', JSON.stringify(updatedProjects));
    
    setCurrentProject(newProject);
    localStorage.setItem('current_project_id', newProject.id);
    // 设置全局项目名称，供后端使用
    (window as any).currentProjectName = newProject.name;
    
    setNewProjectName('');
    setNewProjectDescription('');
    setShowProjectModal(false);
    
    showToast(`项目 "${newProject.name}" 创建成功`);
  };

  const switchProject = async (project: Project) => {
    setCurrentProject(project);
    localStorage.setItem('current_project_id', project.id);
    await loadProjectFiles(project.id);
    // 设置全局项目名称，供后端使用
    (window as any).currentProjectName = project.name;
    showToast(`已切换到项目 "${project.name}"`);
  };

  const loadProjectFiles = async (projectId: string) => {
    try {
      const savedFiles = localStorage.getItem(`project_files_${projectId}`);
      if (savedFiles) {
        setProjectFiles(JSON.parse(savedFiles));
      } else {
        setProjectFiles([]);
      }
    } catch (error) {
      console.error('Error loading project files:', error);
      setProjectFiles([]);
    }
  };

  const saveProjectFile = async (type: ProjectFile['type'], name: string, content?: string, url?: string, metadata?: any) => {
    if (!currentProject) {
      showToast('请先选择或创建项目');
      return;
    }

    const newFile: ProjectFile = {
      id: Date.now().toString(),
      projectId: currentProject.id,
      type,
      name,
      content,
      url,
      metadata,
      createdAt: new Date().toISOString()
    };

    const updatedFiles = [...projectFiles, newFile];
    setProjectFiles(updatedFiles);
    localStorage.setItem(`project_files_${currentProject.id}`, JSON.stringify(updatedFiles));
    
    showToast(`${name} 已保存到项目 "${currentProject.name}"`);
  };

  // 保存完整故事内容到项目
  const saveFullStoryToProject = async () => {
    if (!fullStoryContent.trim()) {
      return; // 静默返回，不显示错误
    }

    if (!currentProject) {
      showToast('请先选择或创建项目');
      return;
    }

    try {
      const title = `完整故事_${new Date().toLocaleString('zh-CN').replace(/[/:]/g, '-')}`;
      const response = await fetch('http://localhost:1198/api/save/novel/to/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: fullStoryContent,
          title: title,
          projectName: currentProject.name
        }),
      });

      if (!response.ok) {
        throw new Error('保存失败');
      }

      const result = await response.json();
      showToast(result.message);
      
      // 同时保存到本地项目文件列表
      await saveProjectFile('novel', title, fullStoryContent);
      
    } catch (error) {
      console.error('Error saving full story:', error);
      showToast(`故事保存失败: ${(error as Error).message}`);
    }
  };

  // 保存图片到项目
  const saveImageToProject = async (imageUrl: string, description: string, index: number) => {
    if (!currentProject) {
      showToast('请先选择项目');
      return;
    }

    const fileName = `场景图片_${index + 1}_${new Date().toLocaleString('zh-CN').replace(/[/:]/g, '-')}`;
    await saveProjectFile('image', fileName, description, imageUrl, { sceneIndex: index });
  };

  // 保存角色到项目
  const saveCharacterToProject = async (character: any, imageUrl?: string) => {
    if (!currentProject) {
      showToast('请先选择项目');
      return;
    }

    const fileName = `角色_${character.name}_${new Date().toLocaleString('zh-CN').replace(/[/:]/g, '-')}`;
    await saveProjectFile('character', fileName, JSON.stringify(character), imageUrl, { characterData: character });
  };

  // 加载分镜LoRA选择
  const loadSceneLoraSelections = async () => {
    try {
      const selections = await APIService.loadSceneLoraSelections();
      setSceneLoraSelections(selections);
      console.log('Loaded scene LoRA selections:', selections);
    } catch (error) {
      console.error('Error loading scene LoRA selections:', error);
    }
  };

  // 加载LoRA列表
  const loadLoraList = async () => {
    try {
      setIsLoadingLora(true);
      const loras = await APIService.getLoraList();
      setLoraList(loras);
      console.log(`Loaded ${loras.length} LoRA models`);
    } catch (error) {
      console.error('Error loading LoRA list:', error);
      showToast('LoRA列表加载失败');
    } finally {
      setIsLoadingLora(false);
    }
  };

  // 处理分镜LoRA选择变化
  const handleSceneLoraChange = async (sceneIndex: number, lora: string) => {
    const newSelections = {
      ...sceneLoraSelections,
      [sceneIndex]: lora
    };
    setSceneLoraSelections(newSelections);
    
    // 保存分镜LoRA选择到本地存储或后端
    try {
      await APIService.saveSceneLoraSelection(sceneIndex, lora);
    } catch (error) {
      console.error('Error saving scene LoRA selection:', error);
    }
  };

  // 处理分镜脚本变化
  const handleStoryboardChange = async (index: number, value: string) => {
    const newStoryboards = [...storyboards];
    newStoryboards[index] = value;
    setStoryboards(newStoryboards);
    
    // 保存分镜脚本
    try {
      await APIService.saveStoryboards(newStoryboards);
    } catch (error) {
      console.error('Error saving storyboards:', error);
    }
  };

  // 处理场景描述变化
  const handleSceneDescriptionChange = async (index: number, value: string) => {
    const newDescriptions = [...sceneDescriptions];
    newDescriptions[index] = value;
    setSceneDescriptions(newDescriptions);
    
    // 保存场景描述
    try {
      await APIService.saveSceneDescriptions(newDescriptions);
    } catch (error) {
      console.error('Error saving scene descriptions:', error);
    }
  };

  // 处理视频提示词变化
  const handleVideoPromptChange = async (index: number, value: string) => {
    const newVideoPrompts = [...videoPrompts];
    newVideoPrompts[index] = value;
    setVideoPrompts(newVideoPrompts);
    
    // 保存视频提示词
    try {
      await APIService.saveVideoPrompt(index, value);
    } catch (error) {
      console.error('Error saving video prompt:', error);
    }
  };

  // 处理场景主体变化
  const handleSceneSubjectChange = async (index: number, field: string, value: string) => {
    try {
      await updateSceneSubject(index, field, value);
    } catch (error) {
      console.error('Error updating scene subject:', error);
      showToast('场景主体更新失败');
    }
  };

  // 合并片段
  const handleMergeFragments = (index: number, direction: 'up' | 'down') => {
    console.log('Merge fragments:', index, direction);
    showToast('合并片段功能待实现');
  };

  // 生成图片
  const handleGenerateImage = async (index: number) => {
    try {
      showToast(`开始生成第${index + 1}个画面...`);
      
      // 获取配置
      const config = await APIService.getModelConfig();
      const API_KEY = config.easyaiApiKey;
      
      if (!API_KEY) {
        throw new Error('EasyAI API Key未配置，请在初始化页面配置');
      }

      // 构建完整的提示词
      let finalPrompt = sceneDescriptions[index] || '';
      
      // 如果有所需元素信息，添加到提示词中
      const requiredElements = storyboardRequiredElements[index];
      if (requiredElements) {
        // 添加角色主体标签
        if (requiredElements.character_subjects && requiredElements.character_subjects.length > 0) {
          const characterTags = requiredElements.character_subjects.map((subjectTag: string) => {
            const subjectName = subjectTag.replace('@', '');
            const character = characters.find(char => char.name === subjectName);
            return character?.englishPrompt || '';
          }).filter(tag => tag.length > 0);
          
          if (characterTags.length > 0) {
            finalPrompt += ', ' + characterTags.join(', ');
          }
        }
        
        // 添加场景环境信息
        if (requiredElements.scene_prompt) {
          finalPrompt += ', ' + requiredElements.scene_prompt;
        }
      }
      
      // 如果最终提示词为空，使用默认提示词
      if (!finalPrompt.trim()) {
        finalPrompt = "masterpiece, best quality, ultra detailed, 8k, photorealistic, cinematic lighting";
      }

      console.log(`Final prompt for scene ${index + 1}:`, finalPrompt);

      // 获取选择的LoRA
      const selectedLora = sceneLoraSelections[index];

      // 生成图片（支持LoRA），生成单张图片
      const result = await APIService.generateImageWithLora(finalPrompt, API_KEY, selectedLora, 1);
      
      if (result.data && result.data.length > 0) {
        const imageUrl = result.data[0].url;
        
        // 更新图片
        const newImages = [...images];
        newImages[index] = safeImageUrl(imageUrl);
        setImages(newImages);
        
        // 保存图片
        await APIService.saveImage(index, imageUrl, sceneDescriptions[index] || '');
        
        // 自动保存到当前项目
        if (currentProject) {
          await saveImageToProject(imageUrl, sceneDescriptions[index] || '', index);
        }
        
        const loraInfo = selectedLora ? ` (使用LoRA: ${selectedLora.split('\\').pop()})` : '';
        showToast(`第${index + 1}个画面生成成功${loraInfo}！`);
      } else {
        throw new Error('未收到有效的图片数据');
      }
      
    } catch (error) {
      console.error('Error generating image:', error);
      showToast(`图片生成失败: ${(error as Error).message}`);
    }
  };

  // 智能生成图片（根据分镜元素应用LoRA）
  const handleGenerateImageWithElements = async (index: number) => {
    try {
      // 设置生成状态
      setIsSmartGenerating(prev => ({ ...prev, [index]: true }));
      showToast(`开始智能生成第${index + 1}个分镜图片...`);
      
      // 检查是否有分镜元素分析结果
      if (!storyboardRequiredElements[index]) {
        showToast('请先分析分镜所需元素');
        return;
      }
      
      // 获取EasyAI API Key
      const config = await APIService.getModelConfig();
      const API_KEY = config.easyaiApiKey;
      
      if (!API_KEY) {
        throw new Error('EasyAI API Key未配置，请在初始化页面配置');
      }

      const requiredElements = storyboardRequiredElements[index];
      let finalPrompt = sceneDescriptions[index] || '';
      const lorasToUse: string[] = [];
      
      // 收集角色主体的LoRA
      if (requiredElements.character_subjects) {
        requiredElements.character_subjects.forEach((charSubject: string) => {
          const charName = charSubject.replace('@', '');
          const charSubjectData = characterSubjects.find(cs => cs.name === charName);
          if (charSubjectData?.selectedLora) {
            lorasToUse.push(charSubjectData.selectedLora);
            // 添加角色标签到提示词
            if (charSubjectData.tag) {
              finalPrompt += `, ${charSubjectData.tag}`;
            }
          }
        });
      }
      
      // 收集场景主体的LoRA
      if (requiredElements.scene_subjects) {
        requiredElements.scene_subjects.forEach((sceneSubject: string) => {
          const sceneName = sceneSubject.replace('@', '');
          const sceneSubjectData = sceneSubjects.find(ss => ss.name === sceneName);
          if (sceneSubjectData?.selectedLora) {
            lorasToUse.push(sceneSubjectData.selectedLora);
            // 添加场景标签到提示词
            if (sceneSubjectData.tag) {
              finalPrompt += `, ${sceneSubjectData.tag}`;
            }
          }
        });
      }
      
      // 添加场景环境提示词
      if (requiredElements.scene_prompt) {
        finalPrompt += `, ${requiredElements.scene_prompt}`;
      }
      
      // 如果最终提示词为空，使用默认提示词
      if (!finalPrompt.trim()) {
        finalPrompt = "masterpiece, best quality, ultra detailed, 8k, photorealistic, cinematic lighting";
      }

      console.log(`Smart generation for scene ${index + 1}:`);
      console.log('Final prompt:', finalPrompt);
      console.log('LoRAs to use:', lorasToUse);

      // LoRA合并策略：优先使用角色LoRA，如果没有则使用场景LoRA
      let primaryLora: string | undefined = undefined;
      let loraStrategy = '';
      
      // 首先查找角色LoRA
      if (requiredElements.character_subjects) {
        for (const charSubject of requiredElements.character_subjects) {
          const charName = charSubject.replace('@', '');
          const charSubjectData = characterSubjects.find(cs => cs.name === charName);
          if (charSubjectData?.selectedLora) {
            primaryLora = charSubjectData.selectedLora;
            loraStrategy = `角色LoRA(${charName})`;
            break;
          }
        }
      }
      
      // 如果没有角色LoRA，使用场景LoRA
      if (!primaryLora && requiredElements.scene_subjects) {
        for (const sceneSubject of requiredElements.scene_subjects) {
          const sceneName = sceneSubject.replace('@', '');
          const sceneSubjectData = sceneSubjects.find(ss => ss.name === sceneName);
          if (sceneSubjectData?.selectedLora) {
            primaryLora = sceneSubjectData.selectedLora;
            loraStrategy = `场景LoRA(${sceneName})`;
            break;
          }
        }
      }
      
      // 生成图片
      const result = await APIService.generateImageWithLora(finalPrompt, API_KEY, primaryLora);
      
      if (result.data && result.data.length > 0) {
        const imageUrl = result.data[0].url;
        
        // 保存图片
        await APIService.saveImage(index, imageUrl, finalPrompt);
        
        // 更新图片显示
        const updatedImages = [...images];
        updatedImages[index] = safeImageUrl(`${imageUrl}?v=${Date.now()}`);
        setImages(updatedImages);
        
        // 显示成功信息
        const loraInfo = primaryLora 
          ? ` (${loraStrategy}: ${primaryLora.split('\\').pop()?.replace('.safetensors', '')})`
          : ' (未使用LoRA)';
        showToast(`第${index + 1}个分镜智能生成成功${loraInfo}`);
      } else {
        throw new Error('未收到有效的图片数据');
      }
      
    } catch (error) {
      console.error('Error generating image with elements:', error);
      showToast(`智能生成失败: ${(error as Error).message}`);
    } finally {
      // 清除生成状态
      setIsSmartGenerating(prev => ({ ...prev, [index]: false }));
    }
  };

  // 生成视频
  const handleGenerateVideo = (index: number) => {
    console.log('Generate video:', index);
    setIsGeneratingVideo(true);
    showToast('生成视频功能待实现');
    setTimeout(() => setIsGeneratingVideo(false), 1000);
  };

  // 生成视频提示词
  const handleGenerateVideoPrompt = (index: number) => {
    console.log('Generate video prompt:', index);
    showToast('生成视频提示词功能待实现');
  };

  // 上传图片
  const handleUploadImage = (index: number) => {
    console.log('Upload image:', index);
    showToast('上传图片功能待实现');
  };

  // 上传视频
  const handleUploadVideo = (index: number) => {
    console.log('Upload video:', index);
    showToast('上传视频功能待实现');
  };

  // 预览图片
  const handlePreviewImage = (imageUrl: string) => {
    // 调试：检查图片URL
    console.log('Preview image URL:', imageUrl);
    const safeUrl = safeImageUrl(imageUrl);
    console.log('Safe image URL:', safeUrl);
    
    setPreviewImage(safeUrl);
    setIsPreviewOpen(true);
  };

  // 预览视频
  const handlePreviewVideo = (videoUrl: string) => {
    setPreviewVideo(videoUrl);
    setIsVideoPreviewOpen(true);
  };

  // 生成画面描述
  const handleGenerateDescription = async (index: number) => {
    try {
      showToast(`开始生成第${index + 1}个画面描述...`);
      
      // 获取分镜内容和角色信息
      const storyboard = storyboards[index];
      const fragment = fragments[index];
      
      if (!storyboard || !fragment) {
        showToast('请先填写故事片段和分镜描述');
        return;
      }

      // 构建包含角色信息的提示词
      let characterPrompts = '';
      if (characters.length > 0) {
        characterPrompts = characters.map(char => char.englishPrompt).join(', ');
      }

      // 生成画面描述
      const basePrompt = 'masterpiece, best quality, ultra detailed, 8k, photorealistic';
      const scenePrompt = `${basePrompt}, ${characterPrompts}, ${storyboard}`;
      
      // 更新画面描述
      const newDescriptions = [...sceneDescriptions];
      newDescriptions[index] = scenePrompt;
      setSceneDescriptions(newDescriptions);
      
      showToast(`第${index + 1}个画面描述生成完成`);
      
    } catch (error) {
      console.error('Error generating description:', error);
      showToast(`画面描述生成失败: ${(error as Error).message}`);
    }
  };

  // 处理片段变化
  const handleFragmentChange = (index: number, value: string) => {
    // 这个功能通常由useStoryboard hook处理
    console.log('Fragment change:', index, value);
  };



  // 处理角色信息变化
  const handleCharacterChange = async (index: number, field: string, value: string) => {
    const newCharacters = [...characters];
    newCharacters[index] = {
      ...newCharacters[index],
      [field]: value
    };
    
    // 更新状态
    setCharacters(newCharacters);
    
    // 保存角色信息
    try {
      await APIService.saveCharacterInfo({
        summary: storySummary,
        characters: newCharacters
      });
      
      // 自动保存到当前项目
      if (currentProject) {
        const character = newCharacters[index];
        await saveCharacterToProject(character);
      }
    } catch (error) {
      console.error('Error saving character info:', error);
    }
  };

  // 生成角色英文提示词
  const handleGenerateCharacterPrompt = async (characterIndex: number) => {
    try {
      showToast(`开始生成${characters[characterIndex].name}的角色提示词...`);
      
      const config = await APIService.getModelConfig();
      const character = characters[characterIndex];
      
      const systemPrompt = `You are a professional AI image generation prompt creator. Generate high-quality English prompts for character portraits.

Requirements:
1. Use professional photography and art terminology
2. Include quality tags: masterpiece, best quality, ultra detailed, 8k, photorealistic
3. Include technical tags: professional portrait, studio lighting, detailed face, detailed eyes
4. Describe character appearance in detail
5. Use clear, specific English descriptions
6. Focus on visual elements suitable for AI image generation

Character Information:
- Name: ${character.name}
- Gender: ${character.gender}
- Age: ${character.age}
- Appearance: ${character.appearance}
- Personality: ${character.personality || 'Not specified'}

Generate a comprehensive English prompt for this character's portrait.`;

      const userPrompt = `Generate an English AI image generation prompt for character "${character.name}". 
      
Character details:
- Gender: ${character.gender}
- Age: ${character.age}  
- Appearance: ${character.appearance}

Please create a detailed English prompt suitable for AI image generation, including quality tags and technical specifications.`;

      const result = await APIService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], config, 500);

      const prompt = result.choices[0].message.content.trim();
      
      // 更新角色提示词
      const newCharacters = [...characters];
      newCharacters[characterIndex] = {
        ...newCharacters[characterIndex],
        englishPrompt: prompt
      };
      
      setCharacters(newCharacters);
      
      // 保存角色信息
      await APIService.saveCharacterInfo({
        summary: storySummary,
        characters: newCharacters
      });
      
      showToast(`${character.name}的角色提示词生成成功`);
      
    } catch (error) {
      console.error('Error generating character prompt:', error);
      showToast(`角色提示词生成失败: ${(error as Error).message}`);
    }
  };

  // 生成单个角色图片
  const handleGenerateCharacterImage = async (characterIndex: number) => {
    try {
      showToast(`开始生成${characters[characterIndex].name}的角色图片...`);
      
      const config = await APIService.getModelConfig();
      const API_KEY = config.easyaiApiKey;
      
      if (!API_KEY) {
        throw new Error('EasyAI API Key未配置，请在初始化页面配置');
      }

      const character = characters[characterIndex];
      
      // 使用生成的角色提示词，如果没有则使用默认构建
      let characterPrompt = character.englishPrompt;
      if (!characterPrompt || characterPrompt.trim() === '') {
        characterPrompt = `masterpiece, best quality, ultra detailed, 8k, photorealistic, professional portrait, ${character.gender === '女性' ? 'beautiful woman' : 'handsome man'}, ${character.age}, ${character.appearance}, studio lighting, clean background, character reference sheet, front view, detailed face, detailed eyes, detailed hair`;
      }

      // 使用支持LoRA的生成方法，生成4张图片
      const result = await APIService.generateImageWithLora(characterPrompt, API_KEY, character.selectedLora, 4);
      
      console.log('Character image generation result:', result);
      
      if (result && result.data && Array.isArray(result.data) && result.data.length > 0) {
        const imageUrls = result.data.map((item: any) => {
          // 处理不同的数据结构
          if (typeof item === 'string') {
            return item; // 直接是URL字符串
          } else if (item.url) {
            return item.url; // 对象包含url字段
          } else if (item.image_url) {
            return item.image_url; // 对象包含image_url字段
          } else {
            console.warn('Unknown image item structure:', item);
            return null;
          }
        }).filter(url => url !== null);
        
        console.log('Extracted image URLs:', imageUrls);
        
        if (imageUrls.length === 0) {
          throw new Error('无法从API响应中提取有效的图片URL');
        }
        
        const loraInfo = character.selectedLora ? ` (使用LoRA: ${character.selectedLora.split('\\').pop()?.replace('.safetensors', '')})` : '';
        
        // 如果只有一张图片，直接保存
        if (imageUrls.length === 1) {
          const imageUrl = imageUrls[0];
          await APIService.saveCharacterImage(characterIndex, imageUrl, character);
          
          const updatedCharacterImages = [...characterImages];
          updatedCharacterImages[characterIndex] = safeImageUrl(imageUrl);
          setCharacterImages(updatedCharacterImages);
          
          // 自动保存到当前项目
          if (currentProject) {
            await saveCharacterToProject(character, imageUrl);
          }
          
          showToast(`${character.name}的角色图片生成成功${loraInfo}`);
        } else {
          // 多张图片时，存储到临时状态让用户选择
          const tempKey = `character_temp_images_${characterIndex}`;
          (window as any)[tempKey] = {
            images: imageUrls,
            characterIndex,
            character,
            loraInfo
          };
          
          showToast(`成功生成${imageUrls.length}张${character.name}的图片${loraInfo}！请在角色卡片中选择一张`);
          
          // 触发界面更新，显示图片选择器
          const updatedCharacters = [...characters];
          updatedCharacters[characterIndex] = {
            ...character,
            tempImages: imageUrls
          };
          setCharacters(updatedCharacters);
        }
      } else {
        console.error('Invalid API response structure:', result);
        throw new Error(`API返回数据格式错误。期望: {data: [...]}，实际收到: ${JSON.stringify(result)}`);
      }
      
    } catch (error) {
      console.error('Error generating character image:', error);
      showToast(`角色图片生成失败: ${(error as Error).message}`);
    }
  };

  // 处理角色图片选择
  const handleCharacterImageSelect = async (characterIndex: number, selectedImageUrl: string) => {
    try {
      const character = characters[characterIndex];
      
      // 保存选中的图片
      await APIService.saveCharacterImage(characterIndex, selectedImageUrl, character);
      
      const updatedCharacterImages = [...characterImages];
      updatedCharacterImages[characterIndex] = safeImageUrl(selectedImageUrl);
      setCharacterImages(updatedCharacterImages);
      
      // 清除临时图片数据
      const updatedCharacters = [...characters];
      updatedCharacters[characterIndex] = {
        ...character,
        tempImages: undefined
      };
      setCharacters(updatedCharacters);
      
      // 清理全局临时数据
      const tempKey = `character_temp_images_${characterIndex}`;
      delete (window as any)[tempKey];
      
      showToast(`已为${character.name}选择角色图片`);
    } catch (error) {
      console.error('Error selecting character image:', error);
      showToast('保存角色图片失败');
    }
  };

  // 生成所有角色图片
  const handleGenerateAllCharacterImages = async () => {
    try {
      showToast('开始生成所有角色图片...');
      
      if (characters.length === 0) {
        showToast('请先提取角色信息');
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < characters.length; i++) {
        try {
          await handleGenerateCharacterImage(i);
          successCount++;
          
          // 添加延迟避免API限制
          if (i < characters.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error) {
          failCount++;
          console.error(`Error generating character image ${i}:`, error);
        }
      }

      showToast(`角色图片生成完成！成功: ${successCount}张，失败: ${failCount}张`);
    } catch (error) {
      console.error('Error generating all character images:', error);
      showToast(`批量生成失败: ${(error as Error).message}`);
    }
  };

  // 上传角色图片
  const handleUploadCharacterImage = async (characterIndex: number) => {
    try {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      
      fileInput.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        
        try {
          showToast(`正在上传${characters[characterIndex].name}的角色图片...`);
          
          const formData = new FormData();
          formData.append('image', file);
          formData.append('character_index', characterIndex.toString());
          formData.append('character_name', characters[characterIndex]?.name || `character_${characterIndex}`);
          formData.append('character_info', JSON.stringify(characters[characterIndex]));
          
          const response = await fetch('http://localhost:1198/api/upload/character/image', {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) {
            throw new Error('Failed to upload character image');
          }
          
          const result = await response.json();
          const imageUrl = result.image_url;
          
          // 更新角色图片显示
          const updatedCharacterImages = [...characterImages];
          updatedCharacterImages[characterIndex] = safeImageUrl(`${imageUrl}?v=${Date.now()}`);
          setCharacterImages(updatedCharacterImages);
          
          showToast(`${characters[characterIndex].name}的角色图片上传成功`);
        } catch (error) {
          console.error('Error uploading character image:', error);
          showToast(`上传失败: ${(error as Error).message}`);
        }
      };
      
      fileInput.click();
    } catch (error) {
      console.error('Error uploading custom character image:', error);
      showToast(`上传失败: ${(error as Error).message}`);
    }
  };

  // 上传额外角色图片
  const handleUploadAdditionalCharacterImage = async (characterIndex: number, slotIndex: number) => {
    try {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      
      fileInput.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        
        try {
          showToast(`正在上传${characters[characterIndex].name}的额外角色图片...`);
          
          const formData = new FormData();
          formData.append('image', file);
          formData.append('character_index', characterIndex.toString());
          formData.append('character_name', characters[characterIndex]?.name || `character_${characterIndex}`);
          formData.append('character_info', JSON.stringify(characters[characterIndex]));
          formData.append('slot_index', slotIndex.toString());
          formData.append('image_type', 'additional');
          
          const response = await fetch('http://localhost:1198/api/upload/character/image', {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) {
            throw new Error('Failed to upload additional character image');
          }
          
          const result = await response.json();
          const imageUrl = result.image_url;
          
          // 更新额外角色图片显示
          const updated = { ...additionalCharacterImages };
          if (!updated[characterIndex]) updated[characterIndex] = [];
          updated[characterIndex][slotIndex] = safeImageUrl(`${imageUrl}?v=${Date.now()}`);
          setAdditionalCharacterImages(updated);
          
          showToast(`${characters[characterIndex].name}的额外角色图片上传成功`);
        } catch (error) {
          console.error('Error uploading additional character image:', error);
          showToast(`上传失败: ${(error as Error).message}`);
        }
      };
      
      fileInput.click();
    } catch (error) {
      console.error('Error uploading additional character image:', error);
      showToast(`上传失败: ${(error as Error).message}`);
    }
  };



  // 生成场景图片
  const handleGenerateSceneImage = async (sceneIndex: number) => {
    try {
      showToast(`开始生成${sceneSubjects[sceneIndex].name}的场景图片...`);
      
      const config = await APIService.getModelConfig();
      const API_KEY = config.easyaiApiKey;
      
      if (!API_KEY) {
        throw new Error('EasyAI API Key未配置，请在初始化页面配置');
      }

      const sceneSubject = sceneSubjects[sceneIndex];
      
      // 使用场景描述作为提示词
      let scenePrompt = sceneSubject.description;
      if (!scenePrompt || scenePrompt.trim() === '') {
        scenePrompt = `masterpiece, best quality, ultra detailed, 8k, photorealistic, cinematic lighting, ${sceneSubject.name}, detailed background, atmospheric lighting`;
      }

      // 使用支持LoRA的生成方法
      const result = await APIService.generateImageWithLora(scenePrompt, API_KEY, sceneSubject.selectedLora);
      
      if (result.data && result.data.length > 0) {
        const imageUrl = result.data[0].url;
        
        // 保存场景图片
        await APIService.saveImage(sceneIndex, imageUrl, scenePrompt);
        
        const loraInfo = sceneSubject.selectedLora ? ` (使用LoRA: ${sceneSubject.selectedLora.split('\\').pop()})` : '';
        showToast(`${sceneSubject.name}的场景图片生成成功${loraInfo}`);
      } else {
        throw new Error('未收到有效的图片数据');
      }
      
    } catch (error) {
      console.error('Error generating scene image:', error);
      showToast(`场景图片生成失败: ${(error as Error).message}`);
    }
  };

  // 分析分镜元素
  const handleAnalyzeStoryboardElements = async () => {
    try {
      showToast('开始分析分镜所需元素...');
      
      if (fragments.length === 0 || storyboards.length === 0) {
        showToast('请先生成分镜脚本');
        return;
      }
      
      if (characterSubjects.length === 0 && characters.length === 0) {
        showToast('请先创建角色主体或生成角色信息');
        return;
      }
      
      // 获取配置
      const config = await APIService.getModelConfig();
      
      // 使用主体信息而不是角色信息
      const characterSubjectsInfo = characterSubjects.length > 0 
        ? characterSubjects.map(subject => 
            `@${subject.name}: ${subject.tag} (${subject.description})`
          ).join('\n')
        : characters.map(char => 
            `@${char.name}: ${char.appearance}`
          ).join('\n');
      
      const sceneSubjectsInfo = sceneSubjects.map(subject => 
        `@${subject.name}: ${subject.tag} (${subject.description})`
      ).join('\n');
      
      const systemPrompt = `You are a professional storyboard element analyst. Analyze each storyboard scene to identify required subjects and generate pure environment scene prompts.

Known Character Subjects:
${characterSubjectsInfo}

Known Scene Subjects:
${sceneSubjectsInfo}

CRITICAL REQUIREMENTS FOR SCENE PROMPTS:
1. ABSOLUTELY NO HUMAN-RELATED CONTENT: Never include person, people, character, man, woman, boy, girl, human, figure, silhouette, someone, individual, body parts (face, hand, arm, leg, head), or any human-related words
2. ENVIRONMENT ONLY: Only describe buildings, weather, lighting, atmosphere, objects, furniture, decorations
3. If the original text mentions human actions, describe only the environmental elements, completely ignore the humans
4. Must be 100% pure environment description

Tasks:
1. Identify required character subjects by matching names exactly, return as "@+subject_name" format
2. Identify required scene subjects by matching names exactly, return as "@+subject_name" format  
3. Generate pure environment English prompts (absolutely no human descriptions)

JSON Format:
{
  "storyboard_elements": [
    {
      "scene_index": scene_number,
      "character_subjects": ["@character_name1", "@character_name2"],
      "scene_subjects": ["@scene_name1", "@scene_name2"],
      "scene_prompt": "masterpiece, best quality, ultra detailed, 8k, photorealistic, cinematic lighting, depth of field, [pure environment description, NO HUMANS]"
    }
  ]
}`;

      const storyboardsText = storyboards.map((storyboard, index) => 
        `场景${index + 1}：
小说片段：${fragments[index] || ''}
分镜脚本：${storyboard}`
      ).join('\n\n');

      const characterSubjectNames = characterSubjects.length > 0 
        ? characterSubjects.map(subject => subject.name).join('、')
        : characters.map(char => char.name).join('、');
      const sceneSubjectNames = sceneSubjects.map(subject => subject.name).join('、');
      
      const userPrompt = `请仔细分析以下分镜场景：

${storyboardsText}

主体识别指南：
已知角色主体：${characterSubjectNames}
已知场景主体：${sceneSubjectNames}

分析步骤：
1. 逐个阅读每个场景的小说片段和分镜脚本
2. 在文本中查找角色主体名称：${characterSubjectNames}
3. 在文本中查找场景主体名称：${sceneSubjectNames}
4. 注意：即使使用代词（他、她、它），也要根据上下文推断具体角色主体
5. 将识别出的主体名称以"@+名称"格式填入对应数组
6. 根据分镜脚本中的场景描述，生成纯环境的英文提示词

请返回完整的JSON格式结果，确保每个场景都有对应的分析。`;

      const result = await APIService.chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], config, Math.min(4000, storyboards.length * 200));

      const content = result.choices[0].message.content;
      
      try {
        const parsedContent = JSON.parse(content);
        const elements = parsedContent.storyboard_elements || [];
        
        // 过滤场景提示词中的人物相关词汇
        const humanRelatedWords = [
          'person', 'people', 'character', 'man', 'woman', 'boy', 'girl', 'human', 'figure', 'silhouette',
          'someone', 'anyone', 'individual', 'being', 'body', 'face', 'hand', 'arm', 'leg', 'head',
          '人物', '角色', '人影', '身影', '人', '男', '女', '他', '她', '它', '某人', '个人', '身体', '脸', '手', '腿', '头'
        ];
        
        elements.forEach((element, index) => {
          if (element.scene_prompt) {
            let cleanPrompt = element.scene_prompt;
            
            // 移除人物相关词汇
            humanRelatedWords.forEach(word => {
              const regex = new RegExp(`\\b${word}\\b`, 'gi');
              cleanPrompt = cleanPrompt.replace(regex, '');
            });
            
            // 清理多余的空格和标点
            cleanPrompt = cleanPrompt.replace(/\s+/g, ' ').replace(/,\s*,/g, ',').trim();
            
            // 如果清理后提示词太短，使用默认提示词
            if (cleanPrompt.length < 50) {
              cleanPrompt = "masterpiece, best quality, ultra detailed, 8k, photorealistic, cinematic lighting, detailed background, empty environment, atmospheric lighting";
            }
            
            element.scene_prompt = cleanPrompt;
            console.log(`场景${index + 1}清理后的提示词:`, cleanPrompt);
          }
        });
        
        // 确保数量匹配
        while (elements.length < storyboards.length) {
          elements.push({
            scene_index: elements.length + 1,
            characters: [],
            scene_prompt: "masterpiece, best quality, ultra detailed, 8k, photorealistic, cinematic lighting, detailed background, empty environment"
          });
        }
        if (elements.length > storyboards.length) {
          elements.splice(storyboards.length);
        }
        
        // 保存分镜元素分析结果
        await APIService.saveStoryboardElements(elements);
        
        // 统计识别到的角色数量
        const totalCharacters = elements.reduce((total, element) => {
          return total + (element.characters ? element.characters.length : 0);
        }, 0);
        
        const scenesWithCharacters = elements.filter(element => 
          element.characters && element.characters.length > 0
        ).length;
        
        showToast(`分镜元素分析完成！共${elements.length}个场景，识别到${totalCharacters}个角色实例，${scenesWithCharacters}个场景包含角色`);
        
        // 调试信息
        console.log('分镜元素分析结果:', elements);
        elements.forEach((element, index) => {
          console.log(`场景${index + 1}:`, {
            characters: element.characters,
            scene_prompt: element.scene_prompt?.substring(0, 100) + '...'
          });
        });
        
      } catch (parseError) {
        console.error('JSON解析失败:', parseError);
        showToast('分镜元素分析结果解析失败，请重试');
      }
      
    } catch (error) {
      console.error('Error analyzing storyboard elements:', error);
      showToast(`分镜元素分析失败: ${(error as Error).message}`);
    }
  };

  // 一键生成全部图片
  const handleGenerateAllImages = async () => {
    try {
      showToast('开始一键生成全部图片，请等待...');
      
      // 检查是否有画面描述
      if (sceneDescriptions.length === 0 || sceneDescriptions.every(desc => !desc || desc.trim() === '')) {
        showToast('请先生成画面描述');
        return;
      }
      
      // 获取EasyAI API Key
      const config = await APIService.getModelConfig();
      const API_KEY = config.easyaiApiKey;
      
      if (!API_KEY) {
        throw new Error('EasyAI API Key未配置，请在初始化页面配置');
      }

      // 重置所有图片为占位符
      const placeholderImages = fragments.map(() => "http://localhost:1198/images/placeholder.png");
      setImages(placeholderImages);

      // 批量生成图片
      const updatedImages = [...placeholderImages];
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < fragments.length; i++) {
        try {
          // 使用画面描述作为提示词
          const prompt = sceneDescriptions[i];
          if (!prompt || prompt.trim() === '') {
            showToast(`第${i + 1}个片段缺少画面描述，跳过`);
            failCount++;
            continue;
          }

          showToast(`正在生成第${i + 1}/${fragments.length}张图片...`);

          const result = await APIService.generateImage(prompt, API_KEY);
          
          if (result.data && result.data.length > 0) {
            const imageUrl = result.data[0].url;
            
            // 保存图片到temp文件夹
            await APIService.saveImage(i, imageUrl, sceneDescriptions[i] || '');
            
            updatedImages[i] = safeImageUrl(`${imageUrl}?v=${Date.now()}`);
            successCount++;
            
            // 实时更新图片显示
            setImages([...updatedImages]);
          } else {
            failCount++;
            console.error(`Image ${i} generation failed: No data returned`);
          }
          
          // 添加延迟避免API限制
          if (i < fragments.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        } catch (error) {
          failCount++;
          console.error(`Error generating image ${i}:`, error);
        }
      }

      showToast(`一键生成全部图片完成！成功: ${successCount}张，失败: ${failCount}张`);
      console.log('All images generation completed');
    } catch (error) {
      showToast(`一键生成失败: ${(error as Error).message}`);
      console.error('Error generating all images:', error);
    }
  };

  // 生成音频
  const handleGenerateAudio = () => {
    showToast('开始生成，请等待');
    fetch('http://localhost:1198/api/novel/audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fragments })
    })
      .then(response => response.json())
      .then(() => {
        console.log('Audio generation initiated');
      })
      .catch(error => {
        console.error('Error generating audio:', error);
        showToast('失败');
      });
  };

  // 生成美术风格指南
  const handleGenerateArtStyleGuide = async () => {
    try {
      if (!currentProject) {
        showToast('请先选择或创建项目');
        return;
      }

      showToast('开始生成美术风格指南...');
      
      const response = await APIService.generateArtStyleGuide({
        projectType: '短片',
        storyTheme: storySummary || fullStoryContent || '悬疑故事',
        targetAudience: '成年观众',
        emotionalTone: '神秘紧张',
        timePeriod: '现代',
        locationStyle: '都市',
        projectName: currentProject.name
      });

      // 显示生成的美术风格指南
      const styleWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
      if (styleWindow) {
        styleWindow.document.write(`
          <html>
            <head>
              <title>${currentProject.name} - 美术风格指南</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
                h1 { color: #333; border-bottom: 2px solid #e83e8c; padding-bottom: 10px; }
                pre { background: #f8f9fa; padding: 15px; border-radius: 5px; white-space: pre-wrap; }
                .save-btn { 
                  background: #28a745; color: white; border: none; padding: 10px 20px; 
                  border-radius: 5px; cursor: pointer; margin-top: 20px; 
                }
              </style>
            </head>
            <body>
              <h1>🎨 ${currentProject.name} - 美术风格指南</h1>
              <h3>项目信息：</h3>
              <p><strong>项目类型：</strong>短片</p>
              <p><strong>故事主题：</strong>${storySummary || fullStoryContent || '悬疑故事'}</p>
              <h3>美术风格指南：</h3>
              <pre>${response.artStyleGuide}</pre>
              <button class="save-btn" onclick="window.close()">关闭</button>
            </body>
          </html>
        `);
      }

      // 保存美术风格指南
      const artStyleGuide = {
        projectId: currentProject.name,
        projectName: currentProject.name,
        overallVisualStyle: {
          artisticPosition: '待解析',
          visualReferences: [],
          aestheticConcept: '待解析',
          themeAlignment: '待解析'
        },
        colorScheme: {
          primaryColors: [],
          secondaryColors: [],
          sceneVariations: {},
          emotionalFunction: '待解析',
          colorValues: {}
        },
        compositionAndCinematography: {
          compositionPrinciples: '待解析',
          cameraMovementStyle: '待解析',
          depthOfFieldUsage: '待解析',
          lightingShadowHandling: '待解析'
        },
        characterDesignGuidance: {
          characterStyling: '待解析',
          costumeDesign: '待解析',
          makeupAndHair: '待解析',
          propsDesign: '待解析'
        },
        sceneDesignGuidance: {
          sceneDesignStyle: '待解析',
          setAndPropsRules: '待解析',
          materialAndTexture: '待解析',
          spatialLayering: '待解析'
        },
        technicalImplementation: {
          shootingRequirements: '待解析',
          postColorGrading: '待解析',
          effectsStyleGuide: '待解析',
          qualityControl: response.artStyleGuide
        }
      };

      await APIService.saveArtStyleGuide(artStyleGuide, currentProject.name);
      showToast(`${currentProject.name}的美术风格指南已生成并保存！`);
      
    } catch (error) {
      console.error('Failed to generate art style guide:', error);
      showToast('美术风格指南生成失败，请检查网络连接');
    }
  };

  // 生成场景音效设计
  const handleGenerateSceneAudio = async (sceneIndex: number) => {
    try {
      const sceneSubject = sceneSubjects[sceneIndex];
      showToast(`开始为${sceneSubject.name}生成音效设计...`);
      
      const sceneDesc = sceneSubject.description || sceneSubject.tag || sceneSubject.name;

      const response = await APIService.generateEnvironmentAudioDesign({
        sceneDescription: sceneDesc,
        timeSetting: '夜晚',
        location: '户外',
        weather: '晴朗',
        mood: '神秘',
        duration: '2-3分钟',
        projectName: currentProject?.name || 'default'
      });

      // 显示生成的音效设计
      const audioWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
      if (audioWindow) {
        audioWindow.document.write(`
          <html>
            <head>
              <title>${sceneSubject.name} - 音效设计方案</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
                h1 { color: #333; border-bottom: 2px solid #fd7e14; padding-bottom: 10px; }
                pre { background: #f8f9fa; padding: 15px; border-radius: 5px; white-space: pre-wrap; }
                .save-btn { 
                  background: #28a745; color: white; border: none; padding: 10px 20px; 
                  border-radius: 5px; cursor: pointer; margin-top: 20px; 
                }
              </style>
            </head>
            <body>
              <h1>🔊 ${sceneSubject.name} - 音效设计方案</h1>
              <h3>场景描述：</h3>
              <p>${sceneDesc}</p>
              <h3>音效设计：</h3>
              <pre>${response.audioDesign}</pre>
              <button class="save-btn" onclick="window.close()">关闭</button>
            </body>
          </html>
        `);
      }

      // 保存音效设计
      const sceneId = `scene_${sceneIndex + 1}`;
      const audioDesign = {
        sceneId,
        sceneName: sceneSubject.name,
        mainEnvironmentAudio: {
          baseAmbient: [],
          volumeLevels: '待解析',
          frequencyRange: '待解析',
          duration: '2-3分钟'
        },
        backgroundAudio: {
          distantSounds: [],
          midRangeSounds: [],
          nearSounds: [],
          volumeBalance: '待解析'
        },
        specialEffects: {
          emotionalAudio: [],
          dramaticTension: [],
          transitions: [],
          storySpecific: []
        },
        technicalSpecs: {
          recordingEquipment: '待解析',
          postProcessing: '待解析',
          stereoPositioning: '待解析',
          mixingRatios: '待解析'
        },
        productionAdvice: {
          sourceMaterials: '待解析',
          recordingTechniques: '待解析',
          postProductionWorkflow: '待解析',
          qualityStandards: response.audioDesign
        }
      };

      await APIService.saveEnvironmentAudioDesign(sceneId, audioDesign, currentProject?.name || 'default');
      showToast(`${sceneSubject.name}的音效设计已生成并保存！`);
      
    } catch (error) {
      console.error('Failed to generate audio design:', error);
      showToast('音效设计生成失败，请检查网络连接');
    }
  };

  // 生成分镜台词
  const handleGenerateSceneDialogue = async (sceneIndex: number) => {
    try {
      const storyboard = storyboards[sceneIndex];
      const sceneDescription = sceneDescriptions[sceneIndex];
      showToast(`开始为分镜${sceneIndex + 1}生成台词...`);
      
      const charactersText = characters.map(c => c.name).join('、');
      const sceneDesc = sceneDescription || storyboard || `分镜${sceneIndex + 1}`;

      const response = await APIService.generateSceneDialogue({
        sceneDescription: sceneDesc,
        characters: charactersText,
        storyContext: storySummary || fullStoryContent || '短片故事',
        emotionalTone: '自然',
        sceneDuration: '2-3分钟',
        projectName: currentProject?.name || 'default'
      });

      // 显示生成的台词
      const dialogueWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
      if (dialogueWindow) {
        dialogueWindow.document.write(`
          <html>
            <head>
              <title>分镜${sceneIndex + 1} - 台词方案</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
                h1 { color: #333; border-bottom: 2px solid #17a2b8; padding-bottom: 10px; }
                pre { background: #f8f9fa; padding: 15px; border-radius: 5px; white-space: pre-wrap; }
                .save-btn { 
                  background: #28a745; color: white; border: none; padding: 10px 20px; 
                  border-radius: 5px; cursor: pointer; margin-top: 20px; 
                }
              </style>
            </head>
            <body>
              <h1>💬 分镜${sceneIndex + 1} - 台词方案</h1>
              <h3>场景描述：</h3>
              <p>${sceneDesc}</p>
              <h3>生成的台词：</h3>
              <pre>${response.dialogue}</pre>
              <button class="save-btn" onclick="window.close()">关闭</button>
            </body>
          </html>
        `);
      }

      // 保存台词
      const sceneId = `scene_${sceneIndex + 1}`;
      const dialogue = {
        sceneId,
        sceneName: `分镜${sceneIndex + 1}`,
        mainDialogue: [],
        technicalAnalysis: {
          emotionalFocus: '自然',
          toneAndRhythm: '待分析',
          pausesAndEmphasis: '待分析',
          visualCoordination: '待分析'
        },
        performanceGuidance: {
          innerThoughts: '待分析',
          bodyLanguage: '待分析',
          eyesAndExpression: '待分析',
          characterInteraction: '待分析'
        },
        alternatives: []
      };

      await APIService.saveSceneDialogue(sceneId, dialogue, currentProject?.name || 'default');
      showToast(`分镜${sceneIndex + 1}的台词已生成并保存！`);
      
    } catch (error) {
      console.error('Failed to generate dialogue:', error);
      showToast('台词生成失败，请检查网络连接');
    }
  };

  // 生成角色音色设计
  const handleGenerateCharacterVoiceDesign = async (characterIndex: number) => {
    try {
      const character = characters[characterIndex];
      showToast(`开始为${character.name}生成音色设计...`);
      
      const characterInfo = `
角色名称: ${character.name}
性别: ${character.gender}
年龄: ${character.age}
外貌: ${character.appearance}
性格: ${character.personality || '未描述'}
角色定位: ${character.role || '主要角色'}
      `.trim();

      const response = await APIService.generateCharacterVoiceDesign({
        characterInfo,
        sceneContext: '通用场景',
        emotionalState: '正常状态',
        projectName: currentProject?.name || 'default'
      });

      // 生成音频示例
      showToast('正在生成音色示例音频...');
      const sampleText = `大家好，我是${character.name}。${character.personality ? character.personality.substring(0, 50) : '很高兴认识大家。'}`;
      
      try {
        const audioResponse = await APIService.generateCharacterVoiceAudio(
          character.name.replace(/\s+/g, '_').toLowerCase(),
          sampleText,
          {
            gender: character.gender === '女性' ? 'female' : 'male',
            rate: '+35%',
            pitch: '+0Hz'
          }
        );

        // 显示生成的音色设计和音频播放器
        const voiceDesignWindow = window.open('', '_blank', 'width=800,height=700,scrollbars=yes');
        if (voiceDesignWindow) {
          voiceDesignWindow.document.write(`
            <html>
              <head>
                <title>${character.name} - 音色设计方案</title>
                <style>
                  body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
                  h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
                  pre { background: #f8f9fa; padding: 15px; border-radius: 5px; white-space: pre-wrap; }
                  .audio-section { 
                    background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;
                    border-left: 4px solid #2196f3;
                  }
                  .save-btn { 
                    background: #28a745; color: white; border: none; padding: 10px 20px; 
                    border-radius: 5px; cursor: pointer; margin-top: 20px; margin-right: 10px;
                  }
                  .play-btn {
                    background: #007bff; color: white; border: none; padding: 8px 16px;
                    border-radius: 5px; cursor: pointer; margin-right: 10px;
                  }
                  audio { width: 100%; margin-top: 10px; }
                </style>
              </head>
              <body>
                <h1>🎤 ${character.name} - 音色设计方案</h1>
                
                <div class="audio-section">
                  <h3>🔊 音色示例</h3>
                  <p><strong>示例文本：</strong>${sampleText}</p>
                  <audio controls>
                    <source src="http://localhost:1198${audioResponse.audioUrl}" type="audio/mpeg">
                    您的浏览器不支持音频播放。
                  </audio>
                  <br><br>
                  <button class="play-btn" onclick="document.querySelector('audio').play()">▶️ 播放</button>
                  <button class="play-btn" onclick="document.querySelector('audio').pause()">⏸️ 暂停</button>
                </div>
                
                <h3>📋 音色设计详情</h3>
                <pre>${response.voiceDesign}</pre>
                
                <button class="save-btn" onclick="window.close()">关闭</button>
              </body>
            </html>
          `);
        }
        
        showToast(`${character.name}的音色设计和音频示例生成完成！`);
        
      } catch (audioError) {
        console.error('Audio generation failed:', audioError);
        
        // 如果音频生成失败，仍然显示音色设计
        const voiceDesignWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
        if (voiceDesignWindow) {
          voiceDesignWindow.document.write(`
            <html>
              <head>
                <title>${character.name} - 音色设计方案</title>
                <style>
                  body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
                  h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
                  pre { background: #f8f9fa; padding: 15px; border-radius: 5px; white-space: pre-wrap; }
                  .error-note { background: #fff3cd; padding: 10px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #ffc107; }
                  .save-btn { 
                    background: #28a745; color: white; border: none; padding: 10px 20px; 
                    border-radius: 5px; cursor: pointer; margin-top: 20px; 
                  }
                </style>
              </head>
              <body>
                <h1>🎤 ${character.name} - 音色设计方案</h1>
                <div class="error-note">
                  ⚠️ 音频生成失败，但音色设计方案已生成。请检查网络连接或稍后重试音频功能。
                </div>
                <pre>${response.voiceDesign}</pre>
                <button class="save-btn" onclick="window.close()">关闭</button>
              </body>
            </html>
          `);
        }
        
        showToast(`${character.name}的音色设计生成完成（音频生成失败）`);
      }

      // 保存音色设计
      const characterId = character.name.replace(/\s+/g, '_').toLowerCase();
      const voiceProfile = {
        characterId,
        characterName: character.name,
        basicTone: {
          pitchRange: '待解析',
          speechRate: 180,
          volumeControl: '中等音量',
          voiceQuality: '清亮'
        },
        emotionalExpression: {
          happy: '音调上扬',
          angry: '音调降低',
          sad: '音调下沉',
          nervous: '音调不稳'
        },
        technicalGuidance: {
          breathingControl: '深呼吸控制',
          pronunciation: '清晰发音',
          emotionalLayers: '层次分明',
          voiceDistinction: '独特音色'
        },
        references: {
          similarCharacters: [],
          recommendedActors: [],
          technicalRequirements: response.voiceDesign
        }
      };

      await APIService.saveCharacterVoiceDesign(characterId, voiceProfile, currentProject?.name || 'default');
      showToast(`${character.name}的音色设计已生成并保存！`);
      
    } catch (error) {
      console.error('Failed to generate voice design:', error);
      showToast('音色设计生成失败，请检查网络连接');
    }
  };



  return (
    <div className="container">
      <div className="header">
        <h1>AI Image Generator</h1>
        
        {/* 项目管理头部 */}
        <div className="project-management" style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <h3 style={{ margin: 0, color: '#495057' }}>项目管理</h3>
              {currentProject && (
                <div style={{ fontSize: '14px', color: '#6c757d', backgroundColor: '#e3f2fd', padding: '4px 12px', borderRadius: '20px' }}>
                  当前项目: <span style={{ fontWeight: 'bold', color: '#1976d2' }}>{currentProject.name}</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {currentProject && (
                <button
                  onClick={handleGenerateArtStyleGuide}
                  style={{
                    backgroundColor: '#e83e8c',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  🎨 美术风格
                </button>
              )}
              <button
                onClick={() => setShowProjectModal(true)}
                style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {currentProject ? '切换项目' : '创建项目'}
              </button>
            </div>
          </div>

          {/* 项目选择器 */}
          {projects.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {projects.map(project => (
                <button
                  key={project.id}
                  onClick={() => switchProject(project)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    border: 'none',
                    fontSize: '12px',
                    cursor: 'pointer',
                    backgroundColor: currentProject?.id === project.id ? '#007bff' : '#e9ecef',
                    color: currentProject?.id === project.id ? 'white' : '#495057'
                  }}
                >
                  {project.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="button-container">
        <button onClick={generateStoryAndCharacters} disabled={isLoading} className="generate-story">
          {isLoading ? '生成中...' : '生成故事梗概、角色和场景主体'}
        </button>
        <button onClick={generateSceneStoryboards} className="generate-storyboard" disabled={characters.length === 0}>
          生成分镜脚本
        </button>
        <button onClick={handleAnalyzeStoryboardElements} className="analyze-elements" disabled={storyboards.length === 0 || characters.length === 0}>
          分析分镜元素
        </button>

        {loaded && (
          <>
            <button onClick={handleGenerateAllImages} className="generate-all">一键生成全部图片</button>
            <button onClick={handleGenerateAudio} className="generate-audio">生成音频</button>
          </>
        )}
      </div>

      {/* 主体创建模态框 */}
      <SubjectCreationModal
        isOpen={isCreatingSubject}
        mode={subjectCreationMode}
        onClose={() => setIsCreatingSubject(false)}
        onCreateCharacter={createCharacterSubject}
        onCreateScene={createSceneSubject}
        loraList={loraList}
        isLoadingLora={isLoadingLora}
      />

      {/* 故事与场景管理 */}
      <StorySceneManagement
        storySummary={storySummary}
        novelScenes={novelScenes}
        fullStoryContent={fullStoryContent}
        sceneSubjects={sceneSubjects}
        characters={characters}
        onStorySummaryChange={setStorySummary}
        onNovelScenesChange={updateNovelScenes}
        onFullStoryContentChange={(content) => {
          setFullStoryContent(content);
          // 自动保存到项目（防抖处理）
          if (content.trim()) {
            clearTimeout((window as any).storyAutoSaveTimeout);
            (window as any).storyAutoSaveTimeout = setTimeout(() => {
              saveFullStoryToProject();
            }, 2000); // 2秒后自动保存
          }
        }}
        onSceneSubjectChange={handleSceneSubjectChange}
        onCreateNewSceneSubject={createNewSceneSubject}
        onUploadSubjectImage={uploadSubjectImage}
        onPreviewImage={handlePreviewImage}
        onGenerateSceneImage={handleGenerateSceneImage}
        onGenerateSceneAudio={handleGenerateSceneAudio}
        scenePanelCollapsed={scenePanelCollapsed}
        onToggleScenePanel={() => setScenePanelCollapsed(!scenePanelCollapsed)}
        sceneItemsCollapsed={sceneItemsCollapsed}
        onToggleSceneItem={(index) => setSceneItemsCollapsed(prev => ({
          ...prev,
          [index]: !prev[index]
        }))}
        loraList={loraList}
        isLoadingLora={isLoadingLora}
      />



      {/* 角色主体管理区域 */}
      {characters.length > 0 && (
        <div className="character-subjects-panel">
          <div className="panel-header">
            <h2>角色主体管理 ({characters.length}个)</h2>
            <button 
              className="collapse-btn"
              onClick={() => setCharacterPanelCollapsed(!characterPanelCollapsed)}
            >
              {characterPanelCollapsed ? '展开' : '折叠'}
            </button>
          </div>
          
          {!characterPanelCollapsed && (
            <>
              {/* 批量生成角色图片按钮 */}
              <div className="characters-actions">
                <button onClick={handleGenerateAllCharacterImages} className="generate-character-images">
                  生成所有角色图片
                </button>
              </div>

              {/* 角色列表 */}
              {characters.map((character, index) => (
                <div key={index} className="character-item">
                  <div className="character-item-header">
                    <div className="character-basic-info">
                      <h3>{character.name || `角色 ${index + 1}`}</h3>
                      <span className="character-summary">
                        {character.gender} · {character.age} · {character.height} · {character.weight}
                      </span>
                    </div>
                    <button 
                      className="item-collapse-btn"
                      onClick={() => setCharacterItemsCollapsed(prev => ({
                        ...prev,
                        [index]: !prev[index]
                      }))}
                    >
                      {characterItemsCollapsed[index] ? '展开' : '折叠'}
                    </button>
                  </div>
                  
                  {!characterItemsCollapsed[index] && (
                    <div className="character-content">
                      <div className="character-info-section">
                        <div className="character-header">
                          <input
                            type="text"
                            value={character.name || ''}
                            onChange={(e) => handleCharacterChange(index, 'name', e.target.value)}
                            className="character-name-input"
                            placeholder="角色名称"
                          />
                          <div className="character-tags">
                            <input
                              type="text"
                              value={character.gender || ''}
                              onChange={(e) => handleCharacterChange(index, 'gender', e.target.value)}
                              className="tag-input"
                              placeholder="性别"
                            />
                            <input
                              type="text"
                              value={character.age || ''}
                              onChange={(e) => handleCharacterChange(index, 'age', e.target.value)}
                              className="tag-input"
                              placeholder="年龄"
                            />
                            <input
                              type="text"
                              value={character.height || ''}
                              onChange={(e) => handleCharacterChange(index, 'height', e.target.value)}
                              className="tag-input"
                              placeholder="身高"
                            />
                            <input
                              type="text"
                              value={character.weight || ''}
                              onChange={(e) => handleCharacterChange(index, 'weight', e.target.value)}
                              className="tag-input"
                              placeholder="体重"
                            />
                          </div>
                        </div>
                  
                  <textarea
                    value={character.appearance || ''}
                    onChange={(e) => handleCharacterChange(index, 'appearance', e.target.value)}
                    placeholder="外观描述"
                    rows={3}
                    className="character-appearance"
                  />
                  
                  <textarea
                    value={character.personality || ''}
                    onChange={(e) => handleCharacterChange(index, 'personality', e.target.value)}
                    placeholder="性格特点"
                    rows={2}
                    className="character-personality"
                  />

                  {/* 英文提示词部分 */}
                  <div className="character-prompt-section">
                    <label>英文AI图像生成提示词:</label>
                    <textarea
                      value={character.englishPrompt || ''}
                      onChange={(e) => handleCharacterChange(index, 'englishPrompt', e.target.value)}
                      placeholder="masterpiece, best quality, ultra detailed, 8k, photorealistic, [角色外观描述]"
                      rows={3}
                      className="character-prompt"
                    />
                    <button 
                      onClick={() => handleGenerateCharacterPrompt(index)} 
                      className="generate-prompt-btn"
                    >
                      生成英文提示词
                    </button>
                  </div>

                  {/* React Select LoRA选择器 */}
                  <ReactSelectLoraSelector
                    loraList={loraList}
                    selectedLora={character.selectedLora || ''}
                    onLoraChange={(lora) => handleCharacterChange(index, 'selectedLora', lora)}
                    isLoading={isLoadingLora}
                    placeholder="搜索或选择LoRA模型..."
                    className="character-lora-selector"
                  />
                </div>
                
                <div className="character-image-section">
                  <div className="character-images-grid">
                    {/* 主要图片 */}
                    <div className="main-character-image">
                      <Image
                        src={safeImageUrl(characterImages[index] || "http://localhost:1198/images/placeholder.png")}
                        alt={`${character.name} 主图`}
                        width={120}
                        height={160}
                        className="character-image"
                        onClick={() => handlePreviewImage(characterImages[index] || "http://localhost:1198/images/placeholder.png")}
                        style={{ cursor: 'pointer' }}
                      />
                      <div className="image-label">主要参考</div>
                    </div>
                    
                    {/* 额外图片槽位 */}
                    <div className="additional-character-images">
                      {[0, 1].map(slotIndex => (
                        <div key={slotIndex} className="additional-image-slot">
                          {additionalCharacterImages[index]?.[slotIndex] ? (
                            <Image
                              src={safeImageUrl(additionalCharacterImages[index][slotIndex])}
                              alt={`${character.name} 额外图片 ${slotIndex + 1}`}
                              width={60}
                              height={75}
                              className="additional-character-image"
                              onClick={() => handlePreviewImage(additionalCharacterImages[index][slotIndex])}
                              style={{ cursor: 'pointer' }}
                            />
                          ) : (
                            <div 
                              className="add-image-slot" 
                              onClick={() => handleUploadAdditionalCharacterImage(index, slotIndex)}
                            >
                              <span>+</span>
                              <div>(可选)</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="character-image-buttons">
                    <button 
                      onClick={() => handleGenerateCharacterImage(index)} 
                      className="generate-char-btn"
                    >
                      生成图片
                    </button>
                    <button 
                      onClick={() => handleUploadCharacterImage(index)} 
                      className="upload-char-btn"
                    >
                      上传主图
                    </button>

                    <button 
                      onClick={() => handleGenerateCharacterVoiceDesign(index)}
                      style={{
                        backgroundColor: '#6f42c1',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        marginLeft: '5px'
                      }}
                    >
                      🎤 音色设计
                    </button>
                  </div>
                  
                  {/* 临时生成的图片选择器 */}
                  {character.tempImages && character.tempImages.length > 1 && (
                    <div className="character-temp-images">
                      <h5 style={{ margin: '10px 0 5px 0', fontSize: '12px', color: '#495057' }}>
                        选择一张作为角色主图:
                      </h5>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))', 
                        gap: '8px',
                        marginBottom: '10px'
                      }}>
                        {character.tempImages.map((imageUrl: string, imgIndex: number) => (
                          <div 
                            key={imgIndex}
                            style={{
                              position: 'relative',
                              cursor: 'pointer',
                              border: '2px solid #dee2e6',
                              borderRadius: '4px',
                              overflow: 'hidden',
                              transition: 'border-color 0.2s'
                            }}
                            onClick={() => handleCharacterImageSelect(index, imageUrl)}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#007bff'}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#dee2e6'}
                          >
                            <Image
                              src={safeImageUrl(imageUrl)}
                              alt={`${character.name} 选项 ${imgIndex + 1}`}
                              width={60}
                              height={75}
                              style={{ objectFit: 'cover' }}
                            />
                            <div style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              backgroundColor: 'rgba(0, 0, 0, 0.7)',
                              color: 'white',
                              fontSize: '10px',
                              textAlign: 'center',
                              padding: '2px'
                            }}>
                              选择
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* 分镜片段 */}
      {loaded && (
        <>
          {fragments.map((fragment, index) => (
            <StoryboardCard
              key={index}
              index={index}
              fragment={fragment}
              storyboard={storyboards[index] || ''}
              sceneDescription={sceneDescriptions[index] || ''}
              image={images[index] || ''}
              videoPrompt={videoPrompts[index] || ''}
              video={videos[index] || ''}
              characters={characters}
              characterImages={characterImages}
              requiredElements={storyboardRequiredElements[index]}
              sceneImages={sceneImages}
              isGeneratingVideo={isGeneratingVideo}
              onStoryboardChange={handleStoryboardChange}
              onSceneDescriptionChange={handleSceneDescriptionChange}
              onVideoPromptChange={handleVideoPromptChange}
              onMergeFragments={handleMergeFragments}
              onGenerateImage={handleGenerateImage}
              onGenerateVideo={handleGenerateVideo}
              onGenerateVideoPrompt={handleGenerateVideoPrompt}
              onUploadImage={handleUploadImage}
              onUploadVideo={handleUploadVideo}
              onPreviewImage={handlePreviewImage}
              onPreviewVideo={handlePreviewVideo}
              totalFragments={fragments.length}
              loraList={loraList}
              isLoadingLora={isLoadingLora}
              selectedLora={sceneLoraSelections[index] || ''}
              onLoraChange={handleSceneLoraChange}
              onGenerateImageWithElements={handleGenerateImageWithElements}
              onGenerateDialogue={handleGenerateSceneDialogue}
              characterSubjects={characterSubjects}
              sceneSubjects={sceneSubjects}
              isSmartGenerating={isSmartGenerating[index]}
            />
          ))}
        </>
      )}

      {/* 图片预览模态框 */}
      {isPreviewOpen && (
        <div className="preview-modal" onClick={() => setIsPreviewOpen(false)}>
          <div className="preview-content">
            <button className="preview-close" onClick={() => setIsPreviewOpen(false)}>×</button>
            <img src={previewImage || ''} alt="Preview" className="preview-image" />
          </div>
        </div>
      )}

      {/* 视频预览模态框 */}
      {isVideoPreviewOpen && (
        <div className="preview-modal" onClick={() => setIsVideoPreviewOpen(false)}>
          <div className="preview-content">
            <button className="preview-close" onClick={() => setIsVideoPreviewOpen(false)}>×</button>
            <video src={previewVideo || ''} controls className="preview-video" />
          </div>
        </div>
      )}

      {/* 项目文件列表 */}
      {currentProject && projectFiles.length > 0 && (
        <div style={{ marginTop: '30px', padding: '20px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e9ecef' }}>
          <h3 style={{ marginBottom: '20px', color: '#495057' }}>项目文件 ({projectFiles.length}个)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
            {projectFiles.map(file => {
              const getFileTypeBadge = (type: string) => {
                const badges = {
                  novel: { bg: '#e1bee7', color: '#4a148c', label: '小说' },
                  prompt: { bg: '#ffe0b2', color: '#e65100', label: '提示词' },
                  image: { bg: '#bbdefb', color: '#0d47a1', label: '图片' },
                  character: { bg: '#c8e6c9', color: '#1b5e20', label: '角色' },
                  scene: { bg: '#f0f0f0', color: '#424242', label: '场景' }
                };
                return badges[type as keyof typeof badges] || badges.scene;
              };
              
              const badge = getFileTypeBadge(file.type);
              return (
                <div key={file.id} style={{ border: '1px solid #e9ecef', borderRadius: '8px', padding: '15px', backgroundColor: '#fafafa' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{
                      backgroundColor: badge.bg,
                      color: badge.color,
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {badge.label}
                    </span>
                    <span style={{ fontSize: '12px', color: '#6c757d' }}>
                      {new Date(file.createdAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#495057' }}>{file.name}</h4>
                  {file.url && (
                    <img
                      src={file.url}
                      alt={file.name}
                      style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer', marginBottom: '10px' }}
                      onClick={() => handlePreviewImage(file.url!)}
                    />
                  )}
                  {file.content && (
                    <p style={{ fontSize: '14px', color: '#6c757d', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                      {file.content}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 项目创建/选择模态框 */}
      {showProjectModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={(e) => {
            // 只有在有当前项目时才允许点击背景关闭
            if (currentProject && e.target === e.currentTarget) {
              setShowProjectModal(false);
            }
          }}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '30px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{ marginBottom: '20px' }}>
              {currentProject ? '项目管理' : '🚀 欢迎使用！请先创建或选择项目'}
            </h3>
            {!currentProject && (
              <div style={{ 
                backgroundColor: '#fff3cd', 
                padding: '15px', 
                borderRadius: '6px', 
                marginBottom: '20px',
                border: '1px solid #ffeaa7'
              }}>
                <p style={{ margin: 0, color: '#856404' }}>
                  ⚠️ 使用本系统前需要创建或选择一个项目。项目将帮助您管理故事、角色、图片等所有创作内容。
                </p>
              </div>
            )}
            
            {projects.length > 0 && (
              <div style={{ marginBottom: '30px' }}>
                <h4 style={{ marginBottom: '15px' }}>选择现有项目</h4>
                <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                  {projects.map(project => (
                    <button
                      key={project.id}
                      onClick={() => {
                        switchProject(project);
                        setShowProjectModal(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '15px',
                        border: '1px solid #e9ecef',
                        borderRadius: '6px',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        marginBottom: '10px'
                      }}
                    >
                      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{project.name}</div>
                      <div style={{ fontSize: '14px', color: '#6c757d' }}>{project.description}</div>
                    </button>
                  ))}
                </div>
                <hr style={{ margin: '20px 0' }} />
              </div>
            )}

            <div>
              <h4 style={{ marginBottom: '15px' }}>创建新项目</h4>
              <div style={{ marginBottom: '15px' }}>
                <input
                  type="text"
                  placeholder="项目名称"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <textarea
                  placeholder="项目描述（可选）"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {currentProject && (
                <button
                  onClick={() => setShowProjectModal(false)}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  取消
                </button>
              )}
              <button
                onClick={createProject}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  backgroundColor: '#007bff',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                创建项目
              </button>
            </div>
          </div>
        </div>
      )}



      <ToastContainer />
    </div>
  );
}