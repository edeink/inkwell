import { Input } from './input';
import { InputSearch } from './search';

export type { InputProps } from './input';
export type { InputSearchProps } from './search';

export const InputWithSearch = Object.assign(Input, { Search: InputSearch });
