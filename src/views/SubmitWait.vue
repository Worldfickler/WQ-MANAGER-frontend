<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import SubmitWaitCard from '@/components/SubmitWaitCard.vue'
import SubmitWaitGuide from '@/components/SubmitWaitGuide.vue'
import SubmitWaitHeat from '@/components/SubmitWaitHeat.vue'
import SubmitWaitStickerPicker from '@/components/SubmitWaitStickerPicker.vue'
import SubmitWaitStickerImages from '@/components/SubmitWaitStickerImages.vue'
import { submitWaitApi as api } from '@/api/submitWait'
import { decisionLabels } from '@/constants/submitWait'
import type { Decision, FeedScope, PostStatus, SubmitGroup, SubmitPost, SubmitStats, SubmitVote, SubmitSticker } from '@/types/submitWait'

const route = useRoute()
const router = useRouter()
const scope = ref<FeedScope>('all')
const scopes: { key: FeedScope; label: string }[] = [
  { key: 'all', label: '评审广场' }, { key: 'mine', label: '我的申请' }, { key: 'reviewed', label: '我已评审' },
  { key: 'watched', label: '我在围观' }
]
const feedCaptions: Record<FeedScope, string> = {
  all: '按已评人数从高到低排列 · 人数相同则最新发布优先',
  mine: '记录每个 Alpha 从犹豫到决定的过程。',
  reviewed: '你参与过的判断，都留在这里。',
  watched: '你围观过的申请都在这里，可随时回来查看意见。'
}
const groupId = ref(0)
const status = ref<PostStatus | 'all'>('all')
const search = ref('')
const page = ref(1)
const posts = ref<SubmitPost[]>([])
const total = ref(0)
const loading = ref(false)
const feedError = ref('')
const stats = ref<SubmitStats | null>(null)
const groups = ref<SubmitGroup[]>([])
let feedRequest = 0

const errorMessage = (error: unknown, fallback: string): string => {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  return typeof detail === 'string' ? detail : fallback
}
const formatDate = (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false })
const statusLabel = { open: '等待评审', submitted: '作者已提交', held: '继续打磨' }
const selectedGroup = computed(() => groups.value.find(group => group.id === groupId.value))
const blocked = ref<string[]>([])
let blockStorageKey = 'submit-wait:blocked'
try {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  blockStorageKey += `:${user.wq_id || 'anonymous'}`
  const value: unknown = JSON.parse(localStorage.getItem(blockStorageKey) || '[]')
  if (Array.isArray(value)) blocked.value = value.filter((item): item is string => typeof item === 'string' && item.length <= 30).slice(0, 20)
} catch { /* Use an empty filter if local preferences cannot be read. */ }

async function loadFeed() {
  const request = ++feedRequest
  loading.value = true
  feedError.value = ''
  try {
    const response = await api.posts({ scope: scope.value, group_id: groupId.value || undefined,
      status: status.value === 'all' ? undefined : status.value, search: search.value.trim(), blocked: blocked.value, page: page.value })
    if (request !== feedRequest) return
    posts.value = response.data.items
    total.value = response.data.total
    if (page.value > 1 && !posts.value.length) {
      page.value = Math.max(1, Math.ceil(total.value / 12))
      await loadFeed()
    }
  } catch (error) {
    if (request === feedRequest) feedError.value = errorMessage(error, '申请加载失败，请稍后重试')
  } finally {
    if (request === feedRequest) loading.value = false
  }
}
function reloadFeed() { page.value = 1; void loadFeed() }
async function loadStats() {
  try { stats.value = (await api.stats()).data } catch { stats.value = null }
}
async function loadGroups() {
  try { groups.value = (await api.groups()).data }
  catch (error) { ElMessage.error(errorMessage(error, '小组加载失败')) }
}
watch([scope, groupId, status], reloadFeed)

const composeVisible = ref(false)
const publishing = ref(false)
const draft = reactive({ title: '', content: '', anonymous: true, group_id: 0 })
interface DraftImage { file: File; url: string; id?: number }
const draftImages = ref<DraftImage[]>([])
const fileInput = ref<HTMLInputElement>()
function resetDraft() {
  draftImages.value.forEach(image => URL.revokeObjectURL(image.url))
  draftImages.value = []
  draft.title = ''; draft.content = ''; draft.anonymous = true; draft.group_id = groupId.value
}
function openCompose() { resetDraft(); composeVisible.value = true }
function addImages(files: File[]): boolean {
  if (publishing.value || !files.length) return false
  if (draftImages.value.length + files.length > 9) { ElMessage.warning('最多上传 9 张图片'); return false }
  if (files.some(file => !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type))) {
    ElMessage.warning('请选择 PNG、JPEG、GIF 或 WebP 图片'); return false
  }
  if (files.some(file => file.size === 0 || file.size > 10 * 1024 * 1024)) {
    ElMessage.warning('图片不能为空，且每张不能超过 10MB'); return false
  }
  draftImages.value.push(...files.map(file => ({ file, url: URL.createObjectURL(file) })))
  return true
}
function selectImages(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  addImages(files)
}
function pasteImages(event: ClipboardEvent) {
  if (!composeVisible.value || publishing.value || event.defaultPrevented || !event.clipboardData) return
  const clipboard = event.clipboardData
  let images = Array.from(clipboard.items || [])
    .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
    .map(item => item.getAsFile())
    .filter((file): file is File => file !== null)
  if (!images.length) images = Array.from(clipboard.files || []).filter(file => file.type.startsWith('image/'))
  if (!images.length) return
  event.preventDefault()
  if (addImages(images)) ElMessage.success(`已粘贴 ${images.length} 张图片`)
}
function removeImage(index: number) {
  if (publishing.value) return
  URL.revokeObjectURL(draftImages.value[index].url)
  draftImages.value.splice(index, 1)
}
async function publish() {
  if (publishing.value) return
  if (!draft.title.trim() || !draft.content.trim()) { ElMessage.warning('请填写 Alpha 标题和说明'); return }
  publishing.value = true
  try {
    const pending = draftImages.value.filter(image => image.id === undefined)
    if (pending.length) {
      const uploaded = (await api.upload(pending.map(image => image.file))).data
      pending.forEach((image, index) => { image.id = uploaded[index].id })
    }
    const post = (await api.create({ title: draft.title.trim(), content: draft.content.trim(),
      anonymous: draft.anonymous, group_id: draft.group_id || null, image_ids: draftImages.value.map(image => image.id!) })).data
    composeVisible.value = false
    ElMessage.success('已发布，等待大家的独立判断')
    await Promise.all([loadFeed(), loadStats()])
    await openPost(post.id)
  } catch (error) { ElMessage.error(errorMessage(error, '发布失败，内容已保留，请重试')) }
  finally { publishing.value = false }
}

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const activeId = ref<number | null>(null)
const active = ref<SubmitPost | null>(null)
const votes = ref<SubmitVote[]>([])
const voteTotal = ref(0)
const votePage = ref(1)
const votesLoading = ref(false)
const votesError = ref('')
const decision = ref<Decision | null>(null)
const reason = ref('')
const selectedStickers = ref<SubmitSticker[]>([])
const voting = ref(false)
const watchingIds = reactive(new Set<number>())
const drawing = ref(false)
const lastDrawnId = ref<number | null>(null)
const drawnPostId = ref<number | null>(null)
let detailRequest = 0
let votesRequest = 0
const canVote = computed(() => active.value && !active.value.is_owner && !active.value.my_decision && !active.value.has_watched && active.value.status === 'open')
const submitPercent = computed(() => active.value?.review_count
  ? Math.round((active.value.submit_count || 0) / active.value.review_count * 100) : 0)

