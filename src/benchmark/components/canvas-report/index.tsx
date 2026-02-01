import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';

import { getThemeColor } from '../../utils/theme';

import styles from './index.module.less';

import type { TestResult } from '../../index.types';

type Props = {
  results: TestResult[];
};

export default function CanvasReport({ results }: Props) {
  const metrics = useMemo(() => {
    if (!results.length) {
      return null;
    }
    // 取最后一个结果（通常只有一项，或者是最新的一项）
    const res = results[results.length - 1];
    const m = res.average.metrics;

    // 计算总耗时用于分母（注意：createTimeMs = build + layout + paint）
    const total = m.createTimeMs || 1;

    return {
      build: m.buildMs || 0,
      layout: m.layoutMs || 0,
      paint: m.paintMs || 0,
      buildPct: ((m.buildMs || 0) / total) * 100,
      layoutPct: ((m.layoutMs || 0) / total) * 100,
      paintPct: ((m.paintMs || 0) / total) * 100,
      nodes: m.nodes,
      totalTime: total,
    };
  }, [results]);

  const phaseOption = useMemo(() => {
    if (!metrics) {
      return {};
    }
    const bgBase = getThemeColor('--ink-demo-bg-base');
    const colorPrimary = getThemeColor('--ink-demo-primary');
    const colorSuccess = getThemeColor('--ink-demo-success');
    const colorWarning = getThemeColor('--ink-demo-warning');
    // 文本颜色可以使用 var 变量，ECharts 在 textStyle 中支持
    const textPrimary = 'var(--ink-demo-text-primary)';

    return {
      title: {
        text: '阶段耗时占比',
        left: 'center',
        textStyle: { color: textPrimary },
      },
      tooltip: { trigger: 'item', formatter: '{b}: {c}%' },
      series: [
        {
          name: 'Phase',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: bgBase,
            borderWidth: 2,
          },
          label: {
            show: false,
            position: 'center',
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 20,
              fontWeight: 'bold',
              color: textPrimary,
            },
          },
          labelLine: {
            show: false,
          },
          data: [
            {
              value: parseFloat(metrics.buildPct.toFixed(1)),
              name: 'Build',
              itemStyle: { color: colorPrimary },
            },
            {
              value: parseFloat(metrics.layoutPct.toFixed(1)),
              name: 'Layout',
              itemStyle: { color: colorSuccess },
            },
            {
              value: parseFloat(metrics.paintPct.toFixed(1)),
              name: 'Paint',
              itemStyle: { color: colorWarning },
            },
          ],
        },
      ],
    };
  }, [metrics]);

  const totalTimeOption = useMemo(() => {
    if (!metrics) {
      return {};
    }
    const colorPrimary = getThemeColor('--ink-demo-primary');
    const colorSuccess = getThemeColor('--ink-demo-success');
    const colorWarning = getThemeColor('--ink-demo-warning');
    const textPrimary = 'var(--ink-demo-text-primary)';

    return {
      textStyle: { color: textPrimary },
      title: {
        text: '总耗时分解 (ms)',
        textStyle: { color: textPrimary },
      },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: ['Total Time Breakdown'] },
      yAxis: { type: 'value' },
      series: [
        {
          name: 'Build',
          type: 'bar',
          stack: 'total',
          data: [metrics.build],
          itemStyle: { color: colorPrimary },
        },
        {
          name: 'Layout',
          type: 'bar',
          stack: 'total',
          data: [metrics.layout],
          itemStyle: { color: colorSuccess },
        },
        {
          name: 'Paint',
          type: 'bar',
          stack: 'total',
          data: [metrics.paint],
          itemStyle: { color: colorWarning },
        },
      ],
    };
  }, [metrics]);

  if (!metrics) {
    return <div style={{ padding: 24, textAlign: 'center' }}>暂无测试数据</div>;
  }

  return (
    <div className={styles.report}>
      <div className={styles.header}>
        <h3 className={styles.title}>性能测试报告</h3>
        <div className={styles.nodeCount}>节点数量: {metrics.nodes}</div>
      </div>

      <div className={styles.cardsGrid4}>
        <div className={`${styles.card} ${styles.cardTotal}`}>
          <div className={styles.statTitle}>Total Duration</div>
          <div className={styles.statValueRow}>
            <span className={styles.statValue}>{metrics.totalTime.toFixed(1)}</span>
            <span className={styles.statSuffix}>ms</span>
          </div>
        </div>
        <div className={`${styles.card} ${styles.cardBuild}`}>
          <div className={styles.statTitle}>Build</div>
          <div className={styles.statValueRow}>
            <span className={`${styles.statValue} ${styles.statValueBuild}`}>
              {metrics.buildPct.toFixed(1)}
            </span>
            <span className={styles.statSuffix}>%</span>
          </div>
          <div className={styles.statLabel}>耗时: {metrics.build.toFixed(1)}ms</div>
        </div>
        <div className={`${styles.card} ${styles.cardLayout}`}>
          <div className={styles.statTitle}>Layout</div>
          <div className={styles.statValueRow}>
            <span className={`${styles.statValue} ${styles.statValueLayout}`}>
              {metrics.layoutPct.toFixed(1)}
            </span>
            <span className={styles.statSuffix}>%</span>
          </div>
          <div className={styles.statLabel}>耗时: {metrics.layout.toFixed(1)}ms</div>
        </div>
        <div className={`${styles.card} ${styles.cardPaint}`}>
          <div className={styles.statTitle}>Paint</div>
          <div className={styles.statValueRow}>
            <span className={`${styles.statValue} ${styles.statValuePaint}`}>
              {metrics.paintPct.toFixed(1)}
            </span>
            <span className={styles.statSuffix}>%</span>
          </div>
          <div className={styles.statLabel}>耗时: {metrics.paint.toFixed(1)}ms</div>
        </div>
      </div>

      <div className={styles.cardsGrid2}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>耗时占比</div>
          <ReactECharts option={phaseOption} style={{ height: 300 }} />
        </div>
        <div className={styles.card}>
          <div className={styles.cardTitle}>耗时分解</div>
          <ReactECharts option={totalTimeOption} style={{ height: 300 }} />
        </div>
      </div>
    </div>
  );
}
