import { DEVTOOLS_HELP_TEXT, HOTKEY_ACTION, type HotkeyAction } from '../../../constants';

import styles from './index.module.less';

import {
  CloseOutlined,
  ConsoleOutlined,
  InspectOutlined,
  LeftOutlined,
  RightOutlined,
  SearchOutlined,
} from '@/ui/icons';

function getShortcutDesc(action: HotkeyAction): string {
  if (action === HOTKEY_ACTION.INSPECT) {
    return DEVTOOLS_HELP_TEXT.SHORTCUT_DESC_PICK;
  }
  if (action === HOTKEY_ACTION.CLOSE) {
    return DEVTOOLS_HELP_TEXT.SHORTCUT_DESC_CLOSE;
  }
  return DEVTOOLS_HELP_TEXT.SHORTCUT_DESC_OPEN;
}

export function DevtoolsHelpContent({ combo, action }: { combo: string; action: HotkeyAction }) {
  return (
    <div className={styles.helpPanel}>
      <div className={styles.helpTitle}>{DEVTOOLS_HELP_TEXT.TITLE}</div>

      <div className={styles.helpGroup}>
        <div className={styles.helpGroupTitle}>{DEVTOOLS_HELP_TEXT.GROUP_TOP_ICONS}</div>
        <div className={styles.helpItem}>
          <div className={styles.helpIcon}>
            <InspectOutlined />
          </div>
          <div className={styles.helpText}>
            <div className={styles.helpItemTitle}>{DEVTOOLS_HELP_TEXT.ITEM_PICK_TITLE}</div>
            <div className={styles.helpItemDesc}>{DEVTOOLS_HELP_TEXT.ITEM_PICK_DESC}</div>
          </div>
        </div>
        <div className={styles.helpItem}>
          <div className={styles.helpIcon}>
            <CloseOutlined />
          </div>
          <div className={styles.helpText}>
            <div className={styles.helpItemTitle}>{DEVTOOLS_HELP_TEXT.ITEM_CLOSE_TITLE}</div>
            <div className={styles.helpItemDesc}>{DEVTOOLS_HELP_TEXT.ITEM_CLOSE_DESC}</div>
          </div>
        </div>
      </div>

      <div className={styles.helpDivider} />

      <div className={styles.helpGroup}>
        <div className={styles.helpGroupTitle}>{DEVTOOLS_HELP_TEXT.GROUP_TREE_PANEL}</div>
        <div className={styles.helpItem}>
          <div className={styles.helpIcon}>
            <SearchOutlined />
          </div>
          <div className={styles.helpText}>
            <div className={styles.helpItemTitle}>{DEVTOOLS_HELP_TEXT.ITEM_SEARCH_TITLE}</div>
            <div className={styles.helpItemDesc}>{DEVTOOLS_HELP_TEXT.ITEM_SEARCH_DESC}</div>
          </div>
        </div>
        <div className={styles.helpItem}>
          <div className={styles.helpIconGroup}>
            <LeftOutlined />
            <RightOutlined />
          </div>
          <div className={styles.helpText}>
            <div className={styles.helpItemTitle}>{DEVTOOLS_HELP_TEXT.ITEM_BREADCRUMB_TITLE}</div>
            <div className={styles.helpItemDesc}>{DEVTOOLS_HELP_TEXT.ITEM_BREADCRUMB_DESC}</div>
          </div>
        </div>
        <div className={styles.helpItem}>
          <div className={styles.helpIcon}>
            <ConsoleOutlined />
          </div>
          <div className={styles.helpText}>
            <div className={styles.helpItemTitle}>{DEVTOOLS_HELP_TEXT.ITEM_PRINT_TITLE}</div>
            <div className={styles.helpItemDesc}>{DEVTOOLS_HELP_TEXT.ITEM_PRINT_DESC}</div>
          </div>
        </div>
      </div>

      <div className={styles.helpDivider} />

      <div className={styles.helpGroup}>
        <div className={styles.helpGroupTitle}>{DEVTOOLS_HELP_TEXT.GROUP_SHORTCUT}</div>
        <div className={styles.helpShortcut}>
          <span className={styles.helpKbd}>{combo}</span>
          <span className={styles.helpShortcutDesc}>{getShortcutDesc(action)}</span>
        </div>
      </div>
    </div>
  );
}
