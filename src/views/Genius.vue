<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
  ToolboxComponent
} from 'echarts/components'
import { leaderboardApi } from '@/api/leaderboard'
import WeightTrendChart from '@/components/WeightTrendChart.vue'
import type { GeniusWeightTimeSeries, GeniusUserWeightChange } from '@/types/leaderboard'

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
  ToolboxComponent
])

const dateRange = ref<[Date, Date] | null>(null)
const selectedLevels = ref<string[]>(['GRANDMASTER'])
const selectedCountries = ref<string[]>(['CN'])
const sortOrder = ref<'desc' | 'asc'>('desc')

const availableLevels = ref<string[]>([])
const availableCountries = ref<string[]>([])
const fallbackLevels = ['EXPERT', 'GOLD', 'GRANDMASTER', 'MASTER']

const seriesLoading = ref(false)
const usersLoading = ref(false)

const seriesData = ref<GeniusWeightTimeSeries[]>([])
const userChanges = ref<GeniusUserWeightChange[]>([])
const legendSelected = ref<Record<string, boolean>>({})

const trendDialogVisible = ref(false)
const activeUser = ref<GeniusUserWeightChange | null>(null)
const userTrendLoading = ref(false)
const userTrendData = ref<{ dates: string[]; weights: number[] }>({ dates: [], weights: [] })

const currentPage = ref(1)
const pageSize = ref(20)

const pagedUsers = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return userChanges.value.slice(start, start + pageSize.value)
})

const formatDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const resolveDateRange = () => {
  if (dateRange.value && dateRange.value.length === 2) {
    return {
      startDate: formatDate(dateRange.value[0]),
      endDate: formatDate(dateRange.value[1])
    }
  }
  return { startDate: undefined, endDate: undefined }
}

const trendRangeLabel = computed(() => {
  const { startDate, endDate } = resolveDateRange()
  if (startDate && endDate) {
    return `${startDate} 至 ${endDate}`
  }
  return '未选择'
})

const fetchFilters = async () => {
  try {
    const [levelsRes, countriesRes] = await Promise.all([
      leaderboardApi.getGeniusAvailableLevels(),
      leaderboardApi.getGeniusAvailableCountries()
    ])
    availableLevels.value = levelsRes.data.length > 0 ? levelsRes.data : fallbackLevels
    availableCountries.value = countriesRes.data

    if (selectedLevels.value.length === 0 && availableLevels.value.length > 0) {
      selectedLevels.value = ['GRANDMASTER']
    }
    if (selectedLevels.value.length > 0) {
      const levelMatch = selectedLevels.value.filter(level => availableLevels.value.includes(level))
      if (levelMatch.length === 0) {
        selectedLevels.value = availableLevels.value.length > 0 ? [availableLevels.value[0]] : fallbackLevels
      } else {
        selectedLevels.value = levelMatch
      }
    }

    if (selectedCountries.value.length > 0 && availableCountries.value.length > 0) {
      const countryMatch = selectedCountries.value.filter(country => availableCountries.value.includes(country))
      if (countryMatch.length === 0) {
        selectedCountries.value = [availableCountries.value[0]]
      } else {
        selectedCountries.value = countryMatch
      }
    } else if (selectedCountries.value.length === 0 && availableCountries.value.length > 0) {
      selectedCountries.value = ['CN']
      const fallbackMatch = selectedCountries.value.filter(country => availableCountries.value.includes(country))
      if (fallbackMatch.length === 0) {
        selectedCountries.value = [availableCountries.value[0]]
      }
    }
  } catch (error) {
    console.error('获取筛选项失败:', error)
    availableLevels.value = fallbackLevels
    if (selectedLevels.value.length === 0) {
      selectedLevels.value = ['GRANDMASTER']
    }
  }
}

