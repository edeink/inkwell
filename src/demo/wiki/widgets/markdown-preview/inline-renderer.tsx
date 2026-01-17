/** @jsxImportSource @/utils/compiler */
import { NodeType, type MarkdownNode } from './parser';

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
  const fontSize = 14;
  const lineHeight = 24;
  switch (node.type) {
    case NodeType.Text:
      return (
        <Text
          text={node.content || ''}
          fontSize={fontSize}
          lineHeight={lineHeight}
          color={theme.text.primary}
        />
      );

    case NodeType.Bold:
      return (
        <Text
          text={node.content || ''}
          fontSize={fontSize}
          lineHeight={lineHeight}
          fontWeight="bold"
          color={theme.text.primary}
        />
      );

    case NodeType.Italic:
      return (
        <Text
          text={node.content || ''}
          fontSize={fontSize}
          lineHeight={lineHeight}
          color={theme.text.primary}
        />
      );

    case NodeType.CodeBlock:
      return (
        <Container color={theme.state.hover}>
          <Padding padding={{ left: 4, right: 4, top: 2, bottom: 2 }}>
            <Text
              text={node.content || ''}
              fontSize={14}
              lineHeight={20}
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
          fontSize={fontSize}
          lineHeight={lineHeight}
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
        <Container width={200} height={150} color={theme.background.surface} borderRadius={4}>
          <Padding padding={10}>
            <Text text={`[Image: ${node.alt}]`} fontSize={14} color={theme.text.secondary} />
          </Padding>
        </Container>
      );

    default:
      return (
        <Text
          text={node.content || ''}
          fontSize={fontSize}
          lineHeight={lineHeight}
          color={theme.text.primary}
        />
      );
  }
}
