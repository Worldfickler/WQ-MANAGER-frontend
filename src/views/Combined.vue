<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { leaderboardApi } from '@/api/leaderboard'
import type {
  CombinedAnalysisResponse,
  CombinedMetricSummary,
  CombinedUserChangeItem,
  CombinedUserChangePageResponse,
  UserMetricTrendResponse
} from '@/types/leaderboard'

use([CanvasRenderer, BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent])

const loading = ref(false)
const error = ref<string | null>(null)
const analysis = ref<CombinedAnalysisResponse | null>(null)

const usersLoading = ref(false)
const usersError = ref<string | null>(null)
const usersPageData = ref<CombinedUserChangePageResponse | null>(null)

const selectedCountries = ref<string[]>([])
const selectedGeniusLevels = ref<string[]>([])
const excludeAlphaBothZero = ref(true)
const excludePowerPoolBothZero = ref(true)
const excludeSelectedBothZero = ref(true)
const countryOptions = ref<string[]>([])
const geniusLevelOptions = ref<string[]>([])

const page = ref(1)
const pageSize = ref(20)
const sortBy = ref<'alpha_change' | 'power_pool_change' | 'selected_change' | 'base_alpha' | 'target_alpha' | 'base_power_pool' | 'target_power_pool' | 'base_selected' | 'target_selected'>('alpha_change')
const sortOrder = ref<'desc' | 'asc'>('desc')
const distributionMetric = ref<'combined_alpha_performance' | 'combined_power_pool_alpha_performance' | 'combined_selected_alpha_performance'>('combined_alpha_performance')

const showInitialLoading = computed(() => loading.value && !analysis.value)
const showInitialUsersLoading = computed(() => usersLoading.value && !usersPageData.value)

const trendDialogVisible = ref(false)
const trendDialogLoading = ref(false)
const trendDialogError = ref<string | null>(null)
const trendDialogData = ref<UserMetricTrendResponse | null>(null)
const trendDialogUser = ref('')

const fetchFilterOptions = async () => {
  try {
    const [countriesRes, levelsRes] = await Promise.all([
      leaderboardApi.getGeniusAvailableCountries(),
      leaderboardApi.getGeniusAvailableLevels()
    ])
    countryOptions.value = countriesRes.data || []
    geniusLevelOptions.value = levelsRes.data || []
  } catch (err) {
    console.error('Failed to fetch combined filter options:', err)
  }
}

const fetchAnalysis = async () => {
  loading.value = true
  error.value = null
  try {
    const response = await leaderboardApi.getCombinedAnalysis({
      countries: selectedCountries.value,
      geniusLevels: selectedGeniusLevels.value,
      excludeAlphaBothZero: excludeAlphaBothZero.value,
      excludePowerPoolBothZero: excludePowerPoolBothZero.value,
      excludeSelectedBothZero: excludeSelectedBothZero.value
    })
    analysis.value = response.data
  } catch (err: any) {
    console.error('Failed to fetch combined analysis:', err)
    error.value = err?.response?.data?.detail || '获取 Combined 分析数据失败'
  } finally {
    loading.value = false
  }
}

const fetchUserChanges = async () => {
  usersLoading.value = true
  usersError.value = null
  try {
    const response = await leaderboardApi.getCombinedUserChanges({
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
      page: page.value,
      pageSize: pageSize.value,
      countries: selectedCountries.value,
      geniusLevels: selectedGeniusLevels.value,
      excludeAlphaBothZero: excludeAlphaBothZero.value,
      excludePowerPoolBothZero: excludePowerPoolBothZero.value,
      excludeSelectedBothZero: excludeSelectedBothZero.value
    })
    usersPageData.value = response.data
  } catch (err: any) {
    console.error('Failed to fetch combined user changes:', err)
    usersError.value = err?.response?.data?.detail || '获取 Combined 用户变化失败'
  } finally {
    usersLoading.value = false
  }
}

const refreshAll = async () => {
  await Promise.all([fetchAnalysis(), fetchUserChanges()])
}

