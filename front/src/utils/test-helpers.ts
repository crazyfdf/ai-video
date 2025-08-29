import { safeImageUrl, createPlaceholderSVG } from './helpers';

// 测试URL修复功能
export const testUrlFixes = () => {
  console.log('Testing URL fixes...');
  
  // 测试用例
  const testCases = [
    {
      input: '',
      expected: createPlaceholderSVG(),
      description: '空字符串'
    },
    {
      input: 'http://localhost:1198https://example.com/image.jpg',
      expected: 'http://localhost:1198https://example.com/image.jpg',
      description: '重复前缀（应该被修复）'
    },
    {
      input: 'https://example.com/image.jpg',
      expected: 'https://example.com/image.jpg',
      description: '完整HTTPS URL'
    },
    {
      input: '/images/test.jpg',
      expected: 'http://localhost:1198/images/test.jpg',
      description: '相对路径'
    }
  ];
  
  testCases.forEach(testCase => {
    const result = safeImageUrl(testCase.input);
    console.log(`${testCase.description}: ${testCase.input} -> ${result}`);
    
    if (testCase.input.includes('http://localhost:1198http://localhost:1198')) {
      console.log('  ✓ 检测到重复前缀，应该被修复');
    }
  });
  
  console.log('URL fixes test completed');
};