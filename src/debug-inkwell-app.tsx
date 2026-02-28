/** @jsxImportSource @/utils/compiler */
import { Center, Column, Container, Row, SizedBox, StatefulWidget, Text } from '@/core';
import Runtime from '@/runtime';

// Stable Widget: Updates state but structure remains same
class StableUpdateWidget extends StatefulWidget<any, { count: number }> {
  private timer: any;

  constructor() {
    super({});
    this.state = { count: 0 };
  }

  didMount() {
    this.timer = setInterval(() => {
      this.setState({ count: this.state.count + 1 });
    }, 1000);
  }

  dispose() {
    clearInterval(this.timer);
    super.dispose();
  }

  render() {
    return (
      <Container padding={{ all: 10 }} color="#f0f0f0">
        <Text text={`Stable Count: ${this.state.count}`} fontSize={16} />
      </Container>
    );
  }
}

// Unstable Widget: Changes structure periodically
class UnstableStructureWidget extends StatefulWidget<any, { show: boolean }> {
  private timer: any;

  constructor() {
    super({});
    this.state = { show: true };
  }

  didMount() {
    this.timer = setInterval(() => {
      this.setState({ show: !this.state.show });
    }, 2000);
  }

  dispose() {
    clearInterval(this.timer);
    super.dispose();
  }

  render() {
    return (
      <Column>
        <Text text="Unstable Structure Root" fontSize={16} />
        {this.state.show ? (
          <Container width={50} height={50} color="#ffcccc" margin={{ top: 10 }}>
            <Text text="Child" fontSize={12} />
          </Container>
        ) : (
          <SizedBox height={10} />
        )}
      </Column>
    );
  }
}

export async function renderInkwellApp(runtime: Runtime, width: number, height: number) {
  await runtime.render(
    <Center>
      <Column mainAxisAlignment="center" crossAxisAlignment="center" spacing={20}>
        <Text text="Debug Inkwell App" fontSize={24} fontWeight="bold" />

        <Row spacing={20}>
          <StableUpdateWidget />
          <UnstableStructureWidget />
        </Row>

        <Container width={300} height={100} color="#e0e0e0">
          <Center>
            <Text text="Static Container" />
          </Center>
        </Container>
      </Column>
    </Center>,
  );
}
