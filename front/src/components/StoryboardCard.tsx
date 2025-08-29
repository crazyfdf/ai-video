import React, { useState } from 'react';
import Image from 'next/image';
import { Character, StoryboardElement } from '../types';
import { safeImageUrl, createPlaceholderSVG } from '../utils/helpers';
import { ReactSelectLoraSelector } from './ReactSelectLoraSelector';
import ImageDimensionSelector from './ImageDimensionSelector';
import { getDimensionsByConfig, getDefaultImageConfig } from '../utils/imageConfig';

interface StoryboardCardProps {
  index: number;
  fragment: string;
  storyboard: string;
  sceneDescription: string;
  image: string;
  videoPrompt: string;
  video: string;
  characters: Character[];
  characterImages: string[];
  requiredElements?: StoryboardElement;
  sceneImages: string[];
  isGeneratingVideo: boolean;
  onStoryboardChange: (index: number, value: string) => void;
  onSceneDescriptionChange: (index: number, value: string) => void;
  onVideoPromptChange: (index: number, value: string) => void;
  onMergeFragments: (index: number, direction: 'up' | 'down') => void;
  onGenerateImage: (index: number, width?: number, height?: number) => void;
  onGenerateVideo: (index: number, width?: number, height?: number) => void;
  onGenerateVideoPrompt: (index: number) => void;
  onUploadImage: (index: number) => void;
  onUploadVideo: (index: number) => void;
  onPreviewImage: (imageUrl: string) => void;
  onPreviewVideo: (videoUrl: string) => void;
  totalFragments: number;
  // LoRA相关属性
  loraList?: string[];
  isLoadingLora?: boolean;
  selectedLora?: string;
  onLoraChange?: (index: number, lora: string) => void;
  // 其他可选处理函数
  onFragmentChange?: (index: number, value: string) => void;
  onGenerateDescription?: (index: number) => void;
  // 新增：智能生成图片功能
  onGenerateImageWithElements?: (index: number, width?: number, height?: number) => void;
  characterSubjects?: any[];
  sceneSubjects?: any[];
  isSmartGenerating?: boolean;
  // 新增：台词生成功能
  onGenerateDialogue?: (index: number) => void;
  sceneDialogue?: string;
  onSceneDialogueChange?: (index: number, dialogue: string) => void;
  characterDialogue?: string;
  soundEffect?: string;
  onGenerateSoundEffect?: (index: number) => void;
  isGeneratingSoundEffect?: boolean;
  // 新增：场景主体管理功能
  onCreateSceneSubject?: (sceneIndex: number, subjectName: string, scenePrompt?: string) => void;
  onSceneSubjectChange?: (sceneIndex: number, subjectIndex: number, field: string, value: string) => void;
  currentProject?: any;
}

