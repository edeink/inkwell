import InkPlayground from '@/site/components/ink-playground';
import styles from '@/site/pages/index.module.less';
import {
  AppstoreOutlined,
  BookOutlined,
  CodeOutlined,
  GlobalOutlined,
  RocketOutlined,
  ToolOutlined,
} from '@/ui/icons';

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

const industryBenchmarks = [
  {
    id: 'pixijs-v8',
    source: {
      url: 'https://pixijs.com/blog/particlecontainer-v8',
    },
  },
  {
    id: 'electron-size',
    source: {
      url:
        'https://medium.com/gowombat/' +
        'how-to-reduce-the-size-of-an-electron-app-installer-a2bc88a37732',
    },
  },
  {
    id: 'cef-minimal',
    source: {
      url: 'https://magpcss.org/ceforum/viewtopic.php?f=6&t=15213',
    },
  },
] as const;

const performanceDisclaimer = `
* 声明：以上内容用于说明“纯渲染管线”带来的性能潜力，引用来自公开资料，仅供参考。
* 口径：同一指标会随平台、打包与业务复杂度变化。`;

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
              <span className={styles.statValue}>100万+</span>
              <span className={styles.statTrend}>↑</span>
            </div>
            <span className={styles.statLabel}>元素吞吐</span>
            <p className={styles.statDesc}>
              批量绘制与合批渲染，
              <br />
              支撑高密度画面与交互
            </p>
            <div className={styles.statSource}>
              <span className={styles.sourceLabel}>参考：</span>
              <a
                href={industryBenchmarks.find((b) => b.id === 'pixijs-v8')?.source.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                PixiJS v8
              </a>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={styles.statValue}>2000+→1</span>
              <span className={styles.statTrend}>↓</span>
            </div>
            <span className={styles.statLabel}>内存占用</span>
            <p className={styles.statDesc}>
              将 2000+ 节点收敛到 1 个 Canvas，
              <br />
              减少样式/布局链路，冷启动与首帧绘制更快
            </p>
            <div className={styles.statSource}>
              <span className={styles.sourceLabel}>参考：</span>
              <a
                href="https://web.dev/articles/critical-rendering-path"
                target="_blank"
                rel="noopener noreferrer"
              >
                web.dev
              </a>
              <span>/</span>
              <a
                href="https://docs.flutter.dev/resources/architectural-overview"
                target="_blank"
                rel="noopener noreferrer"
              >
                Flutter
              </a>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={styles.statValue}>↓25MB</span>
              <span className={styles.statTrend}>↓</span>
            </div>
            <span className={styles.statLabel}>包体积</span>
            <p className={styles.statDesc}>
              对比携带 Chromium 的方案，
              <br />
              115MB→90MB（示例口径）
            </p>
            <div className={styles.statSource}>
              <span className={styles.sourceLabel}>参考：</span>
              <a
                href={industryBenchmarks.find((b) => b.id === 'electron-size')?.source.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Electron
              </a>
              <span>/</span>
              <a
                href={industryBenchmarks.find((b) => b.id === 'cef-minimal')?.source.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                CEF
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
              <div className={styles.wipBadge}>逐步完善中</div>
            </div>
            <h3>Ink Design</h3>
            <p>面向 Canvas 场景的 UI 组件集合，覆盖常用交互与基础布局（持续补齐中）。</p>
            <a className={styles.learnMoreBtn} href="/docs/api/comp/">
              查看组件 API →
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
