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
import { ProjectSettingsModal } from '../components/ProjectSettingsModal';
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
  defaultSizeConfig?: {
    aspectRatio: string;
    quality: string;
    width: number;
    height: number;
  };
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

// 尺寸比例配置
const ASPECT_RATIOS = {
  '1:1': { name: '1:1 正方形', commonUse: '头像、社交平台配图' },
  '2:3': { name: '2:3 竖屏', commonUse: '社交媒体自拍、手机竖版内容' },
  '3:2': { name: '3:2 平衡比例', commonUse: '相机原生拍摄、图文排版' },
  '4:3': { name: '4:3 经典方正', commonUse: '文章配图、插画、传统显示器' },
  '16:9': { name: '16:9 宽屏主流', commonUse: '桌面壁纸、风景摄影、影视内容' },
  '9:16': { name: '9:16 竖屏宽屏', commonUse: '手机壁纸、短视频' },
  '21:9': { name: '21:9 超宽屏', commonUse: '电影宽银幕、专业后期' }
};

const QUALITY_OPTIONS = {
  '1:1': {
    'sd': { name: '标清', width: 320, height: 320 },
    'hd': { name: '高清', width: 640, height: 640 },
    'fhd': { name: '超清', width: 1080, height: 1080 },
    'uhd': { name: '超高清', width: 2048, height: 2048 }
  },
  '16:9': {
    'sd': { name: '标清', width: 854, height: 480 },
    'hd': { name: '高清', width: 1280, height: 720 },
    'fhd': { name: '全高清', width: 1920, height: 1080 },
    '2k': { name: '2K', width: 2560, height: 1440 },
    '4k': { name: '4K', width: 3840, height: 2160 }
  },
  '9:16': {
    'sd': { name: '标清', width: 480, height: 854 },
    'hd': { name: '高清', width: 720, height: 1280 },
    'fhd': { name: '全高清', width: 1080, height: 1920 },
    '2k': { name: '2K', width: 1440, height: 2560 }
  },
  // 其他比例的画质选项...
  '2:3': {
    'sd': { name: '标清', width: 400, height: 600 },
    'hd': { name: '高清', width: 640, height: 960 },
    'fhd': { name: '全高清', width: 1080, height: 1620 }
  },
  '3:2': {
    'sd': { name: '标清', width: 640, height: 427 },
    'hd': { name: '高清', width: 1200, height: 800 },
    'fhd': { name: '全高清', width: 1920, height: 1280 }
  },
  '4:3': {
    'sd': { name: '标清', width: 640, height: 480 },
    'hd': { name: '高清', width: 1024, height: 768 },
    'uhd': { name: '超清', width: 1600, height: 1200 }
  },
  '21:9': {
    'hd': { name: '高清宽屏', width: 2560, height: 1080 },
    '2k': { name: '2K宽屏', width: 3440, height: 1440 },
    '4k': { name: '4K宽屏', width: 5120, height: 2160 }
  }
};

