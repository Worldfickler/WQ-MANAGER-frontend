<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{ paused?: boolean }>()
const steps = [
  {
    title: '先脱敏，再分享',
    description: '留下逻辑概述、回测指标和你的疑问。表达式、源代码、账号与密钥，请先从文字和截图中隐藏。',
    tags: ['逻辑概述', '回测指标', '脱敏截图'],
    mark: 'α', color: '#b5683c', caption: '分享思考，也保护自己的研究。'
  },
  {
    title: '先判断，再看意见',
    description: '留下判断和理由后，可查看大家的意见。也可以选择围观，但围观后不能再评审这条申请。',
    tags: ['独立判断', '理由必填', '围观不可评审'],
    mark: '↗', color: '#1f6f78', caption: '每一票，都有一份认真思考。'
  },
  {
    title: '决定仍由你来做',
    description: '结合大家的建议，选择提交或继续打磨。想好了，就记录最终决定，为这次讨论留一个回音。',
    tags: ['听取建议', '自己决定', '反馈结果'],
    mark: '✓', color: '#8b743f', caption: '多一份参考，多一点把握。'
  }
]
const active = ref(0)
const current = computed(() => steps[active.value])
const userPaused = ref(false)
const hovered = ref(false)
const focused = ref(false)
const hidden = ref(false)
const reducedMotion = ref(false)
const canRotate = computed(() => !props.paused && !userPaused.value && !hovered.value
  && !focused.value && !hidden.value && !reducedMotion.value)
let timer: number | undefined
let motionQuery: MediaQueryList | undefined

function stopTimer() {
  if (timer !== undefined) window.clearTimeout(timer)
  timer = undefined
}
function scheduleRotation() {
  stopTimer()
  if (canRotate.value) timer = window.setTimeout(() => selectStep(active.value + 1), 2000)
}
function selectStep(index: number) {
  active.value = (index + steps.length) % steps.length
}
function updateVisibility() { hidden.value = document.hidden }
function updateMotion() { reducedMotion.value = motionQuery?.matches ?? false }
function focusOut(event: FocusEvent) {
  const target = event.currentTarget as HTMLElement
  focused.value = event.relatedTarget instanceof Node && target.contains(event.relatedTarget)
}

watch([active, canRotate], scheduleRotation)
onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  updateMotion(); updateVisibility()
  motionQuery.addEventListener('change', updateMotion)
  document.addEventListener('visibilitychange', updateVisibility)
  scheduleRotation()
})
onBeforeUnmount(() => {
  stopTimer()
  motionQuery?.removeEventListener('change', updateMotion)
  document.removeEventListener('visibilitychange', updateVisibility)
})
</script>

<template>
  <aside class="guide-card" :style="{ '--guide-accent': current.color }" aria-label="评审小约定" aria-roledescription="轮播"
    @mouseenter="hovered = true" @mouseleave="hovered = false" @focusin="focused = true" @focusout="focusOut"
    @keydown.left.prevent="selectStep(active - 1)" @keydown.right.prevent="selectStep(active + 1)">
    <header class="guide-heading"><span><i aria-hidden="true"></i>评审小约定</span><span class="guide-number">α / {{ String(active + 1).padStart(2, '0') }}</span></header>
    <div class="guide-viewport" aria-live="off">
      <Transition name="guide-slide" mode="out-in">
        <div :key="active" class="guide-slide" role="group" :aria-label="`第 ${active + 1} 条，共 ${steps.length} 条`">
          <span class="guide-mark" aria-hidden="true">{{ current.mark }}</span>
          <h2>{{ current.title }}</h2>
          <p>{{ current.description }}</p>
          <div class="guide-tags"><span v-for="tag in current.tags" :key="tag">{{ tag }}</span></div>
        </div>
      </Transition>
    </div>
    <footer class="guide-footer">
      <div class="guide-dots" role="group" aria-label="切换提示">
        <button v-for="(step, index) in steps" :key="step.title" type="button" :class="{ active: active === index }"
          :aria-pressed="active === index" :aria-label="`查看提示 ${index + 1}：${step.title}`" @click="selectStep(index)"><span></span></button>
      </div>
      <span class="guide-caption">{{ current.caption }}</span>
      <button v-if="!reducedMotion" class="guide-pause" type="button" :aria-pressed="userPaused"
        :aria-label="userPaused ? '开启自动切换' : '暂停自动切换'" :title="userPaused ? '开启自动切换' : '暂停自动切换'"
        @click="userPaused = !userPaused">{{ userPaused ? '▶' : 'Ⅱ' }}</button>
    </footer>
  </aside>
