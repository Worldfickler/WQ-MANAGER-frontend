<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadProps, UploadRequestOptions, UploadUserFile } from 'element-plus'

import { paymentApi } from '@/api/payment'
import type {
  BasePaymentDashboardResponse,
  BasePaymentLeaderboardItem,
  BasePaymentRecord
} from '@/types/payment'

type SortBy = 'total_payment' | 'regular_payment' | 'super_payment' | 'regular_count' | 'super_count' | 'value_factor' | 'daily_osmosis_rank'
type SortOrder = 'desc' | 'asc'

const loading = ref(false)
const uploadLoading = ref(false)
const firstLoading = ref(true)
const uploadDialogVisible = ref(false)
const page = ref(1)
const pageSize = ref(50)
const total = ref(0)
const items = ref<BasePaymentLeaderboardItem[]>([])
const dashboardData = ref<BasePaymentDashboardResponse | null>(null)
const dashboardLoading = ref(false)
const dashboardCollapsed = ref(true)
const canViewLeaderboard = ref(false)
const today = ref('')
const selectedRecordDate = ref('')
const myTodayRecord = ref<BasePaymentRecord | null>(null)
const leaderboardError = ref('')
const sortBy = ref<SortBy>('total_payment')
const sortOrder = ref<SortOrder>('desc')
const pictureFileList = ref<UploadUserFile[]>([])
const pictureObjectMap = ref<Record<number, string>>({})
const uploadPreviewVisible = ref(false)
const uploadPreviewUrl = ref('')
const imageUploading = ref(false)
const MAX_IMAGE_COUNT = 9

const form = ref({
  anonymity: 1 as 0 | 1,
  regular_payment: null as number | null,
  super_payment: null as number | null,
  regular_count: null as number | null,
  super_count: null as number | null,
  pictures: [] as string[],
  value_factor: null as number | null,
  daily_osmosis_rank: null as number | null
})

const formatNum = (value: number | null | undefined, digits: number = 2) => {
  if (value === null || value === undefined) return '-'
  return Number(value).toFixed(digits)
}

const updateFormFromRecord = (record: BasePaymentRecord | null) => {
  if (!record) {
    form.value.anonymity = 1
    form.value.regular_payment = null
    form.value.super_payment = null
    form.value.regular_count = null
    form.value.super_count = null
    form.value.pictures = []
    form.value.value_factor = null
    form.value.daily_osmosis_rank = null
    pictureFileList.value = []
    pictureObjectMap.value = {}
    return
  }

  form.value.anonymity = record.anonymity === 0 ? 0 : 1
  form.value.regular_payment = record.regular_payment
  form.value.super_payment = record.super_payment
  form.value.regular_count = record.regular_count
  form.value.super_count = record.super_count
  const pictureObjects = Array.isArray(record.pictures) && record.pictures.length > 0
    ? record.pictures
    : (record.picture ? [record.picture] : [])
  const pictureUrls = Array.isArray(record.picture_urls) && record.picture_urls.length > 0
    ? record.picture_urls
    : []
  form.value.pictures = [...pictureObjects]
  form.value.value_factor = record.value_factor
  form.value.daily_osmosis_rank = record.daily_osmosis_rank
  pictureObjectMap.value = {}
  pictureFileList.value = pictureObjects.map((objectName, index) => {
    const uid = -(index + 1)
    pictureObjectMap.value[uid] = objectName
    return {
      uid,
      status: 'success',
      name: objectName.split('/').pop() || `image-${index + 1}`,
      url: pictureUrls[index] || ''
    }
  })
}

const fetchMyStatus = async () => {
  const response = await paymentApi.getMyTodayStatus(selectedRecordDate.value || undefined)
  const data = response.data
  today.value = data.record_date
  if (!selectedRecordDate.value) {
    selectedRecordDate.value = data.record_date
  }
  canViewLeaderboard.value = data.has_uploaded_for_date
  myTodayRecord.value = data.data
  updateFormFromRecord(data.data)
}