async function openPost(id: number) {
  const request = ++detailRequest
  ++votesRequest
  activeId.value = id
  active.value = null
  votes.value = []
  voteTotal.value = 0; votePage.value = 1; decision.value = null; reason.value = ''
  selectedStickers.value = []
  detailError.value = ''; votesError.value = ''
  detailVisible.value = true; detailLoading.value = true
  void router.replace({ query: { ...route.query, post: String(id) } })
  try {
    const post = (await api.post(id)).data
    if (request !== detailRequest) return
    active.value = post
    if (post.results_visible) await loadVotes(1)
  } catch (error) {
    if (request === detailRequest) detailError.value = errorMessage(error, '申请加载失败')
  } finally { if (request === detailRequest) detailLoading.value = false }
}
async function drawRandomPost() {
  if (drawing.value || voting.value || watchingIds.size) return
  drawing.value = true
  try {
    const post = (await api.randomPost({ group_id: groupId.value || undefined,
      blocked: blocked.value, exclude_id: lastDrawnId.value || undefined })).data
    if (!post) {
      ElMessage.info('当前广场或小组暂时没有可抽取的待评审 Alpha，稍后再来看看吧')
      return
    }
    lastDrawnId.value = post.id
    drawnPostId.value = post.id
    await openPost(post.id)
  } catch (error) { ElMessage.error(errorMessage(error, '抽卡失败，请稍后重试')) }
  finally { drawing.value = false }
}
async function loadVotes(targetPage = 1) {
  if (!active.value?.results_visible) return
  const id = active.value.id
  const request = ++votesRequest
  votesLoading.value = true; votesError.value = ''
  try {
    const response = await api.votes(id, targetPage)
    if (request !== votesRequest || active.value?.id !== id) return
    votes.value = response.data.items; voteTotal.value = response.data.total; votePage.value = targetPage
  } catch (error) {
    if (request === votesRequest) votesError.value = errorMessage(error, '评审意见加载失败')
  } finally { if (request === votesRequest) votesLoading.value = false }
}
function replacePost(post: SubmitPost) {
  if (activeId.value === post.id) active.value = post
  posts.value = posts.value.map(item => item.id === post.id ? post : item)
}
async function confirmWatch(id: number) {
  if (watchingIds.has(id) || voting.value) return
  watchingIds.add(id)
  try {
    await ElMessageBox.confirm('围观后可以查看其他人的评审意见，但你将永久失去这条申请的评审资格。此操作无法撤销，是否继续？', '确认围观', {
      confirmButtonText: '确认围观', cancelButtonText: '暂不围观', type: 'warning',
      distinguishCancelAndClose: true
    })
    const post = (await api.watch(id)).data
    replacePost(post)
    ElMessage.success(post.has_watched ? '已进入围观，本条申请无法再评审' : '你已可查看这条申请的评审意见')
    await openPost(id)
    await loadFeed()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(errorMessage(error, '围观失败，请重试'))
  } finally { watchingIds.delete(id) }
}
async function castVote() {
  if (!active.value || !canVote.value || !decision.value || voting.value || drawing.value || watchingIds.has(active.value.id)) return
  if (!reason.value.trim()) { ElMessage.warning('请说明判断理由'); return }
  const id = active.value.id
  voting.value = true
  try {
    const post = (await api.vote(id, decision.value, reason.value.trim(), selectedStickers.value.map(item => item.id))).data
    replacePost(post)
    ElMessage.success('评审已提交，现在可以查看其他人的意见')
    if (activeId.value === id) await loadVotes(1)
    await Promise.all([loadStats(), loadFeed()])
  } catch (error) {
    ElMessage.error(errorMessage(error, '评审提交失败，请重试'))
    const code = (error as { response?: { status: number } })?.response?.status
    if (code === 409 || code === 403) {
      try { replacePost((await api.post(id)).data) } catch { /* Retain the current form on a network failure. */ }
    }
  } finally { voting.value = false }
}
const flowering = reactive(new Set<number>())
async function sendFlower(vote: SubmitVote) {
  if (!active.value || vote.flowered || vote.is_mine || flowering.has(vote.id)) return
  flowering.add(vote.id)
  try { Object.assign(vote, (await api.flower(active.value.id, vote.id)).data) }
  catch (error) { ElMessage.error(errorMessage(error, '送花失败')) }
  finally { flowering.delete(vote.id) }
}
function detailClosed() {
  if (detailVisible.value) return
  ++detailRequest; ++votesRequest
  activeId.value = null; active.value = null; votes.value = []
  selectedStickers.value = []
  const query = { ...route.query }; delete query.post
  void router.replace({ query })
}
async function sharePost() {
  if (!active.value) return
  const url = new URL(router.resolve({ path: '/submit-wait', query: { post: active.value.id } }).href, window.location.origin).href
  try { await navigator.clipboard.writeText(url); ElMessage.success('申请链接已复制') }
  catch { await ElMessageBox.alert(url, '申请链接', { confirmButtonText: '关闭' }) }
}

