"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { ToastContainer } from "react-toastify";
import { useStoryboard } from '../hooks/useStoryboard';
import { useSubjects } from '../hooks/useSubjects';
import { SubjectCreationModal } from '../components/SubjectCreationModal';
import { StorySceneManagement } from '../components/StorySceneManagement';
import { StoryboardCard } from '../components/StoryboardCard';
import { ReactSelectLoraSelector } from '../components/ReactSelectLoraSelector';
import { ProjectSettingsModal } from '../components/ProjectSettingsModal';
import DataSourceModal from '../components/DataSourceModal';
import { APIService } from '../services/api';
import { safeImageUrl, createPlaceholderSVG } from '../utils/helpers';
import { showToast } from './toast';
import { getDefaultImageConfig, getImageGenerationConfig, ASPECT_RATIOS, QUALITY_OPTIONS } from '../utils/imageConfig';
import { MultiImagePreview } from '../components/MultiImagePreview';
import ImageDimensionSelector from '../components/ImageDimensionSelector';
import SubjectManager from '../components/SubjectManager';

import '../styles/components.css';

// 导入 imageHandlers 模块并定义别名以区分函数名
import {
  mapElementsToRegionParams as mapElementsToRegionParamsHandler,
  generateImageWithRegionControl as generateImageWithRegionControlHandler,
  generateImageWithLora as generateImageWithLoraHandler,
  generateAllImages as generateAllImagesHandler,
  generateArtStyleGuide as generateArtStyleGuideHandler,
  generateSceneAudioDesign as generateSceneAudioHandler,
  generateSceneDialogue as generateSceneDialogueHandler,
  generateSoundEffect as generateSoundEffectHandler,
  generateCharacterVoiceDesign as generateCharacterVoiceDesignHandler
} from './imageHandlers';
import { MultiImageSelector } from '@/components/MultiImageSelector';

