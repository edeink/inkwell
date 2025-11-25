import { CopyOutlined, PlayCircleOutlined, DeleteOutlined } from '@ant-design/icons'
import { Tooltip } from 'antd'
import React from 'react'
import styles from './index.module.less'

export interface ControlPanelProps {
  running: boolean
  error: string | null
  onRun: () => void
  onClear: () => void
}

export default function ControlPanel({ running, error, onRun, onClear }: ControlPanelProps) {
  const [copied, setCopied] = React.useState(false)
  const copyTimerRef = React.useRef<number | null>(null)
  const onCopy = React.useCallback(() => {
    if (!error) return
    navigator.clipboard.writeText(error).then(() => {
      setCopied(true)
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => {
        setCopied(false)
        copyTimerRef.current = null
      }, 1500)
    }).catch(() => { })
  }, [error])
  React.useEffect(() => {
    return () => { if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current) }
  }, [])
  return (
    <div className={styles.controlPanel}>
      <div className={styles.controlBar}>
        <Tooltip title="运行" placement="top" mouseEnterDelay={0.15}>
          <button
            type="button"
            aria-label="运行"
            className={styles.iconBtn}
            onClick={onRun}
            disabled={running}
          >
            <PlayCircleOutlined />
          </button>
        </Tooltip>
        <Tooltip title="清空" placement="top" mouseEnterDelay={0.15}>
          <button
            type="button"
            aria-label="清空"
            className={styles.iconBtn}
            onClick={onClear}
          >
            <DeleteOutlined />
          </button>
        </Tooltip>
        <span className={styles.status} data-status={running ? 'loading' : error ? 'error' : 'idle'}>
          {running ? '运行中' : error ? '错误' : '就绪'}
        </span>
      </div>
      {error && (
        <div id="ink_error" className={styles.error}>
          <div className={styles.errorHeader}>
            <span>运行出错</span>
            <button className={styles.copyBtn} onClick={onCopy}>
              <CopyOutlined /> {copied ? '复制成功' : '复制'}
            </button>
          </div>
          <pre>{error}</pre>
        </div>
      )}
    </div>
  )
}