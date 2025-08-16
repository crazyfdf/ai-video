// 角色类型
export interface Character {
  name: string;
  gender: string;
  age: string;
  height?: string;
  weight?: string;
  appearance: string;
  personality?: string;
  role?: string;
  englishPrompt?: string;
  selectedLora?: string;
  tempImages?: string[]; // 临时生成的图片，用于用户选择
}

// 主体类型
export interface Subject {
  id: number;
  name: string;
  description: string;
  tag: string;
  images: string[];
  createdAt: string;
  selectedLora?: string;
}

// 分镜元素类型
export interface StoryboardElement {
  scene_index: number;
  characters?: string[];
  character_subjects?: string[];
  scene_subjects?: string[];
  scene_prompt?: string;
}

// 场景数据类型
export interface SceneData {
  scene_id: number;
  novel_fragment: string;
  storyboard: string;
  wan22_prompt: string;
  generated_at?: string;
}

// 完整分镜数据类型
export interface CompleteStoryboardData {
  total_scenes: number;
  generated_at: string;
  story_summary: string;
  characters: Character[];
  raw_ai_response: string;
  scenes: SceneData[];
}

// API 配置类型
export interface APIConfig {
  url?: string;
  apikey: string;
  model?: string;
  easyaiApiKey?: string;
}

// 尺寸和画质类型定义

// 尺寸比例类型
export interface AspectRatio {
  id: string;
  name: string;
  ratio: string;
  description: string;
  commonUse: string;
}

// 画质选项类型
export interface QualityOption {
  id: string;
  name: string;
  width: number;
  height: number;
  description: string;
}

// 尺寸配置类型
export interface SizeConfig {
  aspectRatio: AspectRatio;
  quality: QualityOption;
  width: number;
  height: number;
}

// 场景元素类型（扩展）
export interface SceneElement {
  id: string;
  name: string;
  description: string;
  prompt: string;
  selectedLora?: string;
  tempImages?: string[]; // 临时生成的图片，用于用户选择
  selectedImage?: string; // 用户选择的主要参考图片
}

// 专业功能类型定义

// 角色音色配置
export interface VoiceProfile {
  characterId: string;
  characterName?: string;
  basicTone: {
    pitchRange: string;
    speechRate: number;
    volumeControl: string;
    voiceQuality: string;
  };
  emotionalExpression: {
    happy: string;
    angry: string;
    sad: string;
    nervous: string;
  };
  technicalGuidance: {
    breathingControl: string;
    pronunciation: string;
    emotionalLayers: string;
    voiceDistinction: string;
  };
  references: {
    similarCharacters: string[];
    recommendedActors: string[];
    technicalRequirements: string;
  };
}

// 台词行
export interface DialogueLine {
  characterId: string;
  characterName?: string;
  text: string;
  emotion: string;
  timing: number;
  notes: string;
}

// 台词替代方案
export interface DialogueAlternative {
  version: string;
  text: string;
  notes: string;
}

// 分镜台词
export interface SceneDialogue {
  sceneId: string;
  sceneName?: string;
  mainDialogue: DialogueLine[];
  technicalAnalysis: {
    emotionalFocus: string;
    toneAndRhythm: string;
    pausesAndEmphasis: string;
    visualCoordination: string;
  };
  performanceGuidance: {
    innerThoughts: string;
    bodyLanguage: string;
    eyesAndExpression: string;
    characterInteraction: string;
  };
  alternatives: DialogueAlternative[];
}

// 音效元素
export interface AudioElement {
  name: string;
  description: string;
  volume: string;
  frequency: string;
  duration: string;
  source: string;
}

// 环境音效设计
export interface AudioDesign {
  sceneId: string;
  sceneName?: string;
  mainEnvironmentAudio: {
    baseAmbient: AudioElement[];
    volumeLevels: string;
    frequencyRange: string;
    duration: string;
  };
  backgroundAudio: {
    distantSounds: AudioElement[];
    midRangeSounds: AudioElement[];
    nearSounds: AudioElement[];
    volumeBalance: string;
  };
  specialEffects: {
    emotionalAudio: AudioElement[];
    dramaticTension: AudioElement[];
    transitions: AudioElement[];
    storySpecific: AudioElement[];
  };
  technicalSpecs: {
    recordingEquipment: string;
    postProcessing: string;
    stereoPositioning: string;
    mixingRatios: string;
  };
  productionAdvice: {
    sourceMaterials: string;
    recordingTechniques: string;
    postProductionWorkflow: string;
    qualityStandards: string;
  };
}

// 色彩信息
export interface ColorInfo {
  name: string;
  hex: string;
  rgb: string;
  hsv: string;
  usage: string;
}

// 美术风格指南
export interface ArtStyleGuide {
  projectId: string;
  projectName?: string;
  overallVisualStyle: {
    artisticPosition: string;
    visualReferences: string[];
    aestheticConcept: string;
    themeAlignment: string;
  };
  colorScheme: {
    primaryColors: ColorInfo[];
    secondaryColors: ColorInfo[];
    sceneVariations: { [sceneId: string]: ColorInfo[] };
    emotionalFunction: string;
    colorValues: { [colorName: string]: string };
  };
  compositionAndCinematography: {
    compositionPrinciples: string;
    cameraMovementStyle: string;
    depthOfFieldUsage: string;
    lightingShadowHandling: string;
  };
  characterDesignGuidance: {
    characterStyling: string;
    costumeDesign: string;
    makeupAndHair: string;
    propsDesign: string;
  };
  sceneDesignGuidance: {
    sceneDesignStyle: string;
    setAndPropsRules: string;
    materialAndTexture: string;
    spatialLayering: string;
  };
  technicalImplementation: {
    shootingRequirements: string;
    postColorGrading: string;
    effectsStyleGuide: string;
    qualityControl: string;
  };
}

// 专业功能类型
export interface ProfessionalFeature {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'voice' | 'dialogue' | 'audio' | 'art';
}

// 项目信息
export interface ProjectInfo {
  projectName: string;
  projectType: string;
  storyTheme: string;
  targetAudience?: string;
  emotionalTone?: string;
  timePeriod?: string;
  locationStyle?: string;
}

// 专业功能请求参数
export interface VoiceDesignRequest {
  characterInfo: string;
  sceneContext?: string;
  emotionalState?: string;
  projectName?: string;
}

export interface DialogueGenerationRequest {
  sceneDescription: string;
  characters: string;
  storyContext: string;
  emotionalTone?: string;
  sceneDuration?: string;
  projectName?: string;
}

export interface AudioDesignRequest {
  sceneDescription: string;
  timeSetting?: string;
  location?: string;
  weather?: string;
  mood?: string;
  duration?: string;
  projectName?: string;
}

export interface ArtStyleRequest {
  projectType: string;
  storyTheme: string;
  targetAudience?: string;
  emotionalTone?: string;
  timePeriod?: string;
  locationStyle?: string;
  projectName?: string;
}