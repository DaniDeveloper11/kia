import './style.css'
import Alpine from 'alpinejs'
import {
  createIcons,
  Activity,
  ArrowRight,
  Award,
  BadgeCheck,
  Banknote,
  BrickWall,
  Briefcase,
  Building2,
  Building,
  Calendar,
  Car,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Drill,
  Compass,
  Dumbbell,
  Facebook,
  FileCheck,
  FileCode,
  FileSignature,
  Hammer,
  HardHat,
  Home,
  Hotel,
  HelpCircle,
  Instagram,
  Layers,
  LayoutGrid,
  Linkedin,
  Mail,
  MapPin,
  Menu,
  MessageSquare,
  PackageCheck,
  Phone,
  Quote,
  Ruler,
  Search,
  Send,
  ShieldCheck,
  SquareParking,
  SprayCan,
  SquareStack,
  Store,
  Star,
  TrendingUp,
  User,
  Warehouse,
  Waves,
  X,
} from 'lucide'

// Only the icons actually used on the page are imported above, so the
// bundle doesn't ship all ~1,500 Lucide icons. Add new entries here
// whenever a new data-lucide="..." name is used in index.html.
const icons = {
  Activity,
  ArrowRight,
  Award,
  BadgeCheck,
  Banknote,
  BrickWall,
  Briefcase,
  Building2,
  Building,
  Calendar,
  Car,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Drill,
  Compass,
  Dumbbell,
  Facebook,
  FileCheck,
  FileCode,
  FileSignature,
  Hammer,
  HardHat,
  Home,
  Hotel,
  HelpCircle,
  Instagram,
  Layers,
  LayoutGrid,
  Linkedin,
  Mail,
  MapPin,
  Menu,
  MessageSquare,
  PackageCheck,
  Phone,
  Quote,
  Ruler,
  Search,
  Send,
  ShieldCheck,
  SquareParking,
  SprayCan,
  SquareStack,
  Store,
  Star,
  TrendingUp,
  User,
  Warehouse,
  Waves,
  X,
}

/**
 * Animated stat counter (used in the stats bar).
 * Usage: <div x-data="counter(120, { suffix: '+' })">
 * Counts up only once, when the element scrolls into view.
 */
Alpine.data('counter', (target, opts = {}) => ({
  display: (opts.prefix || '') + '0' + (opts.suffix || ''),
  init() {
    const prefix = opts.prefix || ''
    const suffix = opts.suffix || ''
    const duration = 1600
    let started = false

    const run = () => {
      if (started) return
      started = true
      const start = performance.now()
      const step = (now) => {
        const progress = Math.min((now - start) / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        const value = Math.floor(eased * target)
        this.display = prefix + value.toLocaleString('en-US') + suffix
        if (progress < 1) {
          requestAnimationFrame(step)
        } else {
          this.display = prefix + target.toLocaleString('en-US') + suffix
        }
      }
      requestAnimationFrame(step)
    }

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              run()
              observer.disconnect()
            }
          })
        },
        { threshold: 0.4 },
      )
      observer.observe(this.$el)
    } else {
      run()
    }
  },
}))

/**
 * Turnstile (Cloudflare's invisible CAPTCHA).
 *
 * The site key is public and baked in at build time. When it is absent the
 * widget is skipped entirely and the server skips verification too, so the
 * form keeps working before the keys are configured.
 */
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''
let turnstileScript

function loadTurnstile() {
  if (!TURNSTILE_SITE_KEY) return Promise.resolve(null)
  if (!turnstileScript) {
    turnstileScript = new Promise((resolve, reject) => {
      const el = document.createElement('script')
      el.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      el.async = true
      el.onload = () => resolve(window.turnstile)
      el.onerror = () => reject(new Error('Turnstile failed to load'))
      document.head.appendChild(el)
    })
  }
  return turnstileScript
}

/**
 * Campaign attribution for the quote form.
 *
 * The UTM tags only exist on the URL of the page the visitor landed on, and
 * they are gone the moment they click through to /es/ or reload. Stashing them
 * in sessionStorage on first sight keeps the attribution attached to whichever
 * page they eventually submit from, and it expires with the tab — a later
 * organic visit is not credited to an old campaign.
 */
const ATTRIBUTION_KEY = 'kia:attribution'
const ATTRIBUTION_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
]

