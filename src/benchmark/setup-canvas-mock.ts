type MockGradient = { addColorStop: (stop: number, color: string) => void };

function createMock2dContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const gradient: MockGradient = { addColorStop: () => {} };
  const ctx: Record<string | symbol, unknown> = {
    canvas,
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arcTo: () => {},
    arc: () => {},
    rect: () => {},
    clip: () => {},
    clearRect: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    fill: () => {},
    stroke: () => {},
    setTransform: () => {},
    resetTransform: () => {},
    scale: () => {},
    translate: () => {},
    rotate: () => {},
    transform: () => {},
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    drawImage: () => {},
    fillText: () => {},
    strokeText: () => {},
    measureText: () => ({
      width: 10,
      actualBoundingBoxAscent: 10,
      actualBoundingBoxDescent: 2,
    }),
    filter: 'none',
    globalAlpha: 1,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    font: '',
    textBaseline: 'alphabetic',
    textAlign: 'start',
  };
  return new Proxy(ctx, {
    get: (target, prop) => {
      if (prop === 'canvas') {
        return canvas as unknown;
      }
      const v = target[prop];
      if (v !== undefined) {
        return v;
      }
      return () => {};
    },
    set: (target, prop, value) => {
      target[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string) {
  if (type !== '2d') {
    return null;
  }
  return createMock2dContext(this);
} as unknown as HTMLCanvasElement['getContext'];

if (!('requestAnimationFrame' in globalThis)) {
  (
    globalThis as unknown as { requestAnimationFrame: (cb: (t: number) => void) => number }
  ).requestAnimationFrame = (cb: (t: number) => void) =>
    window.setTimeout(() => cb(performance.now()), 16);
}
