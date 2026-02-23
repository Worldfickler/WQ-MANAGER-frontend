<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import type { EChartsOption } from 'echarts'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import WeightTrendChart from '@/components/WeightTrendChart.vue'
import { userApi } from '@/api/user'
import type {
  CombinedTrendRecord,
  UserHistoryRecord,
  UserStatistics,
  ValueFactorTrendRecord
} from '@/api/user'

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent])

const router = useRouter()

const currentUser = ref<{
  wq_id?: string
  username?: string
}>({})

const statistics = ref<UserStatistics | null>(null)
const statsLoading = ref(false)

const historyData = ref<UserHistoryRecord[]>([])
const valueFactorTrend = ref<ValueFactorTrendRecord[]>([])
const combinedTrend = ref<CombinedTrendRecord[]>([])
const historyLoading = ref(false)
const dailyOsmosisStartDate = '2026-02-16'
const selectedOsmosisDateRange = ref<string[] | null>(null)
const isOsmosisCardFlipped = ref(false)

const currentPage = ref(1)
const pageSize = ref(10)
const totalRecords = computed(() => historyData.value.length)
const totalPages = computed(() => Math.ceil(totalRecords.value / pageSize.value))

const paginatedHistory = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return historyData.value.slice().reverse().slice(start, end)
})

const handlePageChange = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const handleLogout = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('isAuthenticated')
  localStorage.removeItem('user')
  router.push('/login')
}

const fetchStatistics = async () => {
  statsLoading.value = true
  try {
    const response = await userApi.getStatistics()
    statistics.value = response.data
    await fetchHistory()
  } catch (error: any) {
    console.error('获取统计数据失败:', error)
  } finally {
    statsLoading.value = false
  }
}

const fetchHistory = async () => {
  historyLoading.value = true
  try {
    const response = await userApi.getHistory(3650)
    historyData.value = response.data.data || []
    valueFactorTrend.value = response.data.value_factor_trend || []
    combinedTrend.value = response.data.combined_trend || []
    const latestOsmosisDate = [...historyData.value]
      .reverse()
      .find(item => item.record_date && item.daily_osmosis_rank !== null && item.daily_osmosis_rank !== undefined)?.record_date
    selectedOsmosisDateRange.value = latestOsmosisDate ? [dailyOsmosisStartDate, latestOsmosisDate] : null
    currentPage.value = 1
  } catch (error: any) {
    console.error('获取历史数据失败:', error)
  } finally {
    historyLoading.value = false
  }
}

