export enum NodeType {
  Root = 'root',
  Header = 'header',
  Paragraph = 'paragraph',
  List = 'list', // Unordered
  OrderedList = 'orderedList',
  TaskList = 'taskList',
  ListItem = 'listItem',
  TaskListItem = 'taskListItem',
  CodeBlock = 'codeBlock',
  Quote = 'quote',
  Text = 'text',
  Bold = 'bold',
  Italic = 'italic',
  Link = 'link',
  Image = 'image',
  Table = 'table',
  TableRow = 'tableRow',
  TableCell = 'tableCell',
  HorizontalRule = 'horizontalRule',
}

export interface MarkdownNode {
  type: NodeType;
  content?: string;
  children?: MarkdownNode[];
  level?: number;
  language?: string;
  href?: string;
  alt?: string;
  checked?: boolean; // For task list items
  align?: 'left' | 'center' | 'right'; // For table cells
  isHeader?: boolean; // For table cells
}

export class MarkdownParser {
  parse(text: string): MarkdownNode {
    const lines = text.split(/\r?\n/);
    const root: MarkdownNode = {
      type: NodeType.Root,
      children: [],
    };

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Empty line
      if (trimmedLine === '') {
        i++;
        continue;
      }

      // Horizontal Rule
      if (trimmedLine.match(/^(\*{3,}|-{3,}|_{3,})$/)) {
        root.children!.push({ type: NodeType.HorizontalRule });
        i++;
        continue;
      }

      // Code Block
      if (trimmedLine.startsWith('```')) {
        const language = trimmedLine.slice(3).trim();
        let codeContent = '';
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeContent += lines[i] + '\n';
          i++;
        }
        root.children!.push({
          type: NodeType.CodeBlock,
          content: codeContent,
          language: language,
        });
        i++;
        continue;
      }

      // Header
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        root.children!.push({
          type: NodeType.Header,
          level: headerMatch[1].length,
          children: this.parseInline(headerMatch[2]),
        });
        i++;
        continue;
      }

      // Table
      if (trimmedLine.startsWith('|')) {
        const tableNode: MarkdownNode = {
          type: NodeType.Table,
          children: [],
        };

        // Parse header row
        const headerCells = trimmedLine
          .split('|')
          .filter((c) => c.trim() !== '')
          .map((c) => c.trim());
        const headerRow: MarkdownNode = {
          type: NodeType.TableRow,
          children: headerCells.map((c) => ({
            type: NodeType.TableCell,
            children: this.parseInline(c),
            isHeader: true,
          })),
        };
        tableNode.children!.push(headerRow);
        i++;

        // Check for separator row (and alignments)
        if (i < lines.length && lines[i].trim().startsWith('|') && lines[i].includes('-')) {
          // We can parse alignment from separator row here if needed
          // | :--- | :---: | ---: |
          i++;
        }

        // Parse body rows
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          const rowCells = lines[i]
            .trim()
            .split('|')
            .filter((c, idx, arr) => {
              // filter out empty strings from start/end if the row starts/ends with |
              if (idx === 0 && c === '') {
                return false;
              }
              if (idx === arr.length - 1 && c === '') {
                return false;
              }
              return true;
            })
            .map((c) => c.trim());

          const row: MarkdownNode = {
            type: NodeType.TableRow,
            children: rowCells.map((c) => ({
              type: NodeType.TableCell,
              children: this.parseInline(c),
              isHeader: false,
            })),
          };
          tableNode.children!.push(row);
          i++;
        }
        root.children!.push(tableNode);
        continue;
      }

      // Task List
      if (trimmedLine.match(/^-\s+\[([ x])\]\s+(.+)$/)) {
        const listNode: MarkdownNode = {
          type: NodeType.TaskList,
          children: [],
        };

        while (i < lines.length) {
          const match = lines[i].trim().match(/^-\s+\[([ x])\]\s+(.+)$/);
          if (!match) {
            break;
          }

          listNode.children!.push({
            type: NodeType.TaskListItem,
            checked: match[1] === 'x',
            children: this.parseInline(match[2]),
          });
          i++;
        }
        root.children!.push(listNode);
        continue;
      }

      // Unordered List
      if (trimmedLine.match(/^(\*|-)\s+(.+)$/)) {
        const listNode: MarkdownNode = {
          type: NodeType.List,
          children: [],
        };

        while (i < lines.length) {
          const listMatch = lines[i].match(/^(\s*)(\*|-)\s+(.+)$/);
          if (!listMatch) {
            break;
          }
          // Note: This simple parser doesn't handle nested lists perfectly by indentation yet
          // But it's good enough for basic flat lists
          listNode.children!.push({
            type: NodeType.ListItem,
            children: this.parseInline(listMatch[3]),
          });
          i++;
        }
        root.children!.push(listNode);
        continue;
      }

      // Ordered List
      if (trimmedLine.match(/^(\d+)\.\s+(.+)$/)) {
        const listNode: MarkdownNode = {
          type: NodeType.OrderedList,
          children: [],
        };

        while (i < lines.length) {
          const listMatch = lines[i].match(/^(\s*)(\d+)\.\s+(.+)$/);
          if (!listMatch) {
            break;
          }

          listNode.children!.push({
            type: NodeType.ListItem,
            children: this.parseInline(listMatch[3]),
          });
          i++;
        }
        root.children!.push(listNode);
        continue;
      }

      // Quote
      if (trimmedLine.startsWith('>')) {
        const quoteNode: MarkdownNode = {
          type: NodeType.Quote,
          children: [],
        };

        while (i < lines.length && lines[i].trim().startsWith('>')) {
          const content = lines[i].trim().replace(/^>\s?/, '');
          quoteNode.children!.push(...this.parseInline(content));
          // Add a space or newline if needed, but for now just inline nodes
          // Actually, usually quotes contain paragraphs.
          // Simplifying to treat each line as text in the quote for now.
          i++;
        }
        root.children!.push(quoteNode);
        continue;
      }

      // Paragraph
      root.children!.push({
        type: NodeType.Paragraph,
        children: this.parseInline(line),
      });
      i++;
    }

    return root;
  }

  parseInline(text: string): MarkdownNode[] {
    const nodes: MarkdownNode[] = [];
    let currentText = text;

    while (currentText.length > 0) {
      // Image: ![alt](url)
      const imageMatch = currentText.match(/!\[(.*?)\]\((.*?)\)/);
      // Link: [text](url)
      const linkMatch = currentText.match(/\[(.*?)\]\((.*?)\)/);
      // Bold: **text**
      const boldMatch = currentText.match(/\*\*(.*?)\*\*/);
      // Italic: *text*
      const italicMatch = currentText.match(/\*(.*?)\*/);
      // Code: `text`
      const codeMatch = currentText.match(/`(.*?)`/);

      const matches = [
        { type: NodeType.Image, match: imageMatch, index: imageMatch?.index },
        { type: NodeType.Link, match: linkMatch, index: linkMatch?.index },
        { type: NodeType.Bold, match: boldMatch, index: boldMatch?.index },
        { type: NodeType.Italic, match: italicMatch, index: italicMatch?.index },
        { type: NodeType.CodeBlock, match: codeMatch, index: codeMatch?.index, isInline: true },
      ]
        .filter((m) => m.match !== null && m.index !== undefined)
        .sort((a, b) => a.index! - b.index!);

      if (matches.length === 0) {
        nodes.push({ type: NodeType.Text, content: currentText });
        break;
      }

      const firstMatch = matches[0];
      const matchIndex = firstMatch.index!;
      const matchLength = firstMatch.match![0].length;

      // Add text before match
      if (matchIndex > 0) {
        nodes.push({ type: NodeType.Text, content: currentText.slice(0, matchIndex) });
      }

      // Add match
      if (firstMatch.type === NodeType.Image) {
        nodes.push({
          type: NodeType.Image,
          alt: firstMatch.match![1],
          href: firstMatch.match![2],
        });
      } else if (firstMatch.type === NodeType.Link) {
        nodes.push({
          type: NodeType.Link,
          href: firstMatch.match![2],
          children: [{ type: NodeType.Text, content: firstMatch.match![1] }],
        });
      } else if (firstMatch.type === NodeType.Bold) {
        nodes.push({
          type: NodeType.Bold,
          content: firstMatch.match![1],
        });
      } else if (firstMatch.type === NodeType.Italic) {
        nodes.push({
          type: NodeType.Italic,
          content: firstMatch.match![1],
        });
      } else if (firstMatch.type === NodeType.CodeBlock) {
        nodes.push({
          type: NodeType.CodeBlock,
          content: firstMatch.match![1],
        });
      }

      currentText = currentText.slice(matchIndex + matchLength);
    }

    return nodes;
  }
}
