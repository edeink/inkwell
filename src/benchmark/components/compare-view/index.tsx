import { useMemo } from 'react';

import Charts from '../charts';
import styles from '../charts/index.module.less';
import ReportDisplay from '../report-display';

import type { DiffMetric, ExperimentType, PerformanceMetrics, TestResult } from '../../index.types';

type Props = {
  results: TestResult[];
  experimentType: ExperimentType;
  baseline?: TestResult[] | null;
  thresholdPercent?: number;
  onToggleMode?: () => void;
  onUploadBaseline?: (data: TestResult[]) => void;
};

// 结果统一在一套图表中展示（DOM 与 Widget 为不同 series）

/**
 * 计算性能指标相对于基线的差异：返回包含字段级差异的列表。
 *
 * @param baseline 基线测试结果集
 * @param current 当前测试结果集
 * @param thresholdPercent 劣化阈值（百分比，0~1）
 * @returns 差异度量列表
 */
function computeDiff(
  baseline: TestResult[],
  current: TestResult[],
  thresholdPercent: number,
): DiffMetric[] {
  const idx = new Map<string, TestResult>();
  for (const r of baseline) {
    idx.set(`${r.name}|${r.average.metrics.nodes}`, r);
  }
  const diffs: DiffMetric[] = [];
  const fields: (keyof PerformanceMetrics)[] = [
    'createTimeMs',
    'avgPerNodeMs',
    'buildMs',
    'layoutMs',
    'paintMs',
    'memoryDelta',
    'cpuBusyPercent',
  ];
  for (const r of current) {
    const key = `${r.name}|${r.average.metrics.nodes}`;
    const base = idx.get(key);
    if (!base) {
      continue;
    }
    for (const f of fields) {
      const bv = (base.average.metrics[f] as number | undefined) ?? 0;
      const cv = (r.average.metrics[f] as number | undefined) ?? 0;
      const delta = cv - bv;
      const pct = bv > 0 ? delta / bv : 0;
      diffs.push({
        name: r.name,
        nodes: r.average.metrics.nodes,
        field: f,
        baseline: bv,
        current: cv,
        delta,
        deltaPercent: pct,
        degraded: pct > thresholdPercent,
      });
    }
  }
  return diffs;
}

/**
 * CompareView
 * 展示图表与（历史模式下的）性能劣化报告 HTML，支持外部切换模式与上传基线数据。
 *
 * @param results 当前测试结果集
 * @param experimentType 展示模式
 * @param baseline 历史基线结果集
 * @param thresholdPercent 劣化阈值（默认 5%）
 * @param onToggleMode 切换模式回调
 * @param onUploadBaseline 上传基线回调
 */
export default function CompareView({
  results,
  experimentType,
  baseline,
  thresholdPercent = 0.05,
  onToggleMode,
  onUploadBaseline,
}: Props) {
  const showHistory = experimentType === 'history' && baseline && baseline.length > 0;

  // 当处于历史模式且存在基线时，生成劣化项的报告 HTML
  const diffHtml = useMemo(() => {
    if (!showHistory || !baseline) {
      return '';
    }
    const diffs = computeDiff(baseline, results, thresholdPercent).filter((d) => d.degraded);
    if (!diffs.length) {
      return '<div>未检测到超过阈值的性能劣化。</div>';
    }
    const grouped = new Map<string, DiffMetric[]>();
    diffs.forEach((d) => {
      const k = `${d.name}|${d.nodes}`;
      const arr = grouped.get(k) || [];
      arr.push(d);
      grouped.set(k, arr);
    });
    const rows = Array.from(grouped.entries()).map(([k, arr]) => {
      const [name, nodes] = k.split('|');
      const items = arr
        .map(
          (d) =>
            `<li><strong>${d.field}</strong>: ${d.baseline.toFixed(2)} → <span style="color:#dc2626">${d.current.toFixed(2)} (${(d.deltaPercent * 100).toFixed(1)}%)</span></li>`,
        ) // red
        .join('');
      return `<div><h4 style="margin:6px 0">${name} @ ${nodes}</h4><ul>${items}</ul></div>`;
    });
    return `<div><h3 style="margin:6px 0;color:#dc2626">性能劣化警报（>${(thresholdPercent * 100).toFixed(0)}%）</h3>${rows.join('')}</div>`;
  }, [showHistory, baseline, results, thresholdPercent]);

  return (
    <div className={styles.grid}>
      <Charts
        results={results}
        experimentType={experimentType}
        onToggleMode={onToggleMode}
        onUploadBaseline={onUploadBaseline}
      />
      {showHistory ? (
        <div className={styles.chart}>
          <ReportDisplay content={diffHtml} />
        </div>
      ) : null}
    </div>
  );
}
