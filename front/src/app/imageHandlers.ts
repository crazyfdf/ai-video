"use client";

import { APIService } from '../services/api';
import { safeImageUrl, createPlaceholderSVG } from '../utils/helpers';
import { getDefaultImageConfig } from '../utils/imageConfig';
import { showToast } from './toast';

// 将分镜元素映射为分区控制参数（动态适配工作流参数名）
export const mapElementsToRegionParams = (
  elements: any[],
  imageWidth: number = 1280,
  imageHeight: number = 720,
  charSubjects: any[] = [],
  sceneSubjects: any[] = [],
  characters: any[] = [],
  mapping?: {
    image: { width: string; height: string };
    elements: Array<{ lora: string; photo: string; x: string; y: string; width: string; height: string; positive: string }>;
  }
) => {
  // 默认映射（兜底），与用户提供的test1.json一致
  const defaultMapping = {
    image: { width: 'width', height: 'height' },
    elements: [
      { lora: 'custom_string', photo: 'custom_string_4', x: 'custom_number_2', y: 'custom_number_3', width: 'custom_number', height: 'custom_number_1', positive: 'positive' },
      { lora: 'custom_string_1', photo: 'custom_string_5', x: 'custom_number_6', y: 'custom_number_7', width: 'custom_number_4', height: 'custom_number_5', positive: 'positive_1' },
      { lora: 'custom_string_2', photo: 'custom_string_6', x: 'custom_number_10', y: 'custom_number_11', width: 'custom_number_8', height: 'custom_number_9', positive: 'positive_2' },
      { lora: 'custom_string_3', photo: 'custom_string_7', x: 'custom_number_14', y: 'custom_number_15', width: 'custom_number_12', height: 'custom_number_13', positive: 'positive_3' },
    ]
  };

  const mapSpec = mapping || defaultMapping;

  const params: any = {};
  // 画布宽高（有些工作流需要顶层width/height）
  if (mapSpec.image?.width) params[mapSpec.image.width] = imageWidth;
  if (mapSpec.image?.height) params[mapSpec.image.height] = imageHeight;

  const normalizeName = (s: string) => String(s || '').replace(/^@/, '').replace(/[\s()（）:：,，、\-]/g, '');
  const findCharacterSubject = (name: string) => {
    const n = normalizeName(name);
    return charSubjects.find((s: any) => {
      const sn = normalizeName(s.name);
      const sd = normalizeName(s.description || '');
      return sn === n || n.includes(sn) || sn.includes(n) || sd.includes(n);
    });
  };
  const findSceneSubject = (name: string) => {
    const n = normalizeName(name);
    return sceneSubjects.find((s: any) => {
      const sn = normalizeName(s.name);
      const sd = normalizeName(s.description || '');
      return sn === n || n.includes(sn) || sn.includes(n) || sd.includes(n);
    });
  };
  // 角色兜底：从 characters 列表匹配（当主体库未创建时）
  const findCharacterFromCharacters = (name: string) => {
    const n = normalizeName(name);
    return (characters || []).find((c: any) => {
      const cn = normalizeName(c.name);
      const ca = normalizeName(c.appearance || '');
      const cep = normalizeName(c.englishPrompt || '');
      return cn === n || n.includes(cn) || cn.includes(n) || ca.includes(n) || cep.includes(n);
    });
  };

  for (let index = 0; index < 4; index++) {
    const element = elements[index] || {};
    const spec = mapSpec.elements[index];
    if (!spec) continue;

    // 1) 确定主体类型与名称（不再从文本提示词中推断）
    const elementType = element.element_type || element.type || '';
    const rawName: string | undefined = element.name || element.character_name || element.scene_name || element.subject_name;
    const normalizedName = rawName ? String(rawName).replace(/^@/, '') : undefined;

    let subjectInfo: any = null;
    if (elementType === 'character') {
      if (normalizedName) subjectInfo = findCharacterSubject(normalizedName);
    } else if (elementType === 'scene') {
      if (normalizedName) subjectInfo = findSceneSubject(normalizedName);
    } else {
      // 如果未标注类型，尝试先按角色再按场景查找（基于名称），不读取文本提示词
      if (normalizedName) {
        subjectInfo = findCharacterSubject(normalizedName) || findSceneSubject(normalizedName);
      }
    }

    // 2) 统一从主体管理获取参数（若主体库不存在则回退到 characters 列表提供正向提示）
    const lora = element.lora ?? subjectInfo?.selectedLora ?? '';
    // 修复photo获取逻辑：优先从subjectImages获取，其次从images字段
    const photo = element.photo ?? subjectInfo?.subjectImages?.[0] ?? subjectInfo?.images?.[0] ?? '';
    
    // 修复提示词生成：tag+prompt用逗号拼接
    let prompt = '';
    if (subjectInfo) {
      // 按照用户要求：tag+prompt用逗号拼接
      const tag = subjectInfo.tag || '';
      const elementPrompt = element.prompt || '';
      if (tag && elementPrompt) {
        prompt = `${tag}, ${elementPrompt}`;
      } else if (tag) {
        prompt = tag;
      } else if (elementPrompt) {
        prompt = elementPrompt;
      } else {
        prompt = subjectInfo.description || '';
      }
    } else if (element.prompt) {
      prompt = element.prompt;
    }
    
    // 添加调试信息
    console.log(`Element ${index} (${normalizedName}):`, {
      elementType,
      subjectInfo: subjectInfo ? {
        name: subjectInfo.name,
        selectedLora: subjectInfo.selectedLora,
        subjectImages: subjectInfo.subjectImages,
        images: subjectInfo.images,
        tag: subjectInfo.tag
      } : null,
      lora,
      photo,
      prompt
    });

    if (!subjectInfo && elementType === 'character' && normalizedName) {
      const charFallback = findCharacterFromCharacters(normalizedName);
      if (charFallback) {
        // 使用角色英文提示或外貌作为正向提示
        prompt = charFallback.englishPrompt || charFallback.appearance || charFallback.description || charFallback.name || prompt;
      }
    }

    // 3) 坐标优先使用elements_layout，其次主体内置，最后兜底
    const isScene = elementType === 'scene';
    const finalX = element.x ?? subjectInfo?.x ?? (isScene ? 0 : index === 0 ? 40 : 60 + index * 20);
    const finalY = element.y ?? subjectInfo?.y ?? (isScene ? 0 : index === 0 ? 40 : 60 + index * 20);
    const finalWidth = element.width ?? subjectInfo?.width ?? (isScene ? imageWidth : 400 + (index === 1 ? 150 : 0));
    const finalHeight = element.height ?? subjectInfo?.height ?? (isScene ? imageHeight : 400 + (index === 1 ? 200 : 0));

    // 4) 写入动态参数
    if (spec.lora) params[spec.lora] = lora;
    if (spec.photo) params[spec.photo] = photo;
    if (spec.x) params[spec.x] = finalX;
    if (spec.y) params[spec.y] = finalY;
    if (spec.width) params[spec.width] = finalWidth;
    if (spec.height) params[spec.height] = finalHeight;
    if (spec.positive) params[spec.positive] = prompt;

  }

  // 添加最终参数调试信息
  console.log('Final region control params:', params);
  console.log('Elements layout:', elements);
  console.log('Character subjects:', charSubjects);
  console.log('Scene subjects:', sceneSubjects);

  return params;
};

