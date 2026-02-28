/**
 * Devtools Loading 组件
 *
 * 用于懒加载 Devtools 时的过渡提示。
 */
import React from 'react';

import styles from './index.module.less';

export const DevToolsLoading = () => {
  return (
    <div className={styles.loading}>
      <div className={styles.spinner} />
      <span>DevTools Loading...</span>
    </div>
  );
};
