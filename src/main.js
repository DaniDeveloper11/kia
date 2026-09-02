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
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Compass,
  Facebook,
  FileCheck,
  FileSignature,
  Globe,
  Hammer,
  HardHat,
  HelpCircle,
  Instagram,
  Layers,
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
  SprayCan,
  SquareStack,
  Star,
  TrendingUp,
  User,
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
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Compass,
  Facebook,
  FileCheck,
  FileSignature,
  Globe,
  Hammer,
  HardHat,
  HelpCircle,
  Instagram,
  Layers,
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
  SprayCan,
  SquareStack,
  Star,
  TrendingUp,
  User,
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
  form: {
    name: '',
    company: '',
    phone: '',
    email: '',
    projectType: '',
    state: '',
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
    if (!this.form.state) errors.state = 'Please select a state.'

    if (!this.form.message.trim() || this.form.message.trim().length < 10) {
      errors.message = 'Tell us a bit more about the project (10+ characters).'
    }

    this.errors = errors
    return Object.keys(errors).length === 0
  },

  submit() {
    if (!this.validate()) return

    this.submitting = true
    // Replace with a real endpoint (Formspree, HubSpot, your CRM, etc.).
    // Simulated network delay so the UI state is easy to verify visually.
    window.setTimeout(() => {
      this.submitting = false
      this.submitted = true
    }, 900)
  },
}))

window.Alpine = Alpine
Alpine.start()

// Lucide icons are static (shown/hidden via x-show, never inserted after
// load), so a single pass once Alpine has finished its initial render is
// enough — no per-interaction re-init required.
createIcons({ icons })
