import { CheckCircleTwoTone, ClockCircleTwoTone, HourglassTwoTone } from '@ant-design/icons';
import { Progress, Space, Tag, Tooltip } from 'antd';

import styles from './index.module.less';

export type ProgressItem = {
  key: string;
  name: string;
  status: 'pending' | 'running' | 'done';
  current: number;
  total: number;
};

export default function StatusPanel({
  items,
  current,
  compact,
  runSeq,
}: {
  items: ProgressItem[];
  current: { name: string; round: number; total: number } | null;
  compact?: boolean;
  runSeq?: number;
}) {
  const totalAll = items.reduce((s, it) => s + it.total, 0);
  const currentAll = items.reduce((s, it) => s + Math.min(it.current, it.total), 0);
  const overallPercent = totalAll ? Math.round((currentAll / totalAll) * 100) : 0;
  const statusLabel = (s: ProgressItem['status'] | 'error') =>
    s === 'pending' ? '准备中' : s === 'running' ? '运行中' : s === 'done' ? '已完成' : '错误';
  const isRunning = items.some((it) => it.status === 'running');
  const allDone = items.length > 0 && items.every((it) => it.status === 'done');

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
                  <HourglassTwoTone twoToneColor="#1677ff" />
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
          <Progress percent={overallPercent} size="small" />
        </div>
      </div>

      <div className={styles.tasksGrid}>
        {items.map((it) => (
          <div key={it.key} className={styles.taskItem}>
            <span className={styles.taskTitle}>{it.name}</span>
            <div className={styles.taskRight}>
              {it.status === 'done' ? (
                <CheckCircleTwoTone twoToneColor="#52c41a" />
              ) : (
                <ClockCircleTwoTone twoToneColor={it.status === 'running' ? '#1677ff' : '#aaa'} />
              )}
              <Tag
                color={
                  it.status === 'done'
                    ? 'success'
                    : it.status === 'running'
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
