import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { CalendarDays, FileText, Pencil, Plus, Trash2, Users, Wallet } from 'lucide-react';
import { auth, db } from './firebase';

type Language = 'hi' | 'en';
const SUPER_ADMIN_EMAILS = ['ngogrant454@gmail.com', 'zaradigitalseva@gmail.com'];
const isPlatformAdmin = (user: User) => Boolean(user.emailVerified && user.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase()));
type Kind = 'members' | 'finance' | 'events' | 'documents';
type Ngo = { id: string; name: string; status: string; memberFee: number; adminWhatsApp: string };
type RecordRow = { id: string; [key: string]: unknown };
type MembershipApplication = { id: string; ngoId: string; ngoName: string; applicantEmail?: string; name: string; fatherName: string; phone: string; address: string; photoData?: string; feeAmount: number; status: string; memberId?: string; rejectionReason?: string; createdAt?: unknown };
const modules: { id: Kind; hi: string; en: string; collection: string }[] = [
  { id: 'members', hi: 'सदस्य / स्वयंसेवक', en: 'Members / Volunteers', collection: 'ngoMembers' },
  { id: 'finance', hi: 'दान / खर्च', en: 'Donations / Expenses', collection: 'ngoTransactions' },
  { id: 'events', hi: 'कार्यक्रम', en: 'Events', collection: 'ngoEvents' },
  { id: 'documents', hi: 'दस्तावेज़ / रिपोर्ट', en: 'Documents / Reports', collection: 'ngoDocuments' },
];
const blank = (kind: Kind): Record<string, string> => kind === 'members'
  ? { name: '', phone: '', email: '', role: 'MEMBER', designation: '', location: '', status: 'ACTIVE' }
  : kind === 'finance'
    ? { type: 'DONATION', amount: '', category: '', donor: '', date: new Date().toISOString().slice(0, 10), note: '' }
    : kind === 'events'
      ? { title: '', date: new Date().toISOString().slice(0, 10), location: '', description: '', status: 'PLANNED' }
      : { title: '', type: 'REPORT', url: '', notes: '' };
const icons = { members: Users, finance: Wallet, events: CalendarDays, documents: FileText };
const safe = (value: unknown) => typeof value === 'string' || typeof value === 'number' ? String(value) : '';

