'use client'

type Props = {
  status: 'saved' | 'saving' | 'unsaved'
  parchment?: boolean
}

export default function SaveIndicator({ status, parchment }: Props) {
  const savingColor = parchment ? '#6b5a3a' : '#5a5a7a'
  const savedColor = parchment ? '#3a3228' : '#3a3a50'

  return (
    <span
      className="text-xs flex-shrink-0"
      style={{
        color: status === 'saving' ? savingColor : savedColor,
        letterSpacing: '0.05em',
      }}
    >
      {status === 'saving' ? 'Saving…' : 'Saved'}
    </span>
  )
}
