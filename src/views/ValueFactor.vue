<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { leaderboardApi } from '@/api/leaderboard'
import type {
  ValueFactorAnalysisResponse,
  ValueFactorUserChangeItem,
  ValueFactorUserChangePageResponse,
  UserMetricTrendResponse
} from '@/types/leaderboard'

use([CanvasRenderer, BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent])

const loading = ref(false)
const error = ref<string | null>(null)
const analysis = ref<ValueFactorAnalysisResponse | null>(null)

const topLoading = ref(false)
const topError = ref<string | null>(null)
const topPageData = ref<ValueFactorUserChangePageResponse | null>(null)

const excludeBothHalf = ref(true)
const selectedCountry = ref<string[]>([])
const selectedGeniusLevels = ref<string[]>([])
const topPage = ref(1)
const topPageSize = ref(20)
const sortBy = ref<'change' | 'base_value_factor' | 'target_value_factor'>('change')
const sortOrder = ref<'desc' | 'asc'>('desc')

const countryOptions = ref<string[]>([])
const geniusLevelOptions = ref<string[]>([])

const showInitialLoading = computed(() => loading.value && !analysis.value)
const showInitialTableLoading = computed(() => topLoading.value && !topPageData.value)

const trendDialogVisible = ref(false)
const trendDialogLoading = ref(false)
const trendDialogError = ref<string | null>(null)
const trendDialogData = ref<UserMetricTrendResponse | null>(null)
const trendDialogUser = ref('')

const fetchAnalysis = async () => {
  loading.value = true
  error.value = null
  try {
    const response = await leaderboardApi.getValueFactorAnalysis(excludeBothHalf.value)
    analysis.value = response.data
  } catch (err: any) {
    console.error('Failed to fetch Value Factor analysis:', err)
    error.value = err?.response?.data?.detail || '获取 Value Factor 分析数据失败'
  } finally {
    loading.value = false
  }
}

const fetchTopUsers = async () => {
  topLoading.value = true
  topError.value = null
  try {
    const response = await leaderboardApi.getValueFactorUserChanges({
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
      page: topPage.value,
      pageSize: topPageSize.value,
      countries: selectedCountry.value,
      geniusLevels: selectedGeniusLevels.value,
      excludeBothHalf: excludeBothHalf.value
    })
    topPageData.value = response.data
  } catch (err: any) {
    console.error('Failed to fetch Value Factor top users:', err)
    topError.value = err?.response?.data?.detail || '获取用户变化排行失败'
  } finally {
    topLoading.value = false
  }
}

const fetchFilterOptions = async () => {
  try {
    const [countriesRes, levelsRes] = await Promise.all([
      leaderboardApi.getGeniusAvailableCountries(),
      leaderboardApi.getGeniusAvailableLevels()
    ])
    countryOptions.value = countriesRes.data || []
    geniusLevelOptions.value = levelsRes.data || []
  } catch (err) {
    console.error('Failed to fetch filter options:', err)
  }
}

const refreshAll = async () => {
  await Promise.all([fetchAnalysis(), fetchTopUsers()])
}

const applyFilters = async () => {
  topPage.value = 1
  await fetchTopUsers()
}

const resetTopFilters = async () => {
  selectedCountry.value = []
  selectedGeniusLevels.value = []
  topPage.value = 1
  await fetchTopUsers()
}

const handlePageChange = async (page: number) => {
  topPage.value = page
  await fetchTopUsers()
}

const handleSortChange = async (payload: { prop: string; order: 'ascending' | 'descending' | null }) => {
  const mapper: Record<string, 'change' | 'base_value_factor' | 'target_value_factor'> = {
    change: 'change',
    base_value_factor: 'base_value_factor',
    target_value_factor: 'target_value_factor'
  }

  if (!payload.order || !mapper[payload.prop]) {
    sortBy.value = 'change'
    sortOrder.value = 'desc'
  } else {
    sortBy.value = mapper[payload.prop]
    sortOrder.value = payload.order === 'ascending' ? 'asc' : 'desc'
  }

  topPage.value = 1
  await fetchTopUsers()
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
      label: '上升 / 下降 / 持平',
      value: `${summary.increased_users} / ${summary.decreased_users} / ${summary.unchanged_users}`,
      note: `新增 ${summary.new_users}，缺失 ${summary.missing_users}`
    },
    {
      label: '最大上升',
      value: summary.max_increase.toFixed(4),
      note: `最大下降 ${summary.max_decrease.toFixed(4)}`
    }
  ]
})

