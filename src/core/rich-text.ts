import { Widget } from './base';

import type { BoxConstraints, Offset, Size, WidgetProps } from './base';

export interface RichTextProps extends WidgetProps {
  spacing?: number;
  runSpacing?: number;
  alignBaseline?: boolean;
}

/**
 * RichText：行内排版容器。
 *
 * 设计目标（对齐 Flutter 的职责划分）：
 * - Wrap：负责块级流式布局（更像“多行的块布局容器”）
 * - RichText：负责行内布局，把一组“行内盒子”排进多行并提供基线对齐
 *
 * 实现策略：
 * - 子组件使用“无界宽度”测量（maxWidth = Infinity），避免 Text 自己内部换行，
 *   从而让换行决策由 RichText 统一完成。
 * - 以按行贪心排版为主，支持 runSpacing，并可选基线对齐。
 */
export class RichText extends Widget<RichTextProps> {
  spacing: number = 0;
  runSpacing: number = 0;
  alignBaseline: boolean = true;

  private _childOffsets: Float32Array | null = null;
  private _childBaselines: Float32Array | null = null;
  private _childLineIndex: Uint32Array | null = null;

  private _lineTops: Float32Array | null = null;
  private _lineAscents: Float32Array | null = null;
  private _lineDescents: Float32Array | null = null;

  constructor(data: RichTextProps) {
    super(data);
    this.initRichTextProperties(data);
  }

  private initRichTextProperties(data: RichTextProps) {
    this.spacing = data.spacing ?? 0;
    this.runSpacing = data.runSpacing ?? 0;
    this.alignBaseline = data.alignBaseline ?? true;
  }

  protected didUpdateWidget(_oldProps: RichTextProps): void {
    this.initRichTextProperties(this.props as unknown as RichTextProps);
  }

  protected getConstraintsForChild(constraints: BoxConstraints): BoxConstraints {
    return {
      minWidth: 0,
      maxWidth: Infinity,
      minHeight: 0,
      maxHeight: constraints.maxHeight,
    };
  }

  private getChildBaseline(childIndex: number, childSize: Size): number {
    const child = this.children[childIndex] as unknown as { lines?: unknown };
    const lines = child?.lines;
    if (Array.isArray(lines) && lines.length > 0) {
      const baseline = (lines[0] as { baseline?: unknown } | undefined)?.baseline;
      if (typeof baseline === 'number' && isFinite(baseline) && baseline >= 0) {
        return Math.min(baseline, childSize.height);
      }
    }
    return childSize.height;
  }

  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    const maxWidth = isFinite(constraints.maxWidth) ? constraints.maxWidth : Infinity;
    const count = childrenSizes.length;

    const requiredOffsets = count * 2;
    if (!this._childOffsets || this._childOffsets.length < requiredOffsets) {
      this._childOffsets = new Float32Array(requiredOffsets);
    }
    const offsets = this._childOffsets;

    if (count === 0) {
      return {
        width: Math.max(constraints.minWidth, 0),
        height: Math.max(constraints.minHeight, 0),
      };
    }

    const spacing = this.spacing;
    const runSpacing = this.runSpacing;

