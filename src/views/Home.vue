<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import CountryWeightChart from '@/components/CountryWeightChart.vue'
import { leaderboardApi } from '@/api/leaderboard'
import { getCountryFlagPath } from '@/utils/flags'
import { getCountryName } from '@/utils/country'
import type { CountryWeightData, UserWeightData, SummaryStatistics, GeniusLevelWeightChange } from '@/types/leaderboard'

const router = useRouter()

// 获取当前用户信息
const currentUser = ref<{
  wq_id?: string
  username?: string
}>({})

// 登出功能
const handleLogout = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('isAuthenticated')
  localStorage.removeItem('user')
  router.push('/login')
}

// 时间筛选器
const activeTimeFilter = ref('7天')
const timeFilters = ['7天', '15天', '30天']

const getTimeFilterDays = (filter: string): number => {
  const daysMap: Record<string, number> = {
    '7天': 7,
    '15天': 15,
    '30天': 30
  }
  return daysMap[filter] || 7
}

const countryLoading = ref(false)
const userLoading = ref(false)
const summaryLoading = ref(false)
const geniusLevelLoading = ref(false)

const userSortOrder = ref<'desc' | 'asc'>('desc')

const countryLeaderboard = ref<CountryWeightData[]>([])
const userLeaderboard = ref<UserWeightData[]>([])
const geniusLevelChanges = ref<GeniusLevelWeightChange[]>([])
const summaryStats = ref<SummaryStatistics>({
  total_users: 0,
  user_change: 0,
  total_alpha: 0,
  alpha_change: 0,
  total_weight: 0,
  weight_change: 0,
  total_records: 0
})

const getCountryFlag = (code: string) => {
  return getCountryFlagPath(code)
}

const fetchCountryLeaderboard = async () => {
  countryLoading.value = true
  try {
    const days = getTimeFilterDays(activeTimeFilter.value)
    const response = await leaderboardApi.getCountryLeaderboard(6, days)
    countryLeaderboard.value = response.data
  } catch (error: any) {
    console.error('获取国家Weight失败:', error)
  } finally {
    countryLoading.value = false
  }
}

const fetchUserLeaderboard = async () => {
  userLoading.value = true
  try {
    const days = getTimeFilterDays(activeTimeFilter.value)
    const response = await leaderboardApi.getUserLeaderboard(6, days, userSortOrder.value)
    userLeaderboard.value = response.data
  } catch (error: any) {
    console.error('获取用户Weight失败:', error)
  } finally {
    userLoading.value = false
  }
}

const fetchSummaryStatistics = async () => {
  summaryLoading.value = true
  try {
    const days = getTimeFilterDays(activeTimeFilter.value)
    const response = await leaderboardApi.getSummaryStatistics(days)
    summaryStats.value = response.data
  } catch (error: any) {
    console.error('获取汇总统计失败:', error)
  } finally {
    summaryLoading.value = false
  }
}

const fetchGeniusLevelChanges = async () => {
  geniusLevelLoading.value = true
  try {
    const days = getTimeFilterDays(activeTimeFilter.value)
    const response = await leaderboardApi.getGeniusLevelWeightChanges(days)
    geniusLevelChanges.value = response.data
  } catch (error: any) {
    console.error('获取Genius等级Weight变化失败:', error)
  } finally {
    geniusLevelLoading.value = false
  }
}

// 监听时间筛器变化
const handleTimeFilterChange = (filter: string) => {
  activeTimeFilter.value = filter
  fetchCountryLeaderboard()
  fetchUserLeaderboard()
  fetchSummaryStatistics()
  fetchGeniusLevelChanges()
}

// 切换用户排序顺序
const toggleUserSortOrder = () => {
  userSortOrder.value = userSortOrder.value === 'desc' ? 'asc' : 'desc'
  fetchUserLeaderboard()
}

// 顶部汇总卡片数据（计算属性）
const summaryCards = computed(() => [
  {
    title: '总用户数',
    value: summaryStats.value.total_users.toLocaleString(),
    subtext: `${summaryStats.value.user_change >= 0 ? '+' : ''}${summaryStats.value.user_change} 变化量`,
    icon: '👥',
    color: '#d56a3a'
  },
  {
    title: '总Alpha数',
    value: summaryStats.value.total_alpha.toLocaleString(),
    subtext: `${summaryStats.value.alpha_change >= 0 ? '+' : ''}${summaryStats.value.alpha_change} 变化量`,
    icon: '📊',
    color: '#1f6f78'
  },
  {
    title: '总Weight',
    value: summaryStats.value.total_weight.toLocaleString(),
    subtext: `${summaryStats.value.weight_change >= 0 ? '+' : ''}${summaryStats.value.weight_change.toFixed(2)} 变化量`,
    icon: '⚖️',
    color: '#9b6f2f'
  },
  {
    title: '数据总量',
    value: summaryStats.value.total_records.toLocaleString(),
    subtext: summaryStats.value.latest_record_date
      ? `最新数据 ${summaryStats.value.latest_record_date}（平台时间）`
      : '已抓取记录数',
    icon: '📈',
    color: '#4facfe'
  }
])