const fetchLeaderboard = async () => {
  if (!canViewLeaderboard.value) {
    items.value = []
    total.value = 0
    return
  }

  loading.value = true
  leaderboardError.value = ''
  try {
    const response = await paymentApi.getLeaderboard({
      page: page.value,
      pageSize: pageSize.value,
      startDate: selectedRecordDate.value || undefined,
      endDate: selectedRecordDate.value || undefined,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value
    })

    items.value = response.data.items || []
    total.value = response.data.total || 0
  } catch (error: any) {
    const message = error?.response?.data?.detail || '加载排行榜失败'
    leaderboardError.value = message
    items.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const fetchDashboardSnapshot = async () => {
  if (!canViewLeaderboard.value) {
    dashboardData.value = null
    return
  }

  dashboardLoading.value = true
  try {
    const response = await paymentApi.getDashboard(selectedRecordDate.value || undefined)
    dashboardData.value = response.data
  } catch {
    dashboardData.value = null
  } finally {
    dashboardLoading.value = false
  }
}

const refreshAll = async () => {
  loading.value = true
  try {
    await fetchMyStatus()
    await Promise.all([fetchLeaderboard(), fetchDashboardSnapshot()])
  } catch (error: any) {
    const message = error?.response?.data?.detail || '加载数据失败'
    ElMessage.error(message)
  } finally {
    loading.value = false
    firstLoading.value = false
  }
}

const submitUpload = async () => {
  if (!selectedRecordDate.value) {
    ElMessage.warning('请先选择记录日期')
    return
  }

  if (
    form.value.regular_payment === null || Number.isNaN(Number(form.value.regular_payment)) ||
    form.value.super_payment === null || Number.isNaN(Number(form.value.super_payment))
  ) {
    ElMessage.warning('请填写 regular / super 收益')
    return
  }

  uploadLoading.value = true
  try {
    const cleanedPictures = (form.value.pictures || [])
      .map(objectName => (objectName || '').trim())
      .filter(objectName => !!objectName)

    const response = await paymentApi.uploadMyTodayPayment({
      record_date: selectedRecordDate.value,
      anonymity: form.value.anonymity,
      regular_payment: Number(form.value.regular_payment),
      super_payment: Number(form.value.super_payment),
      regular_count:
        form.value.regular_count === null || form.value.regular_count === undefined
          ? undefined
          : Number(form.value.regular_count),
      super_count:
        form.value.super_count === null || form.value.super_count === undefined
          ? undefined
          : Number(form.value.super_count),
      picture: cleanedPictures[0] || undefined,
      pictures: cleanedPictures.length ? cleanedPictures : undefined,
      value_factor:
        form.value.value_factor === null || form.value.value_factor === undefined
          ? undefined
          : Number(form.value.value_factor),
      daily_osmosis_rank:
        form.value.daily_osmosis_rank === null || form.value.daily_osmosis_rank === undefined
          ? undefined
          : Number(form.value.daily_osmosis_rank)
    })

    ElMessage.success(response.data.message || '上传成功')
    uploadDialogVisible.value = false
    page.value = 1
    await refreshAll()
  } catch (error: any) {
    const message = error?.response?.data?.detail || '上传失败'
    ElMessage.error(message)
  } finally {
    uploadLoading.value = false
  }
}

const beforePictureUpload: UploadProps['beforeUpload'] = (rawFile) => {
  const isImage = (rawFile.type || '').startsWith('image/')
  if (!isImage) {
    ElMessage.warning('仅支持上传图片文件')
    return false
  }

  const isLt10MB = rawFile.size / 1024 / 1024 < 10
  if (!isLt10MB) {
    ElMessage.warning('单张图片大小不能超过 10MB')
    return false
  }

  if (pictureFileList.value.length >= MAX_IMAGE_COUNT) {
    ElMessage.warning(`最多上传 ${MAX_IMAGE_COUNT} 张图片`)
    return false
  }

  return true
}

const uploadPictureRequest = async (options: UploadRequestOptions) => {
  imageUploading.value = true
  try {
    const file = options.file as File
    const response = await paymentApi.uploadImages([file], selectedRecordDate.value || undefined)
    options.onSuccess(response.data as any)
  } catch (error: any) {
    const message = error?.response?.data?.detail || '图片上传失败'
    ElMessage.error(message)
    options.onError(error)
  } finally {
    imageUploading.value = false
  }
}

const handlePictureUploadSuccess: UploadProps['onSuccess'] = (response, uploadFile) => {
  const payload = response as { items?: Array<{ file_name?: string; url?: string; object_name?: string }> }
  const first = payload?.items?.[0]
  if (!first?.object_name) return

  const fileUid = Number(uploadFile.uid)
  if (!Number.isFinite(fileUid)) return
  pictureObjectMap.value[fileUid] = first.object_name
  if (first.url) {
    uploadFile.url = first.url
  }
  if (first.file_name) {
    uploadFile.name = first.file_name
  }

  if (!form.value.pictures.includes(first.object_name)) {
    form.value.pictures.push(first.object_name)
  }
}

const handlePictureRemove: UploadProps['onRemove'] = (uploadFile) => {
  const fileUid = Number(uploadFile.uid)
  if (!Number.isFinite(fileUid)) return
  const objectName = pictureObjectMap.value[fileUid]
  if (objectName) {
    form.value.pictures = form.value.pictures.filter(item => item !== objectName)
  }
  delete pictureObjectMap.value[fileUid]
}

const handlePicturePreview: UploadProps['onPreview'] = (uploadFile) => {
  if (!uploadFile.url) return
  uploadPreviewUrl.value = uploadFile.url
  uploadPreviewVisible.value = true
}

const openUploadDialog = () => {
  uploadDialogVisible.value = true
}

const handleDateChange = async () => {
  page.value = 1
  await fetchMyStatus()
  await Promise.all([fetchLeaderboard(), fetchDashboardSnapshot()])
}

const handlePageChange = async (nextPage: number) => {
  page.value = nextPage
  await fetchLeaderboard()
}

const handleSizeChange = async (nextSize: number) => {
  pageSize.value = nextSize
  page.value = 1
  await fetchLeaderboard()
}

const handleSortChange = async ({ prop, order }: { prop: string; order: 'ascending' | 'descending' | null }) => {
  if (!prop || !['total_payment', 'regular_payment', 'super_payment', 'regular_count', 'super_count', 'value_factor', 'daily_osmosis_rank'].includes(prop)) {
    return
  }

  if (!order) {
    sortBy.value = 'total_payment'
    sortOrder.value = 'desc'
  } else {
    sortBy.value = prop as SortBy
    sortOrder.value = order === 'descending' ? 'desc' : 'asc'
  }
  page.value = 1
  await fetchLeaderboard()
}

const dashboardOverview = computed(() => dashboardData.value?.overview ?? null)

const topPerformers = computed(() => {
  return dashboardData.value?.top_performers ?? []
})

const toggleDashboardCollapsed = () => {
  dashboardCollapsed.value = !dashboardCollapsed.value
}

onMounted(async () => {
  await refreshAll()
})
</script>

<template>
  <div class="base-payment-page">
    <header class="dashboard-header">
      <div>
        <h1 class="dashboard-title">Base Payment Dashboard</h1>
        <p class="dashboard-subtitle">快来看看大佬们今天都赚了多少刀乐吧！</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" class="primary-pill" @click="openUploadDialog">{{ myTodayRecord ? '更新上传' : '立即上传' }}</el-button>
        <el-button class="light-pill" :loading="loading" @click="refreshAll">Refresh</el-button>
      </div>
    </header>

    <el-card class="filters-panel" shadow="never">
      <el-form class="filter-form" label-position="top">
        <el-form-item class="filter-date" label="Record Date">
          <el-date-picker
            v-model="selectedRecordDate"
            type="date"
            value-format="YYYY-MM-DD"
            format="YYYY-MM-DD"
            placeholder="选择单天"
            :clearable="false"
            @change="handleDateChange"
          />
        </el-form-item>
        <el-form-item class="filter-note" label="Permission Gate">
          <div class="permission-text">
            <span v-if="canViewLeaderboard">✅ 已上传 {{ selectedRecordDate }}，可查看该日数据</span>
            <span v-else>⚠️ 未上传 {{ selectedRecordDate }} 的 base payment，暂不可查看</span>
          </div>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="overview-panel" shadow="never">
      <template #header>
        <div class="section-header">
          <span class="section-title">Daily Insight Dashboard</span>
          <div class="section-tools">
            <span class="section-meta">{{ selectedRecordDate || today || '-' }}</span>
            <el-button class="light-pill" size="small" @click="toggleDashboardCollapsed">
              {{ dashboardCollapsed ? '展开' : '折叠' }}
            </el-button>
          </div>
        </div>
      </template>

      <el-collapse-transition>
        <div v-show="!dashboardCollapsed">
          <div v-if="firstLoading || dashboardLoading" class="section-skeleton">
            <el-skeleton :rows="8" animated />
          </div>

          <el-empty
            v-else-if="!canViewLeaderboard"
            description="上传当日数据后可查看多维仪表盘"
          />

          <el-empty
            v-else-if="!dashboardOverview || dashboardOverview.participant_count === 0"
            description="该日期暂无可展示数据"
          />

          <div v-else class="overview-content">
            <div class="overview-metrics">
              <article class="overview-metric-card">
                <div class="metric-label">参与人数</div>
                <div class="metric-value">{{ dashboardOverview.participant_count }}</div>
                <div class="metric-note">有上传记录的用户数</div>
              </article>
              <article class="overview-metric-card">
                <div class="metric-label">总收益</div>
                <div class="metric-value">{{ formatNum(dashboardOverview.total_payment_sum, 2) }}</div>
                <div class="metric-note">regular + super 汇总</div>
              </article>
              <article class="overview-metric-card">
                <div class="metric-label">人均收益</div>
                <div class="metric-value">{{ formatNum(dashboardOverview.average_total_payment, 2) }}</div>
                <div class="metric-note">平均 total_payment</div>
              </article>
              <article class="overview-metric-card">
                <div class="metric-label">最高 / 最低收益</div>
                <div class="metric-value">
                  {{ formatNum(dashboardOverview.max_total_payment, 2) }} / {{ formatNum(dashboardOverview.min_total_payment, 2) }}
                </div>
                <div class="metric-note">当日收益区间</div>
              </article>
              <article class="overview-metric-card">
                <div class="metric-label">匿名率 / 图片率</div>
                <div class="metric-value">
                  {{ formatNum(dashboardOverview.anonymity_rate_pct, 1) }}% / {{ formatNum(dashboardOverview.picture_rate_pct, 1) }}%
                </div>
                <div class="metric-note">匿名用户占比 / 图片提交占比（{{ dashboardOverview.anonymity_count }}/{{ dashboardOverview.picture_count }}）</div>
              </article>
            </div>

            <div class="overview-secondary-grid">
              <article class="overview-panel-card">
                <h3>收益结构占比（按绝对值）</h3>
                <div class="ratio-line">
                  <span>Regular: {{ formatNum(dashboardOverview.regular_payment_sum, 2) }}</span>
                  <span>{{ formatNum(dashboardOverview.regular_share_pct, 1) }}%</span>
                </div>
                <el-progress :percentage="dashboardOverview.regular_share_pct" :stroke-width="10" color="#1f6f78" />

                <div class="ratio-line ratio-gap">
                  <span>Super: {{ formatNum(dashboardOverview.super_payment_sum, 2) }}</span>
                  <span>{{ formatNum(dashboardOverview.super_share_pct, 1) }}%</span>
                </div>
                <el-progress :percentage="dashboardOverview.super_share_pct" :stroke-width="10" color="#d56a3a" />
              </article>

              <article class="overview-panel-card">
                <h3>当日质量指标</h3>
                <ul class="quality-list">
                  <li>
                    <span>Value Factor 均值</span>
                    <strong>{{ formatNum(dashboardOverview.average_value_factor, 2) }}</strong>
                  </li>
                  <li>
                    <span>Daily Osmosis Rank 均值</span>
                    <strong>{{ formatNum(dashboardOverview.average_daily_osmosis_rank, 2) }}</strong>
                  </li>
                  <li>
                    <span>Regular Count 均值</span>
                    <strong>{{ formatNum(dashboardOverview.average_regular_count, 2) }}</strong>
                  </li>
                  <li>
                    <span>Super Count 均值</span>
                    <strong>{{ formatNum(dashboardOverview.average_super_count, 2) }}</strong>
                  </li>
                </ul>
              </article>

              <article class="overview-panel-card top-performer-card">
                <h3>Top 3 收益用户</h3>
                <ol class="top-list">
                  <li v-for="item in topPerformers" :key="`${item.rank}-${item.display_wq_id}`">
                    <span class="top-user">#{{ item.rank }} {{ item.display_wq_id }}</span>
                    <strong>{{ formatNum(item.total_payment, 2) }}</strong>
                  </li>
                </ol>
              </article>
            </div>
          </div>
        </div>
      </el-collapse-transition>

    </el-card>

    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="section-header">
          <span class="section-title">Base Payment Leaderboard</span>
          <span class="section-meta">Total {{ total }}</span>
        </div>
      </template>

      <el-alert
        v-if="!canViewLeaderboard"
        type="warning"
        :closable="false"
        show-icon
        title="未上传今日 base payment，无法查看排行榜。请先上传。"
      />

      <p v-if="leaderboardError" class="table-error">{{ leaderboardError }}</p>

      <div v-if="firstLoading" class="section-skeleton">
        <el-skeleton :rows="10" animated />
      </div>

      <el-table
        v-else
        v-loading="loading"
        :data="items"
        stripe
        style="width: 100%"
        :default-sort="{ prop: sortBy, order: sortOrder === 'desc' ? 'descending' : 'ascending' }"
        @sort-change="handleSortChange"
      >
        <el-table-column prop="rank" label="No." width="70" align="center" />
        <el-table-column prop="record_date" label="Date" min-width="120" />
        <el-table-column prop="display_wq_id" label="User" min-width="100" />
        <el-table-column prop="total_payment" label="Total Payment" min-width="140" align="right" sortable="custom">
          <template #default="{ row }">{{ formatNum(row.total_payment, 2) }}</template>
        </el-table-column>
        <el-table-column prop="regular_payment" label="Regular Payment" min-width="150" align="right" sortable="custom">
          <template #default="{ row }">{{ formatNum(row.regular_payment, 2) }}</template>
        </el-table-column>
        <el-table-column prop="super_payment" label="Super Payment" min-width="140" align="right" sortable="custom">
          <template #default="{ row }">{{ formatNum(row.super_payment, 2) }}</template>
        </el-table-column>
        <el-table-column prop="regular_count" label="Regular Count" min-width="130" align="right" sortable="custom">
          <template #default="{ row }">{{ row.regular_count ?? '-' }}</template>
        </el-table-column>
        <el-table-column prop="super_count" label="Super Count" min-width="120" align="right" sortable="custom">
          <template #default="{ row }">{{ row.super_count ?? '-' }}</template>
        </el-table-column>
        <el-table-column prop="value_factor" label="Value Factor" min-width="140" align="right" sortable="custom">
          <template #default="{ row }">{{ formatNum(row.value_factor, 2) }}</template>
        </el-table-column>
        <el-table-column
          prop="daily_osmosis_rank"
          label="Daily Osmosis Rank"
          min-width="170"
          align="right"
          sortable="custom"
        >
          <template #default="{ row }">{{ formatNum(row.daily_osmosis_rank, 2) }}</template>
        </el-table-column>
        <el-table-column prop="picture" label="Picture" min-width="200">
          <template #default="{ row }">
            <div v-if="row.picture_urls?.length" class="table-picture-grid">
              <el-image
                v-for="(url, index) in row.picture_urls"
                :key="`${row.wq_id}-${index}-${url}`"
                :src="url"
                :preview-src-list="row.picture_urls"
                :initial-index="index"
                preview-teleported
                fit="cover"
                class="table-thumb"
              />
            </div>
            <span v-else-if="row.pictures?.length" class="picture-object-fallback">{{ row.pictures.join('、') }}</span>
            <span v-else-if="row.picture" class="picture-object-fallback">{{ row.picture }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper" v-if="canViewLeaderboard && total > 0">
        <el-pagination
          :current-page="page"
          :page-size="pageSize"
          :total="total"
          :page-sizes="[20, 50, 100, 200]"
          layout="total, sizes, prev, pager, next"
          background
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="uploadDialogVisible"
      class="upload-dialog"
      width="760px"
      top="6vh"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <template #header>
        <div class="dialog-header">
          <div class="dialog-header-top">
            <span class="dialog-title">{{ myTodayRecord ? '更新 Base Payment' : '上传 Base Payment' }}</span>
            <el-tag type="info" effect="plain">
              {{ selectedRecordDate || today || '-' }}
            </el-tag>
          </div>
          <span class="dialog-subtitle">为保障信息准确有效，请您如实填写，此举既惠及他人，也便利自身。</span>
        </div>
      </template>

      <el-form label-position="top" class="upload-form">
        <section class="upload-block">
          <div class="upload-block-title">隐私设置</div>
          <el-form-item label="展示方式" class="compact-item">
            <el-radio-group v-model="form.anonymity" class="anonymity-group">
              <el-radio :value="1">不匿名（展示 WQ_ID）</el-radio>
              <el-radio :value="0">匿名（仅显示“匿名用户”）</el-radio>
            </el-radio-group>
          </el-form-item>

          <div class="upload-block-title">收益与数量</div>
          <div class="upload-block-grid">
            <el-form-item label="Regular Payment">
              <el-input-number v-model="form.regular_payment" :precision="2" :step="0.1" :min="-100000000" :max="100000000" />
            </el-form-item>

            <el-form-item label="Super Payment">
              <el-input-number v-model="form.super_payment" :precision="2" :step="0.1" :min="-100000000" :max="100000000" />
            </el-form-item>

            <el-form-item label="Regular Count">
              <el-input-number v-model="form.regular_count" :precision="0" :step="1" :min="0" :max="100000000" />
            </el-form-item>

            <el-form-item label="Super Count">
              <el-input-number v-model="form.super_count" :precision="0" :step="1" :min="0" :max="100000000" />
            </el-form-item>
          </div>

          <div class="upload-block-grid">
            <el-form-item label="Value Factor">
              <el-input-number v-model="form.value_factor" :precision="2" :step="0.01" :min="-100000000" :max="100000000" />
            </el-form-item>

            <el-form-item label="Daily Osmosis Rank">
              <el-input-number
                v-model="form.daily_osmosis_rank"
                :precision="2"
                :step="0.01"
                :min="-100000000"
                :max="100000000"
              />
            </el-form-item>

            <el-form-item label="图片上传（可选）【拥有截图可信度更高！】" class="span-2">
              <el-upload
                v-model:file-list="pictureFileList"
                class="picture-uploader"
                list-type="picture-card"
                accept="image/*"
                multiple
                :limit="MAX_IMAGE_COUNT"
                :disabled="imageUploading || pictureFileList.length >= MAX_IMAGE_COUNT"
                :http-request="uploadPictureRequest"
                :before-upload="beforePictureUpload"
                :on-success="handlePictureUploadSuccess"
                :on-remove="handlePictureRemove"
                :on-preview="handlePicturePreview"
              >
                <span class="upload-plus">+</span>
              </el-upload>
              <div class="upload-hint">
                支持最多 {{ MAX_IMAGE_COUNT }} 张图片，单张不超过 10MB。
              </div>
            </el-form-item>
          </div>
        </section>
      </el-form>

      <el-dialog
        v-model="uploadPreviewVisible"
        append-to-body
        width="520px"
        class="image-preview-dialog"
      >
        <img v-if="uploadPreviewUrl" :src="uploadPreviewUrl" class="preview-image" alt="preview" />
      </el-dialog>

      <template #footer>
        <div class="dialog-actions">
          <el-button class="light-pill" @click="uploadDialogVisible = false">取消</el-button>
          <el-button type="primary" class="primary-pill" :loading="uploadLoading" @click="submitUpload">
            {{ myTodayRecord ? '更新' : '上传' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.base-payment-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2.5rem clamp(1.5rem, 3vw, 3rem) 4rem;
  position: relative;
  z-index: 1;
}

.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.dashboard-title {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 2rem;
  margin: 0;
}

.dashboard-subtitle {
  color: var(--ink-soft);
  margin-top: 0.4rem;
}

.header-actions {
  display: flex;
  gap: 0.65rem;
}

.primary-pill {
  border-radius: 999px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 0.75rem;
  padding: 0.6rem 1.4rem;
  background: var(--ink);
  border-color: var(--ink);
  color: var(--bg);
}

.primary-pill:hover {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.light-pill {
  border: 1px solid var(--stroke);
  color: var(--ink-soft);
  border-radius: 999px;
}

.filters-panel,
.overview-panel,
.table-card,
.overview-metric-card,
.overview-panel-card {
  background: var(--card);
  border: 1px solid var(--stroke);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.filters-panel {
  margin-bottom: 1.2rem;
  background: linear-gradient(135deg, rgba(213, 106, 58, 0.08), rgba(31, 111, 120, 0.06));
}

.filter-form {
  display: grid;
  grid-template-columns: minmax(260px, 1.1fr) minmax(280px, 1.2fr);
  gap: 0.85rem;
  align-items: end;
}

.filter-form :deep(.el-form-item) {
  margin-bottom: 0;
}

.filter-form :deep(.el-form-item__label) {
  font-size: 0.7rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--ink-soft);
  font-weight: 600;
}

.filter-form :deep(.el-input__wrapper),
.filter-form :deep(.el-select__wrapper),
.filter-form :deep(.el-date-editor) {
  background: var(--bg);
  border: 1px solid var(--stroke);
  border-radius: 12px;
  box-shadow: none;
}

.permission-text {
  min-height: 32px;
  display: flex;
  align-items: center;
  color: var(--ink-soft);
  font-size: 0.9rem;
}

.overview-panel {
  margin-bottom: 1.2rem;
}

.overview-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.overview-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.8rem;
}

.overview-metric-card {
  padding: 0.9rem 1rem;
}

.metric-label {
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.68rem;
  color: var(--ink-soft);
}

.metric-value {
  margin-top: 0.35rem;
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 1.2rem;
}

.metric-note {
  margin-top: 0.3rem;
  font-size: 0.8rem;
  color: var(--ink-soft);
}

.overview-secondary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 0.8rem;
}

.overview-panel-card {
  padding: 1rem;
}

.overview-panel-card h3 {
  margin: 0 0 0.8rem;
  font-size: 0.95rem;
  color: var(--ink-soft);
}

.ratio-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.86rem;
  margin-bottom: 0.3rem;
}

.ratio-gap {
  margin-top: 0.85rem;
}

.quality-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.65rem;
}

.quality-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.88rem;
}

