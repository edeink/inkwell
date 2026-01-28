import { describe, expect, it } from 'vitest';

import { Widget } from '../base';
import { RichText } from '../rich-text';
import { Text } from '../text';
import { Wrap } from '../wrap';

import type { BoxConstraints, Size } from '../base';

// 具有固定尺寸的模拟 Widget
class FixedSizeBox extends Widget {
  constructor(
    public w: number,
    public h: number,
  ) {
    super({});
  }

  protected performLayout(constraints: BoxConstraints): Size {
    return {
      width: Math.min(this.w, constraints.maxWidth),
      height: Math.min(this.h, constraints.maxHeight),
    };
  }
}

describe('Wrap 布局', () => {
  it('当超出 maxWidth 时应当换行', () => {
    // 3 个子组件，每个宽 100px。间距 10。
    // 1 行所需总宽度：100 + 10 + 100 + 10 + 100 = 320。
    // 最大宽度：300。
    // 应当为：
    // 第 1 行：[Child 1, Child 2] -> 宽度 100 + 10 + 100 = 210。
    // 第 2 行：[Child 3] -> 宽度 100。
    // 总高度：100 (Child 1) + 10 (runSpacing) + 100 (Child 3) = 210。

    const child1 = new FixedSizeBox(100, 100);
    const child2 = new FixedSizeBox(100, 100);
    const child3 = new FixedSizeBox(100, 100);

    const wrap = new Wrap({
      spacing: 10,
      runSpacing: 10,
    });

    // 手动链接子组件并设置 built 标志以绕过构建阶段
    (wrap as any).children = [child1, child2, child3];
    (wrap as any)._isBuilt = true;
    child1.parent = wrap;
    child2.parent = wrap;
    child3.parent = wrap;

    wrap.layout({
      minWidth: 0,
      maxWidth: 300,
      minHeight: 0,
      maxHeight: 1000,
    });

    const size = wrap.renderObject.size;

    // 宽度应当为最大行宽 (210)
    expect(size.width).toBe(210);
    // 高度应当为 2 行 (210)
    expect(size.height).toBe(210);
  });

  it('应当验证间距和对齐逻辑 - 单行适配', () => {
    // 边界测试：正好适配
    // 2 个子组件 100px。间距 10。
    // 宽度 210。
    // 应当为 1 行。

    const child1 = new FixedSizeBox(100, 100);
    const child2 = new FixedSizeBox(100, 100);
    const wrap = new Wrap({ spacing: 10 });

    (wrap as any).children = [child1, child2];
    (wrap as any)._isBuilt = true;
    child1.parent = wrap;
    child2.parent = wrap;

    wrap.layout({
      minWidth: 0,
      maxWidth: 210,
      minHeight: 0,
      maxHeight: 1000,
    });

    expect(wrap.renderObject.size.height).toBe(100);
    expect(wrap.renderObject.size.width).toBe(210);
  });

  it('应当支持基线对齐（RichText）', () => {
    const normal = new Text({
      text: '2023、2024 为',
      fontSize: 14,
      lineHeight: 24,
      fontWeight: 'normal',
    });
    const bold = new Text({
      text: 'M+',
      fontSize: 14,
      lineHeight: 24,
      fontWeight: 'bold',
    });

    const richText = new RichText({ spacing: 4, alignBaseline: true });
    (richText as any).children = [normal, bold];
    (richText as any)._isBuilt = true;
    normal.parent = richText;
    bold.parent = richText;

    richText.layout({ minWidth: 0, maxWidth: 800, minHeight: 0, maxHeight: 1000 });

    const normalBaseline = normal.renderObject.offset.dy + normal.lines[0].baseline;
    const boldBaseline = bold.renderObject.offset.dy + bold.lines[0].baseline;
    expect(Math.abs(normalBaseline - boldBaseline)).toBeLessThan(0.001);
  });

  it('拆分空格不应改变 RichText 的基准线与行高', () => {
    const fontSize = 14;
    const lineHeight = 24;

    const single = new Text({
      text: 'AI 应用',
      fontSize,
      lineHeight,
      fontWeight: 'normal',
    });
    const splitA = new Text({
      text: 'AI',
      fontSize,
      lineHeight,
      fontWeight: 'normal',
    });
    const splitSpace = new Text({
      text: ' ',
      fontSize,
      lineHeight,
      fontWeight: 'normal',
    });
    const splitB = new Text({
      text: '应用',
      fontSize,
      lineHeight,
      fontWeight: 'normal',
    });

    const richSingle = new RichText({
      spacing: 0,
      alignBaseline: true,
    });
    (richSingle as any).children = [single];
    (richSingle as any)._isBuilt = true;
    single.parent = richSingle;

    const richSplit = new RichText({
      spacing: 0,
      alignBaseline: true,
    });
    (richSplit as any).children = [splitA, splitSpace, splitB];
    (richSplit as any)._isBuilt = true;
    splitA.parent = richSplit;
    splitSpace.parent = richSplit;
    splitB.parent = richSplit;

    const constraints = { minWidth: 0, maxWidth: 800, minHeight: 0, maxHeight: 1000 };
    richSingle.layout(constraints);
    richSplit.layout(constraints);

    expect(
      Math.abs(richSingle.renderObject.size.height - richSplit.renderObject.size.height),
    ).toBeLessThan(0.001);

    const singleBaselineY = single.renderObject.offset.dy + single.lines[0].baseline;
    const splitBaselineY0 = splitA.renderObject.offset.dy + splitA.lines[0].baseline;
    const splitBaselineY1 = splitSpace.renderObject.offset.dy + splitSpace.lines[0].baseline;
    const splitBaselineY2 = splitB.renderObject.offset.dy + splitB.lines[0].baseline;

    expect(Math.abs(singleBaselineY - splitBaselineY0)).toBeLessThan(0.001);
    expect(Math.abs(singleBaselineY - splitBaselineY1)).toBeLessThan(0.001);
    expect(Math.abs(singleBaselineY - splitBaselineY2)).toBeLessThan(0.001);

    const singleMetrics = (single as any).textMetrics as { ascent: number; descent: number };
    const spaceMetrics = (splitSpace as any).textMetrics as { ascent: number; descent: number };
    expect(Math.abs(singleMetrics.descent - spaceMetrics.descent)).toBeLessThan(0.001);
  });
});