const fetchUserTrend = async () => {
  if (!activeUser.value?.user) {
    return
  }
  userTrendLoading.value = true
  userTrendData.value = { dates: [], weights: [] }
  try {
    const { startDate, endDate } = resolveDateRange()
    const response = await leaderboardApi.getGeniusUserWeightTimeSeries(
      activeUser.value.user,
      startDate,
      endDate
    )
    userTrendData.value = {
      dates: response.data.dates,
      weights: response.data.weights
    }
  } catch (error) {
    console.error('获取用户趋势失败:', error)
  } finally {
    userTrendLoading.value = false
  }
}

const openUserTrend = async (row: GeniusUserWeightChange) => {
  activeUser.value = row
  trendDialogVisible.value = true
  await nextTick()
  fetchUserTrend()
}

const handleTrendDialogClosed = () => {
  activeUser.value = null
  userTrendData.value = { dates: [], weights: [] }
}

const fetchSeries = async () => {
  seriesLoading.value = true
  try {
    const { startDate, endDate } = resolveDateRange()
    const levelParam = selectedLevels.value.length ? selectedLevels.value.join(',') : undefined
    const countryParam = selectedCountries.value.length ? selectedCountries.value.join(',') : undefined
    const response = await leaderboardApi.getGeniusWeightTimeSeries(levelParam, countryParam, startDate, endDate)
    seriesData.value = response.data
  } catch (error) {
    console.error('获取趋势数据失败:', error)
  } finally {
    seriesLoading.value = false
  }
}

const fetchUsers = async () => {
  usersLoading.value = true
  try {
    const { startDate, endDate } = resolveDateRange()
    const levelParam = selectedLevels.value.length ? selectedLevels.value.join(',') : undefined
    const countryParam = selectedCountries.value.length ? selectedCountries.value.join(',') : undefined
    const response = await leaderboardApi.getGeniusUserWeightChanges(levelParam, countryParam, startDate, endDate, sortOrder.value)
    userChanges.value = response.data
    currentPage.value = 1
  } catch (error) {
    console.error('获取用户变化失败:', error)
  } finally {
    usersLoading.value = false
  }
}

const handleSearch = async () => {
  await Promise.all([fetchSeries(), fetchUsers()])
}

