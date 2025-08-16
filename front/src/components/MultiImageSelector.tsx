import React, { useState } from 'react';

interface MultiImageSelectorProps {
  images: string[];
  selectedImage: string;
  onImageSelect: (imageUrl: string) => void;
  onRegenerate: () => void;
  isGenerating: boolean;
  title?: string;
}

export const MultiImageSelector: React.FC<MultiImageSelectorProps> = ({
  images,
  selectedImage,
  onImageSelect,
  onRegenerate,
  isGenerating,
  title = "选择主体图片"
}) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleImageClick = (imageUrl: string) => {
    if (selectedImage === imageUrl) {
      // 如果点击的是已选择的图片，则预览
      setPreviewImage(imageUrl);
    } else {
      // 否则选择该图片
      onImageSelect(imageUrl);
    }
  };

  const closePreview = () => {
    setPreviewImage(null);
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="multi-image-selector">
      <div className="selector-header">
        <h4>{title}</h4>
        <div className="selector-actions">
          <button 
            onClick={onRegenerate}
            disabled={isGenerating}
            className="regenerate-btn"
            type="button"
          >
            {isGenerating ? '🔄 生成中...' : '🔄 重新生成'}
          </button>
        </div>
      </div>

      <div className="images-grid">
        {images.map((imageUrl, index) => (
          <div 
            key={index} 
            className={`image-item ${selectedImage === imageUrl ? 'selected' : ''}`}
            onClick={() => handleImageClick(imageUrl)}
          >
            <img 
              src={imageUrl} 
              alt={`Generated ${index + 1}`}
              className="generated-image"
            />
            <div className="image-overlay">
              {selectedImage === imageUrl ? (
                <div className="selected-indicator">
                  <span className="checkmark">✓</span>
                  <span className="selected-text">已选择</span>
                </div>
              ) : (
                <div className="select-indicator">
                  <span className="select-text">点击选择</span>
                </div>
              )}
            </div>
            <div className="image-number">#{index + 1}</div>
          </div>
        ))}
      </div>

      <div className="selector-info">
        <p>
          <strong>已生成 {images.length} 张图片</strong>
          {selectedImage && (
            <span className="selected-info">
              ，已选择第 {images.indexOf(selectedImage) + 1} 张作为主体图
            </span>
          )}
        </p>
        <p className="usage-hint">
          💡 点击图片选择作为主体图，点击已选择的图片可以预览
        </p>
      </div>

      {/* 图片预览模态框 */}
      {previewImage && (
        <div className="image-preview-modal" onClick={closePreview}>
          <div className="preview-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-preview" onClick={closePreview}>✕</button>
            <img src={previewImage} alt="Preview" className="preview-image" />
            <div className="preview-actions">
              <button 
                onClick={() => {
                  onImageSelect(previewImage);
                  closePreview();
                }}
                className="select-preview-btn"
              >
                选择此图片
              </button>
              <button onClick={closePreview} className="close-preview-btn">
                关闭预览
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};