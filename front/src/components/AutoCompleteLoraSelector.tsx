import React, { useState, useRef, useEffect } from 'react';

interface AutoCompleteLoraSelector {
  loraList: string[];
  selectedLora: string;
  onLoraChange: (lora: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export const AutoCompleteLoraSelector: React.FC<AutoCompleteLoraSelector> = ({
  loraList,
  selectedLora,
  onLoraChange,
  isLoading = false,
  placeholder = "搜索或选择LoRA模型...",
  className = ""
}) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [filteredLoras, setFilteredLoras] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 获取友好的LoRA名称
  const getLoraDisplayName = (lora: string) => {
    return lora.split('\\').pop()?.replace('.safetensors', '') || lora;
  };

  // 更新输入值显示
  useEffect(() => {
    if (selectedLora) {
      setInputValue(getLoraDisplayName(selectedLora));
    } else {
      setInputValue('');
    }
  }, [selectedLora]);

  // 过滤LoRA列表
  useEffect(() => {
    if (!inputValue.trim()) {
      setFilteredLoras(loraList.slice(0, 10)); // 显示前10个
    } else {
      const searchTerm = inputValue.toLowerCase();
      const filtered = loraList
        .filter(lora => {
          const displayName = getLoraDisplayName(lora).toLowerCase();
          const fullPath = lora.toLowerCase();
          return displayName.includes(searchTerm) || fullPath.includes(searchTerm);
        })
        .sort((a, b) => {
          const aName = getLoraDisplayName(a).toLowerCase();
          const bName = getLoraDisplayName(b).toLowerCase();
          const aStartsWith = aName.startsWith(searchTerm);
          const bStartsWith = bName.startsWith(searchTerm);
          
          if (aStartsWith && !bStartsWith) return -1;
          if (!aStartsWith && bStartsWith) return 1;
          return aName.localeCompare(bName);
        })
        .slice(0, 20); // 最多显示20个结果
      
      setFilteredLoras(filtered);
    }
    setHighlightedIndex(-1);
  }, [inputValue, loraList]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setIsDropdownOpen(true);
    
    // 如果输入为空，清除选择
    if (!value.trim()) {
      onLoraChange('');
    }
  };

  const handleInputFocus = () => {
    setIsDropdownOpen(true);
  };

  const handleLoraSelect = (lora: string) => {
    onLoraChange(lora);
    setInputValue(getLoraDisplayName(lora));
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClearSelection = () => {
    onLoraChange('');
    setInputValue('');
    setIsDropdownOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isDropdownOpen) {
      if (e.key === 'ArrowDown') {
        setIsDropdownOpen(true);
        return;
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredLoras.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredLoras.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredLoras.length) {
          handleLoraSelect(filteredLoras[highlightedIndex]);
        } else if (filteredLoras.length === 1) {
          handleLoraSelect(filteredLoras[0]);
        }
        break;
      case 'Escape':
        setIsDropdownOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`autocomplete-lora-selector ${className}`} style={{ position: 'relative' }}>
      <div className="lora-selector-header">
        <h4>LoRA模型选择 (可选):</h4>
        {selectedLora && (
          <button 
            onClick={handleClearSelection}
            className="clear-selection-btn"
            title="清除选择"
            type="button"
          >
            ✕
          </button>
        )}
      </div>

      {/* 当前选择显示 */}
      {selectedLora && (
        <div className="current-selection">
          <span className="selection-label">当前选择:</span>
          <span className="selection-value">{getLoraDisplayName(selectedLora)}</span>
        </div>
      )}

      {/* 搜索输入框 */}
      <div className="autocomplete-container" style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          className="lora-autocomplete-input"
          disabled={isLoading}
          autoComplete="off"
        />
        <span className="search-icon">🔍</span>
        
        {/* 搜索结果计数 */}
        {isDropdownOpen && inputValue && (
          <div className="search-results-count">
            找到 {filteredLoras.length} 个匹配项
          </div>
        )}
      </div>

      {/* 下拉选项列表 */}
      {isDropdownOpen && (
        <div ref={dropdownRef} className="lora-dropdown">
          <div className="dropdown-header">
            <button 
              onClick={() => handleLoraSelect('')}
              className={`dropdown-option ${!selectedLora ? 'selected' : ''}`}
              type="button"
            >
              <span className="option-name">不使用LoRA</span>
            </button>
          </div>
          
          <div className="dropdown-options">
            {isLoading ? (
              <div className="loading-option">
                <span>正在加载LoRA列表...</span>
              </div>
            ) : filteredLoras.length === 0 ? (
              <div className="no-results-option">
                <span>未找到匹配的LoRA模型</span>
              </div>
            ) : (
              filteredLoras.map((lora, index) => (
                <button
                  key={index}
                  onClick={() => handleLoraSelect(lora)}
                  className={`dropdown-option ${
                    selectedLora === lora ? 'selected' : ''
                  } ${highlightedIndex === index ? 'highlighted' : ''}`}
                  type="button"
                >
                  <span className="option-name">{getLoraDisplayName(lora)}</span>
                  <span className="option-path">{lora}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};