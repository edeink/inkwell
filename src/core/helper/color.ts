export function parseColor(color: string): [number, number, number, number] {
  if (!color) {
    return [0, 0, 0, 0];
  }
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (match) {
    return [
      parseInt(match[1], 10),
      parseInt(match[2], 10),
      parseInt(match[3], 10),
      match[4] ? parseFloat(match[4]) : 1,
    ];
  }
  return [0, 0, 0, 0];
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function colorToString(c: [number, number, number, number]): string {
  return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${c[3].toFixed(3)})`;
}

export function lerpColor(
  current: [number, number, number, number],
  target: [number, number, number, number],
  speed: number,
): [number, number, number, number] {
  return [
    lerp(current[0], target[0], speed),
    lerp(current[1], target[1], speed),
    lerp(current[2], target[2], speed),
    lerp(current[3], target[3], speed),
  ];
}

export function isColorClose(
  a: [number, number, number, number],
  b: [number, number, number, number],
  threshold: number = 0.1,
  alphaThreshold: number = 0.005,
): boolean {
  const diff = [a[0] - b[0], a[1] - b[1], a[2] - b[2], a[3] - b[3]];
  return (
    Math.abs(diff[0]) < threshold &&
    Math.abs(diff[1]) < threshold &&
    Math.abs(diff[2]) < threshold &&
    Math.abs(diff[3]) < alphaThreshold
  );
}