</template>

<style scoped>
.guide-card {
  position: relative;
  min-width: 0;
  padding: 22px 24px 14px;
  overflow: hidden;
  border: 1px solid #daceba;
  border-radius: 3px 18px 18px 18px;
  background: #fff9ef;
  box-shadow: 5px 6px 0 #e9dfcf;
  transform: rotate(1deg);
}
.guide-heading, .guide-heading > span:first-child, .guide-footer, .guide-dots { display: flex; align-items: center; }
.guide-heading { justify-content: space-between; gap: 12px; padding-bottom: 15px; border-bottom: 1px dashed #daceba; color: #7d654c; font-size: 12px; }
.guide-heading > span:first-child { gap: 7px; }
.guide-heading i { width: 6px; height: 6px; border-radius: 50%; background: var(--guide-accent); transition: background .3s; }
.guide-number { color: #b39c80; font-family: monospace; }
.guide-viewport { position: relative; min-height: 215px; }
.guide-slide { padding: 21px 0 19px; }
.guide-mark { position: absolute; top: 15px; right: 0; color: var(--guide-accent); opacity: .12; font-size: 72px; line-height: 1; font-style: italic; pointer-events: none; }
.guide-slide h2 { position: relative; margin: 0 0 12px; color: var(--guide-accent); font-size: 22px; font-weight: 600; line-height: 1.5; }
.guide-slide p { position: relative; margin: 0; color: #87735c; font-size: 12px; line-height: 1.95; }
.guide-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 16px; }
.guide-tags span { padding: 2px 7px; border: 1px solid #e5d8c5; border-radius: 5px; background: #f5ecdf80; color: #987f60; font-size: 10px; }
.guide-footer { justify-content: space-between; gap: 9px; min-height: 36px; padding-top: 10px; border-top: 1px dashed #daceba; }
.guide-dots { gap: 1px; flex-shrink: 0; }
.guide-dots button { display: grid; place-items: center; width: 22px; height: 26px; padding: 0; border: 0; background: transparent; cursor: pointer; }
.guide-dots button span { width: 5px; height: 5px; border-radius: 9px; background: #d4c6b2; transition: width .2s, background .2s; }
.guide-dots .active span { width: 17px; background: var(--guide-accent); }
.guide-caption { color: #a2917d; font-size: 9px; line-height: 1.6; }
.guide-pause { flex-shrink: 0; width: 26px; height: 26px; padding: 0; border: 1px solid #e3d6c2; border-radius: 50%; background: transparent; color: #9c8466; font-size: 11px; cursor: pointer; }
.guide-dots button:focus-visible, .guide-pause:focus-visible { outline: 2px solid var(--guide-accent); outline-offset: 2px; }
.guide-slide-enter-active, .guide-slide-leave-active { transition: opacity .2s, transform .2s; }
.guide-slide-enter-from { opacity: 0; transform: translateY(9px); }
.guide-slide-leave-to { opacity: 0; transform: translateY(-9px); }
@media (max-width: 980px) { .guide-card { padding: 20px 18px 12px; }.guide-viewport { min-height: 225px; } }
@media (max-width: 680px) { .guide-card { transform: none; box-shadow: 3px 4px 0 #e9dfcf; }.guide-viewport { min-height: 195px; }.guide-slide h2 { font-size: 21px; } }
@media (prefers-reduced-motion: reduce) {
  .guide-slide-enter-active, .guide-slide-leave-active, .guide-dots button span, .guide-heading i { transition: none; }
  .guide-slide-enter-from, .guide-slide-leave-to { transform: none; }
}
</style>
