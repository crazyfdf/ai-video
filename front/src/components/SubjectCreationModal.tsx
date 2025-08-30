import React, { useState, useEffect } from 'react';
import { APIService } from '../services/api';
import { buildImageUrl } from '../utils/helpers';
import { showToast } from '../app/toast';
import { ReactSelectLoraSelector } from './ReactSelectLoraSelector';
import { MultiImageSelector } from './MultiImageSelector';
import ImageDimensionSelector from './ImageDimensionSelector';
import { ASPECT_RATIOS, QUALITY_OPTIONS, getDefaultImageConfig, getDimensionsByConfig } from '../utils/imageConfig';



interface SubjectCreationModalProps {
  isOpen: boolean;
  mode: 'character' | 'scene' | null;
  onClose: () => void;
  onCreateCharacter: (name: string, description: string, images: string[], lora?: string) => Promise<any>;
  onCreateScene: (name: string, description: string, images: string[], lora?: string) => Promise<any>;
  loraList?: string[];
  isLoadingLora?: boolean;
  currentProject?: any;
  prefilledData?: {
    name?: string;
    description?: string;
  } | null;
}

export const SubjectCreationModal: React.FC<SubjectCreationModalProps> = ({
  isOpen,
  mode,
  onClose,
  onCreateCharacter,
  onCreateScene,
  loraList = [],
  isLoadingLora = false,
  currentProject,
  prefilledData = null
}) => {
  const [selectedLora, setSelectedLora] = useState<string>('');
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [subjectName, setSubjectName] = useState<string>('');
  const [subjectDescription, setSubjectDescription] = useState<string>('');
  
  // 使用项目默认配置
  const defaultConfig = getDefaultImageConfig();
  
  // 尺寸设置状态
  const [aspectRatio, setAspectRatio] = useState(defaultConfig.aspectRatio);
  const [quality, setQuality] = useState(defaultConfig.quality);
  
  // 重置状态当模态框关闭时
  useEffect(() => {
    if (!isOpen) {
      setSelectedLora('');
      setGeneratedImages([]);
      setSelectedImage('');
      setIsGeneratingImage(false);
      setAspectRatio(defaultConfig.aspectRatio);
      setQuality(defaultConfig.quality);
      setSubjectName('');
      setSubjectDescription('');
    }
  }, [isOpen, defaultConfig.aspectRatio, defaultConfig.quality]);

  // 处理预填充数据
  useEffect(() => {
    if (isOpen && prefilledData) {
      if (prefilledData.name) {
        setSubjectName(prefilledData.name);
      }
      if (prefilledData.description) {
        setSubjectDescription(prefilledData.description);
      }
    }
  }, [isOpen, prefilledData]);

  if (!isOpen || !mode) return null;

  const handleCreate = async () => {
    const name = subjectName.trim();
    const description = subjectDescription.trim();
    const uploadedImages = (window as any).tempSubjectImages || [];
    const selectedGeneratedImage = selectedImage ? [selectedImage] : [];
    const allImages = [...uploadedImages, ...selectedGeneratedImage];
    
    if (!name || !description) {
      showToast('请填写主体名称和描述');
      return;
    }
    
    try {
      if (mode === 'character') {
        await onCreateCharacter(name, description, allImages, selectedLora);
      } else {
        await onCreateScene(name, description, allImages, selectedLora);
      }
      
      onClose();
      showToast(`${mode === 'character' ? '角色' : '场景'}主体创建成功！`);
      
      // 清理临时数据
      delete (window as any).tempSubjectImages;
    } catch (error) {
      showToast('主体创建失败');
    }
  };

  const handleGenerateImage = async () => {
    const description = subjectDescription.trim();
    
    if (!description) {
      showToast('请先填写主体描述');
      return;
    }

    try {
      setIsGeneratingImage(true);
      showToast('开始生成主体图片...');
      
      // 获取API配置
      const config = await APIService.getModelConfig();
      const API_KEY = config.easyaiApiKey;
      
      if (!API_KEY) {
        throw new Error('EasyAI API Key未配置');
      }

      // 使用当前选择的尺寸参数
      const { width, height } = getDimensionsByConfig(aspectRatio, quality);

      // 构建提示词
      const basePrompt = 'masterpiece, best quality, ultra detailed, 8k, photorealistic';
      const finalPrompt = `${basePrompt}, ${description}`;

      // 根据模式动态设置model参数
      const model = mode === 'character' ? '角色形象制作' : '场景制作';
      
      // 使用带LoRA的生成接口，生成4张图片，使用选定的尺寸
      const result = await APIService.generateImageWithLora(finalPrompt, API_KEY, selectedLora, 4, width, height, model);
      
      console.log('Subject image generation result:', result);
      
      if (result && result.data && Array.isArray(result.data) && result.data.length > 0) {
        const imageUrls = result.data.map((item: any): string | null => {
          // 处理不同的数据结构
          if (typeof item === 'string') {
            return item; // 直接是URL字符串
          } else if (item.url) {
            return item.url; // 对象包含url字段
          } else if (item.image_url) {
            return item.image_url; // 对象包含image_url字段
          } else {
            console.warn('Unknown image item structure:', item);
            return null;
          }
        }).filter((url: string | null): url is string => url !== null);
        
        console.log('Extracted image URLs:', imageUrls);
        
        if (imageUrls.length === 0) {
          throw new Error('无法从API响应中提取有效的图片URL');
        }
        
        setGeneratedImages(imageUrls);
        
        const loraInfo = selectedLora ? ` (使用LoRA: ${selectedLora.split('\\').pop()?.replace('.safetensors', '')})` : '';
        
        // 如果只有一张图片，直接选择并保存
        if (imageUrls.length === 1) {
          setSelectedImage(imageUrls[0]);
          showToast(`成功生成主体图片${loraInfo}！已自动选择`);
        } else {
          // 多张图片时让用户选择，默认选择第一张
          setSelectedImage(imageUrls[0]);
          showToast(`成功生成${imageUrls.length}张主体图片${loraInfo}！请选择一张作为主体图`);
        }
      } else {
        console.error('Invalid API response structure:', result);
        throw new Error(`API返回数据格式错误。期望: {data: [...]}，实际收到: ${JSON.stringify(result)}`);
      }
      
    } catch (error) {
      console.error('Error generating subject image:', error);
      showToast(`图片生成失败: ${(error as Error).message}`);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleImageUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;
      
      const uploadedImages: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
          const result = await APIService.uploadSubjectImage(file, mode);
          uploadedImages.push(buildImageUrl(result.image_url));
        } catch (error) {
          console.error('Error uploading image:', error);
          showToast(`图片上传失败: ${file.name}`);
        }
      }
      
      if (uploadedImages.length > 0) {
        // 临时存储上传的图片
        (window as any).tempSubjectImages = uploadedImages;
        showToast(`成功上传${uploadedImages.length}张图片`);
      }
    };
    
    input.click();
  };

  return (
    <div className="subject-creation-modal">
      <div className="modal-content">
        <h3>创建{mode === 'character' ? '角色' : '场景'}主体</h3>
        <div className="creation-form">
          <input
            type="text"
            placeholder="主体名称"
            className="subject-name-input"
            id="subject-name-input"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
          />
          <textarea
            placeholder="主体描述（提示词）"
            rows={3}
            className="subject-description-input"
            id="subject-description-input"
            value={subjectDescription}
            onChange={(e) => setSubjectDescription(e.target.value)}
          />
          
          {/* React Select LoRA选择器 */}
          <ReactSelectLoraSelector
            loraList={loraList}
            selectedLora={selectedLora}
            onLoraChange={setSelectedLora}
            isLoading={isLoadingLora}
            placeholder="搜索或选择LoRA模型..."
            className="subject-modal-lora-selector"
          />

          {/* 图片尺寸设置 */}
          <ImageDimensionSelector
            aspectRatio={aspectRatio}
            quality={quality}
            onAspectRatioChange={setAspectRatio}
            onQualityChange={setQuality}
            buttonText="主体图片尺寸设置"
            currentProject={currentProject}
          />

          {/* 图片生成和上传区域 */}
          <div className="image-generation-area">
            <h4>主体图片:</h4>
            <div className="image-actions">
              <button 
                onClick={handleGenerateImage} 
                disabled={isGeneratingImage}
                className="generate-image-btn"
              >
                {isGeneratingImage ? '生成中...' : '生成图片'}
              </button>
              <button onClick={handleImageUpload} className="upload-image-btn">
                上传图片
              </button>
            </div>
            
            {/* 多图片选择器 */}
            {generatedImages.length > 0 && (
              <MultiImageSelector
                images={generatedImages}
                selectedImage={selectedImage}
                onImageSelect={setSelectedImage}
                onRegenerate={handleGenerateImage}
                isGenerating={isGeneratingImage}
                title="选择主体图片"
              />
            )}
            
            {/* 上传图片占位符 */}
            <div className="upload-placeholder">
              <span>+</span>
              <div>点击"上传图片"添加更多图片</div>
            </div>
          </div>
          
          <div className="creation-actions">
            <button onClick={onClose} className="cancel-btn">
              取消
            </button>
            <button onClick={handleCreate} className="create-btn">
              创建主体
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};