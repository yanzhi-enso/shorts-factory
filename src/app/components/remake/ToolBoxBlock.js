import React from 'react';
import Image from 'next/image';
import { FaPlus } from 'react-icons/fa';
import styles from './ToolBoxBlock.module.css';

const ToolBoxBlock = ({ 
  src, 
  onClick 
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const renderContent = () => {
    if (!src) {
      return (
        <div className={styles.emptyState}>
          <FaPlus className={styles.plusIcon} />
        </div>
      );
    }

    return (
      <Image
        src={src}
        alt="Tool box item"
        width={100}
        height={100}
        className={styles.image}
      />
    );
  };

  return (
    <div 
      className={`${styles.toolBoxBlock} ${!src ? styles.empty : ''}`} 
      onClick={handleClick}
    >
      {renderContent()}
    </div>
  );
};

export default ToolBoxBlock;
