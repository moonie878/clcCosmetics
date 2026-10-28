import { defineConfig, type Plugin } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import images from './src/images.json'

/**
 * Images live in public/images/<name>.webp (pulled by `npm run fetch-images`).
 * Markup references them as /images/<name>.webp.
 * Set IMAGE_MODE=remote to point at the old WordPress URLs instead (preview only).
 */
const remote = process.env.IMAGE_MODE === 'remote'
const map = images as Record<string, string>
const src = (name: string) => (remote ? map[name] : `/images/${name}.webp`)

function siteImages(): Plugin {
  return {
    name: 'site-images',
    transformIndexHtml(html) {
      const gallery = Object.keys(map)
        .filter((k) => k.startsWith('gallery-'))
        .map(
          (k, i) =>
            `<li${i >= 18 ? ' data-extra hidden' : ''}><button type="button" class="gallery-item" data-full="${src(k)}" aria-label="View treatment photo ${i + 1}"><img src="${src(k)}" alt="Treatment result ${i + 1}" loading="lazy" decoding="async"></button></li>`,
        )
        .join('\n')
      return html
        .replace('<!--GALLERY-->', gallery)
        .replace(/\/images\/([a-z0-9-]+)\.webp/g, (_, name: string) => src(name))
    },
  }
}

export default defineConfig({
  plugins: [tailwindcss(), siteImages()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        cancellation: fileURLToPath(new URL('./cancellation-policy.html', import.meta.url)),
      },
    },
  },
})
