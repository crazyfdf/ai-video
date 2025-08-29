'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { civitaiApi, CivitaiModel, CivitaiModelVersion } from '../services/civitaiApi';

interface SubjectManagerProps {
  onLoraSelected?: (characterLora?: CivitaiModel, sceneLora?: CivitaiModel) => void;
  characterPrompt?: string;
  scenePrompt?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface SelectedLora {
  model: CivitaiModel;
  version: CivitaiModelVersion;
  type: 'character' | 'scene';
}

const SubjectManager: React.FC<SubjectManagerProps> = ({
  onLoraSelected,
  characterPrompt = '',
  scenePrompt = '',
  isOpen,
  onClose
}) => {
  const [characterLoras, setCharacterLoras] = useState<CivitaiModel[]>([]);
  const [sceneLoras, setSceneLoras] = useState<CivitaiModel[]>([]);
  const [selectedLoras, setSelectedLoras] = useState<SelectedLora[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchingCharacter, setSearchingCharacter] = useState(false);
  const [searchingScene, setSearchingScene] = useState(false);
  const [activeTab, setActiveTab] = useState<'character' | 'scene'>('character');

  // 自动搜索角色 LoRA
  useEffect(() => {
    if (isOpen && characterPrompt) {
      searchCharacterLoras();
    }
  }, [isOpen, characterPrompt]);

  // 自动搜索场景 LoRA
  useEffect(() => {
    if (isOpen && scenePrompt) {
      searchSceneLoras();
    }
  }, [isOpen, scenePrompt]);

  const searchCharacterLoras = async () => {
    if (!characterPrompt) return;
    
    setSearchingCharacter(true);
    try {
      const results = await civitaiApi.findCharacterLora(characterPrompt);
      setCharacterLoras(results);
    } catch (error) {
      console.error('搜索角色 LoRA 失败:', error);
      toast.error('搜索角色 LoRA 失败');
    } finally {
      setSearchingCharacter(false);
    }
  };

  const searchSceneLoras = async () => {
    if (!scenePrompt) return;
    
    setSearchingScene(true);
    try {
      const results = await civitaiApi.findSceneLora(scenePrompt);
      setSceneLoras(results);
    } catch (error) {
      console.error('搜索场景 LoRA 失败:', error);
      toast.error('搜索场景 LoRA 失败');
    } finally {
      setSearchingScene(false);
    }
  };

  const selectLora = async (model: CivitaiModel, type: 'character' | 'scene') => {
    const version = model.modelVersions[0]; // 使用最新版本
    const newSelection: SelectedLora = { model, version, type };
    
    // 移除同类型的之前选择
    const filtered = selectedLoras.filter(lora => lora.type !== type);
    setSelectedLoras([...filtered, newSelection]);
    
    toast.success(`已选择${type === 'character' ? '角色' : '场景'} LoRA: ${model.name}`);
    
    // 自动下载并保存到 Recipes
    if (model.modelVersions?.[0]) {
      setLoading(true);
      
      try {
        const downloadSuccess = await civitaiApi.downloadModel(model.modelVersions[0]);
        if (downloadSuccess) {
          const recipeType = type === 'character' ? 'character' : 'scene';
          const recipeSaved = await civitaiApi.saveLoraRecipe(recipeType, model, 'current_project');
          
          if (recipeSaved) {
            toast.success(`${model.name} 已自动下载并保存到 Recipes`);
          } else {
            toast.warning(`${model.name} 下载成功，但保存到 Recipes 失败`);
          }
        }
      } catch (error) {
        console.error('自动下载LoRA失败:', error);
        toast.warning(`选择成功，但自动下载失败: ${error instanceof Error ? error.message : '未知错误'}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const removeLora = (type: 'character' | 'scene') => {
    setSelectedLoras(selectedLoras.filter(lora => lora.type !== type));
  };

  const handleConfirm = () => {
    const characterLora = selectedLoras.find(lora => lora.type === 'character')?.model;
    const sceneLora = selectedLoras.find(lora => lora.type === 'scene')?.model;
    
    onLoraSelected?.(characterLora, sceneLora);
    onClose();
  };

  const downloadLora = async (model: CivitaiModel) => {
    if (!model.modelVersions?.[0]) {
      toast.error('无可用的模型版本');
      return;
    }

    setLoading(true);
    
    try {
      const success = await civitaiApi.downloadModel(model.modelVersions[0]);
      if (success) {
        toast.success(`${model.name} 下载成功`);
        
        // 下载成功后保存到 ComfyUI-LoRA-Manager Recipes
        const recipeType = activeTab === 'character' ? 'character' : 'scene';
        const recipeSaved = await civitaiApi.saveLoraRecipe(recipeType, model, 'current_project');
        
        if (recipeSaved) {
          toast.success(`${model.name} 已保存到 Recipes`);
        } else {
          toast.warning(`${model.name} 下载成功，但保存到 Recipes 失败`);
        }
      } else {
        toast.error(`${model.name} 下载失败`);
      }
    } catch (error) {
      console.error('下载 LoRA 失败:', error);
      toast.error(`下载失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold">主体管理库 - LoRA 模型选择</h2>
            <p className="text-sm text-gray-600 mt-1">通过 Civitai API 搜索并管理 LoRA 模型，自动保存到 ComfyUI-LoRA-Manager</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* 已选择的 LoRA */}
        {selectedLoras.length > 0 && (
          <div className="mb-4 p-3 bg-gray-100 rounded">
            <h3 className="font-semibold mb-2">已选择的 LoRA:</h3>
            <div className="flex flex-wrap gap-2">
              {selectedLoras.map((lora, index) => (
                <div key={index} className="flex items-center bg-blue-100 px-3 py-1 rounded">
                  <span className="text-sm">
                    {lora.type === 'character' ? '角色' : '场景'}: {lora.model.name}
                  </span>
                  <button
                    onClick={() => removeLora(lora.type)}
                    className="ml-2 text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 标签页 */}
        <div className="flex mb-4 border-b">
          <button
            onClick={() => setActiveTab('character')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'character'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            角色 LoRA ({characterLoras.length})
          </button>
          <button
            onClick={() => setActiveTab('scene')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'scene'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            场景 LoRA ({sceneLoras.length})
          </button>
        </div>

        {/* LoRA 列表 */}
        <div className="overflow-y-auto max-h-96 mb-4">
          {activeTab === 'character' && (
            <div>
              {searchingCharacter ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-2 text-gray-600">搜索角色 LoRA 中...</p>
                </div>
              ) : characterLoras.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>未找到相关角色 LoRA</p>
                  <button
                    onClick={searchCharacterLoras}
                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    重新搜索
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {characterLoras.map((model) => (
                    <LoraCard
                      key={model.id}
                      model={model}
                      onSelect={() => selectLora(model, 'character')}
                      onDownload={() => downloadLora(model)}
                      isSelected={selectedLoras.some(lora => lora.model.id === model.id)}
                      loading={loading}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'scene' && (
            <div>
              {searchingScene ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-2 text-gray-600">搜索场景 LoRA 中...</p>
                </div>
              ) : sceneLoras.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>未找到相关场景 LoRA</p>
                  <button
                    onClick={searchSceneLoras}
                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    重新搜索
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sceneLoras.map((model) => (
                    <LoraCard
                      key={model.id}
                      model={model}
                      onSelect={() => selectLora(model, 'scene')}
                      onDownload={() => downloadLora(model)}
                      isSelected={selectedLoras.some(lora => lora.model.id === model.id)}
                      loading={loading}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={selectedLoras.length === 0}
          >
            确认选择 ({selectedLoras.length})
          </button>
        </div>
      </div>
    </div>
  );
};

// LoRA 卡片组件
interface LoraCardProps {
  model: CivitaiModel;
  onSelect: () => void;
  onDownload: () => void;
  isSelected: boolean;
  loading: boolean;
}

const LoraCard: React.FC<LoraCardProps> = ({
  model,
  onSelect,
  onDownload,
  isSelected,
  loading
}) => {
  const version = model.modelVersions[0];
  const previewImage = version?.images?.[0];

  return (
    <div className={`border rounded-lg p-4 ${
      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
    }`}>
      {/* 预览图 */}
      {previewImage && (
        <div className="mb-3">
          <img
            src={previewImage.url}
            alt={model.name}
            className="w-full h-32 object-cover rounded"
            loading="lazy"
          />
        </div>
      )}

      {/* 模型信息 */}
      <div className="mb-3">
        <h4 className="font-semibold text-sm mb-1 line-clamp-2">{model.name}</h4>
        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
          {model.description || '暂无描述'}
        </p>
        
        {/* 统计信息 */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>⭐ {model.stats.rating.toFixed(1)}</span>
          <span>📥 {model.stats.downloadCount.toLocaleString()}</span>
          <span>❤️ {model.stats.favoriteCount.toLocaleString()}</span>
        </div>

        {/* 训练词 */}
        {version?.trainedWords && version.trainedWords.length > 0 && (
          <div className="mt-2">
            <div className="flex flex-wrap gap-1">
              {version.trainedWords.slice(0, 3).map((word, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-xs rounded"
                >
                  {word}
                </span>
              ))}
              {version.trainedWords.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{version.trainedWords.length - 3} 更多
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <button
          onClick={onSelect}
          className={`flex-1 px-3 py-2 text-sm rounded ${
            isSelected
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {isSelected ? '已选择' : '选择'}
        </button>
        <button
          onClick={onDownload}
          disabled={loading}
          className="px-3 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? '下载中...' : '下载'}
        </button>
      </div>
    </div>
  );
};

export default SubjectManager;