export async function generateImageWithRegionControl(
  index: number,
  elementsLayout: any[],
  width: number | undefined,
  height: number | undefined,
  ctx: {
    currentProject: any;
    characterSubjects: any[];
    sceneSubjects: any[];
    characters?: any[];
    images: string[];
    setImages: (imgs: string[]) => void;
  }
) {
  const config = await APIService.getModelConfig();
  const API_KEY = config.easyaiApiKey;
  if (!API_KEY) {
    throw new Error('EasyAI API Key未配置，请在初始化页面配置');
  }

  // 预取工作流参数映射（页面加载时已缓存，这里再次保证存在）
  const mapping = await APIService.getRegionControlParamMapping();

  const defaultConfig = getDefaultImageConfig(ctx.currentProject);
  const finalWidth = width || defaultConfig.width;
  const finalHeight = height || defaultConfig.height;

  const regionParams = mapElementsToRegionParams(
    elementsLayout,
    finalWidth,
    finalHeight,
    ctx.characterSubjects,
    ctx.sceneSubjects,
    ctx.characters || [],
    mapping
  );

  const result = await APIService.generateImageWithRegionControl(regionParams, API_KEY);

  let imageUrl: any = null;
  if (result) {
    if (result.imageUrl) imageUrl = result.imageUrl;
    else if (result.data && result.data.length > 0) imageUrl = result.data[0].url || result.data[0].image_url || result.data[0];
    else if (result.url) imageUrl = result.url;
    else if (result.image_url) imageUrl = result.image_url;
    else if (typeof result === 'string') imageUrl = result;
  }

  if (imageUrl) {
    // 保存图片到对应的scene_X.json文件而不是image_index.json
    await APIService.updateScene(index, {
      images: [imageUrl],
      generation_info: {
        type: '分区控制生成',
        timestamp: Date.now(),
        elements_layout: elementsLayout
      }
    });
    const updatedImages = [...ctx.images];
    updatedImages[index] = safeImageUrl(`${imageUrl}?v=${Date.now()}`);
    ctx.setImages(updatedImages);
    showToast(`第${index + 1}个分镜分区控制生成成功`);
  } else {
    throw new Error('分区控制接口未返回有效图片');
  }
}

