/**
 * 连线绘制辅助模块（Connection Drawer）
 *
 * 文件用途：
 * - 提供思维导图中节点间连线的几何路径计算（点序列），用于在画布上绘制直线、折线、圆角折线和贝塞尔曲线等风格。
 * - 保持与旧版 `lib/route.ts` 一致的导出接口，确保迁移不影响现有调用方。
 *
 * 主要功能模块：
 * - 类型与选项：`Rect`、`Point`、`ConnectorStyle`、`ConnectorPathOptions`、`DEFAULT_CONNECTOR_OPTIONS`
 * - 基本路径算法：`elbowRoute`（正交折线）、`bezierRoute`（平滑曲线）、`elbowRoundedRoute`（圆角折线）
 * - 统一路径生成：`connectorPath`（基于端点与风格的路径）、`connectorPathFromRects`（基于矩形的路径）
 *
 * 关键函数说明：
 * - `elbowRoute(a, b)`: 生成从矩形 A 到 B 的正交折线路径（起点 → 水平拐点 → 垂直拐点 → 终点）。
 * - `bezierRoute(a, b, samples, margin)`: 生成从矩形 A 到 B 的贝塞尔平滑曲线路径，支持采样点数与边距。
 * - `elbowRoundedRoute(a, b, radius, margin, segments)`: 在拐角处使用圆弧过渡的折线路径，圆角半径与圆弧分段可调。
 * - `connectorPath(sx, sy, tx, ty, options)`: 统一入口，基于端点坐标与风格选项返回路径点序列。
 * - `connectorPathFromRects(a, b, options)`: 统一入口（基于矩形），自动取两矩形的侧边中心作为端点。
 *
 * 使用示例：
 * ```ts
 * import { connectorPathFromRects } from '@/demo/mindmap/helpers/connection-drawer';
 * const a = { x: 10, y: 10, width: 120, height: 40 };
 * const b = { x: 260, y: 180, width: 120, height: 40 };
 * const pts = connectorPathFromRects(a, b, { style: 'elbow' });
 * // 将 pts 依次连线到 Canvas 上即可绘制出连接线
 * ```
 */

export type Rect = { x: number; y: number; width: number; height: number };
export type Point = { x: number; y: number };

/**
 * 连接线风格枚举
 * - Straight: 直线
 * - Elbow: 正交折线
 * - ElbowRounded: 圆角折线
 * - Bezier: 贝塞尔曲线
 */
export const enum ConnectorStyle {
  Straight = 'straight',
  Elbow = 'elbow',
  ElbowRounded = 'elbowRounded',
  Bezier = 'bezier',
}

/**
 * 连接线路径选项
 * - style: 使用的连接风格
 * - samples: 贝塞尔曲线采样点数
 * - margin: 与节点侧边的外扩距离（避免穿透）
 * - elbowRadius: 圆角折线的圆角半径
 * - arcSegments: 圆角折线的圆弧分段数量
 */
export type ConnectorPathOptions = {
  style: ConnectorStyle;
  samples?: number;
  margin?: number;
  elbowRadius?: number;
  arcSegments?: number;
};

/**
 * 计算正交折线（不含圆角）：从左矩形的右侧中心到右矩形的左侧中心
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

/**
 * 计算贝塞尔曲线路径：从左矩形右侧经控制点到右矩形左侧
 */
export function bezierRoute(a: Rect, b: Rect, samples: number = 16, margin: number = 6): Point[] {
  const sx = a.x + a.width + margin;
  const sy = a.y + a.height / 2;
  const tx = b.x - margin;
  const ty = b.y + b.height / 2;
  const dx = tx - sx;
  const strength = Math.max(40, Math.abs(dx) * 0.35);
  let bend = Math.max(20, Math.abs(ty - sy) * 0.25);
  if (Math.abs(ty - sy) < 4) {
    bend = 40;
  }
  const c1x = sx + Math.min(strength, Math.abs(dx) * 0.5);
  const c2x = tx - Math.min(strength, Math.abs(dx) * 0.5);
  const dir = ty >= sy ? 1 : -1;
  const c1y = sy + dir * bend;
  const c2y = ty - dir * bend;
  const pts: Point[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const omt = 1 - t;
    const x =
      omt * omt * omt * sx + 3 * omt * omt * t * c1x + 3 * omt * t * t * c2x + t * t * t * tx;
    const y =
      omt * omt * omt * sy + 3 * omt * omt * t * c1y + 3 * omt * t * t * c2y + t * t * t * ty;
    pts.push({ x, y });
  }
  return pts;
}

/**
 * 计算圆弧上若干采样点
 */
function arcPoints(
  cx: number,
  cy: number,
  r: number,
  startRad: number,
  endRad: number,
  segments: number,
): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = startRad + (endRad - startRad) * t;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

/**
 * 计算圆角折线路径：在折线拐角处使用圆弧过渡
 */
export function elbowRoundedRoute(
  a: Rect,
  b: Rect,
  radius: number = 8,
  margin: number = 6,
  segments: number = 8,
): Point[] {
  const sx = a.x + a.width + margin;
  const sy = a.y + a.height / 2;
  const tx = b.x - margin;
  const ty = b.y + b.height / 2;
  const mx = (sx + tx) / 2;
  const down = ty >= sy;
  const pts: Point[] = [];
  pts.push({ x: sx, y: sy });
  pts.push({ x: mx - radius, y: sy });
  const c1x = mx - radius;
  const c1y = sy + (down ? radius : -radius);
  const arc1 = arcPoints(c1x, c1y, radius, down ? -Math.PI / 2 : Math.PI / 2, 0, segments);
  pts.push(...arc1);
  pts.push({ x: mx, y: down ? sy + radius : sy - radius });
  pts.push({ x: mx, y: down ? ty - radius : ty + radius });
  const c2x = mx - radius;
  const c2y = ty - (down ? radius : -radius);
  const arc2 = arcPoints(c2x, c2y, radius, 0, down ? Math.PI / 2 : -Math.PI / 2, segments);
  pts.push(...arc2);
  pts.push({ x: tx, y: ty });
  return pts;
}

