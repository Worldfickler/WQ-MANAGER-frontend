<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ count: number }>()
const levels = [
  { minimum: 50, label: '超火爆', level: 4 },
  { minimum: 30, label: '火爆', level: 3 },
  { minimum: 15, label: '火热', level: 2 },
  { minimum: 5, label: '热议', level: 1 }
]
const heat = computed(() => levels.find(level => props.count >= level.minimum))
</script>

<template>
  <span v-if="heat" class="heat-badge" :class="`heat-${heat.level}`"
    :aria-label="`热度：${heat.label}，${count} 人已评审`"
    :title="`${heat.label} · 至少 ${heat.minimum} 人已评审；热度依次为 5 / 15 / 30 / 50 人`">
    <svg class="heat-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path fill="currentColor" d="M12 2c1.7 2.4 2.3 4.7 1.2 8.3.6-.3 2-1.3 1.8-4.6 2.4 1.7 5 5.1 5 8.9C20 18.8 16.4 22 12 22c-4.5 0-8-2.4-8-6.5 0-2 1-4.4 3.2-6.5-.3 1.8.4 3.4 2.5 4-.7-1.4-.4-2.4.8-3.9C11.9 7.4 13.6 5.7 12 2Z" />
      <path class="heat-core" d="M12 13c0 2-2.5 3-2.5 5a2.5 2.5 0 0 0 5 0c0-1.7-1.1-3.4-2.5-5Z" />
    </svg>
    <span class="heat-label">{{ heat.label }}</span>
  </span>
</template>

<style scoped>
.heat-badge {
  --heat-core: #ffe4b4;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 24px;
  padding: 0 9px 0 7px;
  border-radius: 999px;
  background: #f7ecdc;
  color: #925b28;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  vertical-align: middle;
}
.heat-icon { display: block; width: 16px; height: 18px; flex-shrink: 0; }
.heat-core { fill: var(--heat-core); }
.heat-label { letter-spacing: .2px; }
.heat-2 { --heat-core: #ffdda4; color: #ad4b1e; background: #ffebd9; }
.heat-3 { --heat-core: #ffd5b0; color: #b63829; background: #ffe4db; }
.heat-4 {
  --heat-core: #ffc86c;
  color: #fff;
  background: linear-gradient(110deg, #ca4129, #bd2e38);
  box-shadow: inset 0 1px 0 #ffffff2b, 0 2px 5px #ad35241c;
}
</style>
