/** @jsxImportSource @/utils/compiler */
import { BlockNodeRenderer } from './block-renderers';
import { NodeType, type MarkdownNode } from './parser';

import type { BlockRenderer } from './block-renderers';
import type { MarkdownRenderStyle } from './block-renderers/types';
import type { InlineRenderer } from './inline-renderers/types';
import type { ThemePalette } from '@/styles/theme';

import { Column, StatelessWidget, type WidgetProps } from '@/core';
import { CrossAxisAlignment, MainAxisAlignment, MainAxisSize } from '@/core/flex/type';

export type MarkdownBodyProps = {
  ast: MarkdownNode;
  theme: ThemePalette;
  headerKeyPrefix: string;
  style: MarkdownRenderStyle;
  inlineRenderers?: InlineRenderer[];
  blockRenderers?: BlockRenderer[];
} & WidgetProps;

export class MarkdownBody extends StatelessWidget<MarkdownBodyProps> {
  protected render() {
    const { ast, theme, headerKeyPrefix, style, inlineRenderers, blockRenderers } = this.props;
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
            style={style}
            inlineRenderers={inlineRenderers}
            blockRenderers={blockRenderers}
            anchorKey={
              node.type === NodeType.Header ? `${headerKeyPrefix}-${headerIdx++}` : undefined
            }
          />
        ))}
      </Column>
    );
  }
}