export async function generateImageWithLora(
  index: number,
  requiredElements: any,
  width: number | undefined,
  height: number | undefined,
  ctx: {
    currentProject: any;
    sceneDescriptions: string[];
    characterSubjects: any[];
    sceneSubjects: any[];
    images: string[];
    setImages: (imgs: string[]) => void;
  }
) {
  const config = await APIService.getModelConfig();
  const API_KEY = config.easyaiApiKey;
  if (!API_KEY) {
    throw new Error('EasyAI API Key未配置，请在初始化页面配置');
  }

  let finalPrompt = ctx.sceneDescriptions[index] || '';

  if (requiredElements.character_subjects) {
    requiredElements.character_subjects.forEach((charSubject: string) => {
      const charName = charSubject.replace('@', '');
      const charSubjectData = ctx.characterSubjects.find(cs => cs.name === charName);
      if (charSubjectData?.selectedLora) {
        if (charSubjectData.tag) finalPrompt += `, ${charSubjectData.tag}`;
      }
    });
  }

  if (requiredElements.scene_subjects) {
    requiredElements.scene_subjects.forEach((sceneSubject: string) => {
      const sceneName = sceneSubject.replace('@', '');
      const sceneSubjectData = ctx.sceneSubjects.find(ss => ss.name === sceneName);
      if (sceneSubjectData?.selectedLora) {
        if (sceneSubjectData.tag) finalPrompt += `, ${sceneSubjectData.tag}`;
      }
    });
  }

  if (requiredElements.scene_prompt) {
    finalPrompt += `, ${requiredElements.scene_prompt}`;
  }

  if (!finalPrompt.trim()) {
    finalPrompt = 'masterpiece, best quality, ultra detailed, 8k, photorealistic, cinematic lighting';
  }

  let primaryLora: string | undefined = undefined;
  let loraStrategy = '';
  if (requiredElements.character_subjects) {
    for (const charSubject of requiredElements.character_subjects) {
      const charName = charSubject.replace('@', '');
      const charSubjectData = ctx.characterSubjects.find(cs => cs.name === charName);
      if (charSubjectData?.selectedLora) {
        primaryLora = charSubjectData.selectedLora;
        loraStrategy = `角色LoRA(${charName})`;
        break;
      }
    }
  }
  if (!primaryLora && requiredElements.scene_subjects) {
    for (const sceneSubject of requiredElements.scene_subjects) {
      const sceneName = sceneSubject.replace('@', '');
      const sceneSubjectData = ctx.sceneSubjects.find(ss => ss.name === sceneName);
      if (sceneSubjectData?.selectedLora) {
        primaryLora = sceneSubjectData.selectedLora;
        loraStrategy = `场景LoRA(${sceneName})`;
        break;
      }
    }
  }

  const defaultConfig = getDefaultImageConfig(ctx.currentProject);
  const finalWidth = width || defaultConfig.width;
  const finalHeight = height || defaultConfig.height;

  const result = await APIService.generateImageWithLora(
    finalPrompt,
    API_KEY,
    primaryLora,
    1,
    finalWidth,
    finalHeight,
    '分区控制'
  );

  if (result.data && result.data.length > 0) {
    const imageUrl = result.data[0].url;
    // 保存图片到对应的scene_X.json文件而不是image_index.json
    await APIService.updateScene(index, {
      images: [imageUrl],
      generation_info: {
        type: '智能生成',
        timestamp: Date.now(),
        prompt: finalPrompt,
        lora: primaryLora,
        strategy: loraStrategy
      }
    });
    const updatedImages = [...ctx.images];
    updatedImages[index] = safeImageUrl(`${imageUrl}?v=${Date.now()}`);
    ctx.setImages(updatedImages);
    const loraInfo = primaryLora
      ? ` (${loraStrategy}: ${primaryLora.split('\\').pop()?.replace('.safetensors', '')})`
      : ' (未使用LoRA)';
    showToast(`第${index + 1}个分镜智能生成成功${loraInfo}`);
  } else {
    throw new Error('未收到有效的图片数据');
  }
}

