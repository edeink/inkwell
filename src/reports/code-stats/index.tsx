import ReactECharts from 'echarts-for-react';
import { useEffect, useMemo, useState } from 'react';

type CodeStatsBucket = {
  lines: number;
  files: number;
};

type CodeStatsCategoryKey = 'TS' | '测试' | '样式' | '文档' | '其他';

type CodeStatsReport = {
  generatedAt: string;
  rootsRel: string[];
  outDir: string;
  categories: Record<CodeStatsCategoryKey, CodeStatsBucket>;
  summary: { total: CodeStatsBucket };
  modules: Array<{
    module: string;
    totals: Record<CodeStatsCategoryKey | '合计', CodeStatsBucket>;
  }>;
};

const nf = new Intl.NumberFormat('zh-CN');

function pct(part: number, total: number): string {
  if (!total) {
    return '0%';
  }
  const p = (part / total) * 100;
  if (p < 0.1 && part > 0) {
    return '<0.1%';
  }
  return `${p.toFixed(1)}%`;
}

function toErrorMessage(e: unknown): string {
  if (e instanceof Error) {
    return e.message;
  }
  return String(e);
}

export default function CodeStatsReportPage() {
  const [report, setReport] = useState<CodeStatsReport | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/reports/code-stats/code-stats.json', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(`拉取报告数据失败：HTTP ${res.status}`);
        }
        const json = (await res.json()) as CodeStatsReport;
        if (!cancelled) {
          setReport(json);
        }
      } catch (e) {
        if (!cancelled) {
          setError(toErrorMessage(e));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalLines = report?.summary.total.lines ?? 0;
  const cats = report?.categories ?? null;
  const modules = report?.modules ?? [];

  const moduleBarOption = useMemo(() => {
    if (!report) {
      return null;
    }
    const labels = report.modules.map((m) => `/${m.module}`);
    const seriesDef: Array<{
      key: CodeStatsCategoryKey;
      name: string;
      color: string;
    }> = [
      { key: 'TS', name: 'TS', color: '#4f8cff' },
      { key: '测试', name: '测试', color: '#ff7a45' },
      { key: '样式', name: '样式', color: '#73d13d' },
      { key: '文档', name: '文档', color: '#9254de' },
      { key: '其他', name: '其他', color: '#8c8c8c' },
    ];

    const enableZoom = labels.length > 12;

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (v: unknown) => nf.format(Number(v) || 0),
      },
      legend: {
        textStyle: { color: 'rgba(0,0,0,0.55)' },
      },
      grid: {
        left: 12,
        right: 18,
        top: 34,
        bottom: enableZoom ? 34 : 12,
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        axisLabel: { color: 'rgba(0,0,0,0.55)' },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } },
      },
      yAxis: {
        type: 'category',
        data: labels,
        axisLabel: { color: 'rgba(0,0,0,0.55)' },
        axisTick: { show: false },
      },
      dataZoom: enableZoom
        ? [
            {
              type: 'inside',
              yAxisIndex: 0,
              zoomOnMouseWheel: true,
              moveOnMouseMove: true,
            },
            {
              type: 'slider',
              yAxisIndex: 0,
              right: 6,
              width: 10,
              brushSelect: false,
            },
          ]
        : [],
      series: seriesDef.map((s) => ({
        type: 'bar',
        name: s.name,
        stack: 'total',
        emphasis: { focus: 'series' },
        itemStyle: { color: s.color },
        data: report.modules.map((m) => m.totals[s.key].lines),
      })),
    };
  }, [report]);

  const catPieOption = useMemo(() => {
    if (!report) {
      return null;
    }
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (p: { name: string; value: number }) => {
          const v = p?.value ?? 0;
          return `${p.name}：${nf.format(v)}（${pct(v, report.summary.total.lines)}）`;
        },
      },
      legend: { bottom: 0, textStyle: { color: 'rgba(0,0,0,0.55)' } },
      series: [
        {
          type: 'pie',
          radius: ['42%', '70%'],
          avoidLabelOverlap: true,
          itemStyle: { borderWidth: 0 },
          label: { show: false },
          labelLine: { show: false },
          data: [
            { name: 'TS', value: report.categories.TS.lines, itemStyle: { color: '#4f8cff' } },
            { name: '测试', value: report.categories.测试.lines, itemStyle: { color: '#ff7a45' } },
            { name: '样式', value: report.categories.样式.lines, itemStyle: { color: '#73d13d' } },
            { name: '文档', value: report.categories.文档.lines, itemStyle: { color: '#9254de' } },
            { name: '其他', value: report.categories.其他.lines, itemStyle: { color: '#8c8c8c' } },
          ],
        },
      ],
    };
  }, [report]);

  if (loading) {
    return (
      <div style={{ height: '100vh', padding: 24, fontFamily: 'system-ui' }}>
        <div style={{ fontSize: 14, opacity: 0.7 }}>正在加载代码规模报告…</div>
      </div>
    );
  }

  if (error || !cats) {
    return (
      <div style={{ height: '100vh', padding: 24, fontFamily: 'system-ui' }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>代码规模报告加载失败</div>
        <div style={{ marginTop: 8, fontSize: 13, opacity: 0.7 }}>{error || '未知错误'}</div>
        <div style={{ marginTop: 12, fontSize: 13, opacity: 0.7 }}>
          请先运行 <code>pnpm run stats:code</code> 生成{' '}
          <code>reports/code-stats/code-stats.json</code>。
        </div>
      </div>
    );
  }

  const cardItems = [
    { k: '总行数', v: nf.format(totalLines) },
    {
      k: '有效 TS/TSX',
      v: `${nf.format(cats.TS.lines)}（${pct(cats.TS.lines, totalLines)}）`,
    },
    {
      k: '测试',
      v: `${nf.format(cats.测试.lines)}（${pct(cats.测试.lines, totalLines)}）`,
    },
    {
      k: '文档',
      v: `${nf.format(cats.文档.lines)}（${pct(cats.文档.lines, totalLines)}）`,
    },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: 24,
        fontFamily: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
        ].join(', '),
        background: '#f6f7fb',
        color: 'rgba(0,0,0,0.86)',
      }}
    >
      <div style={{ display: 'grid', gap: 6, marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>项目代码规模报告</div>
        <div style={{ fontSize: 13, opacity: 0.66 }}>
          扫描目录：<code>{(report?.rootsRel || []).join(', ')}</code> · 生成时间：
          <code>{report?.generatedAt}</code>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 12,
        }}
      >
        {cardItems.map((x) => (
          <div
            key={x.k}
            style={{
              background: '#fff',
              border: '1px solid rgba(0,0,0,0.10)',
              borderRadius: 14,
              padding: '14px 14px 12px',
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.66 }}>{x.k}</div>
            <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800 }}>{x.v}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 0.8fr',
          gap: 12,
          marginTop: 12,
        }}
      >
        <div
          style={{
            background: '#fff',
            border: '1px solid rgba(0,0,0,0.10)',
            borderRadius: 14,
            padding: 14,
          }}
        >
          <div style={{ marginBottom: 10, fontSize: 14, opacity: 0.66 }}>
            模块分布（按行数堆叠）
          </div>
          {moduleBarOption ? (
            <ReactECharts style={{ height: 420 }} option={moduleBarOption} />
          ) : null}
        </div>
        <div
          style={{
            background: '#fff',
            border: '1px solid rgba(0,0,0,0.10)',
            borderRadius: 14,
            padding: 14,
          }}
        >
          <div style={{ marginBottom: 10, fontSize: 14, opacity: 0.66 }}>类别占比</div>
          {catPieOption ? <ReactECharts style={{ height: 420 }} option={catPieOption} /> : null}
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          background: '#fff',
          border: '1px solid rgba(0,0,0,0.10)',
          borderRadius: 14,
          padding: 14,
        }}
      >
        <div style={{ marginBottom: 10, fontSize: 14, opacity: 0.66 }}>模块明细</div>
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: 'rgba(0,0,0,0.55)' }}>
                {['模块', 'TS(有效)', '测试', '样式', '文档', '其他', '合计'].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '10px 10px',
                      borderBottom: '1px solid rgba(0,0,0,0.10)',
                      whiteSpace: 'nowrap',
                      fontWeight: 600,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map((m) => (
                <tr key={m.module}>
                  <td
                    style={{
                      padding: '10px 10px',
                      borderBottom: '1px solid rgba(0,0,0,0.06)',
                    }}
                  >
                    /{m.module}
                  </td>
                  {(['TS', '测试', '样式', '文档', '其他', '合计'] as const).map((k) => (
                    <td
                      key={k}
                      style={{
                        padding: '10px 10px',
                        borderBottom: '1px solid rgba(0,0,0,0.06)',
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {nf.format(m.totals[k].lines)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, opacity: 0.66, lineHeight: 1.6 }}>
        统计口径：按文件行数统计（以 {'\\n'} 计数），TS/JS/CSS/Less/Markdown
        等文本文件；测试通过文件名（.test/.spec） 与目录（__tests__/tests）识别。
        <br />
        默认忽略：node_modules、dist/build/coverage、.vitepress
        产物与缓存等目录，以及二进制/超大文件（&gt; 2MB）。
      </div>
    </div>
  );
}
