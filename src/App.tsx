import mammoth from 'mammoth'
import { useCallback, useMemo, useState } from 'react'
import { buildSimplifiedDocxBlob } from '@/lib/buildSimplifiedDocx'
import { describeFontSources, extractDocxTheme, type DocxTheme } from '@/lib/extractDocxTheme'

function bytesFromBase64(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i)
  return out
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

const DOCX_FILTERS = [
  { name: 'Word', extensions: ['docx'] },
  { name: 'Все файлы', extensions: ['*'] },
]

const IMG_FILTERS = [
  { name: 'Изображение', extensions: ['png', 'jpg', 'jpeg', 'webp'] },
  { name: 'Все файлы', extensions: ['*'] },
]

function buildPreviewSrcDoc(bodyHtml: string, theme: DocxTheme | null): string {
  const font = theme?.fontAscii ?? 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial'
  const sizePt = theme ? theme.fontSizeHalfPoints / 2 : 11
  const safe = (bodyHtml || '<p class="muted">Выберите DOCX с текстом — здесь появится предпросмотр.</p>').replace(
    /<\/script/gi,
    '<\\/script',
  )
  return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"/>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      padding: 22px 26px 40px;
      font-family: ${font};
      font-size: ${sizePt}pt;
      line-height: 1.45;
      color: #0f172a;
      background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    }
    p { margin: 0 0 10px; }
    ul, ol { margin: 8px 0 10px 18px; padding: 0; }
    li { margin: 3px 0; }
    h1,h2,h3 { margin: 14px 0 8px; letter-spacing: -0.02em; }
    .muted { color: #64748b; font-size: 11pt; }
    a { color: #2563eb; }
  </style>
</head><body>${safe}</body></html>`
}

export function App() {
  if (!window.simpleApi) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-200">
        <div className="max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-soft backdrop-blur">
          <p className="text-lg font-semibold">Запустите десктоп-версию</p>
          <p className="mt-2 text-sm text-slate-400">Этот интерфейс рассчитан на Electron (файлы и сохранение).</p>
        </div>
      </div>
    )
  }
  const api = window.simpleApi

  const [theme, setTheme] = useState<DocxTheme | null>(null)
  const [referenceName, setReferenceName] = useState<string>('')
  const [contentName, setContentName] = useState<string>('')
  const [contentBuf, setContentBuf] = useState<ArrayBuffer | null>(null)
  const [bodyHtml, setBodyHtml] = useState<string>('')
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('')

  const themeSummary = useMemo(() => {
    if (!theme) {
      return contentBuf
        ? 'Эталон не выбран — при сохранении стиль возьмётся из DOCX с текстом.'
        : 'Загрузите DOCX-эталон или файл с текстом, чтобы увидеть шрифт и поля.'
    }
    const m = theme.marginsTwips
    const src = referenceName ? 'эталон' : contentName ? 'файл текста' : ''
    const meta = describeFontSources(theme)
    return `${theme.fontAscii}, ${theme.fontSizeHalfPoints / 2} pt · поля: ${m.top}/${m.right}/${m.bottom}/${m.left}${
      src ? ` · файл: ${src}` : ''
    } · ${meta}`
  }, [theme, contentBuf, referenceName, contentName])

  const previewSrcDoc = useMemo(() => buildPreviewSrcDoc(bodyHtml, theme), [bodyHtml, theme])

  const pickReference = useCallback(async () => {
    setStatus('')
    const r = await api.openFile(DOCX_FILTERS)
    if (r.canceled) return
    const file = await api.readBinary(r.path)
    const buf = new Uint8Array(bytesFromBase64(file.base64)).buffer
    const t = await extractDocxTheme(buf)
    setTheme(t)
    setReferenceName(file.name)
    setStatus(`Эталон загружен (${describeFontSources(t)})`)
  }, [api])

  const pickContent = useCallback(async () => {
    setStatus('')
    const r = await api.openFile(DOCX_FILTERS)
    if (r.canceled) return
    const file = await api.readBinary(r.path)
    const buf = new Uint8Array(bytesFromBase64(file.base64)).buffer
    setContentBuf(buf)
    const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buf })
    setBodyHtml(html)
    setContentName(file.name)
    if (!referenceName) {
      const t = await extractDocxTheme(buf)
      setTheme(t)
      setStatus(`Текст загружен; стиль взят из этого файла (${describeFontSources(t)})`)
    } else {
      setStatus('Текст резюме обновлён')
    }
  }, [api, referenceName])

  const pickLogo = useCallback(async () => {
    setStatus('')
    const r = await api.openFile(IMG_FILTERS)
    if (r.canceled) return
    const file = await api.readBinary(r.path)
    const lower = file.name.toLowerCase()
    let mime = 'image/png'
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mime = 'image/jpeg'
    if (lower.endsWith('.webp')) mime = 'image/webp'
    setLogoDataUrl(`data:${mime};base64,${file.base64}`)
    setStatus('Логотип добавлен')
  }, [api])

  const clearLogo = useCallback(() => {
    setLogoDataUrl(null)
    setStatus('Логотип убран')
  }, [])

  const saveDocx = useCallback(async () => {
    setStatus('')
    const t = theme ?? (contentBuf ? await extractDocxTheme(contentBuf) : null)
    if (!t) {
      setStatus('Сначала выберите DOCX с текстом (или эталон оформления).')
      return
    }
    if (!bodyHtml.trim()) {
      setStatus('Сначала выберите DOCX с текстом резюме.')
      return
    }
    const blob = await buildSimplifiedDocxBlob({ theme: t, bodyHtml, logoDataUrl })
    const b64 = arrayBufferToBase64(await blob.arrayBuffer())
    const base = (contentName || 'resume').replace(/\.[^.]+$/, '')
    const save = await api.saveFile({ defaultPath: `${base}-оформлено.docx`, ext: 'docx' })
    if (save.canceled) return
    await api.writeBinary(save.path, b64)
    setStatus(`Сохранено: ${save.path}`)
  }, [api, bodyHtml, contentBuf, contentName, logoDataUrl, theme])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(900px_500px_at_20%_-10%,rgba(56,189,248,0.22),transparent_55%),radial-gradient(800px_520px_at_90%_0%,rgba(99,102,241,0.18),transparent_50%),radial-gradient(700px_500px_at_50%_110%,rgba(16,185,129,0.12),transparent_55%)]" />

      <header className="relative border-b border-white/10 bg-slate-950/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
              Desktop · v0.6
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">Резюме (просто)</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
              Эталонный <span className="text-white">DOCX</span> задаёт поля страницы и базовый шрифт. Второй DOCX — текст.
              Логотип — в шапке экспорта.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-relaxed text-slate-300 shadow-soft md:max-w-sm">
            <p className="font-semibold text-white">Про PDF</p>
            <p className="mt-1">
              Шрифты из PDF не извлекаются. Экспортируйте «идеальное» резюме из Word / HH в{' '}
              <span className="text-white">.docx</span> и выберите его как эталон — тогда подтянутся реальные настройки
              Word.
            </p>
          </div>
        </div>
      </header>

      <main className="relative mx-auto grid max-w-6xl gap-5 px-6 py-8 lg:grid-cols-[420px_1fr]">
        <section className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-card backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">Шаги</h2>
              <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-[11px] font-semibold text-emerald-200">
                офлайн
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <StepButton
                step={1}
                title="Эталон оформления"
                subtitle=".docx — как должно выглядеть"
                tone="sky"
                onClick={pickReference}
              />
              <p className="truncate text-xs text-slate-400">{referenceName || 'Файл не выбран'}</p>

              <StepButton step={2} title="Текст резюме" subtitle=".docx — содержимое" tone="indigo" onClick={pickContent} />
              <p className="truncate text-xs text-slate-400">{contentName || 'Файл не выбран'}</p>

              <StepButton step={3} title="Логотип компании" subtitle="PNG / JPG / WebP" tone="slate" onClick={pickLogo} />
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/30 p-3">
                {logoDataUrl ? (
                  <>
                    <img alt="logo" className="h-11 w-auto max-w-[160px] rounded-lg border border-white/10 bg-white/90 p-1 object-contain" src={logoDataUrl} />
                    <button type="button" className="text-xs font-semibold text-rose-300 hover:text-rose-200" onClick={clearLogo}>
                      Убрать
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-slate-400">Логотип не выбран</span>
                )}
              </div>

              <button
                type="button"
                onClick={saveDocx}
                className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-soft transition hover:brightness-105 active:brightness-95"
              >
                Сохранить как DOCX
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5 text-sm text-slate-200 shadow-card backdrop-blur-xl">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Текущий стиль</div>
            <p className="mt-2 leading-relaxed text-slate-100">{themeSummary}</p>
            {status ? <p className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100">{status}</p> : null}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-3 shadow-card backdrop-blur-xl">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Предпросмотр</div>
            <div className="text-[11px] text-slate-400">шрифт как в DOCX-эталоне</div>
          </div>
          <iframe title="preview" className="h-[720px] w-full rounded-2xl border border-white/10 bg-white shadow-inner" srcDoc={previewSrcDoc} />
        </section>
      </main>
    </div>
  )
}

function StepButton(props: {
  step: number
  title: string
  subtitle: string
  tone: 'sky' | 'indigo' | 'slate'
  onClick: () => void
}) {
  const ring =
    props.tone === 'sky'
      ? 'from-sky-400/25 to-cyan-300/10'
      : props.tone === 'indigo'
        ? 'from-indigo-400/25 to-fuchsia-300/10'
        : 'from-slate-200/15 to-slate-400/10'

  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`group w-full rounded-2xl border border-white/10 bg-gradient-to-br ${ring} p-[1px] text-left transition hover:border-white/20`}
    >
      <div className="flex items-start gap-3 rounded-2xl bg-slate-950/55 px-4 py-3 backdrop-blur">
        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-white">
          {props.step}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">{props.title}</div>
          <div className="text-xs text-slate-400">{props.subtitle}</div>
        </div>
      </div>
    </button>
  )
}
