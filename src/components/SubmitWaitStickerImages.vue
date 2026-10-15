<script setup lang="ts">
import type { SubmitSticker } from '@/types/submitWait'
defineProps<{ stickers?: SubmitSticker[] }>()
</script>

<template>
  <div v-if="stickers?.length" class="opinion-stickers" aria-label="评审表情">
    <el-image v-for="(sticker, index) in stickers" :key="sticker.id" :src="sticker.url" :alt="sticker.name"
      :style="{ width: `${Math.min(sticker.width, 220)}px`, aspectRatio: `${sticker.width} / ${sticker.height}` }"
      fit="contain" :preview-src-list="stickers.map(item => item.url)" :initial-index="index" preview-teleported loading="lazy" />
  </div>
</template>

<style scoped>
.opinion-stickers { display: flex; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin: 12px 0 18px; }
.opinion-stickers :deep(.el-image) { display: block; max-width: 100%; border-radius: 8px; cursor: zoom-in; }
</style>
