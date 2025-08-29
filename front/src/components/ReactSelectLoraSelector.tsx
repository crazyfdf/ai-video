import React, { useEffect, useMemo, useState } from 'react';
import Select, { MultiValue, StylesConfig } from 'react-select';

interface LoraOption {
  value: string;
  label: string;
  fullPath: string;
}

interface SelectedItem extends LoraOption {
  strength: number; // 0 - 2, default 1
}

interface ReactSelectLoraSelectorProps {
  loraList: string[];
  selectedLora: string; // 兼容旧版：单个或多选格式字符串
  onLoraChange: (lora: string) => void; // 返回格式："<lora:path:1.00>,<lora:path2:0.75>"
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

  // 解析传入的selectedLora字符串，支持以下格式：
  // 1) 空字符串 => 无选择
  // 2) 旧版单选："path/to/model.safetensors"
  // 3) 新版多选："<lora:path1:1.00>,<lora:path2:0.75>"
  const parseSelectedString = (value: string): SelectedItem[] => {
    if (!value) return [];

    const items: SelectedItem[] = [];

    // 新版格式全量解析
    const re = /<\s*lora\s*:\s*([^:>]+)\s*:\s*([0-9]+(?:\.[0-9]+)?)\s*>/gi;
    let match: RegExpExecArray | null;
    while ((match = re.exec(value)) !== null) {
      const path = match[1].trim();
      const strength = Math.max(0, Math.min(2, parseFloat(match[2])));
      items.push({ value: path, fullPath: path, label: getLoraDisplayName(path), strength: isFinite(strength) ? strength : 1 });
    }

    if (items.length > 0) return items;

    // 兼容：若不是新版格式，则按单个路径处理
    const path = value.trim();
    if (path) {
      return [{ value: path, fullPath: path, label: getLoraDisplayName(path), strength: 1 }];
    }
    return [];
  };

  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>(() => parseSelectedString(selectedLora));

  // 当上层传入的selectedLora变化时，同步内部state
  useEffect(() => {
    setSelectedItems(parseSelectedString(selectedLora));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLora]);

  // 转换LoRA列表为选项格式（在多选模式下，"不使用LoRA"作为清空选项）
  const loraOptions: LoraOption[] = useMemo(() => ([
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
  ]), [loraList]);

  // 由所选items映射为react-select的多选值
  const selectedValues: LoraOption[] = useMemo(() => {
    const set = new Set(selectedItems.map(i => i.value));
    return loraOptions.filter(opt => opt.value && set.has(opt.value));
  }, [selectedItems, loraOptions]);

  // 格式化输出字符串："<lora:path:1.00>,<lora:path2:0.75>"
  const buildOutputString = (items: SelectedItem[]) => {
    if (!items || items.length === 0) return '';
    return items
      .map(i => `<lora:${i.value}:${(Math.round(i.strength * 100) / 100).toFixed(2)}>`)
      .join(',');
  };

  // 处理选择变化
  const handleChange = (newValue: MultiValue<LoraOption>) => {
    const includesClear = newValue.some(v => v.value === '');
    if (includesClear) {
      setSelectedItems([]);
      onLoraChange('');
      return;
    }

    const next: SelectedItem[] = [];
    const currentMap = new Map(selectedItems.map(i => [i.value, i] as const));
    newValue.forEach(opt => {
      const existed = currentMap.get(opt.value);
      if (existed) {
        next.push({ ...existed });
      } else {
        next.push({ value: opt.value, fullPath: opt.fullPath, label: opt.label, strength: 1 });
      }
    });

    setSelectedItems(next);
    onLoraChange(buildOutputString(next));
  };

  // 强度修改
  const updateStrength = (value: string, strength: number) => {
    const s = Math.max(0, Math.min(2, Number.isFinite(strength) ? strength : 1));
    const next = selectedItems.map(i => i.value === value ? { ...i, strength: s } : i);
    setSelectedItems(next);
    onLoraChange(buildOutputString(next));
  };

  // 移除某个选择
  const removeItem = (value: string) => {
    const next = selectedItems.filter(i => i.value !== value);
    setSelectedItems(next);
    onLoraChange(buildOutputString(next));
  };

  // 自定义样式（多选）
  const customStyles: StylesConfig<LoraOption, true> = {
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
          LoRA模型选择 (可多选):
        </h4>
      </div>

      <Select<LoraOption, true>
        options={loraOptions}
        value={selectedValues}
        onChange={handleChange}
        placeholder={placeholder}
        isLoading={isLoading}
        isSearchable={true}
        isClearable={true}
        isMulti={true}
        styles={customStyles}
        formatOptionLabel={formatOptionLabel}
        filterOption={filterOption}
        noOptionsMessage={({ inputValue }) => 
          inputValue ? `未找到匹配 "${inputValue}" 的LoRA模型` : '没有可用的LoRA模型'
        }
        loadingMessage={() => '正在加载LoRA列表...'}
        menuPlacement="auto"
        menuPosition="absolute"
        menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
        classNamePrefix="lora-select"
      />

      {/* 已选择项 + 强度设置 */}
      {selectedItems.length > 0 && (
        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {selectedItems.map(item => (
            <div key={item.value} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 10px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: '6px'
            }}>
              <span style={{ minWidth: 160, fontWeight: 500 }}>{item.label}</span>
              <input
                type="range"
                min={0}
                max={2}
                step={0.01}
                value={item.strength}
                onChange={(e) => updateStrength(item.value, parseFloat(e.target.value))}
                style={{ flex: 1 }}
              />
              <input
                type="number"
                min={0}
                max={2}
                step={0.01}
                value={item.strength.toFixed(2)}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  updateStrength(item.value, isNaN(v) ? 1 : v);
                }}
                style={{ width: 80, textAlign: 'right' }}
              />
              <button
                type="button"
                onClick={() => removeItem(item.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#dc3545',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
                title="移除该LoRA"
              >
                ✕
              </button>
            </div>
          ))}
          <div style={{ fontSize: 12, color: '#6c757d' }}>
            输出格式示例：{buildOutputString(selectedItems)}
          </div>
        </div>
      )}

      {/* 搜索结果计数 */}
      {!isLoading && (
        <div style={{
          marginTop: '8px',
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