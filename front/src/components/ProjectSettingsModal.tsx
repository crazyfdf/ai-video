'use client';

import React, { useState, useEffect } from 'react';
import { ASPECT_RATIOS, QUALITY_OPTIONS } from '../utils/imageConfig';
import { APIService } from '../services/api';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: any;
  onUpdateProject: (updates: any) => void;
}



export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
  isOpen,
  onClose,
  currentProject,
  onUpdateProject
}) => {
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('16:9');
  const [selectedQuality, setSelectedQuality] = useState('fhd');
  const [novelContent, setNovelContent] = useState('');

  useEffect(() => {
    const loadProjectSettings = async () => {
      if (!currentProject) {
        // 如果没有当前项目，使用默认值
        setSelectedAspectRatio('16:9');
        setSelectedQuality('fhd');
        setNovelContent('');
        return;
      }
      
      try {
        // 尝试从API加载项目设置
        const settings = await APIService.loadProjectSettings(currentProject.name);
        if (settings) {
          if (settings.defaultSizeConfig) {
            setSelectedAspectRatio(settings.defaultSizeConfig.aspectRatio || '16:9');
            setSelectedQuality(settings.defaultSizeConfig.quality || 'fhd');
          }
          setNovelContent(settings.novelContent || '');
        }
      } catch (error) {
        console.log('No existing project settings found, using defaults');
        // 如果没有找到设置文件，使用当前项目的默认值
        if (currentProject?.defaultSizeConfig) {
          setSelectedAspectRatio(currentProject.defaultSizeConfig.aspectRatio || '16:9');
          setSelectedQuality(currentProject.defaultSizeConfig.quality || 'fhd');
          console.log('ProjectSettingsModal: Loaded existing config:', currentProject.defaultSizeConfig);
        } else {
          // 如果项目没有默认配置，使用系统默认值
          setSelectedAspectRatio('16:9');
          setSelectedQuality('fhd');
          console.log('ProjectSettingsModal: Using default config (16:9, fhd)');
        }
        
        // 加载小说内容
        if (currentProject?.novelContent) {
          setNovelContent(currentProject.novelContent);
        } else {
          setNovelContent('');
        }
      }
    };
    
    loadProjectSettings();
  }, [currentProject]);

  const handleSave = async () => {
    const qualityConfig = QUALITY_OPTIONS[selectedAspectRatio]?.[selectedQuality];
    if (!qualityConfig) {
      console.error('Invalid quality config for:', selectedAspectRatio, selectedQuality);
      return;
    }

    const sizeConfig = {
      aspectRatio: selectedAspectRatio,
      quality: selectedQuality,
      width: qualityConfig.width,
      height: qualityConfig.height
    };

    console.log('ProjectSettingsModal: Saving size config:', sizeConfig);
    console.log('ProjectSettingsModal: Current project:', currentProject);

    if (!currentProject) {
      // 如果没有当前项目，提示用户先创建项目
      alert('请先创建或选择项目后再进行设置。');
      return;
    } else {
      try {
        const projectSettings = {
          projectName: currentProject.name,
          projectId: currentProject.id,
          description: currentProject.description,
          createdAt: currentProject.createdAt,
          defaultSizeConfig: sizeConfig,
          novelContent: novelContent.trim()
        };
        
        // 调用API保存项目设置
        await APIService.saveProjectSettings(projectSettings);
        console.log('Project settings saved successfully');
        
        onUpdateProject({
          defaultSizeConfig: sizeConfig,
          novelContent: novelContent.trim()
        });
      } catch (error) {
        console.error('Error saving project settings:', error);
      }
    }

    onClose();
  };

  if (!isOpen) return null;

  const availableQualities = QUALITY_OPTIONS[selectedAspectRatio] || {};
  const currentQualityConfig = availableQualities[selectedQuality];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">项目设置</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* 项目信息 */}
          {currentProject ? (
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">项目信息</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p><strong>项目名称：</strong>{currentProject.name}</p>
                <p><strong>项目描述：</strong>{currentProject.description}</p>
                <p><strong>创建时间：</strong>{new Date(currentProject.createdAt).toLocaleString('zh-CN')}</p>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">全局设置</h3>
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-yellow-800"><strong>提示：</strong>当前没有选择项目。这些设置将作为全局默认值，在创建新项目时自动应用。</p>
              </div>
            </div>
          )}

          {/* 小说内容设置 */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-3">
              {currentProject ? '项目小说内容' : '全局默认小说内容'}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                小说内容
              </label>
              <textarea
                value={novelContent}
                onChange={(e) => setNovelContent(e.target.value)}
                placeholder="请输入小说内容，这将作为所有生成功能的基础文本..."
                className="w-full h-40 p-3 border border-gray-300 rounded-lg resize-vertical focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-sm text-gray-500 mt-2">
                💡 提示：这里的小说内容将作为角色提取、场景描述、图片生成等所有功能的基础文本。
              </p>
            </div>
          </div>



          {/* 默认尺寸画质设置 */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-3">
              {currentProject ? '项目默认尺寸画质设置' : '全局默认尺寸画质设置'}
            </h3>
            
            {/* 尺寸比例选择 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                尺寸比例
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(ASPECT_RATIOS).map(([ratio, config]) => (
                  <button
                    key={ratio}
                    onClick={() => {
                      setSelectedAspectRatio(ratio);
                      // 重置画质选择为第一个可用选项
                      const firstQuality = Object.keys(QUALITY_OPTIONS[ratio] || {})[0];
                      if (firstQuality) {
                        setSelectedQuality(firstQuality);
                      }
                    }}
                    className={`p-3 text-sm border rounded-lg transition-colors ${
                      selectedAspectRatio === ratio
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-medium">{config.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{config.commonUse}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 画质选择 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                画质选择
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(availableQualities).map(([quality, config]) => (
                  <button
                    key={quality}
                    onClick={() => setSelectedQuality(quality)}
                    className={`p-3 text-sm border rounded-lg transition-colors ${
                      selectedQuality === quality
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-medium">{config.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {config.width}×{config.height}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 当前选择预览 */}
            {currentQualityConfig && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">当前选择</h4>
                <p className="text-blue-700">
                  <strong>比例：</strong>{ASPECT_RATIOS[selectedAspectRatio]?.name} ({selectedAspectRatio})
                </p>
                <p className="text-blue-700">
                  <strong>画质：</strong>{currentQualityConfig.name}
                </p>
                <p className="text-blue-700">
                  <strong>尺寸：</strong>{currentQualityConfig.width} × {currentQualityConfig.height}
                </p>
                <p className="text-blue-600 text-sm mt-2">
                  <strong>用途：</strong>{ASPECT_RATIOS[selectedAspectRatio]?.commonUse}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {currentProject ? '保存项目设置' : '保存全局设置'}
          </button>
        </div>
      </div>
    </div>
  );
};

