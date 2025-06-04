"use client";

import styles from './TabNavigation.module.css';

const TABS = {
  START: 'start',
  SCENES: 'scenes'
};

const TabNavigation = ({ activeTab, onTabChange, projectId }) => {
  return (
    <div className={styles.container}>
      <button
        className={`${styles.tab} ${activeTab === TABS.START ? styles.active : ''}`}
        onClick={() => onTabChange(TABS.START)}
      >
        Start
      </button>
      <button
        className={`${styles.tab} ${activeTab === TABS.SCENES ? styles.active : ''}`}
        onClick={() => onTabChange(TABS.SCENES)}
        disabled={!projectId}
      >
        Scenes
      </button>
    </div>
  );
};

export default TabNavigation;
export { TABS };
