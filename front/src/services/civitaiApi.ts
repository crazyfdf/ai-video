import { toast } from 'react-toastify';

const CIVITAI_API_KEY = '66947eb33d3c18e975a8aa520466d92a';
const CIVITAI_BASE_URL = 'https://civitai.com/api/v1';
const BACKEND_BASE_URL = 'http://localhost:1198';

interface CivitaiModel {
  id: number;
  name: string;
  description: string;
  type: string;
  nsfw: boolean;
  tags: string[];
  creator: {
    username: string;
    image?: string;
  };
  stats: {
    downloadCount: number;
    favoriteCount: number;
    commentCount: number;
    ratingCount: number;
    rating: number;
  };
  modelVersions: CivitaiModelVersion[];
}

interface CivitaiModelVersion {
  id: number;
  name: string;
  description: string;
  downloadUrl: string;
  trainedWords: string[];
  files: CivitaiFile[];
  images: CivitaiImage[];
  baseModel: string;
}

interface CivitaiFile {
  id: number;
  url: string;
  sizeKB: number;
  name: string;
  type: string;
  format: string;
  pickleScanResult: string;
  pickleScanMessage?: string;
  virusScanResult: string;
  scannedAt: string;
  hashes: {
    AutoV1?: string;
    AutoV2?: string;
    SHA256?: string;
    CRC32?: string;
    BLAKE3?: string;
  };
}

interface CivitaiImage {
  id: number;
  url: string;
  nsfw: string;
  width: number;
  height: number;
  hash: string;
  meta?: {
    prompt?: string;
    negativePrompt?: string;
    seed?: number;
    steps?: number;
    sampler?: string;
    cfgScale?: number;
  };
}

interface SearchParams {
  query?: string;
  tag?: string;
  username?: string;
  types?: string[];
  sort?: 'Highest Rated' | 'Most Downloaded' | 'Newest' | 'Most Liked';
  period?: 'AllTime' | 'Year' | 'Month' | 'Week' | 'Day';
  rating?: number;
  favorites?: boolean;
  hidden?: boolean;
  primaryFileOnly?: boolean;
  allowNoCredit?: boolean;
  allowDerivatives?: boolean;
  allowDifferentLicenses?: boolean;
  allowCommercialUse?: boolean;
  nsfw?: boolean;
  limit?: number;
  page?: number;
}

