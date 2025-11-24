import InkPlayground from '@site/src/components/InkPlayground';
import CodeBlockOriginal from '@theme-original/CodeBlock';

type Props = {
  children?: string | { props?: { children?: string } };
  className?: string;
  language?: string;
  metastring?: string;
};

function getCode(children: Props['children']): string {
  if (typeof children === 'string') return children;
  const maybe = (children as any)?.props?.children;
  return typeof maybe === 'string' ? maybe : '';
}

export default function CodeBlock(props: Props) {
  const language = props.language || (props.className?.replace('language-', '') ?? '');
  const code = getCode(props.children);
  const useInk = language === 'tsx' || /\bink\b/.test(props.metastring || '') || /language-tsx/.test(props.className || '');
  if (useInk && code) {
    return <InkPlayground code={code} />;
  }
  return <CodeBlockOriginal {...props as any} />;
}