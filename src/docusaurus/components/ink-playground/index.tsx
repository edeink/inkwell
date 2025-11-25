import React from 'react';
import Inkwell from '../inkwell';
import ControlPanel from '../control-panel';
import EditorPane from '../editor-pane';
import { CopyOutlined } from '@ant-design/icons';
import styles from './index.module.less';

interface InkPlaygroundProps {
  code: string;
  width?: number;
  height?: number;
  readonly?: boolean;
}

function stripJsxImportSource(src: string) {
  return src
    .replace(/\/\*+\s*@jsxImportSource[\s\S]*?\*\//g, '')
    .replace(/\/\/\s*@jsxImportSource[^\n]*/g, '')
    .trim()
}

export default function InkPlayground({ code, width = 600, height = 300, readonly = false }: InkPlaygroundProps) {
  const initial = React.useMemo(() => stripJsxImportSource(code), [code]);
  const [localCode, setLocalCode] = React.useState(initial);
  const [committedCode, setCommittedCode] = React.useState(initial);
  const [error, setError] = React.useState<string | null>(null);
  const [running, setRunning] = React.useState(false);

  const onRun = React.useCallback(() => {
    setRunning(true);
    setCommittedCode(localCode);
  }, [localCode]);

  const onClear = React.useCallback(() => {
    setCommittedCode('');
    setError(null);
  }, []);

  if (readonly) {
    return (
      <div className={styles.readOnly}>
        <Inkwell
          data={initial}
          width={width}
          height={height}
          readonly
          onError={(e) => { setError(e); setRunning(false); }}
          onSuccess={() => { setError(null); setRunning(false); }}
        />
      </div>
    );
  }

  return (
    <div className={styles.rootVertical}>
      <button
        className={styles.copyBtn}
        onClick={() => { navigator.clipboard.writeText(stripJsxImportSource(localCode)).catch(() => { }) }}
        aria-label="复制代码"
      >
        <CopyOutlined /> 复制
      </button>
      <Inkwell
        data={committedCode}
        width={width}
        height={height}
        readonly={false}
        onError={(e) => { setError(e); setRunning(false); }}
        onSuccess={() => { setError(null); setRunning(false); }}
      />
      <EditorPane value={localCode} onChange={setLocalCode} collapsedHeight={280} />
      <ControlPanel running={running} error={error} onRun={onRun} onClear={onClear} />
    </div>
  );
}