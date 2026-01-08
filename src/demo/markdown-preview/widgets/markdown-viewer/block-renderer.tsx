/** @jsxImportSource @/utils/compiler */
import { NodeType } from '../../utils/parser';

import { InlineNodeRenderer } from './inline-renderer';

import type { MarkdownNode } from '../../utils/parser';

import { Column, Container, CrossAxisAlignment, Padding, Row, Text, Wrap } from '@/core';

export function BlockNodeRenderer({ node }: { node: MarkdownNode; key?: string }) {
  switch (node.type) {
    case NodeType.Header:
      return (
        <Padding padding={{ top: 10, bottom: 10 }}>
          <Text
            text={node.children?.map((c) => c.content || '').join('') || ''}
            fontSize={32 - (node.level || 1) * 4}
            fontWeight="bold"
            color="#333333"
          />
        </Padding>
      );

    case NodeType.Paragraph:
      return (
        <Padding padding={{ bottom: 10 }}>
          <Wrap spacing={0} runSpacing={4}>
            {node.children?.map((child, i) => (
              <InlineNodeRenderer key={String(i)} node={child} />
            ))}
          </Wrap>
        </Padding>
      );

    case NodeType.CodeBlock:
      return (
        <Container color="#f6f8fa">
          <Padding padding={12}>
            <CodeBlockHighlighter code={node.content || ''} language={node.language || ''} />
          </Padding>
        </Container>
      );

    case NodeType.Quote:
      return (
        <Container
          decoration={{
            border: { left: { width: 4, color: '#dfe2e5' } },
          }}
        >
          <Padding padding={{ left: 16, top: 0, bottom: 0, right: 0 }}>
            <Wrap>
              {node.children?.map((child, i) => (
                <InlineNodeRenderer key={String(i)} node={child} />
              ))}
            </Wrap>
          </Padding>
        </Container>
      );

    case NodeType.List:
      return (
        <Column crossAxisAlignment={CrossAxisAlignment.Start}>
          {node.children?.map((child, i) => (
            <Row key={String(i)} crossAxisAlignment={CrossAxisAlignment.Start}>
              <Padding padding={{ right: 8, top: 8 }}>
                <Container width={6} height={6} color="#333" decoration={{ borderRadius: 3 }} />
              </Padding>
              <Wrap>
                {child.children?.map((c, j) => (
                  <InlineNodeRenderer key={String(j)} node={c} />
                ))}
              </Wrap>
            </Row>
          ))}
        </Column>
      );

    case NodeType.OrderedList:
      return (
        <Column crossAxisAlignment={CrossAxisAlignment.Start}>
          {node.children?.map((child, i) => (
            <Row key={String(i)} crossAxisAlignment={CrossAxisAlignment.Start}>
              <Padding padding={{ right: 8, top: 2 }}>
                <Text text={`${i + 1}.`} fontSize={16} color="#333" />
              </Padding>
              <Wrap>
                {child.children?.map((c, j) => (
                  <InlineNodeRenderer key={String(j)} node={c} />
                ))}
              </Wrap>
            </Row>
          ))}
        </Column>
      );

    case NodeType.TaskList:
      return (
        <Column crossAxisAlignment={CrossAxisAlignment.Start}>
          {node.children?.map((child, i) => (
            <Row key={String(i)} crossAxisAlignment={CrossAxisAlignment.Start}>
              <Padding padding={{ right: 8, top: 6 }}>
                {/* Custom Checkbox */}
                <Container
                  width={14}
                  height={14}
                  decoration={{
                    border: {
                      top: { width: 1, color: '#ccc' },
                      bottom: { width: 1, color: '#ccc' },
                      left: { width: 1, color: '#ccc' },
                      right: { width: 1, color: '#ccc' },
                    },
                    borderRadius: 2,
                  }}
                  color={child.checked ? '#0366d6' : 'white'}
                />
              </Padding>
              <Wrap>
                {child.children?.map((c, j) => (
                  <InlineNodeRenderer key={String(j)} node={c} />
                ))}
              </Wrap>
            </Row>
          ))}
        </Column>
      );

    case NodeType.Table:
      return (
        <Container
          decoration={{
            border: {
              top: { width: 1, color: '#dfe2e5' },
              bottom: { width: 1, color: '#dfe2e5' },
              left: { width: 1, color: '#dfe2e5' },
              right: { width: 1, color: '#dfe2e5' },
            },
          }}
        >
          <Column>
            {node.children?.map((row, i) => (
              <Container
                key={String(i)}
                color={i % 2 === 0 ? 'white' : '#f6f8fa'}
                decoration={{ border: { bottom: { width: 1, color: '#dfe2e5' } } }}
              >
                <Row>
                  {row.children?.map((cell, j) => (
                    <Container
                      key={String(j)}
                      width={150} // Fixed width for simplicity
                      decoration={{ border: { right: { width: 1, color: '#dfe2e5' } } }}
                    >
                      <Padding padding={8}>
                        <Wrap>
                          {cell.children?.map((c, k) => (
                            <InlineNodeRenderer key={String(k)} node={c} />
                          ))}
                        </Wrap>
                      </Padding>
                    </Container>
                  ))}
                </Row>
              </Container>
            ))}
          </Column>
        </Container>
      );

    case NodeType.HorizontalRule:
      return (
        <Padding padding={{ top: 10, bottom: 10 }}>
          <Container height={1} color="#e1e4e8" />
        </Padding>
      );

    default:
      return <Container />;
  }
}

