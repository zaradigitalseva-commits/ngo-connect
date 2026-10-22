import { useEffect, useState, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import {
  addDoc, collection, doc, getDoc, onSnapshot, query, serverTimestamp,
  updateDoc, where, writeBatch
} from 'firebase/firestore';

type Language = 'hi' | 'en';
type Ngo = { id: string; name: string; status: string; memberFee: number; adminWhatsApp: string; ownerUid: string; logoUrl?: string };
type Application = {
  id: string; ngoId: string; ngoName: string; applicantUid: string; name: string;
  fatherName: string; phone: string; address: string; photoData: string;
  feeAmount: number; status: string; memberId?: string; rejectionReason?: string;
};
const SUPER_ADMIN_EMAILS = ['ngogrant454@gmail.com', 'zaradigitalseva@gmail.com'];
const isPlatformAdmin = (user: User) => Boolean(user.emailVerified && user.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase()));
const hiText = (hi: boolean, hindi: string, english: string) => hi ? hindi : english;
const cleanWhatsApp = (value: string) => value.replace(/[^0-9]/g, '');
const makeMemberId = () => 'NGC-' + Date.now().toString(36).toUpperCase();

export function MemberIDPortal({ authUser, onLogin, language }: { authUser: User | null; onLogin: () => void; language: Language }) {
  const hi = language === 'hi';
  const [ngos, setNgos] = useState<Ngo[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [photoData, setPhotoData] = useState('');
  const [form, setForm] = useState({ ngoId: '', name: '', fatherName: '', phone: '', address: '' });
  const selectedNgo = ngos.find(n => n.id === form.ngoId);
  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, 'ngos'), where('status', 'in', ['LIVE', 'ACTIVE', 'APPROVED'])), snapshot => {
      setNgos(snapshot.docs.map(d => { const x = d.data(); return { id: d.id, name: String(x.name || x.ngoName || 'NGO'), status: String(x.status || ''), memberFee: Number(x.memberFee || 0), adminWhatsApp: String(x.adminWhatsApp || ''), ownerUid: String(x.ownerUid || ''), logoUrl: String(x.logoUrl || '') }; }));
    }, e => setMessage(e instanceof Error ? e.message : 'NGO list load failed.'));
    return unsubscribe;
  }, []);
  useEffect(() => {
    if (!authUser) { setApps([]); return; }
    const unsubscribe = onSnapshot(query(collection(db, 'memberApplications'), where('applicantUid', '==', authUser.uid)), snapshot => {
      setApps(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Application)));
    }, e => setMessage(e instanceof Error ? e.message : 'Applications could not be loaded.'));
    return unsubscribe;
  }, [authUser]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authUser) { onLogin(); return; }
    if (!selectedNgo) { setMessage(hi ? 'पहले NGO चुनें।' : 'Choose an NGO first.'); return; }
    if (!selectedNgo.adminWhatsApp || cleanWhatsApp(selectedNgo.adminWhatsApp).length < 10) { setMessage(hi ? 'इस NGO ने Admin WhatsApp नंबर सेट नहीं किया है।' : 'This NGO has not configured its admin WhatsApp number.'); return; }
    if (!(selectedNgo.memberFee > 0)) { setMessage(hi ? 'इस NGO ने सदस्य फीस सेट नहीं की है।' : 'This NGO has not set a member fee.'); return; }
    if (!photoData) { setMessage(hi ? 'अपनी फोटो अपलोड करें।' : 'Please upload your photo.'); return; }
    setBusy(true); setMessage('');
    try {
      const ref = await addDoc(collection(db, 'memberApplications'), {
        ngoId: selectedNgo.id, ngoName: selectedNgo.name, applicantUid: authUser.uid,
        applicantEmail: authUser.email || '', name: form.name.trim(), fatherName: form.fatherName.trim(),
        phone: form.phone.trim(), address: form.address.trim(), photoData, feeAmount: selectedNgo.memberFee,
        status: 'PENDING_PAYMENT', createdAt: serverTimestamp()
      });
      const wa = cleanWhatsApp(selectedNgo.adminWhatsApp);
      const text = encodeURIComponent(hi
        ? 'नमस्ते, मैंने All NGO Connect पर सदस्य ID के लिए आवेदन किया है। मेरा आवेदन नंबर: ' + ref.id + '। कृपया फीस भुगतान का तरीका बताएं।'
        : 'Hello, I submitted a Member ID application on All NGO Connect. Application reference: ' + ref.id + '. Please share payment instructions.');
      window.location.href = 'https://wa.me/' + wa + '?text=' + text;
      setMessage(hi ? 'आवेदन जमा हुआ। WhatsApp खुल रहा है। फीस सत्यापन और NGO Admin की मंज़ूरी के बाद ही ID उपलब्ध होगी।' : 'Application submitted. WhatsApp is opening. Your ID will be available only after fee verification and NGO admin approval.');
      setForm({ ngoId: '', name: '', fatherName: '', phone: '', address: '' }); setPhotoData('');
      const snap = await getDocs(query(collection(db, 'memberApplications'), where('applicantUid', '==', authUser.uid)));
      setApps(snap.docs.map(d => ({ id: d.id, ...d.data() } as Application)));
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Application could not be submitted.'); }
    finally { setBusy(false); }
  };
  const card = (a: Application) => <article className="member-id-card" key={a.id}>
    <div className="member-id-band"><span>ALL NGO CONNECT</span><strong>{a.ngoName}</strong></div>
    <div className="member-id-body"><img className="member-id-photo" src={a.photoData} alt={a.name}/><div className="member-id-details"><small>MEMBER ID</small><strong>{a.memberId || 'Pending approval'}</strong><h3>{a.name}</h3><p>{hiText(hi, 'पिता/अभिभावक: ', 'Father/Guardian: ')}{a.fatherName}</p><p>{hiText(hi, 'मोबाइल: ', 'Phone: ')}{a.phone}</p><p>{hiText(hi, 'पता: ', 'Address: ')}{a.address}</p></div></div>
    <div className="member-id-footer"><span>{hiText(hi, 'स्थिति: ', 'Status: ')}{a.status}</span>{a.status === 'APPROVED' && a.memberId && <img className="member-id-qr" alt="Member verification QR" src={'https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=' + encodeURIComponent(window.location.origin + '/member-verify?id=' + encodeURIComponent(a.memberId))}/>}</div>
    {a.status === 'APPROVED' && <button className="primary-button no-print" onClick={() => window.print()}>{hi ? 'ID कार्ड डाउनलोड / प्रिंट' : 'Download / Print ID Card'}</button>}
    {a.status === 'REJECTED' && <p className="member-error">{a.rejectionReason || hiText(hi, 'कृपया NGO Admin से संपर्क करें।', 'Please contact the NGO admin.')}</p>}
  </article>;
  return <main className="member-portal">
    <header className="member-portal-header"><a className="member-brand" href="/">All NGO Connect</a><div><a className="outline-button" href="/ngo-admin">{hi ? 'NGO Admin' : 'NGO Admin'}</a><a className="outline-button" href="/">{hi ? 'होम' : 'Home'}</a>{authUser ? <button className="outline-button" onClick={() => auth && void signOut(auth)}>{hi ? 'लॉगआउट' : 'Sign out'}</button> : <button className="primary-button" onClick={onLogin}>{hi ? 'Google से लॉगिन' : 'Sign in with Google'}</button>}</div></header>
    <section className="member-portal-hero"><span>{hi ? 'डिजिटल सदस्य पहचान' : 'DIGITAL MEMBER ID'}</span><h1>{hi ? 'अपना NGO Member ID Card बनाएँ' : 'Create your NGO Member ID Card'}</h1><p>{hi ? 'फॉर्म भरें, फोटो लगाएँ और फीस के लिए संबंधित NGO Admin से WhatsApp पर संपर्क करें। ID केवल Admin की मंज़ूरी के बाद डाउनलोड होगी।' : 'Fill the form, add your photo, and contact the selected NGO admin on WhatsApp about the fee. The ID can be downloaded only after approval.'}</p></section>
    {!authUser && <div className="member-notice">{hi ? 'आवेदन जमा करने और अपना कार्ड देखने के लिए Google लॉगिन करें।' : 'Sign in with Google to submit an application and view your card.'}</div>}
    <div className="member-portal-grid"><section className="member-form-panel"><h2>{hi ? 'सदस्य आवेदन फॉर्म' : 'Member application form'}</h2><form onSubmit={submit}>
      <label>{hi ? 'NGO चुनें' : 'Select NGO'} *<select required value={form.ngoId} onChange={e => setForm({ ...form, ngoId: e.target.value })}><option value="">{hi ? 'सक्रिय NGO चुनें' : 'Choose an active NGO'}</option>{ngos.map(n => <option value={n.id} key={n.id}>{n.name} {n.memberFee > 0 ? '(₹' + n.memberFee + ')' : ''}</option>)}</select></label>
      {selectedNgo && <div className="member-fee-box"><strong>{hi ? 'सदस्य फीस' : 'Member fee'}: ₹{selectedNgo.memberFee || 'सेट नहीं'}</strong><span>{selectedNgo.adminWhatsApp ? hi ? 'WhatsApp भुगतान संपर्क उपलब्ध है' : 'WhatsApp payment contact is configured' : hi ? 'Admin WhatsApp नंबर सेट नहीं है' : 'Admin WhatsApp is not configured'}</span></div>}
      <label>{hi ? 'पूरा नाम' : 'Full name'} *<input required maxLength={100} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></label>
      <label>{hi ? 'पिता / अभिभावक का नाम' : 'Father / guardian name'} *<input required maxLength={100} value={form.fatherName} onChange={e => setForm({ ...form, fatherName: e.target.value })}/></label>
      <label>{hi ? 'मोबाइल नंबर' : 'Mobile number'} *<input required type="tel" minLength={7} maxLength={20} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/></label>
      <label>{hi ? 'पूरा पता' : 'Full address'} *<textarea required maxLength={300} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}/></label>
      <label>{hi ? 'अपनी फोटो (JPG/PNG/WebP, 350 KB तक)' : 'Your photo (JPG/PNG/WebP, up to 350 KB)'} *<input required type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { const f = e.target.files?.[0]; if (!f) return; if (!f.type.startsWith('image/')) { setMessage(hi ? 'केवल इमेज फ़ाइल चुनें।' : 'Choose an image file.'); return; } if (f.size > 350 * 1024) { setMessage(hi ? 'फोटो 350 KB से छोटी रखें।' : 'Keep photo smaller than 350 KB.'); return; } const r = new FileReader(); r.onload = () => { if (typeof r.result === 'string') setPhotoData(r.result); }; r.readAsDataURL(f); }}/></label>
      {photoData && <img className="member-photo-preview" src={photoData} alt="Photo preview"/>}
      {message && <p className="member-notice" role="status">{message}</p>}
      <button className="primary-button" type="submit" disabled={busy || !authUser}>{busy ? (hi ? 'भेज रहे हैं…' : 'Submitting…') : (hi ? 'आवेदन जमा करें और WhatsApp खोलें' : 'Submit application & open WhatsApp')}</button>
    </form></section><section className="member-applications-panel"><h2>{hi ? 'मेरे आवेदन / ID कार्ड' : 'My applications / ID cards'}</h2>{!authUser ? <p>{hi ? 'लॉगिन के बाद आपके आवेदन यहाँ दिखेंगे।' : 'Your applications appear here after sign-in.'}</p> : apps.length === 0 ? <p>{hi ? 'अभी कोई आवेदन नहीं है।' : 'No applications yet.'}</p> : apps.map(a => <div className="member-application-row" key={a.id}><div><strong>{a.ngoName}</strong><span>{a.name} · {a.status}</span>{a.status === 'PENDING_PAYMENT' && <small>{hi ? 'फीस की पुष्टि और Admin मंज़ूरी बाकी' : 'Fee verification and admin approval pending'}</small>}</div>{a.status === 'APPROVED' ? card(a) : <span className="member-status">{a.status}</span>}</div>)}</section></div>
  </main>;
}

