import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { GoogleAuthProvider, getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, type User } from 'firebase/auth';
import { ArrowLeft, ArrowUpRight, BadgeCheck, Bell, Building2, CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, ClipboardList, FileBadge, FileText, Globe2, HandCoins, HeartHandshake, ImagePlus, LayoutDashboard, Leaf, LogOut, MapPin, Menu, Plus, Search, ShieldCheck, Trash2, Users, Wallet, X } from 'lucide-react';
import { auth, db, firebaseConfigured } from './firebase';
import { MemberIDPortal, MemberVerifyPage, NgoAdminPortal } from './MemberIDPortal';
import { NgoWorkspacePortal } from './NgoWorkspace';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query as firestoreQuery, serverTimestamp, setDoc, where, runTransaction, Timestamp, updateDoc } from 'firebase/firestore';

const SUPER_ADMIN_EMAILS = ['ngogrant454@gmail.com', 'zaradigitalseva@gmail.com'];
const isSuperAdmin = (user: User | null) => Boolean(user?.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase()));

type Language = 'en' | 'hi';
type Section = 'overview' | 'ngos' | 'members' | 'finance' | 'events' | 'documents' | 'subscriptions';
const copy = {
  en: { tagline: 'Stronger communities. Better impact.', overview: 'Overview', ngos: 'NGO Directory', members: 'Members & Volunteers', finance: 'Donations & Expenses', events: 'Programs & Events', documents: 'Reports & Certificates', subscriptions: 'Subscriptions', welcome: 'Good morning 👋', intro: 'Here is what is happening across your NGO workspace.', totalDonations: 'Total donations', expenses: 'Total expenses', membersCount: 'Members & volunteers', programs: 'Programs this month', recent: 'Recent activity', quick: 'Quick actions', register: 'Register an NGO', addMember: 'Add a member', recordDonation: 'Record donation', createEvent: 'Create an event', directory: 'NGO directory', viewAll: 'View all', active: 'Active', pending: 'Pending review', draft: 'Draft', month: 'This month', activityTitle: 'Your impact at a glance', activityText: 'Keep your team, community and finances in one place.', registerTitle: 'Register your NGO', orgName: 'NGO / organization name', contactName: 'Contact person', email: 'Email address', phone: 'Phone number', state: 'State', mission: 'Short mission / purpose', submit: 'Submit registration', cancel: 'Cancel', registrationNote: 'New registrations are reviewed after subscription payment is submitted. Approval is manual.', saved: 'Registration saved in this demo. Connect Firebase to enable secure saving.', language: 'Language', dashboard: 'Dashboard', platform: 'Platform workspace', setup: 'Firebase setup needed', setupText: 'Firebase is not configured. Set the All NGO Connect environment variables before using real records.', seeSetup: 'View setup guide', subscriptionNote: 'UPI payment verification and activation are manual and must be implemented before launch.', noData: 'No live records yet', demo: 'Live Firebase data', search: 'Search NGOs, members…', all: 'All activity', registered: 'Registered', volunteers: 'Volunteers', donatedBy: 'Community contributions', expenseBy: 'Program spending', event1: 'Community health camp', event2: 'Youth skills workshop', event3: 'Winter relief distribution', status: 'Status', plan: 'Plan', amount: 'Amount', due: 'Next renewal', footer: 'Built for grassroots organizations' },
  hi: { tagline: 'मजबूत समुदाय। बेहतर बदलाव।', overview: 'डैशबोर्ड', ngos: 'NGO सूची', members: 'सदस्य और स्वयंसेवक', finance: 'दान और खर्च', events: 'कार्यक्रम और इवेंट', documents: 'रिपोर्ट और प्रमाणपत्र', subscriptions: 'सब्सक्रिप्शन', welcome: 'सुप्रभात 👋', intro: 'आपके NGO कार्यक्षेत्र की ताज़ा जानकारी यहाँ है।', totalDonations: 'कुल दान', expenses: 'कुल खर्च', membersCount: 'सदस्य और स्वयंसेवक', programs: 'इस महीने के कार्यक्रम', recent: 'हाल की गतिविधियाँ', quick: 'जल्दी करें', register: 'NGO रजिस्टर करें', addMember: 'सदस्य जोड़ें', recordDonation: 'दान दर्ज करें', createEvent: 'कार्यक्रम बनाएँ', directory: 'NGO सूची', viewAll: 'सभी देखें', active: 'सक्रिय', pending: 'जाँच बाकी', draft: 'ड्राफ्ट', month: 'इस महीने', activityTitle: 'आपके काम की एक झलक', activityText: 'टीम, समुदाय और हिसाब-किताब एक जगह रखें।', registerTitle: 'अपना NGO रजिस्टर करें', orgName: 'NGO / संस्था का नाम', contactName: 'संपर्क व्यक्ति', email: 'ईमेल पता', phone: 'मोबाइल नंबर', state: 'राज्य', mission: 'संस्था का उद्देश्य', submit: 'रजिस्ट्रेशन भेजें', cancel: 'रद्द करें', registrationNote: 'सब्सक्रिप्शन भुगतान भेजने के बाद नए रजिस्ट्रेशन की मैनुअल जाँच होगी।', saved: 'डेमो में रजिस्ट्रेशन दर्ज हुआ। सुरक्षित सेविंग के लिए Firebase जोड़ें।', language: 'भाषा', dashboard: 'डैशबोर्ड', platform: 'प्लेटफ़ॉर्म कार्यक्षेत्र', setup: 'Firebase सेटअप बाकी', setupText: 'Firebase सेटअप उपलब्ध नहीं है। असली रिकॉर्ड के लिए All NGO Connect के environment variables जाँचें।', seeSetup: 'सेटअप गाइड देखें', subscriptionNote: 'UPI भुगतान की जाँच और NGO सक्रिय करना मैनुअल होगा; लॉन्च से पहले इसे बनाना ज़रूरी है।', noData: 'अभी लाइव रिकॉर्ड नहीं हैं', demo: 'लाइव Firebase डेटा', search: 'NGO, सदस्य खोजें…', all: 'सभी गतिविधियाँ', registered: 'रजिस्टर', volunteers: 'स्वयंसेवक', donatedBy: 'समुदाय का योगदान', expenseBy: 'कार्यक्रम पर खर्च', event1: 'सामुदायिक स्वास्थ्य शिविर', event2: 'युवाओं के कौशल की कार्यशाला', event3: 'सर्दियों में राहत वितरण', status: 'स्थिति', plan: 'प्लान', amount: 'राशि', due: 'अगला नवीनीकरण', footer: 'जमीनी स्तर पर काम करने वाली संस्थाओं के लिए' }
};
const nav = [
  { id: 'overview' as const, icon: LayoutDashboard, key: 'overview' as const }, { id: 'ngos' as const, icon: HeartHandshake, key: 'ngos' as const },
  { id: 'members' as const, icon: Users, key: 'members' as const }, { id: 'finance' as const, icon: Wallet, key: 'finance' as const },
  { id: 'events' as const, icon: CalendarDays, key: 'events' as const }, { id: 'documents' as const, icon: FileText, key: 'documents' as const },
  { id: 'subscriptions' as const, icon: BadgeCheck, key: 'subscriptions' as const }
];
type DashboardNgo = { id: string; name: string; type: string; city: string; status: string; ownerUid: string; people: number; imageData?: string; mission?: string; state?: string };
type DashboardRecord = Record<string, any> & { id: string };
type SubscriptionPlan = { id: string; name: string; price: number; durationDays: number; description: string; active: boolean };
type DashboardSlide = { id: string; title: string; imageData: string; createdAt?: unknown };

function compressDashboardImage(file: File, maxOutputLength = 300000): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) { reject(new Error('कृपया इमेज फ़ाइल चुनें।')); return; }
    if (file.size > 20 * 1024 * 1024) { reject(new Error('मूल इमेज 20 MB से छोटी होनी चाहिए।')); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('इमेज पढ़ी नहीं जा सकी।'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('इमेज फ़ाइल खुल नहीं सकी।'));
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 1000;
        const maxHeight = 560;
        const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
        let width = Math.max(1, Math.round(image.naturalWidth * scale));
        let height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d');
        if (!context) { reject(new Error('इमेज प्रोसेस नहीं हो सकी।')); return; }
        let result = '';
        // Resize and compress until the stored data is small enough for Firestore.
        for (let attempt = 0; attempt < 8; attempt++) {
          canvas.width = width;
          canvas.height = height;
          context.clearRect(0, 0, width, height);
          context.drawImage(image, 0, 0, width, height);
          const quality = [0.72, 0.64, 0.56, 0.48, 0.42, 0.38, 0.34, 0.3][attempt];
          result = canvas.toDataURL('image/jpeg', quality);
          if (result.length <= maxOutputLength) break;
          width = Math.max(320, Math.round(width * 0.82));
          height = Math.max(180, Math.round(height * 0.82));
        }
        if (!result || result.length > Math.round(maxOutputLength * 1.4)) {
          reject(new Error('इमेज छोटी नहीं हो पाई। कृपया दूसरी या कम साइज़ की इमेज चुनें।'));
          return;
        }
        resolve(result);
      };
      image.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}


const INDIA_STATES_AND_UTS = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'
] as const;

