import './style.css'

const $ = <T extends Element>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel)
const $$ = <T extends Element>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)]

// Year
$$('[data-year]').forEach((el) => (el.textContent = String(new Date().getFullYear())))

// Header border on scroll
const header = $<HTMLElement>('.site-header')
const onScroll = () => header?.classList.toggle('is-scrolled', window.scrollY > 8)
onScroll()
window.addEventListener('scroll', onScroll, { passive: true })

// Mobile menu
const toggle = $<HTMLButtonElement>('#menu-toggle')
const mobileNav = $<HTMLElement>('#mobile-nav')
if (toggle && mobileNav) {
  const setOpen = (open: boolean) => {
    mobileNav.classList.toggle('is-open', open)
    toggle.setAttribute('aria-expanded', String(open))
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu')
  }
  toggle.addEventListener('click', () => setOpen(!mobileNav.classList.contains('is-open')))
  $$('a', mobileNav).forEach((a) => a.addEventListener('click', () => setOpen(false)))
}

// Before / after slider
$$<HTMLElement>('.compare').forEach((box) => {
  const input = $<HTMLInputElement>('input', box)
  input?.addEventListener('input', () => box.style.setProperty('--pos', `${input.value}%`))
})

// Gallery: show more
const more = $<HTMLButtonElement>('#gallery-more')
const extras = $$<HTMLElement>('#gallery [data-extra]')
if (more) {
  if (!extras.length) more.remove()
  more.addEventListener('click', () => {
    extras.forEach((li) => li.removeAttribute('hidden'))
    more.remove()
  })
}

// Lightbox
const lb = $<HTMLDialogElement>('#lightbox')
const lbImg = $<HTMLImageElement>('#lb-img')
const items = $$<HTMLButtonElement>('.gallery-item')
let current = 0
const show = (i: number) => {
  if (!lbImg) return
  current = (i + items.length) % items.length
  const btn = items[current]
  lbImg.src = btn.dataset.full ?? ''
  lbImg.alt = btn.querySelector('img')?.alt ?? ''
}
items.forEach((btn, i) =>
  btn.addEventListener('click', () => {
    show(i)
    lb?.showModal()
  }),
)
$('#lb-close')?.addEventListener('click', () => lb?.close())
$('#lb-prev')?.addEventListener('click', () => show(current - 1))
$('#lb-next')?.addEventListener('click', () => show(current + 1))
lb?.addEventListener('click', (e) => {
  if (e.target === lb || (e.target as HTMLElement).classList.contains('place-items-center')) lb.close()
})
lb?.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') show(current - 1)
  if (e.key === 'ArrowRight') show(current + 1)
})

// Reviews carousel buttons
const quotes = $<HTMLElement>('#quotes')
$$<HTMLButtonElement>('[data-quotes]').forEach((btn) =>
  btn.addEventListener('click', () => {
    if (!quotes) return
    const card = quotes.firstElementChild as HTMLElement | null
    const step = (card?.offsetWidth ?? 400) + 20
    quotes.scrollBy({ left: step * Number(btn.dataset.quotes), behavior: 'smooth' })
  }),
)

// Contact form → /api/contact
const form = $<HTMLFormElement>('#contact-form')
const status = $<HTMLElement>('#cf-status')
if (form && status) {
  const submit = $<HTMLButtonElement>('button[type="submit"]', form)!

  const clearErrors = () => {
    $$<HTMLElement>('.field-error', form).forEach((el) => el.remove())
    $$<HTMLElement>('[aria-invalid]', form).forEach((el) => el.removeAttribute('aria-invalid'))
  }
  const fieldError = (name: string, msg: string) => {
    const input = form.elements.namedItem(name) as HTMLInputElement | null
    if (!input) return
    input.setAttribute('aria-invalid', 'true')
    const p = document.createElement('p')
    p.className = 'field-error'
    p.id = `${input.id}-error`
    p.textContent = msg
    input.setAttribute('aria-describedby', p.id)
    input.after(p)
  }
  const setStatus = (state: 'success' | 'error' | '', msg: string) => {
    status.dataset.state = state
    status.textContent = msg
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    clearErrors()
    setStatus('', '')

    const data = Object.fromEntries(new FormData(form)) as Record<string, string>
    const local: Record<string, string> = {}
    if (!data.name?.trim()) local.name = 'Enter your name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email?.trim() ?? '')) local.email = 'Enter a valid email address.'
    if (!data.message?.trim()) local.message = 'Add a short message.'
    if (Object.keys(local).length) {
      Object.entries(local).forEach(([k, v]) => fieldError(k, v))
      ;(form.querySelector('[aria-invalid="true"]') as HTMLElement | null)?.focus()
      return
    }

    submit.disabled = true
    submit.textContent = 'Sending…'
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const body = (await res.json().catch(() => ({}))) as { error?: string; fields?: Record<string, string> }
      if (!res.ok) {
        Object.entries(body.fields ?? {}).forEach(([k, v]) => fieldError(k, v))
        setStatus('error', body.error ?? 'Your message couldn’t be sent. Try again, or message on Instagram.')
        return
      }
      form.reset()
      setStatus('success', 'Message sent. Chloe will reply to the email address you gave.')
    } catch {
      setStatus('error', 'Your message couldn’t be sent. Check your connection and try again, or message on Instagram.')
    } finally {
      submit.disabled = false
      submit.textContent = 'Send message'
    }
  })
}
