import { forwardRef } from 'react';

import styles from './index.module.less';

export default forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function StageContainer(props, ref) {
    return <div id="stage" ref={ref} className={styles.stage} {...props} />;
  },
);
