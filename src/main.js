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
 * Quote / contact form with inline Alpine validation.
 */
Alpine.data('quoteForm', () => ({
  submitting: false,
  submitted: false,
  submitError: '',
  // Honeypot: hidden from people, irresistible to bots. Non-empty means spam.
  website: '',
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
        body: JSON.stringify({ ...this.form, website: this.website }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'We could not send your request.')

      this.submitted = true
      // The success panel lives in an x-if, so Alpine only inserts it now —
      // after the initial createIcons() pass. Without a second pass its
      // <i data-lucide> placeholder never becomes an SVG.
      this.$nextTick(() => createIcons({ icons }))
      track('quote_submitted', { project_type: this.form.projectType })
    } catch (error) {
      // Keep the filled-in form on screen so nothing the user typed is lost.
      this.submitError =
        error.message || 'We could not send your request. Please call us instead.'
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
