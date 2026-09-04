<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import wechatQr from '@/assets/sponsor/wx.jpg'
import alipayQr from '@/assets/sponsor/zfb.jpg'
import { sponsorApi } from '@/api/sponsor'

interface PaymentMethod {
  key: 'wechat' | 'alipay'
  name: string
  label: string
  icon: string
  qrCode: string
  instruction: string
}

const paymentMethods: PaymentMethod[] = [
  {
    key: 'wechat',
    name: '微信支付',
    label: 'WECHAT PAY',
    icon: '微',
    qrCode: wechatQr,
    instruction: '打开微信扫一扫，识别二维码后按页面提示完成付款。'
  },
  {
    key: 'alipay',
    name: '支付宝',
    label: 'ALIPAY',
    icon: '支',
    qrCode: alipayQr,
    instruction: '打开支付宝扫一扫，识别二维码后按页面提示完成付款。'
  }
]

const donors = ref<string[]>([])

interface FloatingDonor {
  key: string
  label: string
  prefix: string
  suffix: string
  style: Record<string, string>
}

const floatingDonors = computed<FloatingDonor[]>(() => {
  const occurrenceCounts = new Map<string, number>()

  return donors.value.map((donor, index) => {
    const occurrence = (occurrenceCounts.get(donor) || 0) + 1
    occurrenceCounts.set(donor, occurrence)
    const duration = 20 + (index % 6) * 4
    return {
      key: `${donor}-${index}`,
      label: donor,
      prefix: occurrence > 1 ? '再次感谢' : '感谢',
      suffix: '的支持',
      style: {
        '--float-top': `${5 + ((index * 37) % 88)}%`,
        '--float-duration': `${duration}s`,
        '--float-delay': `${-((index * 7) % duration)}s`,
        '--float-drift-y': `${-16 + (index % 6) * 7}px`,
        '--float-opacity': `${0.58 + (index % 4) * 0.06}`,
        '--float-scale': `${0.88 + (index % 5) * 0.05}`
      }
    }
  })
})

const loadDonors = async () => {
  try {
    const response = await sponsorApi.getDonors()
    donors.value = response.data.donors
  } catch (error) {
    console.error('获取赞助者列表失败:', error)
  }
}

onMounted(loadDonors)
</script>

<template>
  <div class="sponsor-page">
    <div v-if="floatingDonors.length" class="supporter-float-layer" aria-hidden="true">
      <span
        v-for="donor in floatingDonors"
        :key="donor.key"
        class="floating-supporter"
        :style="donor.style"
      >
        <span class="floating-supporter-label">
          <span class="floating-supporter-mark">♥</span>
          <span>{{ donor.prefix }}</span>
          <strong>{{ donor.label }}</strong>
          <span>{{ donor.suffix }}</span>
        </span>
      </span>
    </div>
    <p class="visually-hidden" aria-live="polite">
      已加载 {{ donors.length }} 条赞助记录
    </p>

    <header class="sponsor-hero">
      <div class="hero-copy">
        <div class="hero-badge">SUPPORT / SPONSOR</div>
        <h1 class="hero-title">赞助这个项目</h1>
        <p class="hero-subtitle">
          如果这个平台为你的研究或日常使用带来了帮助，可以自愿请开发者喝杯咖啡。每一份支持都会用于持续维护和体验优化。
        </p>
      </div>
      <div class="hero-note" aria-label="赞助原则">
        <span class="note-mark">♥</span>
        <div>
          <strong>完全自愿</strong>
          <p>不影响任何现有功能与服务</p>
        </div>
      </div>
    </header>

    <section class="payment-section" aria-labelledby="payment-title">
      <div class="section-heading">
        <div>
          <span class="section-kicker">SCAN TO SUPPORT</span>
          <h2 id="payment-title">选择赞助方式</h2>
        </div>
        <p>请使用对应 App 扫描二维码，赞助金额可自行决定。</p>
      </div>

      <div class="payment-grid">
        <article
          v-for="method in paymentMethods"
          :key="method.key"
          class="payment-card"
          :class="`payment-card--${method.key}`"
        >
          <div class="method-header">
            <span class="method-icon" aria-hidden="true">{{ method.icon }}</span>
            <div>
              <span class="method-label">{{ method.label }}</span>
              <h3>{{ method.name }}</h3>
            </div>
          </div>

          <figure class="qr-figure">
            <div class="qr-frame">
              <img :src="method.qrCode" :alt="`${method.name}赞助二维码`" />
            </div>
            <figcaption>{{ method.instruction }}</figcaption>
          </figure>
        </article>
      </div>
    </section>

    <aside class="sponsor-guidance" aria-labelledby="guidance-title">
      <div class="guidance-heading">
        <span class="guidance-icon" aria-hidden="true">i</span>
        <h2 id="guidance-title">赞助提示</h2>
      </div>
      <ul>
        <li>赞助完全自愿，不会解锁额外功能，也不会影响账号的正常使用。</li>
        <li>付款前请核对收款方信息；请勿在陌生页面输入密码或验证码。</li>
        <li>所收到的赞助将用于项目的持续开发和维护，包括但不限于服务器、域名等费用。</li>
        <li>付款完成后，如需展示在感谢名单中，请在备注中留下你的 WQ_ID 或联系作者。</li>
      </ul>
    </aside>

    <footer class="sponsor-footer">
      <span class="footer-line"></span>
      <p>感谢你的认可与陪伴，它让这个项目走得更远。</p>
    </footer>
  </div>
