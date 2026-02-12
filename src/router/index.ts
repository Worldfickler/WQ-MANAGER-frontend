import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import Login from '@/views/Login.vue'
import Profile from '@/views/Profile.vue'
import Dashboard from '@/views/Dashboard.vue'
import Trends from '@/views/Trends.vue'
import Genius from '@/views/Genius.vue'
import Notice from '@/views/Notice.vue'
import ValueFactor from '@/views/ValueFactor.vue'
import Combined from '@/views/Combined.vue'

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
    }
  ]
})

// 路由守卫
router.beforeEach((to, _from, next) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'

  if (to.meta.requiresAuth && !isAuthenticated) {
    // 需要认证但未登录，跳转到登录页
    next('/login')
  } else if (to.path === '/login' && isAuthenticated) {
    // 已登录用户访问登录页，跳转到首页
    next('/')
  } else {
    next()
  }
})

export default router
