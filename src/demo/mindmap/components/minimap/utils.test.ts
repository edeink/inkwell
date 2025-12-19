import { describe, expect, it } from 'vitest';

import { computeViewportRect, fitBounds } from './utils';

describe('minimap utils', () => {
  describe('fitBounds', () => {
    it('computes scale and offsets correctly without padding', () => {
      const bounds = { x: 0, y: 0, width: 100, height: 100 };
      const w = 200;
      const h = 200;
      const fit = fitBounds(bounds, w, h);

      // Scale should be 2 (200/100)
      expect(fit.s).toBe(2);
      // Centered: (200 - 100*2)/2 = 0
      expect(fit.ox).toBe(0);
      expect(fit.oy).toBe(0);
    });

    it('applies padding correctly', () => {
      const bounds = { x: 0, y: 0, width: 100, height: 100 };
      const w = 200;
      const h = 200;
      const padding = 10;
      const fit = fitBounds(bounds, w, h, padding);

      // Content size considered is 100 + 20 = 120
      // Scale = 200 / 120 = 1.666...
      expect(fit.s).toBeCloseTo(1.6666, 3);

      // Check centering
      // Drawn size = 100 * 1.666 = 166.66
      // Remaining space = 200 - 166.66 = 33.33
      // Offset = 33.33 / 2 = 16.66
      expect(fit.ox).toBeCloseTo(16.6666, 3);
      expect(fit.oy).toBeCloseTo(16.6666, 3);
    });

    it('handles non-uniform aspect ratio with padding', () => {
      const bounds = { x: 0, y: 0, width: 100, height: 50 };
      const w = 200;
      const h = 200;
      const padding = 10;
      // Target content size: 120 x 70
      // Scale X: 200/120 = 1.66
      // Scale Y: 200/70 = 2.85
      // Min Scale = 1.66

      const fit = fitBounds(bounds, w, h, padding);
      expect(fit.s).toBeCloseTo(1.6666, 3);

      // Centering Y:
      // Height drawn = 50 * 1.666 = 83.33
      // Space Y = 200 - 83.33 = 116.66
      // OY = 58.33
      expect(fit.oy).toBeCloseTo(58.3333, 3);
    });
  });

  describe('computeViewportRect', () => {
    it('maps viewport to minimap coordinates', () => {
      const containerW = 1000;
      const containerH = 800;
      const viewScale = 1;
      const viewTx = 0;
      const viewTy = 0;

      // Minimap fit (scale 0.1, offset 10)
      const fit = { s: 0.1, ox: 10, oy: 10 };

      const rect = computeViewportRect(containerW, containerH, viewScale, viewTx, viewTy, fit);

      // Viewport 0,0 -> Minimap 10,10
      expect(rect.x).toBe(10);
      expect(rect.y).toBe(10);

      // Width 1000 * 0.1 = 100
      expect(rect.width).toBe(100);
      expect(rect.height).toBe(80);
    });

    it('handles view translation (panning)', () => {
      const containerW = 1000;
      const containerH = 800;
      const viewScale = 1;
      const viewTx = -500; // Panned right by 500 (showing 500 to 1500)
      const viewTy = -400;

      const fit = { s: 0.1, ox: 0, oy: 0 };

      const rect = computeViewportRect(containerW, containerH, viewScale, viewTx, viewTy, fit);

      // View x0 = (0 - (-500))/1 = 500
      // Minimap x = 0 + 500 * 0.1 = 50
      expect(rect.x).toBe(50);
      expect(rect.y).toBe(40);
    });

    it('handles view scaling (zooming)', () => {
      const containerW = 1000;
      const containerH = 800;
      const viewScale = 2; // Zoomed in 2x
      const viewTx = 0;
      const viewTy = 0;

      const fit = { s: 0.1, ox: 0, oy: 0 };

      const rect = computeViewportRect(containerW, containerH, viewScale, viewTx, viewTy, fit);

      // View width in graph coords = 1000 / 2 = 500
      // Minimap width = 500 * 0.1 = 50
      expect(rect.width).toBe(50);
    });
  });
});
