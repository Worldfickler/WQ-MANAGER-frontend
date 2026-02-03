<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
  ToolboxComponent
} from 'echarts/components'
import { leaderboardApi } from '@/api/leaderboard'
import type { CountrySubmissionTimeSeries } from '@/types/leaderboard'
import { getCountryName } from '@/utils/country'

// Register ECharts components
use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
  ToolboxComponent
])

const loading = ref(false)
const error = ref<string | null>(null)
const consultantData = ref<CountrySubmissionTimeSeries[]>([])
const availableCountries = ref<string[]>([])
const selectedCountries = ref<string[]>(['CN']) // 默认选择中国

// 季度类型
interface Quarter {
  year: number
  quarter: number
  label: string
}

// 显示控制
const showRA = ref(true)
const showSA = ref(true)

// 获取当前季度
function getCurrentQuarter(): Quarter {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const quarter = Math.ceil(month / 3)
  return {
    year,
    quarter,
    label: `${year}-Q${quarter}`
  }
}

const quarterList = computed<Quarter[]>(() => {
  const quarters: Quarter[] = []
  const minYear = 2025
  const minQuarter = 4
  const current = getCurrentQuarter()
  let year = current.year
  let quarter = current.quarter

  while (year > minYear || (year === minYear && quarter >= minQuarter)) {
    quarters.push({
      year,
      quarter,
      label: `${year}-Q${quarter}`
    })
    quarter -= 1
    if (quarter <= 0) {
      quarter = 4
      year -= 1
    }
  }

  return quarters
})

const selectedQuarterLabel = ref<string>(getCurrentQuarter().label)

const selectedQuarter = computed(() => {
  return quarterList.value.find(q => q.label === selectedQuarterLabel.value) || getCurrentQuarter()
})

function getQuarterDateRange(quarter: Quarter): { startDate: string; endDate: string } {
  const startMonth = (quarter.quarter - 1) * 3 + 1
  const endMonth = startMonth + 2

  const startDate = new Date(quarter.year, startMonth - 1, 1)
  const endDate = new Date(quarter.year, endMonth - 1, new Date(quarter.year, endMonth, 0).getDate())

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  }
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const fetchData = async () => {
  loading.value = true
  error.value = null
  try {
    const { startDate, endDate } = getQuarterDateRange(selectedQuarter.value)
    const response = await leaderboardApi.getCountrySubmissionTimeSeries(undefined, 30, startDate, endDate)
    consultantData.value = response.data

    const countriesResponse = await leaderboardApi.getAvailableCountries()
    availableCountries.value = countriesResponse.data.sort()

    if (availableCountries.value.length > 0) {
      const filtered = selectedCountries.value.filter(c => availableCountries.value.includes(c))
      selectedCountries.value = filtered.length > 0 ? filtered : [availableCountries.value[0]]
    }
  } catch (err) {
    error.value = '获取数据失败'
    console.error(err)
  } finally {
    loading.value = false
  }
}

// 计算总提交数用于排序
const getConsultantTotalSubmissions = (country: string) => {
  const countryData = consultantData.value.find(c => c.country === country)
  if (!countryData) return 0
  return countryData.submissions_count.reduce((sum, count) => sum + count, 0)
}

const sortedAvailableCountries = computed(() => {
  return [...availableCountries.value].sort((a, b) => {
    return getConsultantTotalSubmissions(b) - getConsultantTotalSubmissions(a)
  })
})

const isCountrySelected = (country: string) => {
  return selectedCountries.value.includes(country)
}

const toggleCountry = (country: string) => {
  const index = selectedCountries.value.indexOf(country)
  if (index > -1) {
    if (selectedCountries.value.length > 1) {
      selectedCountries.value.splice(index, 1)
    }
  } else {
    selectedCountries.value.push(country)
  }
}

const formatCountryLabel = (code: string) => {
  return `${code} ${getCountryName(code)}`
}

