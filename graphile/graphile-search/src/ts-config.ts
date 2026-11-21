import type { SearchableColumn } from './types';

export const REQUEST_TS_CONFIG = '__graphile_search_ts_config';
export const REQUEST_LANG_CODES = '__graphile_search_lang_codes';

const languageConfigs = new Map(Object.entries({
  ar: 'arabic', hy: 'armenian', eu: 'basque', ca: 'catalan', da: 'danish',
  nl: 'dutch', en: 'english', et: 'estonian', fi: 'finnish', fr: 'french',
  de: 'german', el: 'greek', hi: 'hindi', hu: 'hungarian', id: 'indonesian',
  ga: 'irish', it: 'italian', lt: 'lithuanian', ne: 'nepali', no: 'norwegian',
  nb: 'norwegian', nn: 'norwegian', pt: 'portuguese', ro: 'romanian',
  ru: 'russian', sr: 'serbian', es: 'spanish', sv: 'swedish', ta: 'tamil',
  tr: 'turkish', yi: 'yiddish',
}));
const configNames = new Set([...languageConfigs.values(), 'simple']);

export function requestTsConfig(langCodes: unknown): string {
  if (Array.isArray(langCodes)) {
    for (const code of langCodes) {
      if (typeof code !== 'string') continue;
      const normalized = code.toLowerCase();
      const name = configNames.has(normalized) ? normalized : languageConfigs.get(normalized.split('-')[0]);
      if (name) return `pg_catalog.${name}`;
    }
  }
  return 'english';
}

export function conditionTsConfig(condition: any): string | undefined {
  for (let current = condition; current; current = current.parent) {
    const config = current.getMetaRaw?.(REQUEST_TS_CONFIG);
    if (config !== undefined) return config;
  }
  return undefined;
}

export function columnWithRequestTsConfig(column: SearchableColumn, condition: any): SearchableColumn {
  return {
    ...column,
    adapterData: {
      ...(column.adapterData && typeof column.adapterData === 'object' ? column.adapterData : {}),
      requestTsConfig: conditionTsConfig(condition),
    },
  };
}

export function requestLangCodes(langCodes: unknown): string[] {
  return Array.isArray(langCodes) ? langCodes.filter((code): code is string => typeof code === 'string' && code !== '') : [];
}

export function conditionLangCodes(condition: any): string[] | undefined {
  for (let current = condition; current; current = current.parent) {
    const codes = current.getMetaRaw?.(REQUEST_LANG_CODES);
    if (codes !== undefined) return codes;
  }
  return undefined;
}

/** The request's languages, for a vector column whose table has translations (@i18n). */
export function columnWithRequestLangCodes(column: SearchableColumn, condition: any): SearchableColumn {
  if (!(column.adapterData as { i18nInfo?: unknown } | undefined)?.i18nInfo) return column;
  return {
    ...column,
    adapterData: {
      ...(column.adapterData as object),
      langCodes: conditionLangCodes(condition) ?? [],
    },
  };
}

export function columnWithRequestContext(adapterName: string, column: SearchableColumn, condition: any): SearchableColumn {
  if (adapterName === 'tsv') return columnWithRequestTsConfig(column, condition);
  if (adapterName === 'vector') return columnWithRequestLangCodes(column, condition);
  return column;
}