</template>

<style scoped>
.sponsor-page {
  max-width: 1180px;
  margin: 0 auto;
  padding: 2.8rem clamp(1.5rem, 4vw, 3.5rem) 4rem;
  position: relative;
  z-index: 1;
}

.sponsor-hero,
.payment-section,
.sponsor-guidance,
.sponsor-footer {
  position: relative;
}

.supporter-float-layer {
  position: fixed;
  inset: 0;
  z-index: 2;
  overflow: hidden;
  pointer-events: none;
}

.floating-supporter {
  position: absolute;
  top: var(--float-top);
  left: 0;
  opacity: var(--float-opacity);
  transform: translate3d(-22vw, 0, 0) scale(var(--float-scale));
  animation: supporterDrift var(--float-duration) linear var(--float-delay) infinite;
  will-change: transform;
}

.floating-supporter-label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.42rem 0.78rem;
  border: 1px solid rgba(31, 111, 120, 0.4);
  border-radius: 999px;
  background: rgba(255, 248, 238, 0.96);
  box-shadow: 0 9px 22px rgba(18, 14, 10, 0.16);
  color: var(--ink);
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 0.84rem;
  font-weight: 600;
  white-space: nowrap;
  backdrop-filter: blur(4px);
  animation: supporterBob 4.8s ease-in-out infinite;
}

.floating-supporter-mark {
  color: var(--accent);
  font-size: 0.72rem;
}

.floating-supporter-label strong {
  color: var(--accent-2);
  font-weight: 700;
  letter-spacing: 0.02em;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@keyframes supporterDrift {
  from {
    transform: translate3d(-22vw, 0, 0) scale(var(--float-scale));
  }
  to {
    transform: translate3d(122vw, var(--float-drift-y), 0) scale(var(--float-scale));
  }
}

@keyframes supporterBob {
  0%,
  100% {
    translate: 0 -3px;
  }
  50% {
    translate: 0 5px;
  }
}

.sponsor-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 2rem;
  padding: 2.5rem 2.8rem;
  margin-bottom: 2rem;
  overflow: hidden;
  background:
    radial-gradient(circle at 92% 5%, rgba(213, 106, 58, 0.24), transparent 38%),
    radial-gradient(circle at 5% 110%, rgba(31, 111, 120, 0.17), transparent 42%),
    var(--card);
  border: 1px solid var(--stroke);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.hero-copy {
  max-width: 720px;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.9rem;
  border: 1px solid var(--stroke);
  border-radius: 999px;
  background: rgba(27, 25, 22, 0.08);
  color: var(--ink-soft);
  font-size: 0.7rem;
  letter-spacing: 0.2em;
}

.hero-title {
  margin-top: 1rem;
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: clamp(2rem, 3.5vw, 2.7rem);
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.hero-subtitle {
  max-width: 650px;
  margin-top: 0.7rem;
  color: var(--ink-soft);
  font-size: 1rem;
  line-height: 1.75;
}

.hero-note {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  min-width: 220px;
  padding: 1rem 1.15rem;
  border: 1px solid rgba(213, 106, 58, 0.22);
  border-radius: var(--radius-md);
  background: rgba(255, 248, 238, 0.72);
}

.note-mark {
  display: grid;
  flex: 0 0 42px;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 1.05rem;
}

.hero-note strong {
  display: block;
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 0.95rem;
}

.hero-note p {
  margin-top: 0.15rem;
  color: var(--ink-soft);
  font-size: 0.82rem;
}

.payment-section {
  padding: 1.5rem;
  border: 1px solid var(--stroke);
  border-radius: var(--radius-lg);
  background: rgba(255, 248, 238, 0.55);
  box-shadow: var(--shadow-md);
}

.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 2rem;
  padding: 0.25rem 0.25rem 1.25rem;
}

.section-kicker,
.method-label {
  color: var(--accent-2);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.2em;
}

.section-heading h2 {
  margin-top: 0.25rem;
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 1.45rem;
}

.section-heading p {
  max-width: 420px;
  color: var(--ink-soft);
  font-size: 0.9rem;
  text-align: right;
}

.payment-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.2rem;
}