type PublicHomeProps = {
  language: Language;
  setLanguage: (language: Language) => void;
  authUser: User | null;
  onLogin: () => void;
  onLogout: () => void;
  authError: string;
};
function PublicNgoSite({ language, setLanguage, ngoId, authUser, onLogin }: { language: Language; setLanguage: (language: Language) => void; ngoId: string; authUser: User | null; onLogin: () => void }) {
  const hi = language === 'hi';
  const [ngo, setNgo] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [team, setTeam] = useState<Record<string, any>[]>([]);
  const [publicEvents, setPublicEvents] = useState<Record<string, any>[]>([]);
  const [publicDocuments, setPublicDocuments] = useState<Record<string, any>[]>([]);
  const [publicFinance, setPublicFinance] = useState<Record<string, any>[]>([]);
  useEffect(() => {
    let active = true;
    const unsubscribeTeam = onSnapshot(firestoreQuery(collection(db, 'ngoMembers'), where('ngoId', '==', ngoId), where('approvalStatus', '==', 'APPROVED')), snapshot => {
      if (!active) return;
      setTeam(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Record<string, any>)).filter(person => person.approvalStatus === 'APPROVED' && String(person.status || 'ACTIVE').toUpperCase() === 'ACTIVE').sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))));
    }, () => { if (active) setTeam([]); });
    const unsubscribeEvents = onSnapshot(firestoreQuery(collection(db, 'ngoEvents'), where('ngoId', '==', ngoId), where('approvalStatus', '==', 'APPROVED')), snapshot => setPublicEvents(snapshot.docs.map(d => ({id:d.id,...d.data()} as Record<string, any>)).filter(row => row.approvalStatus === 'APPROVED').sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')))), () => setPublicEvents([]));
    const unsubscribeDocuments = onSnapshot(firestoreQuery(collection(db, 'ngoDocuments'), where('ngoId', '==', ngoId), where('approvalStatus', '==', 'APPROVED')), snapshot => setPublicDocuments(snapshot.docs.map(d => ({id:d.id,...d.data()} as Record<string, any>)).filter(row => row.approvalStatus === 'APPROVED')), () => setPublicDocuments([]));
    const unsubscribeFinance = onSnapshot(firestoreQuery(collection(db, 'ngoTransactions'), where('ngoId', '==', ngoId), where('approvalStatus', '==', 'APPROVED')), snapshot => setPublicFinance(snapshot.docs.map(d => ({id:d.id,...d.data()} as Record<string, any>)).filter(row => row.approvalStatus === 'APPROVED').sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))), () => setPublicFinance([]));
    const unsubscribeNgo = onSnapshot(doc(db, 'ngos', ngoId), snapshot => {
      if (!active) return;
      if (!snapshot.exists() || !['LIVE', 'ACTIVE', 'APPROVED'].includes(String(snapshot.data().status || '').toUpperCase())) { setFailed(true); setNgo(null); }
      else { setFailed(false); setNgo({ id: snapshot.id, ...snapshot.data() }); }
      setLoading(false);
    }, () => { if (active) { setFailed(true); setLoading(false); } });
    return () => { active = false; unsubscribeTeam(); unsubscribeEvents(); unsubscribeDocuments(); unsubscribeFinance(); unsubscribeNgo(); };
  }, [ngoId]);
  const name = String(ngo?.name || ngo?.ngoName || 'NGO');
  const logo = String(ngo?.imageData || ngo?.registrationFormData?.imageData || '');
  const location = [ngo?.city, ngo?.district, ngo?.state].filter((v, i, a) => typeof v === 'string' && v.trim() && a.indexOf(v) === i).join(', ');
  const mission = String(ngo?.mission || ngo?.description || '');
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [memberBusy, setMemberBusy] = useState(false);
  const [memberMessage, setMemberMessage] = useState('');
  const [memberPhoto, setMemberPhoto] = useState('');
  const [memberForm, setMemberForm] = useState({ name: '', fatherName: '', phone: '', address: '' });
  const submitMemberRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authUser) { setMemberMessage(hi ? 'आवेदन देने के लिए पहले Google से लॉगिन करें।' : 'Please sign in with Google before applying.'); onLogin(); return; }
    if (!firebaseConfigured) { setMemberMessage(hi ? 'Firebase सेटअप उपलब्ध नहीं है।' : 'Firebase is not configured.'); return; }
    if (!memberPhoto) { setMemberMessage(hi ? 'कृपया अपनी फोटो चुनें।' : 'Please choose your photo.'); return; }
    const adminWhatsApp = String(ngo?.adminWhatsApp || '').replace(/\D/g, '');
    const fee = Number(ngo?.memberFee || 0);
    if (!/^\d{10,15}$/.test(adminWhatsApp)) { setMemberMessage(hi ? 'इस NGO Admin ने सही WhatsApp नंबर सेट नहीं किया है।' : 'This NGO admin has not configured a valid WhatsApp number.'); return; }
    const applicantPhone = memberForm.phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
    const adminPhone = adminWhatsApp.replace(/^91(?=\d{10}$)/, '');
    if (applicantPhone.length < 10 || applicantPhone.length > 15) { setMemberMessage(hi ? 'अपना सही मोबाइल नंबर डालें।' : 'Enter your own valid mobile number.'); return; }
    if (applicantPhone === adminPhone) { setMemberMessage(hi ? 'आपने NGO Admin का नंबर डाला है। कृपया सदस्य का अपना मोबाइल नंबर डालें।' : 'That is the NGO admin number. Please enter the member’s own mobile number.'); return; }
    if (!Number.isFinite(fee) || fee < 1) { setMemberMessage(hi ? 'इस NGO ने सदस्यता फीस सेट नहीं की है।' : 'This NGO has not set a membership fee.'); return; }
    setMemberBusy(true); setMemberMessage('');
    try {
      const ref = await addDoc(collection(db, 'memberApplications'), {
        ngoId, ngoName: name, applicantUid: authUser.uid, applicantEmail: authUser.email || '',
        name: memberForm.name.trim(), fatherName: memberForm.fatherName.trim(),
        phone: memberForm.phone.trim(), address: memberForm.address.trim(), photoData: memberPhoto,
        feeAmount: fee, status: 'PENDING_PAYMENT', createdAt: serverTimestamp()
      });
      const message = (hi ? 'नया सदस्य आवेदन आया है।\nNGO: ' : 'New membership application received.\nNGO: ') + name +
        '\n' + (hi ? 'नाम: ' : 'Name: ') + memberForm.name.trim() +
        '\n' + (hi ? 'पिता/अभिभावक: ' : 'Father/guardian: ') + memberForm.fatherName.trim() +
        '\n' + (hi ? 'मोबाइल: ' : 'Mobile: ') + memberForm.phone.trim() +
        '\n' + (hi ? 'पता: ' : 'Address: ') + memberForm.address.trim() +
        '\n' + (hi ? 'सदस्यता फीस: ₹' : 'Membership fee: ₹') + fee +
        '\n' + (hi ? 'आवेदन नंबर: ' : 'Application ID: ') + ref.id +
        '\n' + (hi ? 'भुगतान प्राप्त होने पर NGO Admin पोर्टल में फीस जाँचकर Approve करें।' : 'After receiving payment, verify the fee and approve in the NGO Admin portal.');
      setMemberMessage(hi ? 'आवेदन जमा हो गया। WhatsApp खुलेगा; संदेश भेजने के लिए WhatsApp में Send दबाएँ। फीस मिलने के बाद NGO Admin मंज़ूर करेगा।' : 'Application submitted. WhatsApp will open; press Send in WhatsApp to deliver the message. The NGO admin will approve after receiving the fee.');
      window.location.href = 'https://wa.me/' + adminWhatsApp + '?text=' + encodeURIComponent(message);
      setMemberForm({ name: '', fatherName: '', phone: '', address: '' }); setMemberPhoto('');
    } catch (error) {
      setMemberMessage(error instanceof Error ? error.message : (hi ? 'आवेदन सेव नहीं हुआ। Firebase Rules जाँचें।' : 'Could not save the application. Check Firebase rules.'));
    } finally { setMemberBusy(false); }
  };
  return <div className="public-site ngo-directory-site" style={{ minHeight: '100vh', background: 'linear-gradient(145deg,#eef2ff 0%,#fdf2f8 48%,#ecfeff 100%)' }}>
    <header className="public-header" style={{ backgroundImage: "linear-gradient(90deg, rgba(255,255,255,.90), rgba(255,255,255,.60)), url(https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=2000&q=85)", backgroundPosition: "center", backgroundSize: "cover", backgroundRepeat: "no-repeat" }}><a className="public-brand" href="/" aria-label="All NGO Connect home"><span className="brand-mark"><Leaf size={23}/></span><span className="brand-name-stack"><span className="brand-name-banner"><span>All NGO</span><span>Connect</span></span><small>{hi ? 'मजबूत समुदाय। बेहतर बदलाव।' : 'Stronger communities. Better impact.'}</small></span></a><div className="public-actions"><button className="language-button" onClick={() => setLanguage(hi ? 'en' : 'hi')}>{hi ? 'English' : 'हिन्दी'}</button><a className="outline-button" href="/ngo-list">{hi ? 'सभी NGO' : 'All NGOs'}</a><a className="primary-button" href="/">{hi ? 'मुख्य पेज' : 'Home'} <ArrowUpRight size={17}/></a></div></header>
    <main className="ngo-directory-main" style={{ maxWidth: 1050 }}><a className="directory-back-link" href="/ngo-list"><ArrowLeft size={17}/>{hi ? 'सभी NGO की सूची पर वापस जाएँ' : 'Back to all NGOs'}</a>
      {loading ? <div className="ngo-directory-empty"><span className="directory-loader"/><p>{hi ? 'NGO की साइट खुल रही है…' : 'Opening NGO website…'}</p></div> : failed || !ngo ? <div className="ngo-directory-empty"><Building2 size={34}/><strong>{hi ? 'यह NGO साइट उपलब्ध नहीं है' : 'This NGO site is unavailable'}</strong><p>{hi ? 'संभव है NGO अभी सक्रिय न हो।' : 'This NGO may not be active yet.'}</p><a className="primary-button" href="/ngo-list">{hi ? 'NGO सूची देखें' : 'Browse NGOs'}</a></div> : <>
        <section className="public-ngo-profile-banner" style={{ overflow: 'hidden', borderRadius: 24, background: 'linear-gradient(135deg,#ffffff 0%,#f0fdfa 55%,#eff6ff 100%)', color: '#173b32', padding: 'clamp(20px,4vw,40px)', boxShadow: '0 14px 36px rgba(15,23,42,.08)', border: '1px solid #dcefe9', position: 'relative' }}>
          <div style={{ position: 'absolute', width: 240, height: 240, borderRadius: '50%', background: 'rgba(13,148,136,.07)', right: -50, top: -80 }}/><div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 24 }}>
            {logo ? <img src={logo} alt={name + ' logo'} style={{ width: 'clamp(110px,20vw,180px)', height: 'clamp(110px,20vw,180px)', objectFit: 'contain', background: '#fff', borderRadius: 26, padding: 10, boxShadow: '0 12px 30px rgba(0,0,0,.2)' }}/> : <div style={{ width: 140, height: 140, display: 'grid', placeItems: 'center', borderRadius: 26, background: 'rgba(255,255,255,.2)', fontSize: 42, fontWeight: 900 }}>{name.slice(0,2).toUpperCase()}</div>}
            <div style={{ flex: '1 1 280px' }}><span style={{ display: 'inline-flex', padding: '5px 9px', borderRadius: 999, background: '#d1fae5', color: '#047857', fontWeight: 800, fontSize: 12, letterSpacing: 1 }}>✦ {hi ? 'सक्रिय सामाजिक संस्था' : 'ACTIVE ORGANIZATION'}</span><h1 style={{ fontSize: 'clamp(30px,5vw,52px)', lineHeight: 1.1, margin: '16px 0 10px', fontWeight: 900 }}>{name}</h1>{location && <p style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, opacity: .95 }}><MapPin size={18}/>{location}</p>}{(ngo.type || ngo.category) && <p style={{ marginTop: 10, opacity: .9 }}>{String(ngo.type || ngo.category)}</p>}<button type="button" className="ngo-join-3d-button" onClick={() => { setMemberMessage(''); setMemberModalOpen(true); }}><Users size={19}/>{hi ? 'सदस्य बनें' : 'Become a Member'} <ArrowUpRight size={17}/></button></div>
          </div>
        </section>
        {memberModalOpen && <div className="modal-backdrop ngo-member-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !memberBusy) setMemberModalOpen(false); }}><section className="registration-modal ngo-member-modal" role="dialog" aria-modal="true" aria-labelledby="ngo-member-form-title"><div className="modal-heading"><div><span className="modal-eyebrow">{name}</span><h2 id="ngo-member-form-title">{hi ? 'सदस्य बनने का फॉर्म' : 'Membership form'}</h2><p>{hi ? 'जानकारी भरें और आवेदन जमा करें।' : 'Enter your details and submit your membership request.'}</p></div><button className="icon-button" type="button" onClick={() => setMemberModalOpen(false)} aria-label={hi ? 'बंद करें' : 'Close'}><X size={20}/></button></div><form onSubmit={submitMemberRequest}><label>{hi ? 'पूरा नाम' : 'Full name'} *<input required maxLength={100} autoComplete="name" value={memberForm.name} onChange={e => setMemberForm({...memberForm,name:e.target.value})}/></label><label>{hi ? 'पिता / अभिभावक का नाम' : 'Father / guardian name'} *<input required maxLength={100} value={memberForm.fatherName} onChange={e => setMemberForm({...memberForm,fatherName:e.target.value})}/></label><label>{hi ? 'सदस्य का अपना मोबाइल नंबर (Admin का नहीं)' : 'Member’s own mobile number (not the admin number)'} *<input required type="tel" minLength={7} maxLength={20} autoComplete="tel" value={memberForm.phone} onChange={e => setMemberForm({...memberForm,phone:e.target.value})}/></label><label>{hi ? 'पूरा पता' : 'Full address'} *<textarea required maxLength={300} rows={3} value={memberForm.address} onChange={e => setMemberForm({...memberForm,address:e.target.value})}/></label><label>{hi ? 'अपनी फोटो चुनें (JPG/PNG/WebP, अधिकतम 5 MB)' : 'Your photo (JPG/PNG/WebP, max 5 MB)'} *<input required type="file" accept="image/jpeg,image/png,image/webp" onChange={async e => { const file=e.currentTarget.files?.[0]; if(!file) return; if(file.size>5*1024*1024){setMemberMessage(hi?'फोटो 5 MB से कम होनी चाहिए।':'Photo must be under 5 MB.');e.currentTarget.value='';return;} try { const data=await compressDashboardImage(file,180000); setMemberPhoto(data); setMemberMessage(''); } catch(err){setMemberMessage(err instanceof Error?err.message:(hi?'फोटो पढ़ी नहीं गई।':'Could not read photo.'));} }}/></label>{memberPhoto && <img src={memberPhoto} alt={hi?'फोटो प्रीव्यू':'Photo preview'} style={{ width:100,height:100,objectFit:'cover',borderRadius:16,border:'2px solid #a7f3d0' }}/>}<p className="ngo-aadhaar-privacy">{hi ? 'आवेदन निजी रहेगा। NGO Admin WhatsApp पर जानकारी देखकर भुगतान लेगा और फिर सदस्य ID मंज़ूर करेगा।' : 'Your application stays private. The NGO admin will review it, collect payment over WhatsApp, and approve your member ID.'}</p>{memberMessage && <p className="member-notice" role="status">{memberMessage}</p>}<button className="primary-button" type="submit" disabled={memberBusy || !firebaseConfigured}>{memberBusy ? (hi?'सेव हो रहा है…':'Saving…') : (hi?'आवेदन जमा करें और WhatsApp खोलें':'Submit application & open WhatsApp')}</button>{!authUser && <p>{hi ? 'आवेदन देने के लिए Google लॉगिन आवश्यक है।' : 'Google sign-in is required to apply.'}</p>}</form></section></div>}
        <section style={{ marginTop: 24, padding: 'clamp(22px,4vw,38px)', background: '#fff', borderRadius: 24, boxShadow: '0 14px 35px rgba(15,23,42,.08)', border: '1px solid rgba(99,102,241,.12)' }}><span className="public-kicker"><HeartHandshake size={15}/>{hi ? 'हमारे बारे में' : 'ABOUT US'}</span><h2 style={{ color: '#312e81', fontSize: 'clamp(24px,3vw,34px)', margin: '12px 0' }}>{hi ? 'हमारा उद्देश्य' : 'Our mission'}</h2><p style={{ fontSize: 17, lineHeight: 1.9, color: '#475569', whiteSpace: 'pre-wrap' }}>{mission || (hi ? 'यह संस्था समुदाय की सहायता और सामाजिक बदलाव के लिए काम करती है।' : 'This organization works to support its community and create positive social impact.')}</p></section>
        <section style={{ marginTop: 22, padding: 'clamp(22px,4vw,34px)', background: '#fff', borderRadius: 24, boxShadow: '0 14px 35px rgba(15,23,42,.08)', border: '1px solid rgba(16,185,129,.18)' }}>
          <span className="public-kicker"><Users size={15}/>{hi ? 'हमारी टीम' : 'OUR TEAM'}</span>
          <h2 style={{ color: '#065f46', fontSize: 'clamp(24px,3vw,34px)', margin: '12px 0 8px' }}>{hi ? 'इस NGO में काम करने वाले लोग' : 'People working with this NGO'}</h2>
          <p style={{ color: '#64748b', marginTop: 0 }}>{hi ? 'टीम के सदस्य, उनका पद और कार्यक्षेत्र।' : 'Meet the team, their roles and the areas they serve.'}</p>
          {team.length ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,230px),1fr))', gap: 16, marginTop: 20 }}>
            {team.map(person => {
              const canManageTeam = Boolean(authUser && ngo && (authUser.uid === ngo.ownerUid || isSuperAdmin(authUser)));
              const editTeamMember = async () => {
                const nextName = window.prompt(hi ? 'सदस्य का नाम बदलें:' : 'Edit member name:', String(person.name || ''));
                if (nextName === null) return;
                const nextDesignation = window.prompt(hi ? 'पद बदलें:' : 'Edit designation:', String(person.designation || person.position || 'सदस्य'));
                if (nextDesignation === null) return;
                const nextLocation = window.prompt(hi ? 'कार्य क्षेत्र / स्थान बदलें:' : 'Edit work area / location:', String(person.location || person.workArea || ''));
                if (nextLocation === null) return;
                if (!nextName.trim()) { window.alert(hi ? 'नाम खाली नहीं हो सकता।' : 'Name cannot be empty.'); return; }
                try {
                  await updateDoc(doc(db, 'ngoMembers', person.id), {
                    name: nextName.trim(), designation: nextDesignation.trim(),
                    location: nextLocation.trim(), updatedAt: serverTimestamp()
                  });
                  window.alert(hi ? 'टीम सदस्य की जानकारी अपडेट हो गई।' : 'Team member updated.');
                } catch (error) {
                  window.alert(error instanceof Error ? error.message : (hi ? 'अपडेट नहीं हुआ। अनुमति जाँचें।' : 'Update failed. Check permissions.'));
                }
              };
              const deleteTeamMember = async () => {
                if (!window.confirm(hi ? 'क्या इस सदस्य को NGO की सार्वजनिक टीम सूची से हटाना है? यह रिकॉर्ड स्थायी रूप से हट जाएगा।' : 'Remove this member from the public NGO team? This permanently deletes the record.')) return;
                try {
                  await deleteDoc(doc(db, 'ngoMembers', person.id));
                  window.alert(hi ? 'टीम सदस्य हटा दिया गया।' : 'Team member deleted.');
                } catch (error) {
                  window.alert(error instanceof Error ? error.message : (hi ? 'डिलीट नहीं हुआ। अनुमति जाँचें।' : 'Delete failed. Check permissions.'));
                }
              };
              return <article key={person.id} style={{ borderRadius: 18, padding: 18, background: 'linear-gradient(145deg,#ecfdf5,#eff6ff)', border: '1px solid #bbf7d0', boxShadow: '0 8px 20px rgba(16,185,129,.09)' }}>
                <div style={{ width: 54, height: 54, borderRadius: 17, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 20, fontWeight: 900, background: 'linear-gradient(135deg,#059669,#4f46e5)', marginBottom: 12 }}>{person.photoData ? <img src={String(person.photoData)} alt={String(person.name || 'Team member')} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} onError={e => { e.currentTarget.style.display = 'none'; }}/> : String(person.name || 'T').trim().slice(0,1).toUpperCase()}</div>
                <h3 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: 19 }}>{String(person.name || (hi ? 'टीम सदस्य' : 'Team member'))}</h3>
                <p style={{ margin: '0 0 7px', color: '#4338ca', fontWeight: 800 }}>{String(person.designation || person.position || (String(person.role || '').toUpperCase() === 'VOLUNTEER' ? (hi ? 'स्वयंसेवक' : 'Volunteer') : (hi ? 'सदस्य' : 'Member')))}</p>
                {(person.location || person.workArea) && <p style={{ margin: 0, color: '#475569', display: 'flex', alignItems: 'flex-start', gap: 7 }}><MapPin size={16} style={{ flexShrink: 0, marginTop: 3 }}/>{String(person.location || person.workArea)}</p>}
                {canManageTeam && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14, paddingTop: 12, borderTop: '1px solid #d1fae5' }}>
                  <button type="button" onClick={() => void editTeamMember()} style={{ flex: '1 1 90px', border: '1px solid #a5b4fc', borderRadius: 10, padding: '9px 12px', background: '#eef2ff', color: '#3730a3', fontWeight: 800, cursor: 'pointer' }}>✏️ {hi ? 'Edit करें' : 'Edit'}</button>
                  <button type="button" onClick={() => void deleteTeamMember()} style={{ flex: '1 1 90px', border: '1px solid #fecaca', borderRadius: 10, padding: '9px 12px', background: '#fff1f2', color: '#b91c1c', fontWeight: 800, cursor: 'pointer' }}>🗑️ {hi ? 'Delete करें' : 'Delete'}</button>
                </div>}
              </article>;
            })}
          </div> : <div style={{ marginTop: 16, borderRadius: 16, padding: 20, background: '#f8fafc', color: '#64748b', textAlign: 'center' }}>{hi ? 'NGO Admin ने अभी टीम की जानकारी नहीं जोड़ी है।' : 'The NGO admin has not added team information yet.'}</div>}
        </section>
        <section style={{ marginTop: 22, padding: 'clamp(22px,4vw,34px)', background: '#fff', borderRadius: 24, boxShadow: '0 14px 35px rgba(15,23,42,.08)', border: '1px solid #dbeafe' }}>
          <span className="public-kicker"><CalendarDays size={15}/>{hi ? 'कार्यक्रम और इवेंट' : 'EVENTS & ACTIVITIES'}</span><h2 style={{color:'#1d4ed8',fontSize:'clamp(24px,3vw,32px)',margin:'12px 0'}}> {hi ? 'हमारे कार्यक्रम' : 'Our events'}</h2>
          {publicEvents.length ? <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,230px),1fr))',gap:14}}>{publicEvents.map(item=><article key={item.id} style={{padding:16,borderRadius:16,background:'#eff6ff',border:'1px solid #bfdbfe'}}><h3 style={{margin:'0 0 8px'}}>{String(item.title||'')}</h3><p style={{margin:'0 0 6px',color:'#475569'}}>{String(item.date||'')} {item.location ? ' · '+String(item.location):''}</p><p style={{margin:0,color:'#64748b',whiteSpace:'pre-wrap'}}>{String(item.description||'')}</p></article>)}</div> : <p style={{color:'#64748b'}}>{hi ? 'अभी कोई मंज़ूर कार्यक्रम नहीं है।' : 'No approved events yet.'}</p>}
        </section>
        <section style={{ marginTop: 22, padding: 'clamp(22px,4vw,34px)', background: '#fff', borderRadius: 24, boxShadow: '0 14px 35px rgba(15,23,42,.08)', border: '1px solid #ddd6fe' }}>
          <span className="public-kicker"><FileText size={15}/>{hi ? 'रिपोर्ट और दस्तावेज़' : 'REPORTS & DOCUMENTS'}</span><h2 style={{color:'#4338ca',fontSize:'clamp(24px,3vw,32px)',margin:'12px 0'}}>{hi ? 'हमारी रिपोर्ट' : 'Our reports'}</h2>
          {publicDocuments.length ? <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,230px),1fr))',gap:14}}>{publicDocuments.map(item=><article key={item.id} style={{padding:16,borderRadius:16,background:'#f5f3ff',border:'1px solid #ddd6fe'}}><h3 style={{margin:'0 0 8px'}}>{String(item.title||'')}</h3><p style={{color:'#64748b'}}>{String(item.type||'REPORT')} {item.notes ? ' · '+String(item.notes):''}</p>{String(item.url||'').startsWith('https://') && <a href={String(item.url)} target="_blank" rel="noreferrer">{hi ? 'दस्तावेज़ खोलें' : 'Open document'} ↗</a>}</article>)}</div> : <p style={{color:'#64748b'}}>{hi ? 'अभी कोई मंज़ूर रिपोर्ट नहीं है।' : 'No approved reports yet.'}</p>}
        </section>
        <section style={{ marginTop: 22, padding: 'clamp(22px,4vw,34px)', background: '#fff', borderRadius: 24, boxShadow: '0 14px 35px rgba(15,23,42,.08)', border: '1px solid #bbf7d0' }}>
          <span className="public-kicker"><HeartHandshake size={15}/>{hi ? 'मंज़ूर दान और खर्च' : 'APPROVED DONATIONS & EXPENSES'}</span><h2 style={{color:'#047857',fontSize:'clamp(24px,3vw,32px)',margin:'12px 0'}}>{hi ? 'वित्तीय पारदर्शिता' : 'Financial transparency'}</h2>
          {publicFinance.length ? <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:14}}><thead><tr><th style={{textAlign:'left',padding:10}}>{hi?'प्रकार':'Type'}</th><th style={{textAlign:'left',padding:10}}>{hi?'श्रेणी':'Category'}</th><th style={{textAlign:'left',padding:10}}>{hi?'तारीख':'Date'}</th><th style={{textAlign:'right',padding:10}}>{hi?'राशि':'Amount'}</th></tr></thead><tbody>{publicFinance.map(item=><tr key={item.id} style={{borderTop:'1px solid #e2e8f0'}}><td style={{padding:10}}>{String(item.type)==='DONATION'?(hi?'दान':'Donation'):(hi?'खर्च':'Expense')}</td><td style={{padding:10}}>{String(item.category||'')}</td><td style={{padding:10}}>{String(item.date||'')}</td><td style={{padding:10,textAlign:'right',fontWeight:800}}>₹{Number(item.amount||0).toLocaleString('en-IN')}</td></tr>)}</tbody></table></div> : <p style={{color:'#64748b'}}>{hi ? 'अभी कोई मंज़ूर वित्तीय रिकॉर्ड नहीं है।' : 'No approved financial records yet.'}</p>}
        </section>
        <section style={{ marginTop: 22, padding: 24, textAlign: 'center', borderRadius: 24, background: 'linear-gradient(135deg,#fff,#f5f3ff)', border: '1px solid #ddd6fe' }}><h2 style={{ color: '#4338ca', marginTop: 0 }}>{hi ? 'बेहतर बदलाव के लिए साथ आएँ' : 'Join us for better impact'}</h2><p style={{ color: '#64748b' }}>{hi ? 'इस NGO की जानकारी अपने परिवार और समुदाय के साथ साझा करें।' : 'Share this organization with your family and community.'}</p><button className="primary-button" onClick={() => { void navigator.clipboard?.writeText(window.location.href).then(() => window.alert(hi ? 'NGO साइट का लिंक कॉपी हो गया।' : 'NGO website link copied.')).catch(() => window.prompt(hi ? 'इस लिंक को कॉपी करें:' : 'Copy this link:', window.location.href)); }}>{hi ? 'इस NGO साइट का लिंक साझा करें' : 'Share this NGO website'} <ArrowUpRight size={17}/></button></section>
      </>}
      <footer className="ngo-directory-footer">© 2026 All NGO Connect</footer>
    </main>
  </div>;
}

function PublicNgoList({ language, setLanguage }: { language: Language; setLanguage: (language: Language) => void }) {
  const hi = language === 'hi';
  const [ngos, setNgos] = useState<Array<{ id: string; name: string; category: string; location: string; mission: string; imageData: string }>>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    if (!firebaseConfigured) {
      setLoading(false);
      setLoadError(hi ? 'NGO सूची लोड करने के लिए Firebase सेटअप आवश्यक है।' : 'Firebase setup is required to load the NGO directory.');
      return () => { active = false; };
    }
    // Use separate equality queries so Firestore Rules can safely verify each public status.
    const statuses = ['LIVE', 'ACTIVE', 'APPROVED'];
    const snapshotsByStatus = new Map<string, Array<{ id: string; name: string; category: string; location: string; mission: string; imageData: string }>>();
    const received = new Set<string>();
    const unsubscribers = statuses.map(status => onSnapshot(
      firestoreQuery(collection(db, 'ngos'), where('status', '==', status)),
      snapshot => {
        if (!active) return;
        const records = snapshot.docs.map(item => {
          const data = item.data();
          const locationParts = [data.city, data.district, data.state].filter(value => typeof value === 'string' && value.trim()).map(String);
          return {
            id: item.id,
            name: String(data.name || data.ngoName || 'NGO'),
            category: String(data.type || data.category || ''),
            location: locationParts.filter((value, index) => locationParts.indexOf(value) === index).join(', ') || String(data.location || ''),
            mission: String(data.mission || data.description || ''),
            imageData: String(data.imageData || data.registrationFormData?.imageData || '')
          };
        });
        snapshotsByStatus.set(status, records);
        received.add(status);
        const merged = new Map<string, typeof records[number]>();
        snapshotsByStatus.forEach(rows => rows.forEach(row => merged.set(row.id, row)));
        setNgos(Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })));
        setLoading(received.size < statuses.length);
        setLoadError('');
      },
      error => {
        if (!active) return;
        const code = String((error as { code?: string })?.code || 'unknown');
        setLoadError(hi
          ? `NGO सूची लोड नहीं हुई (Firebase: ${code}). Firestore Rules और Firebase प्रोजेक्ट जाँचें।`
          : `Could not load NGO directory (Firebase: ${code}). Check Firestore Rules and Firebase project.`);
        setLoading(false);
      }
    ));
    return () => { active = false; unsubscribers.forEach(unsubscribe => unsubscribe()); };
  }, [hi]);

  const filtered = ngos.filter(ngo => [ngo.name, ngo.category, ngo.location, ngo.mission].join(' ').toLocaleLowerCase().includes(searchText.trim().toLocaleLowerCase()));

  return <div className="public-site ngo-directory-site">
    <header className="public-header" style={{ backgroundImage: "linear-gradient(90deg, rgba(255,255,255,.90), rgba(255,255,255,.60)), url(https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=2000&q=85)", backgroundPosition: "center", backgroundSize: "cover", backgroundRepeat: "no-repeat" }}>
      <a className="public-brand" href="/" aria-label="All NGO Connect home"><span className="brand-mark"><Leaf size={23}/></span><span className="brand-name-stack"><span className="brand-name-banner"><span>All NGO</span><span>Connect</span></span><small>{hi ? 'मजबूत समुदाय। बेहतर बदलाव।' : 'Stronger communities. Better impact.'}</small></span></a>
      <div className="public-actions">
        <button className="language-button" onClick={() => setLanguage(hi ? 'en' : 'hi')}>{hi ? 'English' : 'हिन्दी'}</button>
        <a className="outline-button" href="/">{hi ? 'होम पेज' : 'Home page'}</a>
        <a className="primary-button" href="/?register=1">{hi ? 'NGO रजिस्टर करें' : 'Register NGO'} <ArrowUpRight size={17}/></a>
      </div>
    </header>
    <main className="ngo-directory-main">
      <a className="directory-back-link" href="/"><ArrowLeft size={17}/>{hi ? 'मुख्य पेज पर वापस जाएँ' : 'Back to home'}</a>
      <section className="ngo-directory-heading">
        <span className="public-kicker"><HeartHandshake size={15}/>{hi ? 'ALL NGO CONNECT · सार्वजनिक सूची' : 'ALL NGO CONNECT · PUBLIC DIRECTORY'}</span>
        <h1>{hi ? 'सभी NGO की सूची' : 'All NGOs'}</h1>
        <p>{hi ? 'सक्रिय और स्वीकृत संस्थाओं को नाम, क्षेत्र या स्थान से खोजें।' : 'Find approved organizations by name, category, mission or location.'}</p>
      </section>
      <section className="ngo-directory-panel">
        <div className="ngo-directory-search">
          <Search size={21}/>
          <input value={searchText} onChange={event => setSearchText(event.target.value)} placeholder={hi ? 'NGO का नाम, क्षेत्र या स्थान खोजें…' : 'Search NGO name, category or location…'} aria-label={hi ? 'NGO खोजें' : 'Search NGOs'}/>
          {searchText && <button type="button" onClick={() => setSearchText('')} aria-label={hi ? 'खोज साफ़ करें' : 'Clear search'}><X size={18}/></button>}
        </div>
        <div className="ngo-directory-results"><strong>{loading ? (hi ? 'लोड हो रहा है…' : 'Loading…') : filtered.length}</strong><span>{hi ? 'NGO मिलीं' : 'NGOs found'}</span></div>
        {loading ? <div className="ngo-directory-empty"><span className="directory-loader"/><p>{hi ? 'सभी सक्रिय NGO की सूची लोड हो रही है…' : 'Loading approved NGOs…'}</p></div>
          : loadError ? <div className="ngo-directory-empty" role="alert"><Building2 size={32}/><p>{loadError}</p><button className="outline-button" onClick={() => window.location.reload()}>{hi ? 'फिर कोशिश करें' : 'Try again'}</button></div>
          : filtered.length === 0 ? <div className="ngo-directory-empty"><Search size={32}/><strong>{searchText ? (hi ? 'कोई NGO नहीं मिली' : 'No NGOs found') : (hi ? 'अभी कोई सक्रिय NGO सूचीबद्ध नहीं है' : 'No approved NGOs listed yet')}</strong><p>{searchText ? (hi ? 'दूसरा शब्द खोजें या खोज साफ़ करें।' : 'Try another keyword or clear your search.') : (hi ? 'भुगतान सत्यापन और मंज़ूरी के बाद सक्रिय NGO यहाँ दिखाई देंगी।' : 'Approved and active NGOs will appear here.')}</p>{searchText && <button className="outline-button" onClick={() => setSearchText('')}>{hi ? 'खोज साफ़ करें' : 'Clear search'}</button>}</div>
          : <div className="ngo-directory-grid">{filtered.map((ngo, index) => <article className="ngo-directory-card" key={ngo.id} role="link" tabIndex={0} aria-label={(hi ? 'NGO साइट खोलें: ' : 'Open NGO website: ') + ngo.name} onClick={() => { window.location.href = '/ngo/' + encodeURIComponent(ngo.id); }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); window.location.href = '/ngo/' + encodeURIComponent(ngo.id); } }} style={{ cursor: 'pointer', transformStyle: 'preserve-3d', transition: 'transform .22s ease, box-shadow .22s ease', boxShadow: '0 12px 0 rgba(79,70,229,.10), 0 18px 30px rgba(79,70,229,.16)' }}><div className="ngo-directory-card-top">{ngo.imageData ? <img className="ngo-directory-card-image" src={ngo.imageData} alt={ngo.name + ' NGO'} style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: '14px' }} /> : <span className={`ngo-directory-logo directory-tone-${index % 4}`}>{ngo.name.slice(0, 2).toUpperCase()}</span>}<span className="directory-approved"><i/> {hi ? 'सक्रिय' : 'Active'}</span></div><h2>{ngo.name}</h2>{ngo.category && <span className="ngo-directory-category">{ngo.category}</span>}{ngo.location && <p className="ngo-directory-location"><MapPin size={15}/>{ngo.location}</p>}{ngo.mission && <p className="ngo-directory-mission">{ngo.mission}</p>}</article>)}</div>}
      </section>
      <footer className="ngo-directory-footer">© 2026 All NGO Connect · {hi ? 'बेहतर बदलाव के लिए साथ आएँ।' : 'Together for better impact.'}</footer>
    </main>
  </div>;
}

