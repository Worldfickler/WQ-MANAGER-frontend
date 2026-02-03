<script setup lang="ts">
import ConsultantTrendChart from '@/components/ConsultantTrendChart.vue'
import GeniusTrendChart from '@/components/GeniusTrendChart.vue'
</script>

<template>
  <div class="trends-page">
    <div class="page-content">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1 class="page-title">📈 趋势分析</h1>
        <p class="page-subtitle">查看各国家/地区的 Alpha 提交数量变化趋势（每天疑似会有alpha消失，暂不确定是因为账号封禁还是alpha退役导致）</p>
      </div>

      <ConsultantTrendChart />

      <GeniusTrendChart />
    </div>
  </div>
</template>

<style scoped>
.trends-page {
  min-height: 100vh;
  padding-bottom: 2rem;
  position: relative;
  z-index: 1;
}

.page-content {
  max-width: 1500px;
  margin: 0 auto;
  padding: 2.5rem clamp(1.5rem, 3vw, 3rem) 4rem;
}

.page-header {
  display: grid;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.page-title {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 2rem;
  margin: 0;
}

.page-subtitle {
  color: var(--ink-soft);
}

:deep(.consultant-trend-chart),
:deep(.genius-trend-chart) {
  background: var(--card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--stroke);
  box-shadow: var(--shadow-md);
  margin-bottom: 1.8rem;
  padding: 1.2rem;
}
</style>






