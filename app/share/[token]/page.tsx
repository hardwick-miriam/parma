import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ShareClient from '@/components/share/ShareClient'

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  const { data: shareToken } = await supabase
    .from('share_tokens')
    .select('document_id')
    .eq('token', token)
    .single()

  if (!shareToken) notFound()

  const { data: document } = await supabase
    .from('documents')
    .select('*')
    .eq('id', shareToken.document_id)
    .single()

  if (!document) notFound()

  const { data: comments } = await supabase
    .from('comments')
    .select('*')
    .eq('document_id', shareToken.document_id)
    .order('created_at')

  return <ShareClient document={document} initialComments={comments || []} />
}
