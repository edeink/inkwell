import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';

import Toolbox from '../toolbox';

import styles from './index.module.less';

import type { TestResult } from '../../index.types';
import type { EChartsOption, SeriesOption } from 'echarts';

/**
 * Charts
 * 将性能测试结果聚合为多维度图表（总耗时、内存、帧率、卡顿计数、1% Low）。
 *
 * @param results 测试结果数组
 * @param experimentType 展示模式：'dom_vs_widget' | 'history'
 * @param onToggleMode 切换图表展示模式的回调
 * @param onUploadBaseline 上传历史基线数据的回调
 * @returns 图表渲染组件
 */
export default function Charts({
  results,
  experimentType,
  onToggleMode,
  onUploadBaseline,
}: {
  results: TestResult[];
  experimentType?: 'dom_vs_widget' | 'history';
  onToggleMode?: () => void;
  onUploadBaseline?: (data: TestResult[]) => void;
}) {
  // 按测试名称聚合不同节点规模下的指标，便于序列化到折线图
  const byTest = useMemo(() => {
    const map: Record<string, { nodes: number; createMs: number; mem: number; fps: number }[]> = {};
    const median = (arr: number[]) => {
      const s = [...arr].sort((a, b) => a - b);
      const m = Math.floor(s.length / 2);
      return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0;
    };
    for (const r of results) {
      const nodes = r.average.metrics.nodes;
      const createMs = r.average.metrics.createTimeMs;
      const mem = r.average.metrics.memoryDelta ?? 0;
      const fps = median(r.average.frames.map((f) => f.fps)); // 使用中位数代表帧率稳定性
      const arr = map[r.name] ?? [];
      arr.push({
        nodes,
        createMs,
        mem,
        fps,
      });
      map[r.name] = arr;
    }
    // 统一按节点数升序，确保折线的横轴有序
    Object.keys(map).forEach((k) => map[k].sort((a, b) => a.nodes - b.nodes));
    return map;
  }, [results]);

  // 计算全部测试覆盖的节点数集合，作为横轴刻度基础
  const nodeAxis = useMemo(() => {
    const set = new Set<number>();
    for (const k of Object.keys(byTest)) {
      byTest[k].forEach((v) => set.add(v.nodes));
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [byTest]);

  // 根据节点数分布自适应横轴配置：使用间隔的最大公约数稳定刻度密度
  const xCommon = useMemo(() => {
    const min = nodeAxis.length ? nodeAxis[0] : 0;
    const max = nodeAxis.length ? nodeAxis[nodeAxis.length - 1] : 1;
    const diffs: number[] = [];
    for (let i = 1; i < nodeAxis.length; i++) {
      const d = Math.abs(nodeAxis[i] - nodeAxis[i - 1]);
      if (d > 0) {
        diffs.push(d);
      }
    }
    const gcd = (a: number, b: number) => {
      let x = Math.abs(a);
      let y = Math.abs(b);
      while (y) {
        const t = x % y;
        x = y;
        y = t;
      }
      return x || 1;
    };
    // 基础步长：差值序列的 GCD；若无差值则回退到区间跨度
    const baseStep = diffs.length ? diffs.reduce((acc, v) => gcd(acc, v)) : Math.max(1, max - min);
    const span = Math.max(1, max - min);
    // 目标刻度个数约为 5 格，估算每格间距
    const target = Math.max(1, Math.floor(span / 5));
    const k = Math.max(1, Math.round(target / baseStep));
    const interval = Math.max(baseStep, k * baseStep);
    return {
      type: 'value',
      name: '节点数',
      min,
      max,
      interval,
      boundaryGap: [0, 0], // 数值轴需使用 [0,0]，避免 boolean 类型不兼容
      axisLabel: {
        formatter: (v: number) => String(Math.round(v)),
        showMinLabel: true,
        showMaxLabel: true,
      },
      axisTick: { show: true },
      splitLine: { show: true },
    } as const;
  }, [nodeAxis]);

  const timeOption = useMemo<EChartsOption>(() => {
    const series: SeriesOption[] = Object.keys(byTest).map((name) => ({
      name,
      type: 'line',
      data: byTest[name].map((v) => [v.nodes, v.createMs]),
      showSymbol: byTest[name].length === 1,
      symbolSize: byTest[name].length === 1 ? 8 : 4,
    }));
    return {
      textStyle: {
        color: 'var(--ink-demo-text-primary)',
      },
      title: {
        text: '总耗时（ms） vs 节点数',
      },
      tooltip: {
        trigger: 'axis',
      },
      legend: {},
      xAxis: xCommon as unknown as EChartsOption['xAxis'], // 类型断言以匹配 ECharts 配置定义
      yAxis: {
        type: 'value',
        name: '总耗时（ms）',
      },
      series,
    } as EChartsOption;
  }, [byTest, xCommon]);

  const memOption = useMemo<EChartsOption>(() => {
    const series: SeriesOption[] = Object.keys(byTest).map((name) => ({
      name,
      type: 'line',
      data: byTest[name].map((v) => [v.nodes, v.mem]),
      showSymbol: byTest[name].length === 1,
      symbolSize: byTest[name].length === 1 ? 8 : 4,
    }));
    return {
      textStyle: {
        color: 'var(--ink-demo-text-primary)',
      },
      title: {
        text: '内存占用（bytes） vs 节点数',
      },
      tooltip: {
        trigger: 'axis',
      },
      legend: {},
      xAxis: xCommon as unknown as EChartsOption['xAxis'],
      yAxis: {
        type: 'value',
        name: '内存占用（bytes）',
      },
      series,
    } as EChartsOption;
  }, [byTest, xCommon]);

  // 帧率图表配置（FPS vs 节点数），含 60FPS 参考线
  const fpsOption = useMemo<EChartsOption>(() => {
    const series: SeriesOption[] = Object.keys(byTest).map((name) => ({
      name,
      type: 'line',
      data: byTest[name].map((v) => [v.nodes, v.fps]),
      showSymbol: byTest[name].length === 1,
      symbolSize: byTest[name].length === 1 ? 8 : 4,
      markLine: { data: [{ yAxis: 60 }], label: { formatter: '60FPS 基准线' } },
    }));
    return {
      title: { text: '帧率（FPS）' },
      tooltip: { trigger: 'axis' },
      legend: {},
      xAxis: xCommon as unknown as EChartsOption['xAxis'],
      yAxis: { type: 'value', name: '帧率（FPS）' },
      series,
    } as EChartsOption;
  }, [byTest, xCommon]);

  // 1% Low 帧率（低于最差 1% 帧的平均 FPS）
  const low1Option = useMemo<EChartsOption>(() => {
    const series: SeriesOption[] = Object.keys(byTest).map((name) => ({
      name,
      type: 'line',
      data: byTest[name].map((v) => [v.nodes, r1pLow(results, name, v.nodes).low1]),
      showSymbol: byTest[name].length === 1,
      symbolSize: byTest[name].length === 1 ? 8 : 4,
      markLine: { data: [{ yAxis: 60 }], label: { formatter: '60FPS 基准线' } },
    }));
    const yVals = series.flatMap((s) => (s.data as number[][]).map((d) => d[1]));
    const ySpan = rangeOf(yVals).span;
    return {
      title: { text: '1% Low 帧率（FPS）' },
      tooltip: { trigger: 'axis' },
      legend: {},
      xAxis: xCommon,
      yAxis: { type: ySpan > 1000 ? 'log' : 'value', name: '帧率（FPS）' },
      series,
    } as unknown as EChartsOption;
  }, [byTest, results, xCommon]);

  if (!results.length) {
    return <div style={{ padding: 16 }}>无数据，请点击「开始」进行测试</div>;
  }

  return (
    <>
      <div className={styles.chart} style={{ position: 'relative' }}>
        <ReactECharts style={{ height: 320 }} option={timeOption} />
        {onToggleMode && onUploadBaseline ? (
          <Toolbox
            results={results}
            experimentType={experimentType || 'dom_vs_widget'}
            onToggleMode={onToggleMode}
            onUploadBaseline={onUploadBaseline}
          />
        ) : null}
      </div>
      <div className={styles.chart} style={{ position: 'relative' }}>
        <ReactECharts style={{ height: 320 }} option={memOption} />
        {onToggleMode && onUploadBaseline ? (
          <Toolbox
            results={results}
            experimentType={experimentType || 'dom_vs_widget'}
            onToggleMode={onToggleMode}
            onUploadBaseline={onUploadBaseline}
          />
        ) : null}
      </div>
      <div className={styles.chart} style={{ position: 'relative' }}>
        <ReactECharts style={{ height: 320 }} option={fpsOption} />
        {onToggleMode && onUploadBaseline ? (
          <Toolbox
            results={results}
            experimentType={experimentType || 'dom_vs_widget'}
            onToggleMode={onToggleMode}
            onUploadBaseline={onUploadBaseline}
          />
        ) : null}
      </div>
      <div className={styles.chart} style={{ position: 'relative' }}>
        <ReactECharts style={{ height: 320 }} option={low1Option} />
        {onToggleMode && onUploadBaseline ? (
          <Toolbox
            results={results}
            experimentType={experimentType || 'dom_vs_widget'}
            onToggleMode={onToggleMode}
            onUploadBaseline={onUploadBaseline}
          />
        ) : null}
      </div>
    </>
  );
}

/**
 * 计算数列范围
 * 返回最小值、最大值与跨度（max-min）。
 */
function rangeOf(nums: number[]) {
  if (!nums.length) {
    return { min: 0, max: 0, span: 0 };
  }
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return { min, max, span: max - min };
}

/**
 * 计算 1% Low
 * - 1% Low：排序后最低 1% 帧的平均 FPS；
 */
function r1pLow(results: TestResult[], name: string, nodes: number) {
  const r = results.find((x) => x.name === name && x.average.metrics.nodes === nodes);
  if (!r) {
    return { low1: 0 };
  }
  const arr = r.average.frames.map((f) => f.fps).sort((a, b) => a - b);
  const n = Math.max(1, Math.floor(arr.length * 0.01));
  const low = arr.slice(0, n);
  const low1 = low.reduce((s, v) => s + v, 0) / low.length;
  return { low1 };
}
