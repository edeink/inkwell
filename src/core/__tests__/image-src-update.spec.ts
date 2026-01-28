import { afterEach, describe, expect, it, vi } from 'vitest';

import { createBoxConstraints } from '../base';
import { Image } from '../image';

describe('Image 组件', () => {
  const originalImage = window.Image;

  afterEach(() => {
    window.Image = originalImage;
  });

  it('src 更新后应重新加载并绘制新图片', () => {
    const created: any[] = [];

    class FakeImage {
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      naturalWidth = 10;
      naturalHeight = 10;
      private _src = '';

      set src(v: string) {
        this._src = v;
      }
      get src() {
        return this._src;
      }
    }

    window.Image = class {
      constructor() {
        const img = new FakeImage();
        created.push(img);
        return img as any;
      }
    } as any;

    const drawRect = vi.fn();
    const drawText = vi.fn();
    const drawImage = vi.fn();
    const renderer = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      transform: vi.fn(),
      setTransform: vi.fn(),
      clipRect: vi.fn(),
      setGlobalAlpha: vi.fn(),
      drawRect,
      drawText,
      drawImage,
      getResolution: () => 1,
      getRawInstance: () => null,
    } as any;

    const img = new Image({ src: 'a', width: 20, height: 20 } as any);
    img.createElement(img.data);
    img.layout(createBoxConstraints({ minWidth: 20, maxWidth: 20, minHeight: 20, maxHeight: 20 }));

    expect(created.length).toBe(1);
    expect(created[0].src).toBe('a');

    img.paint({ renderer } as any);
    expect(drawRect).toHaveBeenCalled();
    expect(drawText).not.toHaveBeenCalled();
    expect(drawImage).not.toHaveBeenCalled();

    drawRect.mockClear();
    created[0].onload?.();
    img.paint({ renderer } as any);
    expect(drawImage).toHaveBeenCalledWith(expect.objectContaining({ image: created[0] }));
    expect(drawText).not.toHaveBeenCalled();

    drawRect.mockClear();
    drawText.mockClear();
    drawImage.mockClear();
    img.createElement({ ...(img.data as any), src: 'b' });
    expect(created.length).toBe(2);
    expect(created[1].src).toBe('b');

    img.paint({ renderer } as any);
    expect(drawRect).not.toHaveBeenCalled();
    expect(drawText).not.toHaveBeenCalled();
    expect(drawImage).toHaveBeenCalledWith(expect.objectContaining({ image: created[0] }));

    drawRect.mockClear();
    drawText.mockClear();
    drawImage.mockClear();
    created[0].onload?.();
    img.paint({ renderer } as any);
    expect(drawText).not.toHaveBeenCalled();
    expect(drawImage).toHaveBeenCalledWith(expect.objectContaining({ image: created[0] }));

    created[1].onload?.();
    drawRect.mockClear();
    drawText.mockClear();
    drawImage.mockClear();
    img.paint({ renderer } as any);
    expect(drawRect).not.toHaveBeenCalled();
    expect(drawImage).toHaveBeenCalledWith(expect.objectContaining({ image: created[1] }));
    expect(drawText).not.toHaveBeenCalled();
  });
});
