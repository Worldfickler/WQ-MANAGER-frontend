<script setup lang="ts">
import { ref } from 'vue'

interface NoticeSection {
  title: string
  subtitle: string
  points: string[]
  links?: { label: string; url: string }[]
}

const sections = ref<NoticeSection[]>([
  {
    title: '平台简介',
    subtitle: '面向 WorldQuant 平台的指标看板与趋势分析平台。',
    points: [
      '重点展示 Weight、Alpha、提交与变化趋势等核心指标，帮助快速定位变化与异常。',
      '所有数据仅用于内部分析与沟通，不代表官方统计口径。',
      '数据通过公开接口获取，平台不对准确性与完整性做保证。',
      '如有 Bug 或新增指标需求，可通过反馈入口提交。'
    ]
  },
  {
    title: '数据更新',
    subtitle: '数据每日定时更新，默认 00:01（WorldQuant 平台时间）。',
    points: [
      '更新以批处理任务完成时间为准，短时延迟属正常情况，常见在 5–20 分钟内。',
      '部分接口存在缓存，刷新后仍显示旧数据可稍后重试。',
      '自 2026-01-01 起更新时间为每日 00:01（平台时间）；此前为每日 08:00（北京时间）。'
    ]
  },
  {
    title: '项目地址',
    subtitle: '源代码与文档已开源，欢迎 Star 与 Issue。',
    points: ['后端仓库与前端仓库如下：'],
    links: [
      {
        label: 'WQ-MANAGER-backend',
        url: 'https://github.com/Worldfickler/WQ-MANAGER-backend'
      },
      {
        label: 'WQ-MANAGER-frontend',
        url: 'https://github.com/Worldfickler/WQ-MANAGER-frontend'
      }
    ]
  }
])
</script>

<template>
  <div class="notice-page">
    <header class="notice-hero">
      <div class="hero-badge">NOTICE / INTRO</div>
      <h1 class="hero-title">平台说明</h1>
      <p class="hero-subtitle">本页面用于集中说明平台定位、数据更新机制与使用须知。</p>
    </header>

    <section class="notice-grid">
      <article v-for="section in sections" :key="section.title" class="notice-card">
        <div class="card-header">
          <h2>{{ section.title }}</h2>
          <span class="card-divider"></span>
        </div>
        <p class="card-subtitle">{{ section.subtitle }}</p>
        <ul class="card-list">
          <li v-for="item in section.points" :key="item">{{ item }}</li>
        </ul>
        <div v-if="section.links" class="card-links">
          <a
            v-for="link in section.links"
            :key="link.url"
            :href="link.url"
            class="card-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span class="link-label">{{ link.label }}</span>
            <span class="link-url">{{ link.url }}</span>
          </a>
        </div>
      </article>
    </section>

    <section class="notice-footer">
      <div class="footer-line"></div>
      <p>
        祝愿国区各位Consultant在Brain平台ValueFactor1.0！Genius等级up！up！Weight与日俱增！
      </p>
    </section>
  </div>
</template>

<style scoped>
.notice-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2.8rem clamp(1.5rem, 4vw, 3.5rem) 4rem;
  position: relative;
  z-index: 1;
}

.notice-hero {
  background: radial-gradient(circle at top right, rgba(213, 106, 58, 0.2), transparent 55%),
    radial-gradient(circle at bottom left, rgba(31, 111, 120, 0.16), transparent 55%);
  border: 1px solid var(--stroke);
  border-radius: var(--radius-lg);
  padding: 2.5rem 2.8rem;
  box-shadow: var(--shadow-md);
  margin-bottom: 2.2rem;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.9rem;
  border-radius: 999px;
  background: rgba(27, 25, 22, 0.08);
  border: 1px solid var(--stroke);
  font-size: 0.7rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

.hero-title {
  margin-top: 1rem;
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: clamp(2rem, 3.5vw, 2.6rem);
  letter-spacing: -0.02em;
}

.hero-subtitle {
  margin-top: 0.6rem;
  color: var(--ink-soft);
  max-width: 620px;
}

.notice-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.4rem;
}

.notice-card {
  background: var(--card);
  border-radius: var(--radius-md);
  border: 1px solid var(--stroke);
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  display: grid;
  gap: 0.9rem;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.card-header h2 {
  font-size: 1.15rem;
  margin: 0;
}

.card-divider {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, rgba(27, 25, 22, 0.12), transparent);
}

.card-subtitle {
  color: var(--ink-soft);
  font-size: 0.85rem;
}

.card-list {
  margin: 0;
  padding-left: 1.2rem;
  display: grid;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--ink);
}

.card-list li {
  line-height: 1.6;
}

.card-links {
  display: grid;
  gap: 0.6rem;
}

.card-link {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  border: 1px solid rgba(27, 25, 22, 0.08);
  background: rgba(27, 25, 22, 0.03);
  text-decoration: none;
  color: var(--ink);
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.card-link:hover {
  border-color: rgba(213, 106, 58, 0.4);
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(27, 25, 22, 0.08);
}

.link-label {
  font-weight: 600;
  letter-spacing: 0.02em;
}

.link-url {
  font-size: 0.85rem;
  color: var(--ink-soft);
}

.notice-footer {
  margin-top: 2.4rem;
  text-align: center;
  color: var(--ink-soft);
  font-size: 0.85rem;
}

.footer-line {
  width: 120px;
  height: 2px;
  margin: 0 auto 0.8rem;
  background: linear-gradient(90deg, transparent, rgba(213, 106, 58, 0.6), transparent);
}

@media (max-width: 720px) {
  .notice-hero {
    padding: 2rem;
  }

  .card-link {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
