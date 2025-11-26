import styles from "./index.module.less";

export type ProgressItem = { key: string; name: string; status: "pending" | "running" | "done"; current: number; total: number };

export default function StatusPanel({
 items, current 
}: { items: ProgressItem[]; current: { name: string; round: number; total: number } | null }) {
  return (
    <div className={styles.panel}>
      <div className={styles.title}>测试状态</div>
      <div className={styles.currentLine}>
        {current ? (
          <span className={styles.currentType}>{current.name} 第{current.round}/共{current.total}</span>
        ) : (
          <span className={styles.currentType}>待开始</span>
        )}
      </div>
      <div className={styles.tasksGrid}>
        {items.map((it) => (
          <div key={it.key} className={styles.taskItem}>
            <span className={styles.taskTitle}>{it.name}</span>
            {it.status === "done" ? (
              <span className={styles.badgeDone}>完成</span>
            ) : it.status === "running" ? (
              <span className={styles.badgeRunning}>进行中 {it.current}/{it.total}</span>
            ) : (
              <span className={styles.badgePending}>待测试</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}