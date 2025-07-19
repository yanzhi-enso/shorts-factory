"use client";

import styles from './TabNavigation.module.css';
import { getTabStatus } from 'utils/client/projectValidation';

const TABS = {
  START: 'start',
  SCENES: 'scenes',
  REMAKE: 'remake',
  VIDEO: 'video'
};

const getTabLabel = (tab) => {
  switch (tab) {
    case TABS.START:
      return 'Start';
    case TABS.SCENES:
      return 'Scenes';
    case TABS.REMAKE:
      return 'Remake';
    case TABS.VIDEO:
      return 'Video';
    default:
      return tab;
  }
};

const TabNavigation = ({ activeTab, currentStage, onTabClick }) => {
  const handleTabClick = (tab) => {
    const status = getTabStatus(tab, activeTab, currentStage);
    if (status === 'unlocked' && tab !== activeTab) {
      onTabClick(tab);
    }
  };

  return (
    <div className={styles.container}>
      {Object.values(TABS).map(tab => {
        const status = getTabStatus(tab, activeTab, currentStage);
        return (
          <div
            key={tab}
            className={`${styles.tab} ${styles[status]} ${
              status === 'unlocked' ? styles.clickable : ''
            }`}
            onClick={() => handleTabClick(tab)}
          >
            {getTabLabel(tab)}
          </div>
        );
      })}
    </div>
  );
};

export default TabNavigation;
export { TABS };
