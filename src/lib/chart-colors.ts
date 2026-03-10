export const CHART_COLORS = [
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
  '#f97316',
] as const

export const CATEGORY_COLORS: Record<string, string> = {
  modest_abaya: '#0ea5e9',
  streetwear_sneakers: '#10b981',
  luxury_accessories: '#f59e0b',
  capsule_neutrals: '#ef4444',
  thrift_sustainable: '#06b6d4',
  local_designers: '#ec4899',
  athleisure_sets: '#84cc16',
  fragrance_oud: '#f97316',
}

export function getCategoryColor(category: string, index: number = 0): string {
  return CATEGORY_COLORS[category] ?? CHART_COLORS[index % CHART_COLORS.length]
}
