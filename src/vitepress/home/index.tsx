import {
  AppstoreOutlined,
  BookOutlined,
  CodeOutlined,
  GlobalOutlined,
  RocketOutlined,
  ToolOutlined,
} from '@ant-design/icons';

import InkPlayground from '@/site/components/ink-playground';
import { industryBenchmarks, performanceDisclaimer } from '@/site/data/benchmarks';
import styles from '@/site/pages/index.module.less';

export const showcaseCode = `
<Container padding={24} borderRadius={16} color="#000000" width={500}>
  <Column spacing={16} crossAxisAlignment="center" mainAxisSize="min">
    <Text text="InkWell Studio" fontSize={24} color="#ffffff" fontWeight={700} />
    <Wrap spacing={16} runSpacing={24}>
      {[
        { text: '像素直控', color: '#003a8c' },
        { text: 'JSX 支持', color: '#531dab' },
        { text: 'DevTools 调试', color: '#1a7f37' },
        { text: 'Widget 布局', color: '#d48806' },
        { text: '完善文档', color: '#1677ff' },
        { text: '跨平台兼容', color: '#b32aa9' },
      ].map(({ text, color }) => (
        <Container width={140} height={90} color={color} borderRadius={12}>
          <Center>
            <Text text={text} fontSize={16} color="#ffffff" fontWeight={600} />
          </Center>
        </Container>
      ))}
    </Wrap>
  </Column>
</Container>`;

