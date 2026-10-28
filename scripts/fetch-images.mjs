// Downloads every image from the old WordPress site, resizes and converts to WebP.
// Run once on your own machine BEFORE the WordPress hosting is switched off:
//   npm run fetch-images
// Tries https first, falls back to http (the old site's SSL may be invalid).
import { readFile, mkdir, writeFile, access } from 'node:fs/promises'
import sharp from 'sharp'

const manifest = JSON.parse(await readFile(new URL('../src/images.json', import.meta.url), 'utf8'))
const outDir = new URL('../public/images/', import.meta.url)
await mkdir(outDir, { recursive: true })

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
  Accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
  Referer: 'http://clccosmetics.com/',
}

const widthFor = (name) => (name.startsWith('gallery-') ? 1200 : name === 'logo' ? 600 : 1600)
const entries = Object.entries(manifest)
let done = 0
const failed = []

const describe = (err) => {
  const cause = err?.cause
  return [err?.message, cause?.code, cause?.message].filter(Boolean).join(' | ')
}

async function download(url) {
  const variants = [url.replace(/^http:/, 'https:'), url.replace(/^https:/, 'http:')]
  const errors = []
  for (const u of variants) {
    try {
      const res = await fetch(u, { headers: HEADERS, redirect: 'follow' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const type = res.headers.get('content-type') ?? ''
      if (!type.startsWith('image/')) throw new Error(`not an image (${type || 'no content-type'})`)
      return Buffer.from(await res.arrayBuffer())
    } catch (err) {
      errors.push(`${u.split(':')[0]}: ${describe(err)}`)
    }
  }
  throw new Error(errors.join('  ||  '))
}

async function fetchOne([name, url]) {
  const dest = new URL(`${name}.webp`, outDir)
  try {
    await access(dest)
    done++
    return // already downloaded
  } catch {}
  if (!url) {
    failed.push(`${name}  (no URL in images.json and no file in public/images)`)
    return
  }
  try {
    const buf = await download(url)
    const out = await sharp(buf)
      .rotate()
      .resize({ width: widthFor(name), withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer()
    await writeFile(dest, out)
    done++
    process.stdout.write(`\r${done}/${entries.length}`)
  } catch (err) {
    failed.push(`${name}  ${url}\n      ${err.message}`)
  }
}

// 4 at a time — gentle on the old host
for (let i = 0; i < entries.length; i += 4) {
  await Promise.all(entries.slice(i, i + 4).map(fetchOne))
}

console.log(`\nSaved ${done}/${entries.length} images to public/images/`)
if (failed.length) {
  console.log(`\n${failed.length} failed. First few errors:`)
  for (const f of failed.slice(0, 5)) console.log('  ' + f)
  if (failed.length > 5) console.log(`  ...and ${failed.length - 5} more`)
  process.exitCode = 1
}
