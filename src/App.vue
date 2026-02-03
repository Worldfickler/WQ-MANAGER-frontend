<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import FloatingMenu from '@/components/FloatingMenu.vue'

const route = useRoute()
</script>

<template>
  <div id="app">
    <main>
      <RouterView />
    </main>
    <FloatingMenu v-if="route.name !== 'Login'" />
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Newsreader:wght@300;400;500;600;700&display=swap');

:root {
  --bg: #f6f1e7;
  --bg-2: #efe4d4;
  --ink: #1b1916;
  --ink-soft: #3c362f;
  --accent: #d56a3a;
  --accent-2: #1f6f78;
  --card: #fff8ee;
  --stroke: rgba(27, 25, 22, 0.12);
  --shadow-lg: 0 20px 60px rgba(18, 14, 10, 0.18);
  --shadow-md: 0 12px 28px rgba(18, 14, 10, 0.12);
  --radius-lg: 24px;
  --radius-md: 16px;
  --radius-sm: 10px;
  --el-font-family: 'Newsreader', serif;
  --el-color-primary: #d56a3a;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Newsreader', serif;
  background: radial-gradient(1200px 900px at 10% -20%, #fdf2e2 0%, transparent 55%),
    radial-gradient(1200px 900px at 110% 10%, #f1e8dd 0%, transparent 50%),
    var(--bg);
  color: var(--ink);
  line-height: 1.6;
  min-height: 100vh;
}

#app {
  min-height: 100vh;
}

main {
  padding: 0;
}

body::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image:
    radial-gradient(rgba(0, 0, 0, 0.08) 1px, transparent 1px),
    radial-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px);
  background-size: 3px 3px, 2px 2px;
  opacity: 0.25;
  mix-blend-mode: multiply;
  z-index: 0;
}

body::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image: linear-gradient(rgba(0, 0, 0, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 0, 0, 0.06) 1px, transparent 1px);
  background-size: 48px 48px;
  opacity: 0.2;
  z-index: 0;
}
</style>
