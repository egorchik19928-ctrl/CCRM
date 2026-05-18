import JSZip from 'jszip'

/** OOXML / docx: twentieth of a point (same unit as docx PageMargin). */
export type DocxTheme = {
  marginsTwips: { top: number; right: number; bottom: number; left: number }
  /** docx TextRun `size` uses half-points */
  fontSizeHalfPoints: number
  fontAscii: string
}

const FALLBACK: DocxTheme = {
  marginsTwips: { top: 1134, right: 850, bottom: 1134, left: 1701 },
  fontSizeHalfPoints: 22,
  fontAscii: 'Arial',
}

function numAttr(tag: string, name: string): number | null {
  const m = tag.match(new RegExp(`w:${name}="(\\d+)"`))
  return m ? Number(m[1]) : null
}

/**
 * Reads `word/styles.xml` (docDefaults) and `word/document.xml` (sectPr/pgMar)
 * to approximate fonts and page margins of a reference resume.
 */
export async function extractDocxTheme(buf: ArrayBuffer): Promise<DocxTheme> {
  const zip = await JSZip.loadAsync(buf)
  const stylesXml = await zip.file('word/styles.xml')?.async('string')
  const documentXml = await zip.file('word/document.xml')?.async('string')

  let fontAscii = FALLBACK.fontAscii
  let fontSizeHalfPoints = FALLBACK.fontSizeHalfPoints
  const margins = { ...FALLBACK.marginsTwips }

  if (stylesXml) {
    const docDefaults = stylesXml.match(/<w:docDefaults[\s\S]*?<\/w:docDefaults>/)
    const block = docDefaults?.[0] ?? stylesXml
    const rFonts =
      block.match(/<w:rFonts[^>]*w:ascii="([^"]+)"/) ??
      stylesXml.match(/<w:rFonts[^>]*w:ascii="([^"]+)"/)
    if (rFonts?.[1]) fontAscii = rFonts[1].replace(/'/g, '')

    const sz =
      block.match(/<w:sz[^>]*w:val="(\d+)"/) ??
      block.match(/<w:szCs[^>]*w:val="(\d+)"/) ??
      stylesXml.match(/<w:sz[^>]*w:val="(\d+)"/)
    if (sz?.[1]) {
      const v = Number(sz[1])
      if (Number.isFinite(v) && v > 8 && v < 96) fontSizeHalfPoints = v
    }
  }

  if (documentXml) {
    const sect = documentXml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/)
    const pg = sect?.[0]?.match(/<w:pgMar[^>]*\/?>/)?.[0]
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

  return { marginsTwips: margins, fontSizeHalfPoints, fontAscii }
}
