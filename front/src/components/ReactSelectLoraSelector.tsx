import React from 'react';
import Select, { SingleValue, StylesConfig } from 'react-select';

interface LoraOption {
  value: string;
  label: string;
  fullPath: string;
}

interface ReactSelectLoraSelectorProps {
  loraList: string[];
  selectedLora: string;
  onLoraChange: (lora: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export const ReactSelectLoraSelector: React.FC<ReactSelectLoraSelectorProps> = ({
  loraList,
  selectedLora,
  onLoraChange,
  isLoading = false,
  placeholder = "搜索或选择LoRA模型...",
  className = ""
}) => {
  // 获取友好的LoRA名称
  const getLoraDisplayName = (lora: string) => {
    return lora.split('\\').pop()?.replace('.safetensors', '') || lora;
  };

  // 转换LoRA列表为选项格式
  const loraOptions: LoraOption[] = [
    {
      value: '',
      label: '不使用LoRA',
      fullPath: ''
    },
    ...loraList.map(lora => ({
      value: lora,
      label: getLoraDisplayName(lora),
      fullPath: lora
    }))
  ];

  // 获取当前选中的选项
  const selectedOption = loraOptions.find(option => option.value === selectedLora) || null;

  // 处理选择变化
  const handleChange = (newValue: SingleValue<LoraOption>) => {
    onLoraChange(newValue?.value || '');
  };

  // 自定义样式
  const customStyles: StylesConfig<LoraOption, false> = {
    control: (provided, state) => ({
      ...provided,
      minHeight: '40px',
      border: state.isFocused ? '2px solid #007bff' : '1px solid #ced4da',
      borderRadius: '6px',
      boxShadow: state.isFocused ? '0 0 0 3px rgba(0, 123, 255, 0.1)' : 'none',
      '&:hover': {
        border: state.isFocused ? '2px solid #007bff' : '1px solid #adb5bd'
      }
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#6c757d',
      fontSize: '14px'
    }),
    singleValue: (provided) => ({
      ...provided,
      color: '#495057',
      fontSize: '14px',
      fontWeight: '500'
    }),
    menu: (provided) => ({
      ...provided,
      zIndex: 9999,
      borderRadius: '6px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      border: '1px solid #e9ecef'
    }),
    menuList: (provided) => ({
      ...provided,
      maxHeight: '300px',
      padding: '4px'
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected 
        ? '#007bff' 
        : state.isFocused 
        ? '#f8f9fa' 
        : 'white',
      color: state.isSelected ? 'white' : '#495057',
      padding: '10px 12px',
      borderRadius: '4px',
      margin: '2px 0',
      cursor: 'pointer',
      fontSize: '13px',
      '&:hover': {
        backgroundColor: state.isSelected ? '#007bff' : '#e9ecef'
      }
    }),
    loadingIndicator: (provided) => ({
      ...provided,
      color: '#007bff'
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      color: '#6c757d',
      '&:hover': {
        color: '#495057'
      }
    }),
    clearIndicator: (provided) => ({
      ...provided,
      color: '#dc3545',
      '&:hover': {
        color: '#c82333'
      }
    })
  };

  // 自定义选项渲染
  const formatOptionLabel = (option: LoraOption) => (
    <div>
      <div style={{ fontWeight: '500', marginBottom: '2px' }}>
        {option.label}
      </div>
      {option.fullPath && (
        <div style={{ 
          fontSize: '11px', 
          color: '#6c757d', 
          fontFamily: 'monospace',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {option.fullPath}
        </div>
      )}
    </div>
  );

  // 自定义过滤函数
  const filterOption = (option: { label: string; data: LoraOption }, inputValue: string) => {
    if (!inputValue) return true;
    const searchTerm = inputValue.toLowerCase();
    const { label, fullPath } = option.data;
    return (
      label.toLowerCase().includes(searchTerm) ||
      fullPath.toLowerCase().includes(searchTerm)
    );
  };

  return (
    <div className={`react-select-lora-selector ${className}`}>
      <div className="lora-selector-header">
        <h4 style={{ margin: '0 0 8px 0', color: '#495057', fontSize: '14px', fontWeight: 'bold' }}>
          LoRA模型选择 (可选):
        </h4>
      </div>

      {/* 当前选择显示 */}
      {selectedLora && (
        <div style={{
          marginBottom: '10px',
          padding: '8px 12px',
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '4px',
          fontSize: '13px'
        }}>
          <span style={{ color: '#155724', fontWeight: '500', marginRight: '8px' }}>
            当前选择:
          </span>
          <span style={{ color: '#155724', fontWeight: 'bold' }}>
            {getLoraDisplayName(selectedLora)}
          </span>
        </div>
      )}

      <Select<LoraOption>
        options={loraOptions}
        value={selectedOption}
        onChange={handleChange}
        placeholder={placeholder}
        isLoading={isLoading}
        isSearchable={true}
        isClearable={true}
        styles={customStyles}
        formatOptionLabel={formatOptionLabel}
        filterOption={filterOption}
        noOptionsMessage={({ inputValue }) => 
          inputValue ? `未找到匹配 "${inputValue}" 的LoRA模型` : '没有可用的LoRA模型'
        }
        loadingMessage={() => '正在加载LoRA列表...'}
        menuPlacement="auto"
        menuPosition="absolute"
        menuPortalTarget={document.body}
        classNamePrefix="lora-select"
      />

      {/* 搜索结果计数 */}
      {!isLoading && (
        <div style={{
          marginTop: '5px',
          fontSize: '11px',
          color: '#007bff',
          fontWeight: '500'
        }}>
          共 {loraList.length} 个LoRA模型可用
        </div>
      )}
    </div>
  );
};