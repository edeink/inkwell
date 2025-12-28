import { Card, Col, Row, Statistic } from 'antd';
import { useMemo } from 'react';

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
      build: ((m.buildMs || 0) / total) * 100,
      layout: ((m.layoutMs || 0) / total) * 100,
      paint: ((m.paintMs || 0) / total) * 100,
      nodes: m.nodes,
      totalTime: total,
    };
  }, [results]);

  if (!metrics) {
    return <div style={{ padding: 24, textAlign: 'center' }}>暂无测试数据</div>;
  }

  return (
    <div className={styles.report}>
      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Build 耗时占比"
              value={metrics.build}
              precision={1}
              suffix="%"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Layout 耗时占比"
              value={metrics.layout}
              precision={1}
              suffix="%"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Paint 耗时占比"
              value={metrics.paint}
              precision={1}
              suffix="%"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>
      <div style={{ marginTop: 24, textAlign: 'center', color: '#666' }}>
        测试节点数: {metrics.nodes} | 总耗时: {metrics.totalTime.toFixed(1)}ms
      </div>
    </div>
  );
}