class CivitaiApiService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = CIVITAI_API_KEY;
    this.baseUrl = CIVITAI_BASE_URL;
  }

  private async makeRequest<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    try {
      // 使用后端代理服务
      const response = await fetch(`${BACKEND_BASE_URL}/api/civitai/proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: endpoint,
          params: params || {},
          method: 'GET'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Civitai API request failed:', error);
      toast.error('Civitai API 请求失败');
      throw error;
    }
  }

  async searchModels(params: SearchParams): Promise<{ items: CivitaiModel[]; metadata: any }> {
    try {
      // 直接使用后端搜索接口
      const url = new URL(`${BACKEND_BASE_URL}/api/civitai/models`);
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              value.forEach(v => url.searchParams.append(key, v.toString()));
            } else {
              url.searchParams.append(key, value.toString());
            }
          }
        });
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Civitai models search failed:', error);
      toast.error('Civitai 模型搜索失败');
      throw error;
    }
  }

  async getModelById(id: number): Promise<CivitaiModel> {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/civitai/models/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get Civitai model failed:', error);
      toast.error('获取 Civitai 模型失败');
      throw error;
    }
  }

  async getModelVersionById(id: number): Promise<CivitaiModelVersion> {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/civitai/model-versions/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get Civitai model version failed:', error);
      toast.error('获取 Civitai 模型版本失败');
      throw error;
    }
  }

  // 根据提示词和描述搜索最合适的 LoRA 模型
  async findBestLoraForPrompt(prompt: string, description?: string): Promise<CivitaiModel[]> {
    const searchTerms = this.extractSearchTerms(prompt, description);
    
    const searchParams: SearchParams = {
      query: searchTerms.join(' '),
      types: ['LORA'],
      sort: 'Highest Rated',
      period: 'AllTime',
      nsfw: false,
      limit: 10,
      page: 1
    };

    const result = await this.searchModels(searchParams);
    return result.items;
  }

  // 为角色主体搜索 LoRA
  async findCharacterLora(characterName: string, characterDescription?: string): Promise<CivitaiModel[]> {
    const searchParams: SearchParams = {
      query: `${characterName} character`,
      types: ['LORA'],
      sort: 'Highest Rated',
      nsfw: false,
      limit: 5
    };

    if (characterDescription) {
      searchParams.query += ` ${characterDescription}`;
    }

    const result = await this.searchModels(searchParams);
    return result.items;
  }

  // 为场景主体搜索 LoRA
  async findSceneLora(sceneDescription: string): Promise<CivitaiModel[]> {
    const searchParams: SearchParams = {
      query: `${sceneDescription} scene environment`,
      types: ['LORA'],
      sort: 'Highest Rated',
      nsfw: false,
      limit: 5
    };

    const result = await this.searchModels(searchParams);
    return result.items;
  }

  // 提取搜索关键词
  private extractSearchTerms(prompt: string, description?: string): string[] {
    const text = `${prompt} ${description || ''}`;
    const terms: string[] = [];
    
    // 提取常见的风格和主题关键词
    const styleKeywords = [
      'anime', 'realistic', 'cartoon', 'fantasy', 'sci-fi', 'medieval',
      'modern', 'vintage', 'cyberpunk', 'steampunk', 'gothic', 'minimalist'
    ];
    
    const characterKeywords = [
      'girl', 'boy', 'woman', 'man', 'character', 'person', 'human',
      'warrior', 'mage', 'knight', 'princess', 'hero', 'villain'
    ];
    
    const sceneKeywords = [
      'landscape', 'city', 'forest', 'mountain', 'ocean', 'desert',
      'building', 'room', 'street', 'park', 'garden', 'sky'
    ];

    // 检查文本中是否包含这些关键词
    [...styleKeywords, ...characterKeywords, ...sceneKeywords].forEach(keyword => {
      if (text.toLowerCase().includes(keyword)) {
        terms.push(keyword);
      }
    });

    // 如果没有找到特定关键词，使用原始文本的前几个词
    if (terms.length === 0) {
      const words = text.split(' ').filter(word => word.length > 2).slice(0, 3);
      terms.push(...words);
    }

    return terms;
  }

  // 下载模型到本地
  async downloadModel(modelVersion: CivitaiModelVersion): Promise<boolean> {
    try {
      const file = modelVersion.files.find(f => f.type === 'Model') || modelVersion.files[0];
      if (!file) {
        throw new Error('下载链接或文件名不可用');
      }

      const downloadUrl = file.url;
      const fileName = file.name;

      // 调用后端API下载模型到ComfyUI目录
      const response = await fetch('/api/lora/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model_id: modelVersion.id,
          version_id: modelVersion.id,
          download_url: downloadUrl,
          file_name: fileName,
          model_name: modelVersion.name || 'unknown'
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '下载失败');
      }

      console.log('模型下载成功:', result.file_name);
      return true;
    } catch (error) {
      console.error('下载模型失败:', error);
      return false;
    }
  }

  // 保存LoRA配方到ComfyUI-LoRA-Manager
  async saveLoraRecipe(type: 'character' | 'scene', loraInfo: CivitaiModel, projectId?: string): Promise<boolean> {
    try {
      const response = await fetch('/api/lora/recipes/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          lora_info: loraInfo,
          project_id: projectId || (() => { throw new Error('Project ID is required'); })()
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '保存配方失败');
      }

      console.log('LoRA配方保存成功:', result.recipe_name);
      return true;
    } catch (error) {
      console.error('保存LoRA配方失败:', error);
      return false;
    }
  }

  // 获取LoRA配方列表
  async getLoraRecipes(projectId?: string, type?: 'character' | 'scene'): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (projectId) params.append('project_id', projectId);
      if (type) params.append('type', type);

      const response = await fetch(`/api/lora/recipes/list?${params.toString()}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '获取配方列表失败');
      }

      return result.recipes || [];
    } catch (error) {
      console.error('获取LoRA配方列表失败:', error);
      return [];
    }
  }

  // 删除LoRA配方
  async deleteLoraRecipe(recipeName: string): Promise<boolean> {
    try {
      const response = await fetch('/api/lora/recipes/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipe_name: recipeName
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '删除配方失败');
      }

      console.log('LoRA配方删除成功');
      return true;
    } catch (error) {
      console.error('删除LoRA配方失败:', error);
      return false;
    }
  }

  // 获取LoRA管理器状态
  async getLoraManagerStatus(): Promise<any> {
    try {
      const response = await fetch('/api/lora/status');
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '获取状态失败');
      }

      return result.status;
    } catch (error) {
      console.error('获取LoRA管理器状态失败:', error);
      return null;
    }
  }
}

export const civitaiApi = new CivitaiApiService();
export type { CivitaiModel, CivitaiModelVersion, CivitaiFile, CivitaiImage, SearchParams };