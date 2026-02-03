<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Histogram } from '@element-plus/icons-vue'
import { dashboardApi } from '@/api/dashboard'
import { leaderboardApi } from '@/api/leaderboard'
import { getCountryFlagPath } from '@/utils/flags'
import type {
  CountryRankingData,
  CountryHistoryData,
  UniversityRankingData,
  UserWeightRankingData,
  UserWeightChangeRankingData,
  UserSubmissionsRankingData,
  UserCorrelationRankingData
} from '@/types/dashboard'

// Tab管理
type TabType = 'country' | 'university' | 'weight' | 'change' | 'submissions' | 'correlation'
const activeTab = ref<TabType>('country')

const tabs = [
  { id: 'country', label: '国家排名', icon: '🌍' },
  { id: 'university', label: '大学排名', icon: '🎓' },
  { id: 'weight', label: '权重排名', icon: '⚖️' },
  { id: 'change', label: '变化排名', icon: '📈' },
  { id: 'submissions', label: '提交排名', icon: '📝' },
  { id: 'correlation', label: '相关性排名', icon: '🧭' }
]

// 筛选器
const timeMode = ref<'daily' | 'quarter'>('daily')
// 初始化为当前季度的第一天
const getCurrentQuarterStart = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const quarter = Math.floor(month / 3)
  return new Date(year, quarter * 3, 1)
}
const selectedQuarter = ref<Date | null>(getCurrentQuarterStart()) // 选中的季度，默认当前季度
const selectedCountry = ref<string | undefined>(undefined)
const changeOrder = ref<'desc' | 'asc'>('desc')
const correlationType = ref<'prod' | 'self'>('prod')

const formatQuarterToString = (date: Date | null): string => {
  if (!date) return ''
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const quarter = Math.ceil(month / 3)
  return `${year}-Q${quarter}`
}

const pageSize = ref(50)
const currentPage = ref(1)
const totalPages = ref(0)
const totalRecords = ref(0)
const loading = ref(false)

const countryData = ref<CountryRankingData[]>([])
const universityData = ref<UniversityRankingData[]>([])
const weightData = ref<UserWeightRankingData[]>([])
const changeData = ref<UserWeightChangeRankingData[]>([])
const submissionsData = ref<UserSubmissionsRankingData[]>([])
const correlationData = ref<UserCorrelationRankingData[]>([])
const availableCountries = ref<string[]>([])

const drawerVisible = ref(false)
const drawerLoading = ref(false)
const selectedCountryCode = ref<string>('')
const countryHistoryData = ref<CountryHistoryData[]>([])

const historyPageSize = ref(20)
const historyCurrentPage = ref(1)
const historyTotalPages = ref(0)
const historyTotalRecords = ref(0)

// 获取排名标签类型
const getRankType = (index: number) => {
  const rank = (currentPage.value - 1) * pageSize.value + index + 1
  if (rank === 1) return 'danger'
  if (rank === 2) return 'warning'
  if (rank === 3) return 'success'
  return 'info'
}

// 获取可用国家列表
const fetchAvailableCountries = async () => {
  try {
    const response = await leaderboardApi.getAvailableCountries()
    availableCountries.value = response.data
  } catch (error) {
    console.error('获取国家列表失败:', error)
  }
}

// 获取数据
const fetchData = async () => {
  loading.value = true
  try {
    // 根据时间模式决定传的参数
    const quarterParam = timeMode.value === 'quarter' ? formatQuarterToString(selectedQuarter.value) : ''

    switch (activeTab.value) {
      case 'country':
        const countryRes = await dashboardApi.getCountryRankings(currentPage.value, pageSize.value, quarterParam)
        countryData.value = countryRes.data.data
        totalPages.value = countryRes.data.total_pages
        totalRecords.value = countryRes.data.total
        break
      case 'university':
        const uniRes = await dashboardApi.getUniversityRankings(currentPage.value, pageSize.value, quarterParam)
        universityData.value = uniRes.data.data
        totalPages.value = uniRes.data.total_pages
        totalRecords.value = uniRes.data.total
        break
      case 'weight':
        const weightRes = await dashboardApi.getTopUsersByWeight(currentPage.value, pageSize.value, selectedCountry.value)
        weightData.value = weightRes.data.data
        totalPages.value = weightRes.data.total_pages
        totalRecords.value = weightRes.data.total
        break
      case 'change':
        const changeRes = await dashboardApi.getTopUsersByWeightChange(
          currentPage.value,
          pageSize.value,
          quarterParam,
          changeOrder.value,
          selectedCountry.value
        )
        changeData.value = changeRes.data.data
        totalPages.value = changeRes.data.total_pages
        totalRecords.value = changeRes.data.total
        break
      case 'submissions':
        const subRes = await dashboardApi.getTopUsersBySubmissions(currentPage.value, pageSize.value, selectedCountry.value)
        submissionsData.value = subRes.data.data
        totalPages.value = subRes.data.total_pages
        totalRecords.value = subRes.data.total
        break
      case 'correlation':
        const corrRes = await dashboardApi.getTopUsersByCorrelation(
          currentPage.value,
          pageSize.value,
          correlationType.value,
          selectedCountry.value
        )
        correlationData.value = corrRes.data.data
        totalPages.value = corrRes.data.total_pages
        totalRecords.value = corrRes.data.total
        break
    }
  } catch (error) {
    console.error('获取数据失败:', error)
  } finally {
    loading.value = false
  }
}

