<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { feedbackApi } from '@/api/feedback'

const router = useRouter()
const route = useRoute()
const menuOpen = ref(false)
const feedbackDialogVisible = ref(false)
const feedbackLoading = ref(false)
const feedbackSuccessVisible = ref(false)
let feedbackSuccessTimer: number | undefined
type FeedbackType = 'bug' | 'optimize' | 'request'

interface FeedbackForm {
  content: string
  feedback_type: FeedbackType
  contact: string
  page: string
}

const feedbackForm = ref<FeedbackForm>({
  content: '',
  feedback_type: 'bug',
  contact: '',
  page: ''
})

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
}

const handleMenuClick = (action: string) => {
  menuOpen.value = false
  switch (action) {
    case 'profile':
      router.push('/profile')
      break
    case 'trend':
      router.push('/trends')
      break
    case 'genius':
      router.push('/genius')
      break
    case 'notice':
      router.push('/notice')
      break
    case 'home':
      router.push('/')
      break
    case 'feedback':
      feedbackForm.value.page = route.fullPath
      feedbackDialogVisible.value = true
      break
    default:
      break
  }
}

const menuItems = [
  { id: 1, icon: '👤', label: 'Profile', action: 'profile' },
  { id: 2, icon: '📈', label: 'Trends', action: 'trend' },
  { id: 3, icon: '🧠', label: 'Genius', action: 'genius' },
  { id: 4, icon: '📌', label: 'Notice', action: 'notice' },
  { id: 5, icon: '🏠', label: 'Home', action: 'home' },
  { id: 6, icon: '📝', label: 'Feedback', action: 'feedback' }
]

const submitFeedback = async () => {
  if (!feedbackForm.value.content.trim()) {
    ElMessage.warning('请填写反馈内容')
    return
  }

  feedbackLoading.value = true
  try {
    const response = await feedbackApi.submitFeedback({
      content: feedbackForm.value.content.trim(),
      feedback_type: feedbackForm.value.feedback_type,
      page: feedbackForm.value.page || undefined,
      contact: feedbackForm.value.contact?.trim() || undefined
    })
    if (response.data.success) {
      feedbackSuccessVisible.value = true
      if (feedbackSuccessTimer) {
        window.clearTimeout(feedbackSuccessTimer)
      }
      feedbackSuccessTimer = window.setTimeout(() => {
        feedbackSuccessVisible.value = false
      }, 1800)
      feedbackDialogVisible.value = false
      feedbackForm.value.content = ''
      feedbackForm.value.feedback_type = 'bug'
      feedbackForm.value.contact = ''
    } else {
      ElMessage.error(response.data.message || '反馈提交失败')
    }
  } catch (error: any) {
    const message = error?.response?.data?.detail || '反馈提交失败'
    ElMessage.error(message)
  } finally {
    feedbackLoading.value = false
  }
}

const handleDialogClosed = () => {
  feedbackForm.value.content = ''
  feedbackForm.value.feedback_type = 'bug'
  feedbackForm.value.contact = ''
}
</script>

