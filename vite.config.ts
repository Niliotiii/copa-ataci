import { defineConfig, type HtmlTagDescriptor, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

import siteConfiguration from './site.config.json'

// Vite config — https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), siteMeta(siteConfiguration)],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '8443'),
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '8443'),
  },
})

type SiteConfiguration = {
  title?: string
  description?: string
  language?: string
  robots?: { index?: boolean }
  icons?: { icon?: string }
  openGraph?: { image?: string }
  accessibility?: { addBypassLinks?: boolean }
}

/**
 * Injeta título, lang, meta description, Open Graph / Twitter Card e (opcional)
 * skip-link de acessibilidade no HTML gerado, a partir de site.config.json.
 * Também emite robots.txt quando a indexação está desativada.
 */
function siteMeta(config: SiteConfiguration): Plugin {
  function sanitize(value: string | undefined): string {
    return value?.replace(/[^a-zA-Z0-9_-]/g, '') || ''
  }
  function escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  const title = config.title ?? 'Copa Ataci'
  const description = config.description ?? ''
  const favicon = config.icons?.icon ?? ''
  const socialImage = config.openGraph?.image ?? ''
  const language = sanitize(config.language) || 'pt-BR'
  const indexable = config.robots?.index !== false
  const robotsTxt = indexable ? '' : 'User-agent: *\nDisallow: /\n'

  return {
    name: 'copa-ataci-site-meta',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!robotsTxt || req.url?.split('?')[0] !== '/robots.txt') return next()
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.end(robotsTxt)
      })
    },
    generateBundle() {
      if (!robotsTxt) return
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robotsTxt })
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        // Preenche os slots do index.html (lang e título).
        let result = html
          .replace('%LANG%', language)
          .replace('%TITLE%', escapeHtml(title))

        const tags: HtmlTagDescriptor[] = []
        if (description) {
          tags.push({ tag: 'meta', attrs: { name: 'description', content: description }, injectTo: 'head' })
          tags.push({ tag: 'meta', attrs: { property: 'og:description', content: description }, injectTo: 'head' })
        }
        if (!indexable) {
          tags.push({ tag: 'meta', attrs: { name: 'robots', content: 'noindex, nofollow' }, injectTo: 'head' })
        }
        if (favicon) {
          tags.push({ tag: 'link', attrs: { rel: 'icon', href: favicon }, injectTo: 'head' })
        }
        if (title) {
          tags.push({ tag: 'meta', attrs: { property: 'og:title', content: title }, injectTo: 'head' })
          tags.push({ tag: 'meta', attrs: { property: 'og:type', content: 'website' }, injectTo: 'head' })
        }
        if (socialImage) {
          tags.push(
            { tag: 'meta', attrs: { property: 'og:image', content: socialImage }, injectTo: 'head' },
            { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' }, injectTo: 'head' },
            { tag: 'meta', attrs: { property: 'og:image:height', content: '630' }, injectTo: 'head' },
            { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' }, injectTo: 'head' },
            { tag: 'meta', attrs: { name: 'twitter:image', content: socialImage }, injectTo: 'head' },
          )
        }
        if (config.accessibility?.addBypassLinks) {
          tags.push(
            {
              tag: 'style',
              children:
                '.skip-link{position:fixed;top:8px;left:8px;z-index:2147483647;transform:translateY(-150%);border-radius:6px;background:#111827;color:#fff;padding:8px 12px;font:600 14px/1.2 system-ui,sans-serif;text-decoration:none}.skip-link:focus{transform:translateY(0)}',
              injectTo: 'head',
            },
            {
              tag: 'a',
              attrs: { class: 'skip-link', href: '#root' },
              children: 'Pular para o conteúdo',
              injectTo: 'body-prepend',
            },
          )
        }

        return { html: result, tags }
      },
    },
  }
}
