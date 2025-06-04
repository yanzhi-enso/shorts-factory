import React from 'react';
import styles from './RemakeImageBlock.module.css';
import Image from 'next/image';

const RemakeImageBlock = ({ imageUrl, title, onClick }) => {
  const handleClick = () => {
    if (onClick) {
      onClick(imageUrl, title);
    }
  };

  return (
    <div className={styles.imageBlock} onClick={handleClick}>
      <Image
        src={`https://storage.googleapis.com/shorts-scenes/${imageUrl}`}
        alt={title}
        width={200}
        height={300}
        className={styles.image}
      />
    </div>
  );
};

export default RemakeImageBlock;
