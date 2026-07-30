import { supabase } from './supabase'
import type { DocumentRecord } from '../types'

export async function uploadLegacyDocument(values: {
  companyId: string
  userId: string
  loadId?: string
  customerId?: string
  type: string
  customerVisible: boolean
  file: File
}): Promise<DocumentRecord> {
  if (!supabase) throw new Error('Supabase is not connected.')
  const safeName = values.file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
  const storagePath = `${values.companyId}/${values.loadId || 'general'}/${crypto.randomUUID()}-${safeName}`
  const { error: uploadError } = await supabase.storage.from('legacy-documents').upload(storagePath, values.file, {
    contentType: values.file.type || 'application/octet-stream',
    upsert: false,
  })
  if (uploadError) throw uploadError

  const { data, error } = await supabase.from('documents').insert({
    company_id: values.companyId,
    load_id: values.loadId || null,
    customer_id: values.customerId || null,
    type: values.type,
    file_name: values.file.name,
    storage_path: storagePath,
    mime_type: values.file.type || null,
    file_size: values.file.size,
    customer_visible: values.customerVisible,
    uploaded_by: values.userId,
  }).select('*, loads(load_number), customers(company_name)').single()
  if (error) {
    await supabase.storage.from('legacy-documents').remove([storagePath])
    throw error
  }
  return data as DocumentRecord
}

export async function getDocumentDownloadUrl(storagePath: string) {
  if (!supabase) throw new Error('Supabase is not connected.')
  const { data, error } = await supabase.storage.from('legacy-documents').createSignedUrl(storagePath, 60)
  if (error) throw error
  return data.signedUrl
}