.quality-list li span {
  color: var(--ink-soft);
}

.top-list {
  margin: 0;
  padding-left: 1.15rem;
  display: grid;
  gap: 0.55rem;
}

.top-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
}

.top-user {
  color: var(--ink-soft);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.section-tools {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.section-title {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 1.2rem;
}

.section-meta {
  font-size: 0.85rem;
  color: var(--ink-soft);
}

.section-skeleton {
  padding: 1rem;
}

.table-error {
  color: #a6322a;
  margin-bottom: 0.6rem;
  font-size: 0.9rem;
}

.table-card :deep(.el-table) {
  --el-table-bg-color: var(--card);
  --el-table-tr-bg-color: var(--card);
  --el-table-header-bg-color: var(--bg-2);
  --el-table-row-hover-bg-color: rgba(213, 106, 58, 0.08);
}

.table-card :deep(.el-table__inner-wrapper),
.table-card :deep(.el-table__body-wrapper),
.table-card :deep(.el-table__header-wrapper),
.table-card :deep(.el-table__body),
.table-card :deep(.el-table__header) {
  background-color: var(--card);
}

.table-card :deep(.el-table__header-wrapper th) {
  background: var(--bg-2);
  letter-spacing: 0.02em;
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--ink-soft);
}

.table-picture-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.table-thumb {
  width: 46px;
  height: 46px;
  border-radius: 8px;
  border: 1px solid var(--stroke);
  overflow: hidden;
}

.picture-object-fallback {
  font-size: 0.8rem;
  color: var(--ink-soft);
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding-top: 1rem;
}

.dialog-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dialog-header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
}

