/**
 * 在文本布局场景下批量创建 count 个绝对定位的文本节点，测量构建、布局与绘制耗时。
 */
export function detPos(i: number, W: number, H: number): { x: number; y: number } {
  const xr = Math.max(1, W - 100);
  const yr = Math.max(1, H - 20);
  const x = (i * 9301 + 49297) % xr;
  const y = (i * 23333 + 19211) % yr;
  return { x, y };
}