function CodeBlockHighlighter({ code, language }: { code: string; language: string }) {
  const lines = code.split('\n');
  // Remove last empty line if it exists (often from splitting trailing newline)
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  return (
    <Column crossAxisAlignment={CrossAxisAlignment.Start}>
      {lines.map((line, i) => (
        <CodeLineRenderer key={String(i)} line={line} language={language} />
      ))}
    </Column>
  );
}

function CodeLineRenderer({ line, language }: { line: string; language: string; key?: string }) {
  // Preserve height for empty lines
  if (!line) {
    return <Container height={20} />;
  }

  const tokens = tokenize(line, language);

  return (
    <Row crossAxisAlignment={CrossAxisAlignment.Start}>
      {tokens.map((token, i) => (
        <Text
          key={String(i)}
          text={token.text}
          color={token.color}
          fontFamily="Monaco, Consolas, monospace"
          fontSize={14}
          lineHeight={20}
        />
      ))}
    </Row>
  );
}

function tokenize(line: string, language: string): { text: string; color: string }[] {
  const tokens: { text: string; color: string }[] = [];

  const keywords = [
    'const',
    'let',
    'var',
    'function',
    'return',
    'if',
    'else',
    'for',
    'while',
    'import',
    'export',
    'from',
    'class',
    'interface',
    'extends',
    'implements',
    'type',
    'def',
    'print',
  ];
  if (language === 'python' || language === 'py') {
    keywords.push('def', 'print', 'if', 'else', 'elif', 'for', 'in', 'return');
  }

  // Split by delimiters but keep delimiters
  // Delimiters: space, punctuation
  const parts = line.split(/(\s+|[(){}[\].,;:"'])/g);

  let inString = false;
  let stringChar = '';

  for (const part of parts) {
    if (!part) {
      continue;
    }

    let color = '#24292e'; // Default black/gray

    // Simple string handling (buggy for mixed quotes but ok for simple demo)
    if (inString) {
      color = '#032f62';
      if (part === stringChar) {
        inString = false;
      }
    } else {
      if (part === '"' || part === "'") {
        inString = true;
        stringChar = part;
        color = '#032f62';
      } else if (keywords.includes(part)) {
        color = '#d73a49'; // Red for keywords
      } else if (part.match(/^\d+$/)) {
        color = '#005cc5'; // Blue for numbers
      } else if (part.match(/^[A-Z][a-zA-Z0-9]*$/)) {
        color = '#6f42c1'; // Purple for Types/Classes
      } else if (part.trim().startsWith('//')) {
        color = '#6a737d'; // Grey for comments (partial support)
      }
    }

    tokens.push({ text: part, color });
  }

  return tokens;
}
