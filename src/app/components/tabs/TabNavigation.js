"use client";

import styles from './TabNavigation.module.css';

const TABS = {
  START: 'start',
  SCENES: 'scenes',
  REMAKE: 'remake',
  VIDEO: 'video'
};

const TabNavigation = ({ activeTab, unlockedTabs }) => {
  return (
    <div className={styles.container}>
      <div
        className={`${styles.tab} ${activeTab === TABS.START ? styles.active : ''} ${unlockedTabs.includes(TABS.START) ? styles.unlocked : styles.locked}`}
      >
        Start
      </div>
      <div
        className={`${styles.tab} ${activeTab === TABS.SCENES ? styles.active : ''} ${unlockedTabs.includes(TABS.SCENES) ? styles.unlocked : styles.locked}`}
      >
        Scenes
      </div>
      <div
        className={`${styles.tab} ${activeTab === TABS.REMAKE ? styles.active : ''} ${unlockedTabs.includes(TABS.REMAKE) ? styles.unlocked : styles.locked}`}
      >
        Remake
      </div>
      <div
        className={`${styles.tab} ${activeTab === TABS.VIDEO ? styles.active : ''} ${unlockedTabs.includes(TABS.VIDEO) ? styles.unlocked : styles.locked}`}
      >
        Video
      </div>
    </div>
  );
};

export default TabNavigation;
export { TABS };