function PublicDashboardSlider({ language }: { language: Language }) {
  const hi = language === 'hi';
  const [slides, setSlides] = useState<DashboardSlide[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => {
    let active = true;
    const unsubscribeSlides = onSnapshot(collection(db, 'dashboardSlides'), snapshot => {
      if (!active) return;
      const records = snapshot.docs.map(item => { const data = item.data(); return { id: item.id, title: String(data.title || ''), imageData: String(data.imageData || '') }; }).filter(item => item.imageData);
      setSlides(records); setActiveIndex(0);
    }, () => { if (active) setSlides([]); });
    return () => { active = false; unsubscribeSlides(); };
  }, []);
  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setInterval(() => setActiveIndex(index => (index + 1) % slides.length), 5000);
    return () => window.clearInterval(timer);
  }, [slides.length]);
  if (slides.length === 0) return null;
  const slide = slides[activeIndex % slides.length];
  const move = (direction: number) => setActiveIndex(index => (index + direction + slides.length) % slides.length);
  return <section className="home-dashboard-slider" aria-label={hi ? 'मुख्य पेज इमेज स्लाइडर' : 'Homepage image slider'}>
    <div className="home-dashboard-slider-heading"><span className="public-kicker"><ImagePlus size={15}/>{hi ? 'ALL NGO CONNECT · विशेष झलक' : 'ALL NGO CONNECT · FEATURED'}</span>{slide.title && <h2>{slide.title}</h2>}</div>
    <div className="home-dashboard-slider-frame">
      <img src={slide.imageData} alt={slide.title || (hi ? 'All NGO Connect की विशेष तस्वीर' : 'All NGO Connect featured image')} />
      {slides.length > 1 && <>
        <button className="home-slider-arrow home-slider-prev" type="button" onClick={() => move(-1)} aria-label={hi ? 'पिछली तस्वीर' : 'Previous image'}><ChevronLeft size={24}/></button>
        <button className="home-slider-arrow home-slider-next" type="button" onClick={() => move(1)} aria-label={hi ? 'अगली तस्वीर' : 'Next image'}><ChevronRight size={24}/></button>
        <div className="home-slider-dots">{slides.map((item, index) => <button key={item.id} type="button" className={index === activeIndex ? 'active' : ''} onClick={() => setActiveIndex(index)} aria-label={hi ? 'तस्वीर ' + (index + 1) : 'Image ' + (index + 1)} />)}</div>
      </>}
    </div>
  </section>;
}


function PublicTickerBanner({ language }: { language: Language }) {
  const hi = language === 'hi';
  const [messages, setMessages] = useState<Array<{ id: string; text: string; color: string; createdAt?: unknown }>>([]);
  useEffect(() => {
    // Listen live so public visitors see announcements as soon as Super Admin saves them.
    const unsubscribe = onSnapshot(collection(db, 'publicTickerMessages'), snapshot => {
      const rows = snapshot.docs.map(item => ({ id: item.id, text: String(item.data().text || '').trim(), color: String(item.data().color || 'rainbow'), createdAt: item.data().createdAt }))
        .filter(item => item.text).sort((a, b) => {
          const at = a.createdAt && typeof (a.createdAt as { toMillis?: () => number }).toMillis === 'function' ? (a.createdAt as { toMillis: () => number }).toMillis() : 0;
          const bt = b.createdAt && typeof (b.createdAt as { toMillis?: () => number }).toMillis === 'function' ? (b.createdAt as { toMillis: () => number }).toMillis() : 0;
          return at - bt;
        });
      setMessages(rows);
    }, () => setMessages([]));
    return unsubscribe;
  }, []);
  const tickerLine = <>{messages.map((item, index) => <span className={'ticker-text ticker-tone-' + item.color} key={item.id}>{index > 0 ? '   ✦   ' : ''}{item.text}</span>)}</>;
  return <section className="public-ticker-box" aria-label={hi ? 'सुपर एडमिन की सूचना' : 'Super Admin announcements'}>
    
    <div className="public-ticker-window">{messages.length > 0
      ? <div className="public-ticker-track" style={{ animationDuration: "20s" }}><span>{tickerLine}</span><span aria-hidden="true">{tickerLine}</span></div>
      : <div className="public-ticker-placeholder">{hi ? 'यहाँ Super Admin की सूचना दिखाई देगी।' : 'Super Admin announcements will appear here.'}</div>}</div>
  </section>;
}