.payment-card {
  position: relative;
  overflow: hidden;
  padding: 1.35rem;
  border: 1px solid var(--stroke);
  border-radius: var(--radius-md);
  background: var(--card);
}

.payment-card::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(260px 150px at 100% 0%, var(--method-glow), transparent 70%);
}

.payment-card--wechat {
  --method-color: #178f58;
  --method-glow: rgba(23, 143, 88, 0.12);
}

.payment-card--alipay {
  --method-color: #1677ff;
  --method-glow: rgba(22, 119, 255, 0.12);
}

.method-header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding-bottom: 1.1rem;
  border-bottom: 1px solid var(--stroke);
}

.method-icon {
  display: grid;
  flex: 0 0 46px;
  width: 46px;
  height: 46px;
  place-items: center;
  border-radius: 14px;
  background: var(--method-color);
  color: #fff;
  font-family: 'Bricolage Grotesque', sans-serif;
  font-weight: 700;
}

.method-label {
  color: var(--method-color);
}

.method-header h3 {
  margin-top: 0.1rem;
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 1.15rem;
}

.qr-figure {
  position: relative;
  z-index: 3;
  display: grid;
  place-items: center;
  gap: 0.9rem;
  margin-top: 1.25rem;
}

.qr-frame {
  position: relative;
  width: min(100%, 310px);
  aspect-ratio: 2 / 3;
  padding: 0.75rem;
  border: 1px solid var(--stroke);
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(18, 14, 10, 0.1);
  overflow: hidden;
}

.qr-frame img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 12px;
}

.qr-figure figcaption {
  max-width: 340px;
  color: var(--ink-soft);
  font-size: 0.9rem;
  line-height: 1.6;
  text-align: center;
}

.sponsor-guidance {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 1.5rem;
  margin-top: 1.3rem;
  padding: 1.4rem 1.5rem;
  border: 1px solid var(--stroke);
  border-radius: var(--radius-md);
  background: var(--card);
  box-shadow: var(--shadow-md);
}

.guidance-heading {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.guidance-icon {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 1px solid var(--stroke);
  border-radius: 50%;
  color: var(--accent);
  font-weight: 700;
}

.guidance-heading h2 {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 1rem;
}

.sponsor-guidance ul {
  display: grid;
  gap: 0.45rem;
  margin: 0;
  padding-left: 1.2rem;
  color: var(--ink-soft);
  font-size: 0.88rem;
}

.sponsor-footer {
  margin-top: 2.2rem;
  color: var(--ink-soft);
  font-size: 0.9rem;
  text-align: center;
}

.footer-line {
  display: block;
  width: 120px;
  height: 2px;
  margin: 0 auto 0.8rem;
  background: linear-gradient(90deg, transparent, rgba(213, 106, 58, 0.65), transparent);
}

@media (max-width: 860px) {
  .sponsor-hero {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .hero-note {
    width: fit-content;
  }

  .payment-grid {
    grid-template-columns: 1fr;
  }

}

@media (max-width: 640px) {
  .sponsor-page {
    padding-inline: 1rem;
  }

  .sponsor-hero {
    padding: 1.7rem;
  }

  .payment-section {
    padding: 1rem;
  }

  .section-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.55rem;
  }

  .section-heading p {
    text-align: left;
  }

  .sponsor-guidance {
    grid-template-columns: 1fr;
    gap: 0.8rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .floating-supporter,
  .floating-supporter-label {
    animation: none;
  }

  .floating-supporter {
    display: none;
  }
}
</style>
