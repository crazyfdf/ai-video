import React, { useState } from 'react';
import Image from 'next/image';
import { safeImageUrl } from '../utils/helpers';

interface MultiImagePreviewProps {
  isOpen: boolean;
  images: string[];
  title: string;
  onSelect?: (imageUrl: string) => void;
  onMultiSelect?: (imageUrls: string[]) => void;
  onAddToSubject?: (imageUrls: string[]) => void;
  onAddToReference?: (imageUrls: string[]) => void;
  onClose: () => void;
  selectedIndex?: number;
  multiSelect?: boolean;
  showAddButtons?: boolean;
}

export const MultiImagePreview: React.FC<MultiImagePreviewProps> = ({
  isOpen,
  images,
  title,
  onSelect,
  onMultiSelect,
  onAddToSubject,
  onAddToReference,
  onClose,
  selectedIndex = -1,
  multiSelect = false,
  showAddButtons = false
}) => {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImageClick = (imageUrl: string) => {
    if (multiSelect) {
      setSelectedImages(prev => 
        prev.includes(imageUrl) 
          ? prev.filter(url => url !== imageUrl)
          : [...prev, imageUrl]
      );
    } else {
      setEnlargedImage(imageUrl);
    }
  };

  const handleConfirmSelection = () => {
    if (multiSelect && onMultiSelect) {
      onMultiSelect(selectedImages);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ×
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((imageUrl, index) => {
            const isSelected = multiSelect 
              ? selectedImages.includes(imageUrl)
              : selectedIndex === index;
            
            return (
              <div
                key={index}
                className={`relative cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${
                  isSelected
                    ? 'border-blue-500 shadow-lg'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
                onClick={() => handleImageClick(imageUrl)}
                onDoubleClick={() => setEnlargedImage(imageUrl)}
              >
              <div className="aspect-square relative">
                <Image
                  src={safeImageUrl(imageUrl)}
                  alt={`选项 ${index + 1}`}
                  fill
                  className="object-cover"
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
        
        <div className="mt-6 flex justify-between items-center">
          {/* 左侧：添加到主体图和参考图的按钮 */}
          {showAddButtons && (
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  if (selectedImages.length > 0 && onAddToSubject) {
                    onAddToSubject(selectedImages);
                    setSelectedImages([]); // 清空选择
                  }
                }}
                disabled={selectedImages.length === 0}
                className="px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                添加到主体图 ({selectedImages.length})
              </button>
              <button
                onClick={() => {
                  if (selectedImages.length > 0 && onAddToReference) {
                    onAddToReference(selectedImages);
                    setSelectedImages([]); // 清空选择
                  }
                }}
                disabled={selectedImages.length === 0}
                className="px-3 py-2 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                添加到参考图 ({selectedImages.length})
              </button>
            </div>
          )}
          
          {/* 右侧：主要操作按钮 */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            >
              取消
            </button>
            {multiSelect ? (
              <button
                onClick={handleConfirmSelection}
                disabled={selectedImages.length === 0}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                确认选择 ({selectedImages.length})
              </button>
            ) : (
              selectedIndex >= 0 && onSelect && (
                <button
                  onClick={() => onSelect(images[selectedIndex])}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  确认选择
                </button>
              )
            )}
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-500 text-center">
          {multiSelect 
            ? '点击图片进行多选，再次点击取消选择'
            : '点击图片放大预览，或点击确认按钮完成选择'
          }
        </div>
        
        {/* 放大预览模态框 */}
        {enlargedImage && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60"
            onClick={() => setEnlargedImage(null)}
          >
            <div className="relative max-w-[90vw] max-h-[90vh]">
              <button
                onClick={() => setEnlargedImage(null)}
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
      </div>
      
      {/* 放大预览模态框 */}
      {enlargedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative max-w-4xl max-h-4xl p-4">
            <button
              onClick={() => setEnlargedImage(null)}
              className="absolute top-2 right-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg z-10"
            >
              ×
            </button>
            <Image
              src={safeImageUrl(enlargedImage)}
              alt="放大预览"
              width={800}
              height={600}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};