function PublicHomeNgoCards({ language }: { language: Language }) {
  const hi = language === 'hi';
  const [ngos, setNgos] = useState<Array<{ id: string; name: string; category: string; location: string; mission: string; imageData: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    if (!firebaseConfigured) { setLoading(false); setLoadError(true); return () => { active = false; }; }
    // Query each public status separately so Firestore Rules can prove access.
    const statuses = ['LIVE', 'ACTIVE', 'APPROVED', 'Live', 'Active', 'Approved', 'live', 'active', 'approved'];
    const rowsByStatus = new Map<string, Array<{ id: string; name: string; category: string; location: string; mission: string; imageData: string }>>();
    const completed = new Set<string>();
    const unsubscribers = statuses.map(status => onSnapshot(
      firestoreQuery(collection(db, 'ngos'), where('status', '==', status)),
      snapshot => {
        if (!active) return;
        const rows = snapshot.docs.map(item => {
          const data = item.data();
          const parts = [data.city, data.district, data.state].filter(value => typeof value === 'string' && value.trim()).map(String);
          return {
            id: item.id,
            name: String(data.name || data.ngoName || 'NGO'),
            category: String(data.type || data.category || ''),
            location: parts.filter((value, index) => parts.indexOf(value) === index).join(', ') || String(data.location || ''),
            mission: String(data.mission || data.description || ''),
            imageData: String(data.imageData || data.registrationFormData?.imageData || '')
          };
        });
        rowsByStatus.set(status, rows);
        completed.add(status);
        const merged = new Map<string, typeof rows[number]>();
        rowsByStatus.forEach(items => items.forEach(item => merged.set(item.id, item)));
        setNgos(Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })));
        setLoading(completed.size < statuses.length);
        setLoadError(false);
      },
      () => {
        if (!active) return;
        completed.add(status);
        // Do not hide successful status results if a legacy casing query is denied.
        if (rowsByStatus.size === 0 && completed.size === statuses.length) setLoadError(true);
        if (completed.size === statuses.length) setLoading(false);
      }
    ));
    return () => { active = false; unsubscribers.forEach(unsubscribe => unsubscribe()); };
  }, []);

  return <section className="public-home-ngo-directory" aria-labelledby="home-ngo-heading">
    <style>{`
      @keyframes ngo-card-color-wave {
        0%, 100% { filter: hue-rotate(0deg) saturate(1); }
        25% { filter: hue-rotate(35deg) saturate(1.18); }
        50% { filter: hue-rotate(75deg) saturate(1.22); }
        75% { filter: hue-rotate(35deg) saturate(1.16); }
      }
      .public-home-ngo-card {
        animation: ngo-card-color-wave 3s linear infinite;
        background-size: 180% 180% !important;
        transition: filter .5s ease, box-shadow .3s ease;
      }
      .public-home-ngo-card:nth-child(2n) { animation-delay: -3s; }
      .public-home-ngo-card:nth-child(3n) { animation-delay: -6s; }
      @media (prefers-reduced-motion: reduce) {
        .public-home-ngo-card { animation: none !important; }
      }
      @media (max-width: 600px) {
        .public-home-ngo-grid { gap: 10px !important; grid-template-columns: minmax(0, 1fr) !important; }
        .public-home-ngo-card { min-height: 0 !important; border-radius: 14px !important; box-shadow: 0 2px 0 #bbf7d0, 0 5px 12px rgba(5,150,105,.09) !important; }
        .public-home-ngo-card > div:nth-child(2) { padding: 6px 9px 7px !important; }
        .public-home-ngo-card .public-home-ngo-card-top { justify-content: center !important; align-items: center !important; text-align: center !important; width: 100% !important; margin-bottom: 4px !important; gap: 0 !important; min-height: 0 !important; }
        .public-home-ngo-card .public-home-ngo-monogram { width: 100% !important; height: 90px !important; min-height: 90px !important; max-height: 90px !important; aspect-ratio: auto !important; max-width: 100% !important; border-radius: 10px !important; padding: 3px !important; }
        .public-home-ngo-card .public-home-ngo-active { font-size: 10px !important; padding: 3px 7px !important; gap: 4px !important; }
        .public-home-ngo-card h3 { font-size: 14px !important; line-height: 1.15 !important; margin-bottom: 3px !important; letter-spacing: -.2px !important; }
        .public-home-ngo-card .public-home-ngo-category { font-size: 9px !important; padding: 2px 5px !important; margin-bottom: 3px !important; }
        .public-home-ngo-card .public-home-ngo-location { font-size: 10px !important; margin-bottom: 3px !important; padding-bottom: 3px !important; }
        .public-home-ngo-card > div:nth-child(2) > div[style*="minHeight"] { padding: 3px 5px !important; margin-bottom: 3px !important; min-height: 0 !important; gap: 5px !important; border-radius: 7px !important; }
        .public-home-ngo-card .ngo-directory-mission { font-size: 10px !important; line-height: 1.2 !important; -webkit-line-clamp: 1 !important; }
        .public-home-ngo-card > div:nth-child(2) > div:last-child > span:first-child { font-size: 10px !important; }
        .public-home-ngo-card > div:nth-child(2) > div:last-child > span:last-child { font-size: 11px !important; padding: 6px 8px !important; gap: 5px !important; }
      }
    `}</style>
    <div className="public-section-heading">
      <span>{hi ? 'ALL NGO CONNECT · NGO परिवार' : 'ALL NGO CONNECT · NGO COMMUNITY'}</span>
      
      <p>{hi ? 'सामाजिक बदलाव के लिए साथ काम करने वाली संस्थाएँ।' : 'Organizations working together for social impact.'}</p>
    </div>
    {loading ? <div className="public-home-ngo-empty"><span className="directory-loader"/><p>{hi ? 'NGO की सूची लोड हो रही है…' : 'Loading NGOs…'}</p></div>
      : loadError ? <div className="ngo-directory-empty"><Building2 size={28}/><p>{hi ? 'अभी NGO सूची लोड नहीं हो सकी।' : 'The NGO list could not be loaded right now.'}</p></div>
      : ngos.length === 0 ? <div className="ngo-directory-empty"><HeartHandshake size={30}/><strong>{hi ? 'अभी कोई सक्रिय NGO नहीं है' : 'No active NGOs yet'}</strong><p>{hi ? 'भुगतान सत्यापन और एडमिन की मंज़ूरी के बाद NGO के कार्ड यहाँ दिखाई देंगे।' : 'NGO cards will appear here after payment verification and admin approval.'}</p></div>
      : <div className="public-home-ngo-grid">{ngos.map((ngo, index) => <article className={`public-home-ngo-card public-home-ngo-tone-${index % 4}`} key={ngo.id} role="link" tabIndex={0} aria-label={(hi ? 'NGO साइट खोलें: ' : 'Open NGO website: ') + ngo.name} onClick={() => { window.location.href = '/ngo/' + encodeURIComponent(ngo.id); }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); window.location.href = '/ngo/' + encodeURIComponent(ngo.id); } }} style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 0, minHeight: 0, padding: 0, borderRadius: 20, border: ['2px solid #34d399','2px solid #c084fc','2px solid #60a5fa','2px solid #fb7185'][index % 4], background: ['linear-gradient(145deg,#00b894 0%,#10b981 45%,#047857 100%)','linear-gradient(145deg,#7c3aed 0%,#a855f7 48%,#c026d3 100%)','linear-gradient(145deg,#0284c7 0%,#38bdf8 48%,#1d4ed8 100%)','linear-gradient(145deg,#f97316 0%,#fb7185 48%,#be185d 100%)'][index % 4], boxShadow: ['0 5px 0 #047857, 0 13px 24px rgba(5,150,105,.28)','0 5px 0 #6b21a8, 0 13px 24px rgba(126,34,206,.28)','0 5px 0 #1e40af, 0 13px 24px rgba(37,99,235,.26)','0 5px 0 #9d174d, 0 13px 24px rgba(225,29,72,.25)'][index % 4], transition: 'transform .22s ease, box-shadow .22s ease' }}>
          <div style={{ height: 4, width: '100%', background: ['linear-gradient(90deg,#a7f3d0,#fef08a,#34d399)','linear-gradient(90deg,#e9d5ff,#f9a8d4,#c084fc)','linear-gradient(90deg,#bae6fd,#fef08a,#60a5fa)','linear-gradient(90deg,#fed7aa,#fda4af,#fb7185)'][index % 4] }}/>
          <div style={{ padding: '10px 12px 13px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', flex: 1, position: 'relative', gap: 10, textAlign: 'center' }}>
            <h3 style={{ width: '100%', margin: '0 0 2px', fontSize: 'clamp(16px, 2vw, 21px)', lineHeight: 1.2, fontWeight: 950, letterSpacing: '.2px', color: '#fff', textAlign: 'center', overflowWrap: 'anywhere', textShadow: '0 2px 0 rgba(0,0,0,.28), 0 4px 8px rgba(0,0,0,.28)' }}>{ngo.name}</h3>
            <div className="public-home-ngo-card-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', width: '100%', maxWidth: 280, margin: '0 auto', gap: 0, position: 'relative', flex: '0 0 auto' }}>
              {ngo.imageData ? <img className="public-home-ngo-monogram" src={ngo.imageData} alt={ngo.name + ' logo'} style={{ width: '100%', height: 150, maxHeight: 150, flexShrink: 0, objectFit: 'contain', objectPosition: 'center', display: 'block', margin: '0 auto', alignSelf: 'center', background: '#fff', border: '2px solid rgba(255,255,255,.9)', borderRadius: 16, padding: 6, boxSizing: 'border-box', boxShadow: '0 5px 0 rgba(0,0,0,.16), 0 8px 16px rgba(15,23,42,.2)' }}/> : <span className="public-home-ngo-monogram" style={{ width: '100%', height: 150, minHeight: 150, maxHeight: 150, flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 48, fontWeight: 900, color: '#fff', background: ['linear-gradient(135deg,#047857,#34d399)','linear-gradient(135deg,#6d28d9,#ec4899)','linear-gradient(135deg,#1d4ed8,#38bdf8)','linear-gradient(135deg,#c2410c,#fb7185)'][index % 4], border: '2px solid rgba(255,255,255,.8)', borderRadius: 16, boxShadow: '0 5px 0 rgba(0,0,0,.18), 0 8px 16px rgba(15,23,42,.2)' }}>{ngo.name.slice(0, 2).toUpperCase()}</span>}
            </div>
            <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginTop: 2 }}>
              <a href={'/ngo/' + encodeURIComponent(ngo.id)} onClick={event => event.stopPropagation()} style={{ minWidth: 0, minHeight: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 7px', borderRadius: 12, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 950, textAlign: 'center', background: 'linear-gradient(180deg,#ff6384 0%,#e11d48 100%)', border: '1px solid rgba(255,255,255,.8)', boxShadow: '0 4px 0 #9f1239, 0 7px 12px rgba(80,0,20,.25)', textShadow: '0 1px 2px rgba(0,0,0,.25)' }}>❤️ {hi ? 'डोनेट करें' : 'Donate'}</a>
              <a href={'/ngo/' + encodeURIComponent(ngo.id)} onClick={event => event.stopPropagation()} style={{ minWidth: 0, minHeight: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 7px', borderRadius: 12, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 950, textAlign: 'center', background: 'linear-gradient(180deg,#34d399 0%,#047857 100%)', border: '1px solid rgba(255,255,255,.8)', boxShadow: '0 4px 0 #065f46, 0 7px 12px rgba(0,0,0,.2)', textShadow: '0 1px 2px rgba(0,0,0,.25)' }}>🤝 {hi ? 'सदस्य बनें' : 'Become a Member'}</a>
            </div>
          </div>
        </article>)}</div>}
    <div className="home-ngo-view-all"><a className="outline-button" href="/ngo-list">{hi ? 'सभी NGO देखें' : 'View all NGOs'} <ArrowUpRight size={16}/></a></div>
  </section>;
}

function PublicHome({ language, setLanguage, authUser, onLogin, onLogout, authError }: PublicHomeProps) {
  const hi = language === 'hi';
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const [appInstalled, setAppInstalled] = useState(false);
  useEffect(() => {
    const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    // Do not persist an "installed" flag: browsers keep localStorage after uninstall,
    // which would incorrectly hide this button when the user returns to the website.
    setAppInstalled(isStandalone());
    const onBeforeInstall = (event: Event) => { event.preventDefault(); setInstallPromptEvent(event); };
    const onInstalled = () => {
      setAppInstalled(true);
      setInstallPromptEvent(null);
    };
    const onDisplayModeChange = () => setAppInstalled(isStandalone());
    const displayMode = window.matchMedia('(display-mode: standalone)');
    displayMode.addEventListener?.('change', onDisplayModeChange);
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      displayMode.removeEventListener?.('change', onDisplayModeChange);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);
  const handleInstallApp = async () => {
    if (installPromptEvent) {
      try {
        await installPromptEvent.prompt();
        const choice = await installPromptEvent.userChoice;
        if (choice?.outcome === 'accepted') {
          setInstallPromptEvent(null);
          setAppInstalled(true);
        }
      } catch (error) {
        window.alert(hi ? 'ऐप इंस्टॉल करने के लिए Chrome मेनू (⋮) खोलकर “Install app” चुनें। यदि विकल्प नहीं दिखता, पेज को रिफ्रेश करके दोबारा कोशिश करें।' : 'To install, open Chrome’s ⋮ menu and choose “Install app”. If unavailable, refresh the page and try again.');
      }
      return;
    }
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    if (isStandalone) {
      setAppInstalled(true);
      return;
    }
    window.alert(hi ? 'इंस्टॉल विकल्प तैयार हो रहा है। पेज को एक बार रिफ्रेश करें। फिर भी विकल्प न आए तो Chrome के ⋮ मेनू में “Install app” चुनें।' : 'The install option is still preparing. Refresh this page once. If it still does not appear, choose “Install app” from Chrome’s ⋮ menu.');
  };
  const [showCompassionQuote, setShowCompassionQuote] = useState(false);
  useEffect(() => {
    const interval = window.setInterval(() => setShowCompassionQuote(current => !current), 4000);
    return () => window.clearInterval(interval);
  }, []);
  const [showPublicRegistration, setShowPublicRegistration] = useState(false);
  const [hasPendingRegistration, setHasPendingRegistration] = useState(false);
  const [hasOwnedNgo, setHasOwnedNgo] = useState(false);
  const registrationAlreadySubmitted = hasPendingRegistration || hasOwnedNgo;
  useEffect(() => {
    if (!authUser || !firebaseConfigured) {
      setHasPendingRegistration(false);
      setHasOwnedNgo(false);
      return;
    }
    // A deleted NGO must not be blocked by its old ACTIVE registration record.
    // Pending applications block duplicates; an existing NGO also blocks duplicates.
    const unsubscribeRegistration = onSnapshot(
      firestoreQuery(collection(db, 'ngoRegistrations'), where('ownerUid', '==', authUser.uid)),
      snapshot => {
        const pending = snapshot.docs.some(item => {
          const status = String(item.data().status || '').toUpperCase();
          return ['PENDING_PAYMENT', 'PENDING', 'SUBMITTED_FOR_REVIEW'].includes(status);
        });
        setHasPendingRegistration(pending);
        if (pending) setShowPublicRegistration(false);
      },
      () => setHasPendingRegistration(false)
    );
    const unsubscribeOwnedNgos = onSnapshot(
      firestoreQuery(collection(db, 'ngos'), where('ownerUid', '==', authUser.uid)),
      snapshot => {
        const exists = !snapshot.empty;
        setHasOwnedNgo(exists);
        if (exists) setShowPublicRegistration(false);
      },
      () => setHasOwnedNgo(false)
    );
    return () => {
      unsubscribeRegistration();
      unsubscribeOwnedNgos();
    };
  }, [authUser]);
  useEffect(() => { if (new URLSearchParams(window.location.search).get('register') === '1' && !registrationAlreadySubmitted) setShowPublicRegistration(true); }, [registrationAlreadySubmitted]);
  const [registrationBusy, setRegistrationBusy] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState('');
  const [registrationSuccessMessage, setRegistrationSuccessMessage] = useState('');
  const [paymentQrImage, setPaymentQrImage] = useState('');
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [publicForm, setPublicForm] = useState({ name: '', contact: '', phone: '', state: '', district: '', mission: '', planId: '', paymentReference: '', imageData: '' });
  const submitPublicRegistration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authUser || !authUser.email) { onLogin(); return; }
    if (!firebaseConfigured) { setRegistrationMessage(hi ? 'Firebase सेटअप उपलब्ध नहीं है।' : 'Firebase is not configured.'); return; }
    setRegistrationBusy(true);
    setRegistrationMessage('');
    try {
      await addDoc(collection(db, 'ngoRegistrations'), {
        name: publicForm.name.trim(), contactName: publicForm.contact.trim(),
        email: authUser.email, phone: publicForm.phone.trim(), state: publicForm.state, district: publicForm.district.trim(),
        mission: publicForm.mission.trim(), imageData: publicForm.imageData, planId: publicForm.planId,
        subscriptionPlan: subscriptionPlans.find(p => p.id === publicForm.planId)?.name || '',
        planPrice: subscriptionPlans.find(p => p.id === publicForm.planId)?.price || 0,
        planDurationDays: subscriptionPlans.find(p => p.id === publicForm.planId)?.durationDays || 0,
        paymentReference: publicForm.paymentReference.trim(),
        status: 'PENDING_PAYMENT',
        paymentStatus: publicForm.paymentReference.trim() ? 'SUBMITTED_FOR_REVIEW' : 'NOT_SUBMITTED',
        ownerUid: authUser.uid, createdAt: serverTimestamp(),
      });
      const successMessage = hi ? 'रजिस्ट्रेशन जमा हो गया। भुगतान/UTR की जाँच और एडमिन की मंज़ूरी के बाद ही NGO सक्रिय होगा।' : 'Registration submitted. The NGO will activate only after payment verification and admin approval.';
      setRegistrationMessage(successMessage);
      setRegistrationSuccessMessage(successMessage);
      setPublicForm({ name: '', contact: '', phone: '', state: '', district: '', mission: '', planId: subscriptionPlans.find(p => p.active)?.id || '', paymentReference: '', imageData: '' });
      setShowPublicRegistration(false);
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete('register');
      window.history.replaceState({}, '', nextUrl.pathname + nextUrl.search + nextUrl.hash);
    } catch (error) {
      setRegistrationMessage(error instanceof Error ? error.message : (hi ? 'रजिस्ट्रेशन सेव नहीं हुआ। Firebase नियम जाँचें।' : 'Could not save registration. Check Firebase rules.'));
    } finally { setRegistrationBusy(false); }
  };
  useEffect(() => {
    let active = true;
    // Keep the public registration dropdown synced whenever the admin adds,
    // edits, activates, or deactivates a plan.
    const unsubscribePlans = onSnapshot(
      firestoreQuery(collection(db, 'subscriptionPlans'), where('active', '==', true)),
      snapshot => {
        if (!active) return;
        const plans = snapshot.docs
          .map(item => {
            const data = item.data();
            return {
              id: item.id,
              name: String(data.name || data.planName || '').trim(),
              price: Number(data.price ?? data.fee ?? data.amount) || 0,
              durationDays: Number(data.durationDays ?? data.validityDays ?? data.duration) || 0,
              description: String(data.description || ''),
              active: data.active === true,
            };
          })
          .filter(plan => plan.active && plan.name);
        setSubscriptionPlans(plans);
        setPublicForm(current => ({
          ...current,
          planId: plans.some(plan => plan.id === current.planId) ? current.planId : (plans[0]?.id || ''),
        }));
        if (plans.length === 0) {
          setRegistrationMessage(hi ? 'अभी कोई सक्रिय प्लान नहीं मिला। एडमिन पैनल में प्लान सक्रिय करें।' : 'No active plans found. Activate a plan in the admin panel.');
        } else {
          setRegistrationMessage(current => current.startsWith('अभी कोई सक्रिय प्लान') || current.startsWith('No active plans') || current.startsWith('प्लान लोड नहीं हुए') || current.startsWith('Could not load plans') ? '' : current);
        }
      },
      error => {
        if (!active) return;
        setSubscriptionPlans([]);
        setRegistrationMessage(error instanceof Error
          ? (hi ? 'प्लान लोड नहीं हुए: ' + error.message : 'Could not load plans: ' + error.message)
          : (hi ? 'प्लान लोड नहीं हुए। Firebase Rules जाँचें।' : 'Could not load plans. Check Firebase rules.'));
      }
    );
    const unsubscribePayment = onSnapshot(doc(db, 'publicSettings', 'payment'), snapshot => {
      if (active && snapshot.exists() && typeof snapshot.data().qrImage === 'string') setPaymentQrImage(snapshot.data().qrImage as string);
      else if (active) setPaymentQrImage('');
    }, () => { if (active) setPaymentQrImage(''); });
    return () => { active = false; unsubscribePlans(); unsubscribePayment(); };
  }, [hi]);
  return <div className="public-site">
    {registrationSuccessMessage && !showPublicRegistration && <div role="status" className="public-auth-error" style={{ maxWidth: 900, margin: '12px auto', padding: '12px 18px' }}>{registrationSuccessMessage}</div>}
    <header className="public-header" style={{ backgroundImage: "linear-gradient(90deg, rgba(255,255,255,.90), rgba(255,255,255,.60)), url(https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=2000&q=85)", backgroundPosition: "center", backgroundSize: "cover", backgroundRepeat: "no-repeat" }}>
      <a className="public-brand" href="/" aria-label="All NGO Connect home"><span className="brand-mark"><Leaf size={23}/></span><span className="brand-name-stack"><span className="brand-name-banner"><span>All NGO</span><span>Connect</span></span><small>{hi ? 'मजबूत समुदाय। बेहतर बदलाव।' : 'Stronger communities. Better impact.'}</small></span></a>
      <nav className="public-nav"><a className="nav-3d nav-3d-green" href="/ngo-list">{hi ? "NGO सूची" : "NGO List"}</a><a className="nav-3d nav-3d-blue" href="/about">{hi ? 'हमारे बारे में' : 'About'}</a><a className="nav-3d nav-3d-orange" href="/features">{hi ? 'सुविधाएँ' : 'Features'}</a><a className="nav-3d nav-3d-purple" href="/contact">{hi ? 'संपर्क' : 'Contact'}</a><a className="nav-3d nav-3d-pink" href="/privacy-policy">{hi ? 'प्राइवेसी पॉलिसी' : 'Privacy Policy'}</a></nav>
      <div className="public-actions"><button className="language-button" onClick={() => setLanguage(hi ? 'en' : 'hi')}>{hi ? 'English' : 'हिन्दी'}</button>{!registrationAlreadySubmitted && <button className="outline-button" onClick={() => { setRegistrationMessage(''); setShowPublicRegistration(true); }}>Register</button>}{authUser ? <div className="public-user"><button className="outline-button" onClick={onLogout}>{hi ? 'लॉगआउट' : 'Sign out'}</button></div> : <button className="primary-button" onClick={onLogin} disabled={!firebaseConfigured}><Globe2 size={17}/>Login</button>}</div>
    </header>
    <PublicTickerBanner language={language} />
    <main>
      <section className="public-hero" id="about"><div className="public-hero-copy"><span className="public-kicker"><HeartHandshake size={15}/>{hi ? 'सामाजिक बदलाव के लिए एक मंच' : 'A platform for social impact'}</span><h1 key={showCompassionQuote ? 'compassion-quote' : 'smile-quote'} className="public-hero-rotating-quote">{showCompassionQuote ? (hi ? <>तुम ज़मीन वालों पर रहम करो,<br/><em>आसमान वाला तुम पर रहम करेगा। ❤️</em></> : <>Show mercy to those on earth,<br/><em>and the One above will show mercy to you. ❤️</em></>) : (hi ? <>आपकी छोटी-सी मदद,<br/><em>किसी की मुस्कान बन सकती है।</em></> : <>Your small act of kindness<br/><em>can bring a smile to someone.</em></>)}</h1></div></section>
      <PublicHomeNgoCards language={language} />
      <PublicDashboardSlider language={language} />
      <section className="public-features" id="features"><div className="public-section-heading"><span>{hi ? 'एक ही जगह सब कुछ' : 'EVERYTHING IN ONE PLACE'}</span><h2>{hi ? 'समाज सेवा को आसान और व्यवस्थित बनाएँ' : 'Make community work simpler and organized'}</h2></div><div className="public-feature-grid"><article><div className="public-feature-icon"><HeartHandshake size={24}/></div><h3>{hi ? 'NGO प्रोफ़ाइल' : 'NGO profiles'}</h3><p>{hi ? 'संस्था की पहचान, उद्देश्य और सार्वजनिक जानकारी दिखाने के लिए।' : 'Share an organization’s mission and public information.'}</p></article><article><div className="public-feature-icon"><Users size={24}/></div><h3>{hi ? 'सदस्य और स्वयंसेवक' : 'Members & volunteers'}</h3><p>{hi ? 'टीम और स्वयंसेवकों के काम को व्यवस्थित करने की सुविधा।' : 'Organize teams and volunteer activity.'}</p></article><article><div className="public-feature-icon"><HandCoins size={24}/></div><h3>{hi ? 'दान और खर्च' : 'Donations & expenses'}</h3><p>{hi ? 'दान और खर्च का रिकॉर्ड रखने के लिए नियोजित सुविधा।' : 'Planned tools to keep donation and expense records.'}</p></article><article><div className="public-feature-icon"><CalendarDays size={24}/></div><h3>{hi ? 'कार्यक्रम और रिपोर्ट' : 'Events & reports'}</h3><p>{hi ? 'कार्यक्रम, दस्तावेज़, प्रमाणपत्र और रिपोर्ट के लिए।' : 'Tools for events, documents, certificates and reports.'}</p></article></div></section>
      <section className="public-cta" id="contact"><div><span>ALL NGO CONNECT</span><h2>{hi ? 'बेहतर बदलाव के लिए साथ आएँ।' : 'Come together for a better impact.'}</h2>{!registrationAlreadySubmitted && <button className="primary-button" onClick={() => { setRegistrationMessage(''); setShowPublicRegistration(true); }}>{hi ? 'अपना NGO रजिस्टर करें' : 'Register your NGO'} <ArrowUpRight size={17}/></button>}</div></section>
      {showPublicRegistration && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !registrationBusy) setShowPublicRegistration(false); }}><section className="registration-modal" role="dialog" aria-modal="true" aria-labelledby="public-registration-title"><div className="modal-heading"><div><span className="modal-eyebrow">ALL NGO CONNECT</span><h2 id="public-registration-title">{hi ? 'NGO रजिस्ट्रेशन' : 'NGO registration'}</h2><p>{hi ? 'Google लॉगिन के बाद जानकारी भेजें। भुगतान सत्यापन और एडमिन मंज़ूरी तक NGO सक्रिय नहीं होगा।' : 'Sign in with Google and submit your details. Activation happens only after payment verification and admin approval.'}</p></div><button className="icon-button" onClick={() => setShowPublicRegistration(false)} aria-label={hi ? 'बंद करें' : 'Close'}><X size={20}/></button></div>{!authUser ? <div className="public-profile-gate"><p>{hi ? 'रजिस्ट्रेशन के लिए पहले Google से लॉगिन करें।' : 'Sign in with Google before registering.'}</p><button className="primary-button" onClick={onLogin} disabled={!firebaseConfigured}><Globe2 size={17}/>{hi ? 'Google से लॉगिन' : 'Sign in with Google'}</button></div> : <form onSubmit={submitPublicRegistration}><label>{hi ? 'NGO / संस्था का नाम' : 'NGO / organization name'} *<input required maxLength={120} value={publicForm.name} onChange={e => setPublicForm({...publicForm, name:e.target.value})}/></label><div className="ngo-image-upload-field" style={{ border: '2px dashed #7c3aed', borderRadius: 12, padding: 14, margin: '10px 0', background: 'rgba(124,58,237,0.06)' }}><label style={{ display: 'block', fontWeight: 700 }}>{hi ? '📷 NGO का लोगो अपलोड करें (वैकल्पिक)' : '📷 Upload NGO logo (optional)'}<input type="file" accept="image/png,image/jpeg,image/webp" aria-label={hi ? 'NGO का लोगो चुनें' : 'Choose NGO logo'} onChange={async e => { const file = e.currentTarget.files?.[0]; if (!file) return; try { const imageData = await compressDashboardImage(file, 180000); setPublicForm(current => ({ ...current, imageData })); } catch (error) { setRegistrationMessage(error instanceof Error ? error.message : (hi ? 'लोगो अपलोड नहीं हुआ।' : 'Could not upload logo.')); } }} style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 10, padding: 12, border: '1px solid #c4b5fd', borderRadius: 8, background: '#fff', color: '#111827' }} /><small style={{ display: 'block', marginTop: 8 }}>{hi ? 'मोबाइल या कंप्यूटर से JPG, PNG या WebP लोगो चुनें।' : 'Choose a JPG, PNG or WebP logo from your phone or computer.'}</small>{publicForm.imageData && <img src={publicForm.imageData} alt={hi ? 'NGO लोगो का पूर्वावलोकन' : 'NGO logo preview'} style={{ display: 'block', width: 120, height: 120, objectFit: 'contain', background: '#fff', borderRadius: 12, padding: 8, marginTop: 10, boxShadow: '0 4px 14px rgba(0,0,0,.12)' }} />}</label></div><label>{hi ? 'संपर्क व्यक्ति' : 'Contact person'} *<input required maxLength={100} value={publicForm.contact} onChange={e => setPublicForm({...publicForm, contact:e.target.value})}/></label><label>{hi ? 'मोबाइल नंबर' : 'Phone number'} *<input required type="tel" maxLength={25} value={publicForm.phone} onChange={e => setPublicForm({...publicForm, phone:e.target.value})}/></label><label>{hi ? 'राज्य' : 'State'} *<select required value={publicForm.state} onChange={e => setPublicForm({...publicForm, state:e.target.value})}><option value="">{hi ? 'राज्य चुनें' : 'Select state'}</option>{INDIA_STATES_AND_UTS.map(s => <option key={s} value={s}>{s}</option>)}</select></label><label>{hi ? 'जिला' : 'District'} *<input required maxLength={100} value={publicForm.district} onChange={e => setPublicForm({...publicForm, district:e.target.value})} placeholder={hi ? 'जिले का नाम लिखें' : 'Enter district name'}/></label><label>{hi ? 'संस्था का उद्देश्य' : 'Mission / purpose'}<textarea rows={3} maxLength={1000} value={publicForm.mission} onChange={e => setPublicForm({...publicForm, mission:e.target.value})}/></label><label>{hi ? 'सब्सक्रिप्शन प्लान' : 'Subscription plan'}<select required value={publicForm.planId} onChange={e => setPublicForm({...publicForm, planId:e.target.value})}><option value="">{hi ? 'प्लान चुनें' : 'Choose a plan'}</option>{subscriptionPlans.filter(plan => plan.active).map(plan => <option key={plan.id} value={plan.id}>{plan.name} — ₹{plan.price} / {plan.durationDays} {hi ? 'दिन' : 'days'}</option>)}</select>{subscriptionPlans.length === 0 && <small>{hi ? 'अभी कोई सक्रिय प्लान उपलब्ध नहीं है। एडमिन से संपर्क करें।' : 'No active plans are available. Contact the administrator.'}</small>}</label>{paymentQrImage && <div className="payment-qr-preview"><h3>{hi ? 'UPI से भुगतान करें' : 'Pay by UPI'}</h3><img src={paymentQrImage} alt={hi ? 'All NGO Connect UPI QR कोड' : 'All NGO Connect UPI QR code'} /><p>{hi ? 'QR स्कैन करके भुगतान करें, फिर नीचे UTR नंबर भरें।' : 'Scan this QR to pay, then enter the UTR below.'}</p></div>}<label>{hi ? 'भुगतान UTR / संदर्भ नंबर (यदि भुगतान कर दिया है)' : 'Payment UTR / reference (if already paid)'}<input maxLength={80} value={publicForm.paymentReference} onChange={e => setPublicForm({...publicForm, paymentReference:e.target.value})} placeholder="UTR / transaction reference"/></label><div className="form-note"><ShieldCheck size={17}/><span>{hi ? 'UTR भेजना भुगतान का प्रमाण नहीं है। एडमिन बैंक/UPI रिकॉर्ड से सत्यापन करेगा। भुगतान निर्देश एडमिन से प्राप्त करें।' : 'A UTR is not proof by itself. Admin will verify against UPI/bank records. Obtain payment instructions from the administrator.'}</span></div>{registrationMessage && <p role="status" className="public-auth-error">{registrationMessage}</p>}<div className="modal-actions"><button type="button" className="outline-button" disabled={registrationBusy} onClick={() => setShowPublicRegistration(false)}>{hi ? 'बंद करें' : 'Close'}</button><button type="submit" className="primary-button" disabled={registrationBusy || subscriptionPlans.length === 0 || !publicForm.planId}>{registrationBusy ? (hi ? 'सेव हो रहा है…' : 'Saving…') : (hi ? 'रजिस्ट्रेशन जमा करें' : 'Submit registration')}</button></div></form>}</section></div>}
      {authError && <p className="public-auth-error">{authError}</p>}
    </main><footer className="public-footer"><span>© 2026 All NGO Connect</span></footer>
    {!appInstalled && <div className="app-install-float-wrap">
      <button type="button" className="app-install-float" onClick={handleInstallApp}><span className="app-install-icon">↓</span><span>{hi ? 'ऐप इंस्टॉल करें' : 'Install App'}</span></button>
    </div>}
  </div>;
}


function PublicInfoPage({ language, setLanguage, page }: { language: Language; setLanguage: (language: Language) => void; page: 'about' | 'features' | 'contact' }) {
  const hi = language === 'hi';
  const data = {
    about: { title: hi ? 'हमारे बारे में' : 'About Us', intro: hi ? 'All NGO Connect सामाजिक संस्थाओं को जोड़ने और उनके काम को व्यवस्थित करने के लिए बनाया गया मंच है।' : 'All NGO Connect connects community organizations and helps organize their work.', points: hi ? ['NGO की जानकारी और उद्देश्य साझा करें।', 'सदस्यों और स्वयंसेवकों के काम को व्यवस्थित करें।', 'समाज सेवा की गतिविधियों और रिपोर्ट को एक जगह रखें।'] : ['Share your NGO profile and mission.', 'Organize members and volunteers.', 'Keep community activities and reports in one place.'] },
    features: { title: hi ? 'प्लेटफ़ॉर्म की सुविधाएँ' : 'Platform Features', intro: hi ? 'NGO के रोज़मर्रा के काम को आसान बनाने के लिए मुख्य सुविधाएँ।' : 'Key tools designed to make everyday NGO operations easier.', points: hi ? ['NGO प्रोफ़ाइल और सार्वजनिक NGO सूची।', 'सदस्य और स्वयंसेवक प्रबंधन।', 'दान और खर्च का रिकॉर्ड।', 'कार्यक्रम, दस्तावेज़, प्रमाणपत्र और रिपोर्ट।', 'सब्सक्रिप्शन और भुगतान की मैनुअल जाँच।'] : ['NGO profiles and public directory.', 'Member and volunteer management.', 'Donation and expense records.', 'Events, documents, certificates, and reports.', 'Subscriptions and manual payment review.'] },
    contact: { title: hi ? 'संपर्क करें' : 'Contact Us', intro: hi ? 'NGO रजिस्ट्रेशन, सब्सक्रिप्शन या प्लेटफ़ॉर्म से जुड़ी सहायता के लिए नीचे दिए निर्देश देखें।' : 'For NGO registration, subscriptions, or platform help, use the guidance below.', points: hi ? ['NGO रजिस्ट्रेशन के लिए “NGO रजिस्टर करें” बटन का उपयोग करें।', 'भुगतान UPI/बैंक रिकॉर्ड से मैनुअल रूप से सत्यापित होता है।', 'समस्या होने पर अपने रजिस्ट्रेशन ईमेल की जानकारी तैयार रखें।'] : ['Use the “Register NGO” button to submit your registration.', 'Payments are manually verified against UPI/bank records.', 'For support, keep your registration email details ready.'] }
  }[page];
  return <div className="public-site public-info-site">
    <header className="public-header" style={{ backgroundImage: "linear-gradient(90deg, rgba(255,255,255,.90), rgba(255,255,255,.60)), url(https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=2000&q=85)", backgroundPosition: "center", backgroundSize: "cover", backgroundRepeat: "no-repeat" }}>
      <a className="public-brand" href="/" aria-label="All NGO Connect home"><span className="brand-mark"><Leaf size={23}/></span><span className="brand-name-stack"><span className="brand-name-banner"><span>All NGO</span><span>Connect</span></span><small>{hi ? 'मजबूत समुदाय। बेहतर बदलाव।' : 'Stronger communities. Better impact.'}</small></span></a>
      <nav className="public-nav"><a className="nav-3d nav-3d-green" href="/ngo-list">{hi ? 'NGO सूची' : 'NGO List'}</a><a className="nav-3d nav-3d-blue" href="/about">{hi ? 'हमारे बारे में' : 'About'}</a><a className="nav-3d nav-3d-orange" href="/features">{hi ? 'सुविधाएँ' : 'Features'}</a><a className="nav-3d nav-3d-purple" href="/contact">{hi ? 'संपर्क' : 'Contact'}</a><a className="nav-3d nav-3d-pink" href="/privacy-policy">{hi ? 'प्राइवेसी पॉलिसी' : 'Privacy Policy'}</a></nav>
      <div className="public-actions"><button className="language-button" onClick={() => setLanguage(hi ? 'en' : 'hi')}>{hi ? 'English' : 'हिन्दी'}</button><a className="outline-button" href="/">{hi ? 'होम पेज' : 'Home page'}</a></div>
    </header>
    <main className="public-info-main"><span className="public-kicker"><HeartHandshake size={16}/>ALL NGO CONNECT</span><h1>{data.title}</h1><p className="public-info-intro">{data.intro}</p><div className="public-info-list">{data.points.map((point, index) => <article key={point}><span>{index + 1}</span><p>{point}</p></article>)}</div><a className="primary-button public-info-home" href="/">{hi ? 'होम पेज पर वापस जाएँ' : 'Back to home'} <ArrowUpRight size={17}/></a></main>
    <footer className="public-footer"><span>© 2026 All NGO Connect</span></footer>
  </div>;
}

