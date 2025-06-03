import React from 'react';
import styles from './ImageGrid.module.css';
import Image from 'next/image';

const ImageGrid = ({ images }) => {
  return (
    <div className={styles.grid}>
      {images.map((imgUrl, index) => (
        <div key={index} className={styles.gridItem}>
          <Image
            src={`https://storage.googleapis.com/shorts-scenes/${imgUrl}`}
            alt={`Scene ${index + 1}`}
            width={200}
            height={350}
            className={styles.image}
          />
        </div>
      ))}
    </div>
  );
};

export default ImageGrid;
