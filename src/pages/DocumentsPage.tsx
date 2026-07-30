import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/Icon'
import { getDocumentDownloadUrl, uploadLegacyDocument } from '../lib/documents'
import { listDocuments, listLoads } from '../lib/operations'
import type { DocumentRecord, LoadRecord } from '../types'

const demoDocuments: DocumentRecord[] = [
  { id: 'doc-1', type: 'bill_of_lading', file_name: 'LH-1028-bill-of-lading.pdf', storage_path: 'demo', customer_visible: false, created_at: new Date().toISOString(), loads: { load_number: 'LH-1028' }, customers: { company_name: 'Titan Industrial' } },
  { id: 'doc-2', type: 'proof_of_delivery', file_name: 'LH-1026-signed-pod.pdf', storage_path: 'demo', customer_visible: true, created_at: new Date(Date.now()-86400000).toISOString(), loads: { load_number: 'LH-1026' }, customers: { company_name: 'Frontier Site Services' } },
  { id: 'doc-3', type: 'rate_confirmation', file_name: 'LH-1029-rate-confirmation.pdf', storage_path: 'demo', customer_visible: false, created_at: new Date(Date.now()-172800000).toISOString(), loads: { load_number: 'LH-1029' }, customers: { company_name: 'High Plains Fabrication' } },
  { id: 'doc-4', type: 'receipt', file_name: 'LH-1028-fuel-receipt.jpg', storage_path: 'demo', customer_visible: false, created_at: new Date(Date.now()-21600000).toISOString(), loads: { load_number: 'LH-1028' }, customers: { company_name: 'Titan Industrial' } },
]

const labels: Record<string, string> = {
  rate_confirmation: 'Rate Confirmation', bill_of_lading: 'Bill of Lading', proof_of_delivery: 'Proof of Delivery', freight_photo: 'Freight Photo', securement_photo: 'Securement Photo', receipt: 'Receipt', invoice: 'Invoice', insurance: 'Insurance', driver_record: 'Driver Record', vehicle_record: 'Vehicle Record', permit: 'Permit', other: 'Other',
}

const groups = [
  { id: 'all', label: 'All records' },
  { id: 'load', label: 'Load paperwork' },
  { id: 'financial', label: 'Financial records' },
  { id: 'company', label: 'Company records' },
  { id: 'customer', label: 'Customer visible' },
] as const

type GroupId = (typeof groups)[number]['id']

function groupMatch(document: DocumentRecord, group: GroupId) {
  if (group === 'all') return true
  if (group === 'customer') return document.customer_visible
  if (group === 'financial') return ['receipt', 'invoice', 'rate_confirmation'].includes(document.type)
  if (group === 'company') return ['insurance', 'driver_record', 'vehicle_record', 'permit', 'other'].includes(document.type)
  return ['bill_of_lading', 'proof_of_delivery', 'freight_photo', 'securement_photo'].includes(document.type)
}

