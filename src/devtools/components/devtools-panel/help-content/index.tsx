/**
 * Devtools 帮助内容组件
 *
 * 用于展示快捷键说明与操作提示文案。
 * 注意事项：依赖 DEVTOOLS_HELP_TEXT 文案配置。
 * 潜在副作用：无。
 */
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

/**
 * 获取快捷键说明文案
 *
 * @param action 快捷键动作类型
 * @returns 对应的说明文本
 * @remarks
 * 注意事项：必须覆盖所有 HotkeyAction 分支。
 * 潜在副作用：无。
 */
function getShortcutDesc(action: HotkeyAction): string {
  if (action === HOTKEY_ACTION.INSPECT) {
    return DEVTOOLS_HELP_TEXT.SHORTCUT_DESC_PICK;
  }
  if (action === HOTKEY_ACTION.CLOSE) {
    return DEVTOOLS_HELP_TEXT.SHORTCUT_DESC_CLOSE;
  }
  return DEVTOOLS_HELP_TEXT.SHORTCUT_DESC_OPEN;
}

/**
 * DevtoolsHelpContent
 *
 * @param props 帮助内容参数
 * @returns React 元素
 * @remarks
 * 注意事项：combo 用于动态展示快捷键文本。
 * 潜在副作用：无。
 */
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
