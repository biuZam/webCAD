import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { Layer } from '../document/model'

/** Default layer names equal their kind; show those translated until the user renames them. */
export function useLayerName() {
  const { t } = useTranslation()
  return useCallback((layer: Layer) => (layer.name === layer.kind ? t(`layers.kind.${layer.kind}`) : layer.name), [t])
}