<template>
  <div class="floating-menu">
    <button class="fab" :class="{ active: menuOpen }" @click="toggleMenu">
      <span class="fab-icon" :class="{ rotate: menuOpen }">+</span>
      <span class="fab-ring"></span>
    </button>

    <transition name="menu">
      <div v-if="menuOpen" class="menu-items">
        <button
          v-for="item in menuItems"
          :key="item.id"
          class="menu-item"
          :title="item.label"
          @click="handleMenuClick(item.action)"
        >
          <span class="menu-icon">{{ item.icon }}</span>
          <span class="menu-label">{{ item.label }}</span>
        </button>
      </div>
    </transition>
  </div>

  <el-dialog
    v-model="feedbackDialogVisible"
    class="feedback-dialog"
    width="520px"
    @closed="handleDialogClosed"
  >
    <template #header>
      <div class="feedback-header">
        <span class="feedback-title">反馈问题</span>
        <span class="feedback-subtitle">帮助我们更快定位与优化体验</span>
      </div>
    </template>
    <el-form label-position="top" class="feedback-form">
      <el-form-item label="反馈类型">
        <el-select v-model="feedbackForm.feedback_type" placeholder="选择类型">
          <el-option label="Bug" value="bug" />
          <el-option label="优化" value="optimize" />
          <el-option label="需求" value="request" />
        </el-select>
      </el-form-item>
      <el-form-item label="反馈内容">
        <el-input
          v-model="feedbackForm.content"
          type="textarea"
          :rows="5"
          maxlength="500"
          show-word-limit
          placeholder="描述你遇到的问题或建议"
        />
      </el-form-item>
      <el-form-item label="联系方式（可选）">
        <el-input v-model="feedbackForm.contact" placeholder="邮箱 / 手机 / 其他" />
      </el-form-item>
      <el-form-item label="页面">
        <el-input v-model="feedbackForm.page" disabled />
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="feedback-actions">
        <el-button class="ghost-btn" @click="feedbackDialogVisible = false">取消</el-button>
        <el-button type="primary" class="primary-pill" :loading="feedbackLoading" @click="submitFeedback">
          提交反馈
        </el-button>
      </div>
    </template>
  </el-dialog>

  <transition name="feedback-success">
    <div v-if="feedbackSuccessVisible" class="feedback-success-overlay">
      <div class="feedback-success-card">
        <div class="feedback-success-svg">
          <svg viewBox="0 0 220 220" width="220" height="220" aria-hidden="true">
            <defs>
              <radialGradient id="haloGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="rgba(213, 106, 58, 0.35)" />
                <stop offset="100%" stop-color="rgba(31, 111, 120, 0)" />
              </radialGradient>
              <linearGradient id="thumbGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#f1a15b" />
                <stop offset="100%" stop-color="#d56a3a" />
              </linearGradient>
              <linearGradient id="accentGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#1f6f78" />
                <stop offset="100%" stop-color="#c45a2d" />
              </linearGradient>
            </defs>

            <circle class="halo-ring" cx="110" cy="110" r="70" fill="url(#haloGradient)" />
            <circle class="orbit orbit-1" cx="110" cy="110" r="82" />
            <circle class="orbit orbit-2" cx="110" cy="110" r="98" />

            <g class="spark spark-1">
              <circle cx="42" cy="64" r="4" />
              <circle cx="58" cy="54" r="3" />
            </g>
            <g class="spark spark-2">
              <circle cx="176" cy="56" r="4" />
              <circle cx="190" cy="74" r="3" />
            </g>
            <g class="spark spark-3">
              <circle cx="170" cy="162" r="4" />
              <circle cx="152" cy="176" r="3" />
            </g>

            <g class="thumb">
              <path
                d="M86 120c-4 0-8-3-8-7V94c0-7 4-13 10-17l12-8c4-3 10-2 13 2l10 15c2 3 5 4 8 4h20c9 0 16 7 16 16 0 2 0 4-1 6l-9 36c-2 8-9 13-17 13H93c-4 0-7-3-7-7v-28z"
                fill="url(#thumbGradient)"
              />
              <path
                d="M78 110h-10c-4 0-7 3-7 7v31c0 4 3 7 7 7h14v-45z"
                fill="url(#accentGradient)"
              />
              <path
                d="M140 84h-10c-4 0-7-2-9-5l-10-16"
                fill="none"
                stroke="rgba(255,255,255,0.65)"
                stroke-width="4"
                stroke-linecap="round"
              />
            </g>

            <path class="check-path" d="M82 114l16 16 36-38" />
          </svg>
        </div>
        <div class="feedback-success-title">提交成功</div>
        <div class="feedback-success-subtitle">谢谢你的反馈，我们会持续优化体验</div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.floating-menu {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 1000;
}

.fab {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: var(--ink);
  color: var(--bg);
  border: none;
  box-shadow: var(--shadow-md);
  cursor: pointer;
  display: grid;
  place-items: center;
  position: relative;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.fab:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 30px rgba(18, 14, 10, 0.35);
}

.fab-icon {
  font-size: 1.8rem;
  font-weight: 300;
  transition: transform 0.25s ease;
}

.fab-icon.rotate {
  transform: rotate(45deg);
}

.fab-ring {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 1px dashed rgba(255, 255, 255, 0.4);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.fab.active .fab-ring {
  opacity: 1;
}

.menu-items {
  position: absolute;
  bottom: 72px;
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  align-items: flex-end;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 1rem;
  background: var(--card);
  border: 1px solid var(--stroke);
  border-radius: 999px;
  box-shadow: var(--shadow-md);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  min-width: 170px;
  animation: slideIn 0.3s ease backwards;
}

.menu-item:nth-child(1) {
  animation-delay: 0.05s;
}
.menu-item:nth-child(2) {
  animation-delay: 0.1s;
}
.menu-item:nth-child(3) {
  animation-delay: 0.15s;
}
.menu-item:nth-child(4) {
  animation-delay: 0.2s;
}
.menu-item:nth-child(5) {
  animation-delay: 0.25s;
}
.menu-item:nth-child(6) {
  animation-delay: 0.3s;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.menu-item:hover {
  transform: translateX(-6px);
  box-shadow: 0 16px 30px rgba(18, 14, 10, 0.2);
}

.menu-icon {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--accent);
}

.menu-label {
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink);
}

