/** @jsxImportSource @/utils/compiler */
/**
 * Markdown 预览组件（Widget 版）。
 *
 * 主要职责：
 * - 解析 front matter（title/date/categories/link）。
 * - 解析 Markdown 正文为 AST（支持外部直接传入 ast 以避免重复解析）。
 * - 逐个把块级节点交给 BlockNodeRenderer 渲染。
 *
 * 关键参数说明：
 * - content：原始 Markdown 字符串（可包含 front matter）。
 * - theme：主题色板，负责统一文字/背景/边框等颜色。
 * - ast：可选的已解析 AST；传入后会跳过解析步骤（用于缓存或测试）。
 * - headerKeyPrefix：可选的标题 key 前缀，用于目录跳转锚点；不传时会基于当前组件 key 自动生成。
 *
 * @example
 * ```ts
 * <MarkdownPreview content={rawMarkdown} theme={theme} />
 * ```
 */
import { parseMarkdownFrontMatter } from '../../helpers/wiki-doc';

import { defaultMarkdownRenderStyle, type MarkdownRenderStyle } from './block-renderers/types';
import { hasFrontMatter } from './front-matter/has-front-matter.ts';
import { FrontMatter } from './front-matter/index.tsx';
import { MarkdownBody } from './markdown-body.tsx';
import { MarkdownParser, type MarkdownNode } from './parser';

import type { BlockRenderer } from './block-renderers';
import type { InlineRenderer } from './inline-renderers/types';
import type { ThemePalette } from '@/styles/theme';

import { Column, StatelessWidget, type WidgetProps } from '@/core';
import { CrossAxisAlignment, MainAxisAlignment, MainAxisSize } from '@/core/flex/type';

export type MarkdownPreviewProps = {
  content: string;
  theme: ThemePalette;
  ast?: MarkdownNode;
  headerKeyPrefix?: string;
  style?: MarkdownRenderStyle;
  inlineRenderers?: InlineRenderer[];
  blockRenderers?: BlockRenderer[];
} & WidgetProps;

const parser = new MarkdownParser();

export { BlockNodeRenderer } from './block-renderers';
export { defaultMarkdownRenderStyle, type MarkdownRenderStyle } from './block-renderers/types';
export { MarkdownParser, NodeType, type MarkdownNode } from './parser';

export class MarkdownPreview extends StatelessWidget<MarkdownPreviewProps> {
  protected render() {
    const {
      content,
      theme,
      ast: astProp,
      headerKeyPrefix,
      style,
      inlineRenderers,
      blockRenderers,
    } = this.props;
    const { frontMatter, body } = parseMarkdownFrontMatter(content);
    const ast = astProp ?? parser.parse(body);

    const effectiveHeaderKeyPrefix = headerKeyPrefix ?? `${this.key || 'md'}-h`;
    const showFrontMatter = hasFrontMatter(frontMatter);

    return (
      <Column
        crossAxisAlignment={CrossAxisAlignment.Start}
        mainAxisAlignment={MainAxisAlignment.Start}
        mainAxisSize={MainAxisSize.Min}
      >
        {showFrontMatter ? <FrontMatter frontMatter={frontMatter} theme={theme} /> : null}
        <MarkdownBody
          ast={ast}
          theme={theme}
          headerKeyPrefix={effectiveHeaderKeyPrefix}
          style={style ?? defaultMarkdownRenderStyle}
          inlineRenderers={inlineRenderers}
          blockRenderers={blockRenderers}
        />
      </Column>
    );
  }
}