.dialog-title {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 1.18rem;
  font-weight: 700;
}

.dialog-subtitle {
  font-size: 0.85rem;
  color: var(--ink-soft);
  line-height: 1.45;
}

.upload-form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.upload-block {
  border: 1px solid var(--stroke);
  background: var(--bg);
  border-radius: 14px;
  padding: 0.85rem 0.95rem 0.4rem;
}

.upload-block-title {
  margin-bottom: 0.6rem;
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--ink-soft);
  font-weight: 600;
}

.upload-block-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  gap: 0.15rem 1rem;
}

.span-2 {
  grid-column: 1 / -1;
}

.compact-item {
  margin-bottom: 0.1rem;
}

.anonymity-group {
  display: flex;
  flex-wrap: wrap;
  row-gap: 0.45rem;
}

.upload-form :deep(.el-form-item) {
  margin-bottom: 0.42rem;
}

.upload-form :deep(.el-form-item__label) {
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  /* text-transform: uppercase; */
  color: var(--ink-soft);
  font-weight: 600;
  margin-bottom: 0.2rem;
}

.upload-form :deep(.el-input__wrapper),
.upload-form :deep(.el-select__wrapper),
.upload-form :deep(.el-textarea__inner),
.upload-form :deep(.el-input-number .el-input__wrapper) {
  background: var(--bg);
  border: 1px solid var(--stroke);
  border-radius: 12px;
  box-shadow: none;
}

