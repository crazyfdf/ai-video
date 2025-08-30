import React, { useState, useCallback, useRef } from 'react';
import { Subject } from '../types';
import { APIService } from '../services/api';
import { buildImageUrl, generateSubjectTag } from '../utils/helpers';
import { showToast } from '../app/toast';

export const useSubjects = (currentProject?: any) => {
  const [characterSubjects, setCharacterSubjects] = useState<Subject[]>([]);
  const [sceneSubjects, setSceneSubjects] = useState<Subject[]>([]);
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);
  const [subjectCreationMode, setSubjectCreationMode] = useState<'character' | 'scene' | null>(null);
  
  // 防抖定时器引用
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 当项目变化时重新加载主体数据
  React.useEffect(() => {
    if (currentProject?.name) {
      loadSubjects(currentProject.name);
    }
  }, [currentProject?.name]);

  // 加载主体数据
  const loadSubjects = useCallback(async (projectName?: string) => {
    try {
      // 优先使用传入的项目名称，其次使用当前项目名称，最后使用全局项目名称或默认值
      const nameToUse = projectName || currentProject?.name || (window as any).currentProjectName || '猛鬼世界';
      console.log('Loading subjects for project:', nameToUse);
      console.log('Current project:', currentProject);
      console.log('Global project name:', (window as any).currentProjectName);
      
      const data = await APIService.loadSubjects(nameToUse);
      setCharacterSubjects(data.characterSubjects || []);
      setSceneSubjects(data.sceneSubjects || []);
      
      console.log('Subjects loaded successfully:', {
        characterSubjects: data.characterSubjects?.length || 0,
        sceneSubjects: data.sceneSubjects?.length || 0,
        projectName: nameToUse
      });
      
      // 同时加载保存的图片数据
      const savedImages = await APIService.loadSavedImages();
      const subjectImages = await APIService.loadSubjectImages();
      console.log('Loaded saved images:', savedImages.length);
      console.log('Loaded subject images:', subjectImages.length);
      
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  }, [currentProject]);

  // 保存主体数据
  const saveSubjects = useCallback(async () => {
    try {
      await APIService.saveSubjects({
        characterSubjects,
        sceneSubjects
      });
      console.log('Subjects saved successfully');
    } catch (error) {
      console.error('Error saving subjects:', error);
    }
  }, [characterSubjects, sceneSubjects]);

  // 防抖保存函数
  const debouncedSaveSubjects = useCallback((newCharacterSubjects?: Subject[], newSceneSubjects?: Subject[]) => {
    // 清除之前的定时器
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // 设置新的定时器，800ms后执行保存
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await APIService.saveSubjects({
          characterSubjects: newCharacterSubjects || characterSubjects,
          sceneSubjects: newSceneSubjects || sceneSubjects
        });
        console.log('Subjects saved successfully');
      } catch (error) {
        console.error('Error saving subjects:', error);
      }
    }, 800);
  }, [characterSubjects, sceneSubjects]);

  // 清理定时器
  React.useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // 创建角色主体
  const createCharacterSubject = useCallback(async (name: string, description: string, images: string[], lora?: string) => {
    const newSubject: Subject = {
      id: Date.now(),
      name,
      description,
      tag: generateSubjectTag(description, name),
      images,
      createdAt: new Date().toISOString(),
      selectedLora: lora
    };
    
    const newCharacterSubjects = [...characterSubjects, newSubject];
    setCharacterSubjects(newCharacterSubjects);
    
    // 保存更新后的数据
    try {
      await APIService.saveSubjects({
        characterSubjects: newCharacterSubjects,
        sceneSubjects
      });
      console.log('Character subject created and saved successfully');
      
      // 保存主体图片
      for (const imageUrl of images) {
        // 判断是否为上传图片（通过临时存储标识）
        const isUploadedImage = (window as any).tempSubjectImages && (window as any).tempSubjectImages.includes(imageUrl);
        await APIService.saveSubjectImage(newSubject.name, imageUrl, 'character', isUploadedImage);
      }
    } catch (error) {
      console.error('Error saving character subject:', error);
    }
    
    return newSubject;
  }, [characterSubjects, sceneSubjects]);

  // 创建场景主体
  const createSceneSubject = useCallback(async (name: string, description: string, images: string[], lora?: string) => {
    const newSubject: Subject = {
      id: Date.now(),
      name,
      description,
      tag: generateSubjectTag(description, name),
      images,
      createdAt: new Date().toISOString(),
      selectedLora: lora
    };
    
    const newSceneSubjects = [...sceneSubjects, newSubject];
    setSceneSubjects(newSceneSubjects);
    
    // 保存更新后的数据
    try {
      await APIService.saveSubjects({
        characterSubjects,
        sceneSubjects: newSceneSubjects
      });
      console.log('Scene subject created and saved successfully');
      
      // 保存主体图片
      for (const imageUrl of images) {
        // 判断是否为上传图片（通过临时存储标识）
        const isUploadedImage = (window as any).tempSubjectImages && (window as any).tempSubjectImages.includes(imageUrl);
        await APIService.saveSubjectImage(newSubject.name, imageUrl, 'scene', isUploadedImage);
      }
    } catch (error) {
      console.error('Error saving scene subject:', error);
    }
    
    return newSubject;
  }, [characterSubjects, sceneSubjects]);

  // 创建新场景主体
  const createNewSceneSubject = useCallback(() => {
    setSubjectCreationMode('scene');
    setIsCreatingSubject(true);
  }, []);

  // 创建新角色主体
  const createNewCharacterSubject = useCallback(() => {
    setSubjectCreationMode('character');
    setIsCreatingSubject(true);
  }, []);

  // 上传主体图片
  const uploadSubjectImage = useCallback(async (subjectType: 'character' | 'scene', subjectIndex?: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;
      
      const uploadedImages: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
          const result = await APIService.uploadSubjectImage(file, subjectType);
          uploadedImages.push(buildImageUrl(result.image_url));
        } catch (error) {
          console.error('Error uploading image:', error);
          showToast(`图片上传失败: ${file.name}`);
        }
      }
      
      if (uploadedImages.length > 0) {
        if (subjectType === 'character' && subjectIndex !== undefined) {
          // 更新角色主体图片
          const newCharacterSubjects = [...characterSubjects];
          if (newCharacterSubjects[subjectIndex]) {
            newCharacterSubjects[subjectIndex].images = [...newCharacterSubjects[subjectIndex].images, ...uploadedImages];
            setCharacterSubjects(newCharacterSubjects);
            await saveSubjects();
          }
        } else if (subjectType === 'scene' && subjectIndex !== undefined) {
          // 更新场景主体图片
          const newSceneSubjects = [...sceneSubjects];
          if (newSceneSubjects[subjectIndex]) {
            newSceneSubjects[subjectIndex].images = [...newSceneSubjects[subjectIndex].images, ...uploadedImages];
            setSceneSubjects(newSceneSubjects);
            await saveSubjects();
          }
        }
        showToast(`成功上传${uploadedImages.length}张图片`);
      }
    };
    
    input.click();
  }, [characterSubjects, sceneSubjects, saveSubjects]);



  // 更新场景主体
  const updateSceneSubject = useCallback(async (index: number, field: string, value: string) => {
    console.log('更新场景主体:', { index, field, value });
    const newSceneSubjects = [...sceneSubjects];
    if (newSceneSubjects[index]) {
      newSceneSubjects[index] = {
        ...newSceneSubjects[index],
        [field]: value
      };
      
      console.log('更新后的场景主体:', newSceneSubjects[index]);
      
      setSceneSubjects(newSceneSubjects);
      // 传递最新状态给防抖函数
      debouncedSaveSubjects(undefined, newSceneSubjects);
    }
  }, [sceneSubjects, debouncedSaveSubjects]);

  // 更新角色主体
  const updateCharacterSubject = useCallback(async (index: number, field: string, value: string) => {
    const newCharacterSubjects = [...characterSubjects];
    if (newCharacterSubjects[index]) {
      newCharacterSubjects[index] = {
        ...newCharacterSubjects[index],
        [field]: value
      };
      
      setCharacterSubjects(newCharacterSubjects);
      // 传递最新状态给防抖函数
      debouncedSaveSubjects(newCharacterSubjects, undefined);
    }
  }, [characterSubjects, debouncedSaveSubjects]);

  return {
    // 状态
    characterSubjects,
    sceneSubjects,
    isCreatingSubject,
    subjectCreationMode,
    
    // 设置器
    setCharacterSubjects,
    setSceneSubjects,
    setIsCreatingSubject,
    setSubjectCreationMode,
    
    // 方法
    loadSubjects,
    saveSubjects,
    createCharacterSubject,
    createSceneSubject,
    createNewSceneSubject,
    createNewCharacterSubject,
    uploadSubjectImage,
    updateSceneSubject,
    updateCharacterSubject,
  };
};