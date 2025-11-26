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
    }));
    return {
      title: {
        text: '刷新率(Hz) vs 节点数',
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
        name: 'Hz',
      },
      series,
    } as EChartsOption;
  }, [byTest]);

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
      </div>
      <div>
        <button onClick={handleDownload}>下载测试结果</button>
      </div>
    </>
  );
}