// 图表配置
const chartOption = computed(() => {
  const filteredData = consultantData.value.filter(country =>
    selectedCountries.value.includes(country.country)
  )

  if (filteredData.length === 0) {
    return null
  }

  const allDatesSet = new Set<string>()
  filteredData.forEach(country => {
    country.dates.forEach(date => allDatesSet.add(date))
  })
  const sortedDates = Array.from(allDatesSet).sort()
  if (sortedDates.length === 0) {
    return null
  }

  const series: any[] = []
  const allValues: number[] = []

  filteredData.forEach((country, countryIndex) => {
    const dateChangeMap = new Map<string, { ra_change: number; sa_change: number }>()
    country.dates.forEach((date, i) => {
      dateChangeMap.set(date, {
        ra_change: country.submissions_change[i] ?? 0,
        sa_change: country.super_alpha_submissions_change[i] ?? 0
      })
    })

    const raChangeData = sortedDates.map(date => {
      const value = dateChangeMap.get(date)
      return value ? value.ra_change : 0
    })

    const saChangeData = sortedDates.map(date => {
      const value = dateChangeMap.get(date)
      return value ? value.sa_change : 0
    })

    if (showRA.value) {
      series.push({
        name: `${formatCountryLabel(country.country)} RA变化`,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: raChangeData,
        emphasis: {
          focus: 'series'
        },
        itemStyle: {
          color: `hsl(${countryIndex * 60}, 70%, 50%)`
        }
      })
      allValues.push(...raChangeData)
    }

    if (showSA.value) {
      series.push({
        name: `${formatCountryLabel(country.country)} SA变化`,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: saChangeData,
        emphasis: {
          focus: 'series'
        },
        itemStyle: {
          color: `hsl(${countryIndex * 60 + 180}, 70%, 50%)`
        }
      })
      allValues.push(...saChangeData)
    }
  })

  if (series.length === 0) {
    return null
  }

  let yMin = -10
  let yMax = 10
  if (allValues.length > 0) {
    const dataMin = Math.min(...allValues)
    const dataMax = Math.max(...allValues)
    yMin = Math.min(dataMin, -5)
    yMax = Math.max(dataMax, 5)
    if (yMin > 0) yMin = -5
    if (yMax < 0) yMax = 5
  }

  return {
    title: {
      text: `Consultant-Alpha 提交数量变化趋势（${selectedQuarter.value.label}）`,
      left: 'center',
      textStyle: {
        fontSize: 18,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985'
        }
      },
      formatter: (params: any) => {
        let result = `<div style="font-weight: bold; margin-bottom: 5px;">${params[0].axisValue}</div>`
        const countryGroups: Record<string, any[]> = {}
        params.forEach((param: any) => {
          const countryCode = param.seriesName.split(' ')[0]
          if (!countryGroups[countryCode]) {
            countryGroups[countryCode] = []
          }
          countryGroups[countryCode].push(param)
        })

        Object.keys(countryGroups).forEach(country => {
          const items = countryGroups[country]
          result += `<div style="margin: 5px 0; padding: 5px; background: rgba(0,0,0,0.05); border-radius: 4px;">`
          result += `<div style="font-weight: bold; margin-bottom: 3px;">${formatCountryLabel(country)}</div>`
          items.forEach((item: any) => {
            const changeType = item.seriesName.includes('RA') ? 'RA' : 'SA'
            const value = item.value
            const color = value >= 0 ? '#10b981' : '#ef4444'
            const arrow = value >= 0 ? '↑' : '↓'
            result += `
              <div style="display: flex; align-items: center; margin: 3px 0;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 2px; background-color: ${item.color}; margin-right: 5px;"></span>
                <span style="flex: 1;">${changeType}变化:</span>
                <span style="font-weight: bold; margin-left: 10px; color: ${color};">${arrow} ${Math.abs(value)}</span>
              </div>
            `
          })
          result += `</div>`
        })
        return result
      }
    },
    legend: {
      data: series.map(s => s.name),
      top: 35,
      type: 'scroll'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '80px',
      containLabel: true
    },
    toolbox: {
      feature: {
        saveAsImage: {
          title: '保存为图片'
        },
        dataZoom: {
          yAxisIndex: 'none',
          title: {
            zoom: '区域缩放',
            back: '还原'
          }
        },
        restore: {
          title: '还原'
        }
      }
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: sortedDates,
      axisLabel: {
        rotate: 45,
        formatter: (value: string) => {
          return value.substring(5)
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '变化量',
      min: yMin,
      max: yMax,
      axisLabel: {
        formatter: (value: number) => {
          return value.toString()
        }
      }
    },
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100
      },
      {
        start: 0,
        end: 100
      }
    ],
    series: series
  }
})