function PrivacyPolicyPage({ language, setLanguage }: { language: Language; setLanguage: (language: Language) => void }) {
  const hi = language === 'hi';
  return <div className="public-site">
    <header className="public-header" style={{ backgroundImage: "linear-gradient(90deg, rgba(255,255,255,.90), rgba(255,255,255,.60)), url(https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=2000&q=85)", backgroundPosition: "center", backgroundSize: "cover", backgroundRepeat: "no-repeat" }}>
      <a className="public-brand" href="/" aria-label="All NGO Connect home"><span className="brand-mark"><Leaf size={23}/></span><span className="brand-name-stack"><span className="brand-name-banner"><span>All NGO</span><span>Connect</span></span><small>{hi ? 'मजबूत समुदाय। बेहतर बदलाव।' : 'Stronger communities. Better impact.'}</small></span></a>
      <div className="public-actions"><button className="language-button" onClick={() => setLanguage(hi ? 'en' : 'hi')}>{hi ? 'English' : 'हिन्दी'}</button><a className="outline-button" href="/">{hi ? 'होम पेज' : 'Home page'}</a></div>
    </header>
    <main className="ngo-directory-main">
      <a className="directory-back-link" href="/"><ArrowLeft size={17}/>{hi ? 'मुख्य पेज पर वापस जाएँ' : 'Back to home'}</a>
      <section className="ngo-directory-heading"><span className="public-kicker"><ShieldCheck size={15}/>ALL NGO CONNECT</span><h1>{hi ? 'प्राइवेसी पॉलिसी' : 'Privacy Policy'}</h1><p>{hi ? 'आपकी जानकारी को कैसे संभाला जाता है, इसकी जानकारी।' : 'How All NGO Connect handles your information.'}</p></section>
      <section className="ngo-directory-panel">
        <h2>{hi ? '1. हम कौन-सी जानकारी लेते हैं' : '1. Information we collect'}</h2>
        <p>{hi ? 'NGO रजिस्ट्रेशन और सेवा चलाने के लिए संस्था का नाम, संपर्क व्यक्ति, ईमेल, फोन नंबर, राज्य, जिला, उद्देश्य और सब्सक्रिप्शन/भुगतान संदर्भ जैसी जानकारी ली जा सकती है।' : 'To register NGOs and operate the service, we may collect organization name, contact person, email, phone number, state, district, mission, and subscription or payment reference details.'}</p>
        <h2>{hi ? '2. जानकारी का उपयोग' : '2. How information is used'}</h2>
        <p>{hi ? 'जानकारी का उपयोग NGO रजिस्ट्रेशन की समीक्षा, खाते और सदस्यता प्रबंधन, भुगतान संदर्भ के सत्यापन, सहायता और प्लेटफ़ॉर्म की सुरक्षा के लिए किया जाता है।' : 'Information is used to review NGO registrations, manage accounts and subscriptions, verify payment references, provide support, and protect the platform.'}</p>
        <h2>{hi ? '3. लॉगिन और डेटा स्टोरेज' : '3. Sign-in and data storage'}</h2>
        <p>{hi ? 'Google लॉगिन का उपयोग खाते की पहचान के लिए किया जा सकता है। प्लेटफ़ॉर्म रिकॉर्ड Firebase सेवाओं में रखे जा सकते हैं। Google और Firebase की अपनी गोपनीयता शर्तें भी लागू होती हैं।' : 'Google sign-in may be used to authenticate accounts. Platform records may be stored using Firebase services. Google and Firebase privacy terms also apply to their services.'}</p>
        <h2>{hi ? '4. भुगतान की जानकारी' : '4. Payment information'}</h2>
        <p>{hi ? 'भुगतान की मैनुअल जाँच के लिए UTR या ट्रांज़ैक्शन संदर्भ लिया जा सकता है। अपना UPI PIN, पासवर्ड या OTP कभी साझा न करें। UTR अपने-आप में भुगतान की पुष्टि नहीं है।' : 'A UTR or transaction reference may be collected for manual payment review. Never share your UPI PIN, password, or OTP. A UTR alone does not confirm payment.'}</p>
        <h2>{hi ? '5. जानकारी साझा करना और सुरक्षा' : '5. Sharing and security'}</h2>
        <p>{hi ? 'जानकारी केवल प्लेटफ़ॉर्म चलाने, सुरक्षा, कानूनी आवश्यकता या सेवा प्रदाताओं के आवश्यक उपयोग के लिए साझा की जा सकती है। हम उचित सुरक्षा उपाय अपनाने का प्रयास करते हैं, लेकिन इंटरनेट पर किसी भी प्रणाली की पूर्ण सुरक्षा की गारंटी नहीं दी जा सकती।' : 'Information may be shared only as needed to operate the platform, maintain security, meet legal requirements, or use essential service providers. We take reasonable precautions, but no internet system can guarantee absolute security.'}</p>
        <h2>{hi ? '6. आपके विकल्प और संपर्क' : '6. Your choices and contact'}</h2>
        <p>{hi ? 'अपनी जानकारी देखने, सुधारने या हटाने के अनुरोध के लिए प्लेटफ़ॉर्म एडमिन से संपर्क करें। यह पॉलिसी समय-समय पर अपडेट हो सकती है।' : 'To request access, correction, or deletion of your information, contact the platform administrator. This policy may be updated from time to time.'}</p>
        <p><strong>{hi ? 'अंतिम अपडेट: 20 अक्टूबर 2026' : 'Last updated: October 20, 2026'}</strong></p>
      </section>
      <footer className="ngo-directory-footer">© 2026 All NGO Connect</footer>
    </main>
  </div>;
}

