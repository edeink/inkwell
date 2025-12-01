export function computePromptInfo(list: Array<{ canvas: HTMLCanvasElement }>): {
  multi: boolean;
  overlapCount: number;
} {
  const multi = list.length > 1;
  let overlapCount = 0;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i].canvas.getBoundingClientRect();
      const b = list[j].canvas.getBoundingClientRect();
      const w = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const h = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      if (w > 0 && h > 0) {
        overlapCount++;
      }
    }
  }
  return { multi, overlapCount };
}