const applyFilters = async () => {
  page.value = 1
  await refreshAll()
}

const resetFilters = async () => {
  selectedCountries.value = []
  selectedGeniusLevels.value = []
  page.value = 1
  await refreshAll()
}

const handlePageChange = async (nextPage: number) => {
  page.value = nextPage
  await fetchUserChanges()
}

const metricNameMap: Record<string, string> = {
  combined_alpha_performance: 'Combined Alpha Performance',
  combined_power_pool_alpha_performance: 'Combined Selected Alpha Performance',
  combined_selected_alpha_performance: 'Combined Power Pool Alpha Performance'
}

const getMetricDisplayName = (metric: string, fallback?: string) => metricNameMap[metric] || fallback || metric

const handleSortChange = async (payload: { prop: string; order: 'ascending' | 'descending' | null }) => {
  const mapper: Record<string, typeof sortBy.value> = {
    alpha_change: 'alpha_change',
    power_pool_change: 'power_pool_change',
    selected_change: 'selected_change',
    base_alpha: 'base_alpha',
    target_alpha: 'target_alpha',
    base_power_pool: 'base_power_pool',
    target_power_pool: 'target_power_pool',
    base_selected: 'base_selected',
    target_selected: 'target_selected'
  }
  if (!payload.order || !mapper[payload.prop]) {
    sortBy.value = 'alpha_change'
    sortOrder.value = 'desc'
  } else {
    sortBy.value = mapper[payload.prop]
    sortOrder.value = payload.order === 'ascending' ? 'asc' : 'desc'
  }
  page.value = 1
  await fetchUserChanges()
}

const summaryCards = computed(() => {
  const summary = analysis.value?.summary
  if (!summary) return []
  return [
    {
      label: '可对比用户',
      value: summary.comparable_users.toLocaleString(),
      note: `目标日 ${summary.users_on_target_date.toLocaleString()} / 基准日 ${summary.users_on_base_date.toLocaleString()}`
    },
    {
      label: '新增 / 缺失',
      value: `${summary.new_users} / ${summary.missing_users}`,
      note: '仅统计固定日期下三项 combined 完整的用户'
    }
  ]
})

const metricCards = computed<CombinedMetricSummary[]>(() => analysis.value?.metric_summaries || [])

const distributionOption = computed(() => {
  const dist = analysis.value?.distributions?.[distributionMetric.value]
  if (!dist || dist.labels.length === 0) return null
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '4%', right: '4%', top: '8%', bottom: '16%', containLabel: true },
    xAxis: {
      type: 'category',
      data: dist.labels,
      axisLabel: { rotate: 35, fontSize: 11 }
    },
    yAxis: { type: 'value', name: '用户数' },
    series: [
      {
        name: metricNameMap[distributionMetric.value],
        type: 'bar',
        barWidth: '66%',
        data: dist.counts,
        itemStyle: { color: '#d56a3a' }
      }
    ]
  }
})

const rows = computed<CombinedUserChangeItem[]>(() => usersPageData.value?.items || [])
const total = computed(() => usersPageData.value?.total || 0)

const formatSigned = (value: number) => {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(4)}`
}

const formatSignedTable = (value: number) => {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}`
}

const calcRank = (index: number) => (page.value - 1) * pageSize.value + index + 1

const pickValidNumbers = (values: Array<number | null | undefined>) =>
  values.filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value))

const computeYAxisRange = (values: number[]) => {
  if (!values.length) return { min: 0, max: 1 }
  const dataMin = Math.min(...values)
  const dataMax = Math.max(...values)
  const range = dataMax - dataMin
  const margin = Math.max(range * 0.12, Math.abs(dataMax) * 0.04, 0.05)
  if (range === 0) {
    const offset = Math.max(Math.abs(dataMax) * 0.08, 0.05)
    return { min: dataMin - offset, max: dataMax + offset }
  }
  return { min: dataMin - margin, max: dataMax + margin }
}

const formatDateRangeLabel = (value: string) => {
  if (!value) return value
  return value.split('\u3001').join('\n')
}

