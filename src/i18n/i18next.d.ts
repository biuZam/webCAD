// Types every t() key against the `en` resources, so `tsc` (and `pnpm build`) fails on a key missing from `en`.
import 'i18next'
import type { enResources } from './index'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: typeof enResources
  }
}
