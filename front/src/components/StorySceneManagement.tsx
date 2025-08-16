import React from 'react';
import Image from 'next/image';
import { Character, Subject } from '../types';
import { APIService } from '../services/api';
import { safeImageUrl } from '../utils/helpers';
import { ReactSelectLoraSelector } from './ReactSelectLoraSelector';

interface StorySceneManagementProps {
  storySummary: string;
  novelScenes: string;
  sceneSubjects: Subject[];
  characters: Character[];
  onStorySummaryChange: (summary: string) => void;
  onNovelScenesChange: (scenes: string) => void;
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
}

export const StorySceneManagement: React.FC<StorySceneManagementProps> = ({
  storySummary,
  novelScenes,
  sceneSubjects,
  characters,
  onStorySummaryChange,
  onNovelScenesChange,
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
  isLoadingLora = false
}) => {
  const handleStorySummaryChange = async (value: string) => {
    onStorySummaryChange(value);
    await APIService.saveCharacterInfo({
      summary: value,
      characters
    });
  };

  return (
    <div className="story-scene-management-panel">
      <div className="panel-header">
        <h2>故事与场景管理</h2>
        <button 
          className="collapse-btn"
          onClick={onToggleScenePanel}
        >
          {scenePanelCollapsed ? '展开' : '折叠'}
        </button>
      </div>
      
      {!scenePanelCollapsed && (
        <>
          {/* 故事梗概 */}
          {storySummary && (
            <div className="story-summary-section">
              <h3>故事梗概</h3>
              <textarea
                value={storySummary}
                onChange={(e) => handleStorySummaryChange(e.target.value)}
                placeholder="故事梗概将显示在这里..."
                rows={4}
                className="summary-text"
              />
            </div>
          )}

          {/* 小说场景 */}
          <div className="novel-scenes-section">
            <h3>小说场景</h3>
            <textarea
              value={novelScenes}
              onChange={(e) => onNovelScenesChange(e.target.value)}
              placeholder="小说场景描述..."
              rows={4}
              className="novel-scenes-text"
            />
          </div>

          {/* 场景主体管理 */}
          <div className="scene-subjects-section">
            <h3>场景主体管理 ({sceneSubjects.length}个)</h3>
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
                            src={safeImageUrl(subject.images[0] || "http://localhost:1198/images/placeholder.png")}
                            alt={`${subject.name} 主图`}
                            width={120}
                            height={160}
                            className="subject-main-image"
                            onClick={() => onPreviewImage(subject.images[0] || "http://localhost:1198/images/placeholder.png")}
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
                      </div>
                      <div className="subject-actions">
                        <button 
                          onClick={() => onGenerateSceneImage?.(index)} 
                          className="generate-btn"
                          disabled={!onGenerateSceneImage}
                        >
                          生成图片
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