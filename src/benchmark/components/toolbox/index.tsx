import { DownloadOutlined, SwapOutlined, UploadOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import { useRef } from 'react';

import styles from './index.module.less';

import type { ExperimentType, ExportPayload, TestResult } from '../../index.types';

type Props = {
  results: TestResult[];
  experimentType: ExperimentType;
  onToggleMode: () => void;
  onUploadBaseline: (data: TestResult[]) => void;
};

export default function Toolbox({
  results,
  experimentType,
  onToggleMode,
  onUploadBaseline,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const downloadJSON = () => {
    if (!results.length) {
      return;
    }
    const payload: ExportPayload = { results };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'benchmark-results.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const triggerUpload = () => {
    inputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as { results: TestResult[] } | TestResult[];
      const arr = Array.isArray(parsed) ? parsed : parsed.results;
      if (Array.isArray(arr)) {
        onUploadBaseline(arr);
      }
    } catch {}
    e.target.value = '';
  };

  return (
    <div className={styles.toolbox}>
      <Tooltip title="下载JSON数据" placement="bottom">
        <button className={styles.iconBtn} onClick={downloadJSON} aria-label="download">
          <DownloadOutlined />
        </button>
      </Tooltip>
      <input
        ref={inputRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={onFileChange}
      />
      <Tooltip title="上传对比数据" placement="bottom">
        <button className={styles.iconBtn} onClick={triggerUpload} aria-label="upload">
          <UploadOutlined />
        </button>
      </Tooltip>
      <Tooltip title="切换对比模式" placement="bottom">
        <button className={styles.iconBtn} onClick={onToggleMode} aria-label="toggle">
          <SwapOutlined />
        </button>
      </Tooltip>
    </div>
  );
}
