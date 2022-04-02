import _slugify from 'slugify';

export interface ISlugifyOptions {
  lower?: boolean,
  remove?: RegExp,
  replacement?: string,
  strict?: boolean,
  symbols?: boolean,
  trim?: boolean,
  locale?: string,
}

const DEFAULT_SETTINGS = {
  replacement: '-',
  lower: true,
  strict: true,
  locale: 'en',
  trim: true,
};

export const slugify = (str: string, options?: ISlugifyOptions) => _slugify(str, options ? { ...DEFAULT_SETTINGS, ...options } : DEFAULT_SETTINGS);
