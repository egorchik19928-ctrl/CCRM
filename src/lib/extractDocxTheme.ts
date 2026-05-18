import JSZip from 'jszip'

/** OOXML / docx: twentieth of a point (same unit as docx PageMargin). */
export type DocxTheme = {
  marginsTwips: { top: number; right: number; bottom: number; left: number }
  /** docx TextRun `size` uses half-points */
  fontSizeHalfPoints: number
  fontAscii: string
  /** Where body font/size were taken from (for UI/debug). */
  fontSource: 'body-run' | 'normal-style' | 'doc-defaults' | 'theme-minor' | 'theme-major' | 'fallback'
  sizeSource: DocxTheme['fontSource']
}

const FALLBACK: DocxTheme = {
  marginsTwips: { top: 1134, right: 850, bottom: 1134, left: 1701 },
  fontSizeHalfPoints: 22,
  fontAscii: 'Arial',
  fontSource: 'fallback',
  sizeSource: 'fallback',
}

type ThemeLatin = { major: string | null; minor: string | null }

function numAttr(tag: string, name: string): number | null {
  const m = tag.match(new RegExp(`w:${name}="(\\d+)"`))
  return m ? Number(m[1]) : null
}

function parseTheme1Latin(themeXml: string | undefined): ThemeLatin {
  if (!themeXml) return { major: null, minor: null }
  const major = themeXml.match(/<a:majorFont>[\s\S]*?<a:latin[^>]*Typeface="([^"]+)"/i)?.[1] ?? null
  const minor = themeXml.match(/<a:minorFont>[\s\S]*?<a:latin[^>]*Typeface="([^"]+)"/i)?.[1] ?? null
  return { major: major, minor: minor }
}

function resolveAsciiTheme(token: string | undefined, t: ThemeLatin): string | null {
  if (!token) return null
  const k = token.toLowerCase()
  if (k.includes('minor')) return t.minor ?? t.major
  if (k.includes('major')) return t.major ?? t.minor
  return null
}

function pickSzFromChunk(chunk: string): number | null {
  const sz = chunk.match(/<w:sz[^>]*w:val="(\d+)"/i)?.[1] ?? chunk.match(/<w:szCs[^>]*w:val="(\d+)"/i)?.[1]
  if (!sz) return null
  const v = Number(sz)
  if (!Number.isFinite(v) || v < 8 || v > 160) return null
  return v
}

function pickFontFromRFonts(chunk: string, themeLatin: ThemeLatin): string | null {
  const ascii = chunk.match(/<w:rFonts[^>]*w:ascii="([^"]+)"/i)?.[1]
  if (ascii) return ascii.replace(/'/g, '')
  const themeTok = chunk.match(/<w:rFonts[^>]*w:asciiTheme="([^"]+)"/i)?.[1]
  return resolveAsciiTheme(themeTok, themeLatin)
}

function extractNormalStyleRPr(stylesXml: string, themeLatin: ThemeLatin): { font?: string; sz?: number } {
  const blocks = [...stylesXml.matchAll(/<w:style[\s\S]*?<\/w:style>/gi)].map((m) => m[0])
  for (const s of blocks) {
    const isNormal = /<w:name[^>]*w:val="Normal"/i.test(s) || /\bw:styleId="Normal"/i.test(s)
    if (!isNormal) continue
    const pPr = s.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/i)?.[1]
    if (!pPr) continue
    const font = pickFontFromRFonts(pPr, themeLatin)
    const sz = pickSzFromChunk(pPr)
    return { font: font ?? undefined, sz: sz ?? undefined }
  }
  return {}
}

function extractDocDefaults(stylesXml: string, themeLatin: ThemeLatin): { font?: string; sz?: number } {
  const docDefaults = stylesXml.match(/<w:docDefaults[\s\S]*?<\/w:docDefaults>/i)?.[0]
  if (!docDefaults) return {}
  const rPr = docDefaults.match(/<w:rPrDefault>[\s\S]*?<w:rPr>([\s\S]*?)<\/w:rPr>/i)?.[1]
  if (!rPr) return {}
  return { font: pickFontFromRFonts(rPr, themeLatin) ?? undefined, sz: pickSzFromChunk(rPr) ?? undefined }
}

