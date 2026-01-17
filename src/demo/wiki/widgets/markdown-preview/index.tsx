/** @jsxImportSource @/utils/compiler */
import { BlockNodeRenderer } from './block-renderer';
import { MarkdownParser, NodeType, type MarkdownNode } from './parser';

import type { ThemePalette } from '@/styles/theme';

import { Column, StatelessWidget, type WidgetProps } from '@/core';
import { CrossAxisAlignment, MainAxisAlignment, MainAxisSize } from '@/core/flex/type';

export type MarkdownPreviewProps = {
  content: string;
  theme: ThemePalette;
  ast?: MarkdownNode;
  headerKeyPrefix?: string;
} & WidgetProps;

const parser = new MarkdownParser();

export { BlockNodeRenderer, MarkdownParser, NodeType, type MarkdownNode };

export class MarkdownPreview extends StatelessWidget<MarkdownPreviewProps> {
  protected render() {
    const { content, theme, ast: astProp, headerKeyPrefix } = this.props;
    const ast = astProp ?? parser.parse(content);

    const effectiveHeaderKeyPrefix = headerKeyPrefix ?? `${this.key || 'md'}-h`;
    let headerIdx = 0;

    return (
      <Column
        crossAxisAlignment={CrossAxisAlignment.Start}
        mainAxisAlignment={MainAxisAlignment.Start}
        mainAxisSize={MainAxisSize.Min}
      >
        {ast.children?.map((node, index) => (
          <BlockNodeRenderer
            key={String(index)}
            node={node}
            theme={theme}
            anchorKey={
              node.type === NodeType.Header
                ? `${effectiveHeaderKeyPrefix}-${headerIdx++}`
                : undefined
            }
          />
        ))}
      </Column>
    );
  }
}
