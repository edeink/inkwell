import { useMemo, useState } from 'react';

import HighlightOverlay from './highlight-overlay';
import styles from './index.module.less';
import ViewportPreview from './viewport-preview';

import type Runtime from '@/runtime';

import { MindmapController } from '@/demo/mindmap/controller';
import { Viewport } from '@/demo/mindmap/custom-widget/viewport';

/**
 * MinimapProps
 * @typedef MinimapProps
 * @property {Runtime} runtime Runtime 实例
 * @property {Viewport} viewport 视口
 * @property {MindmapController} controller 控制器
 * @property {number} [width] 宽度
 * @property {number} [height] 高度
 */
export type MinimapProps = {
  runtime: Runtime;
  viewport: Viewport;
  controller: MindmapController;
  width?: number;
  height?: number;
};

/**
 * Minimap
 * @param {MinimapProps} props 组件参数
 * @returns {JSX.Element} 小地图组件
 */
export default function Minimap({
  runtime,
  viewport,
  controller,
  width = 200,
  height = 140,
}: MinimapProps) {
  const [fit, setFit] = useState<{ s: number; ox: number; oy: number }>({ s: 1, ox: 0, oy: 0 });
  const styleMemo = useMemo(
    () => ({ width: `${width}px`, height: `${height}px` }),
    [width, height],
  );
  return (
    <div className={styles.minimap} style={styleMemo}>
      <ViewportPreview
        runtime={runtime}
        viewport={viewport}
        controller={controller}
        width={width}
        height={height}
        onFitChange={setFit}
      />
      <HighlightOverlay
        runtime={runtime}
        controller={controller}
        fit={fit}
        width={width}
        height={height}
      />
    </div>
  );
}