const distributionOption = computed(() => {
  const distribution = analysis.value?.distribution
  if (!distribution || distribution.labels.length === 0) return null

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    grid: {
      left: '4%',
      right: '4%',
      top: '8%',
      bottom: '16%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: distribution.labels,
      axisLabel: {
        rotate: 35,
        fontSize: 11
      }
    },
    yAxis: {
      type: 'value',
      name: '用户数'
    },
    series: [
      {
        name: '变化分布',
        type: 'bar',
        barWidth: '66%',
        data: distribution.counts,
        itemStyle: {
          color: '#d56a3a'
        }
      }
    ]
  }
})

const moverRows = computed<ValueFactorUserChangeItem[]>(() => topPageData.value?.items || [])
const topTotal = computed(() => topPageData.value?.total || 0)
const sortOrderLabel = computed(() => {
  const fieldLabelMap: Record<typeof sortBy.value, string> = {
    change: '变化值',
    base_value_factor: '基准日 Value Factor',
    target_value_factor: '目标日 Value Factor'
  }
  const orderLabel = sortOrder.value === 'desc' ? '降序' : '升序'
  return `${fieldLabelMap[sortBy.value]} ${orderLabel}`
})

const formatSignedTable = (value: number) => {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}`
}

const calcRank = (index: number) => (topPage.value - 1) * topPageSize.value + index + 1

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
      { name: 'Combined Alpha', type: 'line', smooth: true, showSymbol: false, data: alpha, itemStyle: { color: '#d56a3a' }, lineStyle: { width: 2 } },
      { name: 'Power Pool', type: 'line', smooth: true, showSymbol: false, data: powerPool, itemStyle: { color: '#2f8f83' }, lineStyle: { width: 2 } },
      { name: 'Selected Alpha', type: 'line', smooth: true, showSymbol: false, data: selected, itemStyle: { color: '#7f5af0' }, lineStyle: { width: 2 } }
    ]
  }
})

watch(excludeBothHalf, async () => {
  topPage.value = 1
  await Promise.all([fetchAnalysis(), fetchTopUsers()])
})

onMounted(async () => {
  await fetchFilterOptions()
  await refreshAll()
})
</script>

<template>
  <div class="value-factor-page">
    <header class="dashboard-header">
      <div>
        <h1 class="dashboard-title">Value Factor 变化分析</h1>
        <p class="dashboard-subtitle">
          固定对比 `leaderboard_consultant_user` 在 2026-02-10 与 2026-02-11 的数据
        </p>
      </div>
      <el-button type="primary" class="primary-pill" @click="refreshAll">刷新数据</el-button>
    </header>

    <div class="settings-row">
      <el-switch v-model="excludeBothHalf" inline-prompt :active-text="'开'" :inactive-text="'关'" />
      <span class="settings-label">排除基准日和目标日 value_factor 都为 0.5 的数据</span>
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
          <article v-for="i in 3" :key="`summary-skeleton-${i}`" class="summary-card">
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

      <el-card class="chart-card" shadow="never">
        <template #header>
          <div class="section-header">
            <span class="section-title">变化分布（change = 目标日 - 基准日）</span>
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
              <span class="section-meta">共 {{ topTotal }} 人</span>
              <span class="section-meta">{{ sortOrderLabel }}</span>
            </div>
          </div>
          <div class="table-controls table-controls-filters">
            <el-select
              v-model="selectedCountry"
              multiple
              collapse-tags
              collapse-tags-tooltip
              clearable
              filterable
              class="control-select control-select-wide"
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
              class="control-select control-select-wide"
              placeholder="Genius 等级"
            >
              <el-option v-for="item in geniusLevelOptions" :key="item" :label="item" :value="item" />
            </el-select>
            <el-button type="primary" class="small-pill" @click="applyFilters">应用</el-button>
            <el-button class="small-pill light-pill" @click="resetTopFilters">清空</el-button>
          </div>
        </template>

        <p v-if="topError" class="table-error">{{ topError }}</p>

        <div v-if="showInitialTableLoading" class="section-skeleton">
          <el-skeleton :rows="10" animated />
        </div>
        <el-table
          v-else
          v-loading="topLoading"
          :data="moverRows"
          stripe
          style="width: 100%"
          :default-sort="{ prop: 'change', order: 'descending' }"
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
          <el-table-column prop="university" label="大学" min-width="170" />
          <el-table-column prop="base_value_factor" label="基准日 Value Factor" min-width="170" align="right" sortable="custom">
            <template #default="{ row }">{{ row.base_value_factor.toFixed(2) }}</template>
          </el-table-column>
          <el-table-column prop="target_value_factor" label="目标日 Value Factor" min-width="170" align="right" sortable="custom">
            <template #default="{ row }">{{ row.target_value_factor.toFixed(2) }}</template>
          </el-table-column>
          <el-table-column prop="change" label="变化值" min-width="130" align="right" sortable="custom">
            <template #default="{ row }">
              <span :class="row.change >= 0 ? 'positive' : 'negative'">
                {{ formatSignedTable(row.change) }}
              </span>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-wrapper" v-if="topTotal > 0">
          <el-pagination
            :current-page="topPage"
            :page-size="topPageSize"
            :total="topTotal"
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
.value-factor-page { max-width: 1500px; margin: 0 auto; padding: 2.5rem clamp(1.5rem, 3vw, 3rem) 4rem; position: relative; z-index: 1; }
.dashboard-header { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; margin-bottom: 1rem; }
.dashboard-title { font-family: 'Bricolage Grotesque', sans-serif; font-size: 2rem; margin: 0; }
.dashboard-subtitle { color: var(--ink-soft); margin-top: 0.4rem; }
.primary-pill { border-radius: 999px; letter-spacing: 0.12em; text-transform: uppercase; font-size: 0.75rem; padding: 0.6rem 1.4rem; background: var(--ink); border-color: var(--ink); color: var(--bg); }
.primary-pill:hover { background: var(--accent); border-color: var(--accent); color: #fff; }
.small-pill { border-radius: 999px; letter-spacing: 0.08em; text-transform: uppercase; height: 40px; padding: 0 1.1rem; }
.light-pill { border: 1px solid var(--stroke); background: var(--card); color: var(--ink-soft); }
.settings-row { display: flex; align-items: center; gap: 0.7rem; margin-bottom: 1rem; padding: 0.7rem 0.9rem; border-radius: var(--radius-sm); border: 1px solid var(--stroke); background: var(--card); }
.settings-label { color: var(--ink-soft); font-size: 0.9rem; }
.date-band { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1.2rem; }
.date-chip { border: 1px solid var(--stroke); background: var(--card); border-radius: 999px; padding: 0.42rem 0.9rem; font-size: 0.8rem; color: var(--ink-soft); }
.error-wrap { background: var(--card); border: 1px solid var(--stroke); border-radius: var(--radius-md); box-shadow: var(--shadow-md); padding: 1.2rem; margin-bottom: 1rem; }
.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.summary-card, .chart-card, .table-card { background: var(--card); border: 1px solid var(--stroke); border-radius: var(--radius-lg); box-shadow: var(--shadow-md); }
.summary-card { padding: 1rem 1.1rem; }
.card-label { text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.7rem; color: var(--ink-soft); }
.card-value { margin-top: 0.4rem; font-family: 'Bricolage Grotesque', sans-serif; font-size: 1.35rem; }
.card-note { margin-top: 0.4rem; font-size: 0.82rem; color: var(--ink-soft); }
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
  .trend-grid { grid-template-columns: 1fr; }
}
</style>

