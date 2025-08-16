'use client';

import React, { useState, useEffect } from 'react';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: any;
  onUpdateProject: (updates: any) => void;
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

const QUALITY_OPTIONS: { [key: string]: { [key: string]: { name: string; width: number; height: number } } } = {
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

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
  isOpen,
  onClose,
  currentProject,
  onUpdateProject
}) => {
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('16:9');
  const [selectedQuality, setSelectedQuality] = useState('fhd');

  useEffect(() => {
    if (currentProject?.defaultSizeConfig) {
      setSelectedAspectRatio(currentProject.defaultSizeConfig.aspectRatio || '16:9');
      setSelectedQuality(currentProject.defaultSizeConfig.quality || 'fhd');
    }
  }, [currentProject]);

  const handleSave = () => {
    const qualityConfig = QUALITY_OPTIONS[selectedAspectRatio]?.[selectedQuality];
    if (!qualityConfig) return;

    const sizeConfig = {
      aspectRatio: selectedAspectRatio,
      quality: selectedQuality,
      width: qualityConfig.width,
      height: qualityConfig.height
    };

    onUpdateProject({
      defaultSizeConfig: sizeConfig
    });

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
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-3">项目信息</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p><strong>项目名称：</strong>{currentProject?.name}</p>
              <p><strong>项目描述：</strong>{currentProject?.description}</p>
              <p><strong>创建时间：</strong>{currentProject?.createdAt ? new Date(currentProject.createdAt).toLocaleString('zh-CN') : ''}</p>
            </div>
          </div>

          {/* 默认尺寸画质设置 */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-3">默认尺寸画质设置</h3>
            
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
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectSettingsModal;