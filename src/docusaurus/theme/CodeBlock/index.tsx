import { CopyOutlined } from '@ant-design/icons';
import Mermaid from '@theme/Mermaid';
import OriginalCodeBlock from '@theme-original/CodeBlock';

import styles from './index.module.less';

import InkPlayground from '@/docusaurus/components/ink-playground';

type Props = {
  children: string | { props?: { children?: string } };
  className?: string;
  metastring?: string;
};

function stripJsxImportSource(src: string) {
  return src
    .replace(/\/\*+\s*@jsxImportSource[\s\S]*?\*\//g, '')
    .replace(/\/\/\s*@jsxImportSource[^\n]*/g, '')
    .trim();
}

export default function CodeBlock(props: Props) {
  const { children, className, metastring } = props;
  const code = typeof children === 'string' ? children : String(children?.props?.children ?? '');
  const lang = (className || '').replace(/^language-/, '');
  const isESX = lang === 'esx';
  const isMermaid = lang === 'mermaid';
  const isFlow = lang === 'flow';
  const isSeq = lang === 'seq';
  const forceStatic = typeof metastring === 'string' && metastring.includes('static');
  const readOnly = typeof metastring === 'string' && metastring.includes('readonly');
  if (isESX && !forceStatic) {
    return <InkPlayground code={code} readonly={readOnly} />;
  }
  if (isMermaid) {
    return <Mermaid value={code} />;
  }
  if (isFlow) {
    return <Mermaid value={transformFlowToMermaid(code)} />;
  }
  if (isSeq) {
    return <Mermaid value={transformSeqToMermaid(code)} />;
  }
  const cleaned = stripJsxImportSource(code);
  return (
    <div className={styles.codeContainer}>
      <button
        className={styles.copyBtn}
        onClick={() => {
          navigator.clipboard.writeText(cleaned).catch(() => {});
        }}
        aria-label="复制代码"
      >
        <CopyOutlined /> 复制
      </button>
      <OriginalCodeBlock
        {...props}
        // 将 esx 作为 tsx 高亮，以保持完全一致的语法高亮
        className={isESX ? 'language-tsx' : props.className}
        children={cleaned}
      />
    </div>
  );
}
function transformFlowToMermaid(src: string) {
  const lines = src
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const nodeDefs: string[] = [];
  const edgeDefs: string[] = [];
  for (const l of lines) {
    const m = l.match(/^(\w+)\s*=>\s*(\w+)\s*:\s*(.+)$/);
    if (m) {
      const id = m[1];
      const type = m[2].toLowerCase();
      const label = m[3];
      if (type === 'start' || type === 'end') {
        nodeDefs.push(`${id}([${label}])`);
      } else if (type === 'condition') {
        nodeDefs.push(`${id}{${label}}`);
      } else {
        nodeDefs.push(`${id}[${label}]`);
      }
      continue;
    }
    if (l.includes('->')) {
      const parts = l
        .split('->')
        .map((p) => p.trim())
        .filter(Boolean);
      const parse = (t: string) => {
        const mm = t.match(/^([A-Za-z0-9_]+)(?:\(([^)]+)\))?$/);
        return { id: mm ? mm[1] : t, label: mm && mm[2] ? mm[2] : null };
      };
      for (let i = 0; i < parts.length - 1; i++) {
        const a = parse(parts[i]);
        const b = parse(parts[i + 1]);
        const lbl = a.label ? `|${a.label}|` : '';
        edgeDefs.push(`${a.id} -->${lbl} ${b.id}`);
      }
    }
  }
  return `flowchart TD\n${nodeDefs.join('\n')}\n${edgeDefs.join('\n')}`;
}

function transformSeqToMermaid(src: string) {
  const body = src.trim();
  return `sequenceDiagram\n${body}`;
}
