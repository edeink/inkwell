/** @jsxImportSource @/utils/compiler */
import { NodeType } from '../../utils/parser';

import type { MarkdownNode } from '../../utils/parser';

import { Container, Padding, Text } from '@/core';

export function InlineNodeRenderer({ node }: { node: MarkdownNode; key?: string }) {
  switch (node.type) {
    case NodeType.Text:
      return <Text text={node.content || ''} fontSize={16} color="#24292e" />;

    case NodeType.Bold:
      return <Text text={node.content || ''} fontSize={16} fontWeight="bold" color="#24292e" />;

    case NodeType.Italic:
      // Note: Text widget does not support fontStyle in props.
      // We will render normal text for now.
      return <Text text={node.content || ''} fontSize={16} color="#24292e" />;

    case NodeType.CodeBlock: // Inline code
      return (
        <Container color="rgba(27,31,35,0.05)">
          <Padding padding={{ left: 4, right: 4, top: 2, bottom: 2 }}>
            <Text
              text={node.content || ''}
              fontSize={14}
              fontFamily="Monaco, Consolas, monospace"
              color="#24292e"
            />
          </Padding>
        </Container>
      );

    case NodeType.Link:
      return (
        <Text
          text={node.children?.[0]?.content || node.href || ''}
          fontSize={16}
          color="#0366d6"
          cursor="pointer"
          onClick={() => {
            if (node.href) {
              window.open(node.href, '_blank');
            }
          }}
        />
      );

    case NodeType.Image:
      // Simple image placeholder for now, or use Image widget if available in core
      // Checking core: imports include Container, Padding, Text.
      // I should check if Image widget is available.
      // Assuming Image widget is available or I can use a container with text for now.
      // core/type.ts has Image in ComponentType.
      // Let's assume Image widget exists in @/core
      return (
        <Container width={200} height={150} color="#eee" decoration={{ borderRadius: 4 }}>
          <Padding padding={10}>
            <Text text={`[Image: ${node.alt}]`} fontSize={12} color="#666" />
          </Padding>
        </Container>
      );

    default:
      return <Text text={node.content || ''} />;
  }
}