export function NgoAdminPortal({ authUser, language }: { authUser: User; language: Language }) {
  const hi = language === 'hi';
  const [ngos, setNgos] = useState<Ngo[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [applications, setApplications] = useState<Application[]>([]);
  const [fee, setFee] = useState('100');
  const [whatsapp, setWhatsapp] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const ngoQuery = isPlatformAdmin(authUser)
      ? collection(db, 'ngos')
      : query(collection(db, 'ngos'), where('ownerUid', '==', authUser.uid));
    const unsubscribeNgos = onSnapshot(ngoQuery, snapshot => {
      const rows = snapshot.docs.map(d => { const x = d.data(); return { id: d.id, name: String(x.name || x.ngoName || 'NGO'), status: String(x.status || ''), memberFee: Number(x.memberFee || 0), adminWhatsApp: String(x.adminWhatsApp || ''), ownerUid: String(x.ownerUid || ''), logoUrl: String(x.logoUrl || '') }; });
      setNgos(rows);
      setSelectedId(current => current && rows.some(n => n.id === current) ? current : rows[0]?.id || '');
    }, e => setMessage(e instanceof Error ? e.message : 'Could not load NGO admin data.'));
    return unsubscribeNgos;
  }, [authUser.uid]);
  useEffect(() => {
    if (!ngos.length) { setApplications([]); return; }
    const unsubs = ngos.map(ngo => onSnapshot(query(collection(db, 'memberApplications'), where('ngoId', '==', ngo.id)), snapshot => {
      setApplications(current => {
        const others = current.filter(app => app.ngoId !== ngo.id);
        return [...others, ...snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Application))];
      });
    }, e => setMessage(e instanceof Error ? e.message : 'Could not load applications.')));
    return () => unsubs.forEach(unsubscribe => unsubscribe());
  }, [ngos.map(n => n.id).join('|')]);
  useEffect(() => { const n = ngos.find(x => x.id === selectedId); if (n) { setFee(String(n.memberFee || 100)); setWhatsapp(n.adminWhatsApp || ''); } }, [selectedId, ngos]);
  const currentNgo = ngos.find(n => n.id === selectedId);
  const saveProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!currentNgo) return;
    if (!/^\+?[0-9 ()-]{10,20}$/.test(whatsapp.trim()) || cleanWhatsApp(whatsapp).length < 10) { setMessage(hi ? 'वैध WhatsApp नंबर डालें, देश कोड सहित।' : 'Enter a valid WhatsApp number with country code.'); return; }
    const amount = Number(fee); if (!Number.isFinite(amount) || amount < 1 || amount > 100000) { setMessage(hi ? 'फीस ₹1 से ₹1,00,000 के बीच रखें।' : 'Fee must be between ₹1 and ₹100,000.'); return; }
    setBusy(true); setMessage('');
    try { await updateDoc(doc(db, 'ngos', currentNgo.id), { memberFee: amount, adminWhatsApp: cleanWhatsApp(whatsapp), updatedAt: serverTimestamp() }); setMessage(hi ? 'फीस और WhatsApp नंबर सेव हो गए।' : 'Fee and WhatsApp number saved.'); await load(); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Could not save settings. Check Firestore rules.'); }
    finally { setBusy(false); }
  };
  const review = async (a: Application, status: 'APPROVED' | 'REJECTED') => {
    if (status === 'APPROVED' && !window.confirm(hi ? 'क्या आपने सदस्य की जानकारी और फीस प्राप्त होने की पुष्टि कर ली है? मंज़ूरी के बाद ID डाउनलोड हो सकेगी।' : 'Have you verified the member details and received the fee? The ID will become downloadable after approval.')) return;
    setBusy(true); setMessage('');
    try {
      const memberId = status === 'APPROVED' ? (a.memberId || makeMemberId()) : (a.memberId || '');
      const batch = writeBatch(db);
      if (status === 'APPROVED') {
        batch.set(doc(db, 'memberVerifications', memberId), {
          memberId, name: a.name, ngoId: a.ngoId, ngoName: a.ngoName,
          applicationId: a.id, status: 'APPROVED', approvedAt: serverTimestamp()
        });
      }
      batch.update(doc(db, 'memberApplications', a.id), {
        status,
        ...(status === 'APPROVED' ? { memberId } : { rejectionReason: hi ? 'NGO Admin ने आवेदन स्वीकार नहीं किया।' : 'The NGO admin did not approve this application.' }),
        reviewedAt: serverTimestamp(), reviewedBy: authUser.uid
      });
      await batch.commit();
      setApplications(current => current.map(x => x.id === a.id ? { ...x, status, memberId: status === 'APPROVED' ? memberId : x.memberId } : x));
      setMessage(status === 'APPROVED' ? (hi ? 'Member ID मंज़ूर हो गई।' : 'Member ID approved.') : (hi ? 'आवेदन अस्वीकार किया गया।' : 'Application rejected.'));
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Review failed. Check Firestore rules.'); }
    finally { setBusy(false); }
  };
  return <main className="member-portal"><header className="member-portal-header"><a className="member-brand" href="/">All NGO Connect</a><div><a className="outline-button" href="/ngo-workspace">{hi ? 'NGO डैशबोर्ड' : 'NGO Workspace'}</a><a className="outline-button" href="/members">{hi ? 'सदस्य पोर्टल' : 'Member portal'}</a><button className="outline-button" onClick={() => auth && void signOut(auth)}>{hi ? 'लॉगआउट' : 'Sign out'}</button></div></header>
    <section className="member-portal-hero"><span>{isPlatformAdmin(authUser) ? 'SUPER ADMIN · ALL NGOS' : 'NGO ADMIN'}</span><h1>{hi ? 'सदस्य आवेदन और फीस' : 'Member applications & fees'}</h1><p>{hi ? 'अपने NGO की फीस और WhatsApp नंबर सेट करें। फीस और जानकारी की पुष्टि के बाद ही सदस्य ID मंज़ूर करें।' : 'Set your NGO fee and WhatsApp number. Approve an ID only after verifying the fee and member details.'}</p></section>
    {ngos.length === 0 ? <div className="member-notice">{hi ? 'इस लॉगिन से जुड़ा NGO नहीं मिला। NGO के owner email से लॉगिन करें।' : 'No NGO is linked to this login. Sign in with the NGO owner account.'}</div> : <>
      <section className="member-form-panel member-admin-settings"><h2>{hi ? 'NGO फीस और WhatsApp सेटिंग' : 'NGO fee and WhatsApp settings'}</h2><form onSubmit={saveProfile}><label>{hi ? 'अपना NGO' : 'Your NGO'}<select value={selectedId} onChange={e => setSelectedId(e.target.value)}>{ngos.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}</select></label><label>{hi ? 'Member ID फीस (₹)' : 'Member ID fee (₹)'}<input required type="number" min="1" max="100000" value={fee} onChange={e => setFee(e.target.value)}/></label><label>{hi ? 'WhatsApp नंबर देश कोड सहित' : 'WhatsApp number with country code'}<input required value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="919876543210"/></label><button className="primary-button" type="submit" disabled={busy}>{hi ? 'सेटिंग सेव करें' : 'Save settings'}</button></form></section>
      <section className="member-applications-panel"><h2>{hi ? 'सदस्य आवेदन' : 'Member applications'}</h2>{applications.filter(a => a.ngoId === selectedId).length === 0 ? <p>{hi ? 'अभी आवेदन नहीं हैं।' : 'No applications yet.'}</p> : applications.filter(a => a.ngoId === selectedId).map(a => <article className="member-review-card" key={a.id}><img src={a.photoData} alt={a.name}/><div className="member-review-info"><h3>{a.name}</h3><p>{hi ? 'पिता/अभिभावक: ' : 'Father/guardian: '}{a.fatherName}</p><p>{a.phone} · {a.address}</p><p>{a.ngoName} · ₹{a.feeAmount} · <strong>{a.status}</strong></p><small>Ref: {a.id}</small>{a.status === 'PENDING_PAYMENT' && <div className="member-review-actions"><button className="primary-button" disabled={busy} onClick={() => void review(a, 'APPROVED')}>{hi ? 'फीस जाँचकर Approve' : 'Verify fee & approve'}</button><button className="outline-button" disabled={busy} onClick={() => void review(a, 'REJECTED')}>{hi ? 'Reject' : 'Reject'}</button></div>}</div></article>)}</section>
    </>}
    {message && <p className="member-notice" role="status">{message}</p>}
  </main>;
}

export function MemberVerifyPage() {
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { const id = new URLSearchParams(window.location.search).get('id'); if (!id) { setLoading(false); return; } getDoc(doc(db, 'memberVerifications', id)).then(s => { if (s.exists()) setRecord(s.data()); }).catch(() => setRecord(null)).finally(() => setLoading(false)); }, []);
  return <main className="member-portal"><section className="member-portal-hero"><span>ALL NGO CONNECT · ID VERIFICATION</span><h1>{loading ? 'Checking member ID…' : record && record.status === 'APPROVED' ? 'Valid Member ID' : 'Member ID not verified'}</h1>{record && record.status === 'APPROVED' && <p>{String(record.name || '')} · {String(record.ngoName || '')} · {String(record.memberId || '')}</p>}<a className="outline-button" href="/members">All NGO Connect</a></section></main>;
}
