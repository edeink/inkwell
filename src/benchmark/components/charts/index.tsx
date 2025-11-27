import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';

import Toolbox from '../toolbox';

import styles from './index.module.less';

import type { EChartsOption } from 'echarts';
import type { TestResult } from '../../index.types';

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
      const fps = median(r.average.frames.map((f) => f.fps));
      const arr = map[r.name] ?? [];
      arr.push({
        nodes,
        createMs,
        mem,
        fps,
      });
      map[r.name] = arr;
    }
    Object.keys(map).forEach((k) => map[k].sort((a, b) => a.nodes - b.nodes));
    return map;
  }, [results]);

  const nodeAxis = useMemo(() => {
    const set = new Set<number>();
    for (const k of Object.keys(byTest)) {
      byTest[k].forEach((v) => set.add(v.nodes));
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [byTest]);

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
    const baseStep = diffs.length ? diffs.reduce((acc, v) => gcd(acc, v)) : Math.max(1, max - min);
    const span = Math.max(1, max - min);
    const target = Math.max(1, Math.floor(span / 5));
    const k = Math.max(1, Math.round(target / baseStep));
    const interval = Math.max(baseStep, k * baseStep);
    return {
      type: 'value',
      name: '节点数',
      min,
      max,
      interval,
      boundaryGap: [0, 0],
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
    const series: any[] = Object.keys(byTest).map((name) => ({
      name,
      type: 'line',
      data: byTest[name].map((v) => [v.nodes, v.createMs]),
      showSymbol: false,
    }));
    return {
      title: {
        text: '总耗时（ms） vs 节点数',
      },
      tooltip: {
        trigger: 'axis',
      },
      legend: {},
      xAxis: xCommon as unknown as EChartsOption['xAxis'],
      yAxis: {
        type: 'value',
        name: '总耗时（ms）',
      },
      series,
    } as EChartsOption;
  }, [byTest, xCommon]);

  const memOption = useMemo<EChartsOption>(() => {
    const series: any[] = Object.keys(byTest).map((name) => ({
      name,
      type: 'line',
      data: byTest[name].map((v) => [v.nodes, v.mem]),
      showSymbol: false,
    }));
    return {
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

  const fpsOption = useMemo<EChartsOption>(() => {
    const series: any[] = Object.keys(byTest).map((name) => ({
      name,
      type: 'line',
      data: byTest[name].map((v) => [v.nodes, v.fps]),
      showSymbol: false,
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

  const jankOption = useMemo<EChartsOption>(() => {
    const series: any[] = Object.keys(byTest).map((name) => ({
      name,
      type: 'line',
      data: byTest[name].map((v) => [v.nodes, r1pLow(results, name, v.nodes).jankCount]),
      showSymbol: false,
    }));
    const yVals = series.flatMap((s: any) => s.data.map((d: any) => d[1]));
    const ySpan = rangeOf(yVals).span;
    return {
      title: { text: '卡顿帧（Jank）' },
      tooltip: { trigger: 'axis' },
      legend: {},
      xAxis: xCommon as unknown as EChartsOption['xAxis'],
      yAxis: { type: ySpan > 1000 ? 'log' : 'value', name: '帧数（frames）' },
      series,
    } as EChartsOption;
  }, [byTest, results, xCommon]);

  const low1Option = useMemo<EChartsOption>(() => {
    const series: any[] = Object.keys(byTest).map((name) => ({
      name,
      type: 'line',
      data: byTest[name].map((v) => [v.nodes, r1pLow(results, name, v.nodes).low1]),
      showSymbol: false,
      markLine: { data: [{ yAxis: 60 }], label: { formatter: '60FPS 基准线' } },
    }));
    const yVals = series.flatMap((s: any) => s.data.map((d: any) => d[1]));
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
    return <div style={{ padding: 16 }}>无数据，请运行测试或检查筛选条件</div>;
  }

  return (
    <>
      <div className={styles.chart} style={{ position: 'relative' }}>
        <ReactECharts style={{ height: 320 }} option={timeOption} />
        {onToggleMode && onUploadBaseline ? (
          <Toolbox
            results={results}
            experimentType={(experimentType as any) || 'dom_vs_widget'}
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
            experimentType={(experimentType as any) || 'dom_vs_widget'}
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
            experimentType={(experimentType as any) || 'dom_vs_widget'}
            onToggleMode={onToggleMode}
            onUploadBaseline={onUploadBaseline}
          />
        ) : null}
      </div>
      <div className={styles.chart} style={{ position: 'relative' }}>
        <ReactECharts style={{ height: 320 }} option={jankOption} />
        {onToggleMode && onUploadBaseline ? (
          <Toolbox
            results={results}
            experimentType={(experimentType as any) || 'dom_vs_widget'}
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
            experimentType={(experimentType as any) || 'dom_vs_widget'}
            onToggleMode={onToggleMode}
            onUploadBaseline={onUploadBaseline}
          />
        ) : null}
      </div>
    </>
  );
}

function rangeOf(nums: number[]) {
  if (!nums.length) {
    return { min: 0, max: 0, span: 0 };
  }
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return { min, max, span: max - min };
}

function r1pLow(results: TestResult[], name: string, nodes: number) {
  const r = results.find((x) => x.name === name && x.average.metrics.nodes === nodes);
  if (!r) {
    return { low1: 0, jankCount: 0 };
  }
  const arr = r.average.frames.map((f) => f.fps).sort((a, b) => a - b);
  const n = Math.max(1, Math.floor(arr.length * 0.01));
  const low = arr.slice(0, n);
  const low1 = low.reduce((s, v) => s + v, 0) / low.length;
  const jankCount = arr.filter((v) => v < 55).length;
  return { low1, jankCount };
}
