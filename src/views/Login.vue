<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '@/api/auth'

const router = useRouter()

const wqId = ref('')
const loading = ref(false)
const errorMessage = ref('')

const handleLogin = async () => {
  if (!wqId.value.trim()) {
    errorMessage.value = 'Please enter your WQ_ID'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const response = await authApi.login(wqId.value.trim())

    if (response.data.success) {
      const token = response.data.access_token
      if (!token) {
        errorMessage.value = 'Login token missing'
        return
      }
      localStorage.setItem('access_token', token)
      localStorage.setItem(
        'user',
        JSON.stringify({
          wq_id: response.data.wq_id,
          username: response.data.username
        })
      )
      localStorage.setItem('isAuthenticated', 'true')
      router.push('/')
    } else {
      errorMessage.value = response.data.message || 'Login failed'
    }
  } catch (error: any) {
    if (error.response) {
      errorMessage.value = error.response.data.detail || 'Login failed, try again.'
    } else if (error.request) {
      errorMessage.value = 'Network error. Check your connection.'
    } else {
      errorMessage.value = 'Unexpected error. Try again.'
    }
  } finally {
    loading.value = false
  }
}

const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    handleLogin()
  }
}
</script>

<template>
  <div class="login-shell">
    <div class="brand-panel">
      <div class="brand-mark">WQ</div>
      <div class="brand-copy">
        <p class="brand-kicker">Quant Lab Console</p>
        <h1 class="brand-title">WQ Manager</h1>
        <p class="brand-subtitle">
          A focused command surface for monitoring weight, submissions, and correlation velocity across
          the WorldQuant network.
        </p>
      </div>
      <div class="brand-metrics">
        <div>
          <span>Signals</span>
          <strong>Live</strong>
        </div>
        <div>
          <span>Access</span>
          <strong>Verified</strong>
        </div>
        <div>
          <span>Latency</span>
          <strong>Low</strong>
        </div>
      </div>
    </div>

    <div class="login-panel">
      <div class="login-card">
        <div class="login-header">
          <p class="login-overline">Secure Access</p>
          <h2>Sign in with your WQ_ID</h2>
          <p class="login-note">Use the ID already registered in the system.</p>
        </div>

        <div class="login-form">
          <div class="form-group">
            <label for="wq-id" class="form-label">WQ_ID</label>
            <input
              id="wq-id"
              v-model="wqId"
              type="text"
              class="form-input"
              placeholder="Enter your WorldQuant ID"
              :disabled="loading"
              @keyup="handleKeyPress"
              autofocus
            />
          </div>

          <div v-if="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>

          <button class="login-btn" :disabled="loading" @click="handleLogin">
            <span v-if="loading" class="loading-spinner"></span>
            <span v-else>Enter Console</span>
          </button>
        </div>

        <div class="login-footer">
          <p>Support access is available through the operations lead.</p>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.login-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(280px, 1.1fr) minmax(320px, 0.9fr);
  gap: 2.5rem;
  padding: 4rem clamp(1.5rem, 4vw, 4rem);
  position: relative;
  z-index: 1;
}

.brand-panel {
  background: linear-gradient(135deg, rgba(213, 106, 58, 0.12), rgba(31, 111, 120, 0.08));
  border: 1px solid var(--stroke);
  border-radius: var(--radius-lg);
  padding: 3rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  box-shadow: var(--shadow-md);
}

.brand-mark {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 3.5rem;
  font-weight: 800;
  color: var(--ink);
  letter-spacing: -0.04em;
}

.brand-kicker {
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.3em;
  color: var(--accent-2);
  font-weight: 700;
}

.brand-title {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: clamp(2.5rem, 4vw, 3.5rem);
  margin: 0.5rem 0 1rem;
  letter-spacing: -0.03em;
}

.brand-subtitle {
  color: var(--ink-soft);
  max-width: 420px;
}

.brand-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.5rem;
  border-top: 1px solid var(--stroke);
  padding-top: 1.5rem;
}

.brand-metrics span {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--ink-soft);
}

.brand-metrics strong {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 1.2rem;
  color: var(--ink);
}

.login-panel {
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: var(--card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--stroke);
  box-shadow: var(--shadow-lg);
  padding: 2.5rem;
  animation: cardIn 0.6s ease;
}

@keyframes cardIn {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-header h2 {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 1.8rem;
  margin-bottom: 0.5rem;
}

.login-overline {
  text-transform: uppercase;
  letter-spacing: 0.3em;
  font-size: 0.7rem;
  color: var(--accent);
  font-weight: 700;
}

.login-note {
  color: var(--ink-soft);
}

.login-form {
  margin-top: 2rem;
  display: grid;
  gap: 1rem;
}

.form-label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--ink-soft);
  margin-bottom: 0.5rem;
}

.form-input {
  width: 100%;
  padding: 0.85rem 1rem;
  border: 1px solid var(--stroke);
  border-radius: var(--radius-sm);
  font-size: 1rem;
  background: #fff;
  transition: all 0.2s ease;
  outline: none;
}

.form-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(213, 106, 58, 0.15);
}

.login-btn {
  width: 100%;
  padding: 0.95rem 1rem;
  border: none;
  border-radius: var(--radius-sm);
  background: linear-gradient(120deg, var(--accent), #e08a46);
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(213, 106, 58, 0.35);
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-message {
  background: rgba(186, 32, 32, 0.1);
  border: 1px solid rgba(186, 32, 32, 0.3);
  color: #8a1f1f;
  padding: 0.75rem;
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
}

.login-footer {
  margin-top: 2rem;
  color: var(--ink-soft);
  font-size: 0.9rem;
  border-top: 1px solid var(--stroke);
  padding-top: 1rem;
}

@media (max-width: 900px) {
  .login-shell {
    grid-template-columns: 1fr;
  }

  .brand-panel {
    order: 2;
  }
}
</style>
