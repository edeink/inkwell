import React from 'react';

import styles from './loading.module.less';

export const DemoLoading: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.spinner} />
      <span>Loading Playground...</span>
    </div>
  );
};
