import React from 'react';
import '../styles/components.css';

interface DataSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (source: 'file' | 'api') => void;
  title: string;
  description: string;
  fileOptionDescription: string;
  apiOptionDescription: string;
}

const DataSourceModal: React.FC<DataSourceModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  title,
  description,
  fileOptionDescription,
  apiOptionDescription
}) => {
  if (!isOpen) return null;

  const handleSelectFile = () => {
    onSelect('file');
    onClose();
  };

  const handleSelectApi = () => {
    onSelect('api');
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content data-source-modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="modal-body">
          <p className="modal-description">{description}</p>
          
          <div className="data-source-options">
            <div className="data-source-option">
              <button 
                className="data-source-button file-source"
                onClick={handleSelectFile}
              >
                <div className="option-icon">📁</div>
                <div className="option-content">
                  <h4>从最近文件加载</h4>
                  <p>{fileOptionDescription}</p>
                </div>
              </button>
            </div>
            
            <div className="data-source-option">
              <button 
                className="data-source-button api-source"
                onClick={handleSelectApi}
              >
                <div className="option-icon">🔄</div>
                <div className="option-content">
                  <h4>重新生成</h4>
                  <p>{apiOptionDescription}</p>
                </div>
              </button>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose}>
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataSourceModal;