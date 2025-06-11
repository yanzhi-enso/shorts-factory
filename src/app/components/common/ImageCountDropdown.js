"use client";

import styles from './ImageCountDropdown.module.css';

const ImageCountDropdown = ({ 
  value = 1, 
  onChange, 
  disabled = false,
  label = "Images"
}) => {
  const options = [1, 2, 3, 4, 5];

  const handleChange = (e) => {
    const newValue = parseInt(e.target.value, 10);
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <div className={styles.dropdown}>
      <select 
        value={value} 
        onChange={handleChange}
        disabled={disabled}
        className={styles.select}
      >
        {options.map(option => (
          <option key={option} value={option}>
            {option} {option === 1 ? 'Image' : 'Images'}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ImageCountDropdown;
