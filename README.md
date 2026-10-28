# CLC Cosmetics — new site

Static site (Vite + Tailwind v4 + a little TypeScript). No framework, no CMS — fast, cheap, and ranks well.

## Run it locally

```bash
npm install
npm run fetch-images   # pulls all 135 photos from the old WordPress site → public/images/*.webp
npm run dev            # http://localhost:5173
```

`fetch-images` resizes and converts everything to WebP. Run it **before** the WordPress hosting is switched off. It skips files it already has, so re-run it if any fail.

## Deploy to Vercel

1. Commit everything **including `public/images/`** and push to a new GitHub repo.
2. Vercel → Add New Project → import the repo. Framework preset: **Vite** (build `npm run build`, output `dist`). No env vars needed.
3. Check the `*.vercel.app` URL.
4. Vercel → Project → Settings → Domains → add `clccosmetics.com` and `www.clccosmetics.com`.
5. At the domain registrar, set the DNS records Vercel shows (A record `76.76.21.21` for the apex, CNAME `cname.vercel-dns.com` for www — use whatever Vercel displays).
6. Once the site loads on the domain, cancel WordPress hosting. Keep the domain registration.
7. Google Search Console → submit `https://clccosmetics.com/sitemap.xml`.

## Contact form

The form posts to `api/contact.ts`, a Vercel serverless function that emails the enquiry via [Resend](https://resend.com). The client's address is set as reply-to, so Chloe just hits Reply.

1. Create a Resend account → **API Keys** → create a key.
2. Resend → **Domains** → add `clccosmetics.com` and add the DNS records it shows at the registrar (do this alongside the Vercel DNS switch).
3. Vercel → Project → Settings → **Environment Variables**:
   - `RESEND_API_KEY` = the key
   - `CONTACT_TO` = Chloe's inbox (comma-separate for more than one)
   - `CONTACT_FROM` = `CLC Website <website@clccosmetics.com>`
4. Redeploy.

Before the domain is verified you can test with `CONTACT_FROM=CLC Website <onboarding@resend.dev>`; Resend then only delivers to your own Resend account email.

`npm run dev` doesn't run the `/api` function. To test the form locally: `npm i -g vercel`, put the variables in `.env.local`, then `vercel dev`.

Spam protection: a hidden honeypot field. If spam becomes a problem, add Cloudflare Turnstile.

## Editing content

| What | Where |
| --- | --- |
| All homepage text, prices, reviews | `index.html` |
| Cancellation policy | `cancellation-policy.html` |
| Colours, fonts, spacing | `src/style.css` (`@theme` block at the top) |
| Gallery photos | `src/images.json` — any `gallery-xxx` key appears in the gallery |
| Interactions (menu, slider, lightbox, form) | `src/main.ts` |
| Contact form email | `api/contact.ts` |

To add a photo: drop `gallery-122.webp` into `public/images/` and add `"gallery-122": ""` to `src/images.json`.

## Structure

- `/` — hero, services, about + safety, treatments & prices, before/after slider, gallery with lightbox, reviews, locations, booking
- `/cancellation-policy`
- `vercel.json` — clean URLs, redirects old WordPress paths, long cache on images
- SEO: meta + Open Graph, `BeautySalon` structured data, `sitemap.xml`, `robots.txt`
