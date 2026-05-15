import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { DecorationSet, Decoration } from '@tiptap/pm/view'

const autocorrectKey = new PluginKey<DecorationSet>('autocorrect')

export const AutocorrectExtension = Extension.create({
  name: 'autocorrect',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: autocorrectKey,

        state: {
          init: () => DecorationSet.empty,
          apply(tr, decorations) {
            const meta = tr.getMeta(autocorrectKey) as
              | { type: 'add'; from: number; to: number; original: string }
              | undefined

            if (meta?.type === 'add') {
              const deco = Decoration.inline(meta.from, meta.to, {
                class: 'autocorrected',
                'data-original': meta.original,
              })
              return decorations.add(tr.doc, [deco])
            }
            return decorations.map(tr.mapping, tr.doc)
          },
        },

        props: {
          decorations(state) {
            return autocorrectKey.getState(state)
          },

          handleDOMEvents: {
            beforeinput(view, event) {
              const e = event as InputEvent
              if (e.inputType !== 'insertReplacementText') return false

              // Capture original text from target DOM ranges
              // getTargetRanges returns StaticRange[], convert to dynamic Range for cloneContents
              const staticRanges = e.getTargetRanges?.() ?? []
              let originalText = ''
              if (staticRanges.length > 0) {
                const sr = staticRanges[0]
                try {
                  const range = new Range()
                  range.setStart(sr.startContainer, sr.startOffset)
                  range.setEnd(sr.endContainer, sr.endOffset)
                  const tmp = globalThis.document.createElement('div')
                  tmp.appendChild(range.cloneContents())
                  originalText = tmp.textContent ?? ''
                } catch {
                  // fallback: read from text node directly
                  if (sr.startContainer.nodeType === Node.TEXT_NODE) {
                    originalText = (sr.startContainer as Text).data.slice(sr.startOffset, sr.endOffset)
                  }
                }
              }

              const replacementText = e.data ?? ''
              if (!originalText || !replacementText || originalText === replacementText) return false

              // After the browser applies the replacement, mark the corrected span
              setTimeout(() => {
                const sel = view.state.selection
                const to = sel.from
                const from = to - replacementText.length
                if (from >= 0) {
                  view.dispatch(
                    view.state.tr.setMeta(autocorrectKey, {
                      type: 'add',
                      from,
                      to,
                      original: originalText,
                    })
                  )
                }
              }, 10)

              return false
            },
          },
        },
      }),
    ]
  },
})
