"use client";

import React from 'react';
import styles from './ToggleSwitch.module.css';

const ToggleSwitch = ({ 
  checked = false, 
  onChange, 
  disabled = false, 
  label,
  variant = 'primary',
  showLabel = true 
}) => {
  const handleChange = (e) => {
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <div className={styles.toggleContainer}>
      <label className={`${styles.toggleSwitch} ${styles[variant]}`}>
        <input
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
        />
        <span className={styles.toggleSlider}></span>
      </label>
      {showLabel && (
        <span className={styles.toggleLabel}>
          {label || (checked ? 'Enabled' : 'Disabled')}
        </span>
      )}
    </div>
  );
};

export default ToggleSwitch;
