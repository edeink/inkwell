import type { Widget } from '../base';

export interface PipelineStatistics {
  layoutCount: number;
  paintCount: number;
  lastLayoutDuration: number;
  lastPaintDuration: number;
  totalLayoutDuration: number;
  dirtyNodesCount: number;
}

/**
 * PipelineOwner 管理渲染管线的生命周期
 * 负责调度布局、合成、绘制等阶段
 */
export class PipelineOwner {
  // 统计信息
  public stats: PipelineStatistics = {
    layoutCount: 0,
    paintCount: 0,
    lastLayoutDuration: 0,
    lastPaintDuration: 0,
    totalLayoutDuration: 0,
    dirtyNodesCount: 0,
  };

  // 布局脏节点集合
  private _nodesNeedingLayout: Set<Widget> = new Set();

  // 绘制脏节点集合 (暂未完全启用)
  private _nodesNeedingPaint: Set<Widget> = new Set();

  // 外部回调，用于请求新的帧
  public onNeedVisualUpdate?: () => void;

  /**
   * 标记节点需要重新布局
   */
  public scheduleLayoutFor(node: Widget): void {
    if (this._nodesNeedingLayout.has(node)) {
      return;
    }
    this._nodesNeedingLayout.add(node);
    this.requestVisualUpdate();
  }

  /**
   * 标记节点需要重新绘制
   */
  public schedulePaintFor(node: Widget): void {
    if (this._nodesNeedingPaint.has(node)) {
      return;
    }
    this._nodesNeedingPaint.add(node);
    this.requestVisualUpdate();
  }

  /**
   * 请求视觉更新
   */
  public requestVisualUpdate(): void {
    if (this.onNeedVisualUpdate) {
      this.onNeedVisualUpdate();
    }
  }

  /**
   * 获取是否还有待处理的布局任务
   */
  public get hasScheduledLayout(): boolean {
    return this._nodesNeedingLayout.size > 0;
  }

  /**
   * 执行布局更新
   * 按照深度优先的顺序处理脏节点
   */
  public flushLayout(): void {
    if (!this.hasScheduledLayout) {
      return;
    }

    const startTime = performance.now();
    const dirtyNodes = Array.from(this._nodesNeedingLayout);
    this.stats.dirtyNodesCount = dirtyNodes.length;

    // 按照深度排序，确保先处理父节点
    // 深度较小的节点优先（depth 是从根节点 0 开始递增）
    dirtyNodes.sort((a, b) => a.depth - b.depth);

    this._nodesNeedingLayout.clear();

    let layoutCount = 0;
    for (const node of dirtyNodes) {
      // 节点可能在处理前面的节点时已经被重新布局或移除了，检查是否还需要布局
      // 注意：我们的 Widget 系统目前的 isLayoutDirty 标记可能在 markNeedsLayout 时设置
      if (node.isDisposed()) {
        continue;
      }

      // 如果节点已经被重新布局过（例如作为父节点布局的一部分），则可能不再脏了
      // 但如果是 Relayout Boundary，通常需要主动触发布局
      if (node.isLayoutDirty()) {
        layoutCount++;
        // 调用节点的重建与布局逻辑
        // 对于 Relayout Boundary，它通常是布局的起点
        node.performRebuildAndLayout();
      }
    }

    const duration = performance.now() - startTime;
    this.stats.layoutCount += layoutCount;
    this.stats.lastLayoutDuration = duration;
    this.stats.totalLayoutDuration += duration;
  }

  /**
   * 执行绘制更新
   */
  public flushPaint(): void {
    const startTime = performance.now();
    // 暂时只清理集合，实际绘制由 Runtime 统一处理
    // 但我们需要统计绘制次数
    const count = this._nodesNeedingPaint.size;
    this._nodesNeedingPaint.clear();

    const duration = performance.now() - startTime;
    this.stats.paintCount += count;
    this.stats.lastPaintDuration = duration;
  }
}