export async function analyzeStoryboardElements(ctx: {
  fragments: string[];
  storyboards: string[];
  characterSubjects: any[];
  characters: any[];
  sceneSubjects: any[];
}) {
  showToast('开始分析分镜所需元素...');
  if (ctx.fragments.length === 0 || ctx.storyboards.length === 0) {
    showToast('请先生成分镜脚本');
    return;
  }
  if (ctx.characterSubjects.length === 0 && ctx.characters.length === 0) {
    showToast('请先创建角色主体或生成角色信息');
    return;
  }

  const config = await APIService.getModelConfig();

  const characterSubjectsInfo = ctx.characterSubjects.length > 0
    ? ctx.characterSubjects.map((subject: any) => `@${subject.name}: ${subject.tag} (${subject.description})`).join('\n')
    : ctx.characters.map((char: any) => `@${char.name}: ${char.appearance}`).join('\n');

  const sceneSubjectsInfo = ctx.sceneSubjects
    .map((subject: any) => `@${subject.name}: ${subject.tag} (${subject.description})`).join('\n');

  const systemPrompt = `You are a professional storyboard element analyst. Analyze each storyboard scene to identify required subjects and generate pure environment scene prompts.

Known Character Subjects:
${characterSubjectsInfo}

Known Scene Subjects:
${sceneSubjectsInfo}

CRITICAL REQUIREMENTS FOR SCENE PROMPTS - ABSOLUTELY NO EXCEPTIONS:
1. ZERO HUMAN CONTENT: Never include ANY words related to humans, people, characters, figures, silhouettes, body parts, clothing, actions, expressions, or human presence
2. PURE ENVIRONMENT ONLY: Only describe architecture, nature, weather, lighting, atmosphere, inanimate objects, furniture, decorations, landscapes
3. FORBIDDEN WORDS (never use): person, people, character, man, woman, boy, girl, human, figure, silhouette, someone, individual, being, body, face, hand, arm, leg, head, portrait, profile, torso, shoulder, finger, foot, eye, hair, skin, male, female, child, adult, standing, sitting, walking, running, smiling, clothing, dress, shirt, pants, shoes, hat, jacket, uniform, 人物, 角色, 人影, 身影, 人, 男, 女, 他, 她, 它, 某人, 个人, 身体, 脸, 手, 腿, 头, 肖像, 侧面, 躯干, 肩膀, 手指, 脚, 眼睛, 头发, 皮肤, 面部, 五官, 男性, 女性, 儿童, 成人, 站立, 坐着, 行走, 奔跑, 微笑, 服装, 衣服, 背影, 侧影, 轮廓, 剪影, 身材, 体型, 姿态, 动作, 手势
4. ENVIRONMENT FOCUS: Describe only empty spaces, buildings, rooms, landscapes, weather conditions, lighting effects, architectural details
5. If the original text mentions human actions, completely ignore them and focus only on the setting/location

Tasks:
1. Identify required character subjects by matching names exactly, return as "@+subject_name" format
2. Identify required scene subjects by matching names exactly, return as "@+subject_name" format  
3. Generate pure environment English prompts (absolutely zero human references)

JSON Format:
{
  "scene_elements": [
    {
      "scene_index": scene_number,
      "character_subjects": ["@character_name1", "@character_name2"],
      "scene_subjects": ["@scene_name1", "@scene_name2"],
      "scene_prompt": "masterpiece, best quality, ultra detailed, 8k, photorealistic, cinematic lighting, depth of field, uninhabited, no human presence, no human traces, empty of people, no human figures, no human activity, [pure environment description - buildings/nature/objects ONLY, absolutely NO human elements]"
    }
  ]
}`;

  const storyboardsText = ctx.storyboards.map((storyboard, index) =>
    `场景${index + 1}：\n小说片段：${ctx.fragments[index] || ''}\n分镜脚本：${storyboard}`
  ).join('\n\n');

  const characterSubjectNames = ctx.characterSubjects.length > 0
    ? ctx.characterSubjects.map((subject: any) => subject.name).join('、')
    : ctx.characters.map((char: any) => char.name).join('、');
  const sceneSubjectNames = ctx.sceneSubjects.map((subject: any) => subject.name).join('、');

  const userPrompt = `请仔细分析以下分镜场景：

${storyboardsText}

主体识别指南：
已知角色主体：${characterSubjectNames}
已知场景主体：${sceneSubjectNames}

分析步骤：
1. 逐个阅读每个场景的小说片段和分镜脚本
2. 在文本中查找角色主体名称：${characterSubjectNames}
3. 在文本中查找场景主体名称：${sceneSubjectNames}
4. 注意：即使使用代词（他、她、它），也要根据上下文推断具体角色主体
5. 将识别出的主体名称以"@+名称"格式填入对应数组
6. 根据分镜脚本中的场景描述，生成纯环境的英文提示词

请返回完整的JSON格式结果，确保每个场景都有对应的分析。`;

  const result = await APIService.chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], config, Math.min(4000, ctx.storyboards.length * 200));

  const content = result.choices[0].message.content;
  try {
    const parsedContent = JSON.parse(content);
    const elements = parsedContent.scene_elements || [];

    const humanRelatedWords = [
      'person','people','character','man','woman','boy','girl','human','figure','silhouette','someone','anyone','individual','being','body','face','hand','arm','leg','head','portrait','profile','torso','shoulder','finger','foot','eye','hair','skin','male','female','child','adult','teen','elderly','young','old','standing','sitting','walking','running','dancing','jumping','lying','smiling','laughing','crying','angry','happy','sad','expression','clothing','dress','shirt','pants','shoes','hat','jacket','uniform',
      '人物','角色','人影','身影','人','男','女','他','她','它','某人','个人','身体','脸','手','腿','头','肖像','侧面','躯干','肩膀','手指','脚','眼睛','头发','皮肤','面部','五官','男性','女性','儿童','成人','青少年','老人','年轻','年老','站立','坐着','行走','奔跑','跳舞','跳跃','躺着','蹲着','弯腰','微笑','大笑','哭泣','愤怒','开心','悲伤','表情','神情','服装','衣服','裙子','衬衫','裤子','鞋子','帽子','外套','制服','背影','侧影','轮廓','剪影','身材','体型','姿态','动作','手势'
    ];

    elements.forEach((element: any, index: number) => {
      if (element.scene_prompt) {
        let cleanPrompt = element.scene_prompt;
        humanRelatedWords.forEach(word => {
          const regex = new RegExp(`\\b${word}\\b`, 'gi');
          cleanPrompt = cleanPrompt.replace(regex, '');
        });
        cleanPrompt = cleanPrompt.replace(/\s+/g, ' ').replace(/,\s*,/g, ',').trim();
        if (cleanPrompt.length < 50) {
          cleanPrompt = 'masterpiece, best quality, ultra detailed, 8k, photorealistic, cinematic lighting, detailed background, empty environment, atmospheric lighting, uninhabited, no human presence, no human traces, empty of people, no human figures, no human activity';
        } else {
          // 确保所有场景提示词都包含无人场景的强调
          if (!cleanPrompt.includes('uninhabited') && !cleanPrompt.includes('no human')) {
            cleanPrompt = 'uninhabited, no human presence, no human traces, empty of people, no human figures, no human activity, ' + cleanPrompt;
          }
        }
        element.scene_prompt = cleanPrompt;
      }

      // 生成 elements_layout 数组，用于分区控制
      const elementsLayout: any[] = [];
      
      // 添加场景主体（如果存在）
      if (element.scene_subjects && element.scene_subjects.length > 0) {
        element.scene_subjects.forEach((sceneSubject: string, sceneIndex: number) => {
          const name = sceneSubject.replace(/^@/, '');
          elementsLayout.push({
            element_type: 'scene',
            name: name,
            // 场景主体默认铺满画布
            x: 0,
            y: 0,
            width: 1280,
            height: 720
          });
        });
      }
      
      // 添加角色主体（如果存在）
      if (element.character_subjects && element.character_subjects.length > 0) {
        element.character_subjects.forEach((characterSubject: string, charIndex: number) => {
          const name = characterSubject.replace(/^@/, '');
          elementsLayout.push({
            element_type: 'character',
            name: name,
            // 角色主体使用默认位置，后续会在mapElementsToRegionParams中根据主体库信息调整
            x: 200 + charIndex * 100,
            y: 100 + charIndex * 50,
            width: 400,
            height: 400
          });
        });
      }
      
      // 将生成的 elements_layout 添加到元素中
      element.elements_layout = elementsLayout;
    });

    while (elements.length < ctx.storyboards.length) {
      elements.push({
        scene_index: elements.length + 1,
        characters: [],
        scene_prompt: 'masterpiece, best quality, ultra detailed, 8k, photorealistic, cinematic lighting, detailed background, empty environment, uninhabited, no human presence, no human traces, empty of people, no human figures, no human activity'
      });
    }
    if (elements.length > ctx.storyboards.length) {
      elements.splice(ctx.storyboards.length);
    }

    await APIService.saveStoryboardElements(elements);

    const totalCharacters = elements.reduce((total: number, element: any) => {
      return total + (element.characters ? element.characters.length : 0);
    }, 0);

    const scenesWithCharacters = elements.filter((element: any) =>
      element.characters && element.characters.length > 0
    ).length;

    showToast(`分镜元素分析完成！共${elements.length}个场景，识别到${totalCharacters}个角色实例，${scenesWithCharacters}个场景包含角色`);
  } catch (parseError) {
    showToast('分镜元素分析结果解析失败，请重试');
    throw parseError;
  }
}

