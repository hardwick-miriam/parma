import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { DecorationSet, Decoration } from '@tiptap/pm/view'

// ── Dictionary ────────────────────────────────────────────────────────────────
// Keys are lowercase. Capitalization of the original word is preserved on apply.
const MISSPELLINGS: Record<string, string> = {
  // Letter-transposition typos
  teh: 'the',
  hte: 'the',
  taht: 'that',
  thsi: 'this',
  thier: 'their',
  waht: 'what',
  wiht: 'with',
  adn: 'and',
  yuo: 'you',
  abotu: 'about',
  becuase: 'because',
  beacuse: 'because',
  beign: 'being',
  cna: 'can',
  coudl: 'could',
  frmo: 'from',
  fomr: 'from',
  haev: 'have',
  hvae: 'have',
  jsut: 'just',
  liek: 'like',
  mroe: 'more',
  mkae: 'make',
  otehr: 'other',
  poeple: 'people',
  peopel: 'people',
  peolpe: 'people',
  shoudl: 'should',
  smae: 'same',
  soem: 'some',
  tahn: 'than',
  thay: 'they',
  thigns: 'things',
  tiem: 'time',
  vrey: 'very',
  whcih: 'which',
  wnat: 'want',
  wokr: 'work',
  woudl: 'would',
  wuold: 'would',
  yoru: 'your',
  yuor: 'your',
  probelm: 'problem',
  porbelm: 'problem',
  // Classic misspellings
  accomodate: 'accommodate',
  acheive: 'achieve',
  beleive: 'believe',
  calender: 'calendar',
  cemetary: 'cemetery',
  collegue: 'colleague',
  comming: 'coming',
  completly: 'completely',
  concious: 'conscious',
  continous: 'continuous',
  definate: 'definite',
  definately: 'definitely',
  dissapear: 'disappear',
  dissapoint: 'disappoint',
  embarass: 'embarrass',
  embarassing: 'embarrassing',
  enviroment: 'environment',
  existance: 'existence',
  familar: 'familiar',
  finaly: 'finally',
  foriegn: 'foreign',
  freind: 'friend',
  freinds: 'friends',
  gaurd: 'guard',
  gaurantee: 'guarantee',
  goverment: 'government',
  grammer: 'grammar',
  harrass: 'harass',
  hieght: 'height',
  independance: 'independence',
  intellegence: 'intelligence',
  knowlege: 'knowledge',
  liason: 'liaison',
  lisence: 'license',
  maintainance: 'maintenance',
  millenium: 'millennium',
  miniscule: 'minuscule',
  neccessary: 'necessary',
  noticable: 'noticeable',
  ocasion: 'occasion',
  occured: 'occurred',
  occurence: 'occurrence',
  perseverence: 'perseverance',
  posession: 'possession',
  priviledge: 'privilege',
  probaly: 'probably',
  pronounciation: 'pronunciation',
  questionaire: 'questionnaire',
  recieve: 'receive',
  recomend: 'recommend',
  relevent: 'relevant',
  religous: 'religious',
  remeber: 'remember',
  restaraunt: 'restaurant',
  rythm: 'rhythm',
  seperate: 'separate',
  sieze: 'seize',
  succesful: 'successful',
  suprise: 'surprise',
  temperture: 'temperature',
  tommorow: 'tomorrow',
  truely: 'truly',
  untill: 'until',
  usualy: 'usually',
  vaccum: 'vacuum',
  wierd: 'weird',
  writting: 'writing',
  wich: 'which',
  woud: 'would',
  // Contractions without apostrophes
  dont: "don't",
  doesnt: "doesn't",
  didnt: "didn't",
  wont: "won't",
  cant: "can't",
  isnt: "isn't",
  arent: "aren't",
  wasnt: "wasn't",
  wouldnt: "wouldn't",
  couldnt: "couldn't",
  shouldnt: "shouldn't",
  hasnt: "hasn't",
  havent: "haven't",
  hadnt: "hadn't",
  itsnt: "isn't",
}

// ── Plugin ────────────────────────────────────────────────────────────────────
interface CorrectionMeta {
  from: number
  to: number
  original: string
}

const autocorrectKey = new PluginKey<DecorationSet>('autocorrect')

export const AutocorrectExtension = Extension.create({
  name: 'autocorrect',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: autocorrectKey,

        // Track decorated ranges so the CSS tooltip knows what was changed
        state: {
          init: () => DecorationSet.empty,
          apply(tr, decos) {
            const meta = tr.getMeta(autocorrectKey) as CorrectionMeta | undefined
            const mapped = decos.map(tr.mapping, tr.doc)
            if (!meta) return mapped
            return mapped.add(tr.doc, [
              Decoration.inline(meta.from, meta.to, {
                class: 'autocorrected',
                'data-original': meta.original,
              }),
            ])
          },
        },

        props: {
          decorations(state) {
            return autocorrectKey.getState(state)
          },
        },

        // Cross-platform: runs after every transaction, no browser events needed.
        appendTransaction(transactions, _oldState, newState) {
          // Never process our own correcting transactions (prevents infinite loop)
          if (transactions.some(tr => tr.getMeta(autocorrectKey))) return null
          if (!transactions.some(tr => tr.docChanged)) return null

          const { selection } = newState
          if (!selection.empty) return null

          const { $from } = selection

          // ── Find the word to check and the bounds of the block it's in ──────
          let searchFrom: number  // start of the text block
          let wordEnd: number     // position just after the last char of the candidate word

          if ($from.parentOffset === 0 && $from.pos > 1) {
            // Enter was just pressed — check the word at the end of the previous block.
            const beforeThisBlock = $from.before()      // position before this block's open tag
            const prevPos = beforeThisBlock - 1         // one step back, inside previous block
            if (prevPos < 1) return null
            const prevResolved = newState.doc.resolve(prevPos)
            if (!prevResolved.parent.isTextblock) return null
            searchFrom = prevResolved.start()
            wordEnd = prevPos                           // inclusive: last char of previous block
          } else {
            // A character was typed — only act when it's a word separator
            const pos = $from.pos
            if (pos < 2) return null
            const charBefore = newState.doc.textBetween(pos - 1, pos)
            if (!/^[\s.,!?;:)\]}>]$/.test(charBefore)) return null
            searchFrom = $from.start()
            wordEnd = pos - 1                          // position just before the separator
          }

          // ── Extract the last word in [searchFrom, wordEnd] ────────────────
          const textBefore = newState.doc.textBetween(searchFrom, wordEnd)
          const match = textBefore.match(/(\S+)$/)
          if (!match) return null

          const word = match[1]
          const correction = MISSPELLINGS[word.toLowerCase()]
          if (!correction) return null

          // Preserve leading capital if the original word was capitalised
          const corrected = /^[A-Z]/.test(word)
            ? correction[0].toUpperCase() + correction.slice(1)
            : correction
          if (corrected === word) return null

          const wordStart = wordEnd - word.length

          // Return a transaction that replaces the misspelled word and marks it.
          // addToHistory:false keeps this invisible to undo — Ctrl+Z undoes the
          // separator keystroke and this correction together in one step.
          return newState.tr
            .replaceWith(wordStart, wordEnd, newState.schema.text(corrected))
            .setMeta(autocorrectKey, {
              from: wordStart,
              to: wordStart + corrected.length,
              original: word,
            })
            .setMeta('addToHistory', false)
        },
      }),
    ]
  },
})
