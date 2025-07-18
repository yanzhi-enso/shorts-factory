import React from 'react';
import styles from './RemakeImageBlock.module.css';
import Image from 'next/image';

const RemakeImageBlock = ({ 
  imageUrl, 
  title, 
  onClick
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick(imageUrl, title);
    }
  };

  const renderContent = () => {
    if (!imageUrl) {
      return (
        <div className={styles.emptyState}>
          <div className={styles.emptyText}>
            No image
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
      className={`${styles.imageBlock} ${!imageUrl ? styles.empty : ''}`} 
      onClick={handleClick}
    >
      {renderContent()}
    </div>
  );
};

export default RemakeImageBlock;