export default function VitePressHome() {
  return (
    <div className={styles.scrollContainer}>
      <section className={styles.heroSection}>
        <h1 className={styles.heroTitle}>Inkwell · Canvas 驱动的现代 UI</h1>
        <p className={styles.heroSubtitle}>
          高性能 Canvas 渲染引擎，让 JSX 构建复杂图形界面变得简单高效。
        </p>
        <div className={styles.heroButtons}>
          <a className={styles.primaryBtn} href="/docs/basic/intro.html">
            快速开始
          </a>
          <a className={styles.secondaryBtn} href="/demo/" rel="noreferrer">
            在线 Playground
          </a>
        </div>
      </section>

      <section className={styles.featuresSection}>
        <h2 className={styles.sectionTitle}>核心优势</h2>
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon} aria-hidden="true">
              <RocketOutlined />
            </div>
            <h3>Canvas 高性能渲染</h3>
            <p>绕过 DOM，直控像素，图形密集场景稳 60FPS。</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon} aria-hidden="true">
              <CodeOutlined />
            </div>
            <h3>JSX 友好语法</h3>
            <p>使用你熟悉的 JSX 语法编写 UI，快速上手。</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon} aria-hidden="true">
              <ToolOutlined />
            </div>
            <h3>DevTools 支持</h3>
            <p>内置强大的调试工具，支持节点检视、属性实时编辑与性能分析。</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon} aria-hidden="true">
              <AppstoreOutlined />
            </div>
            <h3>Widget 系统</h3>
            <p>提供 Row, Column, Stack 等丰富的基础组件，快速搭建复杂布局。</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon} aria-hidden="true">
              <BookOutlined />
            </div>
            <h3>完善文档</h3>
            <p>详尽 API 与示例，快速上手与定位问题。</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon} aria-hidden="true">
              <GlobalOutlined />
            </div>
            <h3>跨平台兼容</h3>
            <p>标准 Canvas API，一套代码多平台运行。</p>
          </div>
        </div>
      </section>

      <section className={styles.jsxSection}>
        <h2 className={styles.sectionTitle}>JSX 即写即得</h2>
        <InkPlayground mode="readonly" code={showcaseCode} />
      </section>

      <section className={styles.perfSection}>
        <h2 className={styles.sectionTitle}>极致性能</h2>
        <div className={styles.chartContainer}>
          <div className={styles.barChart}>
            <div className={`${styles.barRow} ${styles.dom}`}>
              <span className={styles.label}>DOM</span>
              <div className={styles.track}>
                <div className={styles.fill}>基准</div>
              </div>
            </div>
            <div className={`${styles.barRow} ${styles.ink}`}>
              <span className={styles.label}>InkWell</span>
              <div className={styles.track}>
                <div className={styles.fill}>≈100% FPS 提升</div>
              </div>
            </div>
          </div>
          <p className={styles.perfDesc}>备注：2000+ 节点基准测试结果</p>
          <div style={{ textAlign: 'center' }}>
            <a className={styles.perfBtn} href="/docs/meta/test-benchmark">
              在线测试
            </a>
          </div>
        </div>
      </section>

      <section className={styles.industrySection}>
        <h2 className={styles.sectionTitle}>性能潜力</h2>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={styles.statValue}>~60%</span>
              <span className={styles.statTrend}>↓</span>
            </div>
            <span className={styles.statLabel}>包体积</span>
            <p className={styles.statDesc}>
              剥离 WebKit 冗余，
              <br />
              实现轻量化部署
            </p>
            <div className={styles.statSource}>
              <span className={styles.sourceLabel}>参考：</span>
              <a
                href={industryBenchmarks.find((b) => b.id === 'kuaishou-kwaijs')?.source.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                快手 KwaiJS
              </a>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={styles.statValue}>~40%</span>
              <span className={styles.statTrend}>↓</span>
            </div>
            <span className={styles.statLabel}>内存占用</span>
            <p className={styles.statDesc}>
              去 DOM 树化，
              <br />
              降低复杂页面开销
            </p>
            <div className={styles.statSource}>
              <span className={styles.sourceLabel}>参考：</span>
              <a
                href={industryBenchmarks.find((b) => b.id === 'alibaba-kraken')?.source.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                阿里 Kraken
              </a>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={styles.statValue}>30%+</span>
              <span className={styles.statTrend}>↑</span>
            </div>
            <span className={styles.statLabel}>启动速度</span>
            <p className={styles.statDesc}>
              消除解析耗时，
              <br />
              实现秒开体验
            </p>
            <div className={styles.statSource}>
              <span className={styles.sourceLabel}>参考：</span>
              <a
                href={industryBenchmarks.find((b) => b.id === 'tencent-pag')?.source.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                腾讯 PAG
              </a>
            </div>
          </div>
        </div>

        <div className={styles.disclaimerBox}>
          <p className={styles.disclaimerIcon}>ℹ️</p>
          <div className={styles.disclaimerText}>
            {performanceDisclaimer
              .split('\n')
              .filter(Boolean)
              .map((line, i) => (
                <p key={i}>{line}</p>
              ))}
          </div>
        </div>
      </section>

      <section className={styles.ecosystemSection}>
        <h2 className={styles.sectionTitle}>更多生态</h2>
        <div className={styles.ecosystemGrid}>
          <div className={styles.ecosystemCard}>
            <div className={styles.screenshot}>
              <div className={styles.fakeToolbar}>
                <div className={`${styles.dot} ${styles.r}`}></div>
                <div className={`${styles.dot} ${styles.y}`}></div>
                <div className={`${styles.dot} ${styles.g}`}></div>
              </div>
              <div className={styles.fakeContent}>
                <div className={styles.sidebar}>
                  <div className={styles.fakeItem}></div>
                  <div className={styles.fakeItem}></div>
                  <div className={styles.fakeItem}></div>
                </div>
                <div className={styles.main}>&lt;Inspector /&gt;</div>
              </div>
            </div>
            <h3>可视化调试</h3>
            <p>内置节点树检视器与属性编辑器，像调试 DOM 一样轻松。</p>
            <a className={styles.learnMoreBtn} href="/docs/advanced/devtools">
              了解更多 →
            </a>
          </div>

          <div className={styles.ecosystemCard}>
            <div className={styles.screenshot}>
              <div className={styles.fakeToolbar}>
                <div className={`${styles.dot} ${styles.r}`}></div>
                <div className={`${styles.dot} ${styles.y}`}></div>
                <div className={`${styles.dot} ${styles.g}`}></div>
              </div>
              <div
                className={styles.fakeContent}
                style={{ justifyContent: 'center', alignItems: 'center', gap: 16 }}
              >
                <div className={styles.uiBtnPrimary}>Button</div>
                <div className={styles.uiBtnGhost}>Ghost</div>
                <div className={styles.uiToggle}>
                  <div className={styles.uiToggleThumb}></div>
                </div>
              </div>
              <div className={styles.wipBadge}>构建中</div>
            </div>
            <h3>Ink Design</h3>
            <p>专为 Canvas 打造的现代化组件库，提供开箱即用的精美 UI。</p>
            <span className={styles.comingSoonText}>Coming Soon...</span>
          </div>
        </div>
      </section>
    </div>
  );
}
