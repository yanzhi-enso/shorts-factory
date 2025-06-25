import Image from 'next/image';
import { FaPlus } from 'react-icons/fa';
import { useProjectManager } from 'app/hocs/ProjectManager';
import styles from './ElementImageList.module.css';

const ElementImageBlock = ({ src, onClick }) => {
    return (
        <div className={`${styles.toolBoxBlock} ${!src ? styles.empty : ''}`} onClick={onClick}>
            {src ? (
                <Image
                    src={src}
                    alt='Tool box item'
                    width={100}
                    height={100}
                    className={styles.image}
                />
            ) : (
                <div className={styles.emptyState}>
                    <FaPlus className={styles.plusIcon} />
                </div>
            )}
        </div>
    );
};

const ElementImageList = ({ onAddElementImage }) => {
    const { projectState } = useProjectManager();
    const elementImages = projectState.elementImages || [];

    return (
        <div className={styles.container}>
            {elementImages.map((image) => (
                <ElementImageBlock
                    key={image.id}
                    src={image.gcsUrl}
                    onClick={() => handleImageClick(image)}
                />
            ))}
            <ElementImageBlock src={null} onClick={onAddElementImage} />
        </div>
    );
};

export default ElementImageList;
