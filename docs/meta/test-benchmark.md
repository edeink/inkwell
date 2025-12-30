---
id: test-benchmark
title: 性能基准测试
sidebar_position: 10
description: InkWell 与 DOM 的交互式性能基准对比
---

import { BenchmarkApp } from '@/benchmark/index.tsx'
import BrowserOnly from '@docusaurus/BrowserOnly'
import ErrorBoundary from '@docusaurus/ErrorBoundary'

# 性能基准测试

本页提供 InkWell 与 DOM 的交互式性能基准对比，支持不同节点规模与场景（文本、Flex、绝对定位）。

<div>
  <details>
    <summary>基准方法说明</summary>
    <ul>
      <li>统计指标：帧率（FPS）、主线程 Long Task 时长、内存占用。</li>
      <li>流程：每轮执行采集 → 构建 → 再采集，重复多次取平均。</li>
      <li>环境因素：浏览器优化与设备性能可能影响绝对数值，建议关注相对趋势。</li>
    </ul>
  </details>
  <BrowserOnly>
    {() => (
      <ErrorBoundary>
        <BenchmarkApp />
      </ErrorBoundary>
    )}
  </BrowserOnly>
</div>
