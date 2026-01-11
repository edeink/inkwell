/** @jsxImportSource @/utils/compiler */
import { MarkdownParser } from '../../utils/parser';

import { BlockNodeRenderer } from './block-renderer';

import type { ThemePalette } from '@/styles/theme';

import { Column, Container, CrossAxisAlignment, MainAxisAlignment, Padding } from '@/core';

interface MarkdownViewerProps {
  content: string;
  theme: ThemePalette;
}

const parser = new MarkdownParser();

export function MarkdownViewer({ content, theme }: MarkdownViewerProps) {
  const ast = parser.parse(content);

  return (
    <Container>
      <Padding padding={20}>
        <Column
          crossAxisAlignment={CrossAxisAlignment.Start}
          mainAxisAlignment={MainAxisAlignment.Start}
        >
          {ast.children?.map((node, index) => (
            <BlockNodeRenderer key={String(index)} node={node} theme={theme} />
          ))}
        </Column>
      </Padding>
    </Container>
  );
}