const outcomeVisible = ref(false)
const outcomeStatus = ref<'submitted' | 'held'>('held')
const outcomeNote = ref('')
const outcomeLoading = ref(false)
function openOutcome(value: 'submitted' | 'held') {
  outcomeStatus.value = value; outcomeNote.value = ''; outcomeVisible.value = true
}
async function saveOutcome() {
  if (!active.value || outcomeLoading.value) return
  outcomeLoading.value = true
  try {
    replacePost((await api.outcome(active.value.id, outcomeStatus.value, outcomeNote.value.trim())).data)
    outcomeVisible.value = false
    ElMessage.success('已记录最终决定，本次评审结束')
    await Promise.all([loadFeed(), loadStats()])
  } catch (error) { ElMessage.error(errorMessage(error, '记录失败')) }
  finally { outcomeLoading.value = false }
}
async function withdraw() {
  if (!active.value) return
  const id = active.value.id
  try {
    await ElMessageBox.confirm('撤回后，其他用户将无法查看这条申请及评审意见。', '撤回申请', {
      confirmButtonText: '确认撤回', cancelButtonText: '保留申请', type: 'warning'
    })
    await api.remove(id)
    detailVisible.value = false
    ElMessage.success('申请已撤回')
    await Promise.all([loadFeed(), loadStats()])
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(errorMessage(error, '撤回失败'))
  }
}

const groupDialog = ref(false)
const groupName = ref('')
const inviteCode = ref('')
const groupBusy = ref(false)
async function createGroup() {
  if (groupBusy.value || !groupName.value.trim()) return
  groupBusy.value = true
  try {
    const group = (await api.createGroup(groupName.value.trim())).data
    groups.value = [group, ...groups.value]; groupName.value = ''; groupId.value = group.id
    ElMessage.success('小组已创建，可以分享邀请码邀请朋友')
  } catch (error) { ElMessage.error(errorMessage(error, '创建失败')) }
  finally { groupBusy.value = false }
}
async function joinGroup() {
  if (groupBusy.value || !inviteCode.value.trim()) return
  groupBusy.value = true
  try {
    groups.value = (await api.joinGroup(inviteCode.value.trim())).data
    const group = groups.value.find(item => item.invite_code.toUpperCase() === inviteCode.value.trim().toUpperCase())
    if (group) groupId.value = group.id
    inviteCode.value = ''; groupDialog.value = false; ElMessage.success('已加入小组')
  } catch (error) { ElMessage.error(errorMessage(error, '加入失败')) }
  finally { groupBusy.value = false }
}
async function copyInvite(code: string) {
  try { await navigator.clipboard.writeText(code); ElMessage.success('邀请码已复制') }
  catch { ElMessage.info('请长按或选中邀请码复制') }
}
const blockDialog = ref(false)
const blockText = ref('')
function openBlockDialog() { blockText.value = blocked.value.join('\n'); blockDialog.value = true }
function saveBlocked() {
  const words = [...new Set(blockText.value.split(/[,，\n]/).map(word => word.trim()).filter(Boolean))]
  if (words.length > 20 || words.some(word => word.length > 30)) { ElMessage.warning('最多 20 个屏蔽词，每个不超过 30 字'); return }
  blocked.value = words
  try { localStorage.setItem(blockStorageKey, JSON.stringify(words)) }
  catch { ElMessage.info('浏览器未能保存偏好，本次筛选仍然生效') }
  blockDialog.value = false; reloadFeed()
}

onMounted(() => {
  document.addEventListener('paste', pasteImages)
  void Promise.all([loadFeed(), loadStats(), loadGroups()])
  const id = Number(route.query.post)
  if (Number.isInteger(id) && id > 0) void openPost(id)
})
onBeforeUnmount(() => {
  document.removeEventListener('paste', pasteImages)
  ++feedRequest; ++detailRequest; ++votesRequest; resetDraft()
})
</script>