    if (this.alignBaseline) {
      // 基线对齐的核心思路：
      // - 先“分行 + 记录每个子组件的 baseline/lineIndex”（一次遍历）
      // - 再基于每行最大 ascent/descent，回填每个子组件的 dy（第二次遍历）
      //
      // 为了减少布局期分配：
      // - 子组件位置/基线/行号使用 TypedArray 复用
      // - 每行的指标（top/ascent/descent）按“最坏 count 行”预分配复用
      if (!this._childBaselines || this._childBaselines.length < count) {
        this._childBaselines = new Float32Array(count);
      }
      if (!this._childLineIndex || this._childLineIndex.length < count) {
        this._childLineIndex = new Uint32Array(count);
      }
      const baselines = this._childBaselines;
      const lineIndex = this._childLineIndex;

      if (!this._lineTops || this._lineTops.length < count) {
        this._lineTops = new Float32Array(count);
      }
      if (!this._lineAscents || this._lineAscents.length < count) {
        this._lineAscents = new Float32Array(count);
      }
      if (!this._lineDescents || this._lineDescents.length < count) {
        this._lineDescents = new Float32Array(count);
      }
      const lineTops = this._lineTops;
      const lineAscents = this._lineAscents;
      const lineDescents = this._lineDescents;

      lineTops[0] = 0;
      lineAscents[0] = 0;
      lineDescents[0] = 0;

      let line = 0;
      let x = 0;
      let maxLineWidth = 0;

      for (let i = 0; i < count; i++) {
        const childSize = childrenSizes[i];
        const w = childSize.width;
        const h = childSize.height;

        let startX = x;
        if (startX > 0) {
          startX += spacing;
        }

        if (startX + w > maxWidth && x > 0) {
          maxLineWidth = Math.max(maxLineWidth, x);
          const nextTop = lineTops[line] + lineAscents[line] + lineDescents[line] + runSpacing;
          line += 1;
          lineTops[line] = nextTop;
          lineAscents[line] = 0;
          lineDescents[line] = 0;
          x = 0;
          startX = 0;
        }

        offsets[i * 2] = startX;
        offsets[i * 2 + 1] = lineTops[line];
        lineIndex[i] = line;

        const baseline = this.getChildBaseline(i, childSize);
        baselines[i] = baseline;
        const descent = Math.max(0, h - baseline);
        lineAscents[line] = Math.max(lineAscents[line], baseline);
        lineDescents[line] = Math.max(lineDescents[line], descent);

        x = startX + w;
      }

      maxLineWidth = Math.max(maxLineWidth, x);

      for (let i = 0; i < count; i++) {
        const li = lineIndex[i];
        // dy = lineTop + (lineAscent - childBaseline)，使得同一行的 baseline 对齐
        offsets[i * 2 + 1] = lineTops[li] + (lineAscents[li] - baselines[i]);
      }

      const totalHeight =
        lineTops[line] + Math.max(0, lineAscents[line]) + Math.max(0, lineDescents[line]);

      const finalWidth = Math.min(
        Math.max(constraints.minWidth, maxLineWidth),
        constraints.maxWidth,
      );

      return {
        width: finalWidth,
        height: Math.max(constraints.minHeight, Math.min(totalHeight, constraints.maxHeight)),
      };
    }

    let x = 0;
    let y = 0;
    let currentLineHeight = 0;
    let maxLineWidth = 0;

    for (let i = 0; i < count; i++) {
      const childSize = childrenSizes[i];
      const w = childSize.width;
      const h = childSize.height;

      let startX = x;
      if (startX > 0) {
        startX += spacing;
      }

      if (startX + w > maxWidth && x > 0) {
        maxLineWidth = Math.max(maxLineWidth, x);
        y += currentLineHeight + runSpacing;
        x = 0;
        currentLineHeight = 0;
        startX = 0;
      }

      offsets[i * 2] = startX;
      offsets[i * 2 + 1] = y;

      x = startX + w;
      currentLineHeight = Math.max(currentLineHeight, h);
    }

    maxLineWidth = Math.max(maxLineWidth, x);
    const totalHeight = y + currentLineHeight;

    const finalWidth = Math.min(Math.max(constraints.minWidth, maxLineWidth), constraints.maxWidth);

    return {
      width: finalWidth,
      height: Math.max(constraints.minHeight, Math.min(totalHeight, constraints.maxHeight)),
    };
  }

  protected positionChildren(childrenSizes: Size[]): void {
    const offsets = this._childOffsets;
    if (!offsets) {
      super.positionChildren(childrenSizes);
      return;
    }

    const children = this.children;
    const len = children.length;
    for (let i = 0; i < len; i++) {
      const child = children[i];
      const idx = i * 2;
      child.renderObject.offset.dx = offsets[idx];
      child.renderObject.offset.dy = offsets[idx + 1];
    }
  }

  protected positionChild(childIndex: number, _childSize: Size): Offset {
    if (this._childOffsets) {
      const idx = childIndex * 2;
      return { dx: this._childOffsets[idx], dy: this._childOffsets[idx + 1] };
    }
    return { dx: 0, dy: 0 };
  }
}
