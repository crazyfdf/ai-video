import React from 'react';
import Image from 'next/image';
import { Character, Subject } from '../types';
import { APIService } from '../services/api';
import { safeImageUrl, createPlaceholderSVG } from '../utils/helpers';
import { ReactSelectLoraSelector } from './ReactSelectLoraSelector';
import { MultiImageSelector } from './MultiImageSelector';
import { getDefaultImageConfig, getProjectNovelContent } from '../utils/imageConfig';
import ImageDimensionSelector from './ImageDimensionSelector';



interface StorySceneManagementProps {
  sceneSubjects: Subject[];
  characters: Character[];
  onSceneSubjectChange: (index: number, field: string, value: string) => void;
  onCreateNewSceneSubject: () => void;
  onUploadSubjectImage: (type: 'scene', index: number) => void;
  onPreviewImage: (imageUrl: string) => void;
  onGenerateSceneImage?: (index: number) => void;
  onGenerateSceneAudio?: (index: number) => void;
  scenePanelCollapsed?: boolean;
  onToggleScenePanel?: () => void;
  sceneItemsCollapsed?: {[key: number]: boolean};
  onToggleSceneItem?: (index: number) => void;
  loraList?: string[];
  isLoadingLora?: boolean;
  additionalSceneImages?: {[key: number]: string[]};
  onSceneImageSelect?: (sceneIndex: number, selectedImageUrl: string) => void;
  isGeneratingSceneImage?: {[key: number]: boolean};
  currentProject?: any;
}

