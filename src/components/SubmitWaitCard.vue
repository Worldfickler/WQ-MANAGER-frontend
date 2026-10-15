<script setup lang="ts">
import type { SubmitPost } from '@/types/submitWait'
import SubmitWaitHeat from './SubmitWaitHeat.vue'
import { decisionLabels } from '@/constants/submitWait'

defineProps<{ post: SubmitPost; watching?: boolean }>()
defineEmits<{ open: [id: number]; watch: [id: number] }>()

const statusLabel = { open: '等待评审', submitted: '作者已提交', held: '继续打磨' }
const formatDate = (value: string) => new Date(value).toLocaleString('zh-CN', {
  month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
})
</script>

<template>
  <article class="alpha-card">
    <div class="card-top">
      <span class="identity"><span class="avatar">α</span>{{ post.author_name }}<small v-if="post.is_owner">我</small></span>
      <span class="status" :class="post.status">{{ statusLabel[post.status] }}</span>
    </div>
    <button class="post-title" @click="$emit('open', post.id)">{{ post.title }}</button>
    <p class="excerpt">{{ post.content }}</p>
    <div v-if="post.images.length" class="image-strip">
      <el-image v-for="(image, index) in post.images.slice(0, 3)" :key="image.id" :src="image.url"
        :preview-src-list="post.images.map(item => item.url)" :initial-index="index" fit="cover" preview-teleported
        :alt="`${post.title}，图片 ${index + 1}`" loading="lazy" />
      <span v-if="post.images.length > 3" class="image-count">共 {{ post.images.length }} 张</span>
    </div>
    <div v-if="post.results_visible" class="vote-summary">
      <span class="yes"><span>{{ decisionLabels.submit }}</span><b>{{ post.submit_count }}</b></span>
      <span class="no"><span>{{ decisionLabels.hold }}</span><b>{{ post.hold_count }}</b></span>
    </div>
    <div v-else class="sealed">{{ post.status === 'open' ? '先独立评审，或选择围观后查看意见' : '评审已结束，可围观查看大家的意见' }}</div>
    <footer>
      <div class="post-meta"><span>{{ post.group_name || '公开广场' }}</span><time>{{ formatDate(post.created_at) }}</time></div>
      <div class="card-actions">
        <button v-if="!post.is_owner && !post.my_decision && !post.has_watched" class="watch-link"
          :disabled="watching" @click="$emit('watch', post.id)">{{ watching ? '请稍候…' : '围观' }}</button>
        <button class="review-link" @click="$emit('open', post.id)">
          {{ post.is_owner ? '查看我的申请' : post.my_decision ? '查看评审' : post.has_watched ? '查看围观' : post.status === 'open' ? '我来评审' : '查看申请' }}
          <span aria-hidden="true">↗</span>
        </button>
      </div>
    </footer>
    <div class="card-activity"><span>{{ post.review_count }} 人已评审</span><SubmitWaitHeat :count="post.review_count" />
      <span v-if="post.watch_count" class="watch-count">{{ post.watch_count }} 人围观</span></div>
    <span v-if="post.has_watched" class="watched-note">已围观 · 本条申请不可再评审</span>
  </article>
</template>

<style scoped>
.alpha-card { position: relative; display: flex; flex-direction: column; padding: 24px; border: 1px solid var(--stroke); border-radius: 18px; background: var(--card); transition: box-shadow .2s, transform .2s; min-width: 0; }
.alpha-card:hover { box-shadow: 0 12px 30px #3221160c; transform: translateY(-2px); }
.card-top, .identity, footer, .post-meta, .vote-summary { display: flex; align-items: center; }
.card-top { justify-content: space-between; gap: 8px; margin-bottom: 18px; }
.identity { gap: 8px; font-size: 12px; color: var(--ink-soft); min-width: 0; overflow-wrap: anywhere; }
.identity small { background: #1f6f7814; color: var(--accent-2); padding: 0 5px; border-radius: 4px; white-space: nowrap; }
.avatar { flex-shrink: 0; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: #eae1d2; color: #7f6951; font-size: 19px; font-style: italic; }
.status { flex-shrink: 0; font-size: 11px; border-radius: 5px; padding: 3px 7px; }
.open { color: #93682a; background: #9b6f2f12; }
.submitted { color: var(--accent-2); background: #1f6f7812; }
.held { color: #ac542f; background: #d56a3a12; }
.post-title { padding: 0; border: 0; background: none; color: var(--ink); font: inherit; font-size: 21px; font-weight: 650; line-height: 1.4; text-align: left; cursor: pointer; overflow-wrap: anywhere; }
.post-title:hover { color: var(--accent); }
.excerpt { margin: 12px 0 18px; color: #6b6053; font-size: 14px; line-height: 1.8; white-space: pre-wrap; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.image-strip { position: relative; display: flex; gap: 7px; margin-bottom: 20px; }
.image-strip :deep(.el-image) { width: calc((100% - 14px) / 3); height: 100px; border: 1px solid var(--stroke); border-radius: 8px; background: #eee5d7; }
.image-count { position: absolute; bottom: 5px; right: 5px; background: #1b1916b0; color: white; border-radius: 4px; padding: 1px 5px; font-size: 10px; pointer-events: none; }
.vote-summary, .sealed { margin-top: auto; border-top: 1px dashed var(--stroke); padding: 14px 0; min-height: 50px; font-size: 12px; }
.vote-summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.vote-summary > span { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.vote-summary b { font-size: 18px; font-weight: 600; line-height: 1.3; }
.yes { color: var(--accent-2); }.no { color: #ae5730; }.sealed { color: #8c7d6c; }
footer { justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.post-meta { gap: 8px; color: #8a7b69; font-size: 10px; flex-wrap: wrap; }
.review-link { background: transparent; border: 0; color: var(--accent-2); cursor: pointer; font: inherit; font-size: 12px; font-weight: 600; white-space: nowrap; }
.review-link span { font-size: 17px; margin-left: 5px; }
.card-actions { display: flex; align-items: center; gap: 14px; margin-left: auto; }
.watch-link { border: 0; background: transparent; padding: 4px 0; font: inherit; font-size: 12px; color: #806e57; cursor: pointer; }
.watch-link:hover { color: var(--accent); }.watch-link:disabled { cursor: wait; opacity: .6; }
.card-activity { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; margin-top: 14px; font-size: 11px; color: #8a7b69; }
.watch-count { margin-left: auto; font-size: 10px; }
.watched-note { margin-top: 7px; font-size: 10px; color: #927b60; }
@media (prefers-reduced-motion: reduce) { .alpha-card { transition: none; }.alpha-card:hover { transform: none; } }
</style>