// Tab切换
const handleTabChange = (tabId: TabType) => {
  activeTab.value = tabId
  currentPage.value = 1
}

// 分页控制
const handlePageChange = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    fetchData()
  }
}

// 每页显示数量变化
const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  fetchData()
}

// 筛器变化
watch([timeMode, selectedQuarter, selectedCountry, changeOrder, correlationType], () => {
  currentPage.value = 1
})

// 打开国家历史数据抽屉
const openCountryHistory = async (countryCode: string) => {
  selectedCountryCode.value = countryCode
  drawerVisible.value = true
  historyCurrentPage.value = 1
}

// 获取国家历史数据
const fetchCountryHistory = async () => {
  drawerLoading.value = true

  try {
    const response = await dashboardApi.getCountryHistory(
      selectedCountryCode.value,
      historyCurrentPage.value,
      historyPageSize.value
    )
    countryHistoryData.value = response.data.data
    historyTotalPages.value = response.data.total_pages
    historyTotalRecords.value = response.data.total
  } catch (error) {
    console.error('获取国家历史数据失败:', error)
  } finally {
    drawerLoading.value = false
  }
}

// 历史数据分页控制
const handleHistoryPageChange = (page: number) => {
  if (page >= 1 && page <= historyTotalPages.value) {
    historyCurrentPage.value = page
    fetchCountryHistory()
  }
}

// 组件挂载
onMounted(() => {
  fetchAvailableCountries()
  fetchData()
})
</script>