export const StorySceneManagement: React.FC<StorySceneManagementProps> = ({
  sceneSubjects,
  characters,
  onSceneSubjectChange,
  onCreateNewSceneSubject,
  onUploadSubjectImage,
  onPreviewImage,
  onGenerateSceneImage,
  onGenerateSceneAudio,
  scenePanelCollapsed = false,
  onToggleScenePanel,
  sceneItemsCollapsed = {},
  onToggleSceneItem,
  loraList = [],
  isLoadingLora = false,
  additionalSceneImages = {},
  onSceneImageSelect,
  isGeneratingSceneImage = {},
  currentProject
}) => {
  const defaultConfig = getDefaultImageConfig();
  const [sceneDimensions, setSceneDimensions] = React.useState<{[key: number]: {aspectRatio: string, quality: string}}>({});
  


  // 初始化场景尺寸设置
  React.useEffect(() => {
    const initialDimensions: {[key: number]: {aspectRatio: string, quality: string}} = {};
    sceneSubjects.forEach((_, index) => {
      if (!sceneDimensions[index]) {
        initialDimensions[index] = {
          aspectRatio: defaultConfig.aspectRatio,
          quality: defaultConfig.quality
        };
      }
    });
    if (Object.keys(initialDimensions).length > 0) {
      setSceneDimensions(prev => ({ ...prev, ...initialDimensions }));
    }
  }, [sceneSubjects.length, defaultConfig.aspectRatio, defaultConfig.quality]);



  const handleSceneDimensionChange = (index: number, field: 'aspectRatio' | 'quality', value: string) => {
    setSceneDimensions(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: value
      }
    }));
  };



  return (
    <div className="story-scene-management-panel">
      <div className="panel-header">
        <h2>场景主体管理 ({sceneSubjects.length}个)</h2>
        <button 
          className="collapse-btn"
          onClick={onToggleScenePanel}
        >
          {scenePanelCollapsed ? '展开' : '折叠'}
        </button>
      </div>
      
      {!scenePanelCollapsed && (
        <>
          {/* 场景主体管理 */}
          <div className="scene-subjects-section">
            <div className="scene-subjects-grid">
              <div className="add-scene-subject" onClick={onCreateNewSceneSubject}>
                <span>+</span>
                <div>创建场景主体</div>
              </div>
              {sceneSubjects.map((subject, index) => (
                <div key={subject.id} className="subject-card">
                  <div className="subject-item-header">
                    <div className="subject-basic-info">
                      <h3>@{subject.name}</h3>
                      <span className="subject-summary">
                        {subject.tag.length > 50 ? `${subject.tag.substring(0, 50)}...` : subject.tag}
                      </span>
                      {sceneItemsCollapsed[index] && (
                        <div style={{ fontSize: '11px', marginTop: '4px' }}>
                          <div style={{ color: '#6b7280' }}>
                            使用项目默认尺寸设置
                          </div>
                        </div>
                      )}
                    </div>
                    <button 
                      className="item-collapse-btn"
                      onClick={() => onToggleSceneItem?.(index)}
                    >
                      {sceneItemsCollapsed[index] ? '展开' : '折叠'}
                    </button>
                  </div>
                  
                  {!sceneItemsCollapsed[index] && (
                    <>
                      <div className="subject-images">
                        <div className="main-image">
                          <Image
                            src={safeImageUrl(subject.images[0] || createPlaceholderSVG())}
                            alt={`${subject.name} 主图`}
                            width={120}
                            height={160}
                            className="subject-main-image"
                            onClick={() => onPreviewImage(subject.images[0] || createPlaceholderSVG())}
                            style={{ cursor: 'pointer' }}
                          />
                          <div className="image-label">主要参考</div>
                        </div>
                      </div>
                      <div className="subject-info">
                        <input
                          type="text"
                          value={subject.name}
                          onChange={(e) => onSceneSubjectChange(index, 'name', e.target.value)}
                          className="subject-name-input"
                          placeholder="场景名称"
                        />
                        <div className="scene-prompt-info">
                          <label>AI图像生成提示词（自动生成）:</label>
                          <textarea
                            value={subject.description}
                            onChange={(e) => onSceneSubjectChange(index, 'description', e.target.value)}
                            placeholder="场景环境的英文AI图像生成提示词..."
                            rows={4}
                            className="subject-description scene-prompt-textarea"
                          />
                          <div className="prompt-info">
                            <small>💡 此提示词由"生成故事梗概和角色信息"自动生成，专注于环境描述</small>
                          </div>
                        </div>

                        {/* React Select LoRA选择器 */}
                        <ReactSelectLoraSelector
                          loraList={loraList}
                          selectedLora={subject.selectedLora || ''}
                          onLoraChange={(lora) => onSceneSubjectChange(index, 'selectedLora', lora)}
                          isLoading={isLoadingLora}
                          placeholder="搜索或选择LoRA模型..."
                          className="scene-subject-lora-selector"
                        />

                        {/* 尺寸设置 */}
                        <ImageDimensionSelector
                          aspectRatio={sceneDimensions[index]?.aspectRatio || defaultConfig.aspectRatio}
                          quality={sceneDimensions[index]?.quality || defaultConfig.quality}
                          onAspectRatioChange={(value) => handleSceneDimensionChange(index, 'aspectRatio', value)}
                          onQualityChange={(value) => handleSceneDimensionChange(index, 'quality', value)}
                          buttonText="场景尺寸设置"
                          currentProject={currentProject}
                        />
                      </div>
                      <div className="subject-actions">
                        <button 
                          onClick={() => onGenerateSceneImage?.(index)} 
                          className="generate-btn"
                          disabled={!onGenerateSceneImage || isGeneratingSceneImage[index]}
                        >
                          {isGeneratingSceneImage[index] ? '🔄 生成中...' : '生成图片'}
                        </button>
                        <button onClick={() => onUploadSubjectImage('scene', index)} className="upload-btn">
                          上传图片
                        </button>
                        {onGenerateSceneAudio && (
                          <button 
                            onClick={() => onGenerateSceneAudio(index)} 
                            className="generate-audio-btn"
                            style={{
                              backgroundColor: '#fd7e14',
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              marginLeft: '8px'
                            }}
                          >
                            🔊 音效设计
                          </button>
                        )}
                      </div>

                      {/* 多图片选择器 */}
                      {additionalSceneImages[index] && additionalSceneImages[index].length > 0 && (
                        <div className="scene-multi-image-selector" style={{ marginTop: '16px' }}>
                          <MultiImageSelector
                            images={additionalSceneImages[index]}
                            selectedImage={subject.images[0] || ''}
                            onImageSelect={(selectedUrl) => onSceneImageSelect?.(index, selectedUrl)}
                            onRegenerate={() => onGenerateSceneImage?.(index)}
                            isGenerating={isGeneratingSceneImage[index] || false}
                            title={`选择"${subject.name}"的场景图片`}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};