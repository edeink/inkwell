import { StatefulWidget, type WidgetProps } from '@/core';

export abstract class FStateWidget<
  P extends WidgetProps = WidgetProps,
  S extends Record<string, unknown> = Record<string, unknown>,
> extends StatefulWidget<P, S> {
  constructor(props: P) {
    super(props);
    this.state = this.getInitialState(props);
  }

  protected abstract getInitialState(props: P): S;
}
