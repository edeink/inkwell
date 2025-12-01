import 'antd/dist/reset.css';
import React, { useRef, useState } from 'react';

import { DevTools } from './components/devtools';
export { DevTools } from './components/devtools';

// HotkeyManager 暂不提供，AutoDevTools 仅按默认显隐使用

export interface AutoDevToolsProps {
  defaultVisible?: boolean;
}

export function AutoDevTools({ defaultVisible = false }: AutoDevToolsProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState<boolean>(defaultVisible);

  return (
    <div ref={hostRef}>
      {visible ? React.createElement(DevTools, { onClose: () => setVisible(false) }) : null}
    </div>
  );
}
