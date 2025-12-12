import { Side } from './type';

import type { LayoutMode } from './mindmap-layout';
import type { BoxConstraints, Offset, Size, Widget } from '@/core/base';

type NodeRec = { index: number; key: string; size: Size; widget: Widget };
type EdgeRec = { from: string; to: string };

/**
 * 布局引擎（面向对象）
 * 负责根据模式（radial/tree/treeBalanced）计算节点位置与容器尺寸。
 * 对外提供统一入口方法，并将复杂布局拆分到私有方法中，便于维护与扩展。
 */
export class LayoutEngine {
  private readonly spacingX: number;
  private readonly spacingY: number;
  private readonly nodeSpacing?: number;

  constructor(spacingX: number, spacingY: number, nodeSpacing?: number) {
    this.spacingX = spacingX;
    this.spacingY = spacingY;
    this.nodeSpacing = nodeSpacing;
  }

  /**
   * 计算布局
   * @param constraints 布局约束（最大宽高）
   * @param mode 布局模式：radial | tree | treeBalanced
   * @param nodes 节点列表（包含索引、尺寸与 Widget）
   * @param edges 边列表（有向 from -> to）
   * @param side 侧向（tree 模式下使用）
   * @returns 计算后的偏移数组（对应 children 索引）与容器尺寸
   */
  public compute(
    constraints: BoxConstraints,
    mode: LayoutMode,
    nodes: NodeRec[],
    edges: EdgeRec[],
    side: 'left' | 'right',
  ): { offsets: Offset[]; size: Size } {
    if (nodes.length === 0) {
      return {
        offsets: new Array(constraints.maxWidth ? 1 : 0).fill(0).map(() => ({ dx: 0, dy: 0 })),
        size: { width: constraints.minWidth ?? 0, height: constraints.minHeight ?? 0 } as Size,
      };
    }

    const { spacingXOf, nodeSpacingOf } = this.makeSpacingFns();
    const childMap = this.buildChildMap(edges);
    const sizeByKey = new Map(nodes.map((n) => [n.key, n.size] as const));
    const widgetByKey = new Map(nodes.map((n) => [n.key, n.widget] as const));
    const rootKey = this.findRoot(nodes, edges);

    if (mode === 'radial') {
      return this.computeRadial(constraints, nodes);
    }

    const hasPrefSide = mode === 'treeBalanced';
    const prefSideByKey = hasPrefSide
      ? this.collectPrefSide(childMap.get(rootKey) || [], widgetByKey)
      : new Map<string, Side | undefined>();

    const { posByKey } =
      mode === 'treeBalanced'
        ? this.computeBalancedDepthAware(
            sizeByKey,
            childMap,
            rootKey,
            spacingXOf,
            nodeSpacingOf,
            prefSideByKey,
          )
        : this.computeSideTreeDepthAware(
            sizeByKey,
            childMap,
            rootKey,
            spacingXOf,
            nodeSpacingOf,
            side,
          );

    const baseOffsets = nodes.map(() => ({ dx: 0, dy: 0 }));
    for (const n of nodes) {
      const p = posByKey.get(n.key) || { dx: 0, dy: 0 };
      baseOffsets[n.index] = p;
    }

    const { size, centeredOffsets } = this.centerOffsets(constraints, nodes, baseOffsets);
    const final = this.applyAnchors(centeredOffsets, nodes, widgetByKey, childMap);
    return { offsets: final, size };
  }

  /**
   * 生成深度相关的间距函数
   */
  private makeSpacingFns(): {
    spacingXOf: (depth: number) => number;
    nodeSpacingOf: (depth: number) => number;
  } {
    const minPad = 8;
    const baseX = Math.max(this.spacingX, minPad);
    const baseY = Math.max(this.nodeSpacing ?? this.spacingY, minPad);
    const spacingXOf = (depth: number): number => Math.round(baseX * (1 + 0.1 * depth));
    const nodeSpacingOf = (depth: number): number => Math.round(baseY * (1 + 0.1 * depth));
    return { spacingXOf, nodeSpacingOf };
  }

  /**
   * 根据边构建子列表映射
   */
  private buildChildMap(edges: EdgeRec[]): Map<string, string[]> {
    const childMap = new Map<string, string[]>();
    for (const e of edges) {
      const arr = childMap.get(e.from) || [];
      arr.push(e.to);
      childMap.set(e.from, arr);
    }
    return childMap;
  }

