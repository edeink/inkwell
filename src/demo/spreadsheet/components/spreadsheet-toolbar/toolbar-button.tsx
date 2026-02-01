import cn from 'classnames';
import React from 'react';

import styles from './index.module.less';

import { Tooltip } from '@/ui';

interface ToolbarButtonProps {
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
  className?: string;
}

export const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  icon,
  tooltip,
  onClick,
  className,
}) => {
  return (
    <Tooltip title={tooltip}>
      <button className={cn(styles.button, className)} onClick={onClick} type="button">
        {icon}
      </button>
    </Tooltip>
  );
};
