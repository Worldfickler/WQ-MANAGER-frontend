<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
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
import { getCountryName } from '@/utils/country'
import type { CountryWeightTimeSeries } from '@/types/leaderboard'

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
const allCountriesData = ref<CountryWeightTimeSeries[]>([])
const availableCountries = ref<string[]>([])
const selectedCountries = ref<string[]>(['CN']) // 默认选择中国
const showTotal = ref<boolean>(false) // 是否显示总和

const fetchData = async () => {
  loading.value = true
  error.value = null
  try {
    const response = await leaderboardApi.getCountryWeightTimeSeries(undefined, 30)
    allCountriesData.value = response.data

    const countriesResponse = await leaderboardApi.getAvailableCountries()
    availableCountries.value = countriesResponse.data.sort()

    if (availableCountries.value.length > 0) {
      const filtered = selectedCountries.value.filter(c => availableCountries.value.includes(c))
      if (filtered.length > 0) {
        selectedCountries.value = filtered
      } else if (!showTotal.value) {
        selectedCountries.value = [availableCountries.value[0]]
      } else {
        selectedCountries.value = []
      }
    }
  } catch (err) {
    error.value = '获取数据失败'
    console.error(err)
  } finally {
    loading.value = false
  }
}

const chartOption = computed(() => {
  const filteredData = allCountriesData.value.filter(country =>
    selectedCountries.value.includes(country.country)
  )

  if (filteredData.length === 0 && !showTotal.value) {
    return null
  }

  const allDatesSet = new Set<string>()
  allCountriesData.value.forEach(country => {
    country.dates.forEach(date => allDatesSet.add(date))
  })
  const sortedDates = Array.from(allDatesSet).sort()

  if (sortedDates.length === 0) {
    return null
  }

  const totalWeightsByDate = new Map<string, number>()
  sortedDates.forEach(date => {
    totalWeightsByDate.set(date, 0)
  })

  allCountriesData.value.forEach(country => {
    country.dates.forEach((date, i) => {
      const currentTotal = totalWeightsByDate.get(date) || 0
      totalWeightsByDate.set(date, currentTotal + (country.weights[i] || 0))
    })
  })

  const totalWeights = sortedDates.map(date => totalWeightsByDate.get(date) || 0)

  const series: any[] = []
  const allValues: number[] = []

  if (showTotal.value) {
    allValues.push(...totalWeights)
    series.push({
      name: '全部总和',
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      lineStyle: {
        width: 4,
        color: '#000'
      },
      itemStyle: {
        color: '#000'
      },
      emphasis: {
        focus: 'series'
      },
      data: totalWeights
    })
  }

  filteredData.forEach(country => {
    const dateWeightMap = new Map<string, number>()
    country.dates.forEach((date, i) => {
      dateWeightMap.set(date, country.weights[i])
    })

    const data = sortedDates.map(date => {
      const weight = dateWeightMap.get(date)
      if (weight !== undefined && weight !== null) {
        allValues.push(weight)
        return weight
      }
      return null
    })

    series.push({
      name: getCountryName(country.country),
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      lineStyle: {
        width: 3
      },
      emphasis: {
        focus: 'series'
      },
      data: data
    })
  })

  if (series.length === 0) {
    return null
  }

  let yMin = 0
  let yMax = 100

  if (allValues.length > 0) {
    const dataMin = Math.min(...allValues)
    const dataMax = Math.max(...allValues)
    const range = dataMax - dataMin
    const margin = Math.max(range * 0.15, 1)

    if (range < 0.0001) {
      const center = dataMax
      const expandedRange = Math.max(center * 0.1, 1)
      yMin = Math.max(0, center - expandedRange / 2)
      yMax = center + expandedRange / 2
    } else {
      yMin = Math.max(0, dataMin - margin)
      yMax = dataMax + margin
    }
  }

  return {
    title: {
      text: '国家/地区 Weight 变化趋势',
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
        params.forEach((param: any) => {
          if (param.value !== null) {
            result += `
              <div style="display: flex; align-items: center; margin: 3px 0;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${param.color}; margin-right: 5px;"></span>
                <span style="flex: 1;">${param.seriesName}:</span>
                <span style="font-weight: bold; margin-left: 10px;">${param.value.toFixed(2)}</span>
              </div>
            `
          }
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
      name: 'Weight Factor',
      min: yMin,
      max: yMax,
      axisLabel: {
        formatter: (value: number) => {
          if (Number.isInteger(value)) {
            return value.toString()
          }
          return value.toFixed(2)
        }
      },
      scale: true
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

const toggleCountry = (country: string) => {
  const index = selectedCountries.value.indexOf(country)
  if (index > -1) {
    if (selectedCountries.value.length > 1 || showTotal.value) {
      selectedCountries.value.splice(index, 1)
    }
  } else {
    selectedCountries.value.push(country)
  }
}

const toggleTotal = () => {
  showTotal.value = !showTotal.value
  if (showTotal.value) {
    selectedCountries.value = []
  } else if (selectedCountries.value.length === 0 && availableCountries.value.length > 0) {
    selectedCountries.value = [availableCountries.value[0]]
  }
}

const isCountrySelected = (country: string) => {
  return selectedCountries.value.includes(country)
}

// 获取国家的权重和用于排序
const getCountryTotalWeight = (country: string) => {
  const countryData = allCountriesData.value.find(c => c.country === country)
  if (!countryData) return 0
  return countryData.weights.reduce((sum, w) => sum + w, 0)
}

const sortedAvailableCountries = computed(() => {
  return [...availableCountries.value].sort((a, b) => {
    return getCountryTotalWeight(b) - getCountryTotalWeight(a)
  })
})

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="country-weight-chart">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>加载数据中...</p>
    </div>
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="fetchData" class="retry-btn">重试</button>
    </div>
    <div v-else-if="allCountriesData.length === 0" class="empty">暂无数据</div>
    <div v-else class="chart-wrapper">
      <!-- 国家选择 -->
      <div class="country-selector">
        <div class="selector-header">
          <span class="selector-title">选择国家/地区</span>
          <span class="selector-hint">点击标签切换（至少选择一项）</span>
        </div>
        <div class="country-tags">
          <!-- 全部总和标签 -->
          <button
            :class="['country-tag', 'total-tag', { active: showTotal }]"
            @click="toggleTotal"
          >
            <span class="country-code">ALL</span>
            <span class="country-name">全部总和</span>
          </button>
          <!-- 国家标签 -->
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
.country-weight-chart {
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
  .country-weight-chart {
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
