import { CheckCircleTwoTone, ClockCircleTwoTone, HourglassTwoTone } from '@ant-design/icons';
import { Progress, Space, Tag, Tooltip } from 'antd';

import { TestStatus } from '../../index.types';

import styles from './index.module.less';

export type ProgressItem = {
  key: string;
  name: string;
  status: TestStatus;
  current: number;
  total: number;
};

/**
 * StatusPanel
 * 展示整体进度与每个测试任务的状态、完成度与当前轮次。
 *
 * 输入：进度项数组与当前任务信息；可选紧凑模式与运行序号。
 * 输出：状态标签、进度条与任务网格。
 */
export default function StatusPanel({
  items,
  current,
  compact,
}: {
  items: ProgressItem[];
  current: { name: string; round: number; total: number } | null;
  compact?: boolean;
}) {
  // 汇总整体完成度：避免超过 total 时溢出
  const totalAll = items.reduce((s, it) => s + it.total, 0);
  const currentAll = items.reduce((s, it) => s + Math.min(it.current, it.total), 0);
  const overallPercent = totalAll ? Math.round((currentAll / totalAll) * 100) : 0;
  const statusLabel = (s: ProgressItem['status'] | 'error') =>
    s === TestStatus.Pending
      ? '准备中'
      : s === TestStatus.Running
        ? '运行中'
        : s === TestStatus.Done
          ? '已完成'
          : '错误';
  const isRunning = items.some((it) => it.status === TestStatus.Running);
  const allDone = items.length > 0 && items.every((it) => it.status === TestStatus.Done);

  return (
    <div className={`${styles.panel} ${compact ? styles.panelCompact : ''}`}>
      <div className={styles.title}>测试状态</div>
      <div className={styles.currentBlock}>
        <Space size={8} wrap>
          {allDone ? (
            <>
              <span className={styles.fixedCell}>
                <Tag color="success">状态: 已完成</Tag>
              </span>
              <span className={styles.fixedCell}>
                <Tag color="default">测试类型: 多轮性能基准测试</Tag>
              </span>
            </>
          ) : isRunning && current ? (
            <>
              <span>
                <Tag color="processing">状态: 运行中</Tag>
              </span>
              <span>
                <Tag color="default">测试类型: 多轮性能基准测试</Tag>
              </span>
              <span className={styles.fixedCell}>
                <Tag color="blue">
                  当前测试: {current.name} (<span className={styles.num}>{current.round}</span>/
                  <span className={styles.num}>{current.total}</span>轮)
                </Tag>
              </span>
              <Tooltip title="展示整体测试完成度">
                <span className={styles.hourglass} data-testid="hourglass">
                  <HourglassTwoTone twoToneColor="var(--ink-demo-primary)" />
                </span>
              </Tooltip>
            </>
          ) : (
            <>
              <span className={styles.fixedCell}>
                <Tag color="default">当前测试: 待开始</Tag>
              </span>
              <span className={styles.fixedCell}>
                <Tag color="default">状态: 准备中</Tag>
              </span>
              <span className={styles.fixedCell}>
                <Tag color="default">测试类型: 多轮性能基准测试</Tag>
              </span>
            </>
          )}
        </Space>
        <div className={styles.progressRow}>
          <Progress
            percent={overallPercent}
            size="small"
            strokeColor="var(--ink-demo-primary)"
            trailColor="var(--ink-demo-bg-surface)"
          />
        </div>
      </div>

      <div className={styles.tasksGrid}>
        {items.map((it) => (
          <div key={it.key} className={styles.taskItem}>
            <span className={styles.taskTitle}>{it.name}</span>
            <div className={styles.taskRight}>
              {it.status === TestStatus.Done ? (
                <CheckCircleTwoTone twoToneColor="var(--ink-demo-success)" />
              ) : (
                <ClockCircleTwoTone
                  twoToneColor={
                    it.status === TestStatus.Running
                      ? 'var(--ink-demo-primary)'
                      : 'var(--ink-demo-text-secondary)'
                  }
                />
              )}
              <Tag
                color={
                  it.status === TestStatus.Done
                    ? 'success'
                    : it.status === TestStatus.Running
                      ? 'processing'
                      : 'default'
                }
              >
                {statusLabel(it.status)}
              </Tag>
              <div className={styles.progressMini}>
                <Progress
                  percent={
                    it.total ? Math.round((Math.min(it.current, it.total) / it.total) * 100) : 0
                  }
                  size="small"
                  showInfo={false}
                />
                <span className={styles.progressNum}>
                  {Math.min(it.current, it.total)}/{it.total}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
