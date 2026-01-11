/** @jsxImportSource @/utils/compiler */
import { NodeType } from '../../utils/parser';

import type { MarkdownNode } from '../../utils/parser';
import type { ThemePalette } from '@/styles/theme';

import { Container, Padding, Text } from '@/core';

export function InlineNodeRenderer({
  node,
  theme,
}: {
  node: MarkdownNode;
  theme: ThemePalette;
  key?: string;
}) {
  switch (node.type) {
    case NodeType.Text:
      return <Text text={node.content || ''} fontSize={16} color={theme.text.primary} />;

    case NodeType.Bold:
      return (
        <Text
          text={node.content || ''}
          fontSize={16}
          fontWeight="bold"
          color={theme.text.primary}
        />
      );

    case NodeType.Italic:
      // Note: Text widget does not support fontStyle in props.
      // We will render normal text for now.
      return <Text text={node.content || ''} fontSize={16} color={theme.text.primary} />;

    case NodeType.CodeBlock: // Inline code
      return (
        <Container color={theme.state.hover}>
          <Padding padding={{ left: 4, right: 4, top: 2, bottom: 2 }}>
            <Text
              text={node.content || ''}
              fontSize={14}
              fontFamily="Monaco, Consolas, monospace"
              color={theme.text.primary}
            />
          </Padding>
        </Container>
      );

    case NodeType.Link:
      return (
        <Text
          text={node.children?.[0]?.content || node.href || ''}
          fontSize={16}
          color={theme.primary}
          cursor="pointer"
          onClick={() => {
            if (node.href) {
              window.open(node.href, '_blank');
            }
          }}
        />
      );

    case NodeType.Image:
      return (
        <Container
          width={200}
          height={150}
          color={theme.background.surface}
          decoration={{ borderRadius: 4 }}
        >
          <Padding padding={10}>
            <Text text={`[Image: ${node.alt}]`} fontSize={12} color={theme.text.secondary} />
          </Padding>
        </Container>
      );

    default:
      return <Text text={node.content || ''} />;
  }
}