const levelColorMap: Record<string, string> = {
  EXPERT: '#9b6f2f',
  GOLD: '#c9a227',
  GRANDMASTER: '#1f6f78',
  MASTER: '#d56a3a',
  UNKNOWN: '#6d6d6d'
}

const getLevelColor = (level: string) => {
  return levelColorMap[level] || levelColorMap.UNKNOWN
}

const levelIconMap: Record<string, string> = {
  GRANDMASTER: new URL('@/assets/genius/grandmaster.svg', import.meta.url).href,
  MASTER: new URL('@/assets/genius/master.svg', import.meta.url).href,
  EXPERT: new URL('@/assets/genius/expert.svg', import.meta.url).href,
  GOLD: new URL('@/assets/genius/gold.svg', import.meta.url).href
}

const getLevelIcon = (level: string) => {
  return levelIconMap[level] || ''
}

const levelOrder = ['GRANDMASTER', 'MASTER', 'EXPERT', 'GOLD']
const sortedGeniusLevels = computed(() => {
  const normalized = geniusLevelChanges.value.map(item => ({
    ...item
  }))
  const levelMap = new Map(normalized.map(item => [item.genius_level, item]))
  const ordered = levelOrder.map(level => {
    return levelMap.get(level) || {
      genius_level: level,
      total_users: 0,
      total_weight: 0,
      weight_change: 0,
      weight_change_percent: 0
    }
  })
  return ordered
})

// 组件挂载
onMounted(() => {
  const userStr = localStorage.getItem('user')
  if (userStr) {
    currentUser.value = JSON.parse(userStr)
  }

  fetchCountryLeaderboard()
  fetchUserLeaderboard()
  fetchSummaryStatistics()
  fetchGeniusLevelChanges()
})
</script>

