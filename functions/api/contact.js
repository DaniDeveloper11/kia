/**
 * Cloudflare Pages Function — POST /api/contact
 *
 * Delivers quote requests by email through Resend. Configure these in the
 * Pages project (Settings -> Environment variables):
 *
 *   RESEND_API_KEY     required — https://resend.com/api-keys
 *   CONTACT_TO_EMAIL   required — inbox that receives the leads
 *   CONTACT_FROM_EMAIL required — a sender on a domain verified in Resend
 *                                 (e.g. "KIA Website <noreply@kiacontractors.net>")
 *
 * The browser never sees the API key: it only ever talks to this endpoint.
 */

const FIELDS = [
  ['name', 'Name', 120],
  ['company', 'Company', 120],
  ['phone', 'Phone', 40],
  ['email', 'Email', 160],
  ['projectType', 'Project type', 60],
  ['location', 'Project location', 120],
  ['projectSize', 'Estimated size', 60],
  ['message', 'Project details', 5000],
]

const REQUIRED = ['name', 'company', 'phone', 'email', 'projectType', 'location', 'message']

// Campaign attribution collected by the browser. Never required, never shown
// to the visitor, and kept apart from FIELDS so a crafted payload cannot smuggle
// extra keys into the lead's own data.
const ATTRIBUTION = [
  ['utm_source', 'Source'],
  ['utm_medium', 'Medium'],
  ['utm_campaign', 'Campaign'],
  ['utm_term', 'Term'],
  ['utm_content', 'Content'],
  ['gclid', 'Google click ID'],
  ['fbclid', 'Meta click ID'],
  ['landing_page', 'Landing page'],
  ['referrer', 'Referrer'],
]
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  )

