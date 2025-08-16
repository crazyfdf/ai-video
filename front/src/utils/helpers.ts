// 添加缓存破坏器
export const addCacheBuster = (url: string): string => {
  const cacheBuster = `?v=${Date.now()}`;
  return url.includes('?') ? `${url}&${cacheBuster}` : `${url}${cacheBuster}`;
};

// 构建图片URL
export const buildImageUrl = (imageUrl: string): string => {
  // 如果为空或未定义，返回占位符
  if (!imageUrl || imageUrl.trim() === '') {
    return createPlaceholderSVG();
  }
  
  // 如果已经是完整的URL（http或https开头），直接使用
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return addCacheBuster(imageUrl);
  }
  
  // 如果是相对路径，添加本地服务器前缀
  return addCacheBuster(`http://localhost:1198${imageUrl}`);
};

// 解析JSON响应
export const parseJSONResponse = (content: string) => {
  try {
    return JSON.parse(content);
  } catch (error) {
    console.error('JSON解析失败:', error);
    throw new Error('数据格式解析失败');
  }
};

// 验证场景数据
export const validateScenes = (scenes: any[]) => {
  if (!Array.isArray(scenes) || scenes.length === 0) {
    throw new Error('未生成任何分镜场景');
  }
  
  if (scenes.length < 20) {
    console.warn(`警告：只生成了${scenes.length}个场景，建议重新生成以获得更多场景`);
  }
  
  return scenes;
};

// 创建占位符图片数组
export const createPlaceholderImages = (count: number): string[] => {
  return Array(count).fill(createPlaceholderSVG());
};

// 生成主体标签
export const generateSubjectTag = (description: string, name: string): string => {
  return `${description}, ${name}`;
};

// 验证和修复图片URL
export const validateImageUrl = (url: string): string => {
  if (!url || url.trim() === '') {
    return createPlaceholderSVG();
  }
  
  // 如果URL已经是完整的，直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // 如果是相对路径，添加本地服务器前缀
  return `http://localhost:1198${url}`;
};

// 创建SVG placeholder图片
const createPlaceholderSVG = (width: number = 300, height: number = 300, text: string = "暂无图片"): string => {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f0f0f0"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="18" fill="#999999" text-anchor="middle" dy=".3em">${text}</text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
};

// 安全地构建图片URL，避免重复前缀
export const safeImageUrl = (url: string): string => {
  if (!url || url.trim() === '') {
    return createPlaceholderSVG();
  }
  
  // 检查是否有重复的localhost前缀
  if (url.includes('http://localhost:1198http://localhost:1198') || 
      url.includes('http://localhost:1198https://')) {
    // 移除重复的前缀
    const cleanUrl = url.replace('http://localhost:1198http://localhost:1198', 'http://localhost:1198')
                        .replace('http://localhost:1198https://', 'https://');
    return cleanUrl;
  }
  
  // 如果URL已经是完整的，直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // 如果是相对路径，添加本地服务器前缀
  return `http://localhost:1198${url}`;
};