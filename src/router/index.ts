import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

import { userApi } from '@/api/user'
import Home from '@/views/Home.vue'
import Login from '@/views/Login.vue'
import Profile from '@/views/Profile.vue'
import Dashboard from '@/views/Dashboard.vue'
import Trends from '@/views/Trends.vue'
import Genius from '@/views/Genius.vue'
import Notice from '@/views/Notice.vue'
import ValueFactor from '@/views/ValueFactor.vue'
import Combined from '@/views/Combined.vue'
import Consultant from '@/views/Consultant.vue'
import Osmosis from '@/views/Osmosis.vue'
import BasePayment from '@/views/BasePayment.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: Login,
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      name: 'Home',
      component: Home,
      meta: { requiresAuth: true }
    },
    {
      path: '/profile',
      name: 'Profile',
      component: Profile,
      meta: { requiresAuth: true }
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: Dashboard,
      meta: { requiresAuth: true }
    },
    {
      path: '/trends',
      name: 'Trends',
      component: Trends,
      meta: { requiresAuth: true }
    },
    {
      path: '/genius',
      name: 'Genius',
      component: Genius,
      meta: { requiresAuth: true }
    },
    {
      path: '/notice',
      name: 'Notice',
      component: Notice,
      meta: { requiresAuth: true }
    },
    {
      path: '/value-factor',
      name: 'ValueFactor',
      component: ValueFactor,
      meta: { requiresAuth: true }
    },
    {
      path: '/combined',
      name: 'Combined',
      component: Combined,
      meta: { requiresAuth: true }
    },
    {
      path: '/consultant',
      name: 'Consultant',
      component: Consultant,
      meta: { requiresAuth: true }
    },
    {
      path: '/osmosis',
      name: 'Osmosis',
      component: Osmosis,
      meta: { requiresAuth: true }
    },
    {
      path: '/base-payment',
      name: 'BasePayment',
      component: BasePayment,
      meta: { requiresAuth: true }
    }
  ]
})

type PageAuthGrantCache = {
  access_grant_token: string
  expires_at: string
}

const getCurrentUserId = (): string => {
  const rawUser = localStorage.getItem('user')
  if (!rawUser) {
    return 'anonymous'
  }

  try {
    const parsed = JSON.parse(rawUser)
    const wqId = String(parsed?.wq_id || '').trim().toUpperCase()
    return wqId || 'anonymous'
  } catch {
    return 'anonymous'
  }
}

const getPageAuthGrantStorageKey = (pageKey: string): string => {
  return `page-auth:grant:${getCurrentUserId()}:${pageKey}`
}

const getPageAuthGrantToken = (pageKey: string): string | null => {
  const key = getPageAuthGrantStorageKey(pageKey)
  const rawCache = sessionStorage.getItem(key)
  if (!rawCache) return null

  try {
    const parsed = JSON.parse(rawCache) as Partial<PageAuthGrantCache>
    const token = String(parsed.access_grant_token || '').trim()
    const expiresAtRaw = String(parsed.expires_at || '').trim()
    const expiresAtTs = Date.parse(expiresAtRaw)

    if (token && Number.isFinite(expiresAtTs) && expiresAtTs > Date.now()) {
      return token
    }
  } catch {
    // noop
  }

  sessionStorage.removeItem(key)
  return null
}

const setPageAuthGrantToken = (pageKey: string, accessGrantToken: string, expiresAt: string): void => {
  const key = getPageAuthGrantStorageKey(pageKey)
  sessionStorage.setItem(
    key,
    JSON.stringify({
      access_grant_token: accessGrantToken,
      expires_at: expiresAt
    } satisfies PageAuthGrantCache)
  )
}

const clearPageAuthGrantToken = (pageKey: string): void => {
  sessionStorage.removeItem(getPageAuthGrantStorageKey(pageKey))
}

const isPromptCancelled = (error: any): boolean => {
  return error === 'cancel' || error === 'close' || error?.action === 'cancel' || error?.action === 'close'
}

const promptPageAuthCode = async (title: string, message: string, confirmButtonText: string) => {
  const { value } = await ElMessageBox.prompt(message, title, {
    confirmButtonText,
    cancelButtonText: '取消',
    inputType: 'password',
    inputPlaceholder: '请输入访问口令',
    closeOnClickModal: false,
    closeOnPressEscape: false,
    inputValidator: (input: string) => {
      if (!input || !input.trim()) {
        return '访问口令不能为空'
      }
      if (input.trim().length > 128) {
        return '访问口令长度不能超过 128'
      }
      return true
    }
  })

  return (value || '').trim()
}

// 路由守卫
router.beforeEach(async (to) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'

  if (to.meta.requiresAuth && !isAuthenticated) {
    return '/login'
  }

  if (to.path === '/login' && isAuthenticated) {
    return '/'
  }

  if (to.path === '/base-payment' && isAuthenticated) {
    try {
      const pageKey = 'base-payment'
      if (getPageAuthGrantToken(pageKey)) {
        return true
      }

      const statusResponse = await userApi.getPageAuthStatus(pageKey)
      if (!statusResponse.data.is_set) {
        clearPageAuthGrantToken(pageKey)
      }

      if (!statusResponse.data.is_set) {
        ElMessage.warning('检测到您尚未设置 Base Payment 页面访问口令，请先设置')
        const newAuthCode = await promptPageAuthCode(
          '设置 Base Payment 访问口令',
          '这是您自定义的页面访问口令，用于保护 Base Payment 页面。',
          '设置并继续'
        )
        await userApi.setPageAuthCode(pageKey, newAuthCode)
        const verifyAfterSet = await userApi.verifyPageAuthCode(pageKey, newAuthCode)
        if (!verifyAfterSet.data.verified) {
          clearPageAuthGrantToken(pageKey)
          ElMessage.error(verifyAfterSet.data.message || '访问口令校验失败，请重试')
          return '/'
        }
        const grantToken = String(verifyAfterSet.data.access_grant_token || '').trim()
        const expiresAt = String(verifyAfterSet.data.expires_at || '').trim()
        if (!grantToken || !expiresAt) {
          clearPageAuthGrantToken(pageKey)
          ElMessage.error('授权凭证下发失败，请重试')
          return '/'
        }
        setPageAuthGrantToken(pageKey, grantToken, expiresAt)
        ElMessage.success('访问口令设置成功，已自动验证')
        return true
      }

      const inputCode = await promptPageAuthCode(
        'Base Payment 访问验证',
        '请输入 Base Payment 页面访问口令',
        '验证并进入'
      )
      const verifyResponse = await userApi.verifyPageAuthCode(pageKey, inputCode)

      if (!verifyResponse.data.verified) {
        clearPageAuthGrantToken(pageKey)
        ElMessage.error(verifyResponse.data.message || '访问口令错误，无法进入页面')
        return '/'
      }

      const grantToken = String(verifyResponse.data.access_grant_token || '').trim()
      const expiresAt = String(verifyResponse.data.expires_at || '').trim()
      if (!grantToken || !expiresAt) {
        clearPageAuthGrantToken(pageKey)
        ElMessage.error('授权凭证下发失败，请重试')
        return '/'
      }

      setPageAuthGrantToken(pageKey, grantToken, expiresAt)
    } catch (error: any) {
      clearPageAuthGrantToken('base-payment')
      if (isPromptCancelled(error)) {
        ElMessage.info('已取消访问 Base Payment 页面')
      } else {
        const message = error?.response?.data?.detail || '页面访问口令校验失败'
        ElMessage.error(message)
      }
      return '/'
    }
  }

  return true
})

export default router
