// Vercel serverless function: POST /api/contact
// Emails contact-form enquiries to Chloe via Resend (https://resend.com).
//
// Environment variables (Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY  re_xxx — from resend.com/api-keys
//   CONTACT_TO      the inbox enquiries go to, e.g. chloe@example.com
//   CONTACT_FROM    a sender on a domain verified in Resend, e.g. "CLC Website <website@clccosmetics.com>"
//                   (until the domain is verified, use "CLC Website <onboarding@resend.dev>" —
//                    Resend then only delivers to the email address on your Resend account)

type Enquiry = {
  name: string
  email: string
  phone: string
  treatment: string
  location: string
  message: string
  company: string // honeypot
}

const LIMITS: Record<keyof Enquiry, number> = {
  name: 100,
  email: 200,
  phone: 30,
  treatment: 80,
  location: 40,
  message: 2000,
  company: 200,
}

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function read(raw: unknown): Enquiry {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const out = {} as Enquiry
  for (const key of Object.keys(LIMITS) as (keyof Enquiry)[]) {
    const v = typeof src[key] === 'string' ? (src[key] as string).trim() : ''
    out[key] = v.slice(0, LIMITS[key])
  }
  return out
}

export async function POST(request: Request): Promise<Response> {
  const { RESEND_API_KEY, CONTACT_TO, CONTACT_FROM } = process.env
  if (!RESEND_API_KEY || !CONTACT_TO || !CONTACT_FROM) {
    console.error('Contact form: missing RESEND_API_KEY, CONTACT_TO or CONTACT_FROM')
    return json(500, { error: 'The contact form isn’t set up yet. Please message on Instagram instead.' })
  }

  let data: Enquiry
  try {
    data = read(await request.json())
  } catch {
    return json(400, { error: 'Invalid request.' })
  }

  // Bots fill the hidden field — pretend it worked and send nothing
  if (data.company) return json(200, { ok: true })

  const errors: Record<string, string> = {}
  if (!data.name) errors.name = 'Enter your name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Enter a valid email address.'
  if (!data.message) errors.message = 'Add a short message.'
  if (Object.keys(errors).length) return json(422, { error: 'Check the highlighted fields.', fields: errors })

  const rows: [string, string][] = [
    ['Name', data.name],
    ['Email', data.email],
    ['Phone', data.phone || '—'],
    ['Treatment', data.treatment || '—'],
    ['Location', data.location || '—'],
  ]

  const html = `
    <div style="font-family:Arial,sans-serif;color:#2a1a24;max-width:560px">
      <h2 style="margin:0 0 16px">New enquiry from the website</h2>
      <table style="border-collapse:collapse;width:100%">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:6px 12px 6px 0;color:#75606b;white-space:nowrap">${k}</td><td style="padding:6px 0"><strong>${escape(v)}</strong></td></tr>`,
          )
          .join('')}
      </table>
      <p style="margin:20px 0 6px;color:#75606b">Message</p>
      <p style="margin:0;white-space:pre-wrap">${escape(data.message)}</p>
      <p style="margin:24px 0 0;font-size:13px;color:#75606b">Reply to this email to answer ${escape(data.name)} directly.</p>
    </div>`

  const text = [...rows.map(([k, v]) => `${k}: ${v}`), '', data.message].join('\n')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: CONTACT_FROM,
      to: CONTACT_TO.split(',').map((s) => s.trim()),
      reply_to: data.email,
      subject: `Website enquiry: ${data.treatment || 'General'} — ${data.name}`,
      html,
      text,
    }),
  })

  if (!res.ok) {
    console.error('Resend error', res.status, await res.text())
    return json(502, { error: 'Your message couldn’t be sent. Try again, or message on Instagram.' })
  }

  return json(200, { ok: true })
}