<template>
  <div class="submit-wait-page">
    <header class="page-nav">
      <router-link to="/" class="back-link">← WQ Manager</router-link>
      <span class="edition">ALPHA COMMUNITY / 01</span>
    </header>

    <section class="sw-hero">
      <div class="hero-copy">
        <div class="eyebrow"><span></span> BEFORE YOU SUBMIT</div>
        <h1>Submit<span>请等等</span><i>↗</i></h1>
        <p class="hero-question">不行了，不行了，忍不住了，<strong>到底能不能交哇？</strong></p>
        <p class="hero-description">交之前，听听大家怎么说。<br />把 Alpha 的思路与回测分享出来，让每一次提交多一份把握。</p>
        <div class="hero-actions">
          <el-button class="publish-button" type="primary" size="large" @click="openCompose">＋ 发布我的 Alpha 评审</el-button>
          <el-button class="draw-button" size="large" :loading="drawing" @click="drawRandomPost">
            <svg v-if="!drawing" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" stroke-width="1.5" /><g fill="currentColor"><circle cx="8" cy="8" r="1.3"/><circle cx="16" cy="8" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="8" cy="16" r="1.3"/><circle cx="16" cy="16" r="1.3"/></g></svg>
            {{ drawing ? '正在抽卡' : '随机抽卡' }}
          </el-button>
        </div>
        <p class="draw-hint">从{{ selectedGroup ? `「${selectedGroup.name}」` : '公开广场' }}随机抽一份待评审 Alpha，帮 TA 拿个主意。</p>
      </div>
      <SubmitWaitGuide :paused="composeVisible || detailVisible || groupDialog || blockDialog" />
    </section>

    <section class="personal-stats" aria-label="我的评审统计">
      <div><span>我的申请</span><strong>{{ stats?.posts ?? '—' }}</strong></div>
      <div><span>参与评审</span><strong>{{ stats?.reviewed ?? '—' }}</strong></div>
      <div><span>最终已提交</span><strong>{{ stats?.submitted ?? '—' }}</strong></div>
      <div><span>选择再打磨</span><strong>{{ stats?.held ?? '—' }}</strong></div>
    </section>

    <section class="feed-section" aria-label="Alpha 申请列表">
      <div class="feed-heading">
        <div class="feed-tabs" role="tablist" aria-label="申请范围">
          <button v-for="item in scopes" :key="item.key" role="tab" :aria-selected="scope === item.key"
            :class="{ selected: scope === item.key }" @click="scope = item.key">{{ item.label }}</button>
        </div>
        <button class="text-button" @click="groupDialog = true">好友小组 ↗</button>
      </div>
      <div class="feed-filters">
        <el-input v-model="search" class="search-input" placeholder="搜索 Alpha 标题或内容" clearable @keyup.enter="reloadFeed" @clear="reloadFeed">
          <template #append><button class="search-button" aria-label="搜索" @click="reloadFeed">搜索</button></template>
        </el-input>
        <el-select v-model="groupId" class="group-filter" aria-label="选择广场或小组">
          <el-option label="公开广场" :value="0" />
          <el-option v-for="group in groups" :key="group.id" :label="group.name" :value="group.id" />
        </el-select>
        <el-select v-model="status" class="status-filter" aria-label="筛选申请状态">
          <el-option label="全部状态" value="all" /><el-option label="等待评审" value="open" />
          <el-option label="作者已提交" value="submitted" /><el-option label="继续打磨" value="held" />
        </el-select>
        <button class="text-button filter-button" @click="openBlockDialog">屏蔽词{{ blocked.length ? ` (${blocked.length})` : '' }}</button>
      </div>
      <div v-if="selectedGroup" class="group-banner">
        <span>{{ selectedGroup.name }} · {{ selectedGroup.member_count }} 位成员 · 仅小组成员可见</span>
        <button class="text-button" @click="copyInvite(selectedGroup.invite_code)">复制邀请码</button>
      </div>
      <div class="feed-caption"><span>{{ feedCaptions[scope] }}</span><span>{{ total }} 份申请</span></div>

      <div v-if="loading" class="post-grid" aria-busy="true" aria-label="正在加载申请">
        <div v-for="index in 6" :key="index" class="skeleton-card"><el-skeleton :rows="5" animated /></div>
      </div>
      <div v-else-if="feedError" class="empty-state" role="alert"><strong>暂时没能加载申请</strong><p>{{ feedError }}</p><el-button @click="loadFeed">重新加载</el-button></div>
      <div v-else-if="!posts.length" class="empty-state">
        <span class="empty-alpha">α</span><strong>{{ search || status !== 'all' || (scope === 'all' && blocked.length) ? '没有符合筛选条件的申请' : scope === 'watched' ? '还没有围观过的 Alpha' : '这里还在等第一份 Alpha' }}</strong>
        <p>{{ scope === 'reviewed' ? '去评审广场，留下你的第一个独立判断。' : scope === 'watched' ? '去广场选择感兴趣的申请，围观后即可查看评审意见。' : '把想提交又有些犹豫的 Alpha 放上来，一起聊聊。' }}</p>
        <el-button v-if="scope === 'all' || scope === 'mine'" type="primary" @click="openCompose">发布我的 Alpha 评审</el-button>
        <el-button v-else @click="scope = 'all'">去评审广场</el-button>
      </div>
      <div v-else class="post-grid"><SubmitWaitCard v-for="post in posts" :key="post.id" :post="post" :watching="watchingIds.has(post.id)" @open="openPost" @watch="confirmWatch" /></div>
      <el-pagination v-if="total > 12" v-model:current-page="page" :page-size="12" :total="total" layout="prev, pager, next" class="feed-pagination" @current-change="loadFeed" />
    </section>
    <footer class="page-footer"><span>SUBMIT, WITH A SECOND THOUGHT.</span><p>一个 Alpha，一份思考，一群同行。</p></footer>

    <el-dialog v-model="composeVisible" title="发布我的 Alpha 评审" width="min(660px, 94vw)" top="5vh" class="sw-dialog"
      :close-on-click-modal="!publishing" :close-on-press-escape="!publishing" :show-close="!publishing" @closed="resetDraft">
      <el-alert class="privacy-notice" title="发布前，请先隐藏敏感信息" type="warning" :closable="false" show-icon
        description="请勿发布完整 Alpha 表达式、源代码、账号信息、密码或密钥。建议仅分享逻辑概述、回测指标和已脱敏截图。匿名发布只隐藏作者身份，不会自动处理文字或图片中的敏感内容。" />
      <el-form label-position="top" @submit.prevent="publish">
        <el-form-item label="Alpha 标题" required><el-input v-model="draft.title" maxlength="120" show-word-limit placeholder="例如：这个低换手 Alpha，现在值得交吗？" :disabled="publishing" /></el-form-item>
        <el-form-item label="思路与说明" required><el-input v-model="draft.content" type="textarea" :rows="7" maxlength="10000" show-word-limit :disabled="publishing"
          placeholder="仅介绍逻辑概述、Sharpe / Fitness / Turnover、测试范围和待判断的问题。请勿粘贴完整表达式、源代码、账号或密钥。" /></el-form-item>
        <el-form-item label="回测截图 / 补充图片">
          <div class="paste-zone" tabindex="0" role="group" aria-label="图片区域，可直接粘贴截图" :aria-disabled="publishing">
            <div class="draft-images"><div v-for="(image, index) in draftImages" :key="image.url" class="draft-image">
              <img :src="image.url" :alt="`待发布图片 ${index + 1}`" /><button type="button" :disabled="publishing" :aria-label="`移除图片 ${index + 1}`" @click="removeImage(index)">×</button>
            </div><button v-if="draftImages.length < 9" type="button" class="add-image" :disabled="publishing" @click="fileInput?.click()">＋<small>选择图片</small></button></div>
            <p class="paste-hint">截图后，在此窗口内按 <kbd>Ctrl</kbd> + <kbd>V</kbd> 直接粘贴，Mac 使用 <kbd>⌘V</kbd>。</p>
          </div>
          <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/gif,image/webp" multiple hidden :disabled="publishing" @change="selectImages" />
          <p class="form-hint">最多 9 张，每张不超过 10MB；支持 PNG、JPEG、GIF、WebP。</p>
          <p class="screenshot-privacy-hint">粘贴或上传前，请先裁剪或遮挡截图中的表达式、账号、密钥等敏感信息。</p>
        </el-form-item>
        <div class="form-row"><el-form-item label="发布到"><el-select v-model="draft.group_id" :disabled="publishing">
          <el-option label="公开广场 · 所有登录用户可见" :value="0" /><el-option v-for="group in groups" :key="group.id" :label="`${group.name} · 仅成员可见`" :value="group.id" />
        </el-select></el-form-item><el-form-item label="作者身份"><el-switch v-model="draft.anonymous" active-text="匿名发布" :disabled="publishing" /></el-form-item></div>
      </el-form>
      <template #footer><p class="publish-privacy-hint">发布前，请再检查一次文字和截图是否已脱敏。</p><el-button :disabled="publishing" @click="composeVisible = false">取消</el-button><el-button type="primary" :loading="publishing" @click="publish">{{ publishing ? '正在上传并发布' : '发布，听听大家的意见' }}</el-button></template>
    </el-dialog>

    <el-drawer v-model="detailVisible" title="Alpha 评审" size="min(680px, 100vw)" class="sw-drawer" @closed="detailClosed">
      <div v-if="detailLoading" class="detail-loading"><el-skeleton :rows="10" animated /></div>
      <div v-else-if="detailError" class="empty-state" role="alert"><p>{{ detailError }}</p><el-button @click="activeId && openPost(activeId)">重试</el-button></div>
      <div v-else-if="active" class="detail-body">
        <div v-if="drawnPostId === active.id" class="draw-result"><span>随机抽到的 Alpha · 来帮 TA 拿个主意</span><el-button size="small" :loading="drawing" :disabled="voting || watchingIds.size > 0" @click="drawRandomPost">再抽一张</el-button></div>
        <div class="detail-meta"><span>{{ active.author_name }}{{ active.is_owner ? ' · 我的申请' : '' }}</span><span>{{ statusLabel[active.status] }}</span></div>
        <h2 class="detail-title">{{ active.title }}</h2>
        <p class="detail-date">{{ formatDate(active.created_at) }} · {{ active.group_name || '公开广场' }}</p>
        <div class="detail-content">{{ active.content }}</div>
        <div v-if="active.images.length" class="detail-images"><el-image v-for="(image, index) in active.images" :key="image.id" :src="image.url" fit="contain"
          :preview-src-list="active.images.map(item => item.url)" :initial-index="index" :alt="`Alpha 补充图片 ${index + 1}`" preview-teleported /></div>
        <div class="detail-tools"><div class="detail-activity"><span>{{ active.review_count }} 人已评审</span><SubmitWaitHeat :count="active.review_count" /><span v-if="active.watch_count">{{ active.watch_count }} 人围观</span></div><button class="text-button" @click="sharePost">分享申请 ↗</button></div>

        <section v-if="active.status !== 'open'" class="outcome-panel"><strong>{{ active.status === 'submitted' ? '作者的决定：已经提交' : '作者的决定：继续打磨' }}</strong>
          <p v-if="active.outcome_note">{{ active.outcome_note }}</p><small v-if="active.closed_at">{{ formatDate(active.closed_at) }} · 本次评审已结束</small></section>

        <section v-if="canVote" class="voting-panel">
          <h3>这个 Alpha，你觉得该交吗？</h3><p class="form-hint">先留下独立判断，提交后就能看到其他人的意见。</p>
          <div class="decision-options"><button :class="['decision-option', 'submit', { chosen: decision === 'submit' }]" :aria-pressed="decision === 'submit'" :disabled="voting || drawing" @click="decision = 'submit'">{{ decisionLabels.submit }}<small>表现与思路已经准备好</small></button>
            <button :class="['decision-option', 'hold', { chosen: decision === 'hold' }]" :aria-pressed="decision === 'hold'" :disabled="voting || drawing" @click="decision = 'hold'">{{ decisionLabels.hold }}<small>再验证一下，或许更稳妥</small></button></div>
          <label class="reason-label" for="review-reason">说说你的理由 <span>必填</span></label>
          <el-input id="review-reason" v-model="reason" type="textarea" :rows="4" maxlength="1000" show-word-limit :disabled="voting || drawing" placeholder="你的依据是什么？有哪些值得肯定或需要继续验证的地方？" />
          <SubmitWaitStickerPicker v-model="selectedStickers" :disabled="voting || drawing || watchingIds.has(active.id)" />
          <el-button class="vote-submit" type="primary" :disabled="!decision || !reason.trim() || drawing || watchingIds.has(active.id)" :loading="voting" @click="castVote">提交我的评审</el-button>
        </section>

        <section v-if="!active.results_visible" class="spectate-panel">
          <div><h3>想先看看大家怎么说？</h3><p>选择围观即可查看评审意见，但本条申请将无法再评审，且不能撤销。</p></div>
          <el-button :loading="watchingIds.has(active.id)" :disabled="voting" @click="confirmWatch(active.id)">围观，查看意见</el-button>
        </section>
        <section v-if="active.results_visible" class="results-panel">
          <div class="results-heading"><h3>大家的独立判断</h3><small v-if="active.my_decision">你已选择「{{ decisionLabels[active.my_decision] }}」</small><small v-else-if="active.has_watched">已围观 · 本条申请不可再评审</small></div>
          <div class="result-totals"><span>{{ decisionLabels.submit }}<b>{{ active.submit_count }}</b></span><span>{{ decisionLabels.hold }}<b>{{ active.hold_count }}</b></span></div>
          <div v-if="active.review_count" class="result-bar" role="img" :aria-label="`${decisionLabels.submit} ${submitPercent}%，${decisionLabels.hold} ${100 - submitPercent}%`"><span :style="{ width: `${submitPercent}%` }"></span></div>
          <div v-if="votesLoading" class="opinions-loading"><el-skeleton :rows="3" animated /></div>
          <div v-else-if="votesError" class="opinions-empty" role="alert"><p>{{ votesError }}</p><el-button size="small" @click="loadVotes(votePage)">重新加载意见</el-button></div>
          <p v-else-if="!votes.length" class="opinions-empty">还没有评审意见，等大家来看看。</p>
          <article v-for="vote in votesLoading || votesError ? [] : votes" :key="vote.id" class="opinion">
            <div class="opinion-heading"><span>{{ vote.reviewer_name }}{{ vote.is_mine ? ' · 我' : '' }}</span><span :class="vote.decision">{{ decisionLabels[vote.decision] }}</span></div>
            <p>{{ vote.reason }}</p><SubmitWaitStickerImages :stickers="vote.stickers" /><footer><time>{{ formatDate(vote.created_at) }}</time><button class="flower-button" :class="{ flowered: vote.flowered }" :disabled="vote.is_mine || vote.flowered || flowering.has(vote.id)" @click="sendFlower(vote)">✿ {{ vote.flowered ? '已送花' : '有帮助' }} {{ vote.flower_count || '' }}</button></footer>
          </article>
          <el-pagination v-if="voteTotal > 20" :current-page="votePage" :page-size="20" :total="voteTotal" layout="prev, pager, next" @current-change="loadVotes" />
        </section>

        <section v-if="active.is_owner" class="author-actions"><template v-if="active.status === 'open'"><h3>想好了，就记录你的决定</h3><p>反馈最终选择后，评审将结束。</p><div><el-button type="primary" @click="openOutcome('submitted')">我已经提交了</el-button><el-button @click="openOutcome('held')">我决定再打磨</el-button></div></template>
          <button class="withdraw-button" @click="withdraw">撤回这份申请</button></section>
      </div>
    </el-drawer>

    <el-dialog v-model="outcomeVisible" title="记录最终决定" width="min(480px, 94vw)" :close-on-click-modal="!outcomeLoading" :close-on-press-escape="!outcomeLoading" :show-close="!outcomeLoading">
      <p class="outcome-confirm">{{ outcomeStatus === 'submitted' ? '记录为「已经提交」' : '记录为「继续打磨」' }}，同时结束本次评审。</p>
      <el-input v-model="outcomeNote" type="textarea" :rows="4" maxlength="1000" show-word-limit placeholder="补充一下最终想法或后续结果（可选）" :disabled="outcomeLoading" />
      <template #footer><el-button :disabled="outcomeLoading" @click="outcomeVisible = false">取消</el-button><el-button type="primary" :loading="outcomeLoading" @click="saveOutcome">确认记录</el-button></template>
    </el-dialog>

    <el-dialog v-model="groupDialog" title="好友小组" width="min(560px, 94vw)" :close-on-click-modal="!groupBusy" :close-on-press-escape="!groupBusy" :show-close="!groupBusy">
      <p class="group-intro">在小组里发布的 Alpha 仅成员可见，把邀请码交给你想一起讨论的朋友。</p>
      <div class="group-form"><label for="new-group">新建小组</label><div><el-input id="new-group" v-model="groupName" maxlength="60" placeholder="给小组起个名字" :disabled="groupBusy" @keyup.enter="createGroup" /><el-button type="primary" :loading="groupBusy" :disabled="!groupName.trim()" @click="createGroup">创建</el-button></div></div>
      <div class="group-form"><label for="join-code">通过邀请码加入</label><div><el-input id="join-code" v-model="inviteCode" maxlength="16" placeholder="输入朋友分享的邀请码" :disabled="groupBusy" @keyup.enter="joinGroup" /><el-button :loading="groupBusy" :disabled="!inviteCode.trim()" @click="joinGroup">加入</el-button></div></div>
      <div v-if="groups.length" class="my-groups"><h4>我加入的小组</h4><div v-for="group in groups" :key="group.id" class="group-row"><div><strong>{{ group.name }}</strong><small>{{ group.member_count }} 位成员 · <code>{{ group.invite_code }}</code></small></div><button class="text-button" @click="copyInvite(group.invite_code)">复制邀请</button></div></div>
    </el-dialog>

    <el-dialog v-model="blockDialog" title="广场屏蔽词" width="min(480px, 94vw)"><p class="group-intro">在广场隐藏包含这些词的申请，不影响个人列表。每行一个，最多 20 个。</p><el-input v-model="blockText" type="textarea" :rows="6" placeholder="例如：某个你暂时不关注的市场或主题" />
      <template #footer><el-button @click="blockDialog = false">取消</el-button><el-button type="primary" @click="saveBlocked">保存筛选</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped>
