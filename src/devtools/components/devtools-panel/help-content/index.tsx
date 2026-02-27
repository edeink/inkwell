/**
 * Devtools 帮助内容组件
 *
 * 用于展示快捷键说明与操作提示文案。
 * 注意事项：包含快捷键与功能说明。
 * 潜在副作用：无。
 */
import { HOTKEY_ACTION, type HotkeyAction } from '../../../constants';

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
    return '切换拾取模式';
  }
  if (action === HOTKEY_ACTION.CLOSE) {
    return '关闭面板';
  }
  return '打开面板';
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
      <div className={styles.helpTitle}>帮助</div>

      <div className={styles.helpGroup}>
        <div className={styles.helpGroupTitle}>顶部图标</div>
        <div className={styles.helpItem}>
          <div className={styles.helpIcon}>
            <InspectOutlined />
          </div>
          <div className={styles.helpText}>
            <div className={styles.helpItemTitle}>拾取</div>
            <div className={styles.helpItemDesc}>悬浮高亮，点击选中</div>
          </div>
        </div>
        <div className={styles.helpItem}>
          <div className={styles.helpIcon}>
            <CloseOutlined />
          </div>
          <div className={styles.helpText}>
            <div className={styles.helpItemTitle}>关闭</div>
            <div className={styles.helpItemDesc}>隐藏面板</div>
          </div>
        </div>
      </div>

      <div className={styles.helpDivider} />

      <div className={styles.helpGroup}>
        <div className={styles.helpGroupTitle}>Tree 面板</div>
        <div className={styles.helpItem}>
          <div className={styles.helpIcon}>
            <SearchOutlined />
          </div>
          <div className={styles.helpText}>
            <div className={styles.helpItemTitle}>搜索</div>
            <div className={styles.helpItemDesc}>过滤组件树</div>
          </div>
        </div>
        <div className={styles.helpItem}>
          <div className={styles.helpIconGroup}>
            <LeftOutlined />
            <RightOutlined />
          </div>
          <div className={styles.helpText}>
            <div className={styles.helpItemTitle}>面包屑</div>
            <div className={styles.helpItemDesc}>快速跳转到路径节点</div>
          </div>
        </div>
        <div className={styles.helpItem}>
          <div className={styles.helpIcon}>
            <ConsoleOutlined />
          </div>
          <div className={styles.helpText}>
            <div className={styles.helpItemTitle}>打印当前节点</div>
            <div className={styles.helpItemDesc}>在控制台输出当前选中的 Widget 对象</div>
          </div>
        </div>
      </div>

      <div className={styles.helpDivider} />

      <div className={styles.helpGroup}>
        <div className={styles.helpGroupTitle}>快捷键</div>
        <div className={styles.helpShortcut}>
          <span className={styles.helpKbd}>{combo}</span>
          <span className={styles.helpShortcutDesc}>{getShortcutDesc(action)}</span>
        </div>
      </div>
    </div>
  );
}
