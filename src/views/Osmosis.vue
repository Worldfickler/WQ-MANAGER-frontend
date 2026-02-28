<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import type { EChartsOption } from 'echarts'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { leaderboardApi } from '@/api/leaderboard'
import type { OsmosisDailyRecordItem, OsmosisSummary } from '@/types/leaderboard'

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent])

type SortField =
  | 'user'
  | 'country'
  | 'avg_osmosis_rank'
  | 'days_with_data'
  | 'above_avg_days'
  | 'below_avg_days'
  | 'max_osmosis_rank'
  | 'min_osmosis_rank'

const loading = ref(false)
const filtersLoading = ref(false)
const firstLoading = ref(true)
const error = ref('')
const defaultStartDate = '2026-02-16'

const getTodayDate = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const page = ref(1)
const pageSize = ref(50)
const total = ref(0)
const rows = ref<OsmosisDailyRecordItem[]>([])

const selectedDateRange = ref<string[] | null>([defaultStartDate, getTodayDate()])
const selectedCountries = ref<string[]>([])
const countryOptions = ref<string[]>([])
const userKeyword = ref('')
const sortBy = ref<SortField>('avg_osmosis_rank')
const sortOrder = ref<'asc' | 'desc'>('desc')

const summary = ref<OsmosisSummary>({
  total_users: 0,
  total_records: 0,
  avg_osmosis_rank: null,
  min_record_date: null,
  max_record_date: null
})

const formatNumber = (value: number | null | undefined, digits: number = 2) => {
  if (value === null || value === undefined) return '-'
  return Number(value).toFixed(digits)
}

const formatInteger = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '-'
  return Number(value).toLocaleString()
}

const calcRank = (index: number) => (page.value - 1) * pageSize.value + index + 1
const dailyOsmosisStartDate = defaultStartDate
const trendDialogVisible = ref(false)
const trendDialogLoading = ref(false)
const trendDialogError = ref('')
const trendDialogUser = ref('')
const trendDates = ref<string[]>([])
const trendValues = ref<number[]>([])
const selectedTrendDateRange = ref<string[] | null>(null)
const isTrendCardFlipped = ref(false)
const weekDayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const pickValidNumbers = (values: Array<number | null | undefined>) =>
  values.filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value))

const parseDay = (value: string) => new Date(`${value}T00:00:00`)
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

type TrendRecord = { record_date: string; daily_osmosis_rank: number }

const trendHistory = computed<TrendRecord[]>(() => {
  const length = Math.min(trendDates.value.length, trendValues.value.length)
  const records: TrendRecord[] = []
  for (let i = 0; i < length; i += 1) {
    const recordDate = trendDates.value[i]
    const rank = trendValues.value[i]
    if (!recordDate || rank === null || rank === undefined || !Number.isFinite(rank)) continue
    records.push({
      record_date: recordDate,
      daily_osmosis_rank: Number(rank)
    })
  }
  records.sort((a, b) => a.record_date.localeCompare(b.record_date))
  return records
})

const trendBaseHistory = computed(() => {
  const start = parseDay(dailyOsmosisStartDate)
  return trendHistory.value.filter(item => parseDay(item.record_date) >= start)
})

const filteredTrendHistory = computed(() => {
  if (!trendBaseHistory.value.length || !selectedTrendDateRange.value || selectedTrendDateRange.value.length !== 2) {
    return trendBaseHistory.value
  }
  const [startDate, endDate] = selectedTrendDateRange.value
  const start = parseDay(startDate)
  const end = parseDay(endDate)
  return trendBaseHistory.value.filter(item => parseDay(item.record_date) >= start && parseDay(item.record_date) <= end)
})

const dailyOsmosisTrendData = computed(() => ({
  labels: filteredTrendHistory.value.map(item => item.record_date),
  values: filteredTrendHistory.value.map(item => item.daily_osmosis_rank)
}))