export async function generateAllImages(ctx: {
  fragments: string[];
  sceneDescriptions: string[];
  currentProject: any;
  setImages: (imgs: string[]) => void;
}) {
  showToast('开始一键生成全部图片，请等待...');
  if (ctx.sceneDescriptions.length === 0 || ctx.sceneDescriptions.every(desc => !desc || desc.trim() === '')) {
    showToast('请先生成画面描述');
    return;
  }

  const config = await APIService.getModelConfig();
  const API_KEY = config.easyaiApiKey;
  if (!API_KEY) {
    throw new Error('EasyAI API Key未配置，请在初始化页面配置');
  }

  const placeholderImages = ctx.fragments.map(() => createPlaceholderSVG());
  ctx.setImages(placeholderImages);

  const updatedImages = [...placeholderImages];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < ctx.fragments.length; i++) {
    try {
      const prompt = ctx.sceneDescriptions[i];
      if (!prompt || prompt.trim() === '') {
        showToast(`第${i + 1}个片段缺少画面描述，跳过`);
        failCount++;
        continue;
      }

      showToast(`正在生成第${i + 1}/${ctx.fragments.length}张图片...`);

      const { width, height } = getDefaultImageConfig(ctx.currentProject);
      const result = await APIService.generateImage(prompt, API_KEY, width, height, '分区控制');
      if (result.data && result.data.length > 0) {
        const imageUrl = result.data[0].url;
        // 保存图片到对应的scene_X.json文件
        await APIService.updateScene(i, {
          images: [imageUrl],
          generation_info: {
            type: '批量生成',
            timestamp: Date.now(),
            prompt: ctx.sceneDescriptions[i] || ''
          }
        });
        updatedImages[i] = safeImageUrl(`${imageUrl}?v=${Date.now()}`);
        successCount++;
        ctx.setImages([...updatedImages]);
      } else {
        failCount++;
      }
      if (i < ctx.fragments.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    } catch (e) {
      failCount++;
    }
  }
  showToast(`一键生成全部图片完成！成功: ${successCount}张，失败: ${failCount}张`);
}

