import { useLayoutEffect, useMemo, useState } from 'react';

import {
  DEVTOOLS_EVENTS,
  HOTKEY_ACTION,
  type HotkeyAction,
  isTypeObject,
  isTypeString,
} from '../../constants';

import { DevtoolsHelpContent } from './help-content';
import { DevToolsPanelInner } from './panel-inner';

import { DEVTOOLS_HOTKEY, DEVTOOLS_HOTKEY_DEFAULT } from '@/utils/local-storage';

export interface DevToolsProps {
  onClose?: () => void;
  shortcut?: string | { combo: string; action?: HotkeyAction };
}

export function DevToolsPanel(props: DevToolsProps) {
  const [activeInspect, setActiveInspect] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);

  const combo = useMemo(() => {
    const fromProps = isTypeString(props.shortcut)
      ? props.shortcut
      : isTypeObject(props.shortcut)
        ? (props.shortcut as { combo?: string }).combo
        : undefined;
    if (fromProps) {
      return fromProps;
    }
    return DEVTOOLS_HOTKEY.get() ?? DEVTOOLS_HOTKEY_DEFAULT;
  }, [props.shortcut]);

  const action = useMemo(() => {
    if (isTypeObject(props.shortcut) && (props.shortcut as { action?: string }).action) {
      return (props.shortcut as { action: HotkeyAction }).action;
    }
    return HOTKEY_ACTION.OPEN;
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

    window.addEventListener(DEVTOOLS_EVENTS.OPEN, handleOpen);
    window.addEventListener(DEVTOOLS_EVENTS.CLOSE, handleClose);
    window.addEventListener(DEVTOOLS_EVENTS.INSPECT_TOGGLE, handleInspectToggle);
    return () => {
      window.removeEventListener(DEVTOOLS_EVENTS.OPEN, handleOpen);
      window.removeEventListener(DEVTOOLS_EVENTS.CLOSE, handleClose);
      window.removeEventListener(DEVTOOLS_EVENTS.INSPECT_TOGGLE, handleInspectToggle);
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
