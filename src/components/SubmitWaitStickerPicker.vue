<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { submitWaitApi } from '@/api/submitWait'
import type { SubmitSticker } from '@/types/submitWait'

const props = defineProps<{ modelValue: SubmitSticker[]; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: SubmitSticker[]] }>()
const visible = ref(false)
const loading = ref(false)
const error = ref('')
const stickers = ref<SubmitSticker[]>([])
let request = 0
async function load() {
  const current = ++request
  loading.value = true
  error.value = ''
  try {
    const fresh = (await submitWaitApi.stickers()).data
    if (current !== request) return
    stickers.value = fresh
    // Reopening refreshes expiring image tickets without discarding the selection.
    emit('update:modelValue', props.modelValue.map(item => stickers.value.find(fresh => fresh.id === item.id) || item))
  } catch { if (current === request) error.value = '表情加载失败，请重试' }
  finally { if (current === request) loading.value = false }
}
function toggle(sticker: SubmitSticker) {
  if (props.disabled) return
  if (props.modelValue.some(item => item.id === sticker.id)) {
    emit('update:modelValue', props.modelValue.filter(item => item.id !== sticker.id))
  } else if (props.modelValue.length >= 3) {
    ElMessage.info('每次评审最多添加 3 张表情')
  } else emit('update:modelValue', [...props.modelValue, sticker])
}
function remove(id: number) {
  if (!props.disabled) emit('update:modelValue', props.modelValue.filter(item => item.id !== id))
}
watch(visible, open => { if (open) void load() })
watch(() => props.disabled, disabled => { if (disabled) visible.value = false })
onBeforeUnmount(() => { ++request })
</script>

<template>
  <div class="sticker-composer">
    <div class="sticker-toolbar">
      <el-popover v-model:visible="visible" trigger="click" placement="bottom-start" width="min(340px, calc(100vw - 32px))"
        :disabled="disabled" popper-class="sw-sticker-popover">
        <template #reference><button class="sticker-trigger" type="button" :disabled="disabled" :aria-expanded="visible" aria-label="添加自定义表情">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="6" stroke="currentColor" stroke-width="1.5"/><circle cx="8.5" cy="9.5" r="1" fill="currentColor"/><circle cx="15.5" cy="9.5" r="1" fill="currentColor"/><path d="M8 14c2 2.7 6 2.7 8 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          添加表情<span v-if="modelValue.length"> · {{ modelValue.length }}/3</span>
        </button></template>
        <div class="sticker-panel">
          <header><strong>自定义表情</strong><button type="button" aria-label="关闭表情面板" @click="visible = false">×</button></header>
          <p>点选添加，再点一次取消 · 最多 3 张</p>
          <el-skeleton v-if="loading" :rows="2" animated />
          <div v-else-if="error" class="sticker-state" role="alert">{{ error }}<el-button size="small" @click="load">重试</el-button></div>
          <p v-else-if="!stickers.length" class="sticker-state">还没有可用的表情，稍后再来看看。</p>
          <div v-else class="sticker-grid">
            <button v-for="sticker in stickers" :key="sticker.id" type="button" :disabled="disabled"
              :aria-label="`选择表情：${sticker.name}`" :aria-pressed="modelValue.some(item => item.id === sticker.id)"
              :class="{ selected: modelValue.some(item => item.id === sticker.id) }" @click="toggle(sticker)">
              <img :src="sticker.url" :alt="sticker.name" /><span>{{ sticker.name }}</span><i v-if="modelValue.some(item => item.id === sticker.id)" aria-hidden="true">✓</i>
            </button>
          </div>
        </div>
      </el-popover>
      <span class="sticker-hint">配个表情，文字理由也别忘了</span>
    </div>
    <div v-if="modelValue.length" class="selected-stickers" aria-label="待发送的表情">
      <div v-for="(sticker, index) in modelValue" :key="sticker.id" class="selected-sticker">
        <el-image :src="sticker.url" :alt="`待发送表情：${sticker.name}`" fit="contain"
          :preview-src-list="modelValue.map(item => item.url)" :initial-index="index" preview-teleported />
        <span>{{ sticker.name }}</span><button type="button" :aria-label="`移除表情：${sticker.name}`" :disabled="disabled" @click="remove(sticker.id)">×</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sticker-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 14px; margin-top: 10px; }
.sticker-trigger { display: inline-flex; align-items: center; gap: 6px; padding: 5px 9px; border: 1px solid #d9c9b3; border-radius: 7px; background: #fff8ee; color: #806c52; font: inherit; font-size: 12px; cursor: pointer; }
.sticker-trigger svg { width: 19px; height: 19px; }.sticker-trigger:hover { color: #1f6f78; border-color: #1f6f7860; }.sticker-trigger:disabled { opacity: .5; cursor: default; }
.sticker-hint { color: #9a846a; font-size: 10px; }
.sticker-panel { font-family: 'Microsoft YaHei', sans-serif; color: #4a3c2f; }
.sticker-panel header { display: flex; justify-content: space-between; align-items: center; }.sticker-panel strong { font-size: 13px; }.sticker-panel header button { border: 0; background: none; color: #9a846a; font-size: 20px; cursor: pointer; }
.sticker-panel > p { margin: 7px 0 14px; font-size: 10px; color: #9a846a; }
.sticker-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.sticker-grid button { position: relative; min-width: 0; padding: 9px; background: #f8f3eb; border: 1px solid transparent; border-radius: 9px; cursor: pointer; color: #806c52; font: inherit; font-size: 11px; }
.sticker-grid button:hover { background: #f2e9dc; }.sticker-grid button.selected { border-color: #1f6f78; background: #1f6f780a; }
.sticker-grid img { display: block; width: 100%; height: 75px; object-fit: contain; margin-bottom: 6px; }.sticker-grid i { position: absolute; top: 5px; right: 5px; display: grid; place-items: center; width: 17px; height: 17px; border-radius: 50%; background: #1f6f78; color: white; font-style: normal; }
.sticker-state { display: flex; align-items: center; gap: 12px; padding: 15px 0; font-size: 12px; }
.selected-stickers { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
.selected-sticker { position: relative; width: min(128px, calc((100% - 10px) / 2)); padding: 8px; border: 1px solid #deceba; border-radius: 9px; background: #fff9f0; }
.selected-sticker :deep(.el-image) { display: block; width: 100%; height: 76px; cursor: zoom-in; }.selected-sticker > span { display: block; color: #9a846a; font-size: 10px; margin-top: 5px; }
.selected-sticker > button { position: absolute; top: -7px; right: -7px; width: 22px; height: 22px; border-radius: 50%; border: 1px solid #d9c9b3; background: #fff8ee; color: #806c52; font-size: 15px; cursor: pointer; }
.selected-sticker > button:disabled { opacity: .5; cursor: default; }
</style>

<style>
.sw-sticker-popover.el-popover { background: #fffaf2; border: 1px solid #dfd0bc; border-radius: 12px; padding: 16px; }
</style>
