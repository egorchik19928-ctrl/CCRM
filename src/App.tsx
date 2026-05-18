import mammoth from 'mammoth'
import { useCallback, useMemo, useState } from 'react'
import { buildSimplifiedDocxBlob } from '@/lib/buildSimplifiedDocx'
import { extractDocxTheme, type DocxTheme } from '@/lib/extractDocxTheme'

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
  { name: 'Все', extensions: ['*'] },
]

const IMG_FILTERS = [
  { name: 'Изображение', extensions: ['png', 'jpg', 'jpeg', 'webp'] },
  { name: 'Все', extensions: ['*'] },
]

export function App() {
  if (!window.simpleApi) {
    return <p className="p-6">Запустите приложение в Electron.</p>
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
      return contentBuf ? 'Эталон не выбран — при сохранении стиль возьмётся из DOCX с текстом' : 'Не загружен'
    }
    const m = theme.marginsTwips
    const src = referenceName ? 'эталон' : contentName ? 'файл текста' : ''
    const marginStr = `${m.top}/${m.right}/${m.bottom}/${m.left}`
    return `${theme.fontAscii}, ${theme.fontSizeHalfPoints / 2} pt; поля: ${marginStr}${src ? ` · источник: ${src}` : ''}`
  }, [theme, contentBuf, referenceName, contentName])

  const pickReference = useCallback(async () => {
    setStatus('')
    const r = await api.openFile(DOCX_FILTERS)
    if (r.canceled) return
    const file = await api.readBinary(r.path)
    const buf = new Uint8Array(bytesFromBase64(file.base64)).buffer
    const t = await extractDocxTheme(buf)
    setTheme(t)
    setReferenceName(file.name)
    setStatus('Эталон оформления загружен')
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
    setStatus('Текст резюме загружен')
  }, [api])

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
      setStatus('Сначала выберите DOCX с текстом резюме (или эталон оформления).')
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
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <header className="border-b border-black/[0.06] bg-white px-6 py-4">
        <h1 className="text-xl font-semibold">Резюме (просто) · v0.5</h1>
        <p className="mt-1 text-sm text-[#6e6e73]">
          Загрузите эталонный DOCX (как выглядит резюме), затем DOCX с текстом — получите новый файл с теми же полями и
          базовым шрифтом, плюс логотип в шапке.
        </p>
      </header>

      <main className="mx-auto grid max-w-[1200px] gap-4 p-4 lg:grid-cols-2">
        <section className="space-y-3 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6e6e73]">Шаги</h2>
          <button
            type="button"
            className="w-full rounded-xl bg-[#1d1d1f] px-4 py-3 text-sm font-semibold text-white"
            onClick={pickReference}
          >
            1. Эталон оформления (.docx)
          </button>
          <p className="text-xs text-[#6e6e73]">{referenceName || 'Файл не выбран'}</p>

          <button
            type="button"
            className="w-full rounded-xl bg-[#007aff] px-4 py-3 text-sm font-semibold text-white"
            onClick={pickContent}
          >
            2. Текст резюме (.docx)
          </button>
          <p className="text-xs text-[#6e6e73]">{contentName || 'Файл не выбран'}</p>

          <button type="button" className="w-full rounded-xl border border-black/[0.12] px-4 py-3 text-sm font-semibold" onClick={pickLogo}>
            3. Логотип компании (png/jpg)
          </button>
          <div className="flex gap-2">
            {logoDataUrl ? (
              <>
                <img alt="logo" className="h-10 rounded border object-contain" src={logoDataUrl} />
                <button type="button" className="text-xs text-red-600 underline" onClick={clearLogo}>
                  Убрать
                </button>
              </>
            ) : (
              <span className="text-xs text-[#6e6e73]">Логотип не выбран</span>
            )}
          </div>

          <button
            type="button"
            className="w-full rounded-xl bg-[#34c759] px-4 py-3 text-sm font-semibold text-white"
            onClick={saveDocx}
          >
            Сохранить как DOCX
          </button>

          <div className="rounded-lg bg-[#f5f5f7] p-3 text-xs text-[#3a3a3c]">
            <div className="font-semibold text-[#1d1d1f]">Текущий стиль</div>
            <div className="mt-1">{themeSummary}</div>
          </div>
          {status ? <p className="text-sm text-[#1d1d1f]">{status}</p> : null}
        </section>

        <section className="rounded-2xl border border-black/[0.06] bg-white p-2 shadow-sm">
          <div className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#6e6e73]">Предпросмотр HTML</div>
          <iframe title="preview" className="h-[640px] w-full rounded-b border-0 bg-white" srcDoc={bodyHtml || '<p></p>'} />
        </section>
      </main>
    </div>
  )
}
