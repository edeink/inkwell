import InkPlayground from '@/docusaurus/components/ink-playground'
import OriginalCodeBlock from '@theme-original/CodeBlock'
import { CopyOutlined } from '@ant-design/icons'
import styles from './index.module.less'

type Props = {
  children: string | { props?: { children?: string } }
  className?: string
  metastring?: string
}

function stripJsxImportSource(src: string) {
  return src
    .replace(/\/\*+\s*@jsxImportSource[\s\S]*?\*\//g, '')
    .replace(/\/\/\s*@jsxImportSource[^\n]*/g, '')
    .trim()
}

export default function CodeBlock(props: Props) {
  const { children, className, metastring } = props
  const code = typeof children === 'string' ? children : String(children?.props?.children ?? '')
  const lang = (className || '').replace(/^language-/, '')
  const isTSX = lang === 'tsx' || lang === 'jsx'
  const forceStatic = typeof metastring === 'string' && metastring.includes('static')
  if (isTSX && !forceStatic) {
    return <InkPlayground code={code} />
  }
  const cleaned = stripJsxImportSource(code)
  return (
    <div className={styles.codeContainer}>
      <button
        className={styles.copyBtn}
        onClick={() => { navigator.clipboard.writeText(cleaned).catch(() => { }) }}
        aria-label="复制代码"
      >
        <CopyOutlined /> 复制
      </button>
      <OriginalCodeBlock {...props} children={cleaned} />
    </div>
  )
}