watch(selectedQuarterLabel, () => {
  fetchData()
})

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="consultant-trend-chart">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>加载数据中...</p>
    </div>
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="fetchData" class="retry-btn">重试</button>
    </div>
    <div v-else-if="consultantData.length === 0" class="empty">暂无数据</div>
    <div v-else class="chart-wrapper">
      <!-- 显示项目 -->
      <div class="controls-section">
        <span class="control-label">选择季度：</span>
        <el-select v-model="selectedQuarterLabel" size="default" style="width: 200px">
          <el-option
            v-for="quarter in quarterList"
            :key="quarter.label"
            :label="quarter.label"
            :value="quarter.label"
          />
        </el-select>
        <span class="control-divider"></span>
        <span class="control-label">显示项：</span>
        <el-checkbox v-model="showRA" size="default" border>RA提交</el-checkbox>
        <el-checkbox v-model="showSA" size="default" border>SA提交</el-checkbox>
      </div>

      <!-- 国家选择 -->
      <div class="country-selector">
        <div class="selector-header">
          <span class="selector-title">选择国家/地区</span>
          <span class="selector-hint">点击标签切换（至少选择一项）</span>
        </div>
        <div class="country-tags">
          <button
            v-for="country in sortedAvailableCountries"
            :key="country"
            :class="['country-tag', { active: isCountrySelected(country) }]"
            @click="toggleCountry(country)"
          >
            <span class="country-code">{{ country }}</span>
            <span class="country-name">{{ getCountryName(country) }}</span>
          </button>
        </div>
      </div>

      <!-- 图表 -->
      <div class="chart-container">
        <v-chart
          v-if="chartOption"
          :option="chartOption"
          :autoresize="true"
          class="chart"
        />
      </div>
    </div>
  </div>
</template>


<style scoped>
.consultant-trend-chart {
  width: 100%;
  background: var(--card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--stroke);
  padding: 1.5rem;
  box-shadow: var(--shadow-md);
}

.loading,
.empty {
  text-align: center;
  padding: 3rem;
  color: var(--ink-soft);
}

.spinner {
  border: 4px solid rgba(27, 25, 22, 0.2);
  border-top: 4px solid var(--accent);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error {
  text-align: center;
  padding: 2rem;
  color: #8a1f1f;
  background-color: rgba(186, 32, 32, 0.1);
  border-radius: var(--radius-md);
  border: 1px solid rgba(186, 32, 32, 0.3);
}

.retry-btn {
  margin-top: 1rem;
  padding: 0.55rem 1.2rem;
  background-color: var(--ink);
  color: var(--bg);
  border: none;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.retry-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(18, 14, 10, 0.2);
}

.chart-wrapper {
  background-color: #fff;
  border-radius: var(--radius-md);
  padding: 1.2rem;
  border: 1px solid var(--stroke);
}

.controls-section {
  margin-bottom: 1.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
}

.control-divider {
  width: 1px;
  height: 24px;
  background: rgba(27, 25, 22, 0.12);
  display: inline-block;
}

.control-label,
.selector-title {
  font-weight: 700;
  color: var(--ink);
  font-size: 0.95rem;
}

.selector-hint {
  font-size: 0.85rem;
  color: var(--ink-soft);
}

.country-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.country-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.9rem;
  border: 1px solid var(--stroke);
  border-radius: 999px;
  background-color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.85rem;
}

.country-tag:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(213, 106, 58, 0.15);
}

.country-tag.active {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--bg);
}

.country-code {
  font-weight: 700;
  font-family: 'Bricolage Grotesque', sans-serif;
}

.country-name {
  color: var(--ink-soft);
  font-size: 0.8rem;
}

.country-tag.active .country-name,
.country-tag.active .country-code {
  color: inherit;
}

.chart-container {
  width: 100%;
  height: 500px;
  background-color: #fafafa;
  border-radius: var(--radius-md);
  padding: 1rem;
}

.chart {
  width: 100%;
  height: 100%;
}

@media (max-width: 768px) {
  .consultant-trend-chart {
    padding: 1rem;
  }

  .chart-container {
    height: 400px;
  }

  .selector-header,
  .controls-section {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
