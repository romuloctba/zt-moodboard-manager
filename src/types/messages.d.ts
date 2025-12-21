// Use type safe message keys with `next-intl`
type Messages = typeof import('./locales/en/common.json') &
  typeof import('./locales/en/projects.json') &
  typeof import('./locales/en/characters.json') &
  typeof import('./locales/en/settings.json') &
  typeof import('./locales/en/sync.json') &
  typeof import('./locales/en/media.json') &
  typeof import('./locales/en/errors.json');

declare global {
  // Use type safe message keys with `next-intl`

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface IntlMessages extends Messages { }
}