.menu-enter-active,
.menu-leave-active {
  transition: all 0.3s ease;
}

.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

.feedback-dialog :deep(.el-dialog__header) {
  margin-right: 0;
}

.feedback-header {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.feedback-title {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
}

.feedback-subtitle {
  font-size: 0.85rem;
  color: var(--ink-soft);
}

.feedback-form :deep(.el-input__wrapper),
.feedback-form :deep(.el-select__wrapper),
.feedback-form :deep(.el-textarea__inner) {
  background: var(--bg);
  border: 1px solid var(--stroke);
  border-radius: 12px;
  box-shadow: none;
}

.feedback-form :deep(.el-textarea__inner) {
  color: var(--ink);
}

.feedback-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.ghost-btn {
  border-radius: 999px;
  border: 1px solid var(--stroke);
  color: var(--ink-soft);
  background: transparent;
}

.primary-pill {
  border-radius: 999px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 0.75rem;
  padding: 0.55rem 1.4rem;
  background: var(--ink);
  border-color: var(--ink);
  color: var(--bg);
}

.primary-pill:hover {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.feedback-success-overlay {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  z-index: 2000;
  pointer-events: none;
  background: radial-gradient(circle at center, rgba(18, 14, 10, 0.18), rgba(18, 14, 10, 0.45));
  backdrop-filter: blur(3px);
}

.feedback-success-card {
  background: var(--card);
  border: 1px solid var(--stroke);
  border-radius: 24px;
  padding: 2.2rem 2.8rem;
  text-align: center;
  box-shadow: 0 24px 50px rgba(18, 14, 10, 0.35);
  position: relative;
  overflow: hidden;
  animation: feedbackCardPop 0.6s ease;
}

.feedback-success-svg {
  display: grid;
  place-items: center;
  margin-bottom: 0.6rem;
}

.feedback-success-title {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 1.4rem;
  font-weight: 700;
  margin-bottom: 0.35rem;
}

.feedback-success-subtitle {
  font-size: 0.9rem;
  color: var(--ink-soft);
}

.feedback-success-svg svg {
  width: 200px;
  height: 200px;
}

.halo-ring {
  animation: haloPulse 1.8s ease-in-out infinite;
}

.orbit {
  fill: none;
  stroke: rgba(31, 111, 120, 0.35);
  stroke-width: 1.5;
  stroke-dasharray: 6 8;
  transform-origin: 110px 110px;
  animation: orbitSpin 6s linear infinite;
}

.orbit-2 {
  stroke: rgba(213, 106, 58, 0.3);
  animation-duration: 8s;
  animation-direction: reverse;
}

.spark circle {
  fill: rgba(213, 106, 58, 0.75);
}

.spark-2 circle {
  fill: rgba(31, 111, 120, 0.8);
}

.spark-3 circle {
  fill: rgba(213, 106, 58, 0.55);
}

.spark-1 {
  animation: sparkFloat 2.2s ease-in-out infinite;
}
.spark-2 {
  animation: sparkFloat 2.6s ease-in-out infinite;
}
.spark-3 {
  animation: sparkFloat 2.4s ease-in-out infinite;
}

.thumb {
  transform-origin: 110px 120px;
  animation: thumbLift 1.2s ease;
}

.check-path {
  fill: none;
  stroke: rgba(255, 255, 255, 0.7);
  stroke-width: 6;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 80;
  stroke-dashoffset: 80;
  animation: checkDraw 1s ease forwards 0.35s;
}

.feedback-success-enter-active,
.feedback-success-leave-active {
  transition: opacity 0.35s ease;
}

.feedback-success-enter-from,
.feedback-success-leave-to {
  opacity: 0;
}

@keyframes feedbackCardPop {
  0% {
    transform: scale(0.9) translateY(12px);
    opacity: 0;
  }
  60% {
    transform: scale(1.02) translateY(0);
    opacity: 1;
  }
  100% {
    transform: scale(1) translateY(0);
  }
}

@keyframes haloPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.08);
    opacity: 1;
  }
}

@keyframes orbitSpin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes sparkFloat {
  0%, 100% {
    transform: translateY(0);
    opacity: 0.7;
  }
  50% {
    transform: translateY(-6px);
    opacity: 1;
  }
}

@keyframes thumbLift {
  0% {
    transform: translateY(12px) scale(0.9);
    opacity: 0;
  }
  60% {
    transform: translateY(-4px) scale(1.02);
    opacity: 1;
  }
  100% {
    transform: translateY(0) scale(1);
  }
}

@keyframes checkDraw {
  to {
    stroke-dashoffset: 0;
  }
}
</style>
