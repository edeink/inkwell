import { Card, Col, Row, Statistic, Typography } from 'antd';
import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';

import styles from './index.module.less';

import type { TestResult } from '../../index.types';

const { Title } = Typography;

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
    return {
      title: { text: '阶段耗时占比', left: 'center' },
      tooltip: { trigger: 'item', formatter: '{b}: {c}%' },
      series: [
        {
          name: 'Phase',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
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
            },
          },
          labelLine: {
            show: false,
          },
          data: [
            {
              value: parseFloat(metrics.buildPct.toFixed(1)),
              name: 'Build',
              itemStyle: { color: '#1890ff' },
            },
            {
              value: parseFloat(metrics.layoutPct.toFixed(1)),
              name: 'Layout',
              itemStyle: { color: '#52c41a' },
            },
            {
              value: parseFloat(metrics.paintPct.toFixed(1)),
              name: 'Paint',
              itemStyle: { color: '#faad14' },
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
    return {
      title: { text: '总耗时分解 (ms)' },
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
          itemStyle: { color: '#1890ff' },
        },
        {
          name: 'Layout',
          type: 'bar',
          stack: 'total',
          data: [metrics.layout],
          itemStyle: { color: '#52c41a' },
        },
        {
          name: 'Paint',
          type: 'bar',
          stack: 'total',
          data: [metrics.paint],
          itemStyle: { color: '#faad14' },
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
        <Title level={4} style={{ margin: 0 }}>
          性能测试报告
        </Title>
        <div className={styles.nodeCount}>节点数量: {metrics.nodes}</div>
      </div>

      <Row gutter={16}>
        <Col span={6}>
          <Card bordered={false} style={{ background: '#fafafa' }}>
            <Statistic
              title="Total Duration"
              value={metrics.totalTime}
              precision={1}
              suffix="ms"
              valueStyle={{ fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ background: '#f0f5ff' }}>
            <Statistic
              title="Build"
              value={metrics.buildPct}
              precision={1}
              suffix="%"
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
              耗时: {metrics.build.toFixed(1)}ms
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ background: '#f6ffed' }}>
            <Statistic
              title="Layout"
              value={metrics.layoutPct}
              precision={1}
              suffix="%"
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
              耗时: {metrics.layout.toFixed(1)}ms
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ background: '#fff7e6' }}>
            <Statistic
              title="Paint"
              value={metrics.paintPct}
              precision={1}
              suffix="%"
              valueStyle={{ color: '#faad14' }}
            />
            <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
              耗时: {metrics.paint.toFixed(1)}ms
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={12}>
          <Card title="耗时占比">
            <ReactECharts option={phaseOption} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="耗时分解">
            <ReactECharts option={totalTimeOption} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
