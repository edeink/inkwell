import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import SvgIcon from '@site/src/components/SvgIcon';
import styles from './index.module.less';

export default function Home(): JSX.Element {
  return (
    <Layout>
      <main className={styles.container}>
        <nav aria-label="breadcrumb" className={styles.breadcrumbs}>
          <ol>
            <li className={styles.breadcrumbItem + ' active'}>首页</li>
          </ol>
        </nav>

        <section className={styles.hero}>
          <div className={styles.hero + '__content'}>
            <h1>Inkwell · Canvas 驱动的现代 UI</h1>
            <p>
              以 JSX 构建高性能图形界面，兼顾开发效率与渲染性能，适配复杂动效与大规模组件。
            </p>
            <div className={styles.hero + '__content__cta'}>
              <Link className="button button--primary" to="/docs/intro">快速开始</Link>
              <Link className="button button--secondary" href="https://stackblitz.com/github/edeink/inkwell" target="_blank" rel="noreferrer">在线 Playground</Link>
            </div>
          </div>
          <div className={styles.hero + '__visual'} aria-hidden="true">
            <svg viewBox="0 0 600 360" role="img" aria-label="Canvas UI" className={styles.hero + '__visual svg'}>
              <rect x="20" y="20" width="560" height="320" rx="16" fill="var(--ink-surface)" />
              <circle cx="90" cy="90" r="32" fill="var(--ink-primary)" />
              <rect x="160" y="70" width="220" height="24" rx="12" fill="var(--ink-muted)" />
              <rect x="160" y="110" width="180" height="18" rx="9" fill="var(--ink-accent)" />
              <rect x="90" y="150" width="440" height="8" rx="4" fill="var(--ink-muted)" />
              <rect x="90" y="170" width="440" height="8" rx="4" fill="var(--ink-muted)" />
              <rect x="90" y="190" width="300" height="8" rx="4" fill="var(--ink-muted)" />
              <rect x="90" y="230" width="220" height="90" rx="10" fill="var(--ink-card)" />
              <rect x="330" y="230" width="200" height="90" rx="10" fill="var(--ink-card)" />
            </svg>
          </div>
        </section>

        <section className={styles.links}>
          <a className={styles.linkItem} href="https://github.com/edeink/inkwell" target="_blank" rel="noreferrer">
            <SvgIcon name="github" size={24} ariaLabel="GitHub" />
            <span className={styles.linkItem + '__text'}>GitHub 仓库</span>
          </a>
          <a className={styles.linkItem} href="https://stackblitz.com/github/edeink/inkwell" target="_blank" rel="noreferrer">
            <SvgIcon name="code" size={24} ariaLabel="Playground" />
            <span className={styles.linkItem + '__text'}>在线 Playground</span>
          </a>
          <a className={styles.linkItem} href="https://github.com/edeink/inkwell/discussions" target="_blank" rel="noreferrer">
            <SvgIcon name="chat" size={24} ariaLabel="社区" />
            <span className={styles.linkItem + '__text'}>社区讨论</span>
          </a>
        </section>

        <section className={styles.features}>
          <h2>核心特性</h2>
          <div className={styles.grid}>
            <div className={styles.card}>
              <SvgIcon name="performance" size={28} ariaLabel="性能优先" />
              <h3 className={styles.title}>性能优先</h3>
              <p className={styles.desc}>绕过 DOM 重排，控制渲染管线，在图形密集场景保持高 FPS。</p>
            </div>
            <div className={styles.card}>
              <SvgIcon name="jsx" size={28} ariaLabel="JSX 友好" />
              <h3 className={styles.title}>JSX 友好</h3>
              <p className={styles.desc}>以熟悉的 JSX 组件化开发，融入主流 React 生态。</p>
            </div>
            <div className={styles.card}>
              <SvgIcon name="compat" size={28} ariaLabel="跨平台一致" />
              <h3 className={styles.title}>跨平台一致</h3>
              <p className={styles.desc}>统一渲染模型，兼容多浏览器与设备，表现稳定一致。</p>
            </div>
            <div className={styles.card}>
              <SvgIcon name="tooling" size={28} ariaLabel="工程化能力" />
              <h3 className={styles.title}>工程化能力</h3>
              <p className={styles.desc}>示例可在线运行，CI 校验，版本与多语言支持。</p>
            </div>
          </div>
        </section>

        <section className={styles.performance}>
          <h2>性能对比</h2>
          <p>在复杂场景中，Canvas 相较传统 DOM 渲染可显著降低布局与绘制开销。</p>
          <ul className={styles.metrics}>
            <li><strong>渲染速度</strong> 35%–120% 提升</li>
            <li><strong>内存占用</strong> 15%–60% 降低</li>
            <li><strong>平均 FPS</strong> +10–30</li>
          </ul>
          <p>
            参考
            <a href="https://browserbench.org/MotionMark/" target="_blank" rel="noreferrer">MotionMark</a>
            、
            <a href="https://webglreport.com/" target="_blank" rel="noreferrer">WebGL Report</a>
            、
            <a href="https://webglsamples.org/aquarium/aquarium.html" target="_blank" rel="noreferrer">WebGL Aquarium</a>
          </p>
        </section>

        <section className={styles.gettingStarted}>
          <h2>开始使用</h2>
          <p>打开文档导航，查看各 Widgets 的用法与最佳实践；示例代码支持在线编辑与运行。</p>
          <div className={styles.hero + '__content__cta'}>
            <Link className="button button--primary" to="/docs/intro">查看指南</Link>
            <Link className="button button--secondary" to="/docs/widgets/overview">浏览 Widgets</Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}