const weeklyOsmosisTrendData = computed(() => {
  const grouped = new Map<string, { weekStart: string; weekEnd: string; values: Array<number | null> }>()

  filteredTrendHistory.value.forEach(item => {
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

const dailyOsmosisTrendOption = computed<EChartsOption | null>(() => {
  if (!dailyOsmosisTrendData.value.labels.length) return null

  const validValues = pickValidNumbers(dailyOsmosisTrendData.value.values)
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
      data: dailyOsmosisTrendData.value.labels,
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
        data: dailyOsmosisTrendData.value.values,
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

const weeklyOsmosisTrendOption = computed<EChartsOption | null>(() => {
  if (!weeklyOsmosisTrendData.value.length) return null

  const validValues = pickValidNumbers(weeklyOsmosisTrendData.value.flatMap(item => item.values))
  if (!validValues.length) return null
  const colorByIndex = (index: number) =>
    `hsl(${Math.round((index * 360) / Math.max(weeklyOsmosisTrendData.value.length, 1))}, 70%, 45%)`

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
    series: weeklyOsmosisTrendData.value.map((week, index) => {
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

const toggleTrendCard = () => {
  isTrendCardFlipped.value = !isTrendCardFlipped.value
}

const summaryCards = computed(() => [
  {
    label: 'Users With Data',
    value: summary.value.total_users.toLocaleString(),
    note: 'Distinct users with non-null and non-zero osmosis rank'
  },
  {
    label: 'Valid Records',
    value: summary.value.total_records.toLocaleString(),
    note: 'Rows after excluding null and 0'
  },
  {
    label: 'Overall Average',
    value: formatNumber(summary.value.avg_osmosis_rank, 4),
    note: 'Calculated from non-null and non-zero osmosis rank'
  },
  {
    label: 'Date Coverage',
    value: summary.value.min_record_date && summary.value.max_record_date
      ? `${summary.value.min_record_date} ~ ${summary.value.max_record_date}`
      : '-',
    note: 'Filtered date span'
  }
])

const fetchRows = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await leaderboardApi.getOsmosisPage({
      startDate: selectedDateRange.value?.[0],
      endDate: selectedDateRange.value?.[1],
      countries: selectedCountries.value,
      userKeyword: userKeyword.value.trim() || undefined,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
      page: page.value,
      pageSize: pageSize.value
    })

    const data = response.data
    rows.value = data.items || []
    total.value = data.total || 0
    summary.value = data.summary || {
      total_users: 0,
      total_records: 0,
      avg_osmosis_rank: null,
      min_record_date: null,
      max_record_date: null
    }
  } catch (err) {
    console.error('Failed to fetch osmosis page data:', err)
    error.value = 'Failed to load osmosis data'
    rows.value = []
    total.value = 0
  } finally {
    loading.value = false
    firstLoading.value = false
  }
}

const fetchFilterOptions = async () => {
  filtersLoading.value = true
  try {
    const response = await leaderboardApi.getAvailableCountries()
    countryOptions.value = (response.data || []).slice().sort((a, b) => a.localeCompare(b))
  } catch (err) {
    console.error('Failed to fetch osmosis filter options:', err)
  } finally {
    filtersLoading.value = false
  }
}

const refreshAll = async () => {
  await fetchRows()
}

const applyFilters = async () => {
  page.value = 1
  await fetchRows()
}

const resetFilters = async () => {
  selectedDateRange.value = [defaultStartDate, getTodayDate()]
  selectedCountries.value = []
  userKeyword.value = ''
  sortBy.value = 'avg_osmosis_rank'
  sortOrder.value = 'desc'
  page.value = 1
  await fetchRows()
}

const handlePageChange = async (nextPage: number) => {
  page.value = nextPage
  await fetchRows()
}

const handleSizeChange = async (nextSize: number) => {
  pageSize.value = nextSize
  page.value = 1
  await fetchRows()
}

const handleSortChange = async ({ prop, order }: { prop: string; order: 'ascending' | 'descending' | null }) => {
  if (!prop || !order) return
  sortBy.value = prop as SortField
  sortOrder.value = order === 'descending' ? 'desc' : 'asc'
  page.value = 1
  await fetchRows()
}

const openUserTrendDialog = async (user: string) => {
  trendDialogVisible.value = true
  trendDialogLoading.value = true
  trendDialogError.value = ''
  trendDialogUser.value = user
  trendDates.value = []
  trendValues.value = []
  selectedTrendDateRange.value = null
  isTrendCardFlipped.value = false

  try {
    const response = await leaderboardApi.getConsultantUserDailyOsmosisTimeSeries(user)
    const dates = response.data.dates || []
    const values = response.data.daily_osmosis_ranks || []
    const length = Math.min(dates.length, values.length)
    const records: TrendRecord[] = []
    for (let i = 0; i < length; i += 1) {
      const recordDate = dates[i]
      const rank = values[i]
      if (!recordDate || rank === null || rank === undefined || !Number.isFinite(rank)) continue
      records.push({
        record_date: recordDate,
        daily_osmosis_rank: Number(rank)
      })
    }
    records.sort((a, b) => a.record_date.localeCompare(b.record_date))
    trendDates.value = records.map(item => item.record_date)
    trendValues.value = records.map(item => item.daily_osmosis_rank)

    const outerRange = selectedDateRange.value && selectedDateRange.value.length === 2
      ? [selectedDateRange.value[0], selectedDateRange.value[1]]
      : null

    if (outerRange) {
      selectedTrendDateRange.value = outerRange
    } else {
      const latestDate = records[records.length - 1]?.record_date
      if (!latestDate) return
      const latest = parseDay(latestDate)
      const fixedStart = parseDay(dailyOsmosisStartDate)
      const rangeStart = latest < fixedStart ? records[0]?.record_date || latestDate : dailyOsmosisStartDate
      selectedTrendDateRange.value = [rangeStart, latestDate]
    }
  } catch (err) {
    console.error('Failed to fetch daily osmosis trend:', err)
    trendDialogError.value = 'Failed to load daily osmosis trend'
  } finally {
    trendDialogLoading.value = false
  }
}

const handleTrendDialogClosed = () => {
  trendDialogUser.value = ''
  trendDates.value = []
  trendValues.value = []
  trendDialogError.value = ''
  selectedTrendDateRange.value = null
  isTrendCardFlipped.value = false
}

onMounted(async () => {
  await fetchFilterOptions()
  await refreshAll()
})
</script>

<template>
  <div class="osmosis-page">
    <header class="dashboard-header">
      <div>
        <h1 class="dashboard-title">Osmosis Rank Dashboard</h1>
        <p class="dashboard-subtitle">User-level osmosis rank statistics from `leaderboard_consultant_user`</p>
      </div>
      <el-button type="primary" class="primary-pill" :loading="loading" @click="refreshAll">Refresh</el-button>
    </header>

    <el-card class="filters-panel" shadow="never">
      <el-form class="filter-form" label-position="top">
        <el-form-item label="Date Range">
          <el-date-picker
            v-model="selectedDateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            format="YYYY-MM-DD"
            start-placeholder="Start date"
            end-placeholder="End date"
            unlink-panels
            clearable
          />
        </el-form-item>
        <el-form-item label="Country/Region">
          <el-select
            v-model="selectedCountries"
            multiple
            collapse-tags
            collapse-tags-tooltip
            clearable
            filterable
            :loading="filtersLoading"
            placeholder="Select country/region"
          >
            <el-option v-for="item in countryOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="User Search">
          <el-input v-model="userKeyword" clearable placeholder="Enter WQ_ID keyword" @keyup.enter="applyFilters" />
        </el-form-item>
        <el-form-item class="form-actions">
          <el-button type="primary" class="primary-pill action-pill" @click="applyFilters">Apply</el-button>
          <el-button class="light-pill action-pill" @click="resetFilters">Reset</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <section class="summary-grid">
      <template v-if="firstLoading">
        <article v-for="i in 4" :key="`summary-skeleton-${i}`" class="summary-card">
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

    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="section-header">
          <span class="section-title">Osmosis User Summary</span>
          <span class="section-meta">Total {{ total }}</span>
        </div>
      </template>

      <p v-if="error && !loading" class="table-error">{{ error }}</p>
      <div v-if="firstLoading" class="section-skeleton">
        <el-skeleton :rows="12" animated />
      </div>
      <el-table
        v-else
        v-loading="loading"
        :data="rows"
        stripe
        style="width: 100%"
        :default-sort="{ prop: sortBy, order: sortOrder === 'desc' ? 'descending' : 'ascending' }"
        @sort-change="handleSortChange"
      >
        <el-table-column label="No." width="70" align="center">
          <template #default="{ $index }">{{ calcRank($index) }}</template>
        </el-table-column>
        <el-table-column prop="user" label="User" min-width="140" sortable="custom">
          <template #default="{ row }">
            <span class="user-link" @click="openUserTrendDialog(row.user)">{{ row.user }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="country" label="Country/Region" min-width="140" sortable="custom">
          <template #default="{ row }">{{ row.country || '-' }}</template>
        </el-table-column>
        <el-table-column prop="avg_osmosis_rank" label="Average Osmosis Rank" min-width="180" align="right" sortable="custom">
          <template #default="{ row }">{{ formatNumber(row.avg_osmosis_rank, 2) }}</template>
        </el-table-column>
        <el-table-column prop="days_with_data" label="Days With Data" min-width="140" align="right" sortable="custom">
          <template #default="{ row }">{{ formatInteger(row.days_with_data) }}</template>
        </el-table-column>
        <el-table-column prop="above_avg_days" label="Above Avg Days" min-width="140" align="right" sortable="custom">
          <template #default="{ row }">{{ formatInteger(row.above_avg_days) }}</template>
        </el-table-column>
        <el-table-column prop="below_avg_days" label="Below Avg Days" min-width="140" align="right" sortable="custom">
          <template #default="{ row }">{{ formatInteger(row.below_avg_days) }}</template>
        </el-table-column>
        <el-table-column prop="max_osmosis_rank" label="Max Osmosis Rank" min-width="160" align="right" sortable="custom">
          <template #default="{ row }">{{ formatNumber(row.max_osmosis_rank, 2) }}</template>
        </el-table-column>
        <el-table-column prop="min_osmosis_rank" label="Min Osmosis Rank" min-width="160" align="right" sortable="custom">
          <template #default="{ row }">{{ formatNumber(row.min_osmosis_rank, 2) }}</template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper" v-if="total > 0">
        <el-pagination
          :current-page="page"
          :page-size="pageSize"
          :total="total"
          :page-sizes="[20, 50, 100, 200]"
          layout="total, sizes, prev, pager, next"
          background
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="trendDialogVisible"
      :title="`${trendDialogUser} - Daily Osmosis Rank Trend`"
      class="trend-dialog"
      width="980px"
      top="6vh"
      destroy-on-close
      @closed="handleTrendDialogClosed"
    >
      <div v-if="trendDialogLoading" class="section-skeleton">
        <el-skeleton :rows="6" animated />
      </div>
      <p v-else-if="trendDialogError" class="table-error">{{ trendDialogError }}</p>
      <div v-else class="trend-dialog-content">
        <div class="dialog-chart-actions">
          <el-date-picker
            v-model="selectedTrendDateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            format="YYYY-MM-DD"
            start-placeholder="Start date"
            end-placeholder="End date"
            class="date-range-picker dialog-date-picker"
            unlink-panels
          />
          <el-button class="flip-toggle-btn" text @click="toggleTrendCard">
            {{ isTrendCardFlipped ? 'Switch to Daily' : 'Switch to Weekly' }}
          </el-button>
        </div>
        <div class="osmosis-flip-wrapper dialog-flip-wrapper">
          <div class="osmosis-flip-inner" :class="{ 'is-flipped': isTrendCardFlipped }">
            <div class="osmosis-face osmosis-face-front">
              <v-chart v-if="dailyOsmosisTrendOption" :option="dailyOsmosisTrendOption" :autoresize="true" class="trend-chart osmosis-chart" />
              <el-empty v-else description="No Daily Osmosis Rank data" />
            </div>
            <div class="osmosis-face osmosis-face-back">
              <v-chart v-if="weeklyOsmosisTrendOption" :option="weeklyOsmosisTrendOption" :autoresize="true" class="trend-chart osmosis-chart" />
              <el-empty v-else description="No weekly data" />
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.osmosis-page {
  max-width: 1400px;
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
  margin-bottom: 1rem;
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
  background: var(--ink);
  border-color: var(--ink);
  color: var(--bg);
}

.primary-pill:hover {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.filters-panel,
.table-card,
.summary-card {
  background: var(--card);
  border: 1px solid var(--stroke);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.filters-panel {
  margin-bottom: 1.2rem;
  background: linear-gradient(135deg, rgba(213, 106, 58, 0.08), rgba(31, 111, 120, 0.06));
}

.filter-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
  align-items: end;
}

.form-actions {
  display: flex;
  align-items: flex-end;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.action-pill {
  min-width: 110px;
}

.light-pill {
  border: 1px solid var(--stroke);
  color: var(--ink-soft);
  border-radius: 999px;
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
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 1.2rem;
}

.summary-card {
  padding: 1rem 1.1rem;
}

.card-label {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.7rem;
  color: var(--ink-soft);
}

.card-value {
  margin-top: 0.4rem;
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 1.35rem;
}

.card-note {
  margin-top: 0.4rem;
  font-size: 0.82rem;
  color: var(--ink-soft);
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

.section-skeleton {
  padding: 1rem;
}

.table-error {
  color: #a6322a;
  margin-bottom: 0.6rem;
  font-size: 0.9rem;
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
  letter-spacing: 0.02em;
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--ink-soft);
}

.user-link {
  color: var(--accent);
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.trend-chart {
  width: 100%;
  min-height: 380px;
}

.trend-dialog :deep(.el-dialog__body) {
  padding-top: 0.8rem;
}

.trend-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.dialog-chart-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.dialog-date-picker {
  width: 320px;
  max-width: 100%;
}

.date-range-picker :deep(.el-input__wrapper) {
  min-height: 34px;
  border-radius: 10px;
}

.flip-toggle-btn {
  color: var(--accent);
  font-weight: 600;
}

.dialog-flip-wrapper {
  min-height: 380px;
}

.osmosis-flip-wrapper {
  perspective: 1800px;
  overflow: hidden;
}

.osmosis-flip-inner {
  position: relative;
  min-height: 380px;
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
  height: 380px;
  min-height: 380px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding-top: 1rem;
}

@media (max-width: 960px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .dialog-chart-actions {
    justify-content: flex-start;
  }

  .dialog-date-picker {
    width: 100%;
  }
}
</style>
