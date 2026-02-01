import { SpaceCompact } from './compact';
import { Space } from './space';

export type { SpaceProps } from './space';
export type { SpaceCompactProps } from './compact';

export const SpaceWithCompact = Object.assign(Space, { Compact: SpaceCompact });