<template>
  <div class="dashboard-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">📊 数据看板</h1>
      </div>
    </div>

    <!-- Tab切换 -->
    <div class="tabs-container">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab-btn', { active: activeTab === tab.id }]"
        @click="handleTabChange(tab.id as TabType)"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- 筛器 -->
    <div class="filters-container">
      <div v-if="['country', 'university', 'change'].includes(activeTab)" class="filter-group">
        <el-radio-group v-model="timeMode" size="default">
          <el-radio-button value="daily">按日</el-radio-button>
          <el-radio-button value="quarter">按季度</el-radio-button>
        </el-radio-group>
        <el-date-picker
          v-if="timeMode === 'quarter'"
          v-model="selectedQuarter"
          type="quarter"
          placeholder="选择季度"
          format="YYYY年第Q季度"
          value-format="YYYY-MM-DD"
          :clearable="false"
          size="default"
          style="margin-left: 12px"
        />
      </div>

      <div v-if="['weight', 'change', 'submissions', 'correlation'].includes(activeTab)" class="filter-group">
        <el-select v-model="selectedCountry" placeholder="全部国家" clearable style="width: 200px">
          <el-option
            v-for="country in availableCountries"
            :key="country"
            :label="country"
            :value="country"
          />
        </el-select>
      </div>

      <!-- 变化方向 (变化排名) -->
      <div v-if="activeTab === 'change'" class="filter-group">
        <el-radio-group v-model="changeOrder" size="default">
          <el-radio-button value="desc">上升 ↑</el-radio-button>
          <el-radio-button value="asc">下降 ↓</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 相关性类型 (相关性排名) -->
      <div v-if="activeTab === 'correlation'" class="filter-group">
        <el-radio-group v-model="correlationType" size="default">
          <el-radio-button value="prod">生产相关</el-radio-button>
          <el-radio-button value="self">自相关</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="data-container">
      <div v-if="loading" class="loading-state">
        <el-skeleton :rows="10" animated />
      </div>

      <!-- 国家排名 -->
      <div v-else-if="activeTab === 'country' && countryData.length > 0" class="table-wrapper">
        <el-table
          :data="countryData"
          style="width: 100%"
          :header-cell-style="{ background: '#f3ede4', color: '#3c362f', fontWeight: '600' }"
          :row-style="{ fontSize: '14px' }"
          stripe
        >
          <el-table-column type="expand">
            <template #default="{ row }">
              <div class="expand-content">
                <el-descriptions :column="3" border>
                  <el-descriptions-item label="Value Factor">
                    <span class="value-text">{{ row.value_factor !== null ? row.value_factor.toFixed(2) : '-' }}</span>
                    <el-tag v-if="row.value_change !== null" :type="row.value_change >= 0 ? 'success' : 'danger'" size="small" style="margin-left: 8px">
                      {{ row.value_change >= 0 ? '+' : '' }}{{ row.value_change.toFixed(2) }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="Regular提交">
                    <span class="value-text">{{ row.submissions_count }}</span>
                    <el-tag v-if="row.submissions_change !== null" :type="row.submissions_change >= 0 ? 'success' : 'danger'" size="small" style="margin-left: 8px">
                      {{ row.submissions_change >= 0 ? '+' : '' }}{{ row.submissions_change }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="Super Alpha提交">
                    <span class="value-text">{{ row.super_alpha_submissions_count }}</span>
                    <el-tag v-if="row.super_alpha_submissions_change !== null" :type="row.super_alpha_submissions_change >= 0 ? 'success' : 'danger'" size="small" style="margin-left: 8px">
                      {{ row.super_alpha_submissions_change >= 0 ? '+' : '' }}{{ row.super_alpha_submissions_change }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="生产相关">
                    <span class="value-text">{{ row.mean_prod_correlation !== null ? row.mean_prod_correlation.toFixed(2) : '-' }}</span>
                    <el-tag v-if="row.prod_corr_change !== null" :type="row.prod_corr_change >= 0 ? 'success' : 'danger'" size="small" style="margin-left: 8px">
                      {{ row.prod_corr_change >= 0 ? '+' : '' }}{{ row.prod_corr_change.toFixed(2) }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="自相关">
                    <span class="value-text">{{ row.mean_self_correlation !== null ? row.mean_self_correlation.toFixed(2) : '-' }}</span>
                    <el-tag v-if="row.self_corr_change !== null" :type="row.self_corr_change >= 0 ? 'success' : 'danger'" size="small" style="margin-left: 8px">
                      {{ row.self_corr_change >= 0 ? '+' : '' }}{{ row.self_corr_change.toFixed(2) }}
                    </el-tag>
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="排名" min-width="80" align="center">
            <template #default="{ $index }">
              <el-tag :type="getRankType($index)" effect="dark">{{ (currentPage - 1) * pageSize + $index + 1 }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="国家/地区" min-width="140">
            <template #default="{ row }">
              <el-space :size="8" alignment="center">
                <el-avatar :size="32" :src="getCountryFlagPath(row.country)" shape="square" />
                <span class="country-name">{{ row.country }}</span>
              </el-space>
            </template>
          </el-table-column>
          <el-table-column prop="user_count" label="用户数" min-width="90" align="center" />
          <el-table-column label="Weight Factor" min-width="130" align="right">
            <template #default="{ row }">
              <span class="highlight-value">{{ row.weight_factor.toFixed(2) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Weight 变化" min-width="140" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.weight_change !== null" :type="row.weight_change >= 0 ? 'success' : 'danger'" size="small">
                {{ row.weight_change >= 0 ? '↑' : '↓' }} {{ Math.abs(row.weight_change).toFixed(2) }}
              </el-tag>
              <span v-else class="empty-text">-</span>
            </template>
          </el-table-column>
          <el-table-column label="总提交数" min-width="120" align="right">
            <template #default="{ row }">
              <span class="highlight-value">{{ row.total_submissions.toLocaleString() }}</span>
            </template>
          </el-table-column>
          <el-table-column label="提交数变化" min-width="140" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.total_submissions_change !== null" :type="row.total_submissions_change >= 0 ? 'success' : 'danger'" size="small">
                {{ row.total_submissions_change >= 0 ? '↑' : '↓' }} {{ Math.abs(row.total_submissions_change) }}
              </el-tag>
              <span v-else class="empty-text">-</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" min-width="90" align="center" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="openCountryHistory(row.country)">
                <el-icon><Histogram /></el-icon>
                <span>历史</span>
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 大学排名 -->
      <div v-else-if="activeTab === 'university' && universityData.length > 0" class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>排名</th>
              <th>大学</th>
              <th>用户数</th>
              <th>平均Weight</th>
              <th>最高Weight</th>
              <th>总提交数</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in universityData" :key="item.university">
              <td class="rank-cell">{{ (currentPage - 1) * pageSize + index + 1 }}</td>
              <td class="university-cell">{{ item.university }}</td>
              <td>{{ item.user_count }}</td>
              <td class="highlight">{{ item.avg_weight.toFixed(2) }}</td>
              <td>{{ item.max_weight.toFixed(2) }}</td>
              <td>{{ item.total_submissions.toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 权重排名 -->
      <div v-else-if="activeTab === 'weight' && weightData.length > 0" class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>排名</th>
              <th>用户</th>
              <th>Weight Factor</th>
              <th>Value Factor</th>
              <th>总提交数</th>
              <th>国家</th>
              <th>大学</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in weightData" :key="item.user">
              <td class="rank-cell">{{ item.rank }}</td>
              <td class="user-cell">{{ item.user }}</td>
              <td class="highlight">{{ item.weight_factor.toFixed(2) }}</td>
              <td>{{ item.value_factor ? item.value_factor.toFixed(2) : '-' }}</td>
              <td>{{ item.total_submissions }}</td>
              <td>{{ item.country ? item.country : '-' }}</td>
              <td class="university-cell">{{ item.university || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 变化排名 -->
      <div v-else-if="activeTab === 'change' && changeData.length > 0" class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>排名</th>
              <th>用户</th>
              <th>当前Weight</th>
              <th>Weight变化</th>
              <th>国家</th>
              <th>大学</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in changeData" :key="item.user">
              <td class="rank-cell">{{ item.rank }}</td>
              <td class="user-cell">{{ item.user }}</td>
              <td>{{ item.current_weight.toFixed(2) }}</td>
              <td :class="['change-cell', 'highlight', item.weight_change >= 0 ? 'positive' : 'negative']">
                {{ item.weight_change >= 0 ? '+' : '' }}{{ item.weight_change.toFixed(2) }}
              </td>
              <td>{{ item.country ? item.country : '-' }}</td>
              <td class="university-cell">{{ item.university || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 提交排名 -->
      <div v-else-if="activeTab === 'submissions' && submissionsData.length > 0" class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>排名</th>
              <th>用户</th>
              <th>Weight Factor</th>
              <th>Regular提交</th>
              <th>Super Alpha提交</th>
              <th>总提交数</th>
              <th>国家</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in submissionsData" :key="item.user">
              <td class="rank-cell">{{ item.rank }}</td>
              <td class="user-cell">{{ item.user }}</td>
              <td>{{ item.weight_factor ? item.weight_factor.toFixed(2) : '-' }}</td>
              <td>{{ item.regular_submissions }}</td>
              <td>{{ item.super_alpha_submissions }}</td>
              <td class="highlight">{{ item.total_submissions }}</td>
              <td>{{ item.country ? item.country : '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="activeTab === 'correlation' && correlationData.length > 0" class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>排名</th>
              <th>用户</th>
              <th>Weight Factor</th>
              <th>Regular相关性</th>
              <th>Super Alpha相关性</th>
              <th>平均相关性</th>
              <th>国家</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in correlationData" :key="item.user">
              <td class="rank-cell">{{ item.rank }}</td>
              <td class="user-cell">{{ item.user }}</td>
              <td>{{ item.weight_factor ? item.weight_factor.toFixed(2) : '-' }}</td>
              <td>{{ item.regular_correlation ? item.regular_correlation.toFixed(4) : '-' }}</td>
              <td>{{ item.super_alpha_correlation ? item.super_alpha_correlation.toFixed(4) : '-' }}</td>
              <td class="highlight">{{ item.avg_correlation.toFixed(4) }}</td>
              <td>{{ item.country ? item.country : '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="empty-state">
        <p>暂无数据</p>
      </div>

      <!-- 分页控件 -->
      <div v-if="!loading && totalPages > 1" class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="totalRecords"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
          background
        />
      </div>
    </div>

    <!-- 国家历史数据抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      :title="`${selectedCountryCode} 历史数据`"
      direction="rtl"
      size="75%"
    >
      <div v-if="drawerLoading" class="drawer-loading">
        <el-skeleton :rows="8" animated />
      </div>
      <div v-else-if="countryHistoryData.length > 0" class="history-content">
        <el-table
          :data="countryHistoryData"
          style="width: 100%"
          :header-cell-style="{ background: '#f3ede4', color: '#3c362f', fontWeight: '600' }"
          stripe
          size="default"
        >
          <el-table-column prop="record_date" label="日期" min-width="120" />
          <el-table-column prop="user_count" label="用户数" min-width="90" align="center" />
          <el-table-column label="Weight Factor" min-width="130" align="right">
            <template #default="{ row }">
              <span class="highlight-value">{{ row.weight_factor.toFixed(2) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Value Factor" min-width="120" align="right">
            <template #default="{ row }">
              {{ row.value_factor !== null ? row.value_factor.toFixed(2) : '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="submissions_count" label="Regular提交" min-width="110" align="center" />
          <el-table-column prop="super_alpha_submissions_count" label="Super Alpha提交" min-width="140" align="center" />
          <el-table-column label="总提交数" min-width="110" align="right">
            <template #default="{ row }">
              <span class="highlight-value">{{ row.total_submissions }}</span>
            </template>
          </el-table-column>
          <el-table-column label="生产相关" min-width="130" align="right">
            <template #default="{ row }">
              {{ row.mean_prod_correlation !== null ? row.mean_prod_correlation.toFixed(2) : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="自相关" min-width="120" align="right">
            <template #default="{ row }">
              {{ row.mean_self_correlation !== null ? row.mean_self_correlation.toFixed(2) : '-' }}
            </template>
          </el-table-column>
        </el-table>

        <!-- 历史数据分页 -->
        <div v-if="historyTotalPages > 1" class="history-pagination-wrapper">
          <el-pagination
            v-model:current-page="historyCurrentPage"
            :page-size="historyPageSize"
            :total="historyTotalRecords"
            layout="total, prev, pager, next"
            @current-change="handleHistoryPageChange"
            small
            background
          />
        </div>
      </div>
      <el-empty v-else description="暂无历史数据" />
    </el-drawer>

  </div>
</template>

<style scoped>
.dashboard-page {
  max-width: 1500px;
  margin: 0 auto;
  padding: 2.5rem clamp(1.5rem, 3vw, 3rem) 4rem;
  position: relative;
  z-index: 1;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}


.page-title {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 1.8rem;
  margin: 0;
}

.tabs-container {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  overflow-x: auto;
  padding: 0.4rem;
  background: var(--card);
  border-radius: 999px;
  border: 1px solid var(--stroke);
  box-shadow: var(--shadow-md);
}

.tab-btn {
  flex: 1;
  min-width: 130px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.7rem 0.9rem;
  border: none;
  background: transparent;
  color: var(--ink-soft);
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  border-radius: 999px;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tab-btn.active {
  background: var(--ink);
  color: var(--bg);
}

.filters-container {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  padding: 1.4rem;
  background: var(--card);
  border-radius: var(--radius-md);
  border: 1px solid var(--stroke);
  box-shadow: var(--shadow-md);
  align-items: center;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.data-container {
  background: var(--card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--stroke);
  box-shadow: var(--shadow-md);
  min-height: 400px;
}

.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid rgba(27, 25, 22, 0.08);
  vertical-align: middle;
}

.data-table th {
  background: rgba(27, 25, 22, 0.04);
  font-weight: 700;
  color: var(--ink-soft);
  font-size: 0.75rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.data-table td {
  color: var(--ink);
  font-size: 0.95rem;
}

.data-table tbody tr:hover {
  background: rgba(27, 25, 22, 0.04);
}

.rank-cell {
  font-weight: 700;
  color: var(--accent);
  width: 60px;
}

.user-cell {
  font-weight: 600;
}

.university-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.highlight,
.highlight-value {
  font-weight: 700;
  color: var(--accent-2);
}

.change-cell {
  font-weight: 700;
}

.change-cell.positive {
  color: var(--accent-2);
}

.change-cell.negative {
  color: #a6322a;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  gap: 1rem;
  color: var(--ink-soft);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(27, 25, 22, 0.2);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: var(--ink-soft);
}

.pagination-wrapper,
.history-pagination-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1.5rem;
  border-top: 1px solid rgba(27, 25, 22, 0.08);
}

.history-pagination-wrapper {
  border-top: none;
}

.country-name {
  font-weight: 600;
  color: var(--ink);
}

.value-text {
  font-weight: 500;
  color: var(--ink);
}

.empty-text {
  color: #b6ada5;
}

.expand-content {
  padding: 1rem 1.5rem;
  background: rgba(27, 25, 22, 0.04);
}

.history-content {
  padding: 0 1rem;
}

.drawer-loading {
  padding: 2rem;
}

@media (max-width: 768px) {
  .dashboard-page {
    padding: 1.5rem;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .tabs-container {
    flex-wrap: nowrap;
  }

  .filters-container {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>






