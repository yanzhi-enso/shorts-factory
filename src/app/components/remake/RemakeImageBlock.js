import React from 'react';
import styles from './RemakeImageBlock.module.css';
import Image from 'next/image';

const RemakeImageBlock = ({ 
  imageUrl, 
  title, 
  onClick, 
  variant = 'original', // 'original', 'generated', 'empty'
  isEmpty = false 
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick(imageUrl, title, variant);
    }
  };

  const renderContent = () => {
    if (isEmpty || !imageUrl) {
      return (
        <div className={styles.emptyState}>
          <div className={styles.emptyText}>
            {variant === 'generated' ? 'Generate to see result' : 'No image'}
          </div>
        </div>
      );
    }

    return (
      <Image
        src={imageUrl}
        alt={title}
        width={200}
        height={300}
        className={styles.image}
      />
    );
  };

  return (
    <div 
      className={`${styles.imageBlock} ${isEmpty ? styles.empty : ''} ${styles[variant]}`} 
      onClick={handleClick}
    >
      {renderContent()}
    </div>
  );
};

export default RemakeImageBlock;
