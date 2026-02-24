/**
 * 提示信息计算工具
 *
 * 计算多画布场景下的重叠提示信息。
 * 注意事项：依赖 DOM 的 getBoundingClientRect。
 * 潜在副作用：读取 DOM 布局信息。
 */
/**
 * 计算多画布提示信息
 *
 * @param list 画布列表
 * @returns 是否多画布与重叠数量
 * @remarks
 * 注意事项：传入空数组会返回 multi=false。
 * 潜在副作用：读取 DOM 布局信息。
 */
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