export function DocumentsPage() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [loads, setLoads] = useState<LoadRecord[]>([])
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState<GroupId>('all')
  const [showUpload, setShowUpload] = useState(false)
  const [selectedLoad, setSelectedLoad] = useState('')
  const [type, setType] = useState('bill_of_lading')
  const [customerVisible, setCustomerVisible] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showingSampleData, setShowingSampleData] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!user?.companyId || user.demo) {
          setDocuments(demoDocuments)
          setLoads([])
          setShowingSampleData(true)
        } else {
          const [documentRows, loadRows] = await Promise.all([listDocuments(user.companyId), listLoads(user.companyId)])
          setDocuments(documentRows.length ? documentRows : demoDocuments)
          setLoads(loadRows)
          setShowingSampleData(documentRows.length === 0)
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to load documents.')
      }
    }
    loadData()
  }, [user])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return documents.filter((document) => groupMatch(document, group) && (!query || [document.file_name, labels[document.type], document.loads?.load_number, document.customers?.company_name].some((value) => value?.toLowerCase().includes(query))))
  }, [documents, group, search])

  const counts = useMemo(() => ({
    all: documents.length,
    load: documents.filter((document) => groupMatch(document, 'load')).length,
    financial: documents.filter((document) => groupMatch(document, 'financial')).length,
    company: documents.filter((document) => groupMatch(document, 'company')).length,
    customer: documents.filter((document) => groupMatch(document, 'customer')).length,
  }), [documents])

  const upload = async () => {
    if (!file || !user) return
    setSaving(true)
    setError('')
    try {
      const load = loads.find((item) => item.id === selectedLoad)
      const created = !user.companyId || user.demo
        ? { id: `demo-doc-${Date.now()}`, type, file_name: file.name, storage_path: 'demo', customer_visible: customerVisible, created_at: new Date().toISOString(), loads: load ? { load_number: load.load_number } : null, customers: load?.customers || null } as DocumentRecord
        : await uploadLegacyDocument({ companyId: user.companyId, userId: user.id, loadId: selectedLoad || undefined, customerId: load?.customer_id || undefined, type, customerVisible, file })
      setDocuments((current) => [created, ...current.filter((document) => !document.id.startsWith('doc-'))])
      setShowingSampleData(false)
      setFile(null)
      setSelectedLoad('')
      setShowUpload(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to upload the document.')
    } finally {
      setSaving(false)
    }
  }

  const openDocument = async (document: DocumentRecord) => {
    if (document.storage_path === 'demo') return
    try {
      window.open(await getDocumentDownloadUrl(document.storage_path), '_blank', 'noopener,noreferrer')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to open the document.')
    }
  }

  return (
    <div className="records-vault-page">
      <header className="record-page-head">
        <div><span>SECURE OPERATIONS RECORDS</span><h2>Document Vault</h2><p>Store load paperwork, receipts, compliance records, and customer-facing files in one controlled workspace.</p></div>
        <button className="record-primary-action" onClick={() => setShowUpload(true)}><Icon name="plus" size={16} /> Upload File</button>
      </header>

      {error && <div className="record-alert record-alert--error">{error}</div>}
      {showingSampleData && <div className="sample-data-banner"><Icon name="alert" size={16} /><span><strong>Sample Data — Preview Only</strong> No real documents exist yet. These files are visual examples and cannot be opened.</span></div>}

      <section className="records-vault-layout">
        <aside className="records-vault-index">
          <div className="records-vault-index__title"><span>RECORD GROUPS</span><strong>{documents.length} files</strong></div>
          {groups.map((item) => <button key={item.id} className={group === item.id ? 'active' : ''} onClick={() => setGroup(item.id)}><span>{item.label}</span><strong>{counts[item.id]}</strong></button>)}
          <div className="records-vault-policy"><Icon name="alert" size={17} /><p>Customer-visible files can appear on the public load tracker. Internal records remain private.</p></div>
        </aside>

        <div className="records-vault-main">
          <div className="record-filterbar">
            <label><Icon name="search" size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search filename, load, customer, or type" /></label>
            <span>{filtered.length} records shown</span>
          </div>

          <section className="document-register-v2">
            <div className="document-register-v2__head"><span>File</span><span>Classification</span><span>Related record</span><span>Visibility</span><span>Uploaded</span><span /></div>
            {filtered.map((document) => <article key={document.id}>
              <div className="document-register-v2__file"><span><Icon name="documents" size={18} /></span><strong>{document.file_name}</strong></div>
              <div><strong>{labels[document.type] || document.type}</strong><small>{document.type.replaceAll('_', ' ')}</small></div>
              <div><strong>{document.loads?.load_number || 'Company record'}</strong><small>{document.customers?.company_name || 'No customer linked'}</small></div>
              <div><span className={`visibility-pill ${document.customer_visible ? 'visibility-pill--public' : ''}`}>{document.customer_visible ? 'Customer visible' : 'Internal only'}</span></div>
              <div><strong>{new Date(document.created_at).toLocaleDateString()}</strong><small>{new Date(document.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small></div>
              <button onClick={() => openDocument(document)} disabled={document.storage_path === 'demo'} aria-label={`Open ${document.file_name}`}><Icon name="arrow" size={16} /></button>
            </article>)}
            {!filtered.length && <div className="record-empty">No records match this group and search.</div>}
          </section>
        </div>
      </section>

      {showUpload && <div className="modal-scrim" onMouseDown={() => setShowUpload(false)}><section className="modal-card" onMouseDown={(event) => event.stopPropagation()}><div className="modal-card__header"><div><span className="eyebrow">PRIVATE STORAGE</span><h2>Upload Document</h2></div><button className="icon-button" onClick={() => setShowUpload(false)}>×</button></div><div className="form-grid">
        <label className="form-grid__full">File<input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>
        <label>Document type<select value={type} onChange={(event) => setType(event.target.value)}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Related load<select value={selectedLoad} onChange={(event) => setSelectedLoad(event.target.value)}><option value="">General company file</option>{loads.map((load) => <option key={load.id} value={load.id}>{load.load_number} · {load.pickup_city} to {load.delivery_city}</option>)}</select></label>
        <label className="form-grid__full checkbox-label"><input type="checkbox" checked={customerVisible} onChange={(event) => setCustomerVisible(event.target.checked)} /> Make this file visible on the customer tracking page</label>
      </div><div className="modal-card__actions"><button className="secondary-button" onClick={() => setShowUpload(false)}>Cancel</button><button className="primary-button" disabled={!file || saving} onClick={upload}>{saving ? 'Uploading...' : 'Upload Securely'}</button></div></section></div>}
    </div>
  )
}
