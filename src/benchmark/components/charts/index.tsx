import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';

import styles from './index.module.less';

import type { TestResult } from '../../index.types';
import type { EChartsOption } from 'echarts';

export default function Charts({ results }: { results: TestResult[] }) {
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

  const timeOption = useMemo<EChartsOption>(() => {
    const series: any[] = Object.keys(byTest).map((name) => ({
      name,
      type: 'line',
      data: byTest[name].map((v) => [v.nodes, v.createMs]),
      showSymbol: false,
    }));
    return {
      title: {
        text: '总耗时(ms) vs 节点数',
      },
      tooltip: {
        trigger: 'axis',
      },
      legend: {},
      xAxis: {
        type: 'log',
        name: '节点数',
        logBase: 10,
      },
      yAxis: {
        type: 'value',
        name: 'ms',
      },
      series,
    } as EChartsOption;
  }, [byTest]);

  const memOption = useMemo<EChartsOption>(() => {
    const series: any[] = Object.keys(byTest).map((name) => ({
      name,
      type: 'line',
      data: byTest[name].map((v) => [v.nodes, v.mem]),
      showSymbol: false,
    }));
    return {
      title: {
        text: '内存占用(Δ bytes) vs 节点数',
      },
      tooltip: {
        trigger: 'axis',
      },
      legend: {},
      xAxis: {
        type: 'log',
        name: '节点数',
        logBase: 10,
      },
      yAxis: {
        type: 'value',
        name: 'bytes',
      },
      series,
    } as EChartsOption;
  }, [byTest]);

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
      xAxis: { type: 'log', name: '场景（节点数）', logBase: 10 },
      yAxis: { type: 'value', name: '帧率（FPS）' },
      series,
    } as EChartsOption;
  }, [byTest]);

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
      xAxis: { type: 'log', name: '场景（节点数）', logBase: 10 },
      yAxis: { type: ySpan > 1000 ? 'log' : 'value', name: '帧数（frames）' },
      series,
    } as EChartsOption;
  }, [byTest, results]);

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
      xAxis: { type: 'log', name: '场景（节点数）', logBase: 10 },
      yAxis: { type: ySpan > 1000 ? 'log' : 'value', name: '帧率（FPS）' },
      series,
    } as EChartsOption;
  }, [byTest, results]);

  const handleDownload = () => {
    if (!results.length) {
      return;
    }
    const blob = new Blob(
      [
        JSON.stringify(
          {
            results,
          },
          null,
          2,
        ),
      ],
      {
        type: 'application/json',
      },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'benchmark-results.json';
    a.click();
    return () => URL.revokeObjectURL(url);
  };

  if (!results.length) {
    return null;
  }

  return (
    <>
      <div className={styles.grid}>
        <ReactECharts
          className={styles.chart}
          style={{
            height: 320,
          }}
          option={timeOption}
        />
        <ReactECharts
          className={styles.chart}
          style={{
            height: 320,
          }}
          option={memOption}
        />
        <ReactECharts
          className={styles.chart}
          style={{
            height: 320,
          }}
          option={fpsOption}
        />
        <ReactECharts
          className={styles.chart}
          style={{
            height: 320,
          }}
          option={jankOption}
        />
        <ReactECharts
          className={styles.chart}
          style={{
            height: 320,
          }}
          option={low1Option}
        />
      </div>
      <div>
        <button onClick={handleDownload}>下载测试结果</button>
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
