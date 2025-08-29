import React, { useState } from 'react';
import Image from 'next/image';
import { safeImageUrl } from '../utils/helpers';

interface MultiImageSelectorProps {
  images: string[];
  selectedImage?: string;
  onImageSelect?: (imageUrl: string) => void;
  onMultiSelect?: (imageUrls: string[]) => void;
  onAddToSubject?: (imageUrls: string[]) => void;
  onAddToReference?: (imageUrls: string[]) => void;
  onRegenerate?: () => void;
  isGenerating?: boolean;
  title?: string;
  multiSelect?: boolean;
  showAddButtons?: boolean;
  mode?: 'inline' | 'modal';
  isOpen?: boolean;
  onClose?: () => void;
}

type ViewMode = 'grid' | 'large';

export const MultiImageSelector: React.FC<MultiImageSelectorProps> = ({
  images,
  selectedImage = '',
  onImageSelect,
  onMultiSelect,
  onAddToSubject,
  onAddToReference,
  onRegenerate,
  isGenerating = false,
  title = "选择图片",
  multiSelect = false,
  showAddButtons = false,
  mode = 'inline',
  isOpen = true,
  onClose
}) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  const handleImageClick = (imageUrl: string) => {
    if (multiSelect) {
      setSelectedImages(prev => 
        prev.includes(imageUrl) 
          ? prev.filter(url => url !== imageUrl)
          : [...prev, imageUrl]
      );
    } else {
      if (selectedImage === imageUrl) {
        // 如果点击的是已选择的图片，则预览
        setEnlargedImage(imageUrl);
      } else {
        // 否则选择该图片
        onImageSelect?.(imageUrl);
      }
    }
  };

  const handleConfirmSelection = () => {
    if (multiSelect && onMultiSelect) {
      onMultiSelect(selectedImages);
    }
    if (mode === 'modal' && onClose) {
      onClose();
    }
  };

  const closePreview = () => {
    setPreviewImage(null);
  };

  const closeEnlargedImage = () => {
    setEnlargedImage(null);
  };

  // 如果是模态框模式且未打开，则不渲染
  if (mode === 'modal' && !isOpen) return null;

  if (images.length === 0) {
    return null;
  }

  const content = (
    <>
      <div className="selector-header">
        <h3>{title}</h3>
        <div className="view-controls">
          <button 
            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            网格视图
          </button>
          <button 
            className={`view-btn ${viewMode === 'large' ? 'active' : ''}`}
            onClick={() => setViewMode('large')}
          >
            大图视图
          </button>
        </div>
        {onRegenerate && (
          <button 
            className="regenerate-btn"
            onClick={onRegenerate}
            disabled={isGenerating}
          >
            {isGenerating ? '生成中...' : '重新生成'}
          </button>
        )}
        {mode === 'modal' && onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ×
          </button>
        )}
      </div>

      <div className={`images-grid ${viewMode === 'large' ? 'large-view' : ''}`}>
        {images.map((imageUrl, index) => {
          const isSelected = multiSelect 
            ? selectedImages.includes(imageUrl)
            : selectedImage === imageUrl;
          
          return (
            <div 
              key={index} 
              className={`image-item ${isSelected ? 'selected' : ''} ${viewMode === 'large' ? 'large-item' : ''}`}
              onClick={() => handleImageClick(imageUrl)}
              onDoubleClick={() => setEnlargedImage(imageUrl)}
            >
              <div className="aspect-square relative">
                <Image
                  src={safeImageUrl(imageUrl)}
                  alt={`选项 ${index + 1}`}
                  fill
                  className="object-cover generated-image"
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              </div>
              
              {/* 勾选框（仅在多选模式下显示） */}
              {multiSelect && (
                <div className="absolute top-2 left-2">
                  <input
                    type="checkbox"
                    checked={selectedImages.includes(imageUrl)}
                    onChange={(e) => {
                      e.stopPropagation();
                      if (e.target.checked) {
                        setSelectedImages(prev => [...prev, imageUrl]);
                      } else {
                        setSelectedImages(prev => prev.filter(img => img !== imageUrl));
                      }
                    }}
                    className="w-5 h-5 text-blue-600 bg-white border-2 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                </div>
              )}
              
              {/* 选择指示器（单选模式） */}
              {!multiSelect && isSelected && (
                <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                  ✓
                </div>
              )}
              
              {/* 图片编号 */}
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                {index + 1}
              </div>
            </div>
          );
        })}
      </div>

      {/* 操作按钮区域 */}
      {(multiSelect || showAddButtons) && (
            <div className="mt-6 flex justify-between items-center">
              {/* 左侧：添加到主体图和参考图的按钮 */}
              {showAddButtons && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      const toSend = multiSelect ? selectedImages : (selectedImage ? [selectedImage] : []);
                      if (toSend.length > 0 && onAddToSubject) {
                        onAddToSubject(toSend);
                        if (multiSelect) setSelectedImages([]); // 清空选择（仅多选时）
                      }
                    }}
                    disabled={multiSelect ? selectedImages.length === 0 : !selectedImage}
                    className="px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    添加到主体图 ({multiSelect ? selectedImages.length : (selectedImage ? 1 : 0)})
                  </button>
                  <button
                    onClick={() => {
                      const toSend = multiSelect ? selectedImages : (selectedImage ? [selectedImage] : []);
                      if (toSend.length > 0 && onAddToReference) {
                        onAddToReference(toSend);
                        if (multiSelect) setSelectedImages([]); // 清空选择（仅多选时）
                      }
                    }}
                    disabled={multiSelect ? selectedImages.length === 0 : !selectedImage}
                    className="px-3 py-2 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    添加到参考图 ({multiSelect ? selectedImages.length : (selectedImage ? 1 : 0)})
                  </button>
                </div>
              )}
              
              {/* 右侧：主要操作按钮 */}
              <div className="flex space-x-3">
                {mode === 'modal' && (
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    取消
                  </button>
                )}
                {multiSelect && (
                  <button
                    onClick={handleConfirmSelection}
                    disabled={selectedImages.length === 0}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    确认选择 ({selectedImages.length})
                  </button>
                )}
              </div>
            </div>
          )}

      <div className="selector-info">
        <p>
          <strong>已生成 {images.length} 张图片</strong>
          {!multiSelect && selectedImage && (
            <span className="selected-info">
              ，已选择第 {images.indexOf(selectedImage) + 1} 张作为主体图
            </span>
          )}
          {multiSelect && selectedImages.length > 0 && (
            <span className="selected-info">
              ，已选择 {selectedImages.length} 张图片
            </span>
          )}
        </p>
        <p className="usage-hint">
          💡 {multiSelect 
            ? '点击图片进行多选，再次点击取消选择'
            : '点击图片选择作为主体图，点击已选择的图片可以预览'
          }
        </p>
      </div>

      {/* 放大预览模态框 */}
      {enlargedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60"
          onClick={closeEnlargedImage}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <button
              onClick={closeEnlargedImage}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-75 z-10"
            >
              ×
            </button>
            <Image
              src={safeImageUrl(enlargedImage)}
              alt="放大预览"
              width={800}
              height={600}
              className="object-contain max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
      
      {/* 使用提示 */}
      <div className="mt-4 text-sm text-gray-500 text-center">
        {multiSelect 
          ? '点击图片进行多选，双击放大预览'
          : '点击图片选择，双击放大预览'
        }
      </div>
    </>
  );

  // 根据模式返回不同的包装
  if (mode === 'modal') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-auto">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="multi-image-selector">
      {content}
    </div>
  );
};