export default function EnhancedImageInterface() {
  // 使用现有的hooks
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

  // 项目管理状态
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showProjectSettingsModal, setShowProjectSettingsModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  // 默认尺寸配置状态
  const [defaultSizeConfig, setDefaultSizeConfig] = useState({
    aspectRatio: '16:9',
    quality: 'fhd',
    width: 1920,
    height: 1080
  });

  // 美术风格状态
  const [artStyleGuide, setArtStyleGuide] = useState('');
  const [isGeneratingArtStyle, setIsGeneratingArtStyle] = useState(false);

  // 台词状态
  const [sceneDialogues, setSceneDialogues] = useState<{[key: number]: string}>({});

  // 完整故事内容状态
  const [fullStoryContent, setFullStoryContent] = useState('');

  // 小说保存相关状态
  const [novelContent, setNovelContent] = useState('');
  const [promptContent, setPromptContent] = useState('');
  const [showNovelModal, setShowNovelModal] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);

  // 其他现有状态
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);
  const [isVideoPreviewOpen, setIsVideoPreviewOpen] = useState<boolean>(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState<boolean>(false);
  const [additionalCharacterImages, setAdditionalCharacterImages] = useState<{[key: number]: string[]}>({});
  const [characterPanelCollapsed, setCharacterPanelCollapsed] = useState<boolean>(false);
  const [scenePanelCollapsed, setScenePanelCollapsed] = useState<boolean>(false);
  const [characterItemsCollapsed, setCharacterItemsCollapsed] = useState<{[key: number]: boolean}>({});
  const [sceneItemsCollapsed, setSceneItemsCollapsed] = useState<{[key: number]: boolean}>({});
  const [loraList, setLoraList] = useState<string[]>([]);
  const [isLoadingLora, setIsLoadingLora] = useState<boolean>(false);
  const [sceneLoraSelections, setSceneLoraSelections] = useState<{[key: number]: string}>({});
  const [isSmartGenerating, setIsSmartGenerating] = useState<{[key: number]: boolean}>({});

  // 初始化
  useEffect(() => {
    initialize();
    loadLoraList();
    loadSceneLoraSelections();
    loadProjects();
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
      updatedAt: new Date().toISOString(),
      defaultSizeConfig: defaultSizeConfig
    };

    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    localStorage.setItem('ai_projects', JSON.stringify(updatedProjects));
    
    setCurrentProject(newProject);
    localStorage.setItem('current_project_id', newProject.id);
    
    setNewProjectName('');
    setNewProjectDescription('');
    setShowProjectModal(false);
    
    showToast(`项目 "${newProject.name}" 创建成功`);
  };

  // 更新项目默认尺寸配置
  const updateProjectSizeConfig = async (config: typeof defaultSizeConfig) => {
    if (!currentProject) return;

    const updatedProject = {
      ...currentProject,
      defaultSizeConfig: config,
      updatedAt: new Date().toISOString()
    };

    const updatedProjects = projects.map(p => 
      p.id === currentProject.id ? updatedProject : p
    );

    setProjects(updatedProjects);
    setCurrentProject(updatedProject);
    localStorage.setItem('ai_projects', JSON.stringify(updatedProjects));
    localStorage.setItem('current_project_id', updatedProject.id);
    
    showToast('项目默认尺寸配置已更新');
  };

  // 获取当前使用的尺寸配置
  const getCurrentSizeConfig = () => {
    return currentProject?.defaultSizeConfig || defaultSizeConfig;
  };

  const switchProject = async (project: Project) => {
    setCurrentProject(project);
    localStorage.setItem('current_project_id', project.id);
    await loadProjectFiles(project.id);
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

  // 保存小说内容
  const saveNovelToProject = async () => {
    if (!novelContent.trim()) {
      showToast('请输入小说内容');
      return;
    }

    const fileName = `小说_${new Date().toLocaleString('zh-CN').replace(/[/:]/g, '-')}`;
    await saveProjectFile('novel', fileName, novelContent);
    setNovelContent('');
    setShowNovelModal(false);
  };

  // 保存提示词内容
  const savePromptToProject = async () => {
    if (!promptContent.trim()) {
      showToast('请输入提示词内容');
      return;
    }

    const fileName = `提示词_${new Date().toLocaleString('zh-CN').replace(/[/:]/g, '-')}`;
    await saveProjectFile('prompt', fileName, promptContent);
    setPromptContent('');
    setShowPromptModal(false);
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

  // 生成美术风格指南
  const generateArtStyleGuide = async () => {
    if (!storySummary.trim()) {
      showToast('请先生成故事梗概');
      return;
    }

    setIsGeneratingArtStyle(true);
    try {
      const config = await APIService.getModelConfig();
      
      const artStyleRequest = {
        projectType: '影视作品',
        storyTheme: storySummary,
        targetAudience: '大众观众',
        emotionalTone: '根据故事内容确定',
        projectName: currentProject?.name || 'default'
      };

      const result = await APIService.generateArtStyleGuide(artStyleRequest);
      
      if (result && result.artStyleGuide) {
        const styleText = `
项目美术风格指南

整体视觉风格：
${result.artStyleGuide.overallVisualStyle?.artisticPosition || ''}

色彩方案：
主色调：${result.artStyleGuide.colorScheme?.primaryColors?.map((c: any) => c.name).join(', ') || ''}
辅助色：${result.artStyleGuide.colorScheme?.secondaryColors?.map((c: any) => c.name).join(', ') || ''}

构图与摄影：
${result.artStyleGuide.compositionAndCinematography?.compositionPrinciples || ''}

角色设计指导：
${result.artStyleGuide.characterDesignGuidance?.characterStyling || ''}

场景设计指导：
${result.artStyleGuide.sceneDesignGuidance?.sceneDesignStyle || ''}
        `.trim();
        
        setArtStyleGuide(styleText);
        
        // 保存到项目文件
        if (currentProject) {
          await saveProjectFile('prompt', '美术风格指南', styleText);
        }
        
        showToast('美术风格指南生成成功！');
      } else {
        throw new Error('美术风格指南生成失败');
      }
    } catch (error) {
      console.error('Error generating art style guide:', error);
      showToast(`美术风格指南生成失败: ${(error as Error).message}`);
    } finally {
      setIsGeneratingArtStyle(false);
    }
  };

  // 生成美术风格指南
  const generateArtStyleGuide = async () => {
    if (!storySummary.trim()) {
      showToast('请先生成故事梗概');
      return;
    }

    setIsGeneratingArtStyle(true);
    try {
      const config = await APIService.getModelConfig();
      
      const artStyleRequest = {
        projectType: '影视作品',
        storyTheme: storySummary,
        targetAudience: '大众观众',
        emotionalTone: '根据故事内容确定',
        projectName: currentProject?.name || 'default'
      };

      const result = await APIService.generateArtStyleGuide(artStyleRequest);
      
      if (result && result.artStyleGuide) {
        const styleText = `
项目美术风格指南

整体视觉风格：
${result.artStyleGuide.overallVisualStyle?.artisticPosition || ''}

色彩方案：
主色调：${result.artStyleGuide.colorScheme?.primaryColors?.map((c: any) => c.name).join(', ') || ''}
辅助色：${result.artStyleGuide.colorScheme?.secondaryColors?.map((c: any) => c.name).join(', ') || ''}

构图与摄影：
${result.artStyleGuide.compositionAndCinematography?.compositionPrinciples || ''}

角色设计指导：
${result.artStyleGuide.characterDesignGuidance?.characterStyling || ''}

场景设计指导：
${result.artStyleGuide.sceneDesignGuidance?.sceneDesignStyle || ''}
        `.trim();
        
        setArtStyleGuide(styleText);
        
        // 保存到项目文件
        if (currentProject) {
          await saveProjectFile('prompt', '美术风格指南', styleText);
        }
        
        showToast('美术风格指南生成成功！');
      } else {
        throw new Error('美术风格指南生成失败');
      }
    } catch (error) {
      console.error('Error generating art style guide:', error);
      showToast(`美术风格指南生成失败: ${(error as Error).message}`);
    } finally {
      setIsGeneratingArtStyle(false);
    }
  };

  // 生成台词功能
  const generateSceneDialogue = async (sceneIndex: number) => {
    try {
      const sceneDescription = sceneDescriptions[sceneIndex] || storyboards[sceneIndex];
      if (!sceneDescription) {
        showToast('请先生成分镜脚本');
        return;
      }

      const config = await APIService.getModelConfig();
      const characterNames = characters.map(c => c.name).filter(name => name);
      
      if (characterNames.length === 0) {
        showToast('请先生成角色信息');
        return;
      }

      const dialogueRequest = {
        sceneDescription: sceneDescription,
        characters: characterNames.join(', '),
        storyContext: storySummary,
        emotionalTone: '根据场景确定',
        projectName: currentProject?.name || 'default'
      };

      const result = await APIService.generateSceneDialogue(dialogueRequest);
      
      if (result && result.dialogue) {
        let dialogueText = '';
        
        if (result.dialogue.mainDialogue && Array.isArray(result.dialogue.mainDialogue)) {
          dialogueText = result.dialogue.mainDialogue.map((line: any) => 
            `${line.characterName || line.character}: ${line.text} [${line.emotion || ''}]`
          ).join('\n');
        } else if (typeof result.dialogue === 'string') {
          dialogueText = result.dialogue;
        } else {
          dialogueText = JSON.stringify(result.dialogue, null, 2);
        }

        setSceneDialogues(prev => ({
          ...prev,
          [sceneIndex]: dialogueText
        }));

        showToast(`第${sceneIndex + 1}个场景的台词生成成功！`);
      } else {
        throw new Error('台词生成失败');
      }
    } catch (error) {
      console.error('Error generating scene dialogue:', error);
      showToast(`台词生成失败: ${(error as Error).message}`);
    }
  };

  // 更新项目设置
  const updateProjectSettings = async (updates: Partial<Project>) => {
    if (!currentProject) return;

    const updatedProject = {
      ...currentProject,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    const updatedProjects = projects.map(p => 
      p.id === currentProject.id ? updatedProject : p
    );

    setProjects(updatedProjects);
    setCurrentProject(updatedProject);
    localStorage.setItem('ai_projects', JSON.stringify(updatedProjects));
    localStorage.setItem('current_project_id', updatedProject.id);
    
    showToast('项目设置已更新');
  };

  // 获取当前使用的尺寸配置
  const getCurrentSizeConfig = () => {
    return currentProject?.defaultSizeConfig || defaultSizeConfig;
  };

  // 现有功能的实现（保持不变）
  const generateStoryAndCharacters = async () => {
    try {
      await originalGenerateStoryAndCharacters();
      
      // 自动生成美术风格指南
      setTimeout(() => {
        generateArtStyleGuide();
      }, 1000);
      
      const generatedScenes = (window as any).generatedScenes;
      if (generatedScenes && generatedScenes.length > 0) {
        for (const scene of generatedScenes) {
          try {
            await createSceneSubject(scene.name, scene.englishPrompt, []);
            showToast(`场景主体 "${scene.name}" 创建成功`);
          } catch (error) {
            console.error(`Error creating scene subject ${scene.name}:`, error);
          }
        }
        
        delete (window as any).generatedScenes;
        showToast(`场景主体创建完成！共创建${generatedScenes.length}个场景主体`);
      }
    } catch (error) {
      console.error('Error in enhanced generate story and characters:', error);
      showToast(`生成失败: ${(error as Error).message}`);
    }
  };

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

  const loadSceneLoraSelections = async () => {
    try {
      const selections = await APIService.loadSceneLoraSelections();
      setSceneLoraSelections(selections);
      console.log('Loaded scene LoRA selections:', selections);
    } catch (error) {
      console.error('Error loading scene LoRA selections:', error);
    }
  };

  const handleSceneLoraChange = async (sceneIndex: number, lora: string) => {
    const newSelections = {
      ...sceneLoraSelections,
      [sceneIndex]: lora
    };
    setSceneLoraSelections(newSelections);
    
    try {
      await APIService.saveSceneLoraSelection(sceneIndex, lora);
    } catch (error) {
      console.error('Error saving scene LoRA selection:', error);
    }
  };

  // 生成台词功能
  const generateSceneDialogue = async (sceneIndex: number) => {
    try {
      const sceneDescription = sceneDescriptions[sceneIndex] || storyboards[sceneIndex];
      if (!sceneDescription) {
        showToast('请先生成分镜脚本');
        return;
      }

      const config = await APIService.getModelConfig();
      const characterNames = characters.map(c => c.name).filter(name => name);
      
      if (characterNames.length === 0) {
        showToast('请先生成角色信息');
        return;
      }

      const dialogueRequest = {
        sceneDescription: sceneDescription,
        characters: characterNames.join(', '),
        storyContext: storySummary,
        emotionalTone: '根据场景确定',
        projectName: currentProject?.name || 'default'
      };

      const result = await APIService.generateSceneDialogue(dialogueRequest);
      
      if (result && result.dialogue) {
        let dialogueText = '';
        
        if (result.dialogue.mainDialogue && Array.isArray(result.dialogue.mainDialogue)) {
          dialogueText = result.dialogue.mainDialogue.map((line: any) => 
            `${line.characterName || line.character}: ${line.text} [${line.emotion || ''}]`
          ).join('\n');
        } else if (typeof result.dialogue === 'string') {
          dialogueText = result.dialogue;
        } else {
          dialogueText = JSON.stringify(result.dialogue, null, 2);
        }

        setSceneDialogues(prev => ({
          ...prev,
          [sceneIndex]: dialogueText
        }));

        showToast(`第${sceneIndex + 1}个场景的台词生成成功！`);
      } else {
        throw new Error('台词生成失败');
      }
    } catch (error) {
      console.error('Error generating scene dialogue:', error);
      showToast(`台词生成失败: ${(error as Error).message}`);
    }
  };

  const handleGenerateImage = async (index: number) => {
    try {
      showToast(`开始生成第${index + 1}个画面...`);
      
      const config = await APIService.getModelConfig();
      const API_KEY = config.easyaiApiKey;
      
      if (!API_KEY) {
        throw new Error('EasyAI API Key未配置，请在初始化页面配置');
      }

      let finalPrompt = sceneDescriptions[index] || '';
      
      const requiredElements = storyboardRequiredElements[index];
      if (requiredElements) {
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
        
        if (requiredElements.scene_prompt) {
          finalPrompt += ', ' + requiredElements.scene_prompt;
        }
      }
      
      if (!finalPrompt.trim()) {
        finalPrompt = "masterpiece, best quality, ultra detailed, 8k, photorealistic, cinematic lighting";
      }

      console.log(`Final prompt for scene ${index + 1}:`, finalPrompt);

      const selectedLora = sceneLoraSelections[index];
      const sizeConfig = getCurrentSizeConfig();
      const result = await APIService.generateImageWithLora(finalPrompt, API_KEY, selectedLora, 1, sizeConfig.width, sizeConfig.height);
      
      if (result.data && result.data.length > 0) {
        const imageUrl = result.data[0].url;
        
        const newImages = [...images];
        newImages[index] = safeImageUrl(imageUrl);
        setImages(newImages);
        
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

  const handleGenerateCharacterImage = async (characterIndex: number) => {
    try {
      showToast(`开始生成${characters[characterIndex].name}的角色图片...`);
      
      const config = await APIService.getModelConfig();
      const API_KEY = config.easyaiApiKey;
      
      if (!API_KEY) {
        throw new Error('EasyAI API Key未配置，请在初始化页面配置');
      }

      const character = characters[characterIndex];
      
      let characterPrompt = character.englishPrompt;
      if (!characterPrompt || characterPrompt.trim() === '') {
        characterPrompt = `masterpiece, best quality, ultra detailed, 8k, photorealistic, professional portrait, ${character.gender === '女性' ? 'beautiful woman' : 'handsome man'}, ${character.age}, ${character.appearance}, studio lighting, clean background, character reference sheet, front view, detailed face, detailed eyes, detailed hair`;
      }

      const sizeConfig = getCurrentSizeConfig();
      const result = await APIService.generateImageWithLora(characterPrompt, API_KEY, character.selectedLora, 4, sizeConfig.width, sizeConfig.height);
      
      if (result && result.data && Array.isArray(result.data) && result.data.length > 0) {
        const imageUrls = result.data.map((item: any) => {
          if (typeof item === 'string') {
            return item;
          } else if (item.url) {
            return item.url;
          } else if (item.image_url) {
            return item.image_url;
          } else {
            console.warn('Unknown image item structure:', item);
            return null;
          }
        }).filter(url => url !== null);
        
        if (imageUrls.length === 0) {
          throw new Error('无法从API响应中提取有效的图片URL');
        }
        
        const loraInfo = character.selectedLora ? ` (使用LoRA: ${character.selectedLora.split('\\').pop()?.replace('.safetensors', '')})` : '';
        
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
          const tempKey = `character_temp_images_${characterIndex}`;
          (window as any)[tempKey] = {
            images: imageUrls,
            characterIndex,
            character,
            loraInfo
          };
          
          showToast(`成功生成${imageUrls.length}张${character.name}的图片${loraInfo}！请在角色卡片中选择一张`);
          
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

  const handleCharacterImageSelect = async (characterIndex: number, selectedImageUrl: string) => {
    try {
      const character = characters[characterIndex];
      
      await APIService.saveCharacterImage(characterIndex, selectedImageUrl, character);
      
      const updatedCharacterImages = [...characterImages];
      updatedCharacterImages[characterIndex] = safeImageUrl(selectedImageUrl);
      setCharacterImages(updatedCharacterImages);
      
      const updatedCharacters = [...characters];
      updatedCharacters[characterIndex] = {
        ...character,
        tempImages: undefined
      };
      setCharacters(updatedCharacters);
      
      const tempKey = `character_temp_images_${characterIndex}`;
      delete (window as any)[tempKey];
      
      // 自动保存到当前项目
      if (currentProject) {
        await saveCharacterToProject(character, selectedImageUrl);
      }
      
      showToast(`已为${character.name}选择角色图片`);
    } catch (error) {
      console.error('Error selecting character image:', error);
      showToast('保存角色图片失败');
    }
  };

  const handlePreviewImage = (imageUrl: string) => {
    console.log('Preview image URL:', imageUrl);
    const safeUrl = safeImageUrl(imageUrl);
    console.log('Safe image URL:', safeUrl);
    
    setPreviewImage(safeUrl);
    setIsPreviewOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* 项目管理 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-800">AI Image Generator</h1>
            <div className="flex items-center space-x-4">
              {currentProject && (
                <div className="text-sm text-gray-600">
                  当前项目: <span className="font-semibold text-blue-600">{currentProject.name}</span>
                </div>
              )}
              {currentProject && (
                <button
                  onClick={() => setShowProjectSettingsModal(true)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  项目设置
                </button>
              )}
              <button
                onClick={() => setShowProjectModal(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                {currentProject ? '切换项目' : '创建项目'}
              </button>
            </div>
          </div>

          {/* 项目选择器 */}
          {projects.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {projects.map(project => (
                <button
                  key={project.id}
                  onClick={() => switchProject(project)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    currentProject?.id === project.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {project.name}
                </button>
              ))}
            </div>
          )}

          {/* 完整故事内容 */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">完整故事</h3>
            <textarea
              value={fullStoryContent}
              onChange={(e) => setFullStoryContent(e.target.value)}
              placeholder="在这里输入完整的故事内容，所有后续操作都将基于这个故事进行..."
              rows={8}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
              style={{
                fontSize: '14px',
                lineHeight: '1.5',
                fontFamily: 'inherit'
              }}
            />
            <div className="text-sm text-gray-500 mt-2">
              💡 这是项目的核心故事内容，所有角色、场景、分镜等都将基于此故事生成
            </div>
          </div>

          {/* 默认尺寸画质设置 */}
          {currentProject && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-3">默认尺寸画质设置</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">默认比例：</span>
                  <span className="font-medium">{currentProject.defaultSizeConfig?.aspectRatio || '16:9'}</span>
                </div>
                <div>
                  <span className="text-gray-600">默认画质：</span>
                  <span className="font-medium">{currentProject.defaultSizeConfig?.quality || 'fhd'}</span>
                </div>
                <div>
                  <span className="text-gray-600">默认尺寸：</span>
                  <span className="font-medium">
                    {currentProject.defaultSizeConfig ? 
                      `${currentProject.defaultSizeConfig.width}×${currentProject.defaultSizeConfig.height}` : 
                      '1920×1080'
                    }
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">应用范围：</span>
                  <span className="font-medium text-blue-600">所有图片生成</span>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                在"项目设置"中可以修改默认尺寸画质，所有图片生成功能都会自动应用这些设置
              </div>
            </div>
          )}
        </div>

        {/* 功能按钮区域 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={generateStoryAndCharacters}
              disabled={isLoading}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {isLoading ? '生成中...' : '主流程智能生成工具'}
            </button>
            <button
              onClick={generateSceneStoryboards}
              disabled={isLoading}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
            >
              生成分镜脚本
            </button>
            <button
              onClick={() => setShowNovelModal(true)}
              className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
            >
              保存小说
            </button>
            <button
              onClick={() => setShowPromptModal(true)}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
            >
              保存提示词
            </button>
            <button
              onClick={() => setIsCreatingSubject(true)}
              className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors"
            >
              创建主体
            </button>
          </div>
        </div>

        {/* 故事与场景管理 */}
        <StorySceneManagement
          storySummary={storySummary}
          novelScenes={novelScenes}
          sceneSubjects={sceneSubjects}
          characters={characters}
          onStorySummaryChange={setStorySummary}
          onNovelScenesChange={updateNovelScenes}
          onSceneSubjectChange={handleSceneSubjectChange}
          onCreateNewSceneSubject={createNewSceneSubject}
          onUploadSubjectImage={uploadSubjectImage}
          onPreviewImage={handlePreviewImage}
          onGenerateSceneImage={handleGenerateSceneImage}
          loraList={loraList}
          isLoadingLora={isLoadingLora}
        />

        {/* 角色主体管理 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">角色主体管理 ({characterSubjects.length}个)</h3>
            <button
              onClick={() => setCharacterPanelCollapsed(!characterPanelCollapsed)}
              className="text-gray-500 hover:text-gray-700"
            >
              {characterPanelCollapsed ? '展开' : '收起'}
            </button>
          </div>

          {!characterPanelCollapsed && (
            <div className="space-y-4">
              {characterSubjects.map((subject, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-800">{subject.name}</h4>
                    <button
                      onClick={() => setCharacterItemsCollapsed(prev => ({
                        ...prev,
                        [index]: !prev[index]
                      }))}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      {characterItemsCollapsed[index] ? '展开' : '收起'}
                    </button>
                  </div>

                  {!characterItemsCollapsed[index] && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                        <textarea
                          value={subject.description}
                          onChange={(e) => {
                            const updated = [...characterSubjects];
                            updated[index] = { ...updated[index], description: e.target.value };
                            // 这里需要调用更新函数
                          }}
                          className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">标签</label>
                        <input
                          type="text"
                          value={subject.tag || ''}
                          onChange={(e) => {
                            const updated = [...characterSubjects];
                            updated[index] = { ...updated[index], tag: e.target.value };
                            // 这里需要调用更新函数
                          }}
                          className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          placeholder="角色标签"
                        />
                      </div>
                      {subject.images && subject.images.length > 0 && (
                        <div className="grid grid-cols-4 gap-2">
                          {subject.images.map((imageUrl, imgIndex) => (
                            <div key={imgIndex} className="relative">
                              <Image
                                src={safeImageUrl(imageUrl)}
                                alt={`${subject.name} ${imgIndex + 1}`}
                                width={100}
                                height={100}
                                className="rounded-md object-cover cursor-pointer"
                                onClick={() => handlePreviewImage(imageUrl)}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 场景主体管理 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">场景主体管理 ({sceneSubjects.length}个)</h3>
            <button
              onClick={() => setScenePanelCollapsed(!scenePanelCollapsed)}
              className="text-gray-500 hover:text-gray-700"
            >
              {scenePanelCollapsed ? '展开' : '收起'}
            </button>
          </div>

          {!scenePanelCollapsed && (
            <div className="space-y-4">
              {sceneSubjects.map((subject, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-800">{subject.name}</h4>
                    <button
                      onClick={() => setSceneItemsCollapsed(prev => ({
                        ...prev,
                        [index]: !prev[index]
                      }))}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      {sceneItemsCollapsed[index] ? '展开' : '收起'}
                    </button>
                  </div>

                  {!sceneItemsCollapsed[index] && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                        <textarea
                          value={subject.description}
                          onChange={(e) => handleSceneSubjectChange(index, 'description', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">标签</label>
                        <input
                          type="text"
                          value={subject.tag || ''}
                          onChange={(e) => handleSceneSubjectChange(index, 'tag', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          placeholder="场景标签"
                        />
                      </div>
                      {subject.images && subject.images.length > 0 && (
                        <div className="grid grid-cols-4 gap-2">
                          {subject.images.map((imageUrl, imgIndex) => (
                            <div key={imgIndex} className="relative">
                              <Image
                                src={safeImageUrl(imageUrl)}
                                alt={`${subject.name} ${imgIndex + 1}`}
                                width={100}
                                height={100}
                                className="rounded-md object-cover cursor-pointer"
                                onClick={() => handlePreviewImage(imageUrl)}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 分镜生成区域 */}
        <div className="space-y-6">
          {storyboards.map((storyboard, index) => (
            <StoryboardCard
              key={index}
              index={index}
              storyboard={storyboard}
              sceneDescription={sceneDescriptions[index] || ''}
              image={images[index]}
              videoPrompt={videoPrompts[index] || ''}
              video={videos[index]}
              requiredElements={storyboardRequiredElements[index]}
              selectedLora={sceneLoraSelections[index]}
              loraList={loraList}
              isLoadingLora={isLoadingLora}
              isSmartGenerating={isSmartGenerating[index]}
              onStoryboardChange={(value) => {
                const newStoryboards = [...storyboards];
                newStoryboards[index] = value;
                setStoryboards(newStoryboards);
              }}
              onSceneDescriptionChange={(value) => {
                const newDescriptions = [...sceneDescriptions];
                newDescriptions[index] = value;
                setSceneDescriptions(newDescriptions);
              }}
              onVideoPromptChange={(value) => {
                const newVideoPrompts = [...videoPrompts];
                newVideoPrompts[index] = value;
                setVideoPrompts(newVideoPrompts);
              }}
              onLoraChange={(lora) => handleSceneLoraChange(index, lora)}
              onGenerateImage={() => handleGenerateImage(index)}
              onGenerateImageWithElements={() => handleGenerateImageWithElements(index)}
              onGenerateVideo={() => handleGenerateVideo(index)}
              onGenerateVideoPrompt={() => handleGenerateVideoPrompt(index)}
              onUploadImage={() => handleUploadImage(index)}
              onUploadVideo={() => handleUploadVideo(index)}
              onPreviewImage={handlePreviewImage}
              onPreviewVideo={handlePreviewVideo}
              onMergeFragments={(direction) => handleMergeFragments(index, direction)}
            />
          ))}
        </div>

        {/* 项目文件列表 */}
        {currentProject && projectFiles.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">项目文件</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projectFiles.map(file => (
                <div key={file.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      file.type === 'novel' ? 'bg-purple-100 text-purple-800' :
                      file.type === 'prompt' ? 'bg-orange-100 text-orange-800' :
                      file.type === 'image' ? 'bg-blue-100 text-blue-800' :
                      file.type === 'character' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {file.type === 'novel' ? '小说' :
                       file.type === 'prompt' ? '提示词' :
                       file.type === 'image' ? '图片' :
                       file.type === 'character' ? '角色' : '场景'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(file.createdAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  <h4 className="font-medium text-gray-800 mb-2 truncate">{file.name}</h4>
                  {file.url && (
                    <Image
                      src={safeImageUrl(file.url)}
                      alt={file.name}
                      width={200}
                      height={150}
                      className="rounded-md object-cover cursor-pointer"
                      onClick={() => handlePreviewImage(file.url!)}
                    />
                  )}
                  {file.content && (
                    <p className="text-sm text-gray-600 line-clamp-3">{file.content}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 项目创建/选择模态框 */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">项目管理</h3>
            
            {projects.length > 0 && (
              <div className="mb-6">
                <h4 className="font-medium mb-2">选择现有项目</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {projects.map(project => (
                    <button
                      key={project.id}
                      onClick={() => {
                        switchProject(project);
                        setShowProjectModal(false);
                      }}
                      className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="font-medium">{project.name}</div>
                      <div className="text-sm text-gray-500">{project.description}</div>
                    </button>
                  ))}
                </div>
                <hr className="my-4" />
              </div>
            )}

            <div>
              <h4 className="font-medium mb-2">创建新项目</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="项目名称"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
                <textarea
                  placeholder="项目描述（可选）"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowProjectModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                取消
              </button>
              <button
                onClick={createProject}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                创建项目
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 保存小说模态框 */}
      {showNovelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">保存小说</h3>
            <textarea
              placeholder="请输入小说内容..."
              value={novelContent}
              onChange={(e) => setNovelContent(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md"
              rows={15}
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowNovelModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                取消
              </button>
              <button
                onClick={saveNovelToProject}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
              >
                保存到项目
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 保存提示词模态框 */}
      {showPromptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">保存提示词</h3>
            <textarea
              placeholder="请输入提示词内容..."
              value={promptContent}
              onChange={(e) => setPromptContent(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md"
              rows={10}
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowPromptModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                取消
              </button>
              <button
                onClick={savePromptToProject}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                保存到项目
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 图片预览模态框 */}
      {isPreviewOpen && previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative max-w-4xl max-h-4xl">
            <button
              onClick={() => setIsPreviewOpen(false)}
              className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300 z-10"
            >
              ×
            </button>
            <Image
              src={previewImage}
              alt="预览图片"
              width={800}
              height={600}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}

      {/* 主体创建模态框 */}
      {isCreatingSubject && (
        <SubjectCreationModal
          isOpen={isCreatingSubject}
          onClose={() => setIsCreatingSubject(false)}
          mode={subjectCreationMode}
          onCreateCharacterSubject={createNewCharacterSubject}
          onCreateSceneSubject={createNewSceneSubject}
          onUploadImage={uploadSubjectImage}
        />
      )}

      {/* 项目设置模态框 */}
      <ProjectSettingsModal
        isOpen={showProjectSettingsModal}
        onClose={() => setShowProjectSettingsModal(false)}
        currentProject={currentProject}
        onUpdateProject={updateProjectSettings}
      />

      <ToastContainer />
    </div>
  );
}

// 缺少的函数实现
function handleGenerateSceneImage(index: number): void {
  console.log('Generate scene image:', index);
  showToast('场景图片生成功能待实现');
}

function handleGenerateImageWithElements(index: number): void {
  console.log('Generate image with elements:', index);
  showToast('智能生成功能待实现');
}

function handleGenerateVideo(index: number): void {
  console.log('Generate video:', index);
  showToast('生成视频功能待实现');
}

function handleGenerateVideoPrompt(index: number): void {
  console.log('Generate video prompt:', index);
  showToast('生成视频提示词功能待实现');
}

function handleUploadImage(index: number): void {
  console.log('Upload image:', index);
  showToast('上传图片功能待实现');
}

function handleUploadVideo(index: number): void {
  console.log('Upload video:', index);
  showToast('上传视频功能待实现');
}

function handlePreviewVideo(videoUrl: string): void {
  console.log('Preview video:', videoUrl);
  showToast('视频预览功能待实现');
}

function handleMergeFragments(index: number, direction: 'up' | 'down'): void {
  console.log('Merge fragments:', index, direction);
  showToast('合并片段功能待实现');
}

function handleSceneSubjectChange(index: number, field: string, value: string): void {
  console.log('Scene subject change:', index, field, value);
  showToast('场景主体更新功能待实现');
}