export async function generateArtStyleGuide(ctx: {
  currentProject: any;
  fullStoryContent: string;
}) {
  if (!ctx.currentProject) {
    showToast('请先选择或创建项目');
    return;
  }
  showToast('开始生成美术风格指南...');

  const response = await APIService.generateArtStyleGuide({
    projectType: '短片',
    storyTheme: ctx.fullStoryContent || '悬疑故事',
    targetAudience: '成年观众',
    emotionalTone: '神秘紧张',
    timePeriod: '现代',
    locationStyle: '都市',
    projectName: ctx.currentProject.name
  });

  const styleWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
  if (styleWindow) {
    styleWindow.document.write(`
      <html>
        <head>
          <title>${ctx.currentProject.name} - 美术风格指南</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
            h1 { color: #333; border-bottom: 2px solid #e83e8c; padding-bottom: 10px; }
            pre { background: #f8f9fa; padding: 15px; border-radius: 5px; white-space: pre-wrap; }
            .save-btn { 
              background: #28a745; color: white; border: none; padding: 10px 20px; 
              border-radius: 5px; cursor: pointer; margin-top: 20px; 
            }
          </style>
        </head>
        <body>
          <h1>🎨 ${ctx.currentProject.name} - 美术风格指南</h1>
          <h3>项目信息：</h3>
          <p><strong>项目类型：</strong>短片</p>
          <p><strong>故事主题：</strong>${ctx.fullStoryContent || '悬疑故事'}</p>
          <h3>美术风格指南：</h3>
          <pre>${response.artStyleGuide}</pre>
          <button class="save-btn" onclick="window.close()">关闭</button>
        </body>
      </html>
    `);
  }

  const artStyleGuide = {
    projectId: ctx.currentProject.name,
    projectName: ctx.currentProject.name,
    overallVisualStyle: {
      artisticPosition: '待解析',
      visualReferences: [],
      aestheticConcept: '待解析',
      themeAlignment: '待解析'
    },
    colorScheme: {
      primaryColors: [],
      secondaryColors: [],
      sceneVariations: {},
      emotionalFunction: '待解析',
      colorValues: {}
    },
    compositionAndCinematography: {
      compositionPrinciples: '待解析',
      cameraMovementStyle: '待解析',
      depthOfFieldUsage: '待解析',
      lightingShadowHandling: '待解析'
    },
    characterDesignGuidance: {
      characterStyling: '待解析',
      costumeDesign: '待解析',
      makeupAndHair: '待解析',
      propsDesign: '待解析'
    },
    sceneDesignGuidance: {
      sceneDesignStyle: '待解析',
      setAndPropsRules: '待解析',
      materialAndTexture: '待解析',
      spatialLayering: '待解析'
    },
    technicalImplementation: {
      shootingRequirements: '待解析',
      postColorGrading: '待解析',
      effectsStyleGuide: '待解析',
      qualityControl: response.artStyleGuide
    }
  } as any;

  await APIService.saveArtStyleGuide(artStyleGuide, ctx.currentProject.name);
  showToast(`${ctx.currentProject.name}的美术风格指南已生成并保存！`);
}

export async function generateSceneAudioDesign(ctx: {
  sceneIndex: number;
  sceneSubjects: any[];
  currentProject: any;
}) {
  const sceneSubject = ctx.sceneSubjects[ctx.sceneIndex];
  showToast(`开始为${sceneSubject.name}生成音效设计...`);

  const sceneDesc = sceneSubject.description || sceneSubject.tag || sceneSubject.name;

  const response = await APIService.generateEnvironmentAudioDesign({
    sceneDescription: sceneDesc,
    timeSetting: '夜晚',
    location: '户外',
    weather: '晴朗',
    mood: '神秘',
    duration: '2-3分钟',
    projectName: ctx.currentProject?.name || (() => { throw new Error('Project name is required'); })()
  });

  const audioWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
  if (audioWindow) {
    audioWindow.document.write(`
      <html>
        <head>
          <title>${sceneSubject.name} - 音效设计方案</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
            h1 { color: #333; border-bottom: 2px solid #fd7e14; padding-bottom: 10px; }
            pre { background: #f8f9fa; padding: 15px; border-radius: 5px; white-space: pre-wrap; }
            .save-btn { 
              background: #28a745; color: white; border: none; padding: 10px 20px; 
              border-radius: 5px; cursor: pointer; margin-top: 20px; 
            }
          </style>
        </head>
        <body>
          <h1>🔊 ${sceneSubject.name} - 音效设计方案</h1>
          <h3>场景描述：</h3>
          <p>${sceneDesc}</p>
          <h3>音效设计：</h3>
          <pre>${response.audioDesign}</pre>
          <button class="save-btn" onclick="window.close()">关闭</button>
        </body>
      </html>
    `);
  }

  const sceneId = `scene_${ctx.sceneIndex + 1}`;
  const audioDesign = {
    sceneId,
    sceneName: sceneSubject.name,
    mainEnvironmentAudio: {
      baseAmbient: [],
      volumeLevels: '待解析',
      frequencyRange: '待解析',
      duration: '2-3分钟'
    },
    backgroundAudio: {
      distantSounds: [],
      midRangeSounds: [],
      nearSounds: [],
      volumeBalance: '待解析'
    },
    specialEffects: {
      emotionalAudio: [],
      dramaticTension: [],
      transitions: [],
      storySpecific: []
    },
    technicalSpecs: {
      recordingEquipment: '待解析',
      postProcessing: '待解析',
      stereoPositioning: '待解析',
      mixingRatios: '待解析'
    },
    productionAdvice: {
      sourceMaterials: '待解析',
      recordingTechniques: '待解析',
      postProductionWorkflow: '待解析',
      qualityStandards: response.audioDesign
    }
  } as any;

  const projectName = ctx.currentProject?.name;
    if (!projectName) {
      throw new Error('Project name is required');
    }
    await APIService.saveEnvironmentAudioDesign(sceneId, audioDesign, projectName);
  showToast(`${sceneSubject.name}的音效设计已生成并保存！`);
}

