import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { describeFontSources, extractDocxTheme } from '@/lib/extractDocxTheme'

async function zipDoc(parts: Record<string, string>): Promise<ArrayBuffer> {
  const zip = new JSZip()
  for (const [path, content] of Object.entries(parts)) zip.file(path, content)
  return zip.generateAsync({ type: 'arraybuffer' }) as Promise<ArrayBuffer>
}

describe('extractDocxTheme', () => {
  it('resolves asciiTheme from theme1 minor font on first body run', async () => {
    const theme1 = `<?xml version="1.0" encoding="UTF-8"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <a:themeElements>
    <a:fontScheme name="Office">
      <a:majorFont><a:latin typeface="Calibri Light"/></a:majorFont>
      <a:minorFont><a:latin typeface="Georgia"/></a:minorFont>
    </a:fontScheme>
  </a:themeElements>
</a:theme>`

    const styles = `<?xml version="1.0" encoding="UTF-8"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial"/><w:sz w:val="20"/></w:rPr></w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr><w:rFonts w:ascii="Calibri"/><w:sz w:val="22"/></w:rPr>
  </w:style>
</w:styles>`

    const document = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:rPr><w:rFonts w:asciiTheme="minorHAnsi"/><w:sz w:val="26"/></w:rPr>
        <w:t>Hello world</w:t>
      </w:r>
    </w:p>
    <w:sectPr><w:pgMar w:top="1200" w:right="900" w:bottom="1200" w:left="1800"/></w:sectPr>
  </w:body>
</w:document>`

    const buf = await zipDoc({
      'word/theme/theme1.xml': theme1,
      'word/styles.xml': styles,
      'word/document.xml': document,
    })
    const t = await extractDocxTheme(buf)
    expect(t.fontAscii).toBe('Georgia')
    expect(t.fontSizeHalfPoints).toBe(26)
    expect(t.marginsTwips.top).toBe(1200)
    expect(t.marginsTwips.left).toBe(1800)
    expect(describeFontSources(t)).toMatch(/body-run/)
  })

  it('falls back to Normal style when body run has no explicit font', async () => {
    const styles = `<?xml version="1.0" encoding="UTF-8"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr><w:rFonts w:ascii="Times New Roman"/><w:sz w:val="24"/></w:rPr>
  </w:style>
</w:styles>`

    const document = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Only text</w:t></w:r></w:p>
    <w:sectPr><w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701"/></w:sectPr>
  </w:body>
</w:document>`

    const buf = await zipDoc({
      'word/styles.xml': styles,
      'word/document.xml': document,
    })
    const t = await extractDocxTheme(buf)
    expect(t.fontAscii).toBe('Times New Roman')
    expect(t.fontSizeHalfPoints).toBe(24)
    expect(describeFontSources(t)).toMatch(/normal-style/)
  })
})
