import InkPlayground from '@site/src/components/InkPlayground'
import OriginalCodeBlock from '@theme-original/CodeBlock'

type Props = {
  children: string | { props?: { children?: string } }
  className?: string
  metastring?: string
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
  return <OriginalCodeBlock {...props} />
}