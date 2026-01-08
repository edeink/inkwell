/** @jsxImportSource @/utils/compiler */
import { MarkdownViewer } from './widgets/markdown-viewer';

import { Container, ScrollView } from '@/core';
import Runtime from '@/runtime';

const SAMPLE_MARKDOWN = `
# Markdown Preview Demo

This is a **bold** statement and this is *italic*.

## Headers
# H1 Header
## H2 Header
### H3 Header
#### H4 Header
##### H5 Header
###### H6 Header

## Lists

### Unordered List
*   Item 1
*   Item 2
    *   Nested Item 2.1
    *   Nested Item 2.2

### Ordered List
1.  First item
2.  Second item
3.  Third item

### Task List
- [x] Completed task
- [ ] Incomplete task

## Code

\`\`\`javascript
function hello() {
  console.log("Hello Inkwell!");
}
\`\`\`

\`\`\`python
def greet(name):
    print(f"Hello, {name}")
\`\`\`

Inline code: \`const a = 1;\`

## Quotes

> This is a blockquote.
> It can span multiple lines.

## Links & Images

[Link to Google](https://google.com)

![Inkwell Logo](https://via.placeholder.com/150)

## Tables

| Header 1 | Header 2 |
| -------- | -------- |
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |

## Horizontal Rule

---

End of Demo
`;

export function MarkdownPreviewApp({ width, height }: { width?: number; height?: number }) {
  // Use a max width for the content to make it look like a blog
  const contentMaxWidth = 800;
  // If screen is smaller than max width, use screen width minus padding
  const containerWidth = width ? Math.min(width - 40, contentMaxWidth) : contentMaxWidth;

  return (
    <ScrollView width={width} height={height}>
      <Container minWidth={width} minHeight={height} alignment="center" color="#f0f2f5">
        <Container
          width={containerWidth}
          color="#ffffff"
          decoration={{
            boxShadow: { blur: 10, color: 'rgba(0,0,0,0.1)', offset: { x: 0, y: 2 } },
            borderRadius: 8,
          }}
          margin={{ top: 20, bottom: 20 }}
        >
          <MarkdownViewer content={SAMPLE_MARKDOWN} />
        </Container>
      </Container>
    </ScrollView>
  );
}

export function runApp(runtime: Runtime, width: number, height: number) {
  runtime.render(<MarkdownPreviewApp width={width} height={height} />);
}
