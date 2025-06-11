"use client";

import styles from './Dropdown.module.css';

const Dropdown = ({ 
  value, 
  onChange, 
  disabled = false,
  options = [],
  placeholder = "Select..."
}) => {
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
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Dropdown;
