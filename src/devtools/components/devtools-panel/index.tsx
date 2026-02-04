import { useLayoutEffect, useMemo, useState } from 'react';

import { DevtoolsHelpContent } from './help-content';
import { DevToolsPanelInner } from './panel-inner';

export interface DevToolsProps {
  onClose?: () => void;
  shortcut?: string | { combo: string; action?: 'open' | 'toggle' | 'inspect' | 'close' };
}

export function DevToolsPanel(props: DevToolsProps) {
  const [activeInspect, setActiveInspect] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);

  const combo = useMemo(() => {
    const fromProps =
      typeof props.shortcut === 'string'
        ? props.shortcut
        : typeof props.shortcut === 'object'
          ? props.shortcut?.combo
          : undefined;
    if (fromProps) {
      return fromProps;
    }
    try {
      return localStorage.getItem('INKWELL_DEVTOOLS_HOTKEY') || 'CmdOrCtrl+Shift+D';
    } catch {
      return 'CmdOrCtrl+Shift+D';
    }
  }, [props.shortcut]);

  const action = useMemo(() => {
    if (typeof props.shortcut === 'object' && props.shortcut?.action) {
      return props.shortcut.action;
    }
    return 'open';
  }, [props.shortcut]);

  const helpContent = useMemo(
    () => <DevtoolsHelpContent combo={combo} action={action} />,
    [combo, action],
  );

  useLayoutEffect(() => {
    const handleOpen = () => setVisible(true);
    const handleClose = () => {
      setVisible(false);
      setActiveInspect(false);
    };
    const handleInspectToggle = () => {
      setVisible(true);
      setActiveInspect((v) => !v);
    };

    window.addEventListener('INKWELL_DEVTOOLS_OPEN', handleOpen);
    window.addEventListener('INKWELL_DEVTOOLS_CLOSE', handleClose);
    window.addEventListener('INKWELL_DEVTOOLS_INSPECT_TOGGLE', handleInspectToggle);
    return () => {
      window.removeEventListener('INKWELL_DEVTOOLS_OPEN', handleOpen);
      window.removeEventListener('INKWELL_DEVTOOLS_CLOSE', handleClose);
      window.removeEventListener('INKWELL_DEVTOOLS_INSPECT_TOGGLE', handleInspectToggle);
    };
  }, []);

  if (!visible && !activeInspect) {
    return null;
  }

  return (
    <DevToolsPanelInner
      activeInspect={activeInspect}
      visible={visible}
      helpContent={helpContent}
      setActiveInspect={setActiveInspect}
      setVisible={setVisible}
    />
  );
}