.detail-activity { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.detail-tools > .text-button { flex-shrink: 0; }
.spectate-panel { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; margin-top: 25px; padding: 18px; background: #eee7da80; border: 1px solid #dbcdb8; border-radius: 10px; }
.spectate-panel > div { flex: 1; min-width: 180px; }
.spectate-panel h3 { font-size: 14px; font-weight: 600; color: #6d5c46; }
.spectate-panel p { margin-top: 6px; font-size: 12px; line-height: 1.8; color: #927b60; }
.feed-heading { flex-wrap: wrap; }
.feed-tabs button { white-space: nowrap; }
.submit-wait-page { --el-color-primary: #d56a3a; --el-color-primary-light-3: #e19878; --el-color-primary-dark-2: #b4532b; max-width: 1240px; margin: 0 auto; padding: 30px 40px 60px; position: relative; z-index: 1; font-family: 'Newsreader', 'Microsoft YaHei', sans-serif; }
.page-nav { display: flex; align-items: center; justify-content: space-between; padding-bottom: 30px; }.back-link { color: var(--ink-soft); text-decoration: none; font-size: 13px; }.back-link:hover { color: var(--accent); }.edition { font-size: 10px; letter-spacing: 2px; color: #907e68; }
.sw-hero { display: grid; grid-template-columns: 1fr 340px; gap: 50px; padding: 34px 0 40px; align-items: center; }
.eyebrow { display: flex; align-items: center; gap: 9px; color: var(--accent-2); font-size: 10px; letter-spacing: 2px; font-weight: 700; }.eyebrow span { width: 7px; height: 7px; background: var(--accent-2); border-radius: 50%; }
h1 { font-size: clamp(36px, 4.7vw, 62px); line-height: 1.25; letter-spacing: -2px; margin-top: 16px; font-weight: 600; }h1 span { font-size: .8em; margin-left: 10px; letter-spacing: -1px; }h1 i { color: var(--accent); font-style: normal; font-weight: 400; margin-left: 12px; }
.hero-description { color: #786752; line-height: 1.9; font-size: 14px; margin: 18px 0 24px; }.publish-button { height: 44px; padding: 0 22px; border-radius: 8px; font-size: 13px; }
.personal-stats { display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid var(--stroke); border-bottom: 1px solid var(--stroke); padding: 22px 0; margin-bottom: 38px; }.personal-stats div { padding-left: 25px; border-left: 1px solid var(--stroke); display: flex; align-items: center; gap: 20px; }.personal-stats div:first-child { padding-left: 0; border-left: 0; }.personal-stats span { color: #85725b; font-size: 12px; }.personal-stats strong { font-size: 29px; line-height: 1; font-weight: 500; color: #4d4236; }
.feed-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; border-bottom: 1px solid var(--stroke); }.feed-tabs { display: flex; gap: 28px; }.feed-tabs button { border: 0; border-bottom: 2px solid transparent; background: none; padding: 0 0 16px; font: inherit; font-size: 15px; color: #99866e; cursor: pointer; }.feed-tabs .selected { border-color: var(--accent-2); color: var(--accent-2); font-weight: 600; }
.text-button { padding: 4px 0; border: 0; background: none; color: var(--accent-2); font: inherit; font-size: 12px; cursor: pointer; }.feed-heading > .text-button { margin-bottom: 12px; }.feed-filters { display: flex; gap: 12px; padding: 22px 0 8px; align-items: center; }.search-input { flex: 1; min-width: 180px; }.group-filter { width: 160px; }.status-filter { width: 135px; }.filter-button { flex-shrink: 0; }.search-button { border: 0; background: none; color: var(--accent-2); cursor: pointer; padding: 0 8px; font: inherit; font-size: 12px; }
.group-banner { margin: 12px 0 6px; display: flex; align-items: center; justify-content: space-between; gap: 15px; background: #1f6f780b; border: 1px solid #1f6f7820; border-radius: 7px; padding: 10px 13px; color: var(--accent-2); font-size: 12px; }.feed-caption { display: flex; justify-content: space-between; gap: 10px; padding: 14px 0 20px; color: #98856e; font-size: 11px; }.post-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }.skeleton-card { padding: 26px; border: 1px solid var(--stroke); border-radius: 18px; background: var(--card); min-height: 280px; }.empty-state { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 70px 20px; background: #fff8ee88; border: 1px dashed #d8cbb7; border-radius: 16px; text-align: center; }.empty-state strong { font-size: 18px; font-weight: 500; }.empty-state p { color: #938068; font-size: 13px; }.empty-alpha { font-size: 48px; color: #c4b49f; font-style: italic; }.feed-pagination { justify-content: center; margin-top: 30px; }
.page-footer { padding-top: 55px; text-align: center; color: #a28e74; }.page-footer span { font-size: 9px; letter-spacing: 2.5px; }.page-footer p { font-size: 11px; margin-top: 9px; }
.paste-zone { width: 100%; padding: 12px; border: 1px dashed #cfbea7; border-radius: 10px; background: #f5ecdf55; }
.paste-zone:focus-visible { outline: 2px solid var(--accent-2); outline-offset: 3px; }
.paste-hint { color: var(--accent-2); font-size: 11px; line-height: 1.8; margin-top: 10px; }
.paste-hint kbd { display: inline-block; padding: 0 5px; border: 1px solid #d8cbb7; border-radius: 4px; background: #fffaf2; color: #6d5940; font-family: inherit; font-size: 10px; line-height: 1.7; }
.privacy-notice { margin-bottom: 20px; border: 1px solid #ddba8c; background: #f7ebd9; }
.privacy-notice :deep(.el-alert__title) { color: #855424; font-size: 13px; font-weight: 600; }
.privacy-notice :deep(.el-alert__description) { color: #8b6841; font-size: 12px; line-height: 1.9; }
.screenshot-privacy-hint { width: 100%; margin-top: 6px; color: #a16a36; font-size: 11px; line-height: 1.8; }
.publish-privacy-hint { margin-bottom: 12px; color: #9b754b; font-size: 11px; text-align: left; }
.form-row { display: grid; grid-template-columns: 1fr auto; gap: 24px; }.form-row :deep(.el-select) { width: 100%; }.draft-images { display: flex; flex-wrap: wrap; gap: 10px; width: 100%; }.draft-image, .add-image { position: relative; width: 90px; height: 90px; border: 1px solid var(--stroke); border-radius: 9px; overflow: hidden; }.draft-image img { width: 100%; height: 100%; object-fit: cover; }.draft-image button { position: absolute; right: 3px; top: 3px; width: 23px; height: 23px; background: #1b1916bd; color: white; border: 0; border-radius: 50%; cursor: pointer; }.add-image { display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f5ecdf; color: #9a7851; font-size: 25px; cursor: pointer; border-style: dashed; }.add-image small { font-size: 10px; }.form-hint { color: #95836f; font-size: 12px; margin-top: 8px; line-height: 1.8; }.group-intro { font-size: 13px; color: #88745b; margin-bottom: 20px; line-height: 1.8; }.group-form { margin-bottom: 22px; }.group-form label { display: block; margin-bottom: 8px; font-size: 13px; }.group-form > div { display: flex; gap: 10px; }.group-row { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--stroke); padding: 14px 0; gap: 14px; }.group-row strong { font-size: 13px; overflow-wrap: anywhere; }.group-row small { display: block; font-size: 10px; color: #95836f; margin-top: 3px; }.group-row code { user-select: all; }.my-groups h4 { font-size: 13px; margin: 25px 0 10px; }
.detail-loading { padding: 20px 10px; }.detail-meta, .detail-tools { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; color: #95816a; }.detail-title { font-size: 28px; font-weight: 600; line-height: 1.5; margin-top: 15px; overflow-wrap: anywhere; }.detail-date { font-size: 11px; color: #9e8a73; margin-top: 8px; }.detail-content { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 14px; line-height: 1.95; padding: 25px 0; }.detail-images { display: grid; gap: 12px; }.detail-images :deep(.el-image) { width: 100%; max-height: 430px; border: 1px solid var(--stroke); border-radius: 9px; background: #f2e9db; }.detail-tools { margin: 20px 0; align-items: center; }.voting-panel, .results-panel, .author-actions { border-top: 1px dashed #d5c6b0; padding-top: 25px; margin-top: 25px; }.voting-panel h3, .results-panel h3, .author-actions h3 { font-size: 16px; font-weight: 600; }.decision-options { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0; }.decision-option { padding: 16px 12px; text-align: left; border: 1px solid var(--stroke); border-radius: 9px; background: #fff9f0; font: inherit; font-size: 16px; cursor: pointer; }.decision-option small { display: block; font-size: 10px; color: #9b8569; margin-top: 5px; }.submit { color: var(--accent-2); }.hold { color: #b35d35; }.decision-option.submit.chosen { border-color: var(--accent-2); background: #1f6f780c; }.decision-option.hold.chosen { border-color: #b35d35; background: #d56a3a0c; }.reason-label { display: block; font-size: 12px; margin-bottom: 10px; }.reason-label span { color: var(--accent); font-size: 10px; margin-left: 5px; }.vote-submit { margin-top: 16px; width: 100%; height: 40px; }.results-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }.results-heading small { color: #95816a; font-size: 10px; }.result-totals { display: flex; justify-content: space-between; font-size: 13px; margin-top: 18px; color: var(--accent-2); }.result-totals span:last-child { color: #b35d35; }.result-totals b { font-size: 24px; margin-left: 8px; font-weight: 500; }.result-bar { height: 5px; border-radius: 4px; background: #cc835c; margin: 10px 0 20px; overflow: hidden; }.result-bar span { display: block; height: 100%; background: var(--accent-2); }.opinions-loading, .opinions-empty { padding: 24px 0; font-size: 13px; color: #9b8569; }.opinion { padding: 20px 0; border-bottom: 1px solid var(--stroke); }.opinion-heading { display: flex; justify-content: space-between; font-size: 11px; color: #9a846a; }.opinion p { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 13px; line-height: 1.9; margin: 12px 0; }.opinion footer { display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #ac967b; }.flower-button { border: 1px solid #dac9b3; border-radius: 6px; background: transparent; color: #a38359; padding: 4px 8px; cursor: pointer; font: inherit; font-size: 11px; }.flowered { color: var(--accent); background: #d56a3a0c; border-color: #d56a3a55; }.flower-button:disabled { cursor: default; }.author-actions p { color: #95816a; font-size: 12px; margin: 8px 0 15px; }.author-actions > div { display: flex; flex-wrap: wrap; gap: 10px; }.withdraw-button { display: block; border: 0; background: none; padding: 20px 0 10px; color: #a58b70; font: inherit; font-size: 11px; text-decoration: underline; cursor: pointer; }.outcome-panel { padding: 18px; border: 1px solid #1f6f7825; background: #1f6f7808; border-radius: 10px; margin-top: 25px; }.outcome-panel strong { font-size: 14px; color: var(--accent-2); }.outcome-panel p { font-size: 13px; margin-top: 10px; white-space: pre-wrap; overflow-wrap: anywhere; }.outcome-panel small { display: block; font-size: 10px; color: #95816a; margin-top: 12px; }.outcome-confirm { font-size: 13px; color: #88745b; margin-bottom: 18px; }
:deep(.el-input__wrapper), :deep(.el-select__wrapper), :deep(.el-textarea__inner) { background: #fffaf2; box-shadow: 0 0 0 1px #dbcebc inset; }:deep(.el-input-group__append) { background: #eee3d2; box-shadow: 0 1px 0 0 #dbcebc inset, 0 -1px 0 0 #dbcebc inset, -1px 0 0 0 #dbcebc inset; }
button:focus-visible, a:focus-visible { outline: 2px solid var(--accent-2); outline-offset: 4px; }button:disabled { opacity: .65; }
@media (max-width: 980px) { .sw-hero { grid-template-columns: 1fr 300px; gap: 24px; }.post-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }.personal-stats div { gap: 12px; padding-left: 18px; }.feed-filters { flex-wrap: wrap; }.search-input { flex-basis: 100%; }.group-filter { flex: 1; }.status-filter { flex: 1; } }
@media (max-width: 680px) { .submit-wait-page { padding: 20px 18px 80px; }.page-nav { padding-bottom: 10px; }.edition { font-size: 8px; letter-spacing: 1px; }.sw-hero { grid-template-columns: 1fr; padding: 30px 0; gap: 25px; }h1 { font-size: 42px; }.hero-description { font-size: 12px; }.personal-stats { padding: 18px 0; margin-bottom: 25px; }.personal-stats div { flex-direction: column; align-items: center; gap: 10px; padding-left: 0; }.personal-stats strong { font-size: 27px; }.personal-stats span { font-size: 10px; }.feed-tabs { gap: 19px; }.feed-tabs button { font-size: 13px; }.feed-heading > .text-button { font-size: 11px; }.post-grid { grid-template-columns: 1fr; gap: 16px; }.feed-caption { font-size: 10px; }.form-row { grid-template-columns: 1fr; gap: 0; }.group-banner { flex-direction: column; align-items: flex-start; gap: 5px; }.decision-options { gap: 8px; }.decision-option { padding: 14px 10px; font-size: 14px; }.results-heading { align-items: flex-start; flex-direction: column; gap: 5px; } }
.hero-question { margin-top: 20px; padding-left: 13px; border-left: 2px solid #d56a3a80; color: #80664e; font-size: clamp(15px, 1.5vw, 18px); line-height: 1.8; }
.hero-question strong { color: #9c4e2b; font-weight: 600; white-space: nowrap; }
.hero-copy .hero-description { margin-top: 12px; }
.hero-actions { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.hero-actions :deep(.el-button + .el-button) { margin-left: 0; }
.draw-button { height: 44px; border-radius: 8px; padding: 0 18px; color: var(--accent-2); border-color: #1f6f7840; background: #fff8ee; font-size: 13px; }
.draw-button:hover, .draw-button:focus-visible { color: #185a61; background: #1f6f780c; border-color: #1f6f7880; }
.draw-button svg { width: 19px; height: 19px; margin-right: 8px; }
.draw-hint { color: #94816b; font-size: 11px; line-height: 1.8; margin-top: 11px; }
.draw-result { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding: 12px 14px; margin-bottom: 24px; background: #1f6f7809; border: 1px solid #1f6f7826; border-radius: 9px; color: var(--accent-2); font-size: 12px; }
.draw-result > span { flex: 1; min-width: 130px; line-height: 1.7; }
.result-totals { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.result-totals > span { display: flex; flex-direction: column; gap: 5px; }
.result-totals b { margin-left: 0; }
.decision-option { line-height: 1.5; overflow-wrap: anywhere; }
.decision-option small { line-height: 1.7; }
@media (max-width: 680px) {
  .hero-actions { gap: 10px; }
  .hero-actions .publish-button { padding: 0 14px; }
  .hero-actions .draw-button { padding: 0 14px; }
  .hero-question { font-size: 15px; }
  .decision-option { font-size: clamp(12px, 3.5vw, 14px); }
}
</style>

<style>
.sw-dialog, .sw-drawer { --el-color-primary: #d56a3a; --el-color-primary-light-3: #e19878; --el-color-primary-dark-2: #b4532b; background: #fff8ee; font-family: 'Newsreader', 'Microsoft YaHei', sans-serif; }.sw-drawer .el-drawer__header { margin-bottom: 0; padding: 20px 26px; border-bottom: 1px solid #dacdbb; }.sw-drawer .el-drawer__body { padding: 26px; }.sw-dialog .el-form-item__label { color: #6d5940; font-size: 12px; }
.sw-dialog { display: flex; flex-direction: column; max-height: 90vh; }
.sw-dialog .el-dialog__header, .sw-dialog .el-dialog__footer { flex-shrink: 0; }
.sw-dialog .el-dialog__body { min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
@media (max-width: 680px) { .sw-drawer .el-drawer__body { padding: 20px; } }
</style>
