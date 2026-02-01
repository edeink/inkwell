import styles from './index.module.less';

import {
  CloseOutlined,
  ConsoleOutlined,
  EyeOutlined,
  LeftOutlined,
  RightOutlined,
  SearchOutlined,
} from '@/ui/icons';

export function DevtoolsHelpContent({ combo }: { combo: string }) {
  return (
    <div className={styles.helpPanel}>
      <div className={styles.helpTitle}>帮助</div>

      <div className={styles.helpGroup}>
        <div className={styles.helpGroupTitle}>顶部图标</div>
        <div className={styles.helpItem}>
          <div className={styles.helpIcon}>
            <EyeOutlined />
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
          <span className={styles.helpShortcutDesc}>显示/隐藏面板</span>
        </div>
      </div>
    </div>
  );
}