export async function onRequestPost({ request, env }) {
  let payload
  try {
    payload = await request.json()
  } catch {
    return json(400, { error: 'Malformed request.' })
  }

  // Bots fill every field they find; a real browser leaves this one empty.
  if (payload.website) return json(200, { ok: true })

  // Turnstile stays optional: with no secret configured the form behaves exactly
  // as it did before, so adding the keys is what turns protection on.
  if (env.TURNSTILE_SECRET_KEY) {
    const token = typeof payload.turnstileToken === 'string' ? payload.turnstileToken : ''
    if (!token) return json(400, { error: 'Please complete the anti-spam check.' })

    let verdict
    try {
      const check = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secret: env.TURNSTILE_SECRET_KEY.trim(),
            response: token,
            remoteip: request.headers.get('CF-Connecting-IP') || undefined,
          }),
        },
      )
      verdict = await check.json()
    } catch (error) {
      console.error('Could not reach Turnstile:', error?.message || error)
      return json(502, { error: 'We could not send your request. Please call us instead.' })
    }

    if (!verdict.success) {
      console.error('Turnstile rejected the submission:', verdict['error-codes'])
      return json(400, { error: 'Anti-spam check failed. Please try again.' })
    }
  }

  const data = {}
  for (const [key, label, max] of FIELDS) {
    const value = typeof payload[key] === 'string' ? payload[key].trim() : ''
    if (value.length > max) return json(400, { error: `${label} is too long.` })
    data[key] = value
  }

  const missing = REQUIRED.filter((key) => !data[key])
  if (missing.length) return json(400, { error: 'Please complete every required field.' })
  if (!EMAIL_RE.test(data.email)) return json(400, { error: 'Please enter a valid email address.' })
  if (data.phone.replace(/\D/g, '').length < 10)
    return json(400, { error: 'Please enter a valid phone number.' })

  // Dashboard-pasted values often carry a trailing newline or stray spaces. An
  // untrimmed key makes the Authorization header invalid, which throws before
  // the request is even sent and surfaces as an opaque Cloudflare 502.
  const trim = (value) => (typeof value === 'string' ? value.trim() : '')
  const RESEND_API_KEY = trim(env.RESEND_API_KEY)
  const CONTACT_TO_EMAIL = trim(env.CONTACT_TO_EMAIL)
  const CONTACT_FROM_EMAIL = trim(env.CONTACT_FROM_EMAIL)

  if (!RESEND_API_KEY || !CONTACT_TO_EMAIL || !CONTACT_FROM_EMAIL) {
    console.error('Contact form is not configured: missing Resend environment variables.')
    return json(500, { error: 'The form is temporarily unavailable. Please call us instead.' })
  }

  // Resend only accepts "email@example.com" or "Name <email@example.com>", so a
  // malformed variable is worth naming in the log instead of debugging a 422.
  const MAILBOX = String.raw`[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+`
  // A display name is required before the angle brackets: Resend rejects a bare
  // "<noreply@example.com>" just as firmly as a domain with no mailbox at all.
  const ADDRESS_RE = new RegExp(`^(?:[^\\s<>][^<>]*<${MAILBOX}>|${MAILBOX})$`)
  for (const [name, value] of [
    ['CONTACT_FROM_EMAIL', CONTACT_FROM_EMAIL],
    ['CONTACT_TO_EMAIL', CONTACT_TO_EMAIL],
  ]) {
    if (!ADDRESS_RE.test(value)) {
      console.error(`${name} is not a valid address: ${JSON.stringify(value)}`)
      return json(500, { error: 'The form is temporarily unavailable. Please call us instead.' })
    }
  }

  const toRows = (pairs, source) =>
    pairs
      .filter(([key]) => source[key])
      .map(
        ([key, label]) =>
          `<tr><td style="padding:6px 14px 6px 0;vertical-align:top;color:#63635b;white-space:nowrap">${label}</td>` +
          `<td style="padding:6px 0;vertical-align:top;color:#26251f"><strong>${escapeHtml(source[key])}</strong></td></tr>`,
      )
      .join('')

  const rows = toRows(FIELDS, data)

  const campaign = {}
  if (payload.attribution && typeof payload.attribution === 'object') {
    for (const [key] of ATTRIBUTION) {
      const value = payload.attribution[key]
      if (typeof value === 'string' && value.trim()) campaign[key] = value.trim().slice(0, 200)
    }
  }
  const campaignRows = toRows(ATTRIBUTION, campaign)

  // Anything thrown here (bad header value, network failure) would otherwise
  // bubble up as a bare Cloudflare 502 with no clue about what went wrong.
  let response
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: CONTACT_FROM_EMAIL,
        to: [CONTACT_TO_EMAIL],
        reply_to: data.email,
        subject: `Quote request \u2014 ${data.company} (${data.location})`,
        html:
          `<h2 style="font-family:system-ui,sans-serif">New quote request</h2>` +
          `<table style="font-family:system-ui,sans-serif;font-size:14px;border-collapse:collapse">${rows}</table>` +
          (campaignRows
            ? `<h3 style="font-family:system-ui,sans-serif;margin-top:28px;color:#63635b;font-size:13px;text-transform:uppercase;letter-spacing:.05em">Where this lead came from</h3>` +
              `<table style="font-family:system-ui,sans-serif;font-size:13px;border-collapse:collapse">${campaignRows}</table>`
            : `<p style="font-family:system-ui,sans-serif;margin-top:28px;font-size:13px;color:#63635b">Source: direct or organic (no campaign tags).</p>`),
      }),
    })
  } catch (error) {
    console.error('Could not reach Resend:', error?.message || error)
    return json(502, { error: 'We could not send your request. Please call us instead.' })
  }

  if (!response.ok) {
    console.error('Resend rejected the message:', response.status, await response.text())
    return json(502, { error: 'We could not send your request. Please call us instead.' })
  }

  // Acknowledgement to the prospect. Deliberately after the lead email and
  // never awaited into the response: the lead is already safe, so a failure
  // here is logged but must not tell the visitor their request did not go
  // through. Spanish copy for a lead submitted from the /es/ pages.
  const spanish = (request.headers.get('Referer') || '').includes('/es/')
  const greeting = spanish
    ? `<p>Hola ${escapeHtml(data.name.split(' ')[0])}, recibimos tu solicitud de cotizaci\u00f3n.</p>` +
      `<p>Un estimador de KIA revisar\u00e1 tu proyecto en <strong>${escapeHtml(data.location)}</strong> ` +
      `y te contactar\u00e1 en un d\u00eda h\u00e1bil. Si es urgente, ll\u00e1manos al ` +
      `<a href="tel:+18183366604">(818) 336-6604</a>.</p>`
    : `<p>Hi ${escapeHtml(data.name.split(' ')[0])}, we received your quote request.</p>` +
      `<p>A KIA estimator will review your project in <strong>${escapeHtml(data.location)}</strong> ` +
      `and follow up within one business day. If it is urgent, call us at ` +
      `<a href="tel:+18183366604">(818) 336-6604</a>.</p>`

  try {
    const ack = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: CONTACT_FROM_EMAIL,
        to: [data.email],
        reply_to: CONTACT_TO_EMAIL,
        subject: spanish
          ? 'Recibimos tu solicitud \u2014 KIA Contractors Inc.'
          : 'We received your request \u2014 KIA Contractors Inc.',
        html:
          `<div style="font-family:system-ui,sans-serif;font-size:14px;color:#26251f">${greeting}` +
          `<p style="color:#63635b">KIA Contractors Inc. \u00b7 Licensed CA #991941</p></div>`,
      }),
    })
    if (!ack.ok) console.error('Acknowledgement failed:', ack.status, await ack.text())
  } catch (error) {
    console.error('Acknowledgement failed:', error?.message || error)
  }

  return json(200, { ok: true })
}
