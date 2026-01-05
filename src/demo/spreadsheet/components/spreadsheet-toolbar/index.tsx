import { ReloadOutlined, TableOutlined } from '@ant-design/icons';
import React from 'react';

import styles from './index.module.less';
import { ToolbarButton } from './toolbar-button';

import { useTheme } from '@/styles/theme';

interface SpreadsheetToolbarProps {
  onUpdateData: () => void;
  onAddRow: () => void;
}

export const SpreadsheetToolbar: React.FC<SpreadsheetToolbarProps> = ({
  onUpdateData,
  onAddRow,
}) => {
  const theme = useTheme();

  return (
    <div
      className={styles.toolbar}
      style={
        {
          '--border-base': theme.border.base,
          '--background-surface': theme.background.surface,
          '--text-primary': theme.text.primary,
          '--text-secondary': theme.text.secondary,
          '--action-hover': theme.primary + '1A',
          '--action-selected': theme.primary + '33',
        } as React.CSSProperties
      }
    >
      <span className={styles.title}>Spreadsheet Demo</span>
      <ToolbarButton icon={<ReloadOutlined />} tooltip="更新数据" onClick={onUpdateData} />
      <ToolbarButton icon={<TableOutlined />} tooltip="生成大数据 (10k Rows)" onClick={onAddRow} />
    </div>
  );
};
