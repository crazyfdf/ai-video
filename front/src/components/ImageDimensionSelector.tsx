import React, { useState, useEffect } from 'react';
import { getDefaultImageConfig } from '../utils/imageConfig';

interface ImageDimensionSelectorProps {
  aspectRatio: string;
  quality: string;
  onAspectRatioChange: (aspectRatio: string) => void;
  onQualityChange: (quality: string) => void;
  buttonText?: string;
  currentProject?: any;
}

const ImageDimensionSelector: React.FC<ImageDimensionSelectorProps> = ({
  aspectRatio,
  quality,
  onAspectRatioChange,
  onQualityChange,
  buttonText = "尺寸设置",
  currentProject
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // 在组件加载时，使用项目默认配置初始化尺寸
  useEffect(() => {
    const defaultConfig = getDefaultImageConfig(currentProject);
    
    // 只有当当前值与默认值不同时才更新，避免无限循环
    if (aspectRatio !== defaultConfig.aspectRatio) {
      onAspectRatioChange(defaultConfig.aspectRatio);
    }
    if (quality !== defaultConfig.quality) {
      onQualityChange(defaultConfig.quality);
    }
  }, [currentProject, aspectRatio, quality]); // 移除回调函数依赖，添加当前值依赖
  
  const aspectRatios = [
    { value: '1:1', label: '1:1 正方形', description: '头像、社交平台配图' },
    { value: '2:3', label: '2:3 竖屏', description: '社交媒体自拍、手机竖版内容' },
    { value: '3:2', label: '3:2 平衡比例', description: '相机原生拍摄、图文排版' },
    { value: '4:3', label: '4:3 经典方正', description: '文章配图、插画、传统显示器' },
    { value: '16:9', label: '16:9 宽屏主流', description: '桌面壁纸、风景摄影、影视内容' },
    { value: '9:16', label: '9:16 竖屏宽屏', description: '手机壁纸、短视频' },
    { value: '21:9', label: '21:9 超宽屏', description: '电影宽银幕、专业后期' },
  ];

  const qualities = [
    { value: 'standard', label: '标清', resolution: '854×480' },
    { value: 'high', label: '高清', resolution: '1280×720' },
    { value: 'full_hd', label: '全高清', resolution: '1920×1080' },
    { value: '2k', label: '2K', resolution: '2560×1440' },
    { value: '4k', label: '4K', resolution: '3840×2160' },
  ];

  const getUsageText = (ratio: string) => {
    const ratioData = aspectRatios.find(r => r.value === ratio);
    return ratioData ? ratioData.description : '桌面壁纸、风景摄影、影视内容';
  };

  const getCurrentDimensions = () => {
    const qualityData = qualities.find(q => q.value === quality);
    if (qualityData) {
      return qualityData.resolution;
    }
    
    const ratioMap: { [key: string]: string } = {
      '1:1': '1024×1024',
      '2:3': '854×1280',
      '3:2': '1280×854',
      '4:3': '1024×768',
      '16:9': '1280×720',
      '9:16': '720×1280',
      '21:9': '1280×549'
    };
    return ratioMap[aspectRatio] || '1280×720';
  };

  const handleConfirm = () => {
    setIsDialogOpen(false);
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('ImageDimensionSelector button clicked', {
      isDialogOpen,
      aspectRatio,
      quality,
      buttonText,
      currentProject: currentProject?.name || 'no project'
    });
    setIsDialogOpen(true);
  };

  return (
    <>
      <button 
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={handleButtonClick}
        onMouseDown={(e) => console.log('Button mousedown', e)}
        onMouseUp={(e) => console.log('Button mouseup', e)}
        style={{ 
          zIndex: 10, 
          position: 'relative', 
          pointerEvents: 'auto',
          cursor: 'pointer',
          userSelect: 'none'
        }}
        data-testid="image-dimension-selector-button"
      >
        {buttonText}: {aspectRatios.find(r => r.value === aspectRatio)?.label} - {qualities.find(q => q.value === quality)?.label}
      </button>

      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCancel}>
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">生成尺寸设置</h3>
              <button className="text-gray-400 hover:text-gray-600" onClick={handleCancel}>×</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">尺寸比例</h4>
                <div className="grid grid-cols-3 gap-3">
                  {aspectRatios.map((ratio) => (
                    <button
                      key={ratio.value}
                      onClick={() => onAspectRatioChange(ratio.value)}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        aspectRatio === ratio.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">{ratio.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{ratio.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">画质选择</h4>
                <div className="grid grid-cols-5 gap-3">
                  {qualities.map((qual) => (
                    <button
                      key={qual.value}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Quality button clicked:', qual.value);
                        onQualityChange(qual.value);
                      }}
                      className={`p-3 rounded-lg border text-center transition-all cursor-pointer ${
                        quality === qual.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      style={{
                        pointerEvents: 'auto',
                        userSelect: 'none'
                      }}
                    >
                      <div className="font-medium">{qual.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{qual.resolution}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">当前选择</h4>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">比例：</span>
                    <span className="text-blue-600">
                      {aspectRatios.find(r => r.value === aspectRatio)?.label || aspectRatio}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">画质：</span>
                    <span className="text-blue-600">
                      {qualities.find(q => q.value === quality)?.label || quality}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">尺寸：</span>
                    <span className="text-blue-600">{getCurrentDimensions()}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">用途：</span>
                    <span className="text-blue-600">{getUsageText(aspectRatio)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button className="px-4 py-2 text-gray-600 hover:text-gray-800" onClick={handleCancel}>取消</button>
              <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" onClick={handleConfirm}>确定</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ImageDimensionSelector;