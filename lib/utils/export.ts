'use client'

import { Document as DocxDoc, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import { saveAs } from 'file-saver'

type TipTapNode = {
  type: string
  text?: string
  content?: TipTapNode[]
  marks?: { type: string }[]
  attrs?: Record<string, unknown>
}

function tipTapToDocxParagraphs(nodes: TipTapNode[]): Paragraph[] {
  const paragraphs: Paragraph[] = []
  for (const node of nodes) {
    if (node.type === 'paragraph') {
      const runs: TextRun[] = (node.content || []).map((child) => {
        const marks = child.marks?.map((m) => m.type) || []
        return new TextRun({
          text: child.text || '',
          bold: marks.includes('bold'),
          italics: marks.includes('italic'),
          underline: marks.includes('underline') ? {} : undefined,
        })
      })
      paragraphs.push(new Paragraph({ children: runs }))
    } else if (node.type === 'heading') {
      const level = (node.attrs?.level as number) || 1
      const text = (node.content || []).map((c) => c.text || '').join('')
      const headingMap: Record<number, typeof HeadingLevel[keyof typeof HeadingLevel]> = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
      }
      paragraphs.push(new Paragraph({ text, heading: headingMap[level] || HeadingLevel.HEADING_1 }))
    } else if (node.type === 'bulletList' || node.type === 'orderedList') {
      for (const item of node.content || []) {
        const text = (item.content || [])
          .flatMap((p) => p.content || [])
          .map((c) => c.text || '')
          .join('')
        paragraphs.push(new Paragraph({ text, bullet: { level: 0 } }))
      }
    } else if (node.type === 'blockquote') {
      const text = (node.content || [])
        .flatMap((p) => p.content || [])
        .map((c) => c.text || '')
        .join('')
      paragraphs.push(new Paragraph({ text, indent: { left: 720 } }))
    }
  }
  return paragraphs
}

export async function exportToDocx(title: string, content: object | null) {
  const nodes: TipTapNode[] = (content as { content?: TipTapNode[] })?.content || []
  const paragraphs = tipTapToDocxParagraphs(nodes)

  const doc = new DocxDoc({
    sections: [{ children: paragraphs }],
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `${title}.docx`)
}

export async function exportToPdf(title: string, content: object | null) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' })

  const margin = 60
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const maxWidth = pageWidth - margin * 2
  let y = margin

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(12)
  pdf.setTextColor(30, 30, 30)

  const nodes: TipTapNode[] = (content as { content?: TipTapNode[] })?.content || []

  const addLine = (text: string, size: number, style: string, indent = 0) => {
    pdf.setFontSize(size)
    pdf.setFont('helvetica', style)
    const lines = pdf.splitTextToSize(text || ' ', maxWidth - indent)
    for (const line of lines) {
      if (y + size + 6 > pageHeight - margin) {
        pdf.addPage()
        y = margin
      }
      pdf.text(line, margin + indent, y)
      y += size + 6
    }
  }

  for (const node of nodes) {
    if (node.type === 'paragraph') {
      const text = (node.content || []).map((c) => c.text || '').join('')
      addLine(text, 12, 'normal')
      y += 4
    } else if (node.type === 'heading') {
      const level = (node.attrs?.level as number) || 1
      const text = (node.content || []).map((c) => c.text || '').join('')
      const sizeMap: Record<number, number> = { 1: 22, 2: 18, 3: 15 }
      y += 8
      addLine(text, sizeMap[level] || 16, 'bold')
      y += 4
    } else if (node.type === 'bulletList' || node.type === 'orderedList') {
      for (const item of node.content || []) {
        const text = (item.content || [])
          .flatMap((p) => p.content || [])
          .map((c) => c.text || '')
          .join('')
        addLine(`• ${text}`, 12, 'normal', 12)
      }
      y += 4
    }
  }

  pdf.save(`${title}.pdf`)
}
