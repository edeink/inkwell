import styles from './index.module.less';

export default function TestButton({ onRun, disabled }: { onRun: () => void; disabled?: boolean }) {
  return (
    <button className={styles.button} onClick={onRun} disabled={disabled}>
      运行测试
    </button>
  );
}
