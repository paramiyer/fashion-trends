import { TrendingUp, Zap, Flame, Sparkles, Award } from 'lucide-react'
import { KpiTooltip } from '@/components/shared/kpi-tooltip'
import type { TrendKpiDaily, ContentKpiDaily } from '@/types/database'
import { formatScore } from '@/lib/utils'

interface KpiCardsProps {
  trendData: TrendKpiDaily[]
  contentData: ContentKpiDaily[]
}

export function KpiCards({ trendData, contentData }: KpiCardsProps) {
  const trendHealthAvg = trendData.length > 0
    ? trendData.reduce((s, r) => s + Number(r.trend_health_index), 0) / trendData.length
    : 0

  const breakoutDaysSum = trendData.reduce((s, r) => s + r.breakout_days_30d, 0)

  const longestStreak = trendData.reduce((m, r) => Math.max(m, r.longest_breakout_streak), 0)

  const viralRatioAvg = contentData.length > 0
    ? contentData.reduce((s, r) => s + Number(r.viral_ratio), 0) / contentData.length
    : 0

  const engQualityAvg = contentData.length > 0
    ? contentData.reduce((s, r) => s + Number(r.engagement_quality_score), 0) / contentData.length
    : 0

  const cards = [
    {
      label: 'Trend Health Index',
      value: formatScore(trendHealthAvg),
      sub: 'avg',
      description: 'Composite trend score using breakout + growth + novelty.',
      icon: TrendingUp,
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
    },
    {
      label: 'Breakout Days (30d)',
      value: breakoutDaysSum.toLocaleString(),
      sub: 'sum',
      description: 'Count of days in last 30 days where threshold_hit=true.',
      icon: Zap,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      label: 'Longest Streak',
      value: longestStreak.toString(),
      sub: 'max',
      description: 'Maximum consecutive breakout streak observed up to that day.',
      icon: Flame,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      label: 'Viral Ratio',
      value: formatScore(viralRatioAvg, 4),
      sub: 'avg',
      description: 'Fraction of posts in top engagement percentile.',
      icon: Sparkles,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      label: 'Engagement Quality',
      value: formatScore(engQualityAvg),
      sub: 'avg',
      description: 'Weighted quality engagement normalized by followers.',
      icon: Award,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="group bg-card rounded-xl border shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <div className={`h-9 w-9 rounded-lg ${card.bgColor} flex items-center justify-center`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <KpiTooltip description={card.description} />
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{card.label} <span className="text-muted-foreground/60">({card.sub})</span></p>
          </div>
        </div>
      ))}
    </div>
  )
}
