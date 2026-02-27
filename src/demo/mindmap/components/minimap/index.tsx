import { useMemo, useState } from 'react';

import { useMindmapController } from '../../hooks/context';

import HighlightOverlay from './highlight-overlay';
import styles from './index.module.less';
import ViewportPreview from './viewport-preview';

import type { MindmapController } from '../../controller';

export type MinimapProps = {
  width?: number;
  height?: number;
};

type MinimapBaseProps = MinimapProps & {
  controller: MindmapController;
};

/**
 * Minimap
 * @param {MinimapProps} props 组件参数
 * @returns {JSX.Element} 小地图组件
 */
function MinimapBase({ controller, width = 200, height = 140 }: MinimapBaseProps) {
  const [fit, setFit] = useState<{ s: number; ox: number; oy: number }>({ s: 1, ox: 0, oy: 0 });
  const styleMemo = useMemo(
    () => ({ width: `${width}px`, height: `${height}px` }),
    [width, height],
  );
  return (
    <div
      className={styles.minimap}
      style={styleMemo}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <ViewportPreview controller={controller} width={width} height={height} onFitChange={setFit} />
      <HighlightOverlay controller={controller} fit={fit} width={width} height={height} />
    </div>
  );
}

export function MinimapWithController({
  controller,
  width = 200,
  height = 140,
}: MinimapProps & { controller: MindmapController }) {
  return <MinimapBase controller={controller} width={width} height={height} />;
}

export default function Minimap({ width = 200, height = 140 }: MinimapProps) {
  const controller = useMindmapController();
  return <MinimapBase controller={controller} width={width} height={height} />;
}
