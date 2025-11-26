import { forwardRef } from "react";

import styles from "./index.module.less";

export default forwardRef<HTMLDivElement, {}>(function StageContainer(_props, ref) {
  return <div id="stage" ref={ref as any} className={styles.stage} />;
});