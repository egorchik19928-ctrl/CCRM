import {
  AlignmentType,
  Document,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
} from 'docx'
import type { DocxTheme } from './extractDocxTheme'

function dataUrlToUint8Array(dataUrl: string): Uint8Array | null {
  const comma = dataUrl.indexOf(',')
  if (comma === -1) return null
  const meta = dataUrl.slice(0, comma)
  const b64 = dataUrl.slice(comma + 1)
  if (!meta.includes('base64')) return null
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i)
  return arr
}

function imageType(dataUrl: string): 'png' | 'jpg' | undefined {
  if (dataUrl.includes('image/png')) return 'png'
  if (dataUrl.includes('image/jpeg') || dataUrl.includes('image/jpg')) return 'jpg'
  return undefined
}

function stripUnsafeHtml(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/on\w+="[^"]*"/gi, '')
}

function htmlToParagraphs(html: string, font: string, sizeHalf: number): Paragraph[] {
  const clean = stripUnsafeHtml(html)
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div>${clean}</div>`, 'text/html')
  const root = doc.body.firstElementChild
  if (!root) return [new Paragraph({ children: [new TextRun({ text: '', font, size: sizeHalf })] })]

  const out: Paragraph[] = []

  const pushRuns = (el: HTMLElement, bold: boolean): void => {
    const runs: TextRun[] = []
    const walk = (node: Node, b: boolean): void => {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = (node.textContent ?? '').replace(/\u00a0/g, ' ')
        if (!t.trim()) return
        runs.push(new TextRun({ text: t, font, size: sizeHalf, bold: b }))
        return
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return
      const n = node as HTMLElement
      const tag = n.tagName.toLowerCase()
      if (tag === 'br') {
        runs.push(new TextRun({ break: 1, font, size: sizeHalf }))
        return
      }
      const nextBold = b || tag === 'strong' || tag === 'b'
      n.childNodes.forEach((c) => walk(c, nextBold))
    }
    el.childNodes.forEach((c) => walk(c, bold))
    if (runs.length) out.push(new Paragraph({ children: runs, spacing: { after: 120 } }))
  }

  const walkBlocks = (container: HTMLElement): void => {
    for (const child of Array.from(container.children)) {
      if (!(child instanceof HTMLElement)) continue
      const tag = child.tagName.toLowerCase()
      if (tag === 'p') {
        pushRuns(child, false)
        continue
      }
      if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
        const lvl = tag === 'h1' ? HeadingLevel.HEADING_1 : tag === 'h2' ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3
        const runs: TextRun[] = []
        child.childNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const t = (node.textContent ?? '').trim()
            if (t) runs.push(new TextRun({ text: t, font, size: sizeHalf + 2, bold: true }))
          }
        })
        if (runs.length) {
          out.push(
            new Paragraph({
              heading: lvl,
              spacing: { before: 120, after: 120 },
              children: runs,
            }),
          )
        }
        continue
      }
      if (tag === 'ul' || tag === 'ol') {
        const items = Array.from(child.querySelectorAll(':scope > li'))
        items.forEach((li, idx) => {
          const prefix = tag === 'ol' ? `${idx + 1}. ` : '• '
          const runs: TextRun[] = [new TextRun({ text: prefix, font, size: sizeHalf, bold: true })]
          li.childNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              const t = (node.textContent ?? '').trim()
              if (t) runs.push(new TextRun({ text: `${t} `, font, size: sizeHalf }))
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as HTMLElement
              if (el.tagName.toLowerCase() === 'p') {
                el.childNodes.forEach((c) => {
                  if (c.nodeType === Node.TEXT_NODE) {
                    const t = (c.textContent ?? '').trim()
                    if (t) runs.push(new TextRun({ text: `${t} `, font, size: sizeHalf }))
                  }
                })
              }
            }
          })
          out.push(new Paragraph({ children: runs, spacing: { after: 80 } }))
        })
        continue
      }
      if (tag === 'div') {
        walkBlocks(child)
      }
    }
  }

  walkBlocks(root as HTMLElement)
  return out.length ? out : [new Paragraph({ children: [new TextRun({ text: '', font, size: sizeHalf })] })]
}

export async function buildSimplifiedDocxBlob(opts: {
  theme: DocxTheme
  bodyHtml: string
  logoDataUrl?: string | null
}): Promise<Blob> {
  const { theme, bodyHtml, logoDataUrl } = opts
  const font = theme.fontAscii
  const sz = theme.fontSizeHalfPoints

  const headerChildren: Paragraph[] = []
  if (logoDataUrl) {
    const bytes = dataUrlToUint8Array(logoDataUrl)
    const type = imageType(logoDataUrl)
    if (bytes && type) {
      headerChildren.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new ImageRun({
              data: bytes,
              type,
              transformation: { width: 120, height: 40 },
            }),
          ],
        }),
      )
    }
  }

  const children = htmlToParagraphs(bodyHtml, font, sz)

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: theme.marginsTwips.top,
              right: theme.marginsTwips.right,
              bottom: theme.marginsTwips.bottom,
              left: theme.marginsTwips.left,
            },
          },
        },
        headers: {
          default: new Header({
            children: headerChildren.length ? headerChildren : [new Paragraph('')],
          }),
        },
        children,
      },
    ],
  })

  return Packer.toBlob(doc)
}