export async function generateSceneDialogue(ctx: {
  sceneIndex: number;
  storyboards: string[];
  sceneDescriptions: string[];
  characters: any[];
  fullStoryContent: string;
  currentProject: any;
}) {
  const storyboard = ctx.storyboards[ctx.sceneIndex];
  const sceneDescription = ctx.sceneDescriptions[ctx.sceneIndex];
  showToast(`开始为分镜${ctx.sceneIndex + 1}生成台词...`);

  const charactersText = ctx.characters.map(c => c.name).join('、');
  const sceneDesc = sceneDescription || storyboard || `分镜${ctx.sceneIndex + 1}`;

  const characterVoices = ctx.characters.map(character => ({
    name: character.name,
    voiceDescription: character.voiceDescription || '',
    voiceFileName: character.voiceFileName || ''
  })).filter((voice: any) => voice.voiceDescription || voice.voiceFileName);

  const response = await APIService.generateSceneDialogue({
    sceneDescription: sceneDesc,
    characters: charactersText,
    storyContext: ctx.fullStoryContent || '短片故事',
    emotionalTone: '自然',
    sceneDuration: '2-3分钟',
    characterVoices: characterVoices,
    projectName: ctx.currentProject?.name || (() => { throw new Error('Project name is required'); })()
  });

  const dialogueWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
  if (dialogueWindow) {
    dialogueWindow.document.write(`
      <html>
        <head>
          <title>分镜${ctx.sceneIndex + 1} - 台词方案</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
            h1 { color: #333; border-bottom: 2px solid #17a2b8; padding-bottom: 10px; }
            pre { background: #f8f9fa; padding: 15px; border-radius: 5px; white-space: pre-wrap; }
            .save-btn { 
              background: #28a745; color: white; border: none; padding: 10px 20px; 
              border-radius: 5px; cursor: pointer; margin-top: 20px; 
            }
          </style>
        </head>
        <body>
          <h1>💬 分镜${ctx.sceneIndex + 1} - 台词方案</h1>
          <h3>场景描述：</h3>
          <p>${sceneDesc}</p>
          <h3>生成的台词：</h3>
          <pre>${response.dialogue}</pre>
          <button class="save-btn" onclick="window.close()">关闭</button>
        </body>
      </html>
    `);
  }

  const sceneId = `scene_${ctx.sceneIndex + 1}`;
  const dialogue = {
    sceneId,
    sceneName: `分镜${ctx.sceneIndex + 1}`,
    mainDialogue: [],
    technicalAnalysis: {
      emotionalFocus: '自然',
      toneAndRhythm: '待分析',
      pausesAndEmphasis: '待分析',
      visualCoordination: '待分析'
    },
    performanceGuidance: {
      innerThoughts: '待分析',
      bodyLanguage: '待分析',
      eyesAndExpression: '待分析',
      characterInteraction: '待分析'
    },
    alternatives: []
  } as any;

  const projectName = ctx.currentProject?.name;
    if (!projectName) {
      throw new Error('Project name is required');
    }
    await APIService.saveSceneDialogue(sceneId, dialogue, projectName);
  showToast(`分镜${ctx.sceneIndex + 1}的台词已生成并保存！`);
}

export async function generateSoundEffect(ctx: {
  sceneIndex: number;
  storyboards: string[];
  sceneDescriptions: string[];
  currentProject: any;
  soundEffects: string[];
  setSoundEffects: (arr: string[]) => void;
  setIsGeneratingSoundEffect: (flag: boolean) => void;
}) {
  try {
    ctx.setIsGeneratingSoundEffect(true);
    const storyboard = ctx.storyboards[ctx.sceneIndex];
    const sceneDescription = ctx.sceneDescriptions[ctx.sceneIndex];
    showToast(`开始为分镜${ctx.sceneIndex + 1}生成音效...`);

    const sceneDesc = sceneDescription || storyboard || `分镜${ctx.sceneIndex + 1}`;

    // 这里应该调用音效生成API
    // const response = await APIService.generateSoundEffect({
    //   sceneDescription: sceneDesc,
    //   projectName: ctx.currentProject?.name || (() => { throw new Error('Project name is required'); })()
    // });

    // 临时模拟音效生成
    await new Promise(resolve => setTimeout(resolve, 2000));
    const mockSoundEffect = `专业音效师提示词：根据场景"${sceneDesc}"生成的环境音效、动作音效和氛围音效组合`;

    const newSoundEffects = [...ctx.soundEffects];
    newSoundEffects[ctx.sceneIndex] = mockSoundEffect;
    ctx.setSoundEffects(newSoundEffects);

    showToast(`分镜${ctx.sceneIndex + 1}的音效已生成！`);
  } catch (error) {
    console.error('Failed to generate sound effect:', error);
    showToast('音效生成失败，请检查网络连接');
  } finally {
    ctx.setIsGeneratingSoundEffect(false);
  }
}

