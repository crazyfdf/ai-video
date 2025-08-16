import React, { useState, useMemo } from 'react';

interface EnhancedLoraSelectorProps {
  loraList: string[];
  selectedLora: string;
  onLoraChange: (lora: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export const EnhancedLoraSelector: React.FC<EnhancedLoraSelectorProps> = ({
  loraList,
  selectedLora,
  onLoraChange,
  isLoading = false,
  placeholder = "搜索LoRA模型...",
  className = ""
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // 过滤和排序LoRA列表
  const filteredAndSortedLoras = useMemo(() => {
    if (!searchTerm.trim()) {
      return loraList.map(lora => ({
        fullPath: lora,
        displayName: lora.split('\\').pop()?.replace('.safetensors', '') || lora,
        matchScore: 0
      }));
    }

    const searchLower = searchTerm.toLowerCase();
    
    return loraList
      .map(lora => {
        const displayName = lora.split('\\').pop()?.replace('.safetensors', '') || lora;
        const fullPathLower = lora.toLowerCase();
        const displayNameLower = displayName.toLowerCase();
        
        let matchScore = 0;
        
        // 精确匹配得分最高
        if (displayNameLower === searchLower) matchScore = 100;
        else if (displayNameLower.startsWith(searchLower)) matchScore = 90;
        else if (displayNameLower.includes(searchLower)) matchScore = 80;
        else if (fullPathLower.includes(searchLower)) matchScore = 70;
        
        return {
          fullPath: lora,
          displayName,
          matchScore
        };
      })
      .filter(item => item.matchScore > 0)
      .sort((a, b) => {
        // 先按匹配分数排序，再按字母顺序
        if (b.matchScore !== a.matchScore) {
          return b.matchScore - a.matchScore;
        }
        return a.displayName.localeCompare(b.displayName);
      });
  }, [loraList, searchTerm]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsDropdownOpen(true);
  };

  const handleLoraSelect = (lora: string) => {
    onLoraChange(lora);
    setIsDropdownOpen(false);
    setSearchTerm('');
  };

  const clearSelection = () => {
    onLoraChange('');
    setSearchTerm('');
  };

  const selectedDisplayName = selectedLora 
    ? selectedLora.split('\\').pop()?.replace('.safetensors', '') || selectedLora
    : '';

  return (
    <div className={`enhanced-lora-selector ${className}`}>
      <div className="lora-selector-header">
        <h4>LoRA模型选择 (可选):</h4>
        {selectedLora && (
          <button 
            onClick={clearSelection}
            className="clear-selection-btn"
            title="清除选择"
          >
            ✕
          </button>
        )}
      </div>

      {/* 当前选择显示 */}
      {selectedLora && (
        <div className="current-selection">
          <span className="selection-label">当前选择:</span>
          <span className="selection-value">{selectedDisplayName}</span>
        </div>
      )}

      {/* 搜索输入框 */}
      <div className="search-container">
        <input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleSearchChange}
          onFocus={() => setIsDropdownOpen(true)}
          className="lora-search-input"
          disabled={isLoading}
        />
        <span className="search-icon">🔍</span>
        
        {/* 搜索结果计数 */}
        {searchTerm && (
          <div className="search-results-count">
            找到 {filteredAndSortedLoras.length} 个匹配项
          </div>
        )}
      </div>

      {/* 下拉选项列表 */}
      {isDropdownOpen && (
        <div className="lora-dropdown">
          <div className="dropdown-header">
            <button 
              onClick={() => handleLoraSelect('')}
              className={`dropdown-option ${!selectedLora ? 'selected' : ''}`}
            >
              <span className="option-name">不使用LoRA</span>
            </button>
          </div>
          
          <div className="dropdown-options">
            {isLoading ? (
              <div className="loading-option">
                <span>正在加载LoRA列表...</span>
              </div>
            ) : filteredAndSortedLoras.length === 0 ? (
              <div className="no-results-option">
                <span>未找到匹配的LoRA模型</span>
              </div>
            ) : (
              filteredAndSortedLoras.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleLoraSelect(item.fullPath)}
                  className={`dropdown-option ${selectedLora === item.fullPath ? 'selected' : ''}`}
                >
                  <span className="option-name">{item.displayName}</span>
                  {item.matchScore >= 90 && <span className="match-badge">精确</span>}
                  {item.matchScore >= 80 && item.matchScore < 90 && <span className="match-badge partial">部分</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* 点击外部关闭下拉框 */}
      {isDropdownOpen && (
        <div 
          className="dropdown-overlay" 
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
};