import React from 'react';
import Image from 'next/image';
import { Character, StoryboardElement } from '../types';
import { safeImageUrl } from '../utils/helpers';
import { ReactSelectLoraSelector } from './ReactSelectLoraSelector';

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
  onGenerateImage: (index: number) => void;
  onGenerateVideo: (index: number) => void;
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
  onGenerateImageWithElements?: (index: number) => void;
  characterSubjects?: any[];
  sceneSubjects?: any[];
  isSmartGenerating?: boolean;
  // 新增：台词生成功能
  onGenerateDialogue?: (index: number) => void;
  sceneDialogue?: string;
  onSceneDialogueChange?: (index: number, dialogue: string) => void;
  // 新增：场景主体管理功能
  onCreateSceneSubject?: (sceneIndex: number, subjectName: string) => void;
  onSceneSubjectChange?: (sceneIndex: number, subjectIndex: number, field: string, value: string) => void;
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
  onCreateSceneSubject,
  onSceneSubjectChange
}) => {
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
                    const subjectName = prompt('请输入场景主体名称:');
                    if (subjectName && subjectName.trim()) {
                      onCreateSceneSubject(index, subjectName.trim());
                    }
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

          {/* 台词生成区域 */}
          <div className="dialogue-section" style={{ marginTop: '16px', marginBottom: '16px' }}>
            <div className="flex justify-between items-center mb-2">
              <h5 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#374151' }}>场景台词</h5>
              {onGenerateDialogue && (
                <button 
                  onClick={() => onGenerateDialogue(index)} 
                  className="generate-dialogue-btn"
                  style={{ 
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  💬 生成台词
                </button>
              )}
            </div>
            <textarea
              value={sceneDialogue}
              onChange={(e) => onSceneDialogueChange?.(index, e.target.value)}
              placeholder="场景台词将显示在这里，包含角色对话、情感表达等..."
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
                backgroundColor: sceneDialogue ? '#f8f9fa' : 'white'
              }}
            />
            {sceneDialogue && (
              <div style={{ marginTop: '4px', fontSize: '11px', color: '#6b7280' }}>
                💡 台词已生成，可以手动编辑调整
              </div>
            )}
          </div>

          {/* React Select LoRA选择器 */}
          <ReactSelectLoraSelector
            loraList={loraList}
            selectedLora={selectedLora}
            onLoraChange={(lora) => onLoraChange?.(index, lora)}
            isLoading={isLoadingLora}
            placeholder="搜索或选择LoRA模型..."
            className="storyboard-lora-selector"
          />
        </div>
        
        <div className="image-container">
          <Image
            src={safeImageUrl(image || "http://localhost:1198/images/placeholder.png")}
            key={image}
            alt={`Generated image ${index + 1}`}
            width={300}
            height={300}
            className="generated-image"
            onClick={() => onPreviewImage(image || "http://localhost:1198/images/placeholder.png")}
            style={{ cursor: 'pointer' }}
          />
        </div>
        <div className="image-buttons">
          <button onClick={() => onGenerateImage(index)} className="regenerate-btn">
            生成图片
          </button>
          {onGenerateImageWithElements && (
            <button 
              onClick={() => onGenerateImageWithElements(index)} 
              className="smart-generate-btn"
              disabled={isSmartGenerating}
              title="根据分镜元素智能生成（自动应用角色和场景LoRA）"
            >
              {isSmartGenerating ? '🔄 生成中...' : '🎯 智能生成'}
            </button>
          )}
          <button onClick={() => onUploadImage(index)} className="upload-btn">
            上传图片
          </button>

        </div>
        
        {/* 显示将要使用的LoRA信息 */}
        {onGenerateImageWithElements && requiredElements && (
          <div className="lora-preview">
            <h5>将使用的LoRA模型:</h5>
            <div className="lora-list">
              {/* 角色LoRA */}
              {requiredElements.character_subjects?.map((charSubject: string) => {
                const charName = charSubject.replace('@', '');
                const charSubjectData = characterSubjects.find((cs: any) => cs.name === charName);
                if (charSubjectData?.selectedLora) {
                  return (
                    <div key={charSubject} className="lora-item character-lora">
                      <span className="lora-type">角色:</span>
                      <span className="lora-subject">{charName}</span>
                      <span className="lora-name">{charSubjectData.selectedLora.split('\\').pop()?.replace('.safetensors', '')}</span>
                    </div>
                  );
                }
                return null;
              })}
              
              {/* 场景LoRA */}
              {requiredElements.scene_subjects?.map((sceneSubject: string) => {
                const sceneName = sceneSubject.replace('@', '');
                const sceneSubjectData = sceneSubjects.find((ss: any) => ss.name === sceneName);
                if (sceneSubjectData?.selectedLora) {
                  return (
                    <div key={sceneSubject} className="lora-item scene-lora">
                      <span className="lora-type">场景:</span>
                      <span className="lora-subject">{sceneName}</span>
                      <span className="lora-name">{sceneSubjectData.selectedLora.split('\\').pop()?.replace('.safetensors', '')}</span>
                    </div>
                  );
                }
                return null;
              })}
              
              {/* 如果没有LoRA */}
              {!requiredElements.character_subjects?.some((cs: string) => {
                const charName = cs.replace('@', '');
                return characterSubjects.find((char: any) => char.name === charName)?.selectedLora;
              }) && !requiredElements.scene_subjects?.some((ss: string) => {
                const sceneName = ss.replace('@', '');
                return sceneSubjects.find((scene: any) => scene.name === sceneName)?.selectedLora;
              }) && (
                <div className="no-lora">未配置LoRA模型</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 电影视频 */}
      <div className="video-section">
        <h3>电影视频 {index + 1}</h3>
        
        <div className="video-prompt-container">
          <h4>拍摄提示词:</h4>
          <textarea
            value={videoPrompt}
            onChange={(e) => onVideoPromptChange(index, e.target.value)}
            placeholder="专业电影拍摄提示词将显示在这里..."
            rows={4}
            className="video-prompt-text"
          />
          <div className="video-prompt-buttons">
            <button onClick={() => onGenerateVideoPrompt(index)} disabled={isGeneratingVideo}>
              {isGeneratingVideo ? '生成中...' : '生成拍摄提示词'}
            </button>
          </div>
        </div>
        
        <div className="video-container">
          {video ? (
            <video
              src={video}
              width={300}
              height={200}
              controls
              className="generated-video"
              onClick={() => onPreviewVideo(video)}
              style={{ cursor: 'pointer' }}
            />
          ) : (
            <div className="video-placeholder">
              <div className="placeholder-text">电影视频</div>
            </div>
          )}
        </div>
        
        <div className="video-buttons">
          <button 
            onClick={() => onGenerateVideo(index)} 
            className="generate-video-btn"
            disabled={isGeneratingVideo || !videoPrompt}
          >
            {isGeneratingVideo ? '生成中...' : '生成视频'}
          </button>
          <button onClick={() => onUploadVideo(index)} className="upload-video-btn">
            上传视频
          </button>
        </div>
      </div>
    </div>
  );
};