const formatSigned = (value: number) => {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}`
}

const summaryStats = computed(() => {
  if (userChanges.value.length === 0) {
    return {
      totalUsers: 0,
      avgChange: 0,
      medianChange: 0,
      topIncrease: 0,
      topDecrease: 0
    }
  }
  const changes = userChanges.value.map(item => item.weight_change)
  const sorted = [...changes].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]

  return {
    totalUsers: userChanges.value.length,
    avgChange: changes.reduce((sum, v) => sum + v, 0) / changes.length,
    medianChange: median,
    topIncrease: Math.max(...changes),
    topDecrease: Math.min(...changes)
  }
})

const buildHistogram = (values: number[], bins = 8) => {
  if (values.length === 0) return { labels: [], counts: [] }
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (min === max) {
    return {
      labels: [min.toFixed(2)],
      counts: [values.length]
    }
  }
  const step = (max - min) / bins
  const counts = new Array(bins).fill(0)
  const labels: string[] = []
  for (let i = 0; i < bins; i++) {
    const start = min + step * i
    const end = i === bins - 1 ? max : min + step * (i + 1)
    labels.push(`${start.toFixed(2)}~${end.toFixed(2)}`)
  }
  values.forEach(value => {
    const idx = Math.min(Math.floor((value - min) / step), bins - 1)
    counts[idx] += 1
  })
  return { labels, counts }
}

const distributionOption = computed(() => {
  if (userChanges.value.length === 0) {
    return null
  }
  const { labels, counts } = buildHistogram(userChanges.value.map(item => item.weight_change))
  return {
    title: {
      text: '变化量分布',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis'
    },
    grid: {
      left: '4%',
      right: '4%',
      bottom: '12%',
      top: '60px',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: {
        rotate: 30
      }
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        type: 'bar',
        data: counts,
        barWidth: '60%'
      }
    ]
  }
})

const chartOption = computed(() => {
  if (seriesData.value.length === 0) {
    return null
  }

  const allDates = new Set<string>()
  seriesData.value.forEach(series => {
    series.dates.forEach(date => allDates.add(date))
  })
  const dates = Array.from(allDates).sort()
  if (dates.length === 0) return null

  const grouped = new Map<string, number[]>()

  seriesData.value.forEach(series => {
    const key = `${series.genius_level}-${series.country}`

    const dateMap = new Map<string, number>()
    series.dates.forEach((date, idx) => {
      dateMap.set(date, series.weights[idx])
    })

    const data = dates.map(date => dateMap.get(date) ?? 0)
    if (!grouped.has(key)) {
      grouped.set(key, data)
    } else {
      const existing = grouped.get(key) || []
      grouped.set(key, existing.map((val, idx) => val + data[idx]))
    }
  })

  const series = Array.from(grouped.entries()).map(([name, data]) => ({
    name,
    type: 'line',
    smooth: true,
    symbol: 'circle',
    symbolSize: 6,
    data,
    emphasis: { focus: 'series' }
  }))

  const visibleSeries = Object.keys(legendSelected.value).length > 0
    ? series.filter(item => legendSelected.value[item.name] !== false)
    : series
  const allValues = visibleSeries.flatMap(item => item.data as number[])
  let yMin = 0
  let yMax = 1
  if (allValues.length > 0) {
    const dataMin = Math.min(...allValues)
    const dataMax = Math.max(...allValues)
    const range = dataMax - dataMin
    const margin = Math.max(range * 0.12, Math.abs(dataMax) * 0.02, 1)
    yMin = dataMin - margin
    yMax = dataMax + margin
    if (range === 0) {
      yMin = dataMin - Math.max(Math.abs(dataMin) * 0.05, 1)
      yMax = dataMax + Math.max(Math.abs(dataMax) * 0.05, 1)
    }
  }

  return {
    title: {
      text: 'Genius Weight 总和变化',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        if (!params || params.length === 0) return ''
        const header = `<div style="font-weight: 600; margin-bottom: 6px;">${params[0].axisValue}</div>`
        const lines = params.map((item: any) => {
          const value = typeof item.value === 'number' ? item.value.toFixed(2) : item.value
          return `
            <div style="display: flex; align-items: center; margin: 3px 0;">
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${item.color}; margin-right: 6px;"></span>
              <span style="flex: 1;">${item.seriesName}</span>
              <span style="font-weight: 600;">${value}</span>
            </div>
          `
        }).join('')
        return header + lines
      }
    },
    legend: {
      top: 35,
      type: 'scroll',
      selected: Object.keys(legendSelected.value).length > 0 ? legendSelected.value : undefined
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '12%',
      top: '80px',
      containLabel: true
    },
    toolbox: {
      feature: {
        saveAsImage: { title: '保存为图片' },
        dataZoom: { yAxisIndex: 'none', title: { zoom: '区域缩放', back: '还原' } },
        restore: { title: '还原' }
      }
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLabel: {
        rotate: 45,
        formatter: (value: string) => value.substring(5)
      }
    },
    yAxis: {
      type: 'value',
      name: 'Weight 总和',
      min: yMin,
      max: yMax,
      scale: true,
      axisLabel: {
        formatter: (value: number) => value.toFixed(2)
      }
    },
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { start: 0, end: 100 }
    ],
    series
  }
})

const handleLegendSelectChanged = (event: any) => {
  legendSelected.value = event?.selected || {}
}

onMounted(() => {
  const now = new Date()
  const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3
  const start = new Date(now.getFullYear(), quarterStartMonth, 1)
  const end = new Date(now.getFullYear(), quarterStartMonth + 3, 0)
  dateRange.value = [start, end]
  fetchFilters().then(handleSearch)
})
</script>

<template>
  <div class="genius-dashboard">
    <header class="dashboard-header">
      <div>
        <h1 class="dashboard-title">Genius 分析仪表盘</h1>
        <p class="dashboard-subtitle">按 Genius 等级与国家追踪 weight 变化与位置</p>
      </div>
      <el-button type="primary" class="primary-pill" @click="handleSearch">刷新数据</el-button>
    </header>

    <el-card class="filters-panel" shadow="never">
      <el-form class="filter-form" label-position="top">
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
          />
        </el-form-item>
        <el-form-item label="Genius 等级">
          <el-select v-model="selectedLevels" multiple collapse-tags clearable placeholder="选择等级">
            <el-option v-for="level in availableLevels" :key="level" :label="level" :value="level" />
          </el-select>
        </el-form-item>
        <el-form-item label="国家/地区">
          <el-select v-model="selectedCountries" multiple collapse-tags clearable placeholder="选择国家">
            <el-option v-for="country in availableCountries" :key="country" :label="country" :value="country" />
          </el-select>
        </el-form-item>
        <el-form-item class="form-actions">
          <el-button type="primary" class="primary-pill" @click="handleSearch">应用筛选</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <div class="kpi-grid">
      <template v-if="usersLoading">
        <el-card
          v-for="i in 4"
          :key="`kpi-skeleton-${i}`"
          class="kpi-card"
          shadow="never"
        >
          <el-skeleton :rows="2" animated />
        </el-card>
      </template>
      <template v-else>
        <el-card class="kpi-card" shadow="never">
          <div class="kpi-label">覆盖用户数</div>
          <div class="kpi-value">{{ summaryStats.totalUsers }}</div>
        </el-card>
        <el-card class="kpi-card" shadow="never">
          <div class="kpi-label">平均变化</div>
          <div class="kpi-value">{{ formatSigned(summaryStats.avgChange) }}</div>
        </el-card>
        <el-card class="kpi-card" shadow="never">
          <div class="kpi-label">中位数变化</div>
          <div class="kpi-value">{{ formatSigned(summaryStats.medianChange) }}</div>
        </el-card>
        <el-card class="kpi-card" shadow="never">
          <div class="kpi-label">极值变化区间</div>
          <div class="kpi-value">{{ summaryStats.topDecrease.toFixed(2) }} ~ {{ summaryStats.topIncrease.toFixed(2) }}</div>
        </el-card>
      </template>
    </div>

    <div class="charts-grid">
      <el-card class="chart-card" shadow="never">
        <template #header>
          <div class="section-header">
            <span class="section-title">总量趋势</span>
          </div>
        </template>
        <div v-if="seriesLoading" class="loading-block">
          <el-skeleton :rows="4" animated />
        </div>
        <div v-else-if="chartOption" class="chart-container">
          <v-chart
            :option="chartOption"
            :autoresize="true"
            class="chart"
            @legendselectchanged="handleLegendSelectChanged"
          />
        </div>
        <el-empty v-else description="暂无数据" />
      </el-card>

      <el-card class="chart-card" shadow="never">
        <template #header>
          <div class="section-header">
            <span class="section-title">变化量分布</span>
          </div>
        </template>
        <div v-if="usersLoading" class="loading-block">
          <el-skeleton :rows="4" animated />
        </div>
        <div v-else-if="distributionOption" class="chart-container">
          <v-chart :option="distributionOption" :autoresize="true" class="chart" />
        </div>
        <el-empty v-else description="暂无数据" />
      </el-card>
    </div>

    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="section-header">
          <span class="section-title">个人变化明细</span>
          <div class="table-controls">
            <span class="section-meta">共 {{ userChanges.length }} 人</span>
            <el-select v-model="sortOrder" size="small" style="width: 140px" @change="fetchUsers">
              <el-option label="变化量降序" value="desc" />
              <el-option label="变化量升序" value="asc" />
            </el-select>
          </div>
        </div>
      </template>
      <el-table v-loading="usersLoading" :data="pagedUsers" stripe style="width: 100%">
        <el-table-column prop="rank" label="排名" width="70" />
        <el-table-column label="用户" min-width="140">
          <template #default="{ row }">
            <el-button type="primary" link class="user-link" @click="openUserTrend(row)">
              {{ row.user }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column prop="genius_level" label="等级" min-width="120" />
        <el-table-column prop="country" label="国家" min-width="120" />
        <el-table-column label="起始 Weight" min-width="120" align="right">
          <template #default="{ row }">
            {{ row.start_weight.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="当前 Weight" min-width="120" align="right">
          <template #default="{ row }">
            {{ row.end_weight.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="变化量" min-width="120" align="right">
          <template #default="{ row }">
            <span :style="{ color: row.weight_change >= 0 ? 'var(--accent-2)' : '#a6322a' }">
              {{ formatSigned(row.weight_change) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="位置" min-width="160">
          <template #default="{ row }">
            <el-progress
              :percentage="Number(row.percentile.toFixed(2))"
              :stroke-width="10"
              :format="(p: number) => `${p.toFixed(2)}%`"
            />
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrapper" v-if="userChanges.length > pageSize">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="userChanges.length"
          layout="total, prev, pager, next"
          background
        />
      </div>
    </el-card>

    <el-dialog
      v-model="trendDialogVisible"
      class="trend-dialog"
      width="760px"
      destroy-on-close
      @closed="handleTrendDialogClosed"
    >
      <template #header>
        <div class="trend-dialog-header">
          <div>
            <div class="trend-title">{{ activeUser?.user || '用户' }} 权重变化</div>
            <div class="trend-subtitle">时间范围：{{ trendRangeLabel }}</div>
          </div>
          <div class="trend-meta" v-if="activeUser">
            <span>等级：{{ activeUser.genius_level || '-' }}</span>
            <span>国家：{{ activeUser.country || '-' }}</span>
          </div>
        </div>
      </template>
      <div v-if="userTrendLoading" class="dialog-loading">
        <el-skeleton :rows="4" animated />
      </div>
      <div v-else-if="userTrendData.dates.length > 0" class="dialog-chart">
        <WeightTrendChart :data="userTrendData" />
      </div>
      <el-empty v-else description="暂无数据" />
    </el-dialog>
  </div>
</template>

<style scoped>
.genius-dashboard {
  max-width: 1500px;
  margin: 0 auto;
  padding: 2.5rem clamp(1.5rem, 3vw, 3rem) 4rem;
  position: relative;
  z-index: 1;
}

.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.dashboard-title {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 2rem;
  margin: 0;
}

.dashboard-subtitle {
  color: var(--ink-soft);
  margin-top: 0.4rem;
}

.primary-pill {
  border-radius: 999px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 0.75rem;
  padding: 0.6rem 1.4rem;
}

.filters-panel,
.chart-card,
.table-card,
.kpi-card {
  background: var(--card);
  border: 1px solid var(--stroke);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.filters-panel {
  margin-bottom: 1.5rem;
  background: linear-gradient(135deg, rgba(213, 106, 58, 0.08), rgba(31, 111, 120, 0.06));
}

.filter-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  align-items: end;
}

.form-actions {
  display: flex;
  align-items: flex-end;
}

.filters-panel :deep(.el-form-item__label) {
  font-size: 0.7rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--ink-soft);
  font-weight: 600;
}

.filters-panel :deep(.el-input__wrapper),
.filters-panel :deep(.el-select__wrapper),
.filters-panel :deep(.el-date-editor) {
  background: var(--bg);
  border: 1px solid var(--stroke);
  border-radius: 12px;
  box-shadow: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.filters-panel :deep(.el-input__wrapper:hover),
.filters-panel :deep(.el-select__wrapper:hover),
.filters-panel :deep(.el-date-editor:hover) {
  border-color: rgba(213, 106, 58, 0.45);
}

.filters-panel :deep(.el-input__wrapper.is-focus),
.filters-panel :deep(.el-select__wrapper.is-focus),
.filters-panel :deep(.el-date-editor.is-focus) {
  border-color: rgba(213, 106, 58, 0.65);
  box-shadow: 0 0 0 3px rgba(213, 106, 58, 0.12);
}

.filters-panel :deep(.el-select__tags) {
  gap: 0.35rem;
}

.filters-panel :deep(.el-tag) {
  background: rgba(213, 106, 58, 0.12);
  border: 1px solid rgba(213, 106, 58, 0.3);
  color: var(--ink);
}

.filters-panel :deep(.el-range-separator),
.filters-panel :deep(.el-range-input) {
  color: var(--ink-soft);
}

.form-actions .el-button {
  width: 100%;
}

.primary-pill {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--bg);
}

.primary-pill:hover {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.primary-pill:active {
  background: var(--ink-soft);
  border-color: var(--ink-soft);
}

.primary-pill.is-disabled {
  background: rgba(27, 25, 22, 0.3);
  border-color: rgba(27, 25, 22, 0.3);
  color: rgba(255, 255, 255, 0.8);
}

.table-card :deep(.el-table) {
  --el-table-bg-color: var(--card);
  --el-table-tr-bg-color: var(--card);
  --el-table-header-bg-color: var(--bg-2);
  --el-table-row-hover-bg-color: rgba(213, 106, 58, 0.08);
}

.table-card :deep(.el-table__inner-wrapper),
.table-card :deep(.el-table__body-wrapper),
.table-card :deep(.el-table__header-wrapper),
.table-card :deep(.el-table__body),
.table-card :deep(.el-table__header) {
  background-color: var(--card);
}

.table-card :deep(.el-table__header-wrapper th) {
  background: var(--bg-2);
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 0.7rem;
  color: var(--ink-soft);
}

.table-card :deep(.el-progress-bar__outer) {
  background: rgba(31, 111, 120, 0.12);
}

.table-card :deep(.el-progress-bar__inner) {
  background: linear-gradient(90deg, rgba(31, 111, 120, 0.8), rgba(213, 106, 58, 0.9));
}

.table-controls :deep(.el-select__wrapper) {
  background: var(--bg);
  border: 1px solid var(--stroke);
  border-radius: 999px;
  box-shadow: none;
}

.table-controls :deep(.el-input__inner) {
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink);
}

.user-link {
  font-weight: 600;
  color: var(--accent);
}

.user-link:hover {
  color: var(--accent-2);
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.kpi-card {
  padding: 1.2rem;
}

.kpi-label {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.7rem;
  color: var(--ink-soft);
}

.kpi-value {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 1.6rem;
  margin-top: 0.5rem;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.section-title {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 1.2rem;
}

.section-meta {
  font-size: 0.85rem;
  color: var(--ink-soft);
}

.table-controls {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.chart-container {
  height: 420px;
}

.chart {
  width: 100%;
  height: 100%;
}

.loading-block {
  padding: 1.5rem;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding-top: 1rem;
}

.trend-dialog :deep(.el-dialog__header) {
  margin-right: 0;
}

.trend-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
}

.trend-title {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 1.2rem;
  font-weight: 700;
}

.trend-subtitle {
  margin-top: 0.35rem;
  font-size: 0.85rem;
  color: var(--ink-soft);
}

.trend-meta {
  display: grid;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: var(--ink-soft);
  text-align: right;
}

.dialog-loading {
  padding: 1rem 0;
}

.dialog-chart {
  height: 360px;
}

.dialog-chart :deep(.weight-trend-chart) {
  min-height: 320px;
}

@media (max-width: 900px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .filter-form {
    grid-template-columns: 1fr;
  }
}
</style>