export const StoryboardCard: React.FC<StoryboardCardProps> = ({
  index,
  fragment,
  storyboard,
  sceneDescription,
  image,
  videoPrompt,
  video,
  characters,
  characterImages,
  requiredElements,
  sceneImages,
  isGeneratingVideo,
  onStoryboardChange,
  onSceneDescriptionChange,
  onVideoPromptChange,
  onMergeFragments,
  onGenerateImage,
  onGenerateVideo,
  onGenerateVideoPrompt,
  onUploadImage,
  onUploadVideo,
  onPreviewImage,
  onPreviewVideo,
  totalFragments,
  loraList = [],
  isLoadingLora = false,
  selectedLora = '',
  onLoraChange,
  onFragmentChange,
  onGenerateDescription,
  onGenerateImageWithElements,
  characterSubjects = [],
  sceneSubjects = [],
  isSmartGenerating = false,
  onGenerateDialogue,
  sceneDialogue = '',
  onSceneDialogueChange,
  characterDialogue = '',
  soundEffect = '',
  onGenerateSoundEffect,
  isGeneratingSoundEffect = false,
  onCreateSceneSubject,
  onSceneSubjectChange,
  currentProject
}) => {
  // 使用项目默认配置
  const defaultConfig = getDefaultImageConfig();
  
  // 尺寸设置状态
  const [aspectRatio, setAspectRatio] = useState(defaultConfig.aspectRatio);
  const [quality, setQuality] = useState(defaultConfig.quality);

  // 处理图片生成
  const handleGenerateImage = () => {
    const { width, height } = getDimensionsByConfig(aspectRatio, quality);

    // 统一走带元素的生成流程；若父级未提供，则回退普通生成
    if (onGenerateImageWithElements) {
      onGenerateImageWithElements(index, width, height);
    } else {
      onGenerateImage(index, width, height);
    }
  };

  // 处理智能图片生成
  const handleGenerateImageWithElements = () => {
    const { width, height } = getDimensionsByConfig(aspectRatio, quality);
    onGenerateImageWithElements?.(index, width, height);
  };

  // 处理视频生成
  const handleGenerateVideo = () => {
    const { width, height } = getDimensionsByConfig(aspectRatio, quality);
    onGenerateVideo(index, width, height);
  };

  return (
    <div className="card">
      {/* 小说片段与分镜脚本 */}
      <div className="content-storyboard-section">
        <h3>小说片段与分镜脚本 {index + 1}</h3>
        <div className="fragment-container">
          <h4>小说片段:</h4>
          <textarea value={fragment} readOnly rows={3} className="fragment-text" />
        </div>
        <div className="storyboard-container">
          <h4>分镜脚本:</h4>
          <textarea
            value={storyboard}
            onChange={(e) => onStoryboardChange(index, e.target.value)}
            placeholder="专业电影分镜脚本将显示在这里..."
            rows={4}
            className="storyboard-text"
          />
        </div>
        <div className="button-group">
          {index !== 0 && (
            <button className="merge-button" onClick={() => onMergeFragments(index, 'up')}>
              Merge Up
            </button>
          )}
          {index !== totalFragments - 1 && (
            <button className="merge-button" onClick={() => onMergeFragments(index, 'down')}>
              Merge Down
            </button>
          )}
        </div>
      </div>
      
      {/* 所需元素 */}
      <div className="elements-section">
        <h3>所需元素 {index + 1}</h3>
        <div className="elements-content">
          <div className="required-elements">
            <h4>所需元素:</h4>
            <div className="elements-grid">
              {requiredElements?.character_subjects?.map((characterName: string, charIndex: number) => {
                const cleanName = characterName.replace('@', '');
                const characterIndex = characters.findIndex(char => char.name === cleanName);
                const characterImage = characterIndex >= 0 ? characterImages[characterIndex] : null;
                return (
                  <div key={charIndex} className="required-element-item">
                    <div className="element-tag">{characterName}</div>
                    {characterImage && (
                      <Image
                        src={safeImageUrl(characterImage)}
                        alt={cleanName}
                        width={80}
                        height={100}
                        className="required-element-image"
                        onClick={() => onPreviewImage(characterImage)}
                        style={{ cursor: 'pointer' }}
                      />
                    )}
                  </div>
                );
              }) || <div className="no-elements">未分析出元素</div>}
            </div>
          </div>
          
          {/* 场景信息 */}
          <div className="required-scene">
            <h4>场景:</h4>
            <div className="scene-prompt-container">
              <textarea
                value={requiredElements?.scene_prompt || ''}
                placeholder="场景提示词（不含人物）..."
                rows={3}
                className="scene-prompt-text"
                readOnly
              />
            </div>
            <div className="scene-image-container">
              {sceneImages[index] ? (
                <Image
                  src={safeImageUrl(sceneImages[index])}
                  alt={`Scene ${index + 1}`}
                  width={120}
                  height={120}
                  className="required-scene-image"
                  onClick={() => onPreviewImage(sceneImages[index])}
                  style={{ cursor: 'pointer' }}
                />
              ) : (
                <div className="scene-placeholder">
                  <div className="placeholder-text">场景图片</div>
                </div>
              )}
            </div>
          </div>

          {/* 角色台词 */}
          <div className="character-dialogue-section">
            <h4 style={{ margin: 0, marginBottom: '8px' }}>角色台词:</h4>
            <div className="dialogue-container">
              {characterDialogue ? (
                <div className="formatted-dialogue" style={{
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  padding: '12px',
                  backgroundColor: '#f9f9f9',
                  minHeight: '80px',
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}>
                  {characterDialogue.split('\n').map((line, lineIndex) => {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) return <br key={lineIndex} />;
                    
                    // 检查是否包含角色名称（格式：角色名：台词内容）
                    const colonIndex = trimmedLine.indexOf('：');
                    const colonIndex2 = trimmedLine.indexOf(':');
                    const actualColonIndex = colonIndex !== -1 ? colonIndex : colonIndex2;
                    
                    if (actualColonIndex !== -1) {
                      const speakerName = trimmedLine.substring(0, actualColonIndex).trim();
                      const dialogueText = trimmedLine.substring(actualColonIndex + 1).trim();
                      
                      // 检查说话者是否在角色列表中
                      const isKnownCharacter = characters.some(char => char.name === speakerName);
                      
                      return (
                        <div key={lineIndex} style={{ marginBottom: '8px' }}>
                          <span style={{
                            fontWeight: 'bold',
                            color: isKnownCharacter ? '#1976d2' : '#666',
                            backgroundColor: isKnownCharacter ? '#e3f2fd' : '#f0f0f0',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            marginRight: '8px',
                            fontSize: '13px'
                          }}>
                            {speakerName}
                          </span>
                          <span style={{ color: '#333' }}>{dialogueText}</span>
                        </div>
                      );
                    } else {
                      // 没有明确说话者的台词，显示为旁白或描述
                      return (
                        <div key={lineIndex} style={{ 
                          marginBottom: '8px',
                          fontStyle: 'italic',
                          color: '#666',
                          paddingLeft: '12px',
                          borderLeft: '3px solid #ddd'
                        }}>
                          {trimmedLine}
                        </div>
                      );
                    }
                  })}
                </div>
              ) : (
                <div style={{
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  padding: '12px',
                  backgroundColor: '#f9f9f9',
                  minHeight: '80px',
                  color: '#999',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  暂无台词内容...
                </div>
              )}
              
              {/* 配音角色分析信息 */}
              {characterDialogue && requiredElements?.character_subjects && requiredElements.character_subjects.length > 0 && (
                <div className="voice-analysis-section" style={{ marginTop: '12px' }}>
                  <div className="voice-actors-info" style={{ padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px', fontSize: '13px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#495057' }}>🎤 配音角色分析</div>
                    
                    {/* 参与角色列表 */}
                    <div style={{ marginBottom: '10px' }}>
                      <strong style={{ color: '#6c757d' }}>参与角色:</strong>
                      <div style={{ marginTop: '4px' }}>
                        {requiredElements.character_subjects.map((charSubject, idx) => {
                          const charName = charSubject.replace('@', '');
                          const character = characters.find(c => c.name === charName);
                          return (
                            <div key={idx} style={{ 
                              display: 'inline-block', 
                              margin: '2px 6px 2px 0', 
                              padding: '4px 8px', 
                              backgroundColor: '#e3f2fd', 
                              borderRadius: '12px',
                              fontSize: '12px',
                              color: '#1976d2'
                            }}>
                              {charName}
                              {character?.voiceDescription && (
                                <span style={{ marginLeft: '4px', color: '#666' }}>({character.voiceDescription})</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* 配音指导提示 */}
                    <div style={{ fontSize: '12px', color: '#6c757d', fontStyle: 'italic' }}>
                      💡 AI已分析台词中各角色的情感表达和语调要求，请配音演员参考角色设定进行配音
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 生成场景图片按钮 */}
          <div className="generate-scene-image-section">
            <button
              onClick={handleGenerateImage}
              className="generate-scene-image-btn"
              disabled={isSmartGenerating}
            >
              {isSmartGenerating ? '生成中...' : '生成场景图片'}
            </button>
          </div>

          {/* 场景主体管理 */}
          <div className="scene-subjects-section">
            <h4>场景主体管理 ({sceneSubjects.length}个)</h4>
            
            {/* 场景主体列表 */}
            <div className="scene-subjects-list">
              {sceneSubjects.length > 0 ? (
                sceneSubjects.map((subject: any, subjectIndex: number) => (
                  <div key={subjectIndex} className="scene-subject-item">
                    <div className="subject-info">
                      <input
                        type="text"
                        value={subject.name || ''}
                        onChange={(e) => onSceneSubjectChange?.(index, subjectIndex, 'name', e.target.value)}
                        placeholder="场景主体名称"
                        className="subject-name-input"
                      />
                      <textarea
                        value={subject.description || ''}
                        onChange={(e) => onSceneSubjectChange?.(index, subjectIndex, 'description', e.target.value)}
                        placeholder="场景主体描述"
                        rows={2}
                        className="subject-description-input"
                      />
                    </div>
                    {subject.imageUrl && (
                      <div className="subject-image">
                        <Image
                          src={safeImageUrl(subject.imageUrl)}
                          alt={subject.name}
                          width={60}
                          height={60}
                          className="subject-thumbnail"
                          onClick={() => onPreviewImage(subject.imageUrl)}
                          style={{ cursor: 'pointer' }}
                        />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="no-scene-subjects">
                  <p>暂无场景主体</p>
                </div>
              )}
            </div>

            {/* 创建场景主体按钮 */}
            {onCreateSceneSubject && (
              <div className="create-scene-subject">
                <button
                  onClick={() => {
                    // 使用分镜所需元素中的场景提示词作为描述
                    const scenePrompt = requiredElements?.scene_prompt || '';
                    const defaultName = `场景${index + 1}`;
                    onCreateSceneSubject(index, defaultName, scenePrompt);
                  }}
                  className="create-subject-btn"
                  style={{
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    marginTop: '10px'
                  }}
                >
                  + 创建场景主体
                </button>
                {requiredElements?.scene_prompt && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#666', 
                    marginTop: '4px',
                    fontStyle: 'italic'
                  }}>
                    💡 将使用当前场景的提示词: {requiredElements.scene_prompt.substring(0, 50)}...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 生成图片 */}
      <div className="image-section">
        <h3>生成图片 {index + 1}</h3>
        
        <div className="final-prompt-container">
          <h4>画面提示词:</h4>
          <textarea
            value={sceneDescription}
            onChange={(e) => onSceneDescriptionChange(index, e.target.value)}
            placeholder="包含角色外观的完整画面提示词..."
            rows={4}
            className="final-prompt-text"
          />
          
          {/* 生成描述按钮 */}
          {onGenerateDescription && (
            <button 
              onClick={() => onGenerateDescription(index)} 
              className="generate-description-btn"
              style={{ marginTop: '8px', marginBottom: '8px' }}
            >
              生成画面描述
            </button>
          )}

          {/* 场景音效区域 */}
          <div className="sound-effect-section" style={{ marginTop: '16px', marginBottom: '16px' }}>
            <div className="flex justify-between items-center mb-2">
              <h5 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#374151' }}>场景音效</h5>
              {onGenerateSoundEffect && (
                <button 
                  onClick={() => onGenerateSoundEffect(index)}
                  className="generate-sound-effect-btn"
                  style={{ 
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                  disabled={isGeneratingSoundEffect}
                >
                  {isGeneratingSoundEffect ? '生成中...' : '🔊 生成音效'}
                </button>
              )}
            </div>
            <textarea
              value={soundEffect || ''}
              placeholder="专业音效师生成的场景音效提示词将显示在这里..."
              rows={4}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '13px',
                lineHeight: '1.4',
                resize: 'vertical',
                fontFamily: 'inherit',
                backgroundColor: soundEffect ? '#f8f9fa' : 'white'
              }}
              readOnly
            />
            {soundEffect && (
              <div style={{ marginTop: '4px', fontSize: '11px', color: '#6b7280' }}>
                🎵 音效提示词已生成
              </div>
            )}
          </div>

          {/* LoRA选择器已移除 - 使用智能生成功能自动应用LoRA */}
        </div>
        
        <div className="image-container">
          <Image
            src={safeImageUrl(image || createPlaceholderSVG())}
            key={image}
            alt={`Generated image ${index + 1}`}
            width={300}
            height={300}
            className="generated-image"
            onClick={() => onPreviewImage(image || createPlaceholderSVG())}
            style={{ cursor: 'pointer' }}
          />
        </div>
        {/* 图片尺寸设置 */}
        <ImageDimensionSelector
          aspectRatio={aspectRatio}
          quality={quality}
          onAspectRatioChange={setAspectRatio}
          onQualityChange={setQuality}
          buttonText="图片尺寸设置"
          currentProject={currentProject}
        />
        
        <div className="image-buttons">
          <button onClick={handleGenerateImage} className="regenerate-btn">
            生成图片
          </button>
          {/* 智能生成按钮已移除 - 现在使用主体标记(@符号)进行智能生成 */}
          <button onClick={() => onUploadImage(index)} className="upload-btn">
            上传图片
          </button>

        </div>
        
        {/* LoRA信息显示已移除 - 简化界面 */}
      </div>

      {/* 生成视频 */}
      <div className="video-section">
        <h3>生成视频 {index + 1}</h3>
        
        <div className="video-prompt-container">
          <h4>视频提示词:</h4>
          <textarea
            value={videoPrompt}
            onChange={(e) => onVideoPromptChange(index, e.target.value)}
            placeholder="视频生成提示词..."
            rows={4}
            className="video-prompt-text"
          />
          
          {/* 生成视频提示词按钮 */}
          <button 
            onClick={() => onGenerateVideoPrompt(index)} 
            className="generate-video-prompt-btn"
            style={{ marginTop: '8px', marginBottom: '8px' }}
          >
            生成视频提示词
          </button>
        </div>
        
        <div className="video-container">
          {video ? (
            <video
              src={video}
              controls
              width={300}
              height={300}
              className="generated-video"
              onClick={() => onPreviewVideo(video)}
              style={{ cursor: 'pointer' }}
            />
          ) : (
            <div className="video-placeholder" style={{ width: '300px', height: '300px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #d1d5db' }}>
              <span style={{ color: '#6b7280' }}>视频将显示在这里</span>
            </div>
          )}
        </div>
        
        <div className="video-buttons">
          <button 
            onClick={handleGenerateVideo}
            className="generate-video-btn"
            disabled={isGeneratingVideo}
          >
            {isGeneratingVideo ? '生成中...' : '生成视频'}
          </button>
          <button onClick={() => onUploadVideo(index)} className="upload-btn">
            上传视频
          </button>
        </div>
      </div>
    </div>
  );
};