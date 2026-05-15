'use client'

import { EditorContent, type Editor } from '@tiptap/react'

type Props = {
  editor: Editor | null
}

export default function TipTapEditor({ editor }: Props) {
  return (
    <div style={{ caretColor: 'inherit' }}>
      <EditorContent editor={editor} />
    </div>
  )
}