.upload-form :deep(.el-input-number) {
  width: 100%;
}

.picture-uploader :deep(.el-upload--picture-card) {
  width: 96px;
  height: 96px;
  border-radius: 12px;
  border: 1px dashed var(--stroke);
  background: var(--card);
}

.picture-uploader :deep(.el-upload-list--picture-card .el-upload-list__item) {
  width: 96px;
  height: 96px;
  border-radius: 12px;
}

.upload-plus {
  font-size: 1.4rem;
  color: var(--ink-soft);
}

.upload-hint {
  margin-top: 0.35rem;
  font-size: 0.78rem;
  color: var(--ink-soft);
}

.preview-image {
  width: 100%;
  max-height: 72vh;
  object-fit: contain;
  border-radius: 10px;
}

.upload-dialog :deep(.el-dialog) {
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--stroke);
  background: var(--card);
}

.upload-dialog :deep(.el-dialog__header) {
  margin-right: 0;
  padding: 1rem 1.1rem 0.7rem;
  border-bottom: 1px solid var(--stroke);
  background: linear-gradient(135deg, rgba(213, 106, 58, 0.08), rgba(31, 111, 120, 0.06));
}

.upload-dialog :deep(.el-dialog__body) {
  padding: 0.95rem 1.1rem 1.05rem;
  max-height: 68vh;
  overflow: auto;
}

.upload-dialog :deep(.el-dialog__footer) {
  padding: 0.75rem 1.1rem 1rem;
  border-top: 1px solid var(--stroke);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

@media (max-width: 960px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
  }

  .filter-form {
    grid-template-columns: 1fr;
  }

  .overview-secondary-grid {
    grid-template-columns: 1fr;
  }

  .section-tools {
    width: 100%;
    justify-content: space-between;
  }

  .dialog-header-top {
    flex-direction: column;
    align-items: flex-start;
  }

  .upload-block-grid {
    grid-template-columns: 1fr;
  }

  .upload-dialog {
    width: calc(100vw - 18px) !important;
  }
}
</style>
