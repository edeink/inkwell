/** @jsxImportSource @/utils/compiler */
import { MarkdownParser } from '../../utils/parser';

import { BlockNodeRenderer } from './block-renderer';

import { Column, Container, CrossAxisAlignment, MainAxisAlignment, Padding } from '@/core';

interface MarkdownViewerProps {
  content: string;
}

const parser = new MarkdownParser();

export function MarkdownViewer({ content }: MarkdownViewerProps) {
  const ast = parser.parse(content);

  return (
    <Container>
      <Padding padding={20}>
        <Column
          crossAxisAlignment={CrossAxisAlignment.Start}
          mainAxisAlignment={MainAxisAlignment.Start}
        >
          {ast.children?.map((node, index) => (
            <BlockNodeRenderer key={String(index)} node={node} />
          ))}
        </Column>
      </Padding>
    </Container>
  );
}