<template>
  <div class="home">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="greeting">👋 你好，{{ currentUser.username || currentUser.wq_id }}</h1>
        <p class="header-title">数据概览</p>
      </div>
      <div class="header-right">
        <div class="time-filter">
          <button
            v-for="filter in timeFilters"
            :key="filter"
            :class="['filter-btn', { active: activeTimeFilter === filter }]"
            @click="handleTimeFilterChange(filter)"
          >
            {{ filter }}
          </button>
        </div>
        <button class="logout-btn" @click="handleLogout" title="退出登录">
          登出
        </button>
      </div>
    </div>

    <div class="summary-section">
      <div
        v-if="summaryLoading"
        v-for="index in 4"
        :key="`skeleton-${index}`"
        class="summary-card skeleton-card"
      >
        <div class="skeleton-icon"></div>
        <div class="card-content">
          <div class="skeleton-title"></div>
          <div class="skeleton-value"></div>
          <div class="skeleton-subtext"></div>
        </div>
      </div>
      <!-- 实际数据 -->
      <div
        v-else
        v-for="card in summaryCards"
        :key="`${card.title}-${activeTimeFilter}`"
        class="summary-card"
        :style="{ '--card-color': card.color }"
      >
        <div class="card-icon">{{ card.icon }}</div>
        <div class="card-content">
          <div class="card-title">{{ card.title }}</div>
          <div class="card-value">{{ card.value }}</div>
          <div class="card-subtext">{{ card.subtext }}</div>
        </div>
      </div>
    </div>

    <!-- 国家Weight分析图表 -->
    <div class="chart-section">
      <CountryWeightChart />
    </div>

    <div class="ranking-section">
      <div class="ranking-column">
        <div class="ranking-header">
          <span class="header-icon">🌍</span>
          <h2 class="header-title">国家/地区Weight</h2>
        </div>
        <div v-if="countryLoading" class="loading-spinner">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>
        <div v-else-if="countryLeaderboard.length === 0" class="loading-state">暂无数据</div>
        <div v-else class="ranking-list">
          <div
            v-for="country in countryLeaderboard"
            :key="country.country"
            class="ranking-card country-card"
          >
            <div class="rank-badge">
              <img :src="getCountryFlag(country.country)" :alt="country.country" class="flag-img" />
            </div>
            <div class="card-info">
              <div class="card-title-text">{{ getCountryName(country.country) }}</div>
              <div class="card-subtitle">{{ country.country }}</div>
            </div>
            <div class="card-metrics">
              <div class="card-count">
                {{ country.weight_factor !== null ? country.weight_factor.toFixed(2) : 'N/A' }}
              </div>
              <div
                v-if="country.weight_change !== null && country.weight_change !== undefined"
                :class="['change-value', country.weight_change >= 0 ? 'positive' : 'negative']"
              >
                {{ country.weight_change >= 0 ? '↑' : '↓' }}
                {{ Math.abs(country.weight_change).toFixed(2) }}
                <span class="change-percent">({{ country.weight_change_percent?.toFixed(1) }}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="ranking-column">
        <div class="ranking-header">
          <span class="header-icon">🔥</span>
          <h2 class="header-title">用户Weight</h2>
          <button class="sort-toggle-btn" @click="toggleUserSortOrder" title="切换排序">
            {{ userSortOrder === 'desc' ? '↑' : '↓' }}
          </button>
        </div>
        <div v-if="userLoading" class="loading-spinner">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>
        <div v-else-if="userLeaderboard.length === 0" class="loading-state">暂无数据</div>
        <div v-else class="ranking-list">
          <div
            v-for="user in userLeaderboard"
            :key="user.user"
            class="ranking-card user-card"
          >
            <div class="user-avatar">{{ user.user.substring(0, 2).toUpperCase() }}</div>
            <div class="card-info">
              <div class="card-title-text">{{ user.user }}</div>
              <div class="card-subtitle">
                {{ user.university || user.country || 'N/A' }}
              </div>
            </div>
            <div class="card-metrics">
              <div class="card-count">
                {{ user.weight_factor !== null ? user.weight_factor.toFixed(2) : 'N/A' }}
              </div>
              <div
                v-if="user.weight_change !== null && user.weight_change !== undefined"
                :class="['change-value', user.weight_change >= 0 ? 'positive' : 'negative']"
              >
                {{ user.weight_change >= 0 ? '↑' : '↓' }}
                {{ Math.abs(user.weight_change).toFixed(2) }}
                <span class="change-percent">({{ user.weight_change_percent?.toFixed(1) }}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="ranking-column">
        <div class="ranking-header">
          <span class="header-icon">🎯</span>
          <h2 class="header-title">Genius等级Weight变化</h2>
        </div>
        <div v-if="geniusLevelLoading" class="loading-spinner">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>
        <div v-else-if="geniusLevelChanges.length === 0" class="loading-state">暂无数据</div>
        <div v-else class="ranking-list">
          <div
            v-for="level in sortedGeniusLevels"
            :key="level.genius_level"
            class="ranking-card genius-card"
            :style="{ '--level-color': getLevelColor(level.genius_level) }"
          >
            <div class="level-badge">
              <img :src="getLevelIcon(level.genius_level)" :alt="level.genius_level" class="level-icon" />
            </div>
            <div class="card-info">
              <div class="card-title-text level-name">
                {{ level.genius_level }}
              </div>
              <div class="card-subtitle">人数 {{ level.total_users ?? 0 }}</div>
            </div>
            <div class="card-metrics">
              <div class="card-count">{{ level.total_weight.toFixed(2) }}</div>
              <div
                :class="['change-value', level.weight_change >= 0 ? 'positive' : 'negative']"
              >
                {{ level.weight_change >= 0 ? '↑' : '↓' }}
                {{ Math.abs(level.weight_change).toFixed(2) }}
                <span class="change-percent">
                  ({{ level.weight_change_percent !== null && level.weight_change_percent !== undefined
                    ? level.weight_change_percent.toFixed(1)
                    : '0.0' }}%)
                </span>
              </div>
              <div class="card-subtitle subtle">{{ activeTimeFilter }}内变化</div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.home {
  max-width: 1440px;
  margin: 0 auto;
  padding: 2.5rem clamp(1.5rem, 3vw, 3rem) 4rem;
  min-height: 100vh;
  position: relative;
  z-index: 1;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 2rem;
  margin-bottom: 2.5rem;
}

.greeting {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: clamp(1.8rem, 3vw, 2.6rem);
  letter-spacing: -0.02em;
  margin-bottom: 0.4rem;
}

.header-title {
  text-transform: uppercase;
  letter-spacing: 0.4em;
  font-size: 0.75rem;
  color: var(--accent-2);
  font-weight: 700;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.time-filter {
  display: flex;
  gap: 0.4rem;
  padding: 0.35rem;
  border-radius: 999px;
  border: 1px solid var(--stroke);
  background: var(--card);
}

.filter-btn {
  border: none;
  background: transparent;
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  font-size: 0.8rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-soft);
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-btn.active {
  background: var(--ink);
  color: var(--bg);
}

.logout-btn {
  border: 1px solid var(--stroke);
  background: transparent;
  padding: 0.6rem 1rem;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 0.7rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.logout-btn:hover {
  background: var(--ink);
  color: var(--bg);
}

.summary-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.summary-card {
  background: var(--card);
  border-radius: var(--radius-md);
  border: 1px solid var(--stroke);
  padding: 1.4rem;
  display: flex;
  gap: 1rem;
  align-items: center;
  box-shadow: var(--shadow-md);
  position: relative;
  overflow: hidden;
}

.summary-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(240px 120px at 80% -20%, rgba(213, 106, 58, 0.12), transparent);
  opacity: 0.6;
  pointer-events: none;
}

.card-icon {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 1.4rem;
  color: var(--card-color);
  background: rgba(27, 25, 22, 0.06);
}

.card-title {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--ink-soft);
}

.card-value {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 1.6rem;
}

.card-subtext {
  font-size: 0.85rem;
  color: var(--ink-soft);
}

.skeleton-card {
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.5), rgba(245, 236, 222, 0.5));
  border: 1px solid var(--stroke);
}

