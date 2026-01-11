import { describe, expect, it } from 'vitest';

import { computeViewportRect, fitBounds } from '../utils';

describe('小地图工具函数', () => {
  describe('fitBounds', () => {
    it('无内边距时应正确计算缩放和偏移', () => {
      const bounds = { x: 0, y: 0, width: 100, height: 100 };
      const w = 200;
      const h = 200;
      const fit = fitBounds(bounds, w, h);

      // 缩放比例应为 2 (200/100)
      expect(fit.s).toBe(2);
      // 居中: (200 - 100*2)/2 = 0
      expect(fit.ox).toBe(0);
      expect(fit.oy).toBe(0);
    });

    it('应正确应用内边距', () => {
      const bounds = { x: 0, y: 0, width: 100, height: 100 };
      const w = 200;
      const h = 200;
      const padding = 10;
      const fit = fitBounds(bounds, w, h, padding);

      // 考虑的内容尺寸为 100 + 20 = 120
      // 缩放比例 = 200 / 120 = 1.666...
      expect(fit.s).toBeCloseTo(1.6666, 3);

      // 检查居中
      // 绘制尺寸 = 100 * 1.666 = 166.66
      // 剩余空间 = 200 - 166.66 = 33.33
      // 偏移量 = 33.33 / 2 = 16.66
      expect(fit.ox).toBeCloseTo(16.6666, 3);
      expect(fit.oy).toBeCloseTo(16.6666, 3);
    });

    it('应正确处理带内边距的非均匀纵横比', () => {
      const bounds = { x: 0, y: 0, width: 100, height: 50 };
      const w = 200;
      const h = 200;
      const padding = 10;
      // 目标内容尺寸: 120 x 70
      // X 轴缩放: 200/120 = 1.66
      // Y 轴缩放: 200/70 = 2.85
      // 最小缩放 = 1.66

      const fit = fitBounds(bounds, w, h, padding);
      expect(fit.s).toBeCloseTo(1.6666, 3);

      // Y 轴居中:
      // 绘制高度 = 50 * 1.666 = 83.33
      // Y 轴空间 = 200 - 83.33 = 116.66
      // OY = 58.33
      expect(fit.oy).toBeCloseTo(58.3333, 3);
    });
  });

  describe('computeViewportRect', () => {
    it('将视口映射到小地图坐标', () => {
      const containerW = 1000;
      const containerH = 800;
      const viewScale = 1;
      const viewTx = 0;
      const viewTy = 0;

      // 小地图适配 (缩放 0.1, 偏移 10)
      const fit = { s: 0.1, ox: 10, oy: 10 };

      const rect = computeViewportRect(
        containerW,
        containerH,
        viewScale,
        viewTx,
        viewTy,
        0,
        0,
        fit,
      );

      // 视口 0,0 -> 小地图 10,10
      expect(rect.x).toBe(10);
      expect(rect.y).toBe(10);

      // 宽度 1000 * 0.1 = 100
      expect(rect.width).toBe(100);
      expect(rect.height).toBe(80);
    });

    it('处理视口平移 (panning)', () => {
      const containerW = 1000;
      const containerH = 800;
      const viewScale = 1;
      const viewTx = -500; // 向右平移 500 (显示 500 到 1500)
      const viewTy = -400;

      const fit = { s: 0.1, ox: 0, oy: 0 };

      const rect = computeViewportRect(
        containerW,
        containerH,
        viewScale,
        viewTx,
        viewTy,
        0,
        0,
        fit,
      );

      // 视口 x0 = (0 - (-500))/1 = 500
      // 小地图 x = 0 + 500 * 0.1 = 50
      expect(rect.x).toBe(50);
      expect(rect.y).toBe(40);
    });

    it('处理视口缩放 (zooming)', () => {
      const containerW = 1000;
      const containerH = 800;
      const viewScale = 2; // 放大 2 倍
      const viewTx = 0;
      const viewTy = 0;

      const fit = { s: 0.1, ox: 0, oy: 0 };

      const rect = computeViewportRect(
        containerW,
        containerH,
        viewScale,
        viewTx,
        viewTy,
        0,
        0,
        fit,
      );

      // 图表坐标系中的视口宽度 = 1000 / 2 = 500
      // 小地图宽度 = 500 * 0.1 = 50
      expect(rect.width).toBe(50);
    });
  });
});