const formatSigned = (value: number) => {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}`
}

const statCards = computed(() => {
  if (!statistics.value) return []
  const stats = statistics.value
  return [
    {
      label: '当前 Weight',
      value: stats.current_weight,
      precision: 2,
      icon: '⚖️'
    },
    {
      label: '历史最高',
      value: stats.max_weight,
      precision: 2,
      icon: '🏆'
    },
    {
      label: '单日最大变化',
      value: stats.max_daily_change,
      precision: 2,
      icon: '📈',
      note: stats.max_change_date ? `日期 ${stats.max_change_date}` : ''
    },
    {
      label: '今日变化',
      value: stats.daily_change,
      precision: 2,
      icon: '📊',
      formatter: formatSigned,
      valueStyle: {
        color: stats.daily_change >= 0 ? 'var(--accent-2)' : '#a6322a'
      }
    }
  ]
})

const weightChartData = computed(() => {
  if (!historyData.value.length) return { dates: [], weights: [] }
  return {
    dates: historyData.value.map(item => item.record_date),
    weights: historyData.value.map(item => item.weight_factor || 0)
  }
})

const parseDay = (value: string) => new Date(`${value}T00:00:00`)
const weekDayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const formatDay = (value: Date) => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getWeekStart = (value: string) => {
  const date = parseDay(value)
  const weekday = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - weekday)
  return date
}

const getWeekdayIndex = (value: string) => (parseDay(value).getDay() + 6) % 7

const osmosisBaseHistory = computed(() => {
  const start = parseDay(dailyOsmosisStartDate)
  return historyData.value.filter(item => {
    if (!item.record_date) return false
    if (item.daily_osmosis_rank === null || item.daily_osmosis_rank === undefined) return false
    return parseDay(item.record_date) >= start
  })
})

const filteredDailyOsmosisHistory = computed(() => {
  if (!osmosisBaseHistory.value.length || !selectedOsmosisDateRange.value || selectedOsmosisDateRange.value.length !== 2) {
    return osmosisBaseHistory.value
  }
  const [startDate, endDate] = selectedOsmosisDateRange.value
  const start = parseDay(startDate)
  const end = parseDay(endDate)
  return osmosisBaseHistory.value.filter(item => item.record_date && parseDay(item.record_date) >= start && parseDay(item.record_date) <= end)
})

const dailyOsmosisChartData = computed(() => ({
  labels: filteredDailyOsmosisHistory.value.map(item => item.record_date),
  values: filteredDailyOsmosisHistory.value.map(item => item.daily_osmosis_rank)
}))

const weeklyOsmosisChartData = computed(() => {
  const grouped = new Map<string, { weekStart: string; weekEnd: string; values: Array<number | null> }>()

  filteredDailyOsmosisHistory.value.forEach(item => {
    if (!item.record_date || item.daily_osmosis_rank === null || item.daily_osmosis_rank === undefined) return
    const weekStartDate = getWeekStart(item.record_date)
    const weekStart = formatDay(weekStartDate)
    const weekday = getWeekdayIndex(item.record_date)

    if (!grouped.has(weekStart)) {
      const weekEndDate = parseDay(weekStart)
      weekEndDate.setDate(weekEndDate.getDate() + 6)
      grouped.set(weekStart, {
        weekStart,
        weekEnd: formatDay(weekEndDate),
        values: Array.from({ length: 7 }, () => null)
      })
    }

    const weekGroup = grouped.get(weekStart)
    if (!weekGroup) return
    weekGroup.values[weekday] = Number(item.daily_osmosis_rank)
  })

  return [...grouped.values()]
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    .map(week => {
      const validRanks = week.values.filter((value): value is number => value !== null && value !== undefined)
      const averageRank = validRanks.length ? validRanks.reduce((sum, value) => sum + value, 0) / validRanks.length : null
      return {
        ...week,
        averageRank
      }
    })
})

const valueFactorChartData = computed(() => ({
  labels: valueFactorTrend.value.map(item => item.date_range),
  updateDates: valueFactorTrend.value.map(item => item.update_date),
  values: valueFactorTrend.value.map(item => item.value_factor)
}))

const combinedChartData = computed(() => ({
  labels: combinedTrend.value.map(item => item.date_range),
  updateDates: combinedTrend.value.map(item => item.update_date),
  alpha: combinedTrend.value.map(item => item.combined_alpha_performance),
  powerPool: combinedTrend.value.map(item => item.combined_power_pool_alpha_performance),
  selected: combinedTrend.value.map(item => item.combined_selected_alpha_performance)
}))

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

const valueFactorOption = computed<EChartsOption | null>(() => {
  if (!valueFactorChartData.value.labels.length) return null

  const validValues = pickValidNumbers(valueFactorChartData.value.values)
  if (!validValues.length) return null
  const { min, max } = computeYAxisRange(validValues)

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const points = Array.isArray(params) ? params : [params]
        const point = points[0]
        if (!point) return ''
        const updateDate = valueFactorChartData.value.updateDates[point.dataIndex] || '-'
        const displayValue = point.value === null || point.value === undefined ? '-' : Number(point.value).toFixed(2)
        return `区间: ${point.axisValue}<br/>更新时间: ${updateDate}<br/>Value Factor: ${displayValue}`
      }
    },
    grid: {
      left: '4%',
      right: '4%',
      top: '10%',
      bottom: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: valueFactorChartData.value.labels,
      boundaryGap: false,
      axisLabel: {
        interval: 0,
        rotate: 0,
        lineHeight: 14,
        margin: 8,
        formatter: (value: string) => formatDateRangeLabel(value),
        color: '#6f665d'
      }
    },
    yAxis: {
      type: 'value',
      name: 'Value Factor',
      min,
      max,
      scale: true,
      axisLabel: { formatter: (value: number) => value.toFixed(2) }
    },
    series: [
      {
        name: 'Value Factor',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: valueFactorChartData.value.values,
        itemStyle: { color: '#d56a3a' },
        lineStyle: { width: 2 },
        areaStyle: { color: 'rgba(213, 106, 58, 0.12)' }
      }
    ]
  }
})

const combinedOption = computed<EChartsOption | null>(() => {
  if (!combinedChartData.value.labels.length) return null

  const validValues = pickValidNumbers([
    ...combinedChartData.value.alpha,
    ...combinedChartData.value.powerPool,
    ...combinedChartData.value.selected
  ])
  if (!validValues.length) return null
  const { min, max } = computeYAxisRange(validValues)

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const points = Array.isArray(params) ? params : [params]
        const index = points[0]?.dataIndex ?? 0
        const dateRange = combinedChartData.value.labels[index] || '-'
        const updateDate = combinedChartData.value.updateDates[index] || '-'
        const lines = points.map((item: any) => {
          const value = item.value === null || item.value === undefined ? '-' : Number(item.value).toFixed(2)
          return `${item.marker}${item.seriesName}: ${value}`
        })
        return [`区间: ${dateRange}`, `更新时间: ${updateDate}`, ...lines].join('<br/>')
      }
    },
    legend: {
      top: 0,
      textStyle: { color: '#6f665d' }
    },
    grid: {
      left: '4%',
      right: '4%',
      top: '16%',
      bottom: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: combinedChartData.value.labels,
      boundaryGap: false,
      axisLabel: {
        interval: 0,
        rotate: 0,
        lineHeight: 14,
        margin: 8,
        formatter: (value: string) => formatDateRangeLabel(value),
        color: '#6f665d'
      }
    },
    yAxis: {
      type: 'value',
      name: 'Combined',
      min,
      max,
      scale: true,
      axisLabel: { formatter: (value: number) => value.toFixed(2) }
    },
    series: [
      {
        name: 'Combined Alpha',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: combinedChartData.value.alpha,
        itemStyle: { color: '#d56a3a' },
        lineStyle: { width: 2 }
      },
      {
        name: 'Power Pool',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: combinedChartData.value.powerPool,
        itemStyle: { color: '#2f8f83' },
        lineStyle: { width: 2 }
      },
      {
        name: 'Selected Alpha',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: combinedChartData.value.selected,
        itemStyle: { color: '#7f5af0' },
        lineStyle: { width: 2 }
      }
    ]
  }
})

const dailyOsmosisOption = computed<EChartsOption | null>(() => {
  if (!dailyOsmosisChartData.value.labels.length) return null

  const validValues = pickValidNumbers(dailyOsmosisChartData.value.values)
  if (!validValues.length) return null

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const points = Array.isArray(params) ? params : [params]
        const point = points[0]
        if (!point) return ''
        const displayValue = point.value === null || point.value === undefined ? '-' : Number(point.value).toFixed(2)
        return `日期: ${point.axisValue}<br/>Daily Osmosis Rank: ${displayValue}`
      }
    },
    grid: {
      left: '4%',
      right: '4%',
      top: '10%',
      bottom: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dailyOsmosisChartData.value.labels,
      boundaryGap: false,
      axisLabel: {
        interval: 0,
        hideOverlap: false,
        rotate: 25,
        margin: 10,
        color: '#6f665d'
      }
    },
    yAxis: {
      type: 'value',
      name: 'Rank',
      min: 0,
      max: 1,
      scale: false,
      axisLabel: { formatter: (value: number) => value.toFixed(2) }
    },
    series: [
      {
        name: 'Daily Osmosis Rank',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: dailyOsmosisChartData.value.values,
        itemStyle: { color: '#1f6f78' },
        lineStyle: { width: 2 },
        areaStyle: { color: 'rgba(31, 111, 120, 0.12)' },
        markLine: {
          symbol: ['none', 'arrow'],
          symbolSize: 10,
          data: [{ type: 'average', name: '平均值' }]
        }
      }
    ]
  }
})

const weeklyOsmosisOption = computed<EChartsOption | null>(() => {
  if (!weeklyOsmosisChartData.value.length) return null

  const validValues = pickValidNumbers(weeklyOsmosisChartData.value.flatMap(item => item.values))
  if (!validValues.length) return null
  const colorByIndex = (index: number) =>
    `hsl(${Math.round((index * 360) / Math.max(weeklyOsmosisChartData.value.length, 1))}, 70%, 45%)`

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const points = Array.isArray(params) ? params : [params]
        const point = points[0]
        if (!point) return ''
        const lines = points
          .filter((item: any) => item.value !== null && item.value !== undefined)
          .map((item: any) => {
          const value = item.value === null || item.value === undefined ? '-' : Number(item.value).toFixed(2)
          return `${item.marker}${item.seriesName}: ${value}`
          })
        return [`星期: ${point.axisValue}`, ...(lines.length ? lines : ['无数据'])].join('<br/>')
      }
    },
    legend: {
      type: 'scroll',
      top: 0,
      textStyle: { color: '#6f665d' }
    },
    grid: {
      left: '4%',
      right: '4%',
      top: '20%',
      bottom: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: weekDayLabels,
      boundaryGap: false,
      axisLabel: {
        interval: 0,
        rotate: 0,
        margin: 10,
        color: '#6f665d'
      }
    },
    yAxis: {
      type: 'value',
      name: 'Rank',
      min: 0,
      max: 1,
      scale: false,
      axisLabel: { formatter: (value: number) => value.toFixed(2) }
    },
    series: weeklyOsmosisChartData.value.map((week, index) => {
      const color = colorByIndex(index)
      return {
        name: `${week.weekStart} ~ ${week.weekEnd}`,
        type: 'line',
        smooth: true,
        showSymbol: false,
        connectNulls: false,
        data: week.values,
        itemStyle: { color },
        lineStyle: { width: 2, opacity: 0.95 },
        emphasis: {
          focus: 'series',
          lineStyle: { width: 3 }
        },
        markLine: week.averageRank === null
          ? undefined
          : {
              symbol: ['none', 'arrow'],
              symbolSize: 10,
              data: [
                {
                  name: '平均值',
                  yAxis: Number(week.averageRank.toFixed(2))
                }
              ]
            }
      }
    })
  }
})

const toggleOsmosisCard = () => {
  isOsmosisCardFlipped.value = !isOsmosisCardFlipped.value
}

onMounted(() => {
  const userStr = localStorage.getItem('user')
  if (userStr) {
    currentUser.value = JSON.parse(userStr)
  }
  fetchStatistics()
})
</script>

<template>
  <div class="profile-page">
    <section class="page-header-wrap">
      <div class="page-header">
        <div class="user-info">
          <h1 class="page-title">个人中心</h1>
          <p class="user-subtitle">{{ currentUser.username || currentUser.wq_id }}</p>
        </div>
        <el-button class="logout-btn" @click="handleLogout">退出登录</el-button>
      </div>
    </section>

    <section class="stats-section">
      <el-row v-if="statsLoading" :gutter="16">
        <el-col v-for="i in 4" :key="`skeleton-${i}`" :xs="24" :sm="12" :lg="6">
          <el-card class="stat-card" shadow="never">
            <el-skeleton :rows="2" animated />
          </el-card>
        </el-col>
      </el-row>
      <el-row v-else-if="statCards.length" :gutter="16">
        <el-col v-for="card in statCards" :key="card.label" :xs="24" :sm="12" :lg="6">
          <el-card class="stat-card" shadow="never">
            <div class="stat-card-body">
              <div class="stat-icon">{{ card.icon }}</div>
              <div class="stat-content">
                <el-statistic
                  :title="card.label"
                  :value="card.value"
                  :precision="card.precision"
                  :formatter="card.formatter"
                  :value-style="card.valueStyle"
                />
                <div v-if="card.note" class="stat-note">{{ card.note }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
      <el-empty v-else description="暂无统计数据" />
    </section>

    <el-card class="chart-section" shadow="never">
      <template #header>
        <div class="section-header">
          <span class="section-title">Weight 变化趋势</span>
          <span v-if="statistics?.record_days" class="section-meta">共 {{ statistics.record_days }} 天</span>
        </div>
      </template>

      <div v-if="historyLoading" class="chart-loading">
        <el-skeleton :rows="4" animated />
      </div>
      <div v-else-if="weightChartData.dates.length > 0" class="chart-container">
        <WeightTrendChart :data="weightChartData" />
      </div>
      <el-empty v-else description="暂无数据" />
    </el-card>

    <el-card class="chart-section" shadow="never">
      <template #header>
        <div class="section-header">
          <span class="section-title">Daily Osmosis Rank 变化趋势</span>
          <div class="section-actions">
            <el-date-picker
              v-model="selectedOsmosisDateRange"
              type="daterange"
              value-format="YYYY-MM-DD"
              format="YYYY-MM-DD"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
               class="date-range-picker"
               unlink-panels
             />
            <el-button class="flip-toggle-btn" text @click="toggleOsmosisCard">
              {{ isOsmosisCardFlipped ? '切换到日维度' : '切换到周维度' }}
            </el-button>
          </div>
        </div>
      </template>

      <div v-if="historyLoading" class="chart-loading">
        <el-skeleton :rows="4" animated />
      </div>
      <div v-else class="osmosis-flip-wrapper">
        <div class="osmosis-flip-inner" :class="{ 'is-flipped': isOsmosisCardFlipped }">
          <div class="osmosis-face osmosis-face-front">
            <v-chart v-if="dailyOsmosisOption" :option="dailyOsmosisOption" :autoresize="true" class="trend-chart osmosis-chart" />
            <el-empty v-else description="暂无 Daily Osmosis Rank 数据" />
          </div>
          <div class="osmosis-face osmosis-face-back">
            <v-chart v-if="weeklyOsmosisOption" :option="weeklyOsmosisOption" :autoresize="true" class="trend-chart osmosis-chart" />
            <el-empty v-else description="暂无周维度数据" />
          </div>
        </div>
      </div>
    </el-card>

    <section class="trend-grid">
      <el-card class="chart-section trend-card" shadow="never">
        <template #header>
          <div class="section-header">
            <span class="section-title">Value Factor 变化趋势</span>
          </div>
        </template>

        <div v-if="historyLoading" class="chart-loading">
          <el-skeleton :rows="4" animated />
        </div>
        <v-chart v-else-if="valueFactorOption" :option="valueFactorOption" :autoresize="true" class="trend-chart" />
        <el-empty v-else description="暂无 Value Factor 数据" />
      </el-card>

      <el-card class="chart-section trend-card" shadow="never">
        <template #header>
          <div class="section-header">
            <span class="section-title">Combined 变化趋势</span>
          </div>
        </template>

        <div v-if="historyLoading" class="chart-loading">
          <el-skeleton :rows="4" animated />
        </div>
        <v-chart v-else-if="combinedOption" :option="combinedOption" :autoresize="true" class="trend-chart" />
        <el-empty v-else description="暂无 Combined 数据" />
      </el-card>

    </section>

    <el-card class="history-section" shadow="never">
      <template #header>
        <div class="section-header">
          <span class="section-title">历史记录</span>
          <span v-if="totalRecords > 0" class="section-meta">共 {{ totalRecords }} 条</span>
        </div>
      </template>

      <el-table
        v-loading="historyLoading"
        :data="paginatedHistory"
        stripe
        style="width: 100%"
        class="history-table"
        :header-cell-style="{ background: 'var(--bg-2)', color: 'var(--ink-soft)', fontWeight: '600' }"
      >
        <el-table-column prop="record_date" label="日期" min-width="120" />
        <el-table-column label="Weight" min-width="120" align="right">
          <template #default="{ row }">
            {{ row.weight_factor !== null && row.weight_factor !== undefined ? row.weight_factor.toFixed(2) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="Value Factor" min-width="120" align="right">
          <template #default="{ row }">
            {{ row.value_factor !== null && row.value_factor !== undefined ? row.value_factor.toFixed(2) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="Daily Osmosis Rank" min-width="150" align="right">
          <template #default="{ row }">
            {{ row.daily_osmosis_rank !== null && row.daily_osmosis_rank !== undefined ? row.daily_osmosis_rank : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="Regular Alpha 提交数" min-width="140" align="center">
          <template #default="{ row }">{{ row.submissions_count ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="Regular Alpha 生产相关" min-width="160" align="right">
          <template #default="{ row }">
            {{ row.mean_prod_correlation !== null && row.mean_prod_correlation !== undefined ? row.mean_prod_correlation.toFixed(4) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="Regular Alpha 自相关" min-width="140" align="right">
          <template #default="{ row }">
            {{ row.mean_self_correlation !== null && row.mean_self_correlation !== undefined ? row.mean_self_correlation.toFixed(4) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="Super Alpha 提交数" min-width="140" align="center">
          <template #default="{ row }">{{ row.super_alpha_submissions_count ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="Super Alpha 生产相关" min-width="160" align="right">
          <template #default="{ row }">
            {{ row.super_alpha_mean_prod_correlation !== null && row.super_alpha_mean_prod_correlation !== undefined ? row.super_alpha_mean_prod_correlation.toFixed(4) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="Super Alpha 自相关" min-width="140" align="right">
          <template #default="{ row }">
            {{ row.super_alpha_mean_self_correlation !== null && row.super_alpha_mean_self_correlation !== undefined ? row.super_alpha_mean_self_correlation.toFixed(4) : '-' }}
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper" v-if="totalPages > 1">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="totalRecords"
          layout="total, prev, pager, next, jumper"
          @current-change="handlePageChange"
          background
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.profile-page {
  max-width: 1500px;
  margin: 0 auto;
  padding: 2.5rem clamp(1.5rem, 3vw, 3rem) 4rem;
  position: relative;
  z-index: 1;
}

.page-header-wrap {
  margin-bottom: 1.5rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
}

.logout-btn {
  padding: 0.55rem 1rem;
  border: 1px solid var(--stroke);
  background: transparent;
  color: var(--ink-soft);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  cursor: pointer;
  border-radius: 999px;
  transition: all 0.2s ease;
}

.logout-btn:hover {
  background: var(--ink);
  color: var(--bg);
}

.user-info {
  display: flex;
  flex-direction: column;
}

.page-title {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 1.8rem;
  margin: 0;
}

.user-subtitle {
  font-size: 0.9rem;
  color: var(--ink-soft);
  margin-top: 0.3rem;
}

.stats-section {
  margin-bottom: 1.5rem;
}

.stats-section :deep(.el-col) {
  display: flex;
}

.stat-card {
  background: var(--card);
  border-radius: var(--radius-md);
  border: 1px solid var(--stroke);
  box-shadow: var(--shadow-md);
  width: 100%;
  height: 100%;
}

.stat-card-body {
  display: flex;
  gap: 1rem;
  align-items: center;
  min-height: 92px;
}

.stat-note {
  font-size: 0.75rem;
  color: var(--ink-soft);
  margin-top: 0.25rem;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 1.4rem;
  background: rgba(27, 25, 22, 0.08);
}

.chart-section,
.history-section {
  background: var(--card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--stroke);
  box-shadow: var(--shadow-md);
  margin-bottom: 1.5rem;
}

.trend-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.2rem;
  margin-bottom: 1.5rem;
}

.trend-card {
  margin-bottom: 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
}

.section-title {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 1.2rem;
}

.section-meta {
  font-size: 0.8rem;
  color: var(--ink-soft);
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.flip-toggle-btn {
  padding: 0.35rem 0.6rem;
  border-radius: 10px;
  font-weight: 600;
}

.date-range-picker {
  width: 320px;
}

.date-range-picker :deep(.el-input__wrapper) {
  min-height: 34px;
  border-radius: 10px;
}

.chart-container {
  min-height: 360px;
}

.trend-chart {
  width: 100%;
  min-height: 360px;
}

.osmosis-flip-wrapper {
  perspective: 1800px;
  min-height: 360px;
  overflow: hidden;
}

.osmosis-flip-inner {
  position: relative;
  min-height: 360px;
  will-change: filter;
  transition: filter 0.55s ease;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.04));
}

.osmosis-flip-inner.is-flipped {
  filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.07));
}

.osmosis-face {
  position: absolute;
  inset: 0;
  border-radius: 10px;
  overflow: hidden;
  will-change: transform, opacity;
  transition:
    transform 0.72s cubic-bezier(0.22, 0.9, 0.25, 1),
    opacity 0.48s ease;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform-style: flat;
}

.osmosis-face-front {
  z-index: 2;
  opacity: 1;
  transform: rotateY(0deg);
  pointer-events: auto;
}

.osmosis-face-back {
  z-index: 1;
  opacity: 0;
  transform: rotateY(-180deg);
  pointer-events: none;
}

.osmosis-flip-inner.is-flipped .osmosis-face-front {
  z-index: 1;
  opacity: 0;
  transform: rotateY(180deg);
  pointer-events: none;
}

.osmosis-flip-inner.is-flipped .osmosis-face-back {
  z-index: 2;
  opacity: 1;
  transform: rotateY(0deg);
  pointer-events: auto;
}

.osmosis-chart {
  height: 360px;
  min-height: 360px;
}

.history-table {
  --el-table-bg-color: var(--card);
  --el-table-tr-bg-color: var(--card);
  --el-table-row-hover-bg-color: rgba(213, 106, 58, 0.08);
  --el-table-header-bg-color: var(--bg-2);
}

:deep(.history-table .el-table__inner-wrapper),
:deep(.history-table .el-table__body-wrapper),
:deep(.history-table .el-table__header-wrapper),
:deep(.history-table .el-table__body),
:deep(.history-table .el-table__header) {
  background-color: var(--card);
}

:deep(.history-table .el-table__header-wrapper th) {
  background: var(--bg-2);
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 0.7rem;
  color: var(--ink-soft);
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding-top: 1rem;
}

@media (max-width: 1100px) {
  .trend-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .section-actions {
    width: 100%;
    justify-content: space-between;
  }
  .date-range-picker {
    width: 100%;
    max-width: 320px;
  }
  .section-actions {
    flex-wrap: wrap;
    align-items: flex-start;
  }
}
</style>