.skeleton-icon,
.skeleton-title,
.skeleton-value,
.skeleton-subtext {
  background: rgba(27, 25, 22, 0.08);
  border-radius: 10px;
  animation: shimmer 1.6s infinite;
}

.skeleton-icon {
  width: 46px;
  height: 46px;
}

.skeleton-title {
  width: 80px;
  height: 10px;
}

.skeleton-value {
  width: 100px;
  height: 18px;
  margin-top: 0.5rem;
}

.skeleton-subtext {
  width: 120px;
  height: 10px;
  margin-top: 0.4rem;
}

@keyframes shimmer {
  0% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.4;
  }
}

.chart-section {
  padding: 0;
  background: transparent;
  border: none;
  box-shadow: none;
  margin-bottom: 2rem;
}

.ranking-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.ranking-column {
  background: var(--card);
  border-radius: var(--radius-md);
  border: 1px solid var(--stroke);
  padding: 1.3rem;
  box-shadow: var(--shadow-md);
}

.ranking-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 1.2rem;
}

.ranking-header .header-title {
  text-transform: none;
  letter-spacing: 0;
  font-size: 1.1rem;
  color: var(--ink);
}

.header-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--ink);
  color: var(--bg);
  display: grid;
  place-items: center;
  font-size: 0.9rem;
}

.sort-toggle-btn {
  margin-left: auto;
  border: 1px solid var(--stroke);
  background: transparent;
  border-radius: 999px;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
}

.ranking-list {
  display: grid;
  gap: 0.8rem;
}

.ranking-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 0.8rem 1rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--stroke);
  background: rgba(255, 255, 255, 0.6);
}

.ranking-card .card-info {
  text-align: left;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.rank-badge {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: rgba(27, 25, 22, 0.08);
}

.flag-img {
  width: 26px;
  height: 18px;
  border-radius: 4px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--ink);
  color: var(--bg);
  display: grid;
  place-items: center;
  font-weight: 700;
}

.card-title-text {
  font-weight: 700;
}

.card-subtitle {
  font-size: 0.8rem;
  color: var(--ink-soft);
}

.card-metrics {
  text-align: right;
}

.genius-card {
  border: 1px solid rgba(27, 25, 22, 0.08);
}

.level-badge {
  width: 42px;
  height: 42px;
  border-radius: 999px;
  background: rgba(27, 25, 22, 0.08);
  color: var(--level-color);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.level-icon {
  width: 28px;
  height: 28px;
}

.level-name {
  letter-spacing: 0.08em;
}

.card-subtitle.subtle {
  margin-top: 0.35rem;
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

.card-count {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 1.1rem;
}

.change-value {
  font-size: 0.75rem;
}

.change-percent {
  opacity: 0.7;
}

.positive {
  color: var(--accent-2);
}

.negative {
  color: #a6322a;
}

.loading-spinner,
.loading-state {
  padding: 1.2rem;
  text-align: center;
  color: var(--ink-soft);
}

.spinner {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid rgba(27, 25, 22, 0.2);
  border-top-color: var(--accent);
  margin: 0 auto 0.5rem;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 900px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-right {
    width: 100%;
    justify-content: space-between;
  }
}
</style>