function extractFirstMeaningfulRun(
  documentXml: string,
  themeLatin: ThemeLatin,
): { font?: string; sz?: number } {
  const body = documentXml.match(/<w:body>([\s\S]*)<\/w:body>/i)?.[1] ?? documentXml
  const re = /<w:r[\s\S]*?<\/w:r>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(body))) {
    const chunk = m[0]
    if (!/<w:t[^>]*>/i.test(chunk)) continue
    const inner = chunk.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/i)?.[1] ?? ''
    const text = inner.replace(/&nbsp;/gi, ' ').replace(/<[^>]+>/g, '').trim()
    if (text.length < 2) continue
    const font = pickFontFromRFonts(chunk, themeLatin)
    const sz = pickSzFromChunk(chunk)
    if (font || sz) return { font: font ?? undefined, sz: sz ?? undefined }
  }
  return {}
}

function mergeTheme(
  themeLatin: ThemeLatin,
  fromBody: { font?: string; sz?: number },
  fromNormal: { font?: string; sz?: number },
  fromDefaults: { font?: string; sz?: number },
): Pick<DocxTheme, 'fontAscii' | 'fontSizeHalfPoints' | 'fontSource' | 'sizeSource'> {
  let fontAscii = FALLBACK.fontAscii
  let fontSizeHalfPoints = FALLBACK.fontSizeHalfPoints
  let fontSource: DocxTheme['fontSource'] = 'fallback'
  let sizeSource: DocxTheme['sizeSource'] = 'fallback'

  if (fromBody.font) {
    fontAscii = fromBody.font
    fontSource = 'body-run'
  } else if (fromNormal.font) {
    fontAscii = fromNormal.font
    fontSource = 'normal-style'
  } else if (fromDefaults.font) {
    fontAscii = fromDefaults.font
    fontSource = 'doc-defaults'
  } else if (themeLatin.minor) {
    fontAscii = themeLatin.minor
    fontSource = 'theme-minor'
  } else if (themeLatin.major) {
    fontAscii = themeLatin.major
    fontSource = 'theme-major'
  }

  if (fromBody.sz) {
    fontSizeHalfPoints = fromBody.sz
    sizeSource = 'body-run'
  } else if (fromNormal.sz) {
    fontSizeHalfPoints = fromNormal.sz
    sizeSource = 'normal-style'
  } else if (fromDefaults.sz) {
    fontSizeHalfPoints = fromDefaults.sz
    sizeSource = 'doc-defaults'
  }

  return { fontAscii, fontSizeHalfPoints, fontSource, sizeSource }
}

/**
 * Reads OOXML from a .docx: theme (latin major/minor), Normal + docDefaults in styles.xml,
 * first meaningful body run in document.xml, and page margins from sectPr/pgMar.
 */
export async function extractDocxTheme(buf: ArrayBuffer): Promise<DocxTheme> {
  const zip = await JSZip.loadAsync(buf)
  const stylesXml = await zip.file('word/styles.xml')?.async('string')
  const documentXml = await zip.file('word/document.xml')?.async('string')
  const themeXml = await zip.file('word/theme/theme1.xml')?.async('string')

  const margins = { ...FALLBACK.marginsTwips }
  const themeLatin = parseTheme1Latin(themeXml)

  const fromDefaults = stylesXml ? extractDocDefaults(stylesXml, themeLatin) : {}
  const fromNormal = stylesXml ? extractNormalStyleRPr(stylesXml, themeLatin) : {}
  const fromBody = documentXml ? extractFirstMeaningfulRun(documentXml, themeLatin) : {}

  const merged = mergeTheme(themeLatin, fromBody, fromNormal, fromDefaults)

  if (documentXml) {
    const sect = documentXml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/i)
    const pg = sect?.[0]?.match(/<w:pgMar[^>]*\/?>/i)?.[0]
    if (pg) {
      const top = numAttr(pg, 'top')
      const right = numAttr(pg, 'right')
      const bottom = numAttr(pg, 'bottom')
      const left = numAttr(pg, 'left')
      if (top && top > 100 && top < 20000) margins.top = top
      if (right && right > 100 && right < 20000) margins.right = right
      if (bottom && bottom > 100 && bottom < 20000) margins.bottom = bottom
      if (left && left > 100 && left < 20000) margins.left = left
    }
  }

  return {
    marginsTwips: margins,
    fontSizeHalfPoints: merged.fontSizeHalfPoints,
    fontAscii: merged.fontAscii,
    fontSource: merged.fontSource,
    sizeSource: merged.sizeSource,
  }
}

export function describeFontSources(t: DocxTheme): string {
  return `шрифт: ${t.fontSource}, размер: ${t.sizeSource}`
}
