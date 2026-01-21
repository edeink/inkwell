/**
 * 块级渲染器类型定义。
 *
 * BlockRenderContext 额外包含 `anchorKey`，用于标题渲染时产生可定位的锚点，
 * 从而支持目录跳转/高亮等能力。
 */
import { type InlineRenderer } from '../inline-renderers/types';
import { type MarkdownNode } from '../parser';

import { type ThemePalette } from '@/styles/theme';

export type MarkdownRenderStyle = {
  inlineWrap: {
    spacing: number;
    runSpacing: number;
  };
  text: {
    fontSize: number;
    lineHeight: number;
  };
  header: {
    paddingTop: number;
    paddingBottom: number;
    fontSize: number[];
    lineHeight: number[];
    accentBar?: {
      levels: number[];
      width: number;
      height?: number;
      gap: number;
      radius: number;
      color?: string;
    };
  };
  paragraph: {
    marginBottom: number;
  };
  list: {
    marginBottom: number;
    columnSpacing: number;
    rowSpacing: number;
    markerPaddingTop: number;
    markerSize: number;
    markerRadius: number;
  };
  orderedList: {
    marginBottom: number;
    columnSpacing: number;
    rowSpacing: number;
    numberWidth: number;
    numberPaddingTop: number;
    numberFontSize: number;
    numberLineHeight: number;
  };
  taskList: {
    marginBottom: number;
    columnSpacing: number;
    rowSpacing: number;
    checkboxPaddingTop: number;
    checkboxSize: number;
    checkboxBorderWidth: number;
    checkboxBorderRadius: number;
  };
  quote: {
    marginBottom: number;
    borderRadius: number;
    borderWidth: number;
    barWidth: number;
    paddingLeft: number;
    paddingRight: number;
    paddingTop: number;
    paddingBottom: number;
  };
  codeBlock: {
    marginBottom: number;
    borderRadius: number;
    borderWidth: number;
    padding: number;
    fontSize: number;
    lineHeight: number;
    fontFamily: string;
  };
  inlineCode: {
    paddingLeft: number;
    paddingRight: number;
    paddingTop: number;
    paddingBottom: number;
    fontSize: number;
    lineHeight: number;
    fontFamily: string;
  };
  table: {
    marginBottom: number;
    borderRadius: number;
    borderWidth: number;
    cellPaddingLeft: number;
    cellPaddingRight: number;
    cellPaddingTop: number;
    cellPaddingBottom: number;
    textFontSize: number;
    textLineHeight: number;
    dividerWidth: number;
  };
  horizontalRule: {
    paddingTop: number;
    paddingBottom: number;
    height: number;
  };
  image: {
    width: number;
    height: number;
    borderRadius: number;
    padding: number;
    textFontSize: number;
  };
};

export const defaultMarkdownRenderStyle: MarkdownRenderStyle = {
  inlineWrap: { spacing: 0, runSpacing: 4 },
  text: { fontSize: 14, lineHeight: 24 },
  header: {
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: [28, 24, 20, 16, 12, 8],
    lineHeight: [36, 32, 28, 24, 20, 16],
    accentBar: undefined,
  },
  paragraph: { marginBottom: 12 },
  list: {
    marginBottom: 12,
    columnSpacing: 6,
    rowSpacing: 10,
    markerPaddingTop: 10,
    markerSize: 6,
    markerRadius: 3,
  },
  orderedList: {
    marginBottom: 12,
    columnSpacing: 6,
    rowSpacing: 10,
    numberWidth: 22,
    numberPaddingTop: 2,
    numberFontSize: 14,
    numberLineHeight: 24,
  },
  taskList: {
    marginBottom: 12,
    columnSpacing: 6,
    rowSpacing: 10,
    checkboxPaddingTop: 6,
    checkboxSize: 14,
    checkboxBorderWidth: 1,
    checkboxBorderRadius: 2,
  },
  quote: {
    marginBottom: 14,
    borderRadius: 6,
    borderWidth: 1,
    barWidth: 4,
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 10,
    paddingBottom: 10,
  },
  codeBlock: {
    marginBottom: 14,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Monaco, Consolas, monospace',
  },
  inlineCode: {
    paddingLeft: 4,
    paddingRight: 4,
    paddingTop: 2,
    paddingBottom: 2,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Monaco, Consolas, monospace',
  },
  table: {
    marginBottom: 14,
    borderRadius: 8,
    borderWidth: 1,
    cellPaddingLeft: 10,
    cellPaddingRight: 10,
    cellPaddingTop: 8,
    cellPaddingBottom: 8,
    textFontSize: 14,
    textLineHeight: 24,
    dividerWidth: 1,
  },
  horizontalRule: {
    paddingTop: 12,
    paddingBottom: 12,
    height: 1,
  },
  image: {
    width: 200,
    height: 150,
    borderRadius: 4,
    padding: 10,
    textFontSize: 14,
  },
};

export type BlockRenderContext = {
  node: MarkdownNode;
  theme: ThemePalette;
  style: MarkdownRenderStyle;
  inlineRenderers?: InlineRenderer[];
  anchorKey?: string;
  widgetKey?: string | number | null;
};

export type BlockRenderer = {
  match: (ctx: BlockRenderContext) => boolean;
  render: (ctx: BlockRenderContext) => unknown;
};
