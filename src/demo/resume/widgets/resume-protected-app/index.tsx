/** @jsxImportSource @/utils/compiler */
import { RESUME_UNLOCK_EVENT, RESUME_UNLOCK_STORAGE_KEY } from '../../helpers/constants';
import { sha256Hex } from '../../helpers/crypto';
import { BlurBoundary } from '../blur-boundary';
import { ResumeDemoApp, type ResumeDemoAppProps } from '../resume-demo-app';

import { Modal } from '@/comp';
import {
  AlignmentGeometry,
  Column,
  Container,
  CrossAxisAlignment,
  Input,
  MainAxisSize,
  Stack,
  StackFit,
  StatefulWidget,
  Text,
} from '@/core';
import { Themes } from '@/styles/theme';

const RESUME_PASSWORD_SHA256_HEX =
  '99f1e14363b74a463ffb12d216b5d1864555b0103af6f69a' + '76d16fe1dcd26238';

type ResumeProtectedState = {
  locked: boolean;
  password: string;
  error: string;
  verifying: boolean;
};

export class ResumeProtectedApp extends StatefulWidget<ResumeDemoAppProps, ResumeProtectedState> {
  protected state: ResumeProtectedState = {
    locked: true,
    password: '',
    error: '',
    verifying: false,
  };

  protected override initWidget(data: ResumeDemoAppProps) {
    super.initWidget(data);
    let unlocked = false;
    if (typeof window !== 'undefined') {
      try {
        // 只要存储里标记为已解锁，就不再弹出密码框（用于 Demo 体验）
        unlocked = window.localStorage.getItem(RESUME_UNLOCK_STORAGE_KEY) === '1';
      } catch {
        unlocked = false;
      }
    }
    this.state.locked = !unlocked;
  }

  private clearPassword = () => {
    if (this.state.verifying) {
      return;
    }
    // “清空”不影响锁定状态，只重置输入与错误提示
    this.setState({ password: '', error: '' });
  };

  private verifyPassword = () => {
    if (this.state.verifying) {
      return;
    }
    const raw = (this.state.password ?? '').trim();
    if (!raw) {
      this.setState({ error: '请输入密码' });
      return;
    }

    this.setState({ verifying: true, error: '' });

    void (async () => {
      try {
        // 前端仅做 sha256 比对（避免在代码里放明文密码）
        const hex = await sha256Hex(raw);
        if (hex === RESUME_PASSWORD_SHA256_HEX) {
          if (typeof window !== 'undefined') {
            try {
              window.localStorage.setItem(RESUME_UNLOCK_STORAGE_KEY, '1');
            } catch {
              void 0;
            }
            try {
              window.dispatchEvent(new CustomEvent(RESUME_UNLOCK_EVENT));
            } catch {
              void 0;
            }
          }
          this.setState({ locked: false, verifying: false, password: '', error: '' });
          return;
        }
        this.setState({ verifying: false, error: '密码不正确' });
      } catch {
        this.setState({ verifying: false, error: '校验失败，请重试' });
      }
    })();
  };

  render() {
    const { width, height, theme, mode = 'view' } = this.props;
    const locked = this.state.locked;
    const showModal = locked && mode === 'view';

    const inputBorderColor = theme.border.base;
    const errColor = theme.danger;
    const infoColor = theme.text.secondary;
    // BlurBoundary 的缓存键：主题/模式变化但尺寸不变时，也需要刷新模糊结果
    const blurCacheKey = [
      mode,
      theme.background.base,
      theme.text.primary,
      theme.background.surface,
    ].join(':');

    if (showModal) {
      return (
        <Stack fit={StackFit.Expand} alignment={AlignmentGeometry.TopLeft}>
          <BlurBoundary enabled={locked} radius={12} cacheKey={blurCacheKey}>
            <ResumeDemoApp
              width={width}
              height={height}
              theme={theme || Themes.light}
              mode={mode}
            />
          </BlurBoundary>
          <Modal
            key="resume-password-modal"
            theme={theme}
            open={true}
            width={440}
            title="需要密码"
            maskClosable={false}
            okText={this.state.verifying ? '校验中…' : '解锁'}
            cancelText="清空"
            onOk={() => this.verifyPassword()}
            onCancel={() => this.clearPassword()}
          >
            <Column
              key="resume-password-body"
              spacing={12}
              crossAxisAlignment={CrossAxisAlignment.Start}
              mainAxisSize={MainAxisSize.Min}
            >
              <Text
                text="内含敏感资料，请输入密码："
                fontSize={14}
                lineHeight={20}
                color={infoColor}
              />
              <Container
                key="resume-password-input-shell"
                border={{ width: 1, color: inputBorderColor }}
                borderRadius={10}
                padding={[10, 12]}
                color={theme.background.base}
              >
                <Input
                  key="resume-password-input"
                  inputType="password"
                  value={this.state.password}
                  placeholder="密码"
                  color={theme.text.primary}
                  cursorColor={theme.primary}
                  onChange={(v) => this.setState({ password: v, error: '' })}
                  onKeyDown={(e) => {
                    const ne = e.nativeEvent as KeyboardEvent | undefined;
                    if (ne?.key === 'Enter') {
                      this.verifyPassword();
                      return false;
                    }
                    return true;
                  }}
                />
              </Container>
              {this.state.error ? (
                <Text
                  key="resume-password-error"
                  text={this.state.error}
                  fontSize={12}
                  lineHeight={18}
                  color={errColor}
                />
              ) : null}
            </Column>
          </Modal>
        </Stack>
      );
    }

    return (
      <Stack fit={StackFit.Expand} alignment={AlignmentGeometry.TopLeft}>
        <BlurBoundary enabled={locked} radius={12} cacheKey={blurCacheKey}>
          <ResumeDemoApp width={width} height={height} theme={theme || Themes.light} mode={mode} />
        </BlurBoundary>
      </Stack>
    );
  }
}

export type { ResumeDemoAppProps };