  /**
   * 查找根节点（无入边）
   */
  private findRoot(nodes: NodeRec[], edges: EdgeRec[]): string {
    const hasIncoming = new Map<string, boolean>();
    for (const e of edges) {
      hasIncoming.set(e.to, true);
    }
    let rootKey = nodes[0].key;
    for (const n of nodes) {
      if (!hasIncoming.get(n.key)) {
        rootKey = n.key;
        break;
      }
    }
    return rootKey;
  }

  /**
   * 收集首选侧向（仅根的直接子节点）
   */
  private collectPrefSide(
    children: string[],
    widgetByKey: Map<string, Widget>,
  ): Map<string, Side | undefined> {
    const prefSideByKey = new Map<string, Side | undefined>();
    for (const c of children) {
      const w = widgetByKey.get(c) as any;
      const ps = (w?.prefSide ?? undefined) as Side | undefined;
      prefSideByKey.set(c, ps);
    }
    return prefSideByKey;
  }

  /**
   * 居中偏移并计算容器尺寸
   */
  private centerOffsets(
    constraints: BoxConstraints,
    nodes: NodeRec[],
    offsets: Offset[],
  ): { size: Size; centeredOffsets: Offset[] } {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const n of nodes) {
      const off = offsets[n.index];
      const sz = n.size;
      minX = Math.min(minX, off.dx);
      minY = Math.min(minY, off.dy);
      maxX = Math.max(maxX, off.dx + sz.width);
      maxY = Math.max(maxY, off.dy + sz.height);
    }
    const contentW = Math.max(0, maxX - minX);
    const contentH = Math.max(0, maxY - minY);
    const availW =
      Number.isFinite(constraints.maxWidth) && constraints.maxWidth > 0
        ? constraints.maxWidth
        : contentW;
    const availH =
      Number.isFinite(constraints.maxHeight) && constraints.maxHeight > 0
        ? constraints.maxHeight
        : contentH;
    const dx0 = Math.round((availW - contentW) / 2 - minX);
    const dy0 = Math.round((availH - contentH) / 2 - minY);
    const centeredOffsets = offsets.map((p) => ({ dx: p.dx + dx0, dy: p.dy + dy0 }));
    return { size: { width: availW, height: availH } as Size, centeredOffsets };
  }

  /**
   * 应用锚定节点逻辑并增量传播偏移
   */
  private applyAnchors(
    offsets: Offset[],
    nodes: NodeRec[],
    widgetByKey: Map<string, Widget>,
    childMap: Map<string, string[]>,
  ): Offset[] {
    const baseNextByKey = new Map<string, Offset>();
    for (const n of nodes) {
      const base = offsets[n.index] || { dx: 0, dy: 0 };
      baseNextByKey.set(n.key, base);
    }
    const prevByKey = new Map<string, Offset | null>();
    const anchoredByKey = new Map<string, boolean>();
    for (const n of nodes) {
      const w = widgetByKey.get(n.key)! as any;
      const prev =
        typeof w.getAbsolutePosition === 'function' ? (w.getAbsolutePosition() as Offset) : null;
      prevByKey.set(n.key, prev);
      anchoredByKey.set(n.key, !!(w as any).isPositioned);
    }
    const finalNextByKey = new Map<string, Offset>();
    const deltaByKey = new Map<string, Offset>();
    for (const n of nodes) {
      const key = n.key;
      const anchored = anchoredByKey.get(key) ?? false;
      const prev = prevByKey.get(key) ?? null;
      const baseNext = baseNextByKey.get(key)!;
      const next = anchored && prev ? prev : baseNext;
      finalNextByKey.set(key, next);
      const d = prev ? { dx: next.dx - prev.dx, dy: next.dy - prev.dy } : { dx: 0, dy: 0 };
      deltaByKey.set(key, anchored ? { dx: 0, dy: 0 } : d);
    }
    const rootKey = this.findRoot(nodes, this.flattenChildMap(childMap));
    const propagate = (key: string, inherited: Offset): void => {
      const children = childMap.get(key) || [];
      for (const c of children) {
        const anchored = anchoredByKey.get(c) ?? false;
        const prev = prevByKey.get(c) ?? null;
        if (anchored && prev) {
          const cur = finalNextByKey.get(c)!;
          finalNextByKey.set(c, { dx: cur.dx + inherited.dx, dy: cur.dy + inherited.dy });
        }
        const childDelta = deltaByKey.get(c) || { dx: 0, dy: 0 };
        const nextInherited = {
          dx: inherited.dx + childDelta.dx,
          dy: inherited.dy + childDelta.dy,
        };
        propagate(c, nextInherited);
      }
    };
    propagate(rootKey, { dx: 0, dy: 0 });
    const out = nodes.map(() => ({ dx: 0, dy: 0 }));
    for (const n of nodes) {
      out[n.index] = finalNextByKey.get(n.key) || { dx: 0, dy: 0 };
    }
    return out;
  }

  /**
   * 将 childMap 展平成边列表（用于 root 查找）
   */
  private flattenChildMap(childMap: Map<string, string[]>): EdgeRec[] {
    const edges: EdgeRec[] = [];
    for (const [from, arr] of childMap) {
      for (const to of arr) {
        edges.push({ from, to });
      }
    }
    return edges;
  }

  /**
   * Radial 布局计算
   */
  private computeRadial(
    constraints: BoxConstraints,
    nodes: NodeRec[],
  ): { offsets: Offset[]; size: Size } {
    const nodeIndices = nodes.map((n) => n.index);
    const nNodes = nodeIndices.length;
    if (nNodes === 0) {
      return {
        offsets: nodes.map(() => ({ dx: 0, dy: 0 })),
        size: { width: constraints.minWidth, height: constraints.minHeight } as Size,
      };
    }
    const rootIdx = nodeIndices[0];
    const rootSize = nodes.find((n) => n.index === rootIdx)!.size;
    const cx = Math.max(rootSize.width, 120);
    const cy = Math.max(rootSize.height, 60);
    const minThetaDeg = 8;
    const r = Math.max(cx, cy) + 80;
    const n = Math.max(1, nNodes - 1);
    const offsets: Offset[] = nodes.map(() => ({ dx: 0, dy: 0 }));
    const thetaGap = Math.max((2 * Math.PI) / n, (minThetaDeg / 180) * Math.PI);
    for (let k = 1; k < nNodes; k++) {
      const i = nodeIndices[k];
      const ang = thetaGap * (k - 1);
      offsets[i] = { dx: cx / 2 + Math.cos(ang) * r, dy: cy / 2 + Math.sin(ang) * r } as Offset;
    }
    offsets[rootIdx] = { dx: 0, dy: 0 } as Offset;
    const { size, centeredOffsets } = this.centerOffsets(constraints, nodes, offsets);
    return { offsets: centeredOffsets, size };
  }

  /**
   * 侧树布局（深度感知）
   */
  private computeSideTreeDepthAware(
    sizeByKey: Map<string, Size>,
    childMap: Map<string, string[]>,
    rootKey: string,
    spacingXOf: (depth: number) => number,
    nodeSpacingOf: (depth: number) => number,
    side: 'left' | 'right',
  ): { posByKey: Map<string, Offset>; levels: number } {
    const posByKey = new Map<string, Offset>();
    const hFn = this.buildSubtreeHeightDepthAware(sizeByKey, childMap, nodeSpacingOf);
    const levels = this.placeDepthAware(
      posByKey,
      sizeByKey,
      childMap,
      nodeSpacingOf,
      spacingXOf,
      side,
      rootKey,
      0,
      0,
      0,
      hFn,
    );
    return { posByKey, levels: levels + 1 };
  }

  /**
   * 平衡布局（根两侧自动均衡）
   */
  private computeBalancedDepthAware(
    sizeByKey: Map<string, Size>,
    childMap: Map<string, string[]>,
    rootKey: string,
    spacingXOf: (depth: number) => number,
    nodeSpacingOf: (depth: number) => number,
    prefSideByKey: Map<string, Side | undefined>,
  ): { posByKey: Map<string, Offset>; levels: number } {
    const posByKey = new Map<string, Offset>();
    const hFn = this.buildSubtreeHeightDepthAware(sizeByKey, childMap, nodeSpacingOf);
    const rootSize = sizeByKey.get(rootKey) as Size;
    posByKey.set(rootKey, { dx: 0, dy: 0 });
    const children = childMap.get(rootKey) || [];
    const hs = children.map((c) => hFn(c, 1));
    const left: string[] = [];
    const right: string[] = [];
    let leftSum = 0;
    let rightSum = 0;
    for (let i = 0; i < children.length; i++) {
      const c = children[i];
      const pref = prefSideByKey.get(c);
      const h = hs[i];
      if (pref === Side.Left) {
        left.push(c);
        leftSum += h + (left.length > 1 ? nodeSpacingOf(1) : 0);
      } else if (pref === Side.Right) {
        right.push(c);
        rightSum += h + (right.length > 1 ? nodeSpacingOf(1) : 0);
      } else if (leftSum <= rightSum) {
        left.push(c);
        leftSum += h + (left.length > 1 ? nodeSpacingOf(1) : 0);
      } else {
        right.push(c);
        rightSum += h + (right.length > 1 ? nodeSpacingOf(1) : 0);
      }
    }
    const total = children.length;
    if (left.length - right.length > 1) {
      this.rebalance(left, right, prefSideByKey, hFn, 1, Side.Left, left.length - right.length - 1);
    } else if (right.length - left.length > 1) {
      this.rebalance(
        right,
        left,
        prefSideByKey,
        hFn,
        1,
        Side.Right,
        right.length - left.length - 1,
      );
    }
    if (total % 2 === 0 && left.length !== right.length) {
      if (left.length > right.length) {
        this.rebalance(left, right, prefSideByKey, hFn, 1, Side.Left, left.length - right.length);
      } else {
        this.rebalance(right, left, prefSideByKey, hFn, 1, Side.Right, right.length - left.length);
      }
    }
    const leftBlockH = left.reduce(
      (acc, k, idx) => acc + hFn(k, 1) + (idx > 0 ? nodeSpacingOf(1) : 0),
      0,
    );
    const rightBlockH = right.reduce(
      (acc, k, idx) => acc + hFn(k, 1) + (idx > 0 ? nodeSpacingOf(1) : 0),
      0,
    );
    let yLeft = (rootSize.height - leftBlockH) / 2;
    let yRight = (rootSize.height - rightBlockH) / 2;
    let levels = 0;
    for (const c of left) {
      const chH = hFn(c, 1);
      const cx = 0 - (rootSize.width + spacingXOf(0));
      const cy = yLeft;
      levels = Math.max(
        levels,
        this.placeBalancedDepthAware(
          posByKey,
          sizeByKey,
          childMap,
          nodeSpacingOf,
          spacingXOf,
          Side.Left,
          c,
          cx,
          cy,
          1,
          hFn,
        ),
      );
      yLeft += chH + nodeSpacingOf(1);
    }
    for (const c of right) {
      const chH = hFn(c, 1);
      const cx = 0 + (rootSize.width + spacingXOf(0));
      const cy = yRight;
      levels = Math.max(
        levels,
        this.placeBalancedDepthAware(
          posByKey,
          sizeByKey,
          childMap,
          nodeSpacingOf,
          spacingXOf,
          Side.Right,
          c,
          cx,
          cy,
          1,
          hFn,
        ),
      );
      yRight += chH + nodeSpacingOf(1);
    }
    return { posByKey, levels: levels + 1 };
  }

  /**
   * 重平衡左右子列表
   */
  private rebalance(
    from: string[],
    to: string[],
    prefSideByKey: Map<string, Side | undefined>,
    hFn: (k: string, d: number) => number,
    depth: number,
    prefSide: Side,
    need: number,
  ): void {
    const candidates = from
      .map((c) => ({ c, h: hFn(c, depth), pref: prefSideByKey.get(c) }))
      .sort((a, b) => a.h - b.h);
    const toMove: string[] = [];
    for (const item of candidates) {
      if (toMove.length >= need) {
        break;
      }
      if (item.pref !== prefSide) {
        toMove.push(item.c);
      }
    }
    if (toMove.length < need) {
      for (const item of candidates) {
        if (toMove.length >= need) {
          break;
        }
        if (!toMove.includes(item.c)) {
          toMove.push(item.c);
        }
      }
    }
    const keep = from.filter((c) => !toMove.includes(c));
    from.length = 0;
    from.push(...keep);
    to.push(...toMove);
  }

  /**
   * 构建子树高度函数（深度感知）
   */
  private buildSubtreeHeightDepthAware(
    sizeByKey: Map<string, Size>,
    childMap: Map<string, string[]>,
    nodeSpacingOf: (depth: number) => number,
  ) {
    const cache = new Map<string, number>();
    const fn = (key: string, depth: number): number => {
      const hit = cache.get(`${key}@${depth}`);
      if (hit !== undefined) {
        return hit;
      }
      const size = sizeByKey.get(key) as Size;
      const children = childMap.get(key) || [];
      if (!children.length) {
        cache.set(`${key}@${depth}`, size.height);
        return size.height;
      }
      let sum = 0;
      for (let i = 0; i < children.length; i++) {
        sum += fn(children[i], depth + 1);
        if (i < children.length - 1) {
          sum += nodeSpacingOf(depth + 1);
        }
      }
      const h = Math.max(sum, size.height);
      cache.set(`${key}@${depth}`, h);
      return h;
    };
    return fn;
  }

  /**
   * 深度感知放置（侧树）
   */
  private placeDepthAware(
    posByKey: Map<string, Offset>,
    sizeByKey: Map<string, Size>,
    childMap: Map<string, string[]>,
    nodeSpacingOf: (depth: number) => number,
    spacingXOf: (depth: number) => number,
    side: 'left' | 'right',
    key: string,
    x: number,
    y: number,
    depth: number,
    hFn: (k: string, d: number) => number,
  ): number {
    const size = sizeByKey.get(key) as Size;
    posByKey.set(key, { dx: x, dy: y });
    const children = childMap.get(key) || [];
    if (!children.length) {
      return depth;
    }
    const dir = side === 'right' ? 1 : -1;
    const hs = children.map((c) => hFn(c, depth + 1));
    const blockH =
      hs.reduce((a, b) => a + b, 0) + nodeSpacingOf(depth + 1) * Math.max(0, children.length - 1);
    let yStart = y + (size.height - blockH) / 2;
    let levels = depth;
    for (let i = 0; i < children.length; i++) {
      const c = children[i];
      const cx = x + dir * (size.width + spacingXOf(depth));
      const cy = yStart;
      levels = Math.max(
        levels,
        this.placeDepthAware(
          posByKey,
          sizeByKey,
          childMap,
          nodeSpacingOf,
          spacingXOf,
          side,
          c,
          cx,
          cy,
          depth + 1,
          hFn,
        ),
      );
      yStart += hs[i] + nodeSpacingOf(depth + 1);
    }
    return levels;
  }

  /**
   * 深度感知放置（平衡）
   */
  private placeBalancedDepthAware(
    posByKey: Map<string, Offset>,
    sizeByKey: Map<string, Size>,
    childMap: Map<string, string[]>,
    nodeSpacingOf: (depth: number) => number,
    spacingXOf: (depth: number) => number,
    side: Side,
    key: string,
    x: number,
    y: number,
    depth: number,
    hFn: (k: string, d: number) => number,
  ): number {
    const size = sizeByKey.get(key) as Size;
    posByKey.set(key, { dx: x, dy: y });
    const children = childMap.get(key) || [];
    if (!children.length) {
      return depth;
    }
    const dir = side === Side.Right ? 1 : -1;
    const hs = children.map((c) => hFn(c, depth + 1));
    const blockH =
      hs.reduce((a, b) => a + b, 0) + nodeSpacingOf(depth + 1) * Math.max(0, children.length - 1);
    let yStart = y + (size.height - blockH) / 2;
    let levels = depth;
    for (let i = 0; i < children.length; i++) {
      const c = children[i];
      const cx = x + dir * (size.width + spacingXOf(depth));
      const cy = yStart;
      levels = Math.max(
        levels,
        this.placeBalancedDepthAware(
          posByKey,
          sizeByKey,
          childMap,
          nodeSpacingOf,
          spacingXOf,
          side,
          c,
          cx,
          cy,
          depth + 1,
          hFn,
        ),
      );
      yStart += hs[i] + nodeSpacingOf(depth + 1);
    }
    return levels;
  }
}
