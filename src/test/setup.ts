import { vi } from 'vitest';

// 1. 解决 Canvas getContext 未实现警告
// 检查是否已经有实现（防止覆盖 jsdom 可能的未来支持或 canvas 库）
if (!HTMLCanvasElement.prototype.getContext) {
  // @ts-ignore
  HTMLCanvasElement.prototype.getContext = () => null;
}

// 强制覆盖 getContext 以返回 Mock 对象，满足 Inkwell 渲染器需求
// 只有在没有被其他 Mock 覆盖时才应用
interface PatchedCanvasElement extends HTMLCanvasElement {
  _inkwellCtxPatched?: boolean;
}

if (!(HTMLCanvasElement.prototype as unknown as PatchedCanvasElement)._inkwellCtxPatched) {
  (HTMLCanvasElement.prototype as unknown as PatchedCanvasElement)._inkwellCtxPatched = true;
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
    contextId: string,
    options?: unknown,
  ) {
    if (contextId === '2d') {
      return {
        canvas: this,
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        scale: vi.fn(),
        rotate: vi.fn(),
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        beginPath: vi.fn(),
        closePath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        quadraticCurveTo: vi.fn(),
        bezierCurveTo: vi.fn(),
        arc: vi.fn(),
        arcTo: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        clip: vi.fn(),
        setLineDash: vi.fn(),
        fillText: vi.fn(),
        strokeText: vi.fn(),
        measureText: vi.fn(() => ({
          width: 0,
          actualBoundingBoxAscent: 0,
          actualBoundingBoxDescent: 0,
        })),
        drawImage: vi.fn(),
        createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
        createPattern: vi.fn(),
        getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
        putImageData: vi.fn(),
        getTransform: vi.fn(() => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })),
        setTransform: vi.fn(),
        resetTransform: vi.fn(),
        globalAlpha: 1.0,
        globalCompositeOperation: 'source-over',
        strokeStyle: '#000000',
        fillStyle: '#000000',
        lineWidth: 1.0,
        lineCap: 'butt',
        lineJoin: 'miter',
        miterLimit: 10.0,
        font: '10px sans-serif',
        textAlign: 'start',
        textBaseline: 'alphabetic',
        imageSmoothingEnabled: true,
      } as unknown as CanvasRenderingContext2D;
    }
    return originalGetContext.call(this, contextId, options);
  } as unknown as typeof HTMLCanvasElement.prototype.getContext;
}

// 2. 解决 act(...) 警告
// 在某些 React 版本或测试环境中需要显式设置
// @ts-ignore
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// 3. 过滤无关警告
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

const IGNORED_WARNINGS = [
  /Not implemented: HTMLCanvasElement's getContext/, // 虽然我们mock了，但有时jsdom初始化时仍可能报
  /The current testing environment is not configured to support act/, // 以防万一
];

console.warn = (...args) => {
  const msg = args.join(' ');
  if (IGNORED_WARNINGS.some((regex) => regex.test(msg))) {
    return;
  }
  originalConsoleWarn(...args);
};

console.error = (...args) => {
  const msg = args.join(' ');
  if (IGNORED_WARNINGS.some((regex) => regex.test(msg))) {
    return;
  }
  originalConsoleError(...args);
};