/**
 * 连接线默认选项（只包含风格参数，不含起止锚点）
 */
export const DEFAULT_CONNECTOR_OPTIONS: Readonly<{
  samples: number;
  margin: number;
  elbowRadius: number;
  arcSegments: number;
}> = {
  samples: 18,
  margin: 6,
  elbowRadius: 8,
  arcSegments: 8,
};

/**
 * 基于端点坐标与选项生成路径点序列
 */
export function connectorPath(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  options: ConnectorPathOptions,
): Point[] {
  const opts = { ...DEFAULT_CONNECTOR_OPTIONS, ...options };
  if (opts.style === ConnectorStyle.Straight) {
    const sxx = sx + opts.margin;
    const txx = tx - opts.margin;
    return [
      { x: sxx, y: sy },
      { x: txx, y: ty },
    ];
  }
  if (opts.style === ConnectorStyle.Elbow) {
    const sxx = sx + opts.margin;
    const txx = tx - opts.margin;
    const mx = (sxx + txx) / 2;
    return [
      { x: sxx, y: sy },
      { x: mx, y: sy },
      { x: mx, y: ty },
      { x: txx, y: ty },
    ];
  }
  if (opts.style === ConnectorStyle.ElbowRounded) {
    const sxx = sx + opts.margin;
    const txx = tx - opts.margin;
    const mx = (sxx + txx) / 2;
    const down = ty >= sy;
    const pts: Point[] = [];
    pts.push({ x: sxx, y: sy });
    pts.push({ x: mx - opts.elbowRadius, y: sy });
    const c1x = mx - opts.elbowRadius;
    const c1y = sy + (down ? opts.elbowRadius : -opts.elbowRadius);
    const arc1 = arcPoints(
      c1x,
      c1y,
      opts.elbowRadius,
      down ? -Math.PI / 2 : Math.PI / 2,
      0,
      opts.arcSegments,
    );
    pts.push(...arc1);
    pts.push({ x: mx, y: down ? sy + opts.elbowRadius : sy - opts.elbowRadius });
    pts.push({ x: mx, y: down ? ty - opts.elbowRadius : ty + opts.elbowRadius });
    const c2x = mx - opts.elbowRadius;
    const c2y = ty - (down ? opts.elbowRadius : -opts.elbowRadius);
    const arc2 = arcPoints(
      c2x,
      c2y,
      opts.elbowRadius,
      0,
      down ? Math.PI / 2 : -Math.PI / 2,
      opts.arcSegments,
    );
    pts.push(...arc2);
    pts.push({ x: txx, y: ty });
    return pts;
  }
  // Bezier
  const sxx = sx + opts.margin;
  const txx = tx - opts.margin;
  const dx = txx - sxx;
  const strength = Math.max(40, Math.abs(dx) * 0.35);
  let bend = Math.max(20, Math.abs(ty - sy) * 0.25);
  if (Math.abs(ty - sy) < 4) {
    bend = 40;
  }
  const c1x = sxx + Math.min(strength, Math.abs(dx) * 0.5);
  const c2x = txx - Math.min(strength, Math.abs(dx) * 0.5);
  const dir = ty >= sy ? 1 : -1;
  const c1y = sy + dir * bend;
  const c2y = ty - dir * bend;
  const pts: Point[] = [];
  for (let i = 0; i <= opts.samples; i++) {
    const t = i / opts.samples;
    const omt = 1 - t;
    const x =
      omt * omt * omt * sxx + 3 * omt * omt * t * c1x + 3 * omt * t * t * c2x + t * t * t * txx;
    const y =
      omt * omt * omt * sy + 3 * omt * omt * t * c1y + 3 * omt * t * t * c2y + t * t * t * ty;
    pts.push({ x, y });
  }
  return pts;
}

/**
 * 基于矩形生成路径点序列（重载）
 * - 形式一：`(a, b, options)` 自动按几何确定左右
 * - 形式二：`({ left, right, ...options })` 明确指定左右矩形
 */
export function connectorPathFromRects(a: Rect, b: Rect, options: ConnectorPathOptions): Point[];
export function connectorPathFromRects(
  params: { left: Rect; right: Rect } & ConnectorPathOptions,
): Point[];
export function connectorPathFromRects(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  arg1: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  arg2?: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  arg3?: any,
): Point[] {
  if (arg2 === undefined) {
    const params = arg1 as { left: Rect; right: Rect } & ConnectorPathOptions;
    const opts = { ...DEFAULT_CONNECTOR_OPTIONS, ...params };
    const left = params.left;
    const right = params.right;
    const sx = left.x + left.width;
    const sy = left.y + left.height / 2;
    const tx = right.x;
    const ty = right.y + right.height / 2;
    return connectorPath(sx, sy, tx, ty, opts);
  }
  const a = arg1 as Rect;
  const b = arg2 as Rect;
  const options = (arg3 ?? {}) as ConnectorPathOptions;
  const opts = { ...DEFAULT_CONNECTOR_OPTIONS, ...options };
  const aCenterX = a.x + a.width / 2;
  const bCenterX = b.x + b.width / 2;
  const left = aCenterX <= bCenterX ? a : b;
  const right = left === a ? b : a;
  const sx0 = left.x + left.width;
  const sy0 = left.y + left.height / 2;
  const tx0 = right.x;
  const ty0 = right.y + right.height / 2;
  return connectorPath(sx0, sy0, tx0, ty0, opts);
}
