import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Inlines public/schema.json into index.html so that any tool fetching the
// page URL (curl, an LLM web-fetch tool, a search crawler) gets the data
// without having to execute JavaScript. Two placeholders are replaced:
//   - inside <script type="application/json"> the JSON is inlined verbatim
//   - inside <noscript><pre> the JSON is HTML-escaped so it renders as text
function inlineSchema() {
  const schemaPath = resolve(__dirname, 'public/schema.json')
  return {
    name: 'inline-schema',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const raw = readFileSync(schemaPath, 'utf8')
        // Inside <script type="application/json"> only "</script" needs escaping.
        const forScript = raw.replace(/<\/script/gi, '<\\/script')
        const forText = raw
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
        // First occurrence -> the <script> tag, second -> the <noscript><pre>.
        let out = html.replace('__SCHEMA_INLINE__', forScript)
        out = out.replace('__SCHEMA_INLINE__', forText)
        return out
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), inlineSchema()],
  base: './',
})
