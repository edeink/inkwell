import { useMemo, useState } from 'react';

import { useMindmapController } from '../../context';

import HighlightOverlay from './highlight-overlay';
import styles from './index.module.less';
import ViewportPreview from './viewport-preview';

export type MinimapProps = {
  width?: number;
  height?: number;
};

/**
 * Minimap
 * @param {MinimapProps} props 组件参数
 * @returns {JSX.Element} 小地图组件
 */
export default function Minimap({ width = 200, height = 140 }: MinimapProps) {
  const controller = useMindmapController();
  const [fit, setFit] = useState<{ s: number; ox: number; oy: number }>({ s: 1, ox: 0, oy: 0 });
  const styleMemo = useMemo(
    () => ({ width: `${width}px`, height: `${height}px` }),
    [width, height],
  );
  return (
    <div className={styles.minimap} style={styleMemo}>
      <ViewportPreview controller={controller} width={width} height={height} onFitChange={setFit} />
      <HighlightOverlay controller={controller} fit={fit} width={width} height={height} />
    </div>
  );
}
