import { supabase } from './supabase'
import type { TrendKpiDaily, ContentKpiDaily, UserInfluenceOverall, UserInfluenceByCategory, FilterState } from '../types/database'

export async function fetchTrendKpis(filters: FilterState): Promise<TrendKpiDaily[]> {
  let query = supabase
    .from('gl_trend_kpis_daily')
    .select('*')
    .gte('date_utc', filters.dateFrom)
    .lte('date_utc', filters.dateTo)
    .order('date_utc', { ascending: true })
    .limit(5000)

  if (filters.categories.length > 0 && !filters.categories.includes('All')) {
    query = query.in('category', filters.categories)
  }
  if (filters.analysisType !== 'all') {
    query = query.eq('analysis_type', filters.analysisType)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as TrendKpiDaily[]
}

export async function fetchContentKpis(filters: FilterState): Promise<ContentKpiDaily[]> {
  let query = supabase
    .from('gl_content_kpis_daily')
    .select('*')
    .gte('date_utc', filters.dateFrom)
    .lte('date_utc', filters.dateTo)
    .order('date_utc', { ascending: true })
    .limit(5000)

  if (filters.categories.length > 0 && !filters.categories.includes('All')) {
    query = query.in('category', filters.categories)
  }
  if (filters.analysisType !== 'all') {
    query = query.eq('analysis_type', filters.analysisType)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as ContentKpiDaily[]
}

export async function fetchUserInfluenceOverall(
  filters: FilterState,
  limit: number = 25
): Promise<UserInfluenceOverall[]> {
  const latestDateResult = await supabase
    .from('gl_user_influence_7d_overall')
    .select('window_end_date')
    .lte('window_end_date', filters.dateTo)
    .gte('window_end_date', filters.dateFrom)
    .order('window_end_date', { ascending: false })
    .limit(1)

  const latestDate = latestDateResult.data?.[0]?.window_end_date
  if (!latestDate) return []

  let query = supabase
    .from('gl_user_influence_7d_overall')
    .select('id, window_end_date, analysis_type, user_id, username, posts_7d, engagement_sum_7d, avg_engagement_7d, followers_est, influence_score_7d, rank_overall')
    .eq('window_end_date', latestDate)
    .order('rank_overall', { ascending: true })
    .limit(limit)

  if (filters.analysisType !== 'all') {
    query = query.eq('analysis_type', filters.analysisType)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as UserInfluenceOverall[]
}

export async function fetchUserInfluenceByCategory(
  filters: FilterState,
  category: string,
  limit: number = 25
): Promise<UserInfluenceByCategory[]> {
  const latestDateResult = await supabase
    .from('gl_user_influence_7d_by_category')
    .select('window_end_date')
    .lte('window_end_date', filters.dateTo)
    .gte('window_end_date', filters.dateFrom)
    .eq('category', category)
    .order('window_end_date', { ascending: false })
    .limit(1)

  const latestDate = latestDateResult.data?.[0]?.window_end_date
  if (!latestDate) return []

  let query = supabase
    .from('gl_user_influence_7d_by_category')
    .select('id, window_end_date, category, analysis_type, user_id, username, posts_7d, engagement_sum_7d, avg_engagement_7d, followers_est, influence_score_7d, rank_in_category')
    .eq('window_end_date', latestDate)
    .eq('category', category)
    .order('rank_in_category', { ascending: true })
    .limit(limit)

  if (filters.analysisType !== 'all') {
    query = query.eq('analysis_type', filters.analysisType)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as UserInfluenceByCategory[]
}

export async function fetchCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from('gl_trend_kpis_daily')
    .select('category')
    .limit(1000)

  if (error) throw error
  const unique = [...new Set((data ?? []).map((d: { category: string }) => d.category))].sort()
  return unique
}

export async function fetchDateRange(): Promise<{ min: string; max: string }> {
  const [minRes, maxRes] = await Promise.all([
    supabase
      .from('gl_trend_kpis_daily')
      .select('date_utc')
      .order('date_utc', { ascending: true })
      .limit(1),
    supabase
      .from('gl_trend_kpis_daily')
      .select('date_utc')
      .order('date_utc', { ascending: false })
      .limit(1),
  ])

  if (minRes.error) throw minRes.error
  if (maxRes.error) throw maxRes.error

  return {
    min: minRes.data?.[0]?.date_utc ?? '2026-01-01',
    max: maxRes.data?.[0]?.date_utc ?? '2026-03-09',
  }
}
