import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { CalendarDays, FileText, HandCoins, Pencil, Plus, Trash2, Users, Wallet } from 'lucide-react';
import { auth, db } from './firebase';

type Language = 'hi' | 'en';
type Kind = 'members' | 'finance' | 'events' | 'documents';
type Ngo = { id: string; name: string; status: string };
type RecordRow = { id: string; [key: string]: unknown };
const modules: { id: Kind; hi: string; en: string; collection: string }[] = [
  { id: 'members', hi: 'सदस्य / स्वयंसेवक', en: 'Members / Volunteers', collection: 'ngoMembers' },
  { id: 'finance', hi: 'दान / खर्च', en: 'Donations / Expenses', collection: 'ngoTransactions' },
  { id: 'events', hi: 'कार्यक्रम', en: 'Events', collection: 'ngoEvents' },
  { id: 'documents', hi: 'दस्तावेज़ / रिपोर्ट', en: 'Documents / Reports', collection: 'ngoDocuments' },
];
const blank = (kind: Kind) => kind === 'members'
  ? { name: '', phone: '', email: '', role: 'MEMBER', status: 'ACTIVE' }
  : kind === 'finance'
    ? { type: 'DONATION', amount: '', category: '', donor: '', date: new Date().toISOString().slice(0, 10), note: '' }
    : kind === 'events'
      ? { title: '', date: new Date().toISOString().slice(0, 10), location: '', description: '', status: 'PLANNED' }
      : { title: '', type: 'REPORT', url: '', notes: '' };
const icons = { members: Users, finance: Wallet, events: CalendarDays, documents: FileText };
const safe = (value: unknown) => typeof value === 'string' || typeof value === 'number' ? String(value) : '';

export function NgoWorkspacePortal({ authUser, language }: { authUser: User; language: Language }) {
  const hi = language === 'hi';
  const [ngos, setNgos] = useState<Ngo[]>([]);
  const [ngoId, setNgoId] = useState('');
  const [kind, setKind] = useState<Kind>('members');
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [form, setForm] = useState<Record<string, string>>(blank('members'));
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const activeModule = modules.find(m => m.id === kind)!;
  const currentNgo = ngos.find(n => n.id === ngoId);
  const fields = useMemo(() => {
    if (kind === 'members') return [
      { key: 'name', label: hi ? 'पूरा नाम' : 'Full name', required: true },
      { key: 'phone', label: hi ? 'मोबाइल नंबर' : 'Phone number', required: true },
      { key: 'email', label: hi ? 'ईमेल' : 'Email', required: false },
      { key: 'role', label: hi ? 'भूमिका' : 'Role', type: 'select', options: [{ value: 'MEMBER', label: hi ? 'सदस्य' : 'Member' }, { value: 'VOLUNTEER', label: hi ? 'स्वयंसेवक' : 'Volunteer' }], required: true },
      { key: 'status', label: hi ? 'स्थिति' : 'Status', type: 'select', options: [{ value: 'ACTIVE', label: hi ? 'सक्रिय' : 'Active' }, { value: 'INACTIVE', label: hi ? 'निष्क्रिय' : 'Inactive' }], required: true },
    ];
    if (kind === 'finance') return [
      { key: 'type', label: hi ? 'प्रकार' : 'Type', type: 'select', options: [{ value: 'DONATION', label: hi ? 'दान' : 'Donation' }, { value: 'EXPENSE', label: hi ? 'खर्च' : 'Expense' }], required: true },
      { key: 'amount', label: hi ? 'राशि (₹)' : 'Amount (₹)', type: 'number', required: true },
      { key: 'category', label: hi ? 'श्रेणी' : 'Category', required: true },
      { key: 'donor', label: hi ? 'दाता / भुगतान पाने वाला' : 'Donor / Payee', required: false },
      { key: 'date', label: hi ? 'तारीख' : 'Date', type: 'date', required: true },
      { key: 'note', label: hi ? 'विवरण' : 'Notes', type: 'textarea', required: false },
    ];
    if (kind === 'events') return [
      { key: 'title', label: hi ? 'कार्यक्रम का नाम' : 'Event title', required: true },
      { key: 'date', label: hi ? 'तारीख' : 'Date', type: 'date', required: true },
      { key: 'location', label: hi ? 'स्थान' : 'Location', required: false },
      { key: 'description', label: hi ? 'विवरण' : 'Description', type: 'textarea', required: false },
      { key: 'status', label: hi ? 'स्थिति' : 'Status', type: 'select', options: [{ value: 'PLANNED', label: hi ? 'योजना' : 'Planned' }, { value: 'COMPLETED', label: hi ? 'पूरा हुआ' : 'Completed' }, { value: 'CANCELLED', label: hi ? 'रद्द' : 'Cancelled' }], required: true },
    ];
    return [
      { key: 'title', label: hi ? 'दस्तावेज़ / रिपोर्ट का नाम' : 'Document / report title', required: true },
      { key: 'type', label: hi ? 'प्रकार' : 'Type', type: 'select', options: [{ value: 'REPORT', label: hi ? 'रिपोर्ट' : 'Report' }, { value: 'CERTIFICATE', label: hi ? 'प्रमाणपत्र' : 'Certificate' }, { value: 'OTHER', label: hi ? 'अन्य' : 'Other' }], required: true },
      { key: 'url', label: hi ? 'फाइल लिंक (Drive आदि)' : 'File link (Drive, etc.)', type: 'url', required: false },
      { key: 'notes', label: hi ? 'नोट' : 'Notes', type: 'textarea', required: false },
    ];
  }, [kind, hi]);

  const loadNgos = async () => {
    const snap = await getDocs(query(collection(db, 'ngos'), where('ownerUid', '==', authUser.uid)));
    const list = snap.docs.map(d => ({ id: d.id, name: String(d.data().name || d.data().ngoName || 'NGO'), status: String(d.data().status || '') }));
    setNgos(list);
    setNgoId(current => list.some(n => n.id === current) ? current : list[0]?.id || '');
    setLoading(false);
  };
  const loadRows = async (id: string, currentKind: Kind) => {
    if (!id) { setRows([]); return; }
    const snap = await getDocs(query(collection(db, modules.find(m => m.id === currentKind)!.collection), where('ngoId', '==', id)));
    setRows(snap.docs.map(d => ({ id: d.id, ...d.data() } as RecordRow)).sort((a, b) => safe(b.date || b.createdAt).localeCompare(safe(a.date || a.createdAt))));
  };
  useEffect(() => { void loadNgos().catch(e => { setMessage(e instanceof Error ? e.message : 'NGO load failed'); setLoading(false); }); }, [authUser.uid]);
  useEffect(() => { setForm(blank(kind)); setEditingId(''); if (ngoId) void loadRows(ngoId, kind).catch(e => setMessage(e instanceof Error ? e.message : 'Records could not be loaded.')); else setRows([]); }, [ngoId, kind]);
  const startEdit = (row: RecordRow) => {
    const next = blank(kind);
    Object.keys(next).forEach(key => { next[key] = safe(row[key]); });
    setForm(next); setEditingId(row.id); setMessage('');
    document.getElementById('ngo-workspace-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentNgo) return;
    if (kind === 'finance' && (!Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0)) { setMessage(hi ? 'राशि शून्य से अधिक होनी चाहिए।' : 'Amount must be greater than zero.'); return; }
    if (kind === 'documents' && form.url && !/^https:\/\//i.test(form.url)) { setMessage(hi ? 'फाइल लिंक https:// से शुरू होना चाहिए।' : 'File URL must start with https://.'); return; }
    setBusy(true); setMessage('');
    const mutable = { ...form, ...(kind === 'finance' ? { amount: Number(form.amount) } : {}), ngoId, updatedAt: serverTimestamp() };
    try {
      if (editingId) await updateDoc(doc(db, activeModule.collection, editingId), mutable);
      else await addDoc(collection(db, activeModule.collection), { ...mutable, createdBy: authUser.uid, createdAt: serverTimestamp() });
      setMessage(hi ? 'रिकॉर्ड सफलतापूर्वक सेव हुआ।' : 'Record saved successfully.');
      setForm(blank(kind)); setEditingId('');
      await loadRows(ngoId, kind);
    } catch (e) { setMessage(e instanceof Error ? e.message : (hi ? 'सेव नहीं हुआ। Firestore Rules जाँचें।' : 'Save failed. Check Firestore rules.')); }
    finally { setBusy(false); }
  };
  const remove = async (row: RecordRow) => {
    if (!window.confirm(hi ? 'क्या आप यह रिकॉर्ड हमेशा के लिए हटाना चाहते हैं?' : 'Delete this record permanently?')) return;
    setBusy(true); setMessage('');
    try { await deleteDoc(doc(db, activeModule.collection, row.id)); await loadRows(ngoId, kind); setMessage(hi ? 'रिकॉर्ड हटा दिया गया।' : 'Record deleted.'); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Delete failed.'); }
    finally { setBusy(false); }
  };
  const money = (value: unknown) => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  return <main className="member-portal ngo-workspace">
    <header className="member-portal-header"><a className="member-brand" href="/">NGO<span>Connect</span></a><div><a className="outline-button" href="/ngo-admin">{hi ? 'Member ID / Admin' : 'Member ID / Admin'}</a><button className="outline-button" onClick={() => auth && void signOut(auth)}>{hi ? 'लॉगआउट' : 'Sign out'}</button></div></header>
    <section className="member-portal-hero"><span>NGO CONNECT · WORKSPACE</span><h1>{hi ? 'आपका NGO प्रबंधन डैशबोर्ड' : 'Your NGO management workspace'}</h1><p>{hi ? 'सदस्य, दान/खर्च, कार्यक्रम और दस्तावेज़ अपने NGO के भीतर प्रबंधित करें। रिकॉर्ड केवल आपके NGO ID से जुड़े हैं।' : 'Manage members, donations/expenses, events and documents within your NGO. Records are scoped to your NGO.'}</p></section>
    {loading ? <div className="member-notice">{hi ? 'NGO लोड हो रहा है…' : 'Loading NGOs…'}</div> : ngos.length === 0 ? <div className="member-notice">{hi ? 'इस Google खाते से जुड़ा NGO नहीं मिला। पहले Super Admin से NGO सक्रिय करवाएँ।' : 'No NGO is linked to this Google account. Ask the Super Admin to activate your NGO first.'}</div> : <>
      <section className="ngo-workspace-toolbar"><label>{hi ? 'NGO चुनें' : 'Select NGO'}<select value={ngoId} onChange={e => setNgoId(e.target.value)}>{ngos.map(n => <option key={n.id} value={n.id}>{n.name} · {n.status}</option>)}</select></label><div className="ngo-workspace-tabs">{modules.map(m => { const Icon = icons[m.id]; return <button key={m.id} className={kind === m.id ? 'active' : ''} onClick={() => setKind(m.id)}><Icon size={17}/>{hi ? m.hi : m.en}</button>; })}</div></section>
      <section className="ngo-workspace-summary"><article><span>{hi ? 'कुल रिकॉर्ड' : 'Total records'}</span><strong>{rows.length}</strong></article>{kind === 'finance' && <><article><span>{hi ? 'कुल दान' : 'Total donations'}</span><strong>₹{money(rows.filter(r => r.type === 'DONATION').reduce((s,r) => s + Number(r.amount || 0),0))}</strong></article><article><span>{hi ? 'कुल खर्च' : 'Total expenses'}</span><strong>₹{money(rows.filter(r => r.type === 'EXPENSE').reduce((s,r) => s + Number(r.amount || 0),0))}</strong></article></>}</section>
      <div className="ngo-workspace-grid"><section className="member-form-panel" id="ngo-workspace-form"><h2>{editingId ? (hi ? 'रिकॉर्ड संपादित करें' : 'Edit record') : (hi ? 'नया रिकॉर्ड जोड़ें' : 'Add a new record')}</h2><form onSubmit={save} className="ngo-workspace-form">{fields.map(field => <label key={field.key}>{field.label}{field.required ? ' *' : ''}{field.type === 'select' ? <select required={field.required} value={form[field.key] || ''} onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}>{field.options?.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select> : field.type === 'textarea' ? <textarea required={field.required} maxLength={2000} value={form[field.key] || ''} onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}/> : <input required={field.required} type={field.type || 'text'} maxLength={field.key === 'url' ? 500 : 200} min={field.type === 'number' ? '0.01' : undefined} step={field.type === 'number' ? '0.01' : undefined} value={form[field.key] || ''} onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}/>}</label>)}<div className="ngo-workspace-form-actions"><button className="primary-button" type="submit" disabled={busy}><Plus size={16}/>{busy ? (hi ? 'सेव हो रहा है…' : 'Saving…') : (hi ? 'सेव करें' : 'Save')}</button>{editingId && <button className="outline-button" type="button" onClick={() => { setEditingId(''); setForm(blank(kind)); }}>{hi ? 'रद्द करें' : 'Cancel edit'}</button>}</div></form>{message && <p className="member-notice" role="status">{message}</p>}</section>
        <section className="member-applications-panel ngo-workspace-records"><h2>{hi ? 'सेव रिकॉर्ड' : 'Saved records'} · {rows.length}</h2>{rows.length === 0 ? <p>{hi ? 'अभी रिकॉर्ड नहीं हैं। बाईं ओर फॉर्म भरकर पहला रिकॉर्ड जोड़ें।' : 'No records yet. Use the form to add the first record.'}</p> : rows.map(row => <article className="ngo-workspace-record" key={row.id}><div className="ngo-workspace-record-main"><strong>{safe(row.name || row.title || row.category || row.type) || (hi ? 'रिकॉर्ड' : 'Record')}</strong><span>{kind === 'members' ? [safe(row.role), safe(row.phone), safe(row.email), safe(row.status)].filter(Boolean).join(' · ') : kind === 'finance' ? [safe(row.type), '₹' + money(row.amount), safe(row.category), safe(row.date), safe(row.donor)].filter(Boolean).join(' · ') : kind === 'events' ? [safe(row.date), safe(row.location), safe(row.status)].filter(Boolean).join(' · ') : [safe(row.type), safe(row.url)].filter(Boolean).join(' · ')}</span>{safe(row.note || row.description || row.notes) && <small>{safe(row.note || row.description || row.notes)}</small>}{kind === 'documents' && safe(row.url) && <a href={safe(row.url)} target="_blank" rel="noreferrer">{hi ? 'दस्तावेज़ खोलें' : 'Open document'}</a>}</div><div className="ngo-workspace-record-actions"><button className="small-icon-button" aria-label="Edit" disabled={busy} onClick={() => startEdit(row)}><Pencil size={16}/></button><button className="small-icon-button" aria-label="Delete" disabled={busy} onClick={() => void remove(row)}><Trash2 size={16}/></button></div></article>)}</section></div>
    </>}
  </main>;
}
