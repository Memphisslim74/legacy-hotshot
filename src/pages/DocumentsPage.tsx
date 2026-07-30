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

export function DocumentsPage() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [loads, setLoads] = useState<LoadRecord[]>([])
  const [search, setSearch] = useState('')
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
    return documents.filter((document) => !query || [document.file_name, labels[document.type], document.loads?.load_number, document.customers?.company_name].some((value) => value?.toLowerCase().includes(query)))
  }, [documents, search])

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
    <div className="operations-page">
      <div className="page-command-row"><div><span className="eyebrow">PRIVATE RECORDS</span><h2>Documents</h2><p>Store load paperwork privately and control which files customers can see.</p></div><button className="primary-button" onClick={() => setShowUpload(true)}><Icon name="plus" size={17} /> Upload Document</button></div>
      {error && <div className="form-error operations-alert">{error}</div>}
      {showingSampleData && <div className="sample-data-banner"><Icon name="alert" size={16} /><span><strong>Sample Data — Preview Only</strong> No real documents exist yet. These files are visual examples and cannot be opened.</span></div>}
      <section className="panel operations-toolbar"><label className="operations-search"><Icon name="search" size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search file name, load, customer, or document type" /></label><div className="operations-summary"><strong>{filtered.length}</strong><span>files</span></div></section>
      <section className="panel document-list">
        <div className="document-list__header"><span>File</span><span>Type</span><span>Related record</span><span>Visibility</span><span>Uploaded</span><span /></div>
        {filtered.map((document) => <div className="document-row" key={document.id}>
          <div className="document-name"><span><Icon name="documents" size={19} /></span><strong>{document.file_name}</strong></div>
          <span>{labels[document.type] || document.type}</span>
          <span>{document.loads?.load_number || document.customers?.company_name || 'General company file'}</span>
          <span className={`visibility-pill ${document.customer_visible ? 'visibility-pill--public' : ''}`}>{document.customer_visible ? 'Customer visible' : 'Internal only'}</span>
          <span>{new Date(document.created_at).toLocaleDateString()}</span>
          <button className="icon-button" onClick={() => openDocument(document)} aria-label={`Open ${document.file_name}`}><Icon name="arrow" size={17} /></button>
        </div>)}
        {!filtered.length && <div className="empty-state">No documents match your search.</div>}
      </section>

      {showUpload && <div className="modal-scrim" onMouseDown={() => setShowUpload(false)}><section className="modal-card" onMouseDown={(e) => e.stopPropagation()}><div className="modal-card__header"><div><span className="eyebrow">PRIVATE STORAGE</span><h2>Upload Document</h2></div><button className="icon-button" onClick={() => setShowUpload(false)}>×</button></div><div className="form-grid">
        <label className="form-grid__full">File<input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label>
        <label>Document type<select value={type} onChange={(e) => setType(e.target.value)}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Related load<select value={selectedLoad} onChange={(e) => setSelectedLoad(e.target.value)}><option value="">General company file</option>{loads.map((load) => <option key={load.id} value={load.id}>{load.load_number} · {load.pickup_city} to {load.delivery_city}</option>)}</select></label>
        <label className="form-grid__full checkbox-label"><input type="checkbox" checked={customerVisible} onChange={(e) => setCustomerVisible(e.target.checked)} /> Make this file visible on the customer tracking page</label>
      </div><div className="modal-card__actions"><button className="secondary-button" onClick={() => setShowUpload(false)}>Cancel</button><button className="primary-button" disabled={!file || saving} onClick={upload}>{saving ? 'Uploading...' : 'Upload Securely'}</button></div></section></div>}
    </div>
  )
}