const fetchUserTrend = async (user: string) => {
  trendDialogLoading.value = true
  trendDialogError.value = null
  try {
    const response = await leaderboardApi.getUserMetricTrends(user)
    trendDialogData.value = response.data
  } catch (err: any) {
    console.error('Failed to fetch user metric trends:', err)
    trendDialogError.value = err?.response?.data?.detail || '获取用户趋势数据失败'
    trendDialogData.value = null
  } finally {
    trendDialogLoading.value = false
  }
}

const openTrendDialog = async (user: string) => {
  trendDialogUser.value = user
  trendDialogVisible.value = true
  await fetchUserTrend(user)
}

const dialogValueFactorOption = computed(() => {
  const data = trendDialogData.value?.value_factor_trend || []
  if (!data.length) return null
  const labels = data.map(item => item.date_range)
  const updateDates = data.map(item => item.update_date)
  const values = data.map(item => item.value_factor)
  const validValues = pickValidNumbers(values)
  if (!validValues.length) return null
  const { min, max } = computeYAxisRange(validValues)

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any[]) => {
        const point = params?.[0]
        if (!point) return ''
        const value = point.value === null || point.value === undefined ? '-' : Number(point.value).toFixed(2)
        const updateDate = updateDates[point.dataIndex] || '-'
        return `区间: ${point.axisValue}<br/>更新时间: ${updateDate}<br/>Value Factor: ${value}`
      }
    },
    grid: { left: '6%', right: '5%', top: '10%', bottom: '14%', containLabel: true },
    xAxis: {
      type: 'category',
      data: labels,
      boundaryGap: false,
      axisLabel: { interval: 0, lineHeight: 14, margin: 8, formatter: (value: string) => formatDateRangeLabel(value) }
    },
    yAxis: { type: 'value', name: 'Value Factor', min, max, scale: true, axisLabel: { formatter: (value: number) => value.toFixed(2) } },
    series: [
      {
        name: 'Value Factor',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: values,
        itemStyle: { color: '#d56a3a' },
        lineStyle: { width: 2 },
        areaStyle: { color: 'rgba(213, 106, 58, 0.12)' }
      }
    ]
  }
})

const dialogCombinedOption = computed(() => {
  const data = trendDialogData.value?.combined_trend || []
  if (!data.length) return null
  const labels = data.map(item => item.date_range)
  const updateDates = data.map(item => item.update_date)
  const alpha = data.map(item => item.combined_alpha_performance)
  const powerPool = data.map(item => item.combined_power_pool_alpha_performance)
  const selected = data.map(item => item.combined_selected_alpha_performance)
  const validValues = pickValidNumbers([...alpha, ...powerPool, ...selected])
  if (!validValues.length) return null
  const { min, max } = computeYAxisRange(validValues)

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any[]) => {
        const index = params?.[0]?.dataIndex ?? 0
        const dateRange = labels[index] || '-'
        const updateDate = updateDates[index] || '-'
        const lines = (params || []).map((item: any) => {
          const value = item.value === null || item.value === undefined ? '-' : Number(item.value).toFixed(2)
          return `${item.marker}${item.seriesName}: ${value}`
        })
        return [`区间: ${dateRange}`, `更新时间: ${updateDate}`, ...lines].join('<br/>')
      }
    },
    legend: { top: 0 },
    grid: { left: '6%', right: '5%', top: '16%', bottom: '14%', containLabel: true },
    xAxis: {
      type: 'category',
      data: labels,
      boundaryGap: false,
      axisLabel: { interval: 0, lineHeight: 14, margin: 8, formatter: (value: string) => formatDateRangeLabel(value) }
    },
    yAxis: { type: 'value', name: 'Combined', min, max, scale: true, axisLabel: { formatter: (value: number) => value.toFixed(2) } },
    series: [
      { name: 'Combined Alpha Performance', type: 'line', smooth: true, showSymbol: false, data: alpha, itemStyle: { color: '#d56a3a' }, lineStyle: { width: 2 } },
      { name: 'Combined Selected Alpha Performance', type: 'line', smooth: true, showSymbol: false, data: powerPool, itemStyle: { color: '#2f8f83' }, lineStyle: { width: 2 } },
      { name: 'Combined Power Pool Alpha Performance', type: 'line', smooth: true, showSymbol: false, data: selected, itemStyle: { color: '#7f5af0' }, lineStyle: { width: 2 } }
    ]
  }
})