export async function generateCharacterVoiceDesign(ctx: {
  characterIndex: number;
  characters: any[];
  currentProject: any;
}) {
  const character = ctx.characters[ctx.characterIndex];
  showToast(`开始为${character.name}生成音色设计...`);

  const characterInfo = `
角色名称: ${character.name}
性别: ${character.gender}
年龄: ${character.age}
外貌: ${character.appearance}
性格: ${character.personality || '未描述'}
角色定位: ${character.role || '主要角色'}
  `.trim();

  const response = await APIService.generateCharacterVoiceDesign({
    characterInfo,
    sceneContext: '通用场景',
    emotionalState: '正常状态',
    projectName: ctx.currentProject?.name || (() => { throw new Error('Project name is required'); })()
  });

  showToast('正在生成音色示例音频...');
  const sampleText = `大家好，我是${character.name}。${character.personality ? character.personality.substring(0, 50) : '很高兴认识大家。'}`;

  try {
    const audioResponse = await APIService.generateCharacterVoiceAudio(
      character.name.replace(/\s+/g, '_').toLowerCase(),
      sampleText,
      {
        gender: character.gender === '女性' ? 'female' : 'male',
        rate: '+35%',
        pitch: '+0Hz'
      }
    );

    const voiceDesignWindow = window.open('', '_blank', 'width=800,height=700,scrollbars=yes');
    if (voiceDesignWindow) {
      voiceDesignWindow.document.write(`
        <html>
          <head>
            <title>${character.name} - 音色设计方案</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
              h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
              pre { background: #f8f9fa; padding: 15px; border-radius: 5px; white-space: pre-wrap; }
              .audio-section { 
                background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;
                border-left: 4px solid #2196f3;
              }
              .save-btn { 
                background: #28a745; color: white; border: none; padding: 10px 20px; 
                border-radius: 5px; cursor: pointer; margin-top: 20px; margin-right: 10px;
              }
              .play-btn {
                background: #007bff; color: white; border: none; padding: 8px 16px;
                border-radius: 5px; cursor: pointer; margin-right: 10px;
              }
              audio { width: 100%; margin-top: 10px; }
            </style>
          </head>
          <body>
            <h1>🎤 ${character.name} - 音色设计方案</h1>
            
            <div class="audio-section">
              <h3>🔊 音色示例</h3>
              <p><strong>示例文本：</strong>${sampleText}</p>
              <audio controls>
                <source src="http://localhost:1198${audioResponse.audioUrl}" type="audio/mpeg">
                您的浏览器不支持音频播放。
              </audio>
              <br><br>
              <button class="play-btn" onclick="document.querySelector('audio').play()">▶️ 播放</button>
              <button class="play-btn" onclick="document.querySelector('audio').pause()">⏸️ 暂停</button>
            </div>
            
            <h3>📋 音色设计详情</h3>
            <pre>${response.voiceDesign}</pre>
            
            <button class="save-btn" onclick="window.close()">关闭</button>
          </body>
        </html>
      `);
    }

    showToast(`${character.name}的音色设计和音频示例生成完成！`);
  } catch (audioError) {
    console.error('Audio generation failed:', audioError);

    const voiceDesignWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
    if (voiceDesignWindow) {
      voiceDesignWindow.document.write(`
        <html>
          <head>
            <title>${character.name} - 音色设计方案</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
              h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
              pre { background: #f8f9fa; padding: 15px; border-radius: 5px; white-space: pre-wrap; }
              .error-note { background: #fff3cd; padding: 10px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #ffc107; }
              .save-btn { 
                background: #28a745; color: white; border: none; padding: 10px 20px; 
                border-radius: 5px; cursor: pointer; margin-top: 20px; 
              }
            </style>
          </head>
          <body>
            <h1>🎤 ${character.name} - 音色设计方案</h1>
            <div class="error-note">
              ⚠️ 音频生成失败，但音色设计方案已生成。请检查网络连接或稍后重试音频功能。
            </div>
            <pre>${response.voiceDesign}</pre>
            <button class="save-btn" onclick="window.close()">关闭</button>
          </body>
        </html>
      `);
    }

    showToast(`${character.name}的音色设计生成完成（音频生成失败）`);
  }

  const characterId = character.name.replace(/\s+/g, '_').toLowerCase();
  const voiceProfile = {
    characterId,
    characterName: character.name,
    basicTone: {
      pitchRange: '待解析',
      speechRate: 180,
      volumeControl: '中等音量',
      voiceQuality: '清亮'
    },
    emotionalExpression: {
      happy: '音调上扬',
      angry: '音调降低',
      sad: '音调下沉',
      nervous: '音调不稳'
    },
    technicalGuidance: {
      breathingControl: '深呼吸控制',
      pronunciation: '清晰发音',
      emotionalLayers: '层次分明',
      voiceDistinction: '独特音色'
    },
    references: {
      similarCharacters: [],
      recommendedActors: [],
      technicalRequirements: response.voiceDesign
    }
  } as any;

  const projectName = ctx.currentProject?.name;
    if (!projectName) {
      throw new Error('Project name is required');
    }
    await APIService.saveCharacterVoiceDesign(characterId, voiceProfile, projectName);
  showToast(`${character.name}的音色设计已生成并保存！`);
}