export default function App() {
  const [language, setLanguage] = useState<Language>('hi');
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState('');
  const [section, setSection] = useState<Section>('overview');
  const [showRegistration, setShowRegistration] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({ name: '', contact: '', email: '', phone: '', state: '', district: '', mission: '', planId: '' });
  const [ngoImageData, setNgoImageData] = useState('');
  const [pendingRegistrations, setPendingRegistrations] = useState<Array<Record<string, unknown> & { id: string }>>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [planForm, setPlanForm] = useState({ id: '', name: '', price: '300', durationDays: '30', description: '', active: true });
  const [planSaveBusy, setPlanSaveBusy] = useState(false);
  const [planMessage, setPlanMessage] = useState('');
  const [approvalBusyId, setApprovalBusyId] = useState('');
  const [registrationLoadError, setRegistrationLoadError] = useState('');
  const [selectedNgoDetails, setSelectedNgoDetails] = useState<Record<string, unknown> & { id: string } | null>(null);
  const [selectedNgoLoading, setSelectedNgoLoading] = useState(false);
  const openNgoDetails = async (ngoId: string) => {
    setSelectedNgoLoading(true);
    try {
      const snapshot = await getDoc(doc(db, 'ngos', ngoId));
      if (!snapshot.exists()) { notify('NGO की जानकारी नहीं मिली। सूची रीफ़्रेश करें।'); return; }
      setSelectedNgoDetails({ id: snapshot.id, ...snapshot.data() });
    } catch (error) {
      notify(error instanceof Error ? error.message : 'NGO की जानकारी लोड नहीं हुई।');
    } finally { setSelectedNgoLoading(false); }
  };
  const [ngoActionBusy, setNgoActionBusy] = useState(false);
  const changeNgoStatus = async () => {
    if (!authUser || !isSuperAdmin(authUser) || !selectedNgoDetails || ngoActionBusy) return;
    const currentStatus = String(selectedNgoDetails.status || '').toUpperCase();
    const isActive = ['LIVE', 'ACTIVE', 'APPROVED'].includes(currentStatus);
    const nextStatus = isActive ? 'INACTIVE' : 'LIVE';
    const ngoName = String(selectedNgoDetails.name || selectedNgoDetails.ngoName || 'NGO');
    if (!window.confirm(isActive ? `क्या “${ngoName}” को deactivate करना चाहते हैं? यह public NGO सूची से हट जाएगा।` : `क्या “${ngoName}” को फिर से LIVE करना चाहते हैं?`)) return;
    setNgoActionBusy(true);
    try {
      await updateDoc(doc(db, 'ngos', selectedNgoDetails.id), { status: nextStatus, updatedAt: serverTimestamp() });
      setSelectedNgoDetails(current => current ? { ...current, status: nextStatus } : current);
      setLiveNgos(current => current.map(ngo => ngo.id === selectedNgoDetails.id ? { ...ngo, status: nextStatus } : ngo));
      notify(isActive ? 'NGO deactivate कर दिया गया।' : 'NGO फिर से LIVE कर दिया गया।');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'NGO का status बदल नहीं सका। Firestore Rules जाँचें।');
    } finally { setNgoActionBusy(false); }
  };
  const deleteNgoPermanently = async () => {
    if (!authUser || !isSuperAdmin(authUser) || !selectedNgoDetails || ngoActionBusy) return;
    const ngoName = String(selectedNgoDetails.name || selectedNgoDetails.ngoName || 'NGO');
    if (!window.confirm(`चेतावनी: “${ngoName}” का मुख्य NGO रिकॉर्ड स्थायी रूप से delete होगा। यह कार्रवाई वापस नहीं हो सकती। क्या आगे बढ़ें?`)) return;
    if (!window.confirm('आखिरी पुष्टि: क्या आप वाकई इस NGO को हमेशा के लिए delete करना चाहते हैं?')) return;
    setNgoActionBusy(true);
    try {
      await deleteDoc(doc(db, 'ngos', selectedNgoDetails.id));
      setLiveNgos(current => current.filter(ngo => ngo.id !== selectedNgoDetails.id));
      setSelectedNgoDetails(null);
      notify('NGO का मुख्य रिकॉर्ड delete कर दिया गया। संबंधित सदस्य/दान/इवेंट रिकॉर्ड अलग से रह सकते हैं।');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'NGO delete नहीं हुआ। Firestore Rules जाँचें।');
    } finally { setNgoActionBusy(false); }
  };
  const [liveNgos, setLiveNgos] = useState<DashboardNgo[]>([]);
  const [liveMembers, setLiveMembers] = useState<DashboardRecord[]>([]);
  const [liveTransactions, setLiveTransactions] = useState<DashboardRecord[]>([]);
  const [liveEvents, setLiveEvents] = useState<DashboardRecord[]>([]);
  const [liveDocuments, setLiveDocuments] = useState<DashboardRecord[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [adminQrImage, setAdminQrImage] = useState('');
  const [qrSaveBusy, setQrSaveBusy] = useState(false);
  const [qrSaveMessage, setQrSaveMessage] = useState('');
  const [dashboardSlides, setDashboardSlides] = useState<DashboardSlide[]>([]);
  const [dashboardSlideIndex, setDashboardSlideIndex] = useState(0);
  const [slideTitle, setSlideTitle] = useState('');
  const [slideImageData, setSlideImageData] = useState('');
  const [slideSaveBusy, setSlideSaveBusy] = useState(false);
  const [slideMessage, setSlideMessage] = useState('');
  const [tickerMessages, setTickerMessages] = useState<Array<{ id: string; text: string; color: string; createdAt?: unknown }>>([]);
  const [tickerDraft, setTickerDraft] = useState('');
  const [tickerColor, setTickerColor] = useState('rainbow');
  const [tickerBusy, setTickerBusy] = useState(false);
  const [tickerMessage, setTickerMessage] = useState('');

  useEffect(() => {
    if (!authUser || !isSuperAdmin(authUser) || section !== 'subscriptions') return;
    let active = true;
    const unsubscribeQr = onSnapshot(doc(db, 'publicSettings', 'payment'), snapshot => {
      if (active && snapshot.exists() && typeof snapshot.data().qrImage === 'string') setAdminQrImage(snapshot.data().qrImage as string);
    }, () => { if (active) setQrSaveMessage('QR सेटिंग लोड नहीं हुई। Firestore Rules प्रकाशित हैं या नहीं जाँचें।'); });
    const unsubscribePlans = onSnapshot(collection(db, 'subscriptionPlans'), snapshot => {
      if (active) setSubscriptionPlans(snapshot.docs.map(item => ({ id: item.id, name: String(item.data().name || ''), price: Number(item.data().price) || 0, durationDays: Number(item.data().durationDays) || 0, description: String(item.data().description || ''), active: item.data().active === true })));
    }, () => { if (active) setPlanMessage('सब्सक्रिप्शन प्लान लोड नहीं हुए। Firestore Rules जाँचें।'); });
    const unsubscribeRegistrations = onSnapshot(collection(db, 'ngoRegistrations'), snapshot => {
      if (active) setPendingRegistrations(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
    }, () => { if (active) setRegistrationLoadError('रजिस्ट्रेशन लोड नहीं हुए। Firestore rules प्रकाशित हैं या नहीं, जाँचें।'); });
    return () => { active = false; unsubscribeQr(); unsubscribePlans(); unsubscribeRegistrations(); };
  }, [authUser, section]);
  useEffect(() => {
    if (!authUser || !isSuperAdmin(authUser) || !firebaseConfigured) return;
    let active = true;
    const unsubscribeSlides = onSnapshot(collection(db, 'dashboardSlides'), snapshot => {
      if (!active) return;
      const slides = snapshot.docs.map(item => ({ id: item.id, title: String(item.data().title || ''), imageData: String(item.data().imageData || ''), createdAt: item.data().createdAt } as DashboardSlide)).filter(item => item.imageData).sort((a, b) => {
        const at = a.createdAt && typeof (a.createdAt as { toMillis?: () => number }).toMillis === 'function' ? (a.createdAt as { toMillis: () => number }).toMillis() : 0;
        const bt = b.createdAt && typeof (b.createdAt as { toMillis?: () => number }).toMillis === 'function' ? (b.createdAt as { toMillis: () => number }).toMillis() : 0;
        return at - bt;
      });
      setDashboardSlides(slides);
    }, error => { if (active) setSlideMessage(error instanceof Error ? error.message : 'स्लाइड लोड नहीं हुए। Firestore Rules जाँचें।'); });
    return () => { active = false; unsubscribeSlides(); };
  }, [authUser]);
  useEffect(() => {
    if (!authUser || !isSuperAdmin(authUser) || !firebaseConfigured) return;
    let active = true;
    const unsubscribeTicker = onSnapshot(collection(db, 'publicTickerMessages'), snapshot => {
      if (!active) return;
      const rows = snapshot.docs.map(item => ({ id: item.id, text: String(item.data().text || ''), color: String(item.data().color || 'rainbow'), createdAt: item.data().createdAt }));
      rows.sort((a, b) => {
        const at = a.createdAt && typeof (a.createdAt as { toMillis?: () => number }).toMillis === 'function' ? (a.createdAt as { toMillis: () => number }).toMillis() : 0;
        const bt = b.createdAt && typeof (b.createdAt as { toMillis?: () => number }).toMillis === 'function' ? (b.createdAt as { toMillis: () => number }).toMillis() : 0;
        return at - bt;
      });
      setTickerMessages(rows);
    }, () => { if (active) setTickerMessage('सूचना लोड नहीं हुई। Firestore Rules जाँचें।') });
    return () => { active = false; unsubscribeTicker(); };
  }, [authUser]);
  useEffect(() => {
    if (dashboardSlides.length < 2) return;
    const timer = window.setInterval(() => setDashboardSlideIndex(index => (index + 1) % dashboardSlides.length), 5000);
    return () => window.clearInterval(timer);
  }, [dashboardSlides.length]);

  useEffect(() => {
    if (!authUser || !isSuperAdmin(authUser) || !firebaseConfigured) {
      setDashboardLoading(false);
      return;
    }
    let active = true;
    setDashboardLoading(true);
    setDashboardError('');
    const updateNgos = (ngoDocs: any[], members: DashboardRecord[]) => ngoDocs.map(d => {
      const data = d.data();
      return { id: d.id, name: String(data.name || data.ngoName || 'NGO'), type: String(data.type || data.category || data.mission || 'Social organization'), city: String(data.city || data.district || data.location || data.state || '—'), status: String(data.status || 'UNKNOWN'), ownerUid: String(data.ownerUid || ''), people: members.filter(m => m.ngoId === d.id).length };
    });
    let ngoDocs: any[] = [];
    let members: DashboardRecord[] = [];
    let transactions: DashboardRecord[] = [];
    let events: DashboardRecord[] = [];
    let documents: DashboardRecord[] = [];
    const refresh = () => {
      if (!active) return;
      setLiveNgos(updateNgos(ngoDocs, members));
      setLiveMembers(members);
      setLiveTransactions(transactions);
      setLiveEvents(events);
      setLiveDocuments(documents);
      setDashboardLoading(false);
    };
    const unsubscribers = [
      onSnapshot(collection(db, 'ngos'), snap => { ngoDocs = snap.docs; refresh(); }, error => { if (active) setDashboardError(`NGO सूची (ngos): ${error.message}`); }),
      onSnapshot(collection(db, 'ngoMembers'), snap => { members = snap.docs.map(d => ({ id: d.id, ...d.data() } as DashboardRecord)); refresh(); }, error => { if (active) setDashboardError(`सदस्य (ngoMembers): ${error.message}`); }),
      onSnapshot(firestoreQuery(collection(db, 'ngoEvents'), where('approvalStatus', '==', 'APPROVED')), snap => { events = snap.docs.map(d => ({ id: d.id, ...d.data() } as DashboardRecord)); refresh(); }, error => { if (active) setDashboardError(`स्वीकृत कार्यक्रम (ngoEvents): ${error.message}`); }),
      onSnapshot(collection(db, 'ngoDocuments'), snap => { documents = snap.docs.map(d => ({ id: d.id, ...d.data() } as DashboardRecord)); refresh(); }, error => { if (active) setDashboardError(`दस्तावेज़ (ngoDocuments): ${error.message}`); }),
      // Super Admin may view only finance records explicitly published by the NGO.
      // Never subscribe to the full private transactions collection.
      onSnapshot(firestoreQuery(collection(db, 'ngoTransactions'), where('approvalStatus', '==', 'APPROVED')), snap => {
        transactions = snap.docs.map(d => ({ id: d.id, ...d.data() } as DashboardRecord));
        refresh();
      }, error => { if (active) setDashboardError(`स्वीकृत वित्तीय रिकॉर्ड (ngoTransactions): ${error.message}`); }),
    ];
    return () => { active = false; unsubscribers.forEach(unsubscribe => unsubscribe()); };
  }, [authUser]);
  const savePaymentQr = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authUser || !isSuperAdmin(authUser)) return;
    if (!adminQrImage) { setQrSaveMessage('पहले QR इमेज चुनें।'); return; }
    setQrSaveBusy(true); setQrSaveMessage('');
    try {
      await setDoc(doc(db, 'publicSettings', 'payment'), { qrImage: adminQrImage, updatedAt: serverTimestamp(), updatedBy: authUser.email || '' }, { merge: true });
      setQrSaveMessage('UPI QR इमेज सेव हो गई। यह रजिस्ट्रेशन फ़ॉर्म पर दिखाई जाएगी।');
    } catch (error) {
      setQrSaveMessage(error instanceof Error ? error.message : 'QR सेव नहीं हुआ। Firestore Rules जाँचें।');
    } finally { setQrSaveBusy(false); }
  };
  const saveSubscriptionPlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authUser || !isSuperAdmin(authUser)) return;
    const price = Number(planForm.price);
    const durationDays = Number(planForm.durationDays);
    if (!planForm.name.trim() || !Number.isFinite(price) || price <= 0 || !Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650) {
      setPlanMessage('प्लान का नाम, ₹1 या अधिक फीस और 1–3650 दिनों की वैधता भरें।');
      return;
    }
    setPlanSaveBusy(true);
    setPlanMessage('');
    try {
      const payload = { name: planForm.name.trim(), price, durationDays, description: planForm.description.trim(), active: planForm.active, updatedAt: serverTimestamp(), updatedBy: authUser.email || '' };
      if (planForm.id) await updateDoc(doc(db, 'subscriptionPlans', planForm.id), payload);
      else await addDoc(collection(db, 'subscriptionPlans'), { ...payload, createdAt: serverTimestamp(), createdBy: authUser.email || '' });
      const refreshed = await getDocs(collection(db, 'subscriptionPlans'));
      setSubscriptionPlans(refreshed.docs.map(item => ({ id: item.id, name: String(item.data().name || ''), price: Number(item.data().price) || 0, durationDays: Number(item.data().durationDays) || 0, description: String(item.data().description || ''), active: item.data().active === true })));
      setPlanForm({ id: '', name: '', price: '300', durationDays: '30', description: '', active: true });
      setPlanMessage('सब्सक्रिप्शन प्लान सेव हो गया।');
    } catch (error) {
      setPlanMessage(error instanceof Error ? error.message : 'प्लान सेव नहीं हुआ। Firestore Rules जाँचें।');
    } finally { setPlanSaveBusy(false); }
  };
  const toggleSubscriptionPlan = async (plan: SubscriptionPlan) => {
    try {
      await updateDoc(doc(db, 'subscriptionPlans', plan.id), { active: !plan.active, updatedAt: serverTimestamp(), updatedBy: authUser?.email || '' });
      setSubscriptionPlans(current => current.map(item => item.id === plan.id ? { ...item, active: !item.active } : item));
      setPlanMessage(plan.active ? 'प्लान बंद कर दिया गया।' : 'प्लान फिर से सक्रिय है।');
    } catch (error) { setPlanMessage(error instanceof Error ? error.message : 'प्लान की स्थिति बदली नहीं जा सकी।'); }
  };
  const handleQrFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setQrSaveMessage('कृपया JPG, PNG या WebP इमेज चुनें।'); return; }
    if (file.size > 500 * 1024) { setQrSaveMessage('QR इमेज 500 KB से छोटी रखें। जरूरत हो तो इमेज compress करें।'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') { setAdminQrImage(reader.result); setQrSaveMessage('इमेज चुनी गई है। इसे वेबसाइट पर लागू करने के लिए सेव करें।'); }
    };
    reader.onerror = () => setQrSaveMessage('इमेज पढ़ी नहीं जा सकी। दूसरी इमेज चुनें।');
    reader.readAsDataURL(file);
  };
  const approveRegistration = async (registration: Record<string, unknown> & { id: string }) => {
    if (!registration.paymentReference || String(registration.paymentReference).trim().length < 4) {
      notify('पहले UTR/भुगतान संदर्भ लें और बैंक/UPI रिकॉर्ड से सत्यापित करें।');
      return;
    }
    if (!window.confirm('क्या आपने भुगतान को बैंक/UPI रिकॉर्ड से सत्यापित कर लिया है? पुष्टि के बाद NGO LIVE होगा।')) return;
    setApprovalBusyId(registration.id);
    try {
      const registrationRef = doc(db, 'ngoRegistrations', registration.id);
      // A transaction re-checks status on the server, preventing duplicate LIVE NGOs
      // if two admins click Activate at nearly the same time.
      const activatedNgoId = await runTransaction(db, async transaction => {
        const current = await transaction.get(registrationRef);
        if (!current.exists()) throw new Error('रजिस्ट्रेशन नहीं मिला।');
        const data = current.data();
        if (data.status !== 'PENDING_PAYMENT') {
          throw new Error('यह रजिस्ट्रेशन पहले ही प्रोसेस हो चुका है। सूची रीफ़्रेश करें।');
        }
        if (!String(data.paymentReference || '').trim() || String(data.paymentReference).trim().length < 4) {
          throw new Error('भुगतान UTR उपलब्ध नहीं है।');
        }
        const planId = String(data.planId || '');
        if (!planId) throw new Error('इस रजिस्ट्रेशन में प्लान ID नहीं है। इस पुराने रिकॉर्ड को मैन्युअली जाँचें।');
        const planRef = doc(db, 'subscriptionPlans', planId);
        const planSnap = await transaction.get(planRef);
        if (!planSnap.exists()) throw new Error('चुना गया सब्सक्रिप्शन प्लान मौजूद नहीं है।');
        const plan = planSnap.data();
        const price = Number(data.planPrice);
        const durationDays = Number(data.planDurationDays);
        if (!Number.isFinite(price) || price < 0 || !Number.isInteger(durationDays) || durationDays < 1) throw new Error('प्लान की फीस या अवधि सही नहीं है।');
        const startedAt = Timestamp.now();
        const expiresAt = Timestamp.fromMillis(startedAt.toMillis() + durationDays * 24 * 60 * 60 * 1000);
        const ngoRef = doc(collection(db, 'ngos'));
        transaction.set(ngoRef, {
          name: String(data.name || ''),
          ngoName: String(data.name || ''),
          type: 'Social organization',
          description: String(data.mission || ''),
          mission: String(data.mission || ''),
          city: String(data.district || ''),
          district: String(data.district || ''),
          state: String(data.state || ''),
          contactName: String(data.contactName || ''),
          contactEmail: String(data.email || ''),
          contactPhone: String(data.phone || ''),
          imageData: String(data.imageData || ''),
          registrationFormData: { name: String(data.name || ''), contactName: String(data.contactName || ''), email: String(data.email || ''), phone: String(data.phone || ''), state: String(data.state || ''), district: String(data.district || ''), mission: String(data.mission || ''), imageData: String(data.imageData || ''), subscriptionPlan: String(data.subscriptionPlan || plan.name || ''), planPrice: Number(data.planPrice || 0), planDurationDays: Number(data.planDurationDays || 0), paymentReference: String(data.paymentReference || '') },
          status: 'LIVE',
          ownerUid: String(data.ownerUid || ''),
          registrationId: registration.id,
          subscriptionPlanId: planId,
          subscriptionPlanName: String(plan.name || data.subscriptionPlan || ''),
          subscriptionPrice: price,
          subscriptionDurationDays: durationDays,
          subscriptionStartedAt: startedAt,
          subscriptionEndsAt: expiresAt,
          subscriptionStatus: 'ACTIVE',
          memberFee: 0,
          adminWhatsApp: '',
          createdAt: serverTimestamp(),
        });
        transaction.update(registrationRef, {
          status: 'ACTIVE', paymentStatus: 'VERIFIED', activatedNgoId: ngoRef.id,
          verifiedBy: authUser?.email || '', verifiedAt: serverTimestamp(),
          verifiedPlanPrice: price, verifiedPlanDurationDays: durationDays,
          subscriptionStartedAt: startedAt, subscriptionEndsAt: expiresAt,
        });
        return ngoRef.id;
      });
      setPendingRegistrations(current => current.map(item => item.id === registration.id ? { ...item, status: 'ACTIVE', paymentStatus: 'VERIFIED', activatedNgoId } : item));
      notify('भुगतान सत्यापित; NGO LIVE कर दिया गया।');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Approval नहीं हो पाया। Firestore rules प्रकाशित करें।');
    } finally { setApprovalBusyId(''); }
  };
  const submitRegistrationUtr = async (registration: Record<string, unknown> & { id: string }) => {
    if (!authUser || !isSuperAdmin(authUser) || registration.status !== 'PENDING_PAYMENT') return;
    const currentReference = String(registration.paymentReference || '');
    const entered = window.prompt('भुगतान का UTR / Transaction Reference दर्ज करें:', currentReference);
    if (entered === null) return;
    const paymentReference = entered.trim();
    if (paymentReference.length < 4 || paymentReference.length > 80) {
      notify('UTR कम से कम 4 और अधिकतम 80 अक्षरों का होना चाहिए।');
      return;
    }
    try {
      await updateDoc(doc(db, 'ngoRegistrations', registration.id), {
        paymentReference,
        paymentStatus: 'SUBMITTED_FOR_REVIEW',
        paymentReferenceUpdatedAt: serverTimestamp(),
        paymentReferenceUpdatedBy: authUser.email || '',
      });
      setPendingRegistrations(current => current.map(item => item.id === registration.id ? { ...item, paymentReference, paymentStatus: 'SUBMITTED_FOR_REVIEW' } : item));
      notify('UTR सेव हो गया। भुगतान सत्यापित करने के बाद Approve करें।');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'UTR सेव नहीं हुआ। Firestore Rules जाँचें।');
    }
  };
  const rejectRegistration = async (registration: Record<string, unknown> & { id: string }) => {
    if (!authUser || !isSuperAdmin(authUser) || registration.status !== 'PENDING_PAYMENT') return;
    const name = String(registration.name || 'यह NGO');
    if (!window.confirm(`“${name}” का रजिस्ट्रेशन Reject करना चाहते हैं? यह सार्वजनिक LIVE सूची में नहीं आएगा।`)) return;
    setApprovalBusyId(registration.id);
    try {
      await updateDoc(doc(db, 'ngoRegistrations', registration.id), {
        status: 'REJECTED',
        rejectionReason: 'Rejected by Super Admin',
        rejectedBy: authUser.email || '',
        rejectedAt: serverTimestamp(),
      });
      setPendingRegistrations(current => current.map(item => item.id === registration.id ? { ...item, status: 'REJECTED' } : item));
      notify('रजिस्ट्रेशन Reject कर दिया गया।');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'रजिस्ट्रेशन Reject नहीं हुआ। Firestore Rules जाँचें।');
    } finally {
      setApprovalBusyId('');
    }
  };
  const t = copy[language];
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, user => {
      // Any Google account may sign in; admin access is decided separately by role.
      setAuthUser(user);
    });
    // Surface errors from a Google redirect attempt after the browser returns to the site.
    void getRedirectResult(auth).catch(error => {
      const code = typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code || '')
        : '';
      setAuthError('Google लॉगिन पूरा नहीं हुआ (' + (code || 'redirect-error') + ')। Firebase Authentication में Google provider और Authorized domains जाँचें।');
    });
    return unsubscribe;
  }, []);
  useEffect(() => {
    // NGO owners should land in their main management dashboard after login,
    // regardless of whether they started from the homepage or the older admin URL.
    // Platform administrators keep the platform dashboard and can still review all NGOs.
    if (!authUser || isSuperAdmin(authUser)) return;
    const path = window.location.pathname;
    // Keep the legacy NGO Admin route available: it contains the membership application review screen.
    // Only send owners from the homepage to their workspace; redirecting /ngo-admin hides its own page.
    if (path === '/') {
      window.location.replace('/ngo-workspace');
    }
  }, [authUser]);
  const loginAsSuperAdmin = async () => {
    if (!auth) return;
    setAuthError('');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      const code = typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code || '')
        : '';
      // If the browser closes/blocks the popup, retry with a full-page redirect.
      if (['auth/popup-closed-by-user', 'auth/popup-blocked', 'auth/cancelled-popup-request'].includes(code)) {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectError) {
          const redirectCode = typeof redirectError === 'object' && redirectError !== null && 'code' in redirectError
            ? String((redirectError as { code?: unknown }).code || '')
            : '';
          setAuthError('Google लॉगिन विफल (' + (redirectCode || 'redirect-error') + ')। Firebase Authentication → Settings → Authorized domains में इस वेबसाइट का domain जोड़ें।');
          return;
        }
      }
      setAuthError('Google लॉगिन विफल (' + (code || 'unknown-error') + ')। Firebase Authentication में Google provider और Authorized domains जाँचें।');
    }
  };
  const filteredNgos = useMemo(() => liveNgos.filter(n => `${n.name} ${n.type} ${n.city}`.toLowerCase().includes(query.toLowerCase())), [liveNgos, query]);
  const totalDonations = liveTransactions.filter(row => String(row.type || '').toUpperCase() === 'DONATION').reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const totalExpenses = liveTransactions.filter(row => String(row.type || '').toUpperCase() === 'EXPENSE').reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const activeEvents = liveEvents.filter(row => !['CANCELLED', 'COMPLETED'].includes(String(row.status || '').toUpperCase())).length;
  const recentItems: Array<DashboardRecord & { kind: string; when: Date | null }> = [
    ...liveTransactions.map(row => ({ ...row, kind: 'transaction', when: row.createdAt?.toDate?.() || (row.date ? new Date(String(row.date)) : null) })),
    ...liveMembers.map(row => ({ ...row, kind: 'member', when: row.createdAt?.toDate?.() || null })),
    ...liveEvents.map(row => ({ ...row, kind: 'event', when: row.createdAt?.toDate?.() || (row.date ? new Date(String(row.date)) : null) })),
    ...liveDocuments.map(row => ({ ...row, kind: 'document', when: row.createdAt?.toDate?.() || null })),
  ].sort((a, b) => (b.when?.getTime?.() || 0) - (a.when?.getTime?.() || 0)).slice(0, 5);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 3800); };
  const chooseSection = (id: Section) => { setSection(id); setMobileMenu(false); };
  const submitRegistration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authUser || !authUser.email || !firebaseConfigured) { notify(language === 'hi' ? 'लॉगिन या Firebase सेटअप जाँचें।' : 'Check sign-in and Firebase configuration.'); return; }
    try {
      const ref = await addDoc(collection(db, 'ngoRegistrations'), {
        name: form.name.trim(), contactName: form.contact.trim(), email: authUser.email,
        phone: form.phone.trim(), state: form.state, district: form.district.trim(), mission: form.mission.trim(), imageData: ngoImageData,
        planId: form.planId || subscriptionPlans.find(p => p.active)?.id || '',
        subscriptionPlan: subscriptionPlans.find(p => p.id === (form.planId || subscriptionPlans.find(p => p.active)?.id))?.name || '',
        planPrice: subscriptionPlans.find(p => p.id === (form.planId || subscriptionPlans.find(p => p.active)?.id))?.price || 0,
        planDurationDays: subscriptionPlans.find(p => p.id === (form.planId || subscriptionPlans.find(p => p.active)?.id))?.durationDays || 0,
        paymentReference: '', status: 'PENDING_PAYMENT', paymentStatus: 'NOT_SUBMITTED', ownerUid: authUser.uid, createdAt: serverTimestamp(),
      });
      setPendingRegistrations(current => [{ id: ref.id, name: form.name.trim(), contactName: form.contact.trim(), email: authUser.email, phone: form.phone.trim(), state: form.state, mission: form.mission.trim(), planId: form.planId || subscriptionPlans.find(p => p.active)?.id || '', subscriptionPlan: subscriptionPlans.find(p => p.id === (form.planId || subscriptionPlans.find(p => p.active)?.id))?.name || '', planPrice: subscriptionPlans.find(p => p.id === (form.planId || subscriptionPlans.find(p => p.active)?.id))?.price || 0, planDurationDays: subscriptionPlans.find(p => p.id === (form.planId || subscriptionPlans.find(p => p.active)?.id))?.durationDays || 0, paymentReference: '', status: 'PENDING_PAYMENT', paymentStatus: 'NOT_SUBMITTED', ownerUid: authUser.uid }, ...current]);
      notify(language === 'hi' ? 'NGO रजिस्ट्रेशन Firebase में सेव हुआ। UPI भुगतान और सत्यापन के बाद ही सक्रिय होगा।' : 'NGO registration saved to Firebase. It activates only after payment and verification.');
      setShowRegistration(false);
      setForm({ name: '', contact: '', email: authUser.email, phone: '', state: '', district: '', mission: '', planId: '' });
      setNgoImageData('');
    } catch (error) {
      notify(error instanceof Error ? error.message : (language === 'hi' ? 'रजिस्ट्रेशन सेव नहीं हुआ। Firestore Rules जाँचें।' : 'Registration failed. Check Firestore rules.'));
    }
  };
  const saveTickerMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authUser || !isSuperAdmin(authUser) || !tickerDraft.trim()) { setTickerMessage('पहले सूचना का टेक्स्ट लिखें।'); return; }
    setTickerBusy(true);
    setTickerMessage('');
    try {
      const textValue = tickerDraft.trim().slice(0, 300);
      const ref = await addDoc(collection(db, 'publicTickerMessages'), { text: textValue, color: tickerColor, createdAt: serverTimestamp(), createdBy: authUser.email || '' });
      setTickerMessages(current => [...current, { id: ref.id, text: textValue, color: tickerColor }]);
      setTickerDraft('');
      setTickerMessage('सूचना वेबसाइट पर जोड़ दी गई।');
    } catch (error) { setTickerMessage(error instanceof Error ? error.message : 'सूचना सेव नहीं हुई। Firestore Rules जाँचें।'); }
    finally { setTickerBusy(false); }
  };
  const deleteTickerMessage = async (item: { id: string; text: string }) => {
    if (!authUser || !isSuperAdmin(authUser)) return;
    if (!window.confirm('यह सूचना वेबसाइट से हटाएँ?')) return;
    try {
      await deleteDoc(doc(db, 'publicTickerMessages', item.id));
      setTickerMessages(current => current.filter(row => row.id !== item.id));
      setTickerMessage('सूचना हटा दी गई।');
    } catch (error) { setTickerMessage(error instanceof Error ? error.message : 'सूचना हटाई नहीं जा सकी।'); }
  };
  const saveDashboardSlide = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authUser || !isSuperAdmin(authUser) || !slideImageData) { setSlideMessage('पहले इमेज चुनें।'); return; }
    setSlideSaveBusy(true);
    setSlideMessage('');
    try {
      const ref = await addDoc(collection(db, 'dashboardSlides'), { title: slideTitle.trim(), imageData: slideImageData, createdAt: serverTimestamp(), createdBy: authUser.email || '' });
      setDashboardSlides(current => [...current, { id: ref.id, title: slideTitle.trim(), imageData: slideImageData }]);
      setDashboardSlideIndex(dashboardSlides.length);
      setSlideTitle('');
      setSlideImageData('');
      setSlideMessage('इमेज स्लाइडर में सेव हो गई।');
    } catch (error) { setSlideMessage(error instanceof Error ? error.message : 'इमेज सेव नहीं हुई। Firestore Rules जाँचें।'); }
    finally { setSlideSaveBusy(false); }
  };
  const deleteDashboardSlide = async (slide: DashboardSlide) => {
    if (!authUser || !isSuperAdmin(authUser)) {
      setSlideMessage('केवल Super Admin स्लाइड हटा सकता है।');
      return;
    }
    const label = slide.title.trim() || 'यह इमेज';
    if (!window.confirm(`“${label}” स्लाइड हटाएँ? यह कार्रवाई वापस नहीं होगी।`)) return;
    try {
      await deleteDoc(doc(db, 'dashboardSlides', slide.id));
      setDashboardSlides(current => {
        const removedIndex = current.findIndex(item => item.id === slide.id);
        const remaining = current.filter(item => item.id !== slide.id);
        setDashboardSlideIndex(index => {
          if (remaining.length === 0) return 0;
          if (removedIndex >= 0 && index > removedIndex) return index - 1;
          return Math.min(index, remaining.length - 1);
        });
        return remaining;
      });
      setSlideMessage(`“${label}” स्लाइड हटा दी गई।`);
    } catch (error) {
      setSlideMessage(error instanceof Error ? error.message : 'स्लाइड हटाई नहीं जा सकी। Firestore Rules जाँचें।');
    }
  };
  const pageTitle = nav.find(item => item.id === section)?.key ?? 'overview';

  if (window.location.pathname.startsWith('/privacy-policy')) return <PrivacyPolicyPage language={language} setLanguage={setLanguage} />;
  if (window.location.pathname === '/about') return <PublicInfoPage language={language} setLanguage={setLanguage} page="about" />;
  if (window.location.pathname === '/features') return <PublicInfoPage language={language} setLanguage={setLanguage} page="features" />;
  if (window.location.pathname === '/contact') return <PublicInfoPage language={language} setLanguage={setLanguage} page="contact" />;
  if (window.location.pathname.startsWith('/member-verify')) return <MemberVerifyPage />;
  if (window.location.pathname.startsWith('/ngo-workspace')) {
    if (authUser) return <NgoWorkspacePortal authUser={authUser} language={language} />;
    return <main className="member-portal"><section className="member-portal-hero"><span>ALL NGO CONNECT</span><h1>{language === 'hi' ? 'NGO Admin लॉगिन' : 'NGO Admin sign in'}</h1><p>{language === 'hi' ? 'अपने NGO के owner Google खाते से लॉगिन करें।' : 'Sign in with the Google account that owns your NGO.'}</p><button className="primary-button" onClick={() => void loginAsSuperAdmin()} disabled={!firebaseConfigured}><Globe2 size={17}/> {language === 'hi' ? 'Google से लॉगिन करें' : 'Continue with Google'}</button>{authError && <p className="member-notice" role="alert">{authError}</p>}</section></main>;
  }
  const publicNgoMatch = window.location.pathname.match(/^\/ngo\/([^/]+)\/?$/);
  if (publicNgoMatch) return <PublicNgoSite language={language} setLanguage={setLanguage} ngoId={decodeURIComponent(publicNgoMatch[1])} authUser={authUser} onLogin={loginAsSuperAdmin} />;
  if (window.location.pathname.startsWith('/ngo-list')) return <PublicNgoList language={language} setLanguage={setLanguage} />;
  if (window.location.pathname.startsWith('/members')) return <MemberIDPortal authUser={authUser} onLogin={loginAsSuperAdmin} language={language} />;
  if (window.location.pathname.startsWith('/ngo-admin')) {
    if (authUser) return <NgoAdminPortal authUser={authUser} language={language} />;
    return <main className="member-portal">
      <header className="member-portal-header"><a className="member-brand" href="/">All NGO Connect</a><a className="outline-button" href="/">होम</a></header>
      <section className="member-portal-hero"><span>NGO ADMIN</span><h1>{language === 'hi' ? 'NGO Admin लॉगिन' : 'NGO Admin sign in'}</h1><p>{language === 'hi' ? 'अपने NGO के मालिक वाले Google खाते से लॉगिन करें।' : 'Sign in with the Google account that owns your NGO.'}</p>
        <button className="primary-button" onClick={() => void loginAsSuperAdmin()} disabled={!firebaseConfigured}><Globe2 size={17}/> {language === 'hi' ? 'Google से लॉगिन करें' : 'Continue with Google'}</button>
        {authError && <p className="member-notice" role="alert">{authError}</p>}
      </section>
    </main>;
  }
  if (!authUser || !isSuperAdmin(authUser)) return <PublicHome language={language} setLanguage={setLanguage} authUser={authUser} onLogin={loginAsSuperAdmin} onLogout={() => { if (auth) void signOut(auth); }} authError={authError} />;
  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Leaf size={22} strokeWidth={2.4} /></div><div><div className="brand-name">All NGO Connect</div><div className="brand-caption">{t.tagline}</div></div><button className="icon-button close-menu" onClick={() => setMobileMenu(false)} aria-label="Close menu"><X size={19}/></button></div>
      <div className="workspace-label">{t.platform}</div>
      <nav className="side-nav">{nav.map(item => <button key={item.id} className={`nav-item ${section === item.id ? 'nav-active' : ''}`} onClick={() => chooseSection(item.id)}><item.icon size={19}/><span>{t[item.key]}</span>{item.id === 'subscriptions' && <span className="nav-dot"/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={19}/></div><div><strong>{language === 'hi' ? 'मदद चाहिए?' : 'Need a hand?'}</strong><p>{language === 'hi' ? 'सेटअप गाइड देखें' : 'Explore the setup guide'}</p></div><ChevronDown size={15}/></div><div className="profile-row"><div className="avatar avatar-admin">NC</div><div className="profile-info"><strong>{language === 'hi' ? 'प्लेटफ़ॉर्म एडमिन' : 'Platform Admin'}</strong><span>{authUser?.email ?? 'Firebase connected'}</span></div></div></div>
    </aside>
    {mobileMenu && <button className="mobile-scrim" onClick={() => setMobileMenu(false)} aria-label="Close navigation"/>}
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="icon-button menu-button" onClick={() => setMobileMenu(true)} aria-label="Open menu"><Menu size={21}/></button><div className="breadcrumb">{t.dashboard}<span>/</span><strong>{t[pageTitle]}</strong></div></div><div className="topbar-actions"><label className="search-box"><Search size={17}/><input placeholder={t.search} value={query} onChange={e => setQuery(e.target.value)} aria-label={t.search}/><kbd>⌘ K</kbd></label><button className="language-button" onClick={() => setLanguage(language === 'hi' ? 'en' : 'hi')}><Globe2 size={17}/>{language === 'hi' ? 'हिन्दी' : 'English'}<ChevronDown size={14}/></button><button className="notification-button" aria-label="Notifications" onClick={() => notify(language === 'hi' ? 'अभी कोई नई सूचना नहीं है।' : 'No new notifications yet.')}><Bell size={19}/><span/></button><button className="outline-button topbar-logout" onClick={() => { if (auth) void signOut(auth); }}><LogOut size={16}/>{language === 'hi' ? 'लॉगआउट' : 'Sign out'}</button></div></header>
      <div className="page-content">
        <div className="eyebrow"><span className="eyebrow-dot"/>{language === 'hi' ? 'लाइव Firebase डेटा' : 'Live Firebase data'}<span className="eyebrow-line"/></div>
        <section className="welcome-row"><div><h1>{section === 'overview' ? t.welcome : t[pageTitle]}</h1><p>{section === 'overview' ? t.intro : t.activityText}</p></div><button className="primary-button" onClick={() => setShowRegistration(true)}><Plus size={18}/>{t.register}</button></section>
        {!firebaseConfigured && <div className="setup-banner"><div className="setup-icon"><ShieldCheck size={20}/></div><div className="setup-copy"><strong>{t.setup}</strong><p>{t.setupText}</p></div><a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer">{t.seeSetup}<ArrowUpRight size={15}/></a></div>}
        {section === 'subscriptions' && <><section className="panel directory-panel">
          <div className="panel-heading"><div><h3>सब्सक्रिप्शन प्लान सेटिंग</h3><p>फीस और वैधता आप तय करें। केवल सक्रिय प्लान नए रजिस्ट्रेशन में दिखेंगे।</p></div><button type="button" className="outline-button" onClick={() => setPlanForm({ id: '', name: '', price: '300', durationDays: '30', description: '', active: true })}>नया प्लान</button></div>
          <form className="qr-admin-form" onSubmit={saveSubscriptionPlan}>
            <label>प्लान का नाम *<input required maxLength={80} value={planForm.name} onChange={e => setPlanForm({...planForm, name:e.target.value})} placeholder="जैसे Basic, Standard, Premium"/></label>
            <div className="form-two-col"><label>फीस (₹) *<input required type="number" min="1" step="1" value={planForm.price} onChange={e => setPlanForm({...planForm, price:e.target.value})}/></label><label>वैधता (दिन) *<input required type="number" min="1" max="3650" step="1" value={planForm.durationDays} onChange={e => setPlanForm({...planForm, durationDays:e.target.value})}/></label></div>
            <label>प्लान की जानकारी<textarea rows={2} maxLength={500} value={planForm.description} onChange={e => setPlanForm({...planForm, description:e.target.value})} placeholder="इस प्लान में क्या सुविधाएँ मिलेंगी?"/></label>
            <label><input type="checkbox" checked={planForm.active} onChange={e => setPlanForm({...planForm, active:e.target.checked})}/> नए NGO रजिस्ट्रेशन के लिए सक्रिय</label>
            {planMessage && <p role="status" className="qr-save-message">{planMessage}</p>}
            <div className="modal-actions"><button className="primary-button" type="submit" disabled={planSaveBusy}>{planSaveBusy ? 'सेव हो रहा है…' : planForm.id ? 'प्लान अपडेट करें' : 'प्लान बनाएँ'}</button>{planForm.id && <button type="button" className="outline-button" onClick={() => setPlanForm({ id: '', name: '', price: '300', durationDays: '30', description: '', active: true })}>रद्द करें</button>}</div>
          </form>
          {subscriptionPlans.length === 0 ? <div className="empty-state">अभी कोई प्लान नहीं है। पहला प्लान बनाएँ।</div> : <div className="ngo-table-wrap"><table className="ngo-table"><thead><tr><th>प्लान</th><th>फीस</th><th>वैधता</th><th>स्थिति</th><th>कार्रवाई</th></tr></thead><tbody>{subscriptionPlans.map(plan => <tr key={plan.id}><td><strong>{plan.name}</strong><br/><span className="table-muted">{plan.description}</span></td><td>₹{plan.price.toLocaleString('en-IN')}</td><td>{plan.durationDays} दिन</td><td><span className={`status-pill ${plan.active ? 'pill-active' : 'pill-pending'}`}>{plan.active ? 'ACTIVE' : 'INACTIVE'}</span></td><td><button type="button" className="outline-button" onClick={() => setPlanForm({ id: plan.id, name: plan.name, price: String(plan.price), durationDays: String(plan.durationDays), description: plan.description, active: plan.active })}>बदलें</button> <button type="button" className="outline-button" onClick={() => void toggleSubscriptionPlan(plan)}>{plan.active ? 'बंद करें' : 'सक्रिय करें'}</button></td></tr>)}</tbody></table></div>}
        </section><section className="panel directory-panel payment-qr-admin"><div className="panel-heading"><div><h3>UPI QR इमेज सेटिंग</h3><p>यह QR NGO रजिस्ट्रेशन फ़ॉर्म में सभी यूज़र को दिखेगा।</p></div></div><form onSubmit={savePaymentQr} className="qr-admin-form"><label>QR कोड इमेज अपलोड करें (JPG / PNG / WebP, अधिकतम 500 KB)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => handleQrFile(e.target.files?.[0])}/></label>{adminQrImage && <img className="admin-qr-preview" src={adminQrImage} alt="UPI QR preview"/>}{qrSaveMessage && <p role="status" className="qr-save-message">{qrSaveMessage}</p>}<button className="primary-button" type="submit" disabled={qrSaveBusy || !adminQrImage}>{qrSaveBusy ? 'सेव हो रहा है…' : 'QR इमेज सेव करें'}</button></form></section><section className="panel directory-panel"><div className="panel-heading"><div><h3>NGO रजिस्ट्रेशन और भुगतान जाँच</h3><p>UTR को बैंक/UPI रिकॉर्ड से मिलाने के बाद ही Activate करें।</p></div><span className="status-pill pill-pending">{pendingRegistrations.filter(item => item.status === 'PENDING_PAYMENT').length} Pending</span></div>{registrationLoadError && <p role="alert">{registrationLoadError}</p>}{pendingRegistrations.length === 0 ? <div className="empty-state">अभी कोई रजिस्ट्रेशन नहीं मिला। Firebase में rules प्रकाशित करें और नए रजिस्ट्रेशन आने दें।</div> : <div className="ngo-table-wrap"><table className="ngo-table"><thead><tr><th>NGO</th><th>संपर्क</th><th>प्लान</th><th>UTR / स्थिति</th><th>कार्रवाई</th></tr></thead><tbody>{pendingRegistrations.map(item => <tr key={item.id}><td><strong>{String(item.name || 'नाम नहीं')}</strong><br/><span className="table-muted">जिला: {String(item.district || 'नहीं दिया')} · राज्य: {String(item.state || 'नहीं दिया')}</span><br/><span className="table-muted">उद्देश्य: {String(item.mission || 'नहीं दिया')}</span></td><td>{String(item.contactName || 'नहीं दिया')}<br/><span className="table-muted">{String(item.email || 'ईमेल नहीं दिया')} · {String(item.phone || 'फोन नहीं दिया')}</span></td><td>{String(item.subscriptionPlan || '')}<br/><span className="table-muted">₹{Number(item.planPrice || 0).toLocaleString('en-IN')} / {Number(item.planDurationDays || 0)} दिन</span></td><td>{String(item.paymentReference || 'UTR नहीं दिया')}<br/><span className="table-muted">{String(item.paymentStatus || item.status || '')}</span></td><td>{item.status === 'PENDING_PAYMENT' ? <button className="primary-button" disabled={approvalBusyId === item.id} onClick={() => void approveRegistration(item)}>{approvalBusyId === item.id ? 'जाँच…' : 'भुगतान सत्यापित कर Activate'}</button> : <span className="status-pill pill-active">LIVE / VERIFIED</span>}</td></tr>)}</tbody></table></div>}</section></>}
        {section === 'overview' && <>
          {dashboardError && <div className="setup-banner" role="alert"><div className="setup-icon"><ShieldCheck size={20}/></div><div className="setup-copy"><strong>Firebase डेटा लोड नहीं हुआ</strong><p>{dashboardError}</p></div></div>}
          {dashboardLoading && <div className="empty-state">Firebase से असली डेटा लोड हो रहा है…</div>}
          {!dashboardLoading && !dashboardError && <section className="dashboard-slider-panel" aria-label="Dashboard image slider">
            {dashboardSlides.length > 0 ? <><img className="dashboard-slide-image" src={dashboardSlides[dashboardSlideIndex % dashboardSlides.length].imageData} alt={dashboardSlides[dashboardSlideIndex % dashboardSlides.length].title || 'All NGO Connect banner'} /><div className="dashboard-slide-shade"/><div className="dashboard-slide-caption"><span className="dashboard-slide-kicker"><HeartHandshake size={15}/> ALL NGO CONNECT</span>{dashboardSlides[dashboardSlideIndex % dashboardSlides.length].title && <h2>{dashboardSlides[dashboardSlideIndex % dashboardSlides.length].title}</h2>}<p>{language === 'hi' ? 'बेहतर बदलाव के लिए साथ आएँ।' : 'Together for better impact.'}</p></div>{dashboardSlides.length > 1 && <><button className="dashboard-slide-arrow slide-prev" aria-label="Previous slide" onClick={() => setDashboardSlideIndex(index => (index - 1 + dashboardSlides.length) % dashboardSlides.length)}><ChevronLeft size={23}/></button><button className="dashboard-slide-arrow slide-next" aria-label="Next slide" onClick={() => setDashboardSlideIndex(index => (index + 1) % dashboardSlides.length)}><ChevronRight size={23}/></button><div className="dashboard-slide-dots">{dashboardSlides.map((slide, index) => <button key={slide.id} aria-label={`Slide ${index + 1}`} className={index === dashboardSlideIndex ? 'active' : ''} onClick={() => setDashboardSlideIndex(index)}/>)}</div></>}</> : <div className="dashboard-slide-empty"><div className="dashboard-slide-empty-icon"><ImagePlus size={36}/></div><h2>{language === 'hi' ? 'अपनी NGO की कहानी दिखाएँ' : 'Show your NGO story'}</h2><p>{language === 'hi' ? 'सुपर एडमिन यहाँ अपनी पसंद की तस्वीरें जोड़ सकता है।' : 'The Super Admin can add any images here.'}</p></div>}
            <div className="dashboard-slide-admin"><form onSubmit={saveDashboardSlide} className="dashboard-slide-upload-form"><label className="dashboard-slide-title-label"><span>{language === 'hi' ? 'स्लाइड का शीर्षक (वैकल्पिक)' : 'Slide title (optional)'}</span><input value={slideTitle} maxLength={100} onChange={event => setSlideTitle(event.target.value)} placeholder={language === 'hi' ? 'जैसे: हमारी नई पहल' : 'e.g. Our latest initiative'}/></label><label className="dashboard-slide-file-button"><ImagePlus size={17}/><span>{slideImageData ? (language === 'hi' ? 'इमेज चुनी गई' : 'Image selected') : (language === 'hi' ? 'इमेज चुनें' : 'Choose image')}</span><input type="file" accept="image/*" onChange={async event => { const input = event.currentTarget; const file = input.files?.[0]; if (!file) return; setSlideMessage('इमेज तैयार हो रही है…'); try { setSlideImageData(await compressDashboardImage(file)); setSlideMessage('इमेज तैयार है। सेव करें।'); } catch (error) { setSlideMessage(error instanceof Error ? error.message : 'इमेज तैयार नहीं हुई।'); } input.value = ''; }}/></label><button type="submit" className="dashboard-slide-save-button" disabled={slideSaveBusy || !slideImageData}>{slideSaveBusy ? (language === 'hi' ? 'सेव हो रहा है…' : 'Saving…') : (language === 'hi' ? 'स्लाइड जोड़ें' : 'Add slide')}<Plus size={16}/></button></form>{slideMessage && <p className="dashboard-slide-message" role="status">{slideMessage}</p>}{dashboardSlides.length > 0 && <div className="dashboard-slide-manage-list"><span>{language === 'hi' ? `कुल ${dashboardSlides.length} स्लाइड` : `${dashboardSlides.length} slides total`}</span>{dashboardSlides.map((slide, index) => <div key={slide.id}><button type="button" className={index === dashboardSlideIndex ? 'selected' : ''} onClick={() => setDashboardSlideIndex(index)}>{slide.title || (language === 'hi' ? `इमेज ${index + 1}` : `Image ${index + 1}`)}</button><button type="button" aria-label="Delete slide" onClick={() => void deleteDashboardSlide(slide)}><Trash2 size={14}/></button></div>)}</div>}</div>
          </section>}
          <section className="ticker-admin-panel">
            <div className="ticker-admin-heading"><div><span className="modal-eyebrow">HOMEPAGE MESSAGE BAR</span><h2>रंगीन स्क्रॉलिंग टेक्स्ट</h2><p>यह सूचना होम पेज पर हेडिंग के नीचे अपने-आप चलेगी। इसे केवल Super Admin जोड़ या हटा सकता है।</p></div></div>
            <form className="ticker-admin-form" onSubmit={saveTickerMessage}>
              <label>सूचना का टेक्स्ट<input value={tickerDraft} onChange={event => setTickerDraft(event.target.value)} maxLength={300} placeholder="जैसे: NGO रजिस्ट्रेशन शुरू है — आज ही जुड़ें" required /></label>
              <label>रंग<select value={tickerColor} onChange={event => setTickerColor(event.target.value)}><option value="rainbow">रंग-बिरंगा</option><option value="blue">नीला</option><option value="green">हरा</option><option value="orange">नारंगी</option><option value="purple">बैंगनी</option></select></label>
              <button type="submit" className="primary-button" disabled={tickerBusy || !tickerDraft.trim()}>{tickerBusy ? 'सेव हो रहा है…' : 'टेक्स्ट जोड़ें'} <Plus size={16}/></button>
            </form>
            {tickerMessage && <p className="ticker-admin-message" role="status">{tickerMessage}</p>}
            <div className="ticker-admin-list">{tickerMessages.length ? tickerMessages.map(item => <div className="ticker-admin-row" key={item.id}><span className={'ticker-admin-swatch ticker-tone-' + item.color}/><p>{item.text}</p><button type="button" className="icon-button" onClick={() => void deleteTickerMessage(item)} aria-label="सूचना हटाएँ"><Trash2 size={17}/></button></div>) : <p className="ticker-admin-empty">अभी कोई स्क्रॉलिंग सूचना नहीं है।</p>}</div>
          </section>
          <section className="stats-grid"><article className="stat-card"><div className="stat-top"><span>{t.totalDonations}</span><span className="stat-icon icon-green"><HandCoins size={19}/></span></div><div className="stat-number">₹{totalDonations.toLocaleString('en-IN')}</div><div className="stat-foot"><span className="trend neutral">{liveTransactions.filter(row => String(row.type || '').toUpperCase() === 'DONATION').length}</span><span>{language === 'hi' ? 'दान रिकॉर्ड' : 'donation records'}</span></div></article><article className="stat-card"><div className="stat-top"><span>{t.expenses}</span><span className="stat-icon icon-orange"><Wallet size={19}/></span></div><div className="stat-number">₹{totalExpenses.toLocaleString('en-IN')}</div><div className="stat-foot"><span className="trend neutral">{liveTransactions.filter(row => String(row.type || '').toUpperCase() === 'EXPENSE').length}</span><span>{language === 'hi' ? 'खर्च रिकॉर्ड' : 'expense records'}</span></div></article><article className="stat-card"><div className="stat-top"><span>{t.membersCount}</span><span className="stat-icon icon-purple"><Users size={19}/></span></div><div className="stat-number">{liveMembers.length}</div><div className="stat-foot"><span className="trend neutral">{liveMembers.filter(row => String(row.role || '').toUpperCase() === 'VOLUNTEER').length}</span><span>{t.volunteers}</span></div></article><article className="stat-card"><div className="stat-top"><span>{t.programs}</span><span className="stat-icon icon-blue"><CalendarDays size={19}/></span></div><div className="stat-number">{liveEvents.length}</div><div className="stat-foot"><span className="trend neutral">{activeEvents} {t.active.toLowerCase()}</span><span>{t.month}</span></div></article></section>
          <section className="content-grid"><div className="panel activity-panel"><div className="panel-heading"><div><h3>{t.recent}</h3><p>{language === 'hi' ? 'Firebase में सेव हाल के रिकॉर्ड' : 'Recent records saved in Firebase'}</p></div><button className="text-button" onClick={() => chooseSection('finance')}>{t.viewAll}<ArrowUpRight size={15}/></button></div><div className="activity-list">{recentItems.length === 0 ? <div className="empty-state">{t.noData}</div> : recentItems.map(row => <div className="activity-item" key={row.kind + row.id}><div className={`activity-icon ${row.kind === 'transaction' ? 'activity-donation' : row.kind === 'member' ? 'activity-member' : row.kind === 'event' ? 'activity-event' : 'activity-doc'}`}>{row.kind === 'transaction' ? <HandCoins size={17}/> : row.kind === 'member' ? <Users size={17}/> : row.kind === 'event' ? <CalendarDays size={17}/> : <FileBadge size={17}/>}</div><div className="activity-description"><strong>{String(row.name || row.title || row.category || (row.kind === 'transaction' ? row.type : row.kind === 'member' ? (language === 'hi' ? 'नया सदस्य' : 'Member record') : 'Record'))}</strong><span>{String(row.ngoName || liveNgos.find(n => n.id === row.ngoId)?.name || 'NGO')} · {row.when && !Number.isNaN(row.when.getTime()) ? row.when.toLocaleString(language === 'hi' ? 'hi-IN' : 'en-IN') : (language === 'hi' ? 'तारीख उपलब्ध नहीं' : 'Date unavailable')}</span></div><div className="activity-amount">{row.kind === 'transaction' ? (String(row.type).toUpperCase() === 'DONATION' ? '+' : '−') + '₹' + (Number(row.amount) || 0).toLocaleString('en-IN') : String(row.status || '')}</div></div>)}</div></div>
          <div className="panel quick-panel"><div className="panel-heading"><div><h3>{t.quick}</h3><p>{language === 'hi' ? 'काम जल्दी शुरू करें' : 'Get things moving'}</p></div><div className="panel-heading-icon"><ClipboardList size={18}/></div></div><div className="quick-actions"><button onClick={() => setShowRegistration(true)}><span className="quick-icon quick-green"><HeartHandshake size={19}/></span><span><b>{t.register}</b><small>{language === 'hi' ? 'नई संस्था जोड़ें' : 'Add a new organization'}</small></span><Plus size={16}/></button><button onClick={() => chooseSection('members')}><span className="quick-icon quick-purple"><Users size={19}/></span><span><b>{t.addMember}</b><small>{language === 'hi' ? 'टीम में लोगों को जोड़ें' : 'Grow your team'}</small></span><Plus size={16}/></button><button onClick={() => chooseSection('finance')}><span className="quick-icon quick-yellow"><HandCoins size={19}/></span><span><b>{t.recordDonation}</b><small>{language === 'hi' ? 'दान और खर्च का हिसाब' : 'Track contributions'}</small></span><Plus size={16}/></button><button onClick={() => chooseSection('events')}><span className="quick-icon quick-blue"><CalendarDays size={19}/></span><span><b>{t.createEvent}</b><small>{language === 'hi' ? 'अगला कार्यक्रम प्लान करें' : 'Plan what comes next'}</small></span><Plus size={16}/></button></div></div></section>
          <section className="panel directory-panel"><div className="panel-heading"><div><h3>{t.directory}</h3><p>{language === 'hi' ? 'Firebase में सेव संस्थाएँ' : 'Organizations saved in Firebase'}</p></div><button className="text-button" onClick={() => chooseSection('ngos')}>{t.viewAll}<ArrowUpRight size={15}/></button></div><div className="ngo-table-wrap"><table className="ngo-table"><thead><tr><th>{language === 'hi' ? 'संस्था' : 'Organization'}</th><th>{language === 'hi' ? 'स्थान' : 'Location'}</th><th>{t.membersCount}</th><th>{t.status}</th><th/></tr></thead><tbody>{filteredNgos.slice(0,3).map(ngo => <tr key={ngo.id}><td><div className="ngo-name-cell"><div className="ngo-logo mint">{ngo.name.slice(0,2).toUpperCase()}</div><div><strong>{ngo.name}</strong><span>{ngo.type}</span></div></div></td><td className="table-muted">{ngo.city}</td><td><span className="people-count"><Users size={14}/>{ngo.people}</span></td><td><span className={`status-pill ${['LIVE','ACTIVE','APPROVED'].includes(ngo.status.toUpperCase()) ? 'pill-active' : 'pill-pending'}`}><i/>{ngo.status}</span></td><td><button className="small-icon-button" aria-label={`Open ${ngo.name}`} onClick={() => { window.location.href = '/ngo-workspace'; }}><ArrowUpRight size={16}/></button></td></tr>)}</tbody></table>{filteredNgos.length === 0 && <div className="empty-state">{t.noData}</div>}</div></section>
        </>}
        {section !== 'overview' && <section className="section-view"><div className="section-intro"><div className="section-icon"><>{nav.find(n => n.id === section)?.icon && (() => { const Icon = nav.find(n => n.id === section)!.icon; return <Icon size={26}/>; })()}</></div><div><h2>{t[pageTitle]}</h2><p>{section === 'subscriptions' ? 'NGO registration and payment verification status from Firebase.' : (language === 'hi' ? 'यह सूची Firebase के असली रिकॉर्ड से आती है।' : 'This list is loaded from real Firebase records.')}</p></div></div>
          {dashboardError && <div className="empty-state" role="alert">{dashboardError}</div>}
          {section === 'ngos' && <div className="ngo-cards">{filteredNgos.map(ngo => <article className="ngo-card" key={ngo.id} role="button" tabIndex={0} aria-label={`NGO details: ${ngo.name}`} onClick={() => void openNgoDetails(ngo.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); void openNgoDetails(ngo.id); } }}><div className="ngo-logo large mint">{ngo.name.slice(0,2).toUpperCase()}</div><span className={`status-pill ${['LIVE','ACTIVE','APPROVED'].includes(ngo.status.toUpperCase()) ? 'pill-active' : 'pill-pending'}`}><i/>{ngo.status}</span><h3>{ngo.name}</h3><p>{ngo.type}</p><div className="ngo-card-meta"><span><Users size={15}/>{ngo.people} {t.membersCount.toLowerCase()}</span><span>{ngo.city}</span></div></article>)}{filteredNgos.length === 0 && <div className="empty-panel">
            {query.trim() ? <>
              <strong>{language === 'hi' ? 'कोई NGO नहीं मिला' : 'No NGOs match your search'}</strong>
              <p>{language === 'hi' ? 'दूसरा नाम खोजें या खोज साफ़ करें।' : 'Try another name or clear the search.'}</p>
              <button className="outline-button" onClick={() => setQuery('')}>{language === 'hi' ? 'खोज साफ़ करें' : 'Clear search'}</button>
            </> : <>
              <strong>{language === 'hi' ? 'अभी कोई सक्रिय NGO नहीं है' : 'No active NGOs yet'}</strong>
              <p>{language === 'hi' ? 'नई NGO रजिस्ट्रेशन यहाँ तभी दिखेगी जब UPI भुगतान सत्यापित करके एडमिन उसे सक्रिय करेगा। लंबित रजिस्ट्रेशन देखने के लिए सब्सक्रिप्शन खोलें।' : 'A registration appears here only after UPI payment is verified and an admin activates it. Open subscriptions to review pending registrations.'}</p>
              <div className="empty-panel-actions">
                <button className="primary-button" onClick={() => setShowRegistration(true)}><Plus size={16}/>{language === 'hi' ? 'NGO रजिस्टर करें' : 'Register an NGO'}</button>
                <button className="outline-button" onClick={() => chooseSection('subscriptions')}>{language === 'hi' ? 'रजिस्ट्रेशन / भुगतान देखें' : 'Review registrations / payments'}</button>
              </div>
            </>}
          </div>}</div>}
          {section === 'members' && <section className="panel directory-panel"><div className="panel-heading"><h3>{t.membersCount} · {liveMembers.length}</h3><button className="primary-button" onClick={() => { window.location.href = '/ngo-workspace'; }}>{language === 'hi' ? 'सदस्य प्रबंधन खोलें' : 'Open member management'}</button></div>{liveMembers.length === 0 ? <div className="empty-state">{t.noData}</div> : <div className="ngo-table-wrap"><table className="ngo-table"><thead><tr><th>नाम</th><th>NGO</th><th>फोन</th><th>भूमिका</th><th>स्थिति</th></tr></thead><tbody>{liveMembers.map(row => <tr key={row.id}><td>{String(row.name || '—')}</td><td>{liveNgos.find(n => n.id === row.ngoId)?.name || String(row.ngoId || '—')}</td><td>{String(row.phone || '—')}</td><td>{String(row.role || '—')}</td><td>{String(row.status || '—')}</td></tr>)}</tbody></table></div>}</section>}
          {section === 'finance' && <section className="panel directory-panel"><div className="panel-heading"><h3>{t.totalDonations}: ₹{totalDonations.toLocaleString('en-IN')} · {t.expenses}: ₹{totalExpenses.toLocaleString('en-IN')}</h3><button className="primary-button" onClick={() => { window.location.href = '/ngo-workspace'; }}>{language === 'hi' ? 'दान/खर्च प्रबंधन खोलें' : 'Open finance management'}</button></div>{liveTransactions.length === 0 ? <div className="empty-state">{t.noData}</div> : <div className="ngo-table-wrap"><table className="ngo-table"><thead><tr><th>प्रकार</th><th>NGO</th><th>राशि</th><th>श्रेणी</th><th>तारीख</th><th>विवरण</th></tr></thead><tbody>{liveTransactions.map(row => <tr key={row.id}><td>{String(row.type || '—')}</td><td>{liveNgos.find(n => n.id === row.ngoId)?.name || '—'}</td><td>₹{(Number(row.amount)||0).toLocaleString('en-IN')}</td><td>{String(row.category || '—')}</td><td>{String(row.date || '—')}</td><td>{String(row.note || row.donor || '—')}</td></tr>)}</tbody></table></div>}</section>}
          {section === 'events' && <section className="panel directory-panel"><div className="panel-heading"><h3>{t.programs} · {liveEvents.length}</h3><button className="primary-button" onClick={() => { window.location.href = '/ngo-workspace'; }}>{language === 'hi' ? 'कार्यक्रम प्रबंधन खोलें' : 'Open event management'}</button></div>{liveEvents.length === 0 ? <div className="empty-state">{t.noData}</div> : <div className="ngo-table-wrap"><table className="ngo-table"><thead><tr><th>कार्यक्रम</th><th>NGO</th><th>तारीख</th><th>स्थान</th><th>स्थिति</th></tr></thead><tbody>{liveEvents.map(row => <tr key={row.id}><td>{String(row.title || '—')}</td><td>{liveNgos.find(n => n.id === row.ngoId)?.name || '—'}</td><td>{String(row.date || '—')}</td><td>{String(row.location || '—')}</td><td>{String(row.status || '—')}</td></tr>)}</tbody></table></div>}</section>}
          {section === 'documents' && <section className="panel directory-panel"><div className="panel-heading"><h3>{t.documents} · {liveDocuments.length}</h3><button className="primary-button" onClick={() => { window.location.href = '/ngo-workspace'; }}>{language === 'hi' ? 'रिपोर्ट/दस्तावेज़ खोलें' : 'Open reports/documents'}</button></div>{liveDocuments.length === 0 ? <div className="empty-state">{t.noData}</div> : <div className="ngo-table-wrap"><table className="ngo-table"><thead><tr><th>शीर्षक</th><th>NGO</th><th>प्रकार</th><th>लिंक</th></tr></thead><tbody>{liveDocuments.map(row => <tr key={row.id}><td>{String(row.title || '—')}</td><td>{liveNgos.find(n => n.id === row.ngoId)?.name || '—'}</td><td>{String(row.type || '—')}</td><td>{row.url ? <a href={String(row.url)} target="_blank" rel="noreferrer">खोलें</a> : '—'}</td></tr>)}</tbody></table></div>}</section>}
          {section === 'subscriptions' && <section className="panel directory-panel"><div className="panel-heading"><h3>NGO registration/payment · {pendingRegistrations.length}</h3><p>UTR को बैंक/UPI रिकॉर्ड से जाँचें। केवल वास्तविक भुगतान सत्यापित होने पर Approve करें।</p></div>{registrationLoadError && <div className="empty-state" role="alert">{registrationLoadError}</div>}{pendingRegistrations.length === 0 ? <div className="empty-state">{registrationLoadError || t.noData}</div> : <div className="ngo-table-wrap"><table className="ngo-table"><thead><tr><th>NGO</th><th>ईमेल</th><th>प्लान</th><th>भुगतान</th><th>स्थिति</th><th>कार्रवाई</th></tr></thead><tbody>{[...pendingRegistrations].sort((a, b) => (a.status === 'PENDING_PAYMENT' ? 0 : 1) - (b.status === 'PENDING_PAYMENT' ? 0 : 1)).map(row => <tr key={row.id}><td>{String(row.name || '—')}<small style={{display:'block'}}>{String(row.phone || '—')} · {String(row.district || row.state || '—')}</small></td><td>{String(row.email || '—')}</td><td>{String(row.subscriptionPlan || '—')}<small style={{display:'block'}}>₹{Number(row.planPrice || 0).toLocaleString('en-IN')} / {Number(row.planDurationDays || 0)} दिन</small></td><td>{String(row.paymentStatus || '—')}<small style={{display:'block',overflowWrap:'anywhere'}}>{String(row.paymentReference || 'UTR नहीं दिया')}</small></td><td>{String(row.status || '—')}</td><td><div style={{display:'flex',flexWrap:'wrap',gap:8,minWidth:190}}>{row.status === 'PENDING_PAYMENT' && <><button type="button" className="outline-button" disabled={approvalBusyId === row.id} onClick={() => void submitRegistrationUtr(row)}>{row.paymentReference ? 'UTR बदलें' : 'UTR दर्ज करें'}</button><button type="button" className="primary-button" disabled={approvalBusyId === row.id || !String(row.paymentReference || '').trim()} onClick={() => void approveRegistration(row)}>{approvalBusyId === row.id ? 'प्रोसेस हो रहा है…' : 'भुगतान सत्यापित / LIVE करें'}</button><button type="button" className="outline-button" disabled={approvalBusyId === row.id} onClick={() => void rejectRegistration(row)}>Reject</button></>}{row.status === 'ACTIVE' && <span>LIVE · भुगतान सत्यापित</span>}{row.status === 'REJECTED' && <span>रिजेक्ट किया गया</span>}</div></td></tr>)}</tbody></table></div>}</section>}
        </section>}
        <footer className="page-footer"><span>© 2026 All NGO Connect · {t.footer}</span><span><span className="footer-status"/> {dashboardLoading ? (language === 'hi' ? 'डेटा लोड हो रहा है' : 'Loading data') : dashboardError ? (language === 'hi' ? 'डेटा त्रुटि' : 'Data error') : (language === 'hi' ? 'Firebase से जुड़ा' : 'Connected to Firebase')}</span></footer>
      </div>
    </main>
    {showRegistration && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setShowRegistration(false); }}><section className="registration-modal" role="dialog" aria-modal="true" aria-labelledby="registration-title"><div className="modal-heading"><div><span className="modal-eyebrow">ALL NGO CONNECT</span><h2 id="registration-title">{t.registerTitle}</h2><p>{t.registrationNote}</p></div><button className="icon-button" onClick={() => setShowRegistration(false)} aria-label={t.cancel}><X size={20}/></button></div><form onSubmit={submitRegistration}><label>{language === 'hi' ? 'सब्सक्रिप्शन प्लान' : 'Subscription plan'}<select required value={form.planId || subscriptionPlans.find(p => p.active)?.id || ''} onChange={e => setForm({...form, planId:e.target.value})}><option value="">{language === 'hi' ? 'प्लान चुनें' : 'Choose a plan'}</option>{subscriptionPlans.filter(p => p.active).map(plan => <option key={plan.id} value={plan.id}>{plan.name} — ₹{plan.price} / {plan.durationDays} दिन</option>)}</select></label><label>{t.orgName} *<input required value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder={language === 'hi' ? 'जैसे: उम्मीद फाउंडेशन' : 'e.g. Umeed Foundation'}/></label><div className="ngo-image-upload-field" style={{ border: '2px dashed #7c3aed', borderRadius: '12px', padding: '14px', margin: '10px 0', background: 'rgba(124,58,237,0.06)' }}><label style={{ display: 'block', fontWeight: 700, fontSize: '16px' }}>{language === 'hi' ? '📷 NGO का लोगो अपलोड करें (वैकल्पिक)' : '📷 Upload NGO logo (optional)'}<input type="file" accept="image/*,.jpg,.jpeg,.png,.webp" aria-label={language === 'hi' ? 'NGO की तस्वीर चुनें' : 'Choose NGO image'} onChange={async e => { const file = e.currentTarget.files?.[0]; if (!file) return; try { setNgoImageData(await compressDashboardImage(file)); } catch (error) { notify(error instanceof Error ? error.message : 'इमेज अपलोड नहीं हुई।'); } }} style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '10px', padding: '12px', border: '1px solid #c4b5fd', borderRadius: '8px', background: '#fff', color: '#111827' }} /><small style={{ display: 'block', marginTop: '8px' }}>{language === 'hi' ? 'यहाँ क्लिक करके मोबाइल या कंप्यूटर से NGO का लोगो चुनें। चुनने के बाद लोगो नीचे और NGO कार्ड पर दिखाई देगा।' : 'Choose the NGO logo from your phone or computer. A preview will appear below and the logo will show on its NGO card.'}</small>{ngoImageData && <img src={ngoImageData} alt="NGO image preview" style={{ display: 'block', width: '100%', maxWidth: '260px', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: '12px', marginTop: '10px' }} />}</label></div><div className="form-two-col"><label>{t.contactName} *<input required value={form.contact} onChange={e => setForm({...form, contact:e.target.value})} placeholder={language === 'hi' ? 'पूरा नाम' : 'Full name'}/></label><label>{t.phone} *<input required type="tel" value={form.phone} onChange={e => setForm({...form, phone:e.target.value})} placeholder="+91"/></label></div><label>{t.email}<input type="email" value={authUser?.email || form.email} readOnly /></label><label>{t.state}<select value={form.state} onChange={e => setForm({...form, state:e.target.value})}><option value="">{language === 'hi' ? 'राज्य चुनें' : 'Select state'}</option>{INDIA_STATES_AND_UTS.map(s => <option key={s}>{s}</option>)}</select></label><label>{language === 'hi' ? 'जिला' : 'District'} *<input required value={form.district} onChange={e => setForm({...form, district:e.target.value})} placeholder={language === 'hi' ? 'जिले का नाम' : 'District name'}/></label><label>{t.mission}<textarea rows={3} value={form.mission} onChange={e => setForm({...form, mission:e.target.value})} placeholder={language === 'hi' ? 'आपकी संस्था किस क्षेत्र में काम करती है?' : 'What does your organization work on?'}/></label><div className="form-note"><ShieldCheck size={17}/><span>{t.registrationNote}</span></div><div className="modal-actions"><button type="button" className="outline-button" onClick={() => setShowRegistration(false)}>{t.cancel}</button><button type="submit" className="primary-button" disabled={!subscriptionPlans.some(p => p.active)}><CheckCircle2 size={17}/>{t.submit}</button></div></form></section></div>}
    {(selectedNgoDetails || selectedNgoLoading) && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !selectedNgoLoading) setSelectedNgoDetails(null); }}><section className="registration-modal" role="dialog" aria-modal="true" aria-labelledby="ngo-details-title"><div className="modal-heading"><div><span className="modal-eyebrow">ALL NGO CONNECT</span><h2 id="ngo-details-title">{String(selectedNgoDetails?.name || selectedNgoDetails?.ngoName || 'NGO जानकारी')}</h2><p>{language === 'hi' ? 'रजिस्ट्रेशन और संस्था की जानकारी' : 'Registration and organization details'}</p></div><button className="icon-button" onClick={() => setSelectedNgoDetails(null)} aria-label="Close details"><X size={20}/></button></div>{selectedNgoLoading ? <p>जानकारी लोड हो रही है…</p> : selectedNgoDetails && <div className="ngo-detail-list">{(() => { const form = selectedNgoDetails.registrationFormData && typeof selectedNgoDetails.registrationFormData === 'object' ? selectedNgoDetails.registrationFormData as Record<string, unknown> : {}; const pick = (...keys: string[]) => keys.map(key => form[key]).find(value => value !== undefined && value !== null && String(value).trim() !== ''); const price = selectedNgoDetails.subscriptionPrice ?? selectedNgoDetails.planPrice ?? pick('planPrice'); const labels = language === 'hi' ? ['स्थिति', 'जिला', 'राज्य', 'संपर्क व्यक्ति', 'ईमेल', 'फोन', 'उद्देश्य', 'सब्सक्रिप्शन प्लान', 'फीस', 'वैधता (दिन)', 'सदस्य ID'] : ['Status', 'District', 'State', 'Contact person', 'Email', 'Phone', 'Mission', 'Subscription plan', 'Fee', 'Validity (days)', 'Member ID']; const statusValue = String(selectedNgoDetails.status || '').toUpperCase(); const displayStatus = language === 'hi' ? (['LIVE', 'ACTIVE', 'APPROVED'].includes(statusValue) ? 'सक्रिय' : statusValue === 'PENDING' ? 'लंबित' : statusValue === 'INACTIVE' ? 'निष्क्रिय' : selectedNgoDetails.status) : selectedNgoDetails.status; return ([[displayStatus, selectedNgoDetails.status], [selectedNgoDetails.district || selectedNgoDetails.city || pick('district', 'city'), selectedNgoDetails.district || selectedNgoDetails.city || pick('district', 'city')], [selectedNgoDetails.state || pick('state'), selectedNgoDetails.state || pick('state')], [selectedNgoDetails.contactName || pick('contactName', 'contact'), selectedNgoDetails.contactName || pick('contactName', 'contact')], [selectedNgoDetails.contactEmail || selectedNgoDetails.email || pick('email', 'contactEmail'), selectedNgoDetails.contactEmail || selectedNgoDetails.email || pick('email', 'contactEmail')], [selectedNgoDetails.contactPhone || selectedNgoDetails.phone || pick('phone', 'contactPhone'), selectedNgoDetails.contactPhone || selectedNgoDetails.phone || pick('phone', 'contactPhone')], [selectedNgoDetails.mission || selectedNgoDetails.description || pick('mission', 'description'), selectedNgoDetails.mission || selectedNgoDetails.description || pick('mission', 'description')], [selectedNgoDetails.subscriptionPlanName || selectedNgoDetails.subscriptionPlan || pick('subscriptionPlanName', 'subscriptionPlan'), selectedNgoDetails.subscriptionPlanName || selectedNgoDetails.subscriptionPlan || pick('subscriptionPlanName', 'subscriptionPlan')], [price != null ? `₹${Number(price).toLocaleString('en-IN')}` : undefined, price != null ? `₹${Number(price).toLocaleString('en-IN')}` : undefined], [selectedNgoDetails.subscriptionDurationDays ?? selectedNgoDetails.planDurationDays ?? pick('planDurationDays'), selectedNgoDetails.subscriptionDurationDays ?? selectedNgoDetails.planDurationDays ?? pick('planDurationDays')], [selectedNgoDetails.id, selectedNgoDetails.id]] as Array<[unknown, unknown]>).map(([value], index) => ({label: labels[index], value: index === 0 ? displayStatus : value})).filter(({value}) => value !== undefined && value !== null && String(value).trim() !== '').map(({label, value}) => <div className="ngo-detail-row" key={label}><strong>{label}</strong><span>{String(value)}</span></div>); })()}<p className="ngo-detail-note">{language === 'hi' ? 'यहाँ NGO की ज़रूरी जानकारी दिखाई जाती है। भुगतान संदर्भ की जाँच सब्सक्रिप्शन अनुभाग में करें।' : 'Only essential NGO details are shown here. Check the payment reference in the Subscription section.'}</p></div>}<div className="modal-actions">{authUser && isSuperAdmin(authUser) && selectedNgoDetails && <><button className="outline-button" disabled={ngoActionBusy} onClick={() => void changeNgoStatus()}>{ngoActionBusy ? 'कृपया प्रतीक्षा करें…' : ['LIVE', 'ACTIVE', 'APPROVED'].includes(String(selectedNgoDetails.status || '').toUpperCase()) ? 'NGO Deactivate करें' : 'NGO Activate करें'}</button><button className="outline-button" disabled={ngoActionBusy} style={{ color: '#b91c1c', borderColor: '#fecaca' }} onClick={() => void deleteNgoPermanently()}><Trash2 size={16}/>{ngoActionBusy ? 'कृपया प्रतीक्षा करें…' : 'NGO Delete करें'}</button></>}<button className="primary-button" disabled={ngoActionBusy} onClick={() => setSelectedNgoDetails(null)}>बंद करें</button></div></section></div>}
    {toast && <div className="toast"><CheckCircle2 size={18}/>{toast}<button onClick={() => setToast('')} aria-label="Dismiss"><X size={16}/></button></div>}
  </div>;
}