function readAttribution() {
  let stored = {}
  try {
    stored = JSON.parse(sessionStorage.getItem(ATTRIBUTION_KEY) || '{}')
  } catch {
    // Private mode and blocked storage both throw; attribution is optional.
  }

  const params = new URLSearchParams(window.location.search)
  const fresh = {}
  for (const key of ATTRIBUTION_PARAMS) {
    const value = params.get(key)
    if (value) fresh[key] = value.slice(0, 200)
  }

  // Only the first touch of the session wins, so an internal link carrying no
  // tags cannot blank out the campaign that actually brought the visitor in.
  if (!Object.keys(fresh).length) return stored

  const attribution = {
    ...fresh,
    landing_page: window.location.pathname,
    referrer: document.referrer ? new URL(document.referrer).hostname : '',
  }

  try {
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution))
  } catch {
    // Not being able to persist it is fine: this pageview still sends it.
  }
  return attribution
}

/**
 * Quote / contact form with inline Alpine validation.
 */
Alpine.data('quoteForm', () => ({
  submitting: false,
  submitted: false,
  submitError: '',
  // Honeypot: hidden from people, irresistible to bots. Non-empty means spam.
  website: '',
  turnstileToken: '',
  turnstileId: null,

  init() {
    loadTurnstile()
      .then((turnstile) => {
        if (!turnstile || !this.$refs.turnstile) return
        this.turnstileId = turnstile.render(this.$refs.turnstile, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token) => {
            this.turnstileToken = token
          },
          'expired-callback': () => {
            this.turnstileToken = ''
          },
        })
      })
      .catch(() => {
        // A blocked or failed widget must not lock people out of the form:
        // the server decides whether a missing token is acceptable.
      })
  },
  form: {
    name: '',
    company: '',
    phone: '',
    email: '',
    projectType: '',
    location: '',
    projectSize: '',
    message: '',
  },
  errors: {},

  validate() {
    const errors = {}

    if (!this.form.name.trim()) errors.name = 'Please enter your full name.'
    if (!this.form.company.trim()) errors.company = 'Please enter your company name.'

    const phoneDigits = this.form.phone.replace(/\D/g, '')
    if (phoneDigits.length < 10) errors.phone = 'Please enter a valid phone number.'

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(this.form.email)) errors.email = 'Please enter a valid email address.'

    if (!this.form.projectType) errors.projectType = 'Please select a project type.'
    if (!this.form.location.trim()) errors.location = 'Please enter the project location.'

    if (!this.form.message.trim() || this.form.message.trim().length < 10) {
      errors.message = 'Tell us a bit more about the project (10+ characters).'
    }

    this.errors = errors
    return Object.keys(errors).length === 0
  },

  async submit() {
    if (!this.validate()) return

    this.submitting = true
    this.submitError = ''

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...this.form,
          website: this.website,
          attribution: readAttribution(),
          turnstileToken: this.turnstileToken,
        }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'We could not send your request.')

      this.submitted = true
      // The success panel lives in an x-if, so Alpine only inserts it now —
      // after the initial createIcons() pass. Without a second pass its
      // <i data-lucide> placeholder never becomes an SVG.
      this.$nextTick(() => createIcons({ icons }))
      track('quote_submitted', {
        project_type: this.form.projectType,
        utm_source: readAttribution().utm_source || '(direct)',
      })
    } catch (error) {
      // Keep the filled-in form on screen so nothing the user typed is lost.
      this.submitError =
        error.message || 'We could not send your request. Please call us instead.'
      // A token is single-use: without a reset the retry fails verification.
      if (this.turnstileId !== null && window.turnstile) {
        this.turnstileToken = ''
        window.turnstile.reset(this.turnstileId)
      }
    } finally {
      this.submitting = false
    }
  },
}))

/**
 * Provider-agnostic event tracking. Forwards to GA4 (gtag), GTM (dataLayer),
 * or Cloudflare Web Analytics if any of them is present, and is a no-op
 * otherwise — so adding an analytics snippet later needs no code change here.
 */
function track(event, params = {}) {
  if (typeof window.gtag === 'function') window.gtag('event', event, params)
  if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event, ...params })
}

// Outbound/contact intents worth measuring: phone taps, WhatsApp, and the
// CTA buttons. Delegated so new [data-track] elements need no extra wiring.
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-track], a[href^="tel:"], a[href*="wa.me"]')
  if (!el) return

  const name =
    el.dataset.track ||
    (el.getAttribute('href').startsWith('tel:') ? 'phone_click' : 'whatsapp_click')
  track(name)
})

window.Alpine = Alpine
Alpine.start()

// Every icon present on first render is converted here. The one exception is
// the quote form's success panel, which Alpine inserts later from an x-if and
// which re-runs createIcons() itself.
createIcons({ icons })
