import JSZip from 'jszip'
import type { Document } from '@/types'

type ProseMirrorNode = {
  type: string
  content?: ProseMirrorNode[]
  text?: string
  marks?: Array<{ type: string }>
  attrs?: Record<string, unknown>
}

function nodeToHtml(node: ProseMirrorNode): string {
  if (node.type === 'text') {
    let t = (node.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === 'bold') t = `<strong>${t}</strong>`
        else if (mark.type === 'italic') t = `<em>${t}</em>`
        else if (mark.type === 'underline') t = `<u>${t}</u>`
      }
    }
    return t
  }
  const inner = (node.content || []).map(nodeToHtml).join('')
  if (node.type === 'paragraph') return `<p>${inner || '&#160;'}</p>`
  if (node.type === 'hardBreak') return '<br/>'
  if (node.type === 'doc') return inner
  return inner
}

function docToHtml(content: object | null): string {
  if (!content) return '<p>&#160;</p>'
  return nodeToHtml(content as ProseMirrorNode)
}

function chapterXhtml(title: string, body: string, index: number): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
  <title>${title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</title>
  <link rel="stylesheet" type="text/css" href="../styles/main.css"/>
</head>
<body>
  <h1 class="chapter-title">${title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</h1>
  ${body}
</body>
</html>`
}

export async function exportEpub(folderName: string, documents: Document[]): Promise<void> {
  const zip = new JSZip()
  const id = `parma-${Date.now()}`
  const now = new Date().toISOString().split('T')[0]

  // mimetype must be first and uncompressed
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })

  // META-INF/container.xml
  zip.file('META-INF/container.xml', `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`)

  // Stylesheet
  zip.file('OEBPS/styles/main.css', `body { font-family: Georgia, serif; font-size: 1em; line-height: 1.8; margin: 1em 2em; color: #2a1f0a; }
h1.chapter-title { font-size: 1.4em; font-weight: normal; letter-spacing: 0.05em; border-bottom: 1px solid #c0a080; padding-bottom: 0.5em; margin-bottom: 1.5em; }
p { margin: 0 0 0.9em; text-indent: 1.5em; }
p:first-of-type { text-indent: 0; }`)

  // Chapters
  const chapterIds: string[] = []
  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i]
    const cid = `chapter${i + 1}`
    chapterIds.push(cid)
    const body = docToHtml(doc.content)
    zip.file(`OEBPS/chapters/${cid}.xhtml`, chapterXhtml(doc.title || `Chapter ${i + 1}`, body, i))
  }

  // content.opf
  const manifestItems = chapterIds.map(cid =>
    `    <item id="${cid}" href="chapters/${cid}.xhtml" media-type="application/xhtml+xml"/>`
  ).join('\n')
  const spineItems = chapterIds.map(cid => `    <itemref idref="${cid}"/>`).join('\n')

  zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${folderName.replace(/&/g, '&amp;')}</dc:title>
    <dc:language>en</dc:language>
    <dc:identifier id="BookId">${id}</dc:identifier>
    <dc:date>${now}</dc:date>
    <dc:creator>Parma</dc:creator>
  </metadata>
  <manifest>
    <item id="css" href="styles/main.css" media-type="text/css"/>
${manifestItems}
  </manifest>
  <spine>
${spineItems}
  </spine>
</package>`)

  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${folderName.replace(/[^a-z0-9\s]/gi, '').trim() || 'export'}.epub`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
