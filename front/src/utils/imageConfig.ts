// 图片尺寸配置工具函数

// 尺寸比例配置
export const ASPECT_RATIOS: { [key: string]: { name: string; commonUse: string } } = {
  '1:1': { name: '1:1 正方形', commonUse: '头像、社交平台配图' },
  '2:3': { name: '2:3 竖屏', commonUse: '社交媒体自拍、手机竖版内容' },
  '3:2': { name: '3:2 平衡比例', commonUse: '相机原生拍摄、图文排版' },
  '4:3': { name: '4:3 经典方正', commonUse: '文章配图、插画、传统显示器' },
  '16:9': { name: '16:9 宽屏主流', commonUse: '桌面壁纸、风景摄影、影视内容' },
  '9:16': { name: '9:16 竖屏宽屏', commonUse: '手机壁纸、短视频' },
  '21:9': { name: '21:9 超宽屏', commonUse: '电影宽银幕、专业后期' }
};

export const QUALITY_OPTIONS: { [key: string]: { [key: string]: { name: string; width: number; height: number } } } = {
  '1:1': {
    'sd': { name: '标清', width: 512, height: 512 },
    'hd': { name: '高清', width: 768, height: 768 },
    'fhd': { name: '超清', width: 1024, height: 1024 },
    'uhd': { name: '超高清', width: 2048, height: 2048 }
  },
  '16:9': {
    'sd': { name: '标清', width: 854, height: 480 },
    'hd': { name: '高清', width: 1280, height: 720 },
    'fhd': { name: '全高清', width: 1920, height: 1080 },
    '2k': { name: '2K', width: 2560, height: 1440 },
    '4k': { name: '4K', width: 3840, height: 2160 }
  },
  '9:16': {
    'sd': { name: '标清', width: 480, height: 854 },
    'hd': { name: '高清', width: 720, height: 1280 },
    'fhd': { name: '全高清', width: 1080, height: 1920 },
    '2k': { name: '2K', width: 1440, height: 2560 }
  },
  '2:3': {
    'sd': { name: '标清', width: 512, height: 768 },
    'hd': { name: '高清', width: 768, height: 1152 },
    'fhd': { name: '全高清', width: 1024, height: 1536 }
  },
  '3:2': {
    'sd': { name: '标清', width: 768, height: 512 },
    'hd': { name: '高清', width: 1152, height: 768 },
    'fhd': { name: '全高清', width: 1536, height: 1024 }
  },
  '4:3': {
    'sd': { name: '标清', width: 640, height: 480 },
    'hd': { name: '高清', width: 1024, height: 768 },
    'uhd': { name: '超清', width: 1600, height: 1200 }
  },
  '21:9': {
    'hd': { name: '高清宽屏', width: 2560, height: 1080 },
    '2k': { name: '2K宽屏', width: 3440, height: 1440 },
    '4k': { name: '4K宽屏', width: 5120, height: 2160 }
  }
};

// 默认配置
const DEFAULT_CONFIG = {
  aspectRatio: '1:1',
  quality: 'fhd',
  width: 1024,
  height: 1024
};

// 获取项目默认尺寸配置
export function getDefaultImageConfig(currentProject?: any): { width: number; height: number; aspectRatio: string; quality: string } {
  // 1. 优先使用项目配置
  if (currentProject?.defaultSizeConfig) {
    const config = currentProject.defaultSizeConfig;
    return {
      width: config.width || DEFAULT_CONFIG.width,
      height: config.height || DEFAULT_CONFIG.height,
      aspectRatio: config.aspectRatio || DEFAULT_CONFIG.aspectRatio,
      quality: config.quality || DEFAULT_CONFIG.quality
    };
  }

  // 2. 使用系统默认配置
  return DEFAULT_CONFIG;
}

// 根据比例和质量获取尺寸
export function getDimensionsByConfig(aspectRatio: string, quality: string): { width: number; height: number } {
  const qualityConfig = QUALITY_OPTIONS[aspectRatio]?.[quality];
  if (qualityConfig) {
    return {
      width: qualityConfig.width,
      height: qualityConfig.height
    };
  }
  
  // 如果找不到配置，返回默认值
  return {
    width: DEFAULT_CONFIG.width,
    height: DEFAULT_CONFIG.height
  };
}

// 获取项目小说内容
export function getProjectNovelContent(currentProject?: any): string {
  // 1. 优先使用项目配置
  if (currentProject?.novelContent) {
    return currentProject.novelContent;
  }

  // 2. 使用全局默认配置（仅在客户端）
  if (typeof window !== 'undefined') {
    try {
      const globalNovelContent = localStorage.getItem('global_default_novel_content');
      if (globalNovelContent) {
        return globalNovelContent;
      }
    } catch (error) {
      console.error('Error loading global default novel content:', error);
    }
  }

  // 3. 返回空字符串
  return '';
}

// 获取图片生成的最终尺寸配置
export function getImageGenerationConfig(
  customAspectRatio?: string,
  customQuality?: string,
  currentProject?: any
): { width: number; height: number } {
  // 如果有自定义配置，使用自定义配置
  if (customAspectRatio && customQuality) {
    return getDimensionsByConfig(customAspectRatio, customQuality);
  }
  
  // 否则使用默认配置
  const defaultConfig = getDefaultImageConfig(currentProject);
  return {
    width: defaultConfig.width,
    height: defaultConfig.height
  };
}