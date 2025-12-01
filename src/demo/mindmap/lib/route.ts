export type Rect = { x: number; y: number; width: number; height: number };
export type Point = { x: number; y: number };

/**
 * 连接线路由算法
 * 提供简单的折线路由（elbow）算法，用于在矩形 A 与矩形 B 之间生成
 * 一条水平-垂直折线的路径点列表，适合思维导图的正交连线风格。
 * 计算矩形 A 到矩形 B 的折线路由点
 * @param a 起点矩形（一般为源节点）
 * @param b 终点矩形（一般为目标节点）
 * @returns 路径点数组，包含起点、两个转折点与终点
 * @example
 * const pts = elbowRoute({x:10,y:10,width:50,height:30},{x:200,y:40,width:80,height:46})
 */
export function elbowRoute(a: Rect, b: Rect): Point[] {
  const sx = a.x + a.width;
  const sy = a.y + a.height / 2;
  const tx = b.x;
  const ty = b.y + b.height / 2;
  const mx = (sx + tx) / 2;
  return [
    { x: sx, y: sy },
    { x: mx, y: sy },
    { x: mx, y: ty },
    { x: tx, y: ty },
  ];
}
