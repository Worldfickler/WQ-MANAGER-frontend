<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

interface ChartData {
  dates: string[]
  weights: number[]
}

interface Props {
  data: ChartData
}

const props = defineProps<Props>()

const chartRef = ref<HTMLElement>()
let chartInstance: echarts.ECharts | null = null

const computeYAxisRange = (values: number[]) => {
  if (!values || values.length === 0) {
    return { min: 0, max: 1 }
  }
  const dataMin = Math.min(...values)
  const dataMax = Math.max(...values)
  const range = dataMax - dataMin
  const margin = Math.max(range * 0.12, Math.abs(dataMax) * 0.02, 1)
  let min = dataMin - margin
  let max = dataMax + margin
  if (range === 0) {
    const offset = Math.max(Math.abs(dataMax) * 0.05, 1)
    min = dataMin - offset
    max = dataMax + offset
  }
  return { min, max }
}

const initChart = () => {
  if (!chartRef.value) {
    console.log('chartRef is not ready')
    return
  }

  console.log('Initializing chart with data:', props.data)

  // 销毁已有实例
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }

  // 创建新实例
  chartInstance = echarts.init(chartRef.value)

  const { min, max } = computeYAxisRange(props.data.weights)

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const param = params[0]
        return `日期: ${param.axisValue}<br/>权重: ${param.value.toFixed(2)}`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: props.data.dates,
      boundaryGap: false,
      axisLabel: {
        rotate: 45,
        formatter: (value: string) => {
          // 只显示月-日
          return value.substring(5)
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '权重因子',
      min,
      max,
      scale: true,
      axisLabel: {
        formatter: (value: number) => value.toFixed(2)
      }
    },
    series: [
      {
        name: '权重',
        type: 'line',
        smooth: true,
        data: props.data.weights,
        itemStyle: {
          color: '#d56a3a'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(213, 106, 58, 0.3)' },
            { offset: 1, color: 'rgba(213, 106, 58, 0.05)' }
          ])
        },
        emphasis: {
          focus: 'series'
        },
        markLine: {
          data: [
            { type: 'average', name: '平均值' }
          ]
        }
      }
    ]
  }

  chartInstance.setOption(option)
  console.log('Chart initialized successfully')
}

const updateChart = () => {
  if (!chartInstance) {
    console.log('Chart instance not found, reinitializing...')
    initChart()
    return
  }

  console.log('Updating chart with data:', props.data)

  const { min, max } = computeYAxisRange(props.data.weights)

  chartInstance.setOption({
    xAxis: {
      data: props.data.dates
    },
    yAxis: {
      min,
      max,
      scale: true
    },
    series: [
      {
        data: props.data.weights
      }
    ]
  })
}

onMounted(() => {
  nextTick(() => {
    initChart()
  })
})

// 监听数据变化
watch(() => props.data, (newData) => {
  console.log('Data changed:', newData)
  if (newData.dates.length > 0 && newData.weights.length > 0) {
    nextTick(() => {
      updateChart()
    })
  }
}, { deep: true, immediate: true })
</script>

<template>
  <div ref="chartRef" class="weight-trend-chart"></div>
</template>

<style scoped>
.weight-trend-chart {
  width: 100%;
  height: 100%;
  min-height: 400px;
}
</style>