export function NgoWorkspacePortal({ authUser, language }: { authUser: User; language: Language }) {
  const hi = language === 'hi';
  const platformAdminView = isPlatformAdmin(authUser);
  const [ngos, setNgos] = useState<Ngo[]>([]);
  const [ngoId, setNgoId] = useState('');
  const [kind, setKind] = useState<Kind>('members');
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [memberApplications, setMemberApplications] = useState<MembershipApplication[]>([]);
  const [form, setForm] = useState<Record<string, string>>(blank('members'));
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [settingsFee, setSettingsFee] = useState('100');
  const [settingsWhatsApp, setSettingsWhatsApp] = useState('');
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [slideRows, setSlideRows] = useState<RecordRow[]>([]);
  const [slideBusy, setSlideBusy] = useState(false);
  const [slideMessage, setSlideMessage] = useState('');
  const [selectedSlideFiles, setSelectedSlideFiles] = useState<File[]>([]);
  const activeModule = modules.find(m => m.id === kind)!;
  const currentNgo = ngos.find(n => n.id === ngoId);
  const fields = useMemo<Array<{ key: string; label: string; required: boolean; type?: string; options?: Array<{ value: string; label: string }> }>>(() => {
    if (kind === 'members') return [
      { key: 'name', label: hi ? 'पूरा नाम' : 'Full name', required: true },
      { key: 'phone', label: hi ? 'मोबाइल नंबर' : 'Phone number', required: true },
      { key: 'email', label: hi ? 'ईमेल (वैकल्पिक)' : 'Email (optional)', required: false },
      { key: 'designation', label: hi ? 'NGO में पद / जिम्मेदारी' : 'Position / responsibility in NGO', required: true },
      { key: 'location', label: hi ? 'किस जगह / क्षेत्र में काम करते हैं' : 'Work location / area', required: true },
      { key: 'role', label: hi ? 'सदस्य की श्रेणी' : 'Member type', type: 'select', options: [{ value: 'MEMBER', label: hi ? 'सदस्य' : 'Member' }, { value: 'VOLUNTEER', label: hi ? 'स्वयंसेवक' : 'Volunteer' }], required: true },
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

  useEffect(() => {
    // Super Admin has no role in NGO donation/expense management.
    if (platformAdminView && kind === 'finance') setKind('members');
  }, [platformAdminView, kind]);

  useEffect(() => {
    // Each signed-in account sees only NGOs linked to its own UID.
    const ngoSource = platformAdminView ? collection(db, 'ngos') : query(collection(db, 'ngos'), where('ownerUid', '==', authUser.uid));
    const unsubscribe = onSnapshot(ngoSource, snap => {
      const list = snap.docs.map(d => ({ id: d.id, name: String(d.data().name || d.data().ngoName || 'NGO'), status: String(d.data().status || '').toUpperCase(), memberFee: Number(d.data().memberFee || 100), adminWhatsApp: String(d.data().adminWhatsApp || '') })).filter(n => ['LIVE', 'ACTIVE', 'APPROVED'].includes(n.status));
      setNgos(list);
      setNgoId(current => list.some(n => n.id === current) ? current : list[0]?.id || '');
      setLoading(false);
    }, e => { setMessage(e instanceof Error ? e.message : 'NGO load failed'); setLoading(false); });
    return unsubscribe;
  }, [authUser.uid]);
  useEffect(() => {
    setSettingsFee(String(currentNgo?.memberFee || 100));
    setSettingsWhatsApp(currentNgo?.adminWhatsApp || '');
  }, [ngoId, currentNgo?.memberFee, currentNgo?.adminWhatsApp]);
  useEffect(() => {
    setForm(blank(kind)); setEditingId('');
    if (!ngoId) { setRows([]); return; }
    const module = modules.find(m => m.id === kind)!;
    const unsubscribe = onSnapshot(query(collection(db, module.collection), where('ngoId', '==', ngoId)), snap => {
      setRows(snap.docs.map(d => ({ id: d.id, ...d.data() } as RecordRow)).sort((a, b) => safe(b.date || b.createdAt).localeCompare(safe(a.date || a.createdAt))));
    }, e => setMessage(e instanceof Error ? e.message : 'Records could not be loaded.'));
    return unsubscribe;
  }, [ngoId, kind]);
  useEffect(() => {
    if (!ngoId) { setSlideRows([]); return; }
    const unsubscribe = onSnapshot(query(collection(db, 'ngoHeaderSlides'), where('ngoId', '==', ngoId)), snap => setSlideRows(snap.docs.map(d => ({ id: d.id, ...d.data() } as RecordRow)).sort((a,b) => safe(a.createdAt).localeCompare(safe(b.createdAt)))), e => setSlideMessage(e instanceof Error ? e.message : 'Could not load slideshow images.'));
    return unsubscribe;
  }, [ngoId]);

  useEffect(() => {
    if (!ngoId) { setMemberApplications([]); return; }
    const unsubscribe = onSnapshot(query(collection(db, 'memberApplications'), where('ngoId', '==', ngoId)), snap => {
      setMemberApplications(snap.docs.map(d => ({ id: d.id, ...d.data() } as MembershipApplication)).sort((a, b) => safe(b.createdAt).localeCompare(safe(a.createdAt))));
    }, e => setMessage(e instanceof Error ? e.message : (hi ? 'सदस्य आवेदन लोड नहीं हो पाए।' : 'Could not load member applications.')));
    return unsubscribe;
  }, [ngoId, hi]);
  const startEdit = (row: RecordRow) => {
    const next: Record<string, string> = blank(kind);
    Object.keys(next).forEach(key => { next[key] = safe(row[key]); });
    setForm(next); setEditingId(row.id); setMessage('');
    document.getElementById('ngo-workspace-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentNgo) return;
    const fee = Number(settingsFee);
    const whatsapp = settingsWhatsApp.replace(/[^0-9]/g, '');
    if (!Number.isFinite(fee) || fee < 1 || fee > 100000) { setSettingsMessage(hi ? 'सदस्यता शुल्क ₹1 से ₹1,00,000 के बीच रखें।' : 'Member fee must be between ₹1 and ₹100,000.'); return; }
    if (whatsapp.length < 10 || whatsapp.length > 20) { setSettingsMessage(hi ? 'सही WhatsApp नंबर डालें (10–20 अंक, देश कोड सहित)।' : 'Enter a valid WhatsApp number (10–20 digits including country code).'); return; }
    setSettingsBusy(true); setSettingsMessage('');
    try {
      await updateDoc(doc(db, 'ngos', currentNgo.id), { memberFee: fee, adminWhatsApp: whatsapp, updatedAt: serverTimestamp() });
      setSettingsMessage(hi ? '✅ NGO सेटिंग सफलतापूर्वक सेव हो गई।' : '✅ NGO settings saved successfully.');
    } catch (e) { setSettingsMessage(e instanceof Error ? `❌ ${e.message}` : (hi ? '❌ सेटिंग सेव नहीं हुई। Firestore Rules जाँचें।' : '❌ Settings could not be saved. Check Firestore rules.')); }
    finally { setSettingsBusy(false); }
  };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentNgo) return;
    if (kind === 'finance' && (!Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0)) { setMessage(hi ? 'राशि शून्य से अधिक होनी चाहिए।' : 'Amount must be greater than zero.'); return; }
    if (kind === 'documents' && form.url && !/^https:\/\//i.test(form.url)) { setMessage(hi ? 'फाइल लिंक https:// से शुरू होना चाहिए।' : 'File URL must start with https://.'); return; }
    setBusy(true); setMessage('');
    const mutable = { ...form, ...(kind === 'finance' ? { amount: Number(form.amount) } : {}), ngoId, approvalStatus: 'APPROVED', updatedAt: serverTimestamp() };
    try {
      if (editingId) await updateDoc(doc(db, activeModule.collection, editingId), mutable);
      else await addDoc(collection(db, activeModule.collection), { ...mutable, createdBy: authUser.uid, createdAt: serverTimestamp() });
      setMessage(hi ? '✅ रिकॉर्ड सेव हो गया और आपके NGO पेज पर प्रकाशित है।' : '✅ Record saved and published on your NGO page.');
      setForm(blank(kind)); setEditingId('');
    } catch (e) { setMessage(e instanceof Error ? e.message : (hi ? 'सेव नहीं हुआ। Firestore Rules जाँचें।' : 'Save failed. Check Firestore rules.')); }
    finally { setBusy(false); }
  };
  const remove = async (row: RecordRow) => {
    if (!window.confirm(hi ? 'क्या आप यह रिकॉर्ड हमेशा के लिए हटाना चाहते हैं?' : 'Delete this record permanently?')) return;
    setBusy(true); setMessage('');
    try { await deleteDoc(doc(db, activeModule.collection, row.id)); setMessage(hi ? 'रिकॉर्ड हटा दिया गया।' : 'Record deleted.'); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Delete failed.'); }
    finally { setBusy(false); }
  };
  const reviewMemberApplication = async (app: MembershipApplication, action: 'REJECT' | 'DELETE') => {
    const prompt = action === 'DELETE'
      ? (hi ? 'क्या यह सदस्य आवेदन हमेशा के लिए हटाना है?' : 'Permanently delete this application?')
      : (hi ? 'क्या आप इस सदस्य आवेदन को अस्वीकार करना चाहते हैं?' : 'Reject this membership application?');
    if (!window.confirm(prompt)) return;
    setBusy(true); setMessage('');
    try {
      if (action === 'DELETE') {
        await deleteDoc(doc(db, 'memberApplications', app.id));
        setMemberApplications(current => current.filter(item => item.id !== app.id));
        setMessage(hi ? 'सदस्य आवेदन हटा दिया गया।' : 'Membership application deleted.');
      } else {
        await updateDoc(doc(db, 'memberApplications', app.id), {
          status: 'REJECTED',
          rejectionReason: hi ? 'NGO Admin ने आवेदन अस्वीकार किया।' : 'Rejected by NGO admin.',
          reviewedBy: authUser.uid,
          reviewedAt: serverTimestamp()
        });
        setMemberApplications(current => current.map(item => item.id === app.id ? { ...item, status: 'REJECTED', rejectionReason: hi ? 'NGO Admin ने आवेदन अस्वीकार किया।' : 'Rejected by NGO admin.' } : item));
        setMessage(hi ? 'सदस्य आवेदन अस्वीकार किया गया।' : 'Membership application rejected.');
      }
    } catch (e) { setMessage(e instanceof Error ? e.message : (hi ? 'कार्रवाई पूरी नहीं हुई। Firestore Rules जाँचें।' : 'Action failed. Check Firestore rules.')); }
    finally { setBusy(false); }
  };
  const money = (value: unknown) => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  return <main className="member-portal ngo-workspace">
    <header className="member-portal-header"><a className="member-brand" href="/">All NGO Connect</a><div><a className="outline-button" href="/ngo-admin">{hi ? 'Member ID / Admin' : 'Member ID / Admin'}</a><button className="outline-button" onClick={() => auth && void signOut(auth)}>{hi ? 'लॉगआउट' : 'Sign out'}</button></div></header>
    <section className="member-portal-hero"><span>{isPlatformAdmin(authUser) ? 'SUPER ADMIN · ALL NGO WORKSPACES' : 'ALL NGO CONNECT · WORKSPACE'}</span><h1>{hi ? 'आपका NGO प्रबंधन डैशबोर्ड' : 'Your NGO management workspace'}</h1><p>{hi ? 'सदस्य, दान/खर्च, कार्यक्रम और दस्तावेज़ अपने NGO के भीतर प्रबंधित करें। रिकॉर्ड केवल आपके NGO ID से जुड़े हैं।' : 'Manage members, donations/expenses, events and documents within your NGO. Records are scoped to your NGO.'}</p></section>
    {loading ? <div className="member-notice">{hi ? 'NGO लोड हो रहा है…' : 'Loading NGOs…'}</div> : ngos.length === 0 ? <div className="member-notice">{hi ? 'इस Google खाते से जुड़ा NGO नहीं मिला। पहले Super Admin से NGO सक्रिय करवाएँ।' : 'No NGO is linked to this Google account. Ask the Super Admin to activate your NGO first.'}</div> : <>
      {!platformAdminView && <section className="member-form-panel ngo-settings-panel"><h2>{hi ? 'NGO सेटिंग' : 'NGO settings'}</h2><p>{hi ? 'सदस्य आवेदन देखने और फीस जाँचकर Member ID मंज़ूर करने के लिए Member ID / Admin खोलें।' : 'Open Member ID / Admin to review applications, verify fees, and approve Member IDs.'} <a className="outline-button" href="/ngo-admin" style={{display:'inline-flex',marginTop:8}}>{hi ? 'सदस्य आवेदन खोलें' : 'Open member applications'}</a></p><form onSubmit={saveSettings} className="ngo-workspace-form"><label>{hi ? 'सदस्यता शुल्क (₹)' : 'Membership fee (₹)'}<input required type="number" min="1" max="100000" step="1" value={settingsFee} onChange={e => setSettingsFee(e.target.value)} /></label><label>{hi ? 'NGO Admin WhatsApp नंबर (देश कोड सहित)' : 'NGO admin WhatsApp (include country code)'}<input required type="tel" maxLength={20} value={settingsWhatsApp} onChange={e => setSettingsWhatsApp(e.target.value)} placeholder="919876543210" /></label><div className="ngo-workspace-form-actions"><button className="primary-button" type="submit" disabled={settingsBusy}>{settingsBusy ? (hi ? 'सेव हो रहा है…' : 'Saving…') : (hi ? 'सेटिंग सेव करें' : 'Save settings')}</button></div></form>{settingsMessage && <p className="member-notice" role="status" aria-live="polite" style={{marginTop:12,fontWeight:700}}>{settingsMessage}</p>}</section>}
      <section className="member-form-panel" style={{marginBottom:20}}>
        <h2>{hi ? 'NGO हेडर की स्क्रॉलिंग तस्वीरें' : 'NGO header slideshow images'}</h2>
        <p>{hi ? 'तस्वीरें अपलोड और भुगतान का प्रबंधन अभी Super Admin करेगा। यहाँ आप अपनी तस्वीरों की मंज़ूरी और स्थिति देख सकते हैं।' : 'Image uploads and payment are currently managed by the Super Admin. You can view image approval and payment status here.'}</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginTop:14}}>
          {slideRows.map(row=><article key={row.id} style={{border:'1px solid #dbeafe',borderRadius:12,padding:10,background:'#fff'}}><img src={safe(row.imageData)} alt="NGO slideshow" style={{width:'100%',height:100,objectFit:'cover',borderRadius:8}}/><strong style={{display:'block',marginTop:8,fontSize:12}}>{safe(row.approvalStatus)==='APPROVED'?(hi?'✅ लाइव — भुगतान सत्यापित':'✅ Live — payment verified'):safe(row.approvalStatus)==='REJECTED'?(hi?'❌ अस्वीकृत — Super Admin से संपर्क करें':'❌ Rejected — contact Super Admin'):safe(row.paymentStatus)==='SUBMITTED_FOR_REVIEW'?(hi?'🟠 UTR जमा — Super Admin भुगतान जाँच रहा है':'🟠 UTR submitted — Super Admin is verifying payment'):safe(row.paymentStatus)==='REJECTED'?(hi?'❌ भुगतान अस्वीकृत — दोबारा जाँच कराएँ':'❌ Payment rejected — contact Super Admin'):(hi?'🟡 भुगतान बाकी — अभी सार्वजनिक नहीं':'🟡 Payment pending — not public yet')}</strong>{safe(row.paymentReference) && <small style={{display:'block',marginTop:5,overflowWrap:'anywhere'}}>{hi?'UTR: ':'UTR: '}{safe(row.paymentReference)}</small>}
          {platformAdminView && safe(row.approvalStatus)==='PENDING_PAYMENT' && safe(row.paymentStatus)==='SUBMITTED_FOR_REVIEW' && <div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}><button className="primary-button" type="button" disabled={slideBusy} onClick={async()=>{setSlideBusy(true);try{await updateDoc(doc(db,'ngoHeaderSlides',row.id),{approvalStatus:'APPROVED',paymentStatus:'VERIFIED',reviewedBy:authUser.uid,reviewedAt:serverTimestamp(),updatedAt:serverTimestamp()});setSlideMessage(hi?'भुगतान सत्यापित, तस्वीर मंज़ूर होकर लाइव हो गई।':'Payment verified; image approved and now live.');}catch(err){setSlideMessage(err instanceof Error?err.message:'Approval failed.');}finally{setSlideBusy(false);}}}>Approve</button><button className="outline-button" type="button" disabled={slideBusy} onClick={async()=>{setSlideBusy(true);try{await updateDoc(doc(db,'ngoHeaderSlides',row.id),{approvalStatus:'REJECTED',paymentStatus:'REJECTED',reviewedBy:authUser.uid,reviewedAt:serverTimestamp(),updatedAt:serverTimestamp()});setSlideMessage(hi?'तस्वीर अस्वीकृत कर दी गई।':'Image rejected.');}catch(err){setSlideMessage(err instanceof Error?err.message:'Reject failed.');}finally{setSlideBusy(false);}}}>Reject</button></div>}
          {(platformAdminView || safe(row.createdBy)===authUser.uid) && <button className="outline-button" type="button" style={{marginTop:8,color:'#b91c1c'}} disabled={slideBusy} onClick={async()=>{if(!window.confirm(hi?'यह तस्वीर हटाएँ?':'Delete this image?'))return;setSlideBusy(true);try{await deleteDoc(doc(db,'ngoHeaderSlides',row.id));}catch(err){setSlideMessage(err instanceof Error?err.message:'Delete failed.');}finally{setSlideBusy(false);}}}>{hi?'तस्वीर हटाएँ':'Delete image'}</button>}</article>)}
        </div>
      </section>
      <section className="ngo-workspace-toolbar">{platformAdminView ? <label>{hi ? 'NGO चुनें' : 'Select NGO'}<select value={ngoId} onChange={e => setNgoId(e.target.value)}>{ngos.map(n => <option key={n.id} value={n.id}>{n.name} · {n.status}</option>)}</select></label> : <div className="member-notice" style={{margin:0,fontWeight:800}}>{hi ? 'आपका NGO:' : 'Your NGO:'} {currentNgo?.name || ''} · {currentNgo?.status || ''}</div>}<div className="ngo-workspace-tabs">{modules.filter(m => !platformAdminView || m.id !== 'finance').map(m => { const Icon = icons[m.id]; return <button key={m.id} className={kind === m.id ? 'active' : ''} onClick={() => setKind(m.id)}><Icon size={17}/>{hi ? m.hi : m.en}</button>; })}</div></section>
      <section className="member-applications-panel" style={{marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
          <h2 style={{margin:0}}>{hi ? "यूज़र के सदस्य आवेदन" : "Membership applications from users"} · {memberApplications.length}</h2>
          <a className="primary-button" href="/ngo-admin">{hi ? "आवेदन जाँचें / मंज़ूर करें" : "Review / approve applications"}</a>
        </div>
        {memberApplications.length === 0 ? <p>{hi ? "अभी इस NGO के लिए कोई आवेदन नहीं आया है। नया आवेदन आने पर यहाँ दिखेगा।" : "No applications have arrived for this NGO yet. New applications will appear here."}</p> : memberApplications.map(app => <article className="ngo-workspace-record" key={app.id} style={{alignItems:"center",gap:10,padding:10,maxWidth:760,marginTop:10,borderRadius:12}}>
          {app.photoData && <img src={app.photoData} alt={app.name} style={{width:54,height:62,objectFit:"cover",borderRadius:8,border:"1px solid #d1d5db",flexShrink:0}}/>}
          <div className="ngo-workspace-record-main" style={{minWidth:0,flex:1,gap:3,fontSize:12,lineHeight:1.35}}><strong style={{fontSize:14}}>{app.name}</strong>
            <span>{hi ? "पिता/अभिभावक: " : "Father/guardian: "}{app.fatherName} · {app.phone}</span>
            {app.applicantEmail && <span style={{overflowWrap:"anywhere"}}>{app.applicantEmail}</span>}
            <span style={{whiteSpace:"normal",overflowWrap:"anywhere"}}>{hi ? "पता: " : "Address: "}{app.address}</span>
            <small style={{overflowWrap:"anywhere"}}>{hi ? "आवेदन: " : "Ref: "}{app.id}</small>
            <small style={{display:"inline-flex",alignSelf:"flex-start",marginTop:3,padding:"3px 7px",borderRadius:999,background:app.status === "APPROVED" ? "#dcfce7" : app.status === "REJECTED" ? "#fee2e2" : "#fef3c7",color:app.status === "APPROVED" ? "#166534" : app.status === "REJECTED" ? "#991b1b" : "#92400e",fontWeight:800}}>{app.status} · ₹{app.feeAmount}</small>
            {app.memberId && <span>Member ID: {app.memberId}</span>}
            {app.rejectionReason && <span>{hi ? "कारण: " : "Reason: "}{app.rejectionReason}</span>}
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:5}}>
              {app.status === "PENDING_PAYMENT" && <button className="outline-button" type="button" disabled={busy} onClick={() => void reviewMemberApplication(app,'REJECT')} style={{padding:"5px 9px",fontSize:12,color:"#b91c1c",borderColor:"#fecaca"}}>{hi ? "Reject" : "Reject"}</button>}
              <button className="outline-button" type="button" disabled={busy} onClick={() => void reviewMemberApplication(app,'DELETE')} style={{padding:"5px 9px",fontSize:12,color:"#b91c1c",borderColor:"#fecaca"}}><Trash2 size={13}/>{hi ? "डिलीट" : "Delete"}</button>
            </div>
          </div></article>)}
      </section>
      <section className="ngo-workspace-summary"><article><span>{hi ? 'कुल रिकॉर्ड' : 'Total records'}</span><strong>{rows.length}</strong></article>{kind === 'finance' && <><article><span>{hi ? 'कुल दान' : 'Total donations'}</span><strong>₹{money(rows.filter(r => r.type === 'DONATION').reduce((s,r) => s + Number(r.amount || 0),0))}</strong></article><article><span>{hi ? 'कुल खर्च' : 'Total expenses'}</span><strong>₹{money(rows.filter(r => r.type === 'EXPENSE').reduce((s,r) => s + Number(r.amount || 0),0))}</strong></article></>}</section>
      <div className="ngo-workspace-grid"><section className="member-form-panel" id="ngo-workspace-form"><h2>{editingId ? (hi ? 'रिकॉर्ड संपादित करें' : 'Edit record') : (hi ? 'नया रिकॉर्ड जोड़ें' : 'Add a new record')}</h2><form onSubmit={save} className="ngo-workspace-form">{fields.map(field => <label key={field.key}>{field.label}{field.required ? ' *' : ''}{field.type === 'select' ? <select required={field.required} value={form[field.key] || ''} onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}>{field.options?.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select> : field.type === 'textarea' ? <textarea required={field.required} maxLength={2000} value={form[field.key] || ''} onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}/> : <input required={field.required} type={field.type || 'text'} maxLength={field.key === 'url' ? 500 : 200} min={field.type === 'number' ? '0.01' : undefined} step={field.type === 'number' ? '0.01' : undefined} value={form[field.key] || ''} onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}/>}</label>)}<div className="ngo-workspace-form-actions"><button className="primary-button" type="submit" disabled={busy}><Plus size={16}/>{busy ? (hi ? 'सेव हो रहा है…' : 'Saving…') : (hi ? 'सेव करें' : 'Save')}</button>{editingId && <button className="outline-button" type="button" onClick={() => { setEditingId(''); setForm(blank(kind)); }}>{hi ? 'रद्द करें' : 'Cancel edit'}</button>}</div></form>{message && <p className="member-notice" role="status">{message}</p>}</section>
        <section className="member-applications-panel ngo-workspace-records"><h2>{hi ? 'सेव रिकॉर्ड' : 'Saved records'} · {rows.length}</h2>{rows.length === 0 ? <p>{hi ? 'अभी रिकॉर्ड नहीं हैं। बाईं ओर फॉर्म भरकर पहला रिकॉर्ड जोड़ें।' : 'No records yet. Use the form to add the first record.'}</p> : rows.map(row => <article className="ngo-workspace-record" key={row.id}><div className="ngo-workspace-record-main"><strong>{safe(row.name || row.title || row.category || row.type) || (hi ? 'रिकॉर्ड' : 'Record')}</strong><span>{kind === 'members' ? [safe(row.designation), safe(row.location), safe(row.role === 'VOLUNTEER' ? (hi ? 'स्वयंसेवक' : 'Volunteer') : (hi ? 'सदस्य' : 'Member')), safe(row.phone), safe(row.status)].filter(Boolean).join(' · ') : kind === 'finance' ? [safe(row.type), '₹' + money(row.amount), safe(row.category), safe(row.date), safe(row.donor)].filter(Boolean).join(' · ') : kind === 'events' ? [safe(row.date), safe(row.location), safe(row.status)].filter(Boolean).join(' · ') : [safe(row.type), safe(row.url)].filter(Boolean).join(' · ')}</span><small style={{display:'inline-flex',marginTop:6,padding:'4px 8px',borderRadius:999,background:String(row.approvalStatus || 'PENDING') === 'APPROVED' ? '#dcfce7' : '#fef3c7',color:String(row.approvalStatus || 'PENDING') === 'APPROVED' ? '#166534' : '#92400e',fontWeight:800}}>{String(row.approvalStatus || 'PENDING') === 'APPROVED' ? (hi ? 'प्रकाशित' : 'Published') : String(row.approvalStatus || 'PENDING') === 'REJECTED' ? (hi ? 'अस्वीकृत' : 'Rejected') : (hi ? 'मंज़ूरी बाकी' : 'Pending approval')}</small>{safe(row.note || row.description || row.notes) && <small>{safe(row.note || row.description || row.notes)}</small>}{kind === 'documents' && safe(row.url) && <a href={safe(row.url)} target="_blank" rel="noreferrer">{hi ? 'दस्तावेज़ खोलें' : 'Open document'}</a>}</div>{!platformAdminView && <div className="ngo-workspace-record-actions" style={{display:'flex',flexWrap:'wrap',gap:8,alignItems:'center'}}><button type="button" className="outline-button" aria-label={hi ? 'सदस्य संपादित करें' : 'Edit record'} disabled={busy} onClick={() => startEdit(row)} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,minHeight:40,padding:'8px 14px',fontWeight:800}}><Pencil size={16}/>{hi ? 'Edit करें' : 'Edit'}</button><button type="button" className="outline-button" aria-label={hi ? 'सदस्य हटाएँ' : 'Delete record'} disabled={busy} onClick={() => void remove(row)} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,minHeight:40,padding:'8px 14px',fontWeight:800,color:'#b91c1c',borderColor:'#fecaca'}}><Trash2 size={16}/>{hi ? 'Delete करें' : 'Delete'}</button></div>}</article>)}</section></div>
    </>}
  </main>;
}