// 尺寸配置常量


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
  // 项目管理状态 - 需要在useStoryboard之前定义
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [showProjectSettingsModal, setShowProjectSettingsModal] = useState(false);


  


  // 使用自定义 hooks
  const {
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
    setStoryboards,
    setSceneDescriptions,

    setVideoPrompts,
    setImages,
    setCharacters,
    setCharacterImages,
    setSoundEffects,
    initialize,
    generateStoryAndCharacters: originalGenerateStoryAndCharacters,
    generateSceneStoryboards,
  } = useStoryboard(currentProject);

  const {
    characterSubjects,
    sceneSubjects,
    isCreatingSubject,
    subjectCreationMode,
    setIsCreatingSubject,
    setSubjectCreationMode,
    setCharacterSubjects,
    setSceneSubjects,
    createCharacterSubject,
    createSceneSubject,
    createNewSceneSubject,
    uploadSubjectImage,
    updateSceneSubject,
    loadSubjects,
  } = useSubjects(currentProject);

  // 预览状态
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);
  const [isVideoPreviewOpen, setIsVideoPreviewOpen] = useState<boolean>(false);

  // 视频相关状态
  const [isGeneratingVideo, setIsGeneratingVideo] = useState<boolean>(false);
  
  // 音效生成状态
  const [isGeneratingSoundEffect, setIsGeneratingSoundEffect] = useState<boolean>(false);
  
  // 额外角色图片状态
  const [additionalCharacterImages, setAdditionalCharacterImages] = useState<{[key: number]: string[]}>({});
  
  // 额外场景图片状态
  const [additionalSceneImages, setAdditionalSceneImages] = useState<{[key: number]: string[]}>({});
  
  // 场景图片生成状态
  const [isGeneratingSceneImage, setIsGeneratingSceneImage] = useState<{[key: number]: boolean}>({});
  

  
  // 多图片预览状态
  const [multiImagePreview, setMultiImagePreview] = useState<{
    isOpen: boolean;
    images: string[];
    title: string;
    onSelect?: (imageUrl: string) => void;
    onMultiSelect?: (imageUrls: string[]) => void;
    selectedIndex: number;
    multiSelect: boolean;
    currentCharacterIndex?: number; // 当前操作的角色索引
    showAddButtons?: boolean; // 是否显示添加按钮
  }>({
    isOpen: false,
    images: [],
    title: '',
    onSelect: () => {},
    onMultiSelect: () => {},
    selectedIndex: -1,
    multiSelect: false,
    currentCharacterIndex: undefined,
    showAddButtons: false
  });
  
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

  // 角色图片生成尺寸状态
  
  // 角色信息保存防抖
  const characterSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 分镜脚本保存防抖
  const storyboardSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 场景描述保存防抖
  const sceneDescriptionSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 视频提示词保存防抖
  const videoPromptSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 防抖保存角色信息函数
  const debouncedSaveCharacterInfo = useCallback((newCharacters: any[]) => {
    // 清除之前的定时器
    if (characterSaveTimeoutRef.current) {
      clearTimeout(characterSaveTimeoutRef.current);
    }
    
    // 设置新的定时器，800ms后执行保存
    characterSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await APIService.saveCharacterInfo({
          summary: '',
          characters: newCharacters
        });
        
        // 自动保存到当前项目
        if (currentProject) {
          for (const character of newCharacters) {
            await saveCharacterToProject(character);
          }
        }
      } catch (error) {
        console.error('Error saving character info:', error);
      }
    }, 800);
  }, [currentProject]);
  
  // 防抖保存分镜脚本函数
  const debouncedSaveStoryboards = useCallback((newStoryboards: string[]) => {
    // 清除之前的定时器
    if (storyboardSaveTimeoutRef.current) {
      clearTimeout(storyboardSaveTimeoutRef.current);
    }
    
    // 设置新的定时器，800ms后执行保存
    storyboardSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await APIService.saveStoryboards(newStoryboards);
      } catch (error) {
        console.error('Error saving storyboards:', error);
      }
    }, 800);
  }, []);
  
  // 防抖保存场景描述函数
  const debouncedSaveSceneDescriptions = useCallback((newDescriptions: string[]) => {
    // 清除之前的定时器
    if (sceneDescriptionSaveTimeoutRef.current) {
      clearTimeout(sceneDescriptionSaveTimeoutRef.current);
    }
    
    // 设置新的定时器，800ms后执行保存
    sceneDescriptionSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await APIService.saveSceneDescriptions(newDescriptions);
      } catch (error) {
        console.error('Error saving scene descriptions:', error);
      }
    }, 800);
  }, []);
  
  // 防抖保存视频提示词函数
  const debouncedSaveVideoPrompt = useCallback((index: number, value: string) => {
    // 清除之前的定时器
    if (videoPromptSaveTimeoutRef.current) {
      clearTimeout(videoPromptSaveTimeoutRef.current);
    }
    
    // 设置新的定时器，800ms后执行保存
    videoPromptSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await APIService.saveVideoPrompt(index, value);
      } catch (error) {
        console.error('Error saving video prompt:', error);
      }
    }, 800);
  }, []);
  
  const [characterImageDimensions, setCharacterImageDimensions] = useState<{[key: number]: {aspectRatio: string, quality: string}}>({});

  // 完整故事内容状态
  const [fullStoryContent, setFullStoryContent] = useState('');

  // 主体管理库相关状态
  const [showSubjectManager, setShowSubjectManager] = useState(false);
  const [selectedCharacterLora, setSelectedCharacterLora] = useState(null);
  const [selectedSceneLora, setSelectedSceneLora] = useState(null);
  const [currentCharacterPrompt, setCurrentCharacterPrompt] = useState('');
  const [currentScenePrompt, setCurrentScenePrompt] = useState('');

  // 数据源选择模态框状态
  const [showDataSourceModal, setShowDataSourceModal] = useState(false);
  const [dataSourceModalType, setDataSourceModalType] = useState<'story' | 'storyboard'>('story');

  // 分区控制相关状态
  // 移除regionControlParams相关状态，直接使用标准接口

  // 从文件加载故事数据
  const loadStoryDataFromFile = async () => {
    try {
      if (!currentProject) {
        showToast('请先选择或创建项目');
        return;
      }
      
      showToast('正在从文件加载故事数据...');
      
      // 调用useStoryboard hook中的generateStoryAndCharacters函数
      // 该函数已经包含了优先从文件加载的逻辑
      await (originalGenerateStoryAndCharacters as unknown as () => Promise<void>)();
      
      showToast('故事数据加载完成！');
    } catch (error) {
      console.error('Error loading story data from file:', error);
      showToast(`加载失败: ${(error as Error).message}`);
    } finally {
    }
  };

  // 处理数据源选择
  const handleDataSourceSelection = async (source: 'file' | 'api') => {
    try {
      if (source === 'file') {
        // 从文件加载数据
        if (dataSourceModalType === 'story') {
          await loadStoryDataFromFile();
        } else {
          await generateSceneStoryboards(undefined, 'file');
        }
      } else {
        // 调用API生成
        if (dataSourceModalType === 'story') {
          await generateStoryAndCharacters();
        } else {
          await generateSceneStoryboards(undefined, 'api');
        }
      }
    } catch (error) {
      console.error('Error handling data source selection:', error);
      showToast(`操作失败: ${(error as Error).message}`);
    } finally {
      setShowDataSourceModal(false);
    }
  };

  // 增强版的生成故事和角色函数，同时生成场景主体
  const generateStoryAndCharacters = async (startChapter?: number, endChapter?: number) => {
    try {
      // 确保项目名称已设置
      if (!currentProject) {
        showToast('请先选择或创建项目');
        return;
      }
      
      // 确保全局项目名称已设置
      (window as any).currentProjectName = currentProject.name;
      console.log('Current project name set to:', currentProject.name);
      
      // 调用原始函数，传递章节范围参数（进行类型断言以兼容可选参数）
      await (originalGenerateStoryAndCharacters as unknown as (start?: number, end?: number) => Promise<void>)(startChapter, endChapter);
      
      // 添加调试信息
      console.log('After generateStoryAndCharacters, characters:', characters);
      
      // 检查是否有生成的场景数据
      const generatedScenes = (window as any).generatedScenes;
      if (generatedScenes && generatedScenes.length > 0) {
        console.log('Creating scene subjects for project:', currentProject.name);
        console.log('Generated scenes:', generatedScenes);
        
        // 为每个场景创建主体
        for (const scene of generatedScenes) {
          try {
            console.log(`Creating scene subject: ${scene.name} for project: ${currentProject.name}`);
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
      
      // 生成完成后，自动打开主体管理库进行 LoRA 选择
      if (characters.length > 0 || generatedScenes?.length > 0) {
        // 设置当前角色和场景的提示词
        if (characters.length > 0) {
          setCurrentCharacterPrompt(characters[0]?.appearance || characters[0]?.name || '');
        }
        if (generatedScenes?.length > 0) {
          setCurrentScenePrompt(generatedScenes[0]?.description || generatedScenes[0]?.name || '');
        }
        
        // 延迟打开主体管理库，确保状态更新完成
        setTimeout(() => {
          setShowSubjectManager(true);
          showToast('请选择适合的 LoRA 模型来优化生成效果');
        }, 1000);
      }
    } catch (error) {
      console.error('Error in enhanced generate story and characters:', error);
      showToast(`生成失败: ${(error as Error).message}`);
    }
  };

  // 处理 LoRA 选择
  const handleLoraSelected = (characterLora: any, sceneLora: any) => {
    setSelectedCharacterLora(characterLora);
    setSelectedSceneLora(sceneLora);
    
    if (characterLora) {
      showToast(`已选择角色 LoRA: ${characterLora.name}`);
      // 可以在这里保存到 ComfyUI-LoRA-Manager 的 Recipes
      saveLoraToRecipes('character', characterLora);
    }
    
    if (sceneLora) {
      showToast(`已选择场景 LoRA: ${sceneLora.name}`);
      // 可以在这里保存到 ComfyUI-LoRA-Manager 的 Recipes
      saveLoraToRecipes('scene', sceneLora);
    }
    
    showToast('LoRA 选择完成，可以开始生成图片了！');
  };

  // 保存 LoRA 到 ComfyUI-LoRA-Manager Recipes
  const saveLoraToRecipes = async (type: 'character' | 'scene', lora: any) => {
    try {
      const response = await fetch('/api/lora/recipes/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          lora_info: {
            id: lora.id,
            name: lora.name,
            description: lora.description,
            modelVersion: lora.modelVersions?.[0],
            trainedWords: lora.modelVersions?.[0]?.trainedWords || [],
            baseModel: lora.modelVersions?.[0]?.baseModel || '',
            downloadUrl: lora.modelVersions?.[0]?.downloadUrl || ''
          },
          project_id: currentProject?.id || (() => { throw new Error('Project ID is required'); })()
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '保存失败');
      }
      
      console.log(`${type} LoRA 已保存到 Recipes:`, result.recipe_name);
      showToast(`${type === 'character' ? '角色' : '场景'} LoRA 已保存到 ComfyUI-LoRA-Manager Recipes`);
      
    } catch (error) {
      console.error(`Error saving ${type} LoRA to recipes:`, error);
      showToast(`保存 ${type} LoRA 到 Recipes 失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  useEffect(() => {
    // 先加载项目，然后再初始化数据
    const initializeApp = async () => {
      await loadProjects();
      // 项目加载完成后再初始化数据
      await initialize();
    };
    
    initializeApp();
    loadLoraList();
    // 移除loadRegionControlParams调用，直接使用标准接口

    // 在页面加载时预取分区控制参数映射，避免首次生成时延迟
    (async () => {
      try {
        await APIService.getRegionControlParamMapping();
        console.log('[Prefetch] RegionControlParamMapping cached');
      } catch (e) {
        console.error('预取分区控制参数映射失败:', e);
      }
    })();
    
    // 取消旧的定时检测：是否显示创建项目模态框由 loadProjects 的结果决定
  }, []); // 移除initialize依赖，避免无限循环

  // 项目管理功能 - 从文件系统和当前项目状态加载
  const loadProjects = async () => {
    try {
      console.log('🔄 开始加载项目列表...');
      
      // 从后端API获取项目列表
      const response = await fetch('http://localhost:1198/api/projects/list');
      console.log('📡 项目列表API响应状态:', response.status, response.statusText);
      
      if (response.ok) {
        const projectList = await response.json();
        console.log('📋 原始项目数据:', projectList);
        console.log('📋 项目数组长度:', projectList?.length || 0);
        
        setProjects(projectList);
        console.log('✅ setProjects调用完成，设置项目数组:', projectList);
        
        // 获取当前项目状态
        const currentResponse = await fetch('http://localhost:1198/api/projects/current');
        console.log('📡 当前项目API响应状态:', currentResponse.status, currentResponse.statusText);
        
        let selectedProject = null;
        
        if (currentResponse.ok) {
          const currentData = await currentResponse.json();
          console.log('🎯 当前项目数据:', currentData);
          
          if (currentData.currentProject) {
            // 在项目列表中查找当前项目
            selectedProject = projectList.find(p => p.id === currentData.currentProject.id);
            console.log('🔍 查找匹配项目结果:', selectedProject);
          }
        }
        
        // 如果没有找到当前项目或当前项目不存在，选择第一个项目
        if (!selectedProject && projectList.length > 0) {
          selectedProject = projectList[0];
          console.log('📁 选择第一个项目:', selectedProject);
        }
        
        if (selectedProject) {
          console.log('🎯 设置当前项目:', selectedProject);
          
          // 加载项目设置（包括defaultSizeConfig）
          try {
            const projectSettings = await APIService.loadProjectSettings(selectedProject.name);
            if (projectSettings && projectSettings.defaultSizeConfig) {
              selectedProject.defaultSizeConfig = projectSettings.defaultSizeConfig;
              selectedProject.novelContent = projectSettings.novelContent;
              console.log('✅ 加载项目设置成功:', projectSettings.defaultSizeConfig);
            }
          } catch (error) {
            console.warn('⚠️ 加载项目设置失败，使用默认配置:', error);
          }
          
          setCurrentProject(selectedProject);
          // 设置全局项目名称，供后端使用
          (window as any).currentProjectName = selectedProject.name;
          // 更新当前项目状态到后端
          await updateCurrentProjectState(selectedProject);
          // 立刻加载与项目相关的文件与主体数据
          loadProjectFiles(selectedProject.id);
          try { await loadSubjects(selectedProject.name); } catch (e) { console.warn('加载主体数据失败（忽略）', e); }
          // 加载场景LoRA选择
          try { await loadSceneLoraSelections(); } catch (e) { console.warn('加载场景LoRA选择失败（忽略）', e); }
          console.log('🚪 关闭项目选择模态框');
          setShowProjectModal(false);
        } else {
          console.log('🚪 没有可选项目，显示项目选择模态框');
          console.log('📋 当前项目列表长度:', projectList.length);
          setShowProjectModal(true);
        }
      } else {
        console.log('❌ 项目列表API请求失败:', response.status, response.statusText);
        setShowProjectModal(true);
      }
    } catch (error) {
      console.error('❌ 加载项目时出错:', error);
      // 如果后端不可用，显示项目创建模态框
      console.log('🚪 后端不可用，显示项目创建模态框');
      setProjects([]);
      setCurrentProject(null);
      setShowProjectModal(true);
    }
  };

  // 更新当前项目状态到后端
  const updateCurrentProjectState = async (project: Project) => {
    try {
      await fetch('http://localhost:1198/api/projects/current', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project })
      });
    } catch (error) {
      console.error('Error updating current project state:', error);
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

    try {
      // 通过后端API创建项目
      const response = await fetch('http://localhost:1198/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject)
      });
      
      if (response.ok) {
        const updatedProjects = [...projects, newProject];
        setProjects(updatedProjects);
      }
    } catch (error) {
      console.error('Error creating project via API:', error);
      // 如果后端不可用，仅在前端状态中创建
      const updatedProjects = [...projects, newProject];
      setProjects(updatedProjects);
    }
    
    setCurrentProject(newProject);
    // 设置全局项目名称，供后端使用
    (window as any).currentProjectName = newProject.name;
    
    setNewProjectName('');
    setNewProjectDescription('');
    setShowProjectModal(false);
    
    showToast(`项目 "${newProject.name}" 创建成功`);
  };

  const switchProject = async (project: Project) => {
    // 加载项目设置（包括defaultSizeConfig）
    try {
      const projectSettings = await APIService.loadProjectSettings(project.name);
      if (projectSettings && projectSettings.defaultSizeConfig) {
        project.defaultSizeConfig = projectSettings.defaultSizeConfig;
        project.novelContent = projectSettings.novelContent;
        console.log('✅ 切换项目时加载设置成功:', projectSettings.defaultSizeConfig);
      }
    } catch (error) {
      console.warn('⚠️ 切换项目时加载设置失败，使用默认配置:', error);
    }
    
    setCurrentProject(project);
    await loadProjectFiles(project.id);
    // 设置全局项目名称，供后端使用
    (window as any).currentProjectName = project.name;
    // 更新当前项目状态到后端
    await updateCurrentProjectState(project);
    // 重新加载主体数据
    try { await loadSubjects(project.name); } catch (e) { console.warn('加载主体数据失败（忽略）', e); }
    showToast(`已切换到项目 "${project.name}"`);
  };

  const updateProjectSettings = async (updates: any) => {
    if (!currentProject) {
      console.log('No current project, settings will be saved globally');
      return;
    }

    const updatedProject = {
      ...currentProject,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    setCurrentProject(updatedProject);

    // 更新项目列表
    const updatedProjects = projects.map(p => 
      p.id === updatedProject.id ? updatedProject : p
    );
    setProjects(updatedProjects);
    
    try {
      // 通过后端API更新项目设置
      await fetch('http://localhost:1198/api/projects/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProject)
      });
    } catch (error) {
      console.error('Error updating project via API:', error);
      // 如果后端不可用，仅在前端状态中更新
    }

    showToast(`项目设置已保存`);
  };

  const loadProjectFiles = async (projectId: string) => {
    try {
      // 从后端API获取项目文件列表
      const response = await fetch(`http://localhost:1198/api/projects/${projectId}/files`);
      if (response.ok) {
        const files = await response.json();
        setProjectFiles(files);
      } else {
        setProjectFiles([]);
      }
      
      // 加载分镜元素数据
      try {
        const projectName = projects.find(p => p.id === projectId)?.name || currentProject?.name;
        if (projectName) {
          const storyboardElements = await APIService.loadStoryboardElements(projectName);
          console.log('Loaded storyboard elements:', storyboardElements);
          
          // 更新角色和场景主体数据
          if (storyboardElements.characters && storyboardElements.characters.length > 0) {
            setCharacterSubjects(storyboardElements.characters);
          }
          if (storyboardElements.scenes && storyboardElements.scenes.length > 0) {
            setSceneSubjects(storyboardElements.scenes);
          }
        }
      } catch (error) {
        console.warn('Failed to load storyboard elements:', error);
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

    try {
      // 通过后端API保存项目文件
      const response = await fetch('http://localhost:1198/api/projects/files/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFile)
      });
      
      if (response.ok) {
        const updatedFiles = [...projectFiles, newFile];
        setProjectFiles(updatedFiles);
      }
    } catch (error) {
      console.error('Error saving project file via API:', error);
      // 如果后端不可用，仅在前端状态中保存
      const updatedFiles = [...projectFiles, newFile];
      setProjectFiles(updatedFiles);
    }
    
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

  // 移除loadRegionControlParams函数，直接使用标准接口

  // 使用标准处理器：mapElementsToRegionParamsHandler（已从 ./imageHandlers 导入）

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
  const handleStoryboardChange = useCallback((index: number, value: string) => {
    const newStoryboards = [...storyboards];
    newStoryboards[index] = value;
    setStoryboards(newStoryboards);
    
    // 使用防抖保存分镜脚本
    debouncedSaveStoryboards(newStoryboards);
  }, [storyboards, debouncedSaveStoryboards]);

  // 处理场景描述变化
  const handleSceneDescriptionChange = useCallback((index: number, value: string) => {
    const newDescriptions = [...sceneDescriptions];
    newDescriptions[index] = value;
    setSceneDescriptions(newDescriptions);
    
    // 使用防抖保存场景描述
    debouncedSaveSceneDescriptions(newDescriptions);
  }, [sceneDescriptions, debouncedSaveSceneDescriptions]);

  // 处理视频提示词变化
  const handleVideoPromptChange = useCallback((index: number, value: string) => {
    const newVideoPrompts = [...videoPrompts];
    newVideoPrompts[index] = value;
    setVideoPrompts(newVideoPrompts);
    
    // 使用防抖保存视频提示词
    debouncedSaveVideoPrompt(index, value);
  }, [videoPrompts, debouncedSaveVideoPrompt]);

  // 处理场景主体变化
  const handleSceneSubjectChange = (index: number, field: string, value: string) => {
    updateSceneSubject(index, field, value).catch((error) => {
      console.error('Error updating scene subject:', error);
      showToast('场景主体更新失败');
    });
  };

  // 处理分镜卡片中的场景主体变化（四参，忽略场景序号）
  const handleSceneSubjectChangeFromCard = (
    sceneIndex: number,
    subjectIndex: number,
    field: string,
    value: string
  ) => {
    // 修复：应该使用subjectIndex来更新场景主体，而不是sceneIndex
    updateSceneSubject(subjectIndex, field, value).catch((error) => {
      console.error('Error updating scene subject from card:', error);
      showToast('场景主体更新失败');
    });
  };

  // 预填充数据状态
  const [prefilledSubjectData, setPrefilledSubjectData] = useState<{
    name?: string;
    description?: string;
  } | null>(null);

  // 处理从StoryboardCard创建场景主体
  const handleCreateSceneSubjectFromCard = async (sceneIndex: number, subjectName: string, scenePrompt?: string) => {
    // 设置预填充数据并打开模态框
    setPrefilledSubjectData({
      name: subjectName,
      description: scenePrompt || ''
    });
    setSubjectCreationMode('scene');
    setIsCreatingSubject(true);
  };

  // 合并片段
  const handleMergeFragments = (index: number, direction: 'up' | 'down') => {
    console.log('Merge fragments:', index, direction);
    showToast('合并片段功能待实现');
  };

  // 生成图片
  const handleGenerateImage = async (index: number, width?: number, height?: number) => {
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

      // 获取尺寸配置（使用传入参数或默认配置）
      const defaultConfig = getDefaultImageConfig(currentProject);
      const finalWidth = width || defaultConfig.width;
      const finalHeight = height || defaultConfig.height;
      // 生成图片（支持LoRA），生成单张图片，分镜画面使用"分区控制"模型
      const result = await APIService.generateImageWithLora(finalPrompt, API_KEY, selectedLora, 1, finalWidth, finalHeight, "分区控制");
      
      if (result.data && result.data.length > 0) {
        const imageUrl = result.data[0].url;
        
        // 更新图片
        const newImages = [...images];
        newImages[index] = safeImageUrl(imageUrl);
        setImages(newImages);
        
        // 保存图片
        // 保存图片到对应的scene_X.json文件
      await APIService.updateScene(index, {
        images: [imageUrl],
        generation_info: {
          type: '单张生成',
          timestamp: Date.now(),
          prompt: sceneDescriptions[index] || ''
        }
      });
        
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
  const handleGenerateImageWithElements = async (index: number, width?: number, height?: number) => {
    try {
      // 设置生成状态
      setIsSmartGenerating(prev => ({ ...prev, [index]: true }));
      showToast(`开始智能生成第${index + 1}个分镜图片...`);
      
      // 检查是否有分镜元素分析结果
      if (!storyboardRequiredElements[index]) {
        showToast('请先分析分镜所需元素');
        return;
      }

      const requiredElements = storyboardRequiredElements[index];

      // 从分镜文本中提取 @主体 标记，作为兜底来源，并与requiredElements合并
      const sceneText = sceneDescriptions[index] || '';
      const matches = sceneText.match(/@([^\s,，。！？]+)/g) || [];
      const normalizeName = (s: string) => String(s || '').replace(/^@/, '').replace(/[\s()（）:：,，、\-]/g, '');

      const existingCharNorms = new Set(
        (Array.isArray(requiredElements.character_subjects) ? requiredElements.character_subjects : [])
          .map((t: string) => normalizeName(t))
      );
      const existingSceneNorms = new Set(
        (Array.isArray(requiredElements.scene_subjects) ? requiredElements.scene_subjects : [])
          .map((t: string) => normalizeName(t))
      );

      const tokenChars: string[] = [];
      const tokenScenes: string[] = [];
      for (const m of matches) {
        const raw = m;
        const name = raw.replace(/^@/, '');
        const n = normalizeName(name);
        const charHit = (characterSubjects || []).find((s: any) => {
          const sn = normalizeName(s.name);
          const sd = normalizeName(s.description || '');
          return sn === n || n.includes(sn) || sn.includes(n) || sd.includes(n);
        });
        if (charHit) {
          if (!existingCharNorms.has(n)) {
            tokenChars.push(`@${name}`);
            existingCharNorms.add(n);
          }
          continue;
        }
        const sceneHit = (sceneSubjects || []).find((s: any) => {
          const sn = normalizeName(s.name);
          const sd = normalizeName(s.description || '');
          return sn === n || n.includes(sn) || sn.includes(n) || sd.includes(n);
        });
        if (sceneHit && !existingSceneNorms.has(n)) {
          tokenScenes.push(`@${name}`);
          existingSceneNorms.add(n);
        }
      }

      // 合并标签，确保关键主体优先
      const sceneTags: string[] = [
        ...tokenScenes,
        ...((Array.isArray(requiredElements.scene_subjects) ? requiredElements.scene_subjects : [])
          .filter((t: string) => !tokenScenes.find(ts => normalizeName(ts) === normalizeName(t))))
      ];
      const charTags: string[] = [
        ...tokenChars,
        ...((Array.isArray(requiredElements.character_subjects) ? requiredElements.character_subjects : [])
          .filter((t: string) => !tokenChars.find(tc => normalizeName(tc) === normalizeName(t))))
      ];
      
      // 检查是否有元素位置布局数据
      if (requiredElements.elements_layout && requiredElements.elements_layout.length > 0) {
        // 当 elements_layout 存在但可能缺少主体名称或类型时，用合并后的 tags 进行补全

        let sceneAssignIdx = 0;
        let charAssignIdx = 0;

        const enrichedElements = (requiredElements.elements_layout as any[]).map((el: any) => {
          const e: any = { ...el };
          // 兼容可能使用了 `type` 字段的情况
          if (!e.element_type && e.type) e.element_type = e.type;

          if (e.element_type === 'scene') {
            if (!e.name && sceneTags[sceneAssignIdx]) {
              e.name = String(sceneTags[sceneAssignIdx]).replace(/^@/, '');
              sceneAssignIdx = Math.min(sceneAssignIdx + 1, sceneTags.length);
            }
          } else if (e.element_type === 'character') {
            if (!e.name && charTags[charAssignIdx]) {
              e.name = String(charTags[charAssignIdx]).replace(/^@/, '');
              charAssignIdx = Math.min(charAssignIdx + 1, charTags.length);
            }
          } else {
            // 若未标注类型，则根据剩余待分配的主体优先匹配场景，否则角色
            if (!e.element_type) {
              if (sceneAssignIdx < sceneTags.length) {
                e.element_type = 'scene';
                e.name = String(sceneTags[sceneAssignIdx]).replace(/^@/, '');
                sceneAssignIdx = Math.min(sceneAssignIdx + 1, sceneTags.length);
              } else if (charAssignIdx < charTags.length) {
                e.element_type = 'character';
                e.name = String(charTags[charAssignIdx]).replace(/^@/, '');
                charAssignIdx = Math.min(charAssignIdx + 1, charTags.length);
              }
            }
          }

          // 注入主体的 lora / photo / prompt
          const subject = e.element_type === 'character'
            ? (characterSubjects || []).find((s: any) => s.name === e.name)
            : e.element_type === 'scene'
              ? (sceneSubjects || []).find((s: any) => s.name === e.name)
              : null;
          if (subject) {
            if (e.lora == null && subject.selectedLora) e.lora = subject.selectedLora;
            if (e.photo == null) e.photo = subject.subjectImages?.[0] || subject.images?.[0] || '';
            if (e.prompt == null) e.prompt = subject.tag || subject.description || '';
          }

          return e;
        });

        // 若没有任何场景元素但存在场景主体，则追加一个铺满画布的场景元素
        if (!enrichedElements.some((e: any) => e.element_type === 'scene') && sceneTags.length > 0) {
          const firstSceneName = String(sceneTags[0]).replace(/^@/, '');
          const sceneSubject = (sceneSubjects || []).find((s: any) => s.name === firstSceneName);
          enrichedElements.unshift({
            element_type: 'scene',
            name: firstSceneName,
            // 坐标留空，map函数内默认铺满画布
            lora: sceneSubject?.selectedLora,
            photo: sceneSubject?.subjectImages?.[0] || sceneSubject?.images?.[0] || '',
            prompt: sceneSubject?.tag || sceneSubject?.description || ''
          });
        }

        await generateImageWithRegionControlHandler(index, enrichedElements, width, height, {
          currentProject,
          characterSubjects,
          sceneSubjects,
          characters,
          images,
          setImages,
        });
      } else {
        // 当缺少elements_layout时：基于合并后的主体标签自动构建分区元素布局，确保@标签主体也被纳入
        const builtElements: any[] = [];

        // 优先放置场景主体（若提供）
        if (sceneTags.length > 0) {
          const firstSceneName = String(sceneTags[0]).replace(/^@/, '');
          const sceneSubject = (sceneSubjects || []).find((s: any) => s.name === firstSceneName);
          builtElements.push({
            element_type: 'scene',
            name: firstSceneName,
            // 位置与尺寸留空，map函数内会让scene默认铺满画布
            lora: sceneSubject?.selectedLora,
            photo: sceneSubject?.subjectImages?.[0] || sceneSubject?.images?.[0] || '',
            prompt: sceneSubject?.tag || sceneSubject?.description || ''
          });
        }

        // 追加角色主体（基于主体管理坐标，如无则在map中使用兜底）
        charTags.forEach((tag: string) => {
          const name = String(tag).replace(/^@/, '');
          const subject = characterSubjects.find((s: any) => s.name === name);
          builtElements.push({
            element_type: 'character',
            name,
            x: subject?.x,
            y: subject?.y,
            width: subject?.width,
            height: subject?.height,
            lora: subject?.selectedLora,
            photo: subject?.subjectImages?.[0] || subject?.images?.[0] || '',
            prompt: subject?.tag || subject?.description || ''
          });
        });

        await generateImageWithRegionControlHandler(index, builtElements, width, height, {
          currentProject,
          characterSubjects,
          sceneSubjects,
          characters,
          images,
          setImages,
        });
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
  const handleGenerateVideo = (index: number, width?: number, height?: number) => {
    console.log('Generate video:', index, 'dimensions:', width, height);
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
    console.log('Upload image for storyboard:', index);
    
    // 创建文件输入元素
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = false;
    
    input.onchange = async (event: any) => {
      const file = event.target.files[0];
      if (!file) return;
      
      try {
        // 显示上传中状态
        showToast('正在上传图片...');
        
        // 上传图片到后端
        const formData = new FormData();
        formData.append('image', file);
        formData.append('projectName', (window as any).currentProjectName || '');
        
        const response = await fetch('http://localhost:1198/api/save/image', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error('上传失败');
        }
        
        const result = await response.json();
        const imageUrl = result.image_url;
        
        // 保存图片信息到项目
        // 保存上传图片到对应的scene_X.json文件
        await APIService.updateScene(index, {
          images: [imageUrl],
          generation_info: {
            type: '上传图片',
            timestamp: Date.now(),
            is_upload: true
          }
        });
        
        // 更新本地状态
        const newImages = [...images];
        newImages[index] = safeImageUrl(imageUrl);
        setImages(newImages);
        
        showToast('图片上传成功！');
        
      } catch (error) {
        console.error('Error uploading image:', error);
        showToast('图片上传失败，请重试');
      }
    };
    
    // 触发文件选择
    input.click();
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




  // 处理角色信息变化
  const handleCharacterChange = useCallback((index: number, field: string, value: string) => {
    const newCharacters = [...characters];
    newCharacters[index] = {
      ...newCharacters[index],
      [field]: value
    };
    
    // 更新状态
    setCharacters(newCharacters);
    
    // 使用防抖保存
    debouncedSaveCharacterInfo(newCharacters);
  }, [characters, debouncedSaveCharacterInfo]);

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
        summary: '',
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

      // 获取角色特定的尺寸配置，如果没有设置则使用默认配置
      const characterDimension = characterImageDimensions[characterIndex];
      let width, height;
      
      if (characterDimension) {
        // 使用角色特定的尺寸配置
        const { aspectRatio, quality } = characterDimension;
        const config = getImageGenerationConfig(aspectRatio, quality);
        width = config.width;
        height = config.height;
      } else {
        // 使用默认尺寸配置
        const defaultConfig = getDefaultImageConfig(currentProject);
        width = defaultConfig.width;
        height = defaultConfig.height;
      }
      
      // 使用支持LoRA的生成方法，生成4张图片，角色图片使用"角色形象制作"模型
      const result = await APIService.generateImageWithLora(characterPrompt, API_KEY, character.selectedLora, 4, width, height, "角色形象制作");
      
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
        }).filter((url: string | null): url is string => url !== null);
        
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
          // 多张图片时，打开预览选择器
          showToast(`成功生成${imageUrls.length}张${character.name}的图片${loraInfo}！请选择一张`);
          
          setMultiImagePreview({
            isOpen: true,
            images: imageUrls,
            title: `选择${character.name}的角色图片`,
            currentCharacterIndex: characterIndex,
            multiSelect: true, // 启用多选模式
            showAddButtons: true, // 显示添加按钮
            onSelect: async (selectedImageUrl: string) => {
              try {
                // 保存选中的图片
                await APIService.saveCharacterImage(characterIndex, selectedImageUrl, character);
                
                const updatedCharacterImages = [...characterImages];
                updatedCharacterImages[characterIndex] = safeImageUrl(selectedImageUrl);
                setCharacterImages(updatedCharacterImages);
                
                // 自动保存到当前项目
                if (currentProject) {
                  await saveCharacterToProject(character, selectedImageUrl);
                }
                
                // 关闭预览
                setMultiImagePreview(prev => ({ ...prev, isOpen: false }));
                showToast(`已为${character.name}选择角色图片`);
              } catch (error) {
                console.error('Error selecting character image:', error);
                showToast('保存角色图片失败');
              }
            },
            onMultiSelect: async (selectedImageUrls: string[]) => {
              if (selectedImageUrls.length === 1) {
                // 如果只选择了一张图片，设置为主要角色图片
                try {
                  const selectedImageUrl = selectedImageUrls[0];
                  await APIService.saveCharacterImage(characterIndex, selectedImageUrl, character);
                  
                  const updatedCharacterImages = [...characterImages];
                  updatedCharacterImages[characterIndex] = safeImageUrl(selectedImageUrl);
                  setCharacterImages(updatedCharacterImages);
                  
                  if (currentProject) {
                    await saveCharacterToProject(character, selectedImageUrl);
                  }
                  
                  setMultiImagePreview(prev => ({ ...prev, isOpen: false }));
                  showToast(`已为${character.name}选择角色图片`);
                } catch (error) {
                  console.error('Error selecting character image:', error);
                  showToast('保存角色图片失败');
                }
              } else {
                // 多张图片时，提示用户使用添加到主体图/参考图功能
                showToast('请使用"添加到主体图"或"添加到参考图"按钮来保存多张图片');
              }
            },
            selectedIndex: -1
          });
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

  // 添加图片到主体图
  const handleAddToSubjectImage = async (imageUrls: string[]) => {
    try {
      const characterIndex = multiImagePreview.currentCharacterIndex;
      if (characterIndex === undefined) {
        showToast('无法确定当前角色，请重新操作');
        return;
      }

      const character = characters[characterIndex];
      if (!character) {
        showToast('角色信息不存在');
        return;
      }

      // 查找对应的角色主体
      const characterSubject = characterSubjects.find(subject => 
        subject.name === character.name || subject.description.includes(character.name)
      );

      if (!characterSubject) {
        showToast(`未找到角色"${character.name}"对应的主体，请先创建角色主体`);
        return;
      }

      // 更新角色主体的主体图片
      const updatedCharacterSubjects = characterSubjects.map(subject => {
        if (subject.id === characterSubject.id) {
          return {
            ...subject,
            subjectImages: [...(subject.subjectImages || []), ...imageUrls]
          };
        }
        return subject;
      });

      setCharacterSubjects(updatedCharacterSubjects);
      
      // 使用防抖保存更新
      debouncedSaveSubjects(updatedCharacterSubjects, undefined);

      showToast(`成功添加${imageUrls.length}张图片到"${character.name}"的主体图`);
    } catch (error) {
      console.error('Error adding images to subject:', error);
      showToast(`添加到主体图失败: ${(error as Error).message}`);
    }
  };

  // 添加图片到参考图
  const handleAddToReferenceImage = async (imageUrls: string[]) => {
    try {
      const characterIndex = multiImagePreview.currentCharacterIndex;
      if (characterIndex === undefined) {
        showToast('无法确定当前角色，请重新操作');
        return;
      }

      const character = characters[characterIndex];
      if (!character) {
        showToast('角色信息不存在');
        return;
      }

      // 查找对应的角色主体
      const characterSubject = characterSubjects.find(subject => 
        subject.name === character.name || subject.description.includes(character.name)
      );

      if (!characterSubject) {
        showToast(`未找到角色"${character.name}"对应的主体，请先创建角色主体`);
        return;
      }

      // 更新角色主体的参考图片
      const updatedCharacterSubjects = characterSubjects.map(subject => {
        if (subject.id === characterSubject.id) {
          return {
            ...subject,
            referenceImages: [...(subject.referenceImages || []), ...imageUrls]
          };
        }
        return subject;
      });

      setCharacterSubjects(updatedCharacterSubjects);
      
      // 使用防抖保存更新
      debouncedSaveSubjects(updatedCharacterSubjects, undefined);

      showToast(`成功添加${imageUrls.length}张图片到"${character.name}"的参考图`);
    } catch (error) {
      console.error('Error adding images to reference:', error);
      showToast(`添加到参考图失败: ${(error as Error).message}`);
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

  // 上传音色文件
  const handleUploadVoiceFile = async (characterIndex: number) => {
    try {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'audio/*,.mp3,.wav,.m4a,.aac';
      
      fileInput.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        
        try {
          showToast(`正在上传${characters[characterIndex].name}的音色文件...`);
          
          const formData = new FormData();
          formData.append('voice', file);
          formData.append('character_index', characterIndex.toString());
          formData.append('character_name', characters[characterIndex]?.name || `character_${characterIndex}`);
          
          const response = await fetch('http://localhost:1198/api/upload/character/voice', {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) {
            throw new Error('Failed to upload voice file');
          }
          
          const result = await response.json();
          
          // 更新角色音色信息
          await handleCharacterChange(characterIndex, 'voiceFile', result.voice_url);
          await handleCharacterChange(characterIndex, 'voiceFileName', file.name);
          
          showToast(`${characters[characterIndex].name}的音色文件上传成功`);
        } catch (error) {
          console.error('Error uploading voice file:', error);
          showToast(`上传失败: ${(error as Error).message}`);
        }
      };
      
      fileInput.click();
    } catch (error) {
      console.error('Error uploading voice file:', error);
      showToast(`上传失败: ${(error as Error).message}`);
    }
  };

  // 播放音色文件
  const handlePlayVoiceFile = (characterIndex: number) => {
    const character = characters[characterIndex];
    if (!character.voiceFile) {
      showToast('没有音色文件');
      return;
    }
    
    try {
      const audio = new Audio(character.voiceFile);
      audio.play();
      showToast(`正在播放${character.name}的音色文件`);
    } catch (error) {
      console.error('Error playing voice file:', error);
      showToast('播放失败');
    }
  };

  // 删除音色文件
  const handleRemoveVoiceFile = async (characterIndex: number) => {
    try {
      await handleCharacterChange(characterIndex, 'voiceFile', '');
      await handleCharacterChange(characterIndex, 'voiceFileName', '');
      showToast(`已删除${characters[characterIndex].name}的音色文件`);
    } catch (error) {
      console.error('Error removing voice file:', error);
      showToast('删除失败');
    }
  };



  // 生成场景图片
  const handleGenerateSceneImage = async (sceneIndex: number) => {
    try {
      // 设置生成状态
      setIsGeneratingSceneImage(prev => ({ ...prev, [sceneIndex]: true }));
      
      showToast(`开始生成${sceneSubjects[sceneIndex].name}的场景图片...`);
      
      const config = await APIService.getModelConfig();
      const API_KEY = config.easyaiApiKey;
      
      if (!API_KEY) {
        throw new Error('EasyAI API Key未配置，请在初始化页面配置');
      }

      const sceneSubject = sceneSubjects[sceneIndex];
      
      // 调试日志：检查场景主体数据
      console.log('场景主体数据:', sceneSubject);
      console.log('选中的LoRA:', sceneSubject.selectedLora);
      
      // 获取尺寸配置
      const aspectRatio = sceneSubject.customAspectRatio || '1:1';
      const quality = sceneSubject.customQuality || 'fhd';
      const dimensionConfig = QUALITY_OPTIONS[aspectRatio]?.[quality] || QUALITY_OPTIONS['1:1']['fhd'];
      const { width, height } = dimensionConfig;
      
      // 使用场景描述作为提示词
      let scenePrompt = sceneSubject.description;
      if (!scenePrompt || scenePrompt.trim() === '') {
        scenePrompt = `masterpiece, best quality, ultra detailed, 8k, photorealistic, cinematic lighting, ${sceneSubject.name}, detailed background, atmospheric lighting`;
      }

      console.log('生成参数:', {
        prompt: scenePrompt,
        lora: sceneSubject.selectedLora,
        width,
        height
      });

      // 生成4张图片供选择
      const result = await APIService.generateImageWithLora(scenePrompt, API_KEY, sceneSubject.selectedLora, 4, width, height, "场景制作");
      
      if (result.data && result.data.length > 0) {
        const imageUrls = result.data.map((item: any) => item.url);
        
        // 保存额外的场景图片到状态中
        setAdditionalSceneImages(prev => ({
          ...prev,
          [sceneIndex]: imageUrls
        }));
        
        // 保存第一张图片作为默认场景图片
        // 保存图片到对应的scene_X.json文件
        await APIService.updateScene(sceneIndex, {
          images: [imageUrls[0]],
          generation_info: {
            type: '场景元素生成',
            timestamp: Date.now(),
            prompt: scenePrompt
          }
        });
        
        const loraInfo = sceneSubject.selectedLora ? ` (使用LoRA: ${sceneSubject.selectedLora.split('\\').pop()})` : '';
        const sizeInfo = ` (${width}x${height})`;
        showToast(`${sceneSubject.name}的场景图片生成成功，共${imageUrls.length}张${loraInfo}${sizeInfo}`);
      } else {
        throw new Error('未收到有效的图片数据');
      }
      
    } catch (error) {
      console.error('Error generating scene image:', error);
      showToast(`场景图片生成失败: ${(error as Error).message}`);
    } finally {
      // 清除生成状态
      setIsGeneratingSceneImage(prev => ({ ...prev, [sceneIndex]: false }));
    }
  };

  // 处理场景图片选择
  const handleSceneImageSelect = async (sceneIndex: number, selectedImageUrl: string) => {
    try {
      showToast(`正在保存选中的场景图片到${sceneSubjects[sceneIndex].name}...`);
      
      // 保存选中的图片到场景主体
      const sceneSubject = sceneSubjects[sceneIndex];
      const updatedSceneSubject = {
        ...sceneSubject,
        images: [...(sceneSubject.images || []), selectedImageUrl]
      };
      
      // 更新场景主体列表
      const updatedSceneSubjects = [...sceneSubjects];
      updatedSceneSubjects[sceneIndex] = updatedSceneSubject;
      setSceneSubjects(updatedSceneSubjects);
      
      // 使用防抖保存到后端
      debouncedSaveSubjects(undefined, updatedSceneSubjects);
      
      // 同时保存单个场景主体图片（生成的图片，不需要下载）
      await APIService.saveSubjectImage(sceneSubject.name, selectedImageUrl, 'scene', false);
      
      showToast(`场景图片已成功保存到${sceneSubject.name}`);
      
    } catch (error) {
      console.error('Error saving scene image:', error);
      showToast(`保存场景图片失败: ${(error as Error).message}`);
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
    await generateArtStyleGuideHandler({
       currentProject,
       fullStoryContent,
     });
  };

  // 生成场景音效设计
  const handleGenerateSceneAudio = async (sceneIndex: number) => {
    await generateSceneAudioHandler({
      sceneIndex,
      sceneSubjects,
      currentProject,
    });
  };

  // 生成分镜台词
  const handleGenerateSceneDialogue = async (sceneIndex: number) => {
    await generateSceneDialogueHandler({
      sceneIndex,
      storyboards,
      sceneDescriptions,
      characters,
      fullStoryContent,
      currentProject,
    });
  };

  // 生成场景音效
  const handleGenerateSoundEffect = async (sceneIndex: number) => {
    await generateSoundEffectHandler({
      sceneIndex,
      storyboards,
      sceneDescriptions,
      currentProject,
      soundEffects,
      setSoundEffects,
      setIsGeneratingSoundEffect,
    });
  };

  // 生成角色音色设计
  const handleGenerateCharacterVoiceDesign = async (characterIndex: number) => {
    await generateCharacterVoiceDesignHandler({
      characterIndex,
      characters,
      currentProject,
    });
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
                onClick={() => setShowProjectSettingsModal(true)}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ⚙️ 项目设置
              </button>
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
        <div className="story-generation-section">
          <button 
            onClick={() => {
              setDataSourceModalType('story');
              setShowDataSourceModal(true);
            }} 
            disabled={isLoading} 
            className="generate-story"
          >
            {isLoading ? '生成中...' : '生成角色和场景主体'}
          </button>
        </div>
        <button 
          onClick={() => {
            setDataSourceModalType('storyboard');
            setShowDataSourceModal(true);
          }} 
          className="generate-storyboard" 
          disabled={characters.length === 0}
        >
          生成分镜脚本
        </button>
        {loaded && (
          <>
            <button onClick={handleGenerateAudio} className="generate-audio">生成音效</button>
          </>
        )}
      </div>

      {/* 主体创建模态框 */}
      <SubjectCreationModal
        isOpen={isCreatingSubject}
        mode={subjectCreationMode}
        onClose={() => {
          setIsCreatingSubject(false);
          setPrefilledSubjectData(null);
        }}
        onCreateCharacter={createCharacterSubject}
        onCreateScene={createSceneSubject}
        loraList={loraList}
        isLoadingLora={isLoadingLora}
        currentProject={currentProject}
        prefilledData={prefilledSubjectData}
      />

      {/* 项目设置模态框 */}
      <ProjectSettingsModal
        isOpen={showProjectSettingsModal}
        onClose={() => setShowProjectSettingsModal(false)}
        currentProject={currentProject}
        onUpdateProject={updateProjectSettings}
      />

      {/* 数据源选择模态框 */}
      <DataSourceModal
        isOpen={showDataSourceModal}
        onClose={() => setShowDataSourceModal(false)}
        onSelect={handleDataSourceSelection}
        title={dataSourceModalType === 'story' ? '选择故事数据来源' : '选择分镜数据来源'}
        description={dataSourceModalType === 'story' 
          ? '您可以选择从最近的文件加载故事数据，或者重新调用AI接口生成。'
          : '您可以选择从最近的文件加载分镜数据，或者重新调用AI接口生成。'
        }
        fileOptionDescription={dataSourceModalType === 'story'
          ? '从 latest_llm_response_story_generation.json 加载'
          : '从 complete_storyboard.json 加载'
        }
        apiOptionDescription="重新调用AI接口生成"
      />



      {/* 场景管理 */}
      <StorySceneManagement
        sceneSubjects={sceneSubjects}
        characters={characters}
        onSceneSubjectChange={handleSceneSubjectChange}
        onCreateNewSceneSubject={createNewSceneSubject}
        onUploadSubjectImage={uploadSubjectImage}
        onPreviewImage={handlePreviewImage}
        onGenerateSceneImage={handleGenerateSceneImage}
        onSceneImageSelect={handleSceneImageSelect}
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
        currentProject={currentProject}
        additionalSceneImages={additionalSceneImages}
        isGeneratingSceneImage={isGeneratingSceneImage}
      />





      {/* 角色主体管理区域 */}
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

                  {/* 音色上传部分 */}
                  <div className="character-voice-section">
                    <label>角色音色文件:</label>
                    <div className="voice-upload-area">
                      {character.voiceFile ? (
                        <div className="voice-file-info">
                          <div className="voice-file-name">
                            🎵 {character.voiceFileName || '音色文件'}
                          </div>
                          <div className="voice-file-actions">
                            <button 
                              onClick={() => handlePlayVoiceFile(index)}
                              className="play-voice-btn"
                            >
                              播放
                            </button>
                            <button 
                              onClick={() => handleRemoveVoiceFile(index)}
                              className="remove-voice-btn"
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleUploadVoiceFile(index)}
                          className="upload-voice-btn"
                        >
                          📁 上传音色文件
                        </button>
                      )}
                    </div>
                    <textarea
                      value={character.voiceDescription || ''}
                      onChange={(e) => handleCharacterChange(index, 'voiceDescription', e.target.value)}
                      placeholder="音色描述（如：温柔甜美、低沉磁性、清脆活泼等）"
                      rows={2}
                      className="voice-description"
                    />
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
                        src={safeImageUrl(characterImages[index] || createPlaceholderSVG())}
                        alt={`${character.name} 主图`}
                        width={120}
                        height={160}
                        className="character-image"
                        onClick={() => handlePreviewImage(characterImages[index] || createPlaceholderSVG())}
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
                  
                  {/* 角色图片尺寸配置 */}
                  <ImageDimensionSelector
                    aspectRatio={characterImageDimensions[index]?.aspectRatio || getDefaultImageConfig(currentProject).aspectRatio}
                    quality={characterImageDimensions[index]?.quality || getDefaultImageConfig(currentProject).quality}
                    buttonText="角色图片尺寸设置"
                    currentProject={currentProject}
                    onAspectRatioChange={(aspectRatio) => {
                      const availableQualities = Object.keys(QUALITY_OPTIONS[aspectRatio] || {});
                      const defaultQuality = availableQualities[0] || getDefaultImageConfig(currentProject).quality;
                      setCharacterImageDimensions(prev => ({
                        ...prev,
                        [index]: {
                          aspectRatio,
                          quality: defaultQuality
                        }
                      }));
                    }}
                    onQualityChange={(quality) => {
                      const currentAspectRatio = characterImageDimensions[index]?.aspectRatio || getDefaultImageConfig(currentProject).aspectRatio;
                      setCharacterImageDimensions(prev => ({
                        ...prev,
                        [index]: {
                          aspectRatio: currentAspectRatio,
                          quality
                        }
                      }));
                    }}
                  />
                  
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
                  
                  {/* 使用通用的MultiImageSelector组件替换临时图片选择器 */}
                  {character.tempImages && character.tempImages.length > 1 && (
                    <div className="character-temp-images">
                      <MultiImageSelector
                        images={character.tempImages}
                        multiSelect={true}
                        showAddButtons={true}
                        mode="inline"
                        onImageSelect={(selectedImageUrl: string) => {
                          handleCharacterImageSelect(index, selectedImageUrl);
                        }}
                        onMultiSelect={(selectedImageUrls: string[]) => {
                          if (selectedImageUrls.length > 0) {
                            handleCharacterImageSelect(index, selectedImageUrls[0]);
                          }
                        }}
                        onAddToSubject={async (selectedImageUrls: string[]) => {
                          try {
                            const character = characters[index];
                            const characterSubject = characterSubjects.find(subject => 
                              subject.name === character.name || subject.description.includes(character.name)
                            );
                            
                            if (!characterSubject) {
                              showToast(`未找到角色"${character.name}"对应的主体，请先创建角色主体`);
                              return;
                            }
                            
                            const updatedCharacterSubjects = characterSubjects.map(subject => {
                              if (subject.id === characterSubject.id) {
                                return {
                                  ...subject,
                                  subjectImages: [...(subject.subjectImages || []), ...selectedImageUrls]
                                };
                              }
                              return subject;
                            });
                            
                            setCharacterSubjects(updatedCharacterSubjects);
                            debouncedSaveSubjects(updatedCharacterSubjects, undefined);
                            
                            showToast(`成功添加${selectedImageUrls.length}张图片到"${character.name}"的主体图`);
                          } catch (error) {
                            console.error('Error adding images to subject:', error);
                            showToast(`添加到主体图失败: ${(error as Error).message}`);
                          }
                        }}
                        onAddToReference={async (selectedImageUrls: string[]) => {
                          try {
                            const character = characters[index];
                            const characterSubject = characterSubjects.find(subject => 
                              subject.name === character.name || subject.description.includes(character.name)
                            );
                            
                            if (!characterSubject) {
                              showToast(`未找到角色"${character.name}"对应的主体，请先创建角色主体`);
                              return;
                            }
                            
                            const updatedCharacterSubjects = characterSubjects.map(subject => {
                              if (subject.id === characterSubject.id) {
                                return {
                                  ...subject,
                                  referenceImages: [...(subject.referenceImages || []), ...selectedImageUrls]
                                };
                              }
                              return subject;
                            });
                            
                            setCharacterSubjects(updatedCharacterSubjects);
                            debouncedSaveSubjects(updatedCharacterSubjects, undefined);
                            
                            showToast(`成功添加${selectedImageUrls.length}张图片到"${character.name}"的参考图`);
                          } catch (error) {
                            console.error('Error adding images to reference:', error);
                            showToast(`添加到参考图失败: ${(error as Error).message}`);
                          }
                        }}
                      />
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
              currentProject={currentProject}
              characterDialogue={characterDialogues[index] || ''}
              soundEffect={soundEffects[index] || ''}
              onGenerateSoundEffect={handleGenerateSoundEffect}
              isGeneratingSoundEffect={isGeneratingSoundEffect}
              onSceneSubjectChange={handleSceneSubjectChangeFromCard}
              onCreateSceneSubject={handleCreateSceneSubjectFromCard}
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
            
            <div style={{ marginBottom: '30px' }}>
              <h4 style={{ marginBottom: '15px' }}>选择现有项目</h4>
              {projects.length > 0 ? (
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
              ) : (
                <div style={{ 
                  padding: '15px', 
                  border: '1px dashed #ccc', 
                  borderRadius: '6px', 
                  textAlign: 'center',
                  color: '#666',
                  backgroundColor: '#f8f9fa'
                }}>
                  <p>📂 暂无现有项目</p>
                  <p style={{ fontSize: '12px', margin: '5px 0 0 0' }}>
                    项目数组长度: {projects.length}
                  </p>
                </div>
              )}
              <hr style={{ margin: '20px 0' }} />
            </div>

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



      {/* 多图片预览组件 */}
      <MultiImagePreview
        isOpen={multiImagePreview.isOpen}
        images={multiImagePreview.images}
        title={multiImagePreview.title}
        onSelect={multiImagePreview.onSelect}
        onMultiSelect={multiImagePreview.onMultiSelect}
        onAddToSubject={handleAddToSubjectImage}
        onAddToReference={handleAddToReferenceImage}
        onClose={() => setMultiImagePreview(prev => ({ ...prev, isOpen: false }))}
        selectedIndex={multiImagePreview.selectedIndex}
        multiSelect={multiImagePreview.multiSelect}
        showAddButtons={multiImagePreview.showAddButtons}
      />

      {/* 主体管理库组件 */}
      <SubjectManager
        isOpen={showSubjectManager}
        onClose={() => setShowSubjectManager(false)}
        onLoraSelected={handleLoraSelected}
        characterPrompt={currentCharacterPrompt}
        scenePrompt={currentScenePrompt}
      />

      <ToastContainer />
    </div>
  );
}