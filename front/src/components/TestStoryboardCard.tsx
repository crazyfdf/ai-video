import React from 'react';

interface TestStoryboardCardProps {
  index: number;
  onGenerateDialogue?: (index: number) => void;
}

export const TestStoryboardCard: React.FC<TestStoryboardCardProps> = ({
  index,
  onGenerateDialogue
}) => {
  return (
    <div style={{ border: '1px solid #ddd', padding: '20px', margin: '10px', borderRadius: '8px' }}>
      <h3>测试分镜卡片 {index + 1}</h3>
      
      {/* 台词生成按钮 */}
      {onGenerateDialogue && (
        <button 
          onClick={() => onGenerateDialogue(index)} 
          style={{ 
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          💬 生成台词
        </button>
      )}
      
      {!onGenerateDialogue && (
        <p style={{ color: '#999' }}>onGenerateDialogue 函数未传递</p>
      )}
    </div>
  );
};