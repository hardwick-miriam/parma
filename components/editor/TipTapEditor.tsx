'use client'

import { EditorContent, type Editor } from '@tiptap/react'

type Props = {
  editor: Editor | null
}

export default function TipTapEditor({ editor }: Props) {
  return (
    <div style={{ caretColor: '#2a1f0a' }}>
      <EditorContent editor={editor} />
    </div>
  )
}