watch([excludeAlphaBothZero, excludePowerPoolBothZero, excludeSelectedBothZero], async () => {
  page.value = 1
  await refreshAll()
})

onMounted(async () => {
  await fetchFilterOptions()
  await refreshAll()
})
</script>

<template>
  <div class="combined-page">
    <header class="dashboard-header">
      <div>
        <h1 class="dashboard-title">Combined 变化分析</h1>
        <p class="dashboard-subtitle">固定对比 `leaderboard_genius_user` 在 2026-02-10 与 2026-02-11 的数据</p>
      </div>
      <el-button type="primary" class="primary-pill" @click="refreshAll">刷新数据</el-button>
    </header>

    <div class="settings-wrap">
      <div class="setting-item">
        <el-switch v-model="excludeAlphaBothZero" inline-prompt :active-text="'开'" :inactive-text="'关'" />
        <span>排除基准日和目标日 Combined Alpha Performance 都为 0</span>
      </div>
      <div class="setting-item">
        <el-switch v-model="excludePowerPoolBothZero" inline-prompt :active-text="'开'" :inactive-text="'关'" />
        <span>排除基准日和目标日 Combined Selected Alpha Performance 都为 0</span>
      </div>
      <div class="setting-item">
        <el-switch v-model="excludeSelectedBothZero" inline-prompt :active-text="'开'" :inactive-text="'关'" />
        <span>排除基准日和目标日 Combined Power Pool Alpha Performance 都为 0</span>
      </div>
    </div>

    <div v-if="analysis" class="date-band">
      <span class="date-chip">基准日：{{ analysis.base_record_date }}</span>
      <span class="date-chip">目标日：{{ analysis.target_record_date }}</span>
    </div>

    <div v-if="error && !loading" class="error-wrap">
      <p>{{ error }}</p>
      <el-button @click="fetchAnalysis">重试</el-button>
    </div>

    <template v-if="analysis || loading">
      <section class="summary-grid">
        <template v-if="showInitialLoading">
          <article v-for="i in 2" :key="`summary-skeleton-${i}`" class="summary-card">
            <el-skeleton :rows="2" animated />
          </article>
        </template>
        <template v-else>
          <article v-for="card in summaryCards" :key="card.label" class="summary-card">
            <div class="card-label">{{ card.label }}</div>
            <div class="card-value">{{ card.value }}</div>
            <div class="card-note">{{ card.note }}</div>
          </article>
        </template>
      </section>

      <section class="metric-grid">
        <template v-if="showInitialLoading">
          <article v-for="i in 3" :key="`metric-skeleton-${i}`" class="metric-card">
            <el-skeleton :rows="4" animated />
          </article>
        </template>
        <template v-else>
          <article v-for="item in metricCards" :key="item.metric" class="metric-card">
            <div class="metric-title">{{ getMetricDisplayName(item.metric, item.display_name) }}</div>
            <div class="metric-row"><span>目标均值</span><strong>{{ item.avg_target.toFixed(4) }}</strong></div>
            <div class="metric-row"><span>基准均值</span><strong>{{ item.avg_base.toFixed(4) }}</strong></div>
            <div class="metric-row"><span>平均变化</span><strong :class="item.avg_change >= 0 ? 'positive' : 'negative'">{{ formatSigned(item.avg_change) }}</strong></div>
            <div class="metric-row meta"><span>上升/下降/持平</span><strong>{{ item.increased_users }}/{{ item.decreased_users }}/{{ item.unchanged_users }}</strong></div>
          </article>
        </template>
      </section>

      <el-card class="chart-card" shadow="never">
        <template #header>
          <div class="section-header">
            <span class="section-title">变化分布</span>
            <div class="table-controls">
              <el-select v-model="distributionMetric" style="width: 220px">
                <el-option label="Combined Alpha Performance" value="combined_alpha_performance" />
                <el-option label="Combined Selected Alpha Performance" value="combined_power_pool_alpha_performance" />
                <el-option label="Combined Power Pool Alpha Performance" value="combined_selected_alpha_performance" />
              </el-select>
            </div>
          </div>
        </template>
        <div class="chart-box">
          <div v-if="showInitialLoading" class="section-skeleton">
            <el-skeleton :rows="8" animated />
          </div>
          <v-chart v-else-if="distributionOption" :option="distributionOption" :autoresize="true" class="chart" />
          <el-empty v-else description="暂无数据" />
        </div>
      </el-card>

      <el-card class="table-card" shadow="never">
        <template #header>
          <div class="section-header">
            <span class="section-title">用户变化明细</span>
            <div class="table-controls">
              <span class="section-meta">共 {{ total }} 人</span>
            </div>
          </div>
          <div class="table-controls table-controls-filters">
            <el-select
              v-model="selectedCountries"
              multiple
              collapse-tags
              collapse-tags-tooltip
              clearable
              filterable
              class="control-select-wide"
              placeholder="国家/地区"
            >
              <el-option v-for="item in countryOptions" :key="item" :label="item" :value="item" />
            </el-select>
            <el-select
              v-model="selectedGeniusLevels"
              multiple
              collapse-tags
              collapse-tags-tooltip
              clearable
              filterable
              class="control-select-wide"
              placeholder="Genius 等级"
            >
              <el-option v-for="item in geniusLevelOptions" :key="item" :label="item" :value="item" />
            </el-select>
            <el-button type="primary" class="small-pill" @click="applyFilters">应用</el-button>
            <el-button class="small-pill light-pill" @click="resetFilters">清空</el-button>
          </div>
        </template>

        <p v-if="usersError" class="table-error">{{ usersError }}</p>

        <div v-if="showInitialUsersLoading" class="section-skeleton">
          <el-skeleton :rows="10" animated />
        </div>
        <el-table
          v-else
          v-loading="usersLoading"
          :data="rows"
          stripe
          style="width: 100%"
          :default-sort="{ prop: 'alpha_change', order: 'descending' }"
          @sort-change="handleSortChange"
        >
          <el-table-column label="排名" width="70" align="center">
            <template #default="{ $index }">{{ calcRank($index) }}</template>
          </el-table-column>
          <el-table-column label="用户" min-width="130">
            <template #default="{ row }">
              <span class="user-link" @click="openTrendDialog(row.user)">{{ row.user }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="genius_level" label="等级" min-width="110" />
          <el-table-column prop="country" label="国家/地区" min-width="95" />
          <el-table-column prop="base_alpha" label="Combined Alpha Performance 基准日" min-width="260" align="right" sortable="custom">
            <template #default="{ row }">{{ row.base_alpha.toFixed(2) }}</template>
          </el-table-column>
          <el-table-column prop="target_alpha" label="Combined Alpha Performance 目标日" min-width="260" align="right" sortable="custom">
            <template #default="{ row }">{{ row.target_alpha.toFixed(2) }}</template>
          </el-table-column>
          <el-table-column prop="alpha_change" label="Combined Alpha Performance 变化值" min-width="260" align="right" sortable="custom">
            <template #default="{ row }">
              <span :class="row.alpha_change >= 0 ? 'positive' : 'negative'">{{ formatSignedTable(row.alpha_change) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="base_power_pool" label="Combined Selected Alpha Performance 基准日" min-width="290" align="right" sortable="custom">
            <template #default="{ row }">{{ row.base_power_pool.toFixed(2) }}</template>
          </el-table-column>
          <el-table-column prop="target_power_pool" label="Combined Selected Alpha Performance 目标日" min-width="290" align="right" sortable="custom">
            <template #default="{ row }">{{ row.target_power_pool.toFixed(2) }}</template>
          </el-table-column>
          <el-table-column prop="power_pool_change" label="Combined Selected Alpha Performance 变化值" min-width="290" align="right" sortable="custom">
            <template #default="{ row }">
              <span :class="row.power_pool_change >= 0 ? 'positive' : 'negative'">{{ formatSignedTable(row.power_pool_change) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="base_selected" label="Combined Power Pool Alpha Performance 基准日" min-width="300" align="right" sortable="custom">
            <template #default="{ row }">{{ row.base_selected.toFixed(2) }}</template>
          </el-table-column>
          <el-table-column prop="target_selected" label="Combined Power Pool Alpha Performance 目标日" min-width="300" align="right" sortable="custom">
            <template #default="{ row }">{{ row.target_selected.toFixed(2) }}</template>
          </el-table-column>
          <el-table-column prop="selected_change" label="Combined Power Pool Alpha Performance 变化值" min-width="300" align="right" sortable="custom">
            <template #default="{ row }">
              <span :class="row.selected_change >= 0 ? 'positive' : 'negative'">{{ formatSignedTable(row.selected_change) }}</span>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-wrapper" v-if="total > 0">
          <el-pagination
            :current-page="page"
            :page-size="pageSize"
            :total="total"
            layout="total, prev, pager, next"
            background
            @current-change="handlePageChange"
          />
        </div>
      </el-card>

      <el-dialog
        v-model="trendDialogVisible"
        :title="`${trendDialogUser} 趋势详情`"
        width="1000px"
        top="6vh"
        destroy-on-close
      >
        <div v-if="trendDialogLoading" class="section-skeleton">
          <el-skeleton :rows="8" animated />
        </div>
        <p v-else-if="trendDialogError" class="table-error">{{ trendDialogError }}</p>
        <div v-else class="trend-grid">
          <el-card class="trend-card" shadow="never">
            <template #header>
              <div class="section-header">
                <span class="section-title">Value Factor 变化趋势</span>
              </div>
            </template>
            <v-chart v-if="dialogValueFactorOption" :option="dialogValueFactorOption" :autoresize="true" class="trend-chart" />
            <el-empty v-else description="暂无 Value Factor 数据" />
          </el-card>

          <el-card class="trend-card" shadow="never">
            <template #header>
              <div class="section-header">
                <span class="section-title">Combined 变化趋势</span>
              </div>
            </template>
            <v-chart v-if="dialogCombinedOption" :option="dialogCombinedOption" :autoresize="true" class="trend-chart" />
            <el-empty v-else description="暂无 Combined 数据" />
          </el-card>
        </div>
      </el-dialog>
    </template>
  </div>
</template>

<style scoped>
.combined-page { max-width: 1500px; margin: 0 auto; padding: 2.5rem clamp(1.5rem, 3vw, 3rem) 4rem; position: relative; z-index: 1; }
.dashboard-header { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; margin-bottom: 1rem; }
.dashboard-title { font-family: 'Bricolage Grotesque', sans-serif; font-size: 2rem; margin: 0; }
.dashboard-subtitle { color: var(--ink-soft); margin-top: 0.4rem; }
.settings-wrap { display: flex; gap: 0.75rem; flex-wrap: nowrap; margin-bottom: 1rem; }
.setting-item { display: flex; align-items: center; gap: 0.7rem; flex: 1; min-width: 0; padding: 0.65rem 0.9rem; border-radius: var(--radius-sm); border: 1px solid var(--stroke); background: var(--card); font-size: 0.9rem; color: var(--ink-soft); }
.primary-pill { border-radius: 999px; letter-spacing: 0.12em; text-transform: uppercase; font-size: 0.75rem; padding: 0.6rem 1.4rem; background: var(--ink); border-color: var(--ink); color: var(--bg); }
.primary-pill:hover { background: var(--accent); border-color: var(--accent); color: #fff; }
.small-pill { border-radius: 999px; letter-spacing: 0.08em; text-transform: uppercase; height: 40px; padding: 0 1.1rem; }
.light-pill { border: 1px solid var(--stroke); background: var(--card); color: var(--ink-soft); }
.date-band { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1.2rem; }
.date-chip { border: 1px solid var(--stroke); background: var(--card); border-radius: 999px; padding: 0.42rem 0.9rem; font-size: 0.8rem; color: var(--ink-soft); }
.error-wrap { background: var(--card); border: 1px solid var(--stroke); border-radius: var(--radius-md); box-shadow: var(--shadow-md); padding: 1.2rem; margin-bottom: 1rem; }
.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
.metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin-bottom: 1.2rem; }
.summary-card, .metric-card, .chart-card, .table-card { background: var(--card); border: 1px solid var(--stroke); border-radius: var(--radius-lg); box-shadow: var(--shadow-md); }
.summary-card { padding: 1rem 1.1rem; }
.card-label { text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.7rem; color: var(--ink-soft); }
.card-value { margin-top: 0.4rem; font-family: 'Bricolage Grotesque', sans-serif; font-size: 1.35rem; }
.card-note { margin-top: 0.4rem; font-size: 0.82rem; color: var(--ink-soft); }
.metric-card { padding: 1rem 1.1rem; }
.metric-title { font-family: 'Bricolage Grotesque', sans-serif; font-size: 1.05rem; margin-bottom: 0.7rem; }
.metric-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem; font-size: 0.9rem; }
.metric-row.meta { margin-top: 0.45rem; padding-top: 0.45rem; border-top: 1px dashed var(--stroke); }
.chart-card, .table-card { margin-bottom: 1.2rem; }
.chart-box { height: 380px; }
.chart { width: 100%; height: 100%; }
.section-skeleton { padding: 1rem; }
.section-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
.section-title { font-family: 'Bricolage Grotesque', sans-serif; font-size: 1.2rem; }
.section-meta { font-size: 0.85rem; color: var(--ink-soft); }
.table-controls { display: flex; align-items: center; gap: 0.8rem; }
.table-controls-filters { margin-top: 0.95rem; flex-wrap: wrap; }
.control-select-wide { width: 300px; }
.table-controls-filters :deep(.el-select__wrapper) { min-height: 40px; background: var(--bg); border: 1px solid var(--stroke); border-radius: 12px; box-shadow: none; }
.table-controls-filters :deep(.el-input__inner) { font-size: 0.9rem; letter-spacing: normal; text-transform: none; color: var(--ink); }
.table-error { color: #a6322a; margin-bottom: 0.6rem; font-size: 0.9rem; }
.table-card :deep(.el-table) { --el-table-bg-color: var(--card); --el-table-tr-bg-color: var(--card); --el-table-header-bg-color: var(--bg-2); --el-table-row-hover-bg-color: rgba(213, 106, 58, 0.08); }
.table-card :deep(.el-table__inner-wrapper), .table-card :deep(.el-table__body-wrapper), .table-card :deep(.el-table__header-wrapper), .table-card :deep(.el-table__body), .table-card :deep(.el-table__header) { background-color: var(--card); }
.table-card :deep(.el-table__header-wrapper th) { background: var(--bg-2); text-transform: uppercase; letter-spacing: 0.2em; font-size: 0.7rem; color: var(--ink-soft); }
.user-link { font-weight: 600; color: var(--accent); cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
.positive { color: var(--accent-2); font-weight: 700; }
.negative { color: #a6322a; font-weight: 700; }
.pagination-wrapper { display: flex; justify-content: flex-end; padding-top: 1rem; }
.trend-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
.trend-card { background: var(--card); border: 1px solid var(--stroke); border-radius: var(--radius-lg); }
.trend-chart { width: 100%; min-height: 320px; }
@media (max-width: 900px) {
  .dashboard-header { flex-direction: column; align-items: flex-start; }
  .table-controls-filters { width: 100%; }
  .control-select-wide { width: 100%; }
  .settings-wrap { flex-wrap: wrap; }
  .setting-item { flex-basis: 100%; }
  .trend-grid { grid-template-columns: 1fr; }
}
</style>
