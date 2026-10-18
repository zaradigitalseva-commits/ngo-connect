import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { Activity, ArrowDownLeft, ArrowUpRight, BadgeCheck, Bell, BookOpenCheck, CalendarDays, CheckCircle2, ChevronDown, CircleHelp, ClipboardList, FileBadge, FileText, Globe2, HandCoins, HeartHandshake, LayoutDashboard, Leaf, LogOut, Menu, Plus, Search, Settings2, ShieldCheck, Users, Wallet, X } from 'lucide-react';
import { auth, db, firebaseConfigured } from './firebase';
import { MemberIDPortal, MemberVerifyPage, NgoAdminPortal } from './MemberIDPortal';
import { addDoc, collection, doc, getDoc, getDocs, query as firestoreQuery, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';

const SUPER_ADMIN_EMAILS = ['ngogrant454@gmail.com', 'zaradigitalseva@gmail.com'];
const isSuperAdmin = (user: User | null) => Boolean(user?.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase()));

type Language = 'en' | 'hi';
type Section = 'overview' | 'ngos' | 'members' | 'finance' | 'events' | 'documents' | 'subscriptions';
const copy = {
  en: { tagline: 'Stronger communities. Better impact.', overview: 'Overview', ngos: 'NGO Directory', members: 'Members & Volunteers', finance: 'Donations & Expenses', events: 'Programs & Events', documents: 'Reports & Certificates', subscriptions: 'Subscriptions', welcome: 'Good morning 👋', intro: 'Here is what is happening across your NGO workspace.', totalDonations: 'Total donations', expenses: 'Total expenses', membersCount: 'Members & volunteers', programs: 'Programs this month', recent: 'Recent activity', quick: 'Quick actions', register: 'Register an NGO', addMember: 'Add a member', recordDonation: 'Record donation', createEvent: 'Create an event', directory: 'NGO directory', viewAll: 'View all', active: 'Active', pending: 'Pending review', draft: 'Draft', month: 'This month', activityTitle: 'Your impact at a glance', activityText: 'Keep your team, community and finances in one place.', registerTitle: 'Register your NGO', orgName: 'NGO / organization name', contactName: 'Contact person', email: 'Email address', phone: 'Phone number', state: 'State', mission: 'Short mission / purpose', submit: 'Submit registration', cancel: 'Cancel', registrationNote: 'New registrations are reviewed after subscription payment is submitted. Approval is manual.', saved: 'Registration saved in this demo. Connect Firebase to enable secure saving.', language: 'Language', dashboard: 'Dashboard', platform: 'Platform workspace', setup: 'Firebase setup needed', setupText: 'This preview uses sample data. Connect a separate Firebase project before storing real NGO records.', seeSetup: 'View setup guide', subscriptionNote: 'UPI payment verification and activation are manual and must be implemented before launch.', noData: 'No live records yet', demo: 'Demo preview', search: 'Search NGOs, members…', all: 'All activity', registered: 'Registered', volunteers: 'Volunteers', donatedBy: 'Community contributions', expenseBy: 'Program spending', event1: 'Community health camp', event2: 'Youth skills workshop', event3: 'Winter relief distribution', status: 'Status', plan: 'Plan', amount: 'Amount', due: 'Next renewal', footer: 'Built for grassroots organizations' },
  hi: { tagline: 'मजबूत समुदाय। बेहतर बदलाव।', overview: 'डैशबोर्ड', ngos: 'NGO सूची', members: 'सदस्य और स्वयंसेवक', finance: 'दान और खर्च', events: 'कार्यक्रम और इवेंट', documents: 'रिपोर्ट और प्रमाणपत्र', subscriptions: 'सब्सक्रिप्शन', welcome: 'सुप्रभात 👋', intro: 'आपके NGO कार्यक्षेत्र की ताज़ा जानकारी यहाँ है।', totalDonations: 'कुल दान', expenses: 'कुल खर्च', membersCount: 'सदस्य और स्वयंसेवक', programs: 'इस महीने के कार्यक्रम', recent: 'हाल की गतिविधियाँ', quick: 'जल्दी करें', register: 'NGO रजिस्टर करें', addMember: 'सदस्य जोड़ें', recordDonation: 'दान दर्ज करें', createEvent: 'कार्यक्रम बनाएँ', directory: 'NGO सूची', viewAll: 'सभी देखें', active: 'सक्रिय', pending: 'जाँच बाकी', draft: 'ड्राफ्ट', month: 'इस महीने', activityTitle: 'आपके काम की एक झलक', activityText: 'टीम, समुदाय और हिसाब-किताब एक जगह रखें।', registerTitle: 'अपना NGO रजिस्टर करें', orgName: 'NGO / संस्था का नाम', contactName: 'संपर्क व्यक्ति', email: 'ईमेल पता', phone: 'मोबाइल नंबर', state: 'राज्य', mission: 'संस्था का उद्देश्य', submit: 'रजिस्ट्रेशन भेजें', cancel: 'रद्द करें', registrationNote: 'सब्सक्रिप्शन भुगतान भेजने के बाद नए रजिस्ट्रेशन की मैनुअल जाँच होगी।', saved: 'डेमो में रजिस्ट्रेशन दर्ज हुआ। सुरक्षित सेविंग के लिए Firebase जोड़ें।', language: 'भाषा', dashboard: 'डैशबोर्ड', platform: 'प्लेटफ़ॉर्म कार्यक्षेत्र', setup: 'Firebase सेटअप बाकी', setupText: 'अभी यह डेमो नमूना डेटा दिखाता है। असली NGO रिकॉर्ड से पहले अलग Firebase प्रोजेक्ट जोड़ें।', seeSetup: 'सेटअप गाइड देखें', subscriptionNote: 'UPI भुगतान की जाँच और NGO सक्रिय करना मैनुअल होगा; लॉन्च से पहले इसे बनाना ज़रूरी है।', noData: 'अभी लाइव रिकॉर्ड नहीं हैं', demo: 'डेमो प्रीव्यू', search: 'NGO, सदस्य खोजें…', all: 'सभी गतिविधियाँ', registered: 'रजिस्टर', volunteers: 'स्वयंसेवक', donatedBy: 'समुदाय का योगदान', expenseBy: 'कार्यक्रम पर खर्च', event1: 'सामुदायिक स्वास्थ्य शिविर', event2: 'युवाओं के कौशल की कार्यशाला', event3: 'सर्दियों में राहत वितरण', status: 'स्थिति', plan: 'प्लान', amount: 'राशि', due: 'अगला नवीनीकरण', footer: 'जमीनी स्तर पर काम करने वाली संस्थाओं के लिए' }
};
const nav = [
  { id: 'overview' as const, icon: LayoutDashboard, key: 'overview' as const }, { id: 'ngos' as const, icon: HeartHandshake, key: 'ngos' as const },
  { id: 'members' as const, icon: Users, key: 'members' as const }, { id: 'finance' as const, icon: Wallet, key: 'finance' as const },
  { id: 'events' as const, icon: CalendarDays, key: 'events' as const }, { id: 'documents' as const, icon: FileText, key: 'documents' as const },
  { id: 'subscriptions' as const, icon: BadgeCheck, key: 'subscriptions' as const }
];
const ngoSamples = [
  { name: 'Umeed Foundation', type: 'Education & child welfare', initials: 'UF', color: 'mint', city: 'Kolhapur, Maharashtra', people: 42, state: 'Active' },
  { name: 'Nayi Disha Seva Trust', type: 'Community development', initials: 'ND', color: 'peach', city: 'Pune, Maharashtra', people: 28, state: 'Pending review' },
  { name: 'Green Earth Collective', type: 'Environment & sustainability', initials: 'GE', color: 'lilac', city: 'Sangli, Maharashtra', people: 16, state: 'Active' }
];


type PublicHomeProps = {
  language: Language;
  setLanguage: (language: Language) => void;
  authUser: User | null;
  onLogin: () => void;
  onLogout: () => void;
  authError: string;
};
type PublicNgo = {
  id: string;
  name: string;
  type: string;
  city: string;
  logo: string;
  mission: string;
  status: string;
  phone: string;
  email: string;
  website: string;
  address: string;
};
function PublicHome({ language, setLanguage, authUser, onLogin, onLogout, authError }: PublicHomeProps) {
  const hi = language === 'hi';
  const [publicNgos, setPublicNgos] = useState<PublicNgo[]>([]);
  const [selectedNgo, setSelectedNgo] = useState<PublicNgo | null>(null);
  const [profileLoginRequired, setProfileLoginRequired] = useState(false);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [showPublicRegistration, setShowPublicRegistration] = useState(false);
  const [registrationBusy, setRegistrationBusy] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState('');
  const [paymentQrImage, setPaymentQrImage] = useState('');
  const [publicForm, setPublicForm] = useState({ name: '', contact: '', phone: '', state: '', mission: '', plan: '₹300 / 28 days', paymentReference: '' });
  const submitPublicRegistration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authUser || !authUser.email) { onLogin(); return; }
    if (!firebaseConfigured) { setRegistrationMessage(hi ? 'Firebase सेटअप उपलब्ध नहीं है।' : 'Firebase is not configured.'); return; }
    setRegistrationBusy(true);
    setRegistrationMessage('');
    try {
      await addDoc(collection(db, 'ngoRegistrations'), {
        name: publicForm.name.trim(), contactName: publicForm.contact.trim(),
        email: authUser.email, phone: publicForm.phone.trim(), state: publicForm.state,
        mission: publicForm.mission.trim(), subscriptionPlan: publicForm.plan,
        paymentReference: publicForm.paymentReference.trim(),
        status: 'PENDING_PAYMENT',
        paymentStatus: publicForm.paymentReference.trim() ? 'SUBMITTED_FOR_REVIEW' : 'NOT_SUBMITTED',
        ownerUid: authUser.uid, createdAt: serverTimestamp(),
      });
      setRegistrationMessage(hi ? 'रजिस्ट्रेशन जमा हो गया। भुगतान/UTR की जाँच और एडमिन की मंज़ूरी के बाद ही NGO सक्रिय होगा।' : 'Registration submitted. The NGO will activate only after payment verification and admin approval.');
      setPublicForm({ name: '', contact: '', phone: '', state: '', mission: '', plan: '₹300 / 28 days', paymentReference: '' });
    } catch (error) {
      setRegistrationMessage(error instanceof Error ? error.message : (hi ? 'रजिस्ट्रेशन सेव नहीं हुआ। Firebase नियम जाँचें।' : 'Could not save registration. Check Firebase rules.'));
    } finally { setRegistrationBusy(false); }
  };
  useEffect(() => {
    let active = true;
    getDoc(doc(db, 'publicSettings', 'payment')).then(snapshot => {
      if (active && snapshot.exists() && typeof snapshot.data().qrImage === 'string') setPaymentQrImage(snapshot.data().qrImage as string);
    }).catch(() => { if (active) setPaymentQrImage(''); });
    const loadPublicNgos = async () => {
      try {
        const snapshot = await getDocs(firestoreQuery(
          collection(db, 'ngos'),
          where('status', 'in', ['LIVE', 'ACTIVE', 'APPROVED'])
        ));
        if (!active) return;
        const records = snapshot.docs.map((doc) => {
          const d = doc.data() as Record<string, unknown>;
          const str = (...keys: string[]) => {
            for (const key of keys) if (typeof d[key] === 'string' && d[key]) return d[key] as string;
            return '';
          };
          return {
            id: doc.id,
            name: str('name', 'ngoName', 'organizationName', 'orgName') || (hi ? 'NGO का नाम उपलब्ध नहीं' : 'NGO name unavailable'),
            type: str('type', 'category', 'focusArea', 'mission') || (hi ? 'सामाजिक संस्था' : 'Social organization'),
            city: str('city', 'district', 'location', 'state'),
            logo: str('logoUrl', 'logo', 'imageUrl', 'photoURL', 'photoUrl'),
            mission: str('description', 'mission', 'about', 'purpose'),
            status: str('status'),
            phone: str('publicPhone', 'phone', 'contactPhone'),
            email: str('publicEmail', 'email', 'contactEmail'),
            website: str('website', 'websiteUrl'),
            address: str('publicAddress', 'address', 'city', 'state'),
          } satisfies PublicNgo;
        });
        setPublicNgos(records);
      } catch {
        if (active) setPublicNgos([]);
      } finally {
        if (active) setDirectoryLoading(false);
      }
    };
    void loadPublicNgos();
    return () => { active = false; };
  }, [hi]);
  return <div className="public-site">
    <header className="public-header">
      <a className="public-brand" href="/" aria-label="NGO Connect home"><span className="brand-mark"><Leaf size={23}/></span><span>NGO<span>Connect</span><small>{hi ? 'मजबूत समुदाय। बेहतर बदलाव।' : 'Stronger communities. Better impact.'}</small></span></a>
      <nav className="public-nav"><a href="/members">{hi ? "Member ID कार्ड" : "Member ID Card"}</a><a href="#about">{hi ? 'हमारे बारे में' : 'About'}</a><a href="#features">{hi ? 'सुविधाएँ' : 'Features'}</a><a href="#contact">{hi ? 'संपर्क' : 'Contact'}</a></nav>
      <div className="public-actions"><button className="language-button" onClick={() => setLanguage(hi ? 'en' : 'hi')}>{hi ? 'English' : 'हिन्दी'}</button><button className="outline-button" onClick={() => { setRegistrationMessage(''); setShowPublicRegistration(true); }}>{hi ? 'NGO रजिस्टर करें' : 'Register NGO'}</button>{authUser ? <div className="public-user"><span>{authUser.email}</span><button className="outline-button" onClick={onLogout}>{hi ? 'लॉगआउट' : 'Sign out'}</button></div> : <button className="primary-button" onClick={onLogin} disabled={!firebaseConfigured}><Globe2 size={17}/>{hi ? 'Google से लॉगिन' : 'Sign in with Google'}</button>}</div>
    </header>
    <main>
      <section className="public-hero" id="about"><div className="public-hero-copy"><span className="public-kicker"><HeartHandshake size={15}/>{hi ? 'सामाजिक बदलाव के लिए एक मंच' : 'A platform for social impact'}</span><h1>{hi ? <>सेवा का हर कदम,<br/><em>बदलाव की नई उम्मीद।</em></> : <>Every act of service,<br/><em>a new hope for change.</em></>}</h1><p>{hi ? 'NGO Connect संस्थाओं को अपने सदस्यों, स्वयंसेवकों, कार्यक्रमों, दान और रिपोर्ट को व्यवस्थित करने में मदद करने के लिए बनाया जा रहा है।' : 'NGO Connect is being built to help organizations manage members, volunteers, events, donations and reports in one place.'}</p><div className="public-hero-actions"><a className="primary-button" href="#features">{hi ? 'वेबसाइट देखें' : 'Explore the website'} <ArrowUpRight size={17}/></a></div>{authUser && <p className="public-signed-in">{hi ? 'लॉगिन ईमेल:' : 'Signed in as:'} <strong>{authUser.email}</strong>{!isSuperAdmin(authUser) && <span> · {hi ? 'सामान्य यूज़र' : 'Regular user'}</span>}</p>}</div><div className="public-hero-art" aria-hidden="true"><div className="public-art-ring ring-a"/><div className="public-art-ring ring-b"/><div className="public-art-main"><HeartHandshake size={78} strokeWidth={1.4}/></div><div className="public-art-chip chip-a"><Users size={18}/><span>{hi ? 'समुदाय' : 'Community'}</span></div><div className="public-art-chip chip-b"><HandCoins size={18}/><span>{hi ? 'पारदर्शिता' : 'Transparency'}</span></div><span className="public-art-spark spark-a">✦</span><span className="public-art-spark spark-b">✳</span></div></section>
      <section className="public-directory" id="ngos">
        <div className="public-section-heading"><span>{hi ? 'हमारे साथ जुड़ी संस्थाएँ' : 'ORGANIZATIONS ON NGO CONNECT'}</span><h2>{hi ? 'सभी सक्रिय NGOs' : 'Explore active NGOs'}</h2><p>{hi ? 'हर संस्था का कार्ड देखें। पूरा सार्वजनिक प्रोफ़ाइल देखने के लिए Google लॉगिन ज़रूरी है।' : 'Browse NGO cards. Sign in with Google to view a complete public profile.'}</p></div>
        {directoryLoading ? <p className="public-directory-empty">{hi ? 'NGO सूची लोड हो रही है…' : 'Loading NGO directory…'}</p> : publicNgos.length === 0 ? <p className="public-directory-empty">{hi ? 'अभी कोई स्वीकृत NGO सूची में नहीं है।' : 'No approved NGOs are listed yet.'}</p> : <div className="public-ngo-grid">{publicNgos.map(ngo => <button type="button" className="public-ngo-card" key={ngo.id} onClick={() => { setSelectedNgo(ngo); setProfileLoginRequired(!authUser); }}><div className="public-ngo-logo">{ngo.logo ? <img src={ngo.logo} alt="" /> : <HeartHandshake size={28}/>}</div><h3>{ngo.name}</h3><p>{ngo.type}</p><span>{ngo.city || (hi ? 'स्थान उपलब्ध नहीं' : 'Location not listed')}</span><strong>{hi ? 'प्रोफ़ाइल देखें' : 'View profile'} <ArrowUpRight size={15}/></strong></button>)}</div>}
      </section>
      <section className="public-features" id="features"><div className="public-section-heading"><span>{hi ? 'एक ही जगह सब कुछ' : 'EVERYTHING IN ONE PLACE'}</span><h2>{hi ? 'समाज सेवा को आसान और व्यवस्थित बनाएँ' : 'Make community work simpler and organized'}</h2><p>{hi ? 'सार्वजनिक वेबसाइट सभी के लिए खुली है। निजी प्रबंधन सुविधाएँ केवल अनुमति प्राप्त खातों के लिए होंगी।' : 'The public website is open to everyone. Private management tools will only be available to authorized accounts.'}</p></div><div className="public-feature-grid"><article><div className="public-feature-icon"><HeartHandshake size={24}/></div><h3>{hi ? 'NGO प्रोफ़ाइल' : 'NGO profiles'}</h3><p>{hi ? 'संस्था की पहचान, उद्देश्य और सार्वजनिक जानकारी दिखाने के लिए।' : 'Share an organization’s mission and public information.'}</p></article><article><div className="public-feature-icon"><Users size={24}/></div><h3>{hi ? 'सदस्य और स्वयंसेवक' : 'Members & volunteers'}</h3><p>{hi ? 'टीम और स्वयंसेवकों के काम को व्यवस्थित करने की सुविधा।' : 'Organize teams and volunteer activity.'}</p></article><article><div className="public-feature-icon"><HandCoins size={24}/></div><h3>{hi ? 'दान और खर्च' : 'Donations & expenses'}</h3><p>{hi ? 'दान और खर्च का रिकॉर्ड रखने के लिए नियोजित सुविधा।' : 'Planned tools to keep donation and expense records.'}</p></article><article><div className="public-feature-icon"><CalendarDays size={24}/></div><h3>{hi ? 'कार्यक्रम और रिपोर्ट' : 'Events & reports'}</h3><p>{hi ? 'कार्यक्रम, दस्तावेज़, प्रमाणपत्र और रिपोर्ट के लिए।' : 'Tools for events, documents, certificates and reports.'}</p></article></div></section>
      <section className="public-cta" id="contact"><div><span>NGO CONNECT</span><h2>{hi ? 'बेहतर बदलाव के लिए साथ आएँ।' : 'Come together for a better impact.'}</h2><p>{hi ? 'वेबसाइट देखने के लिए लॉगिन आवश्यक नहीं है।' : 'You do not need to sign in to browse the website.'}</p><button className="primary-button" onClick={() => { setRegistrationMessage(''); setShowPublicRegistration(true); }}>{hi ? 'अपना NGO रजिस्टर करें' : 'Register your NGO'} <ArrowUpRight size={17}/></button></div></section>
      {showPublicRegistration && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !registrationBusy) setShowPublicRegistration(false); }}><section className="registration-modal" role="dialog" aria-modal="true" aria-labelledby="public-registration-title"><div className="modal-heading"><div><span className="modal-eyebrow">NGO CONNECT</span><h2 id="public-registration-title">{hi ? 'NGO रजिस्ट्रेशन' : 'NGO registration'}</h2><p>{hi ? 'Google लॉगिन के बाद जानकारी भेजें। भुगतान सत्यापन और एडमिन मंज़ूरी तक NGO सक्रिय नहीं होगा।' : 'Sign in with Google and submit your details. Activation happens only after payment verification and admin approval.'}</p></div><button className="icon-button" onClick={() => setShowPublicRegistration(false)} aria-label={hi ? 'बंद करें' : 'Close'}><X size={20}/></button></div>{!authUser ? <div className="public-profile-gate"><p>{hi ? 'रजिस्ट्रेशन के लिए पहले Google से लॉगिन करें।' : 'Sign in with Google before registering.'}</p><button className="primary-button" onClick={onLogin} disabled={!firebaseConfigured}><Globe2 size={17}/>{hi ? 'Google से लॉगिन' : 'Sign in with Google'}</button></div> : <form onSubmit={submitPublicRegistration}><label>{hi ? 'NGO / संस्था का नाम' : 'NGO / organization name'} *<input required maxLength={120} value={publicForm.name} onChange={e => setPublicForm({...publicForm, name:e.target.value})}/></label><label>{hi ? 'संपर्क व्यक्ति' : 'Contact person'} *<input required maxLength={100} value={publicForm.contact} onChange={e => setPublicForm({...publicForm, contact:e.target.value})}/></label><label>{hi ? 'मोबाइल नंबर' : 'Phone number'} *<input required type="tel" maxLength={25} value={publicForm.phone} onChange={e => setPublicForm({...publicForm, phone:e.target.value})}/></label><label>{hi ? 'राज्य' : 'State'}<select value={publicForm.state} onChange={e => setPublicForm({...publicForm, state:e.target.value})}><option value="">{hi ? 'राज्य चुनें' : 'Select state'}</option>{['Maharashtra','Uttar Pradesh','Madhya Pradesh','Gujarat','Karnataka','Rajasthan','Delhi','Other'].map(s => <option key={s}>{s}</option>)}</select></label><label>{hi ? 'संस्था का उद्देश्य' : 'Mission / purpose'}<textarea rows={3} maxLength={1000} value={publicForm.mission} onChange={e => setPublicForm({...publicForm, mission:e.target.value})}/></label><label>{hi ? 'सब्सक्रिप्शन प्लान' : 'Subscription plan'}<select value={publicForm.plan} onChange={e => setPublicForm({...publicForm, plan:e.target.value})}><option>₹300 / 28 days</option><option>₹600 / 56 days</option><option>₹900 / 84 days</option><option>₹1200 / 112 days</option><option>₹3000 / 280 days</option></select></label>{paymentQrImage && <div className="payment-qr-preview"><h3>{hi ? 'UPI से भुगतान करें' : 'Pay by UPI'}</h3><img src={paymentQrImage} alt={hi ? 'NGO Connect UPI QR कोड' : 'NGO Connect UPI QR code'} /><p>{hi ? 'QR स्कैन करके भुगतान करें, फिर नीचे UTR नंबर भरें।' : 'Scan this QR to pay, then enter the UTR below.'}</p></div>}<label>{hi ? 'भुगतान UTR / संदर्भ नंबर (यदि भुगतान कर दिया है)' : 'Payment UTR / reference (if already paid)'}<input maxLength={80} value={publicForm.paymentReference} onChange={e => setPublicForm({...publicForm, paymentReference:e.target.value})} placeholder="UTR / transaction reference"/></label><div className="form-note"><ShieldCheck size={17}/><span>{hi ? 'UTR भेजना भुगतान का प्रमाण नहीं है। एडमिन बैंक/UPI रिकॉर्ड से सत्यापन करेगा। भुगतान निर्देश एडमिन से प्राप्त करें।' : 'A UTR is not proof by itself. Admin will verify against UPI/bank records. Obtain payment instructions from the administrator.'}</span></div>{registrationMessage && <p role="status" className="public-auth-error">{registrationMessage}</p>}<div className="modal-actions"><button type="button" className="outline-button" disabled={registrationBusy} onClick={() => setShowPublicRegistration(false)}>{hi ? 'बंद करें' : 'Close'}</button><button type="submit" className="primary-button" disabled={registrationBusy}>{registrationBusy ? (hi ? 'सेव हो रहा है…' : 'Saving…') : (hi ? 'रजिस्ट्रेशन जमा करें' : 'Submit registration')}</button></div></form>}</section></div>}
      {selectedNgo && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) { setSelectedNgo(null); setProfileLoginRequired(false); } }}><section className="registration-modal public-profile-modal" role="dialog" aria-modal="true" aria-labelledby="public-profile-title"><div className="modal-heading"><div><span className="modal-eyebrow">NGO CONNECT</span><h2 id="public-profile-title">{profileLoginRequired || !authUser ? (hi ? 'पूरा प्रोफ़ाइल देखने के लिए लॉगिन करें' : 'Sign in to view the full profile') : selectedNgo.name}</h2><p>{profileLoginRequired || !authUser ? (hi ? 'NGO की पूरी सार्वजनिक जानकारी देखने के लिए Google से लॉगिन करें।' : 'Sign in with Google to view the full public NGO profile.') : selectedNgo.type}</p></div><button className="icon-button" onClick={() => { setSelectedNgo(null); setProfileLoginRequired(false); }} aria-label={hi ? 'बंद करें' : 'Close'}><X size={20}/></button></div>{profileLoginRequired || !authUser ? <div className="public-profile-gate"><button className="primary-button" onClick={() => { setProfileLoginRequired(false); onLogin(); }} disabled={!firebaseConfigured}><Globe2 size={17}/>{hi ? 'Google से लॉगिन करें' : 'Sign in with Google'}</button></div> : <div className="public-profile-details"><h3>{selectedNgo.name}</h3><p>{selectedNgo.mission || (hi ? 'इस NGO ने अभी अपना परिचय नहीं जोड़ा है।' : 'This NGO has not added a description yet.')}</p>{selectedNgo.address && <p><strong>{hi ? 'पता:' : 'Address:'}</strong> {selectedNgo.address}</p>}{selectedNgo.phone && <p><strong>{hi ? 'संपर्क नंबर:' : 'Contact phone:'}</strong> {selectedNgo.phone}</p>}{selectedNgo.email && <p><strong>{hi ? 'संपर्क ईमेल:' : 'Contact email:'}</strong> {selectedNgo.email}</p>}{selectedNgo.website && <p><strong>{hi ? 'वेबसाइट:' : 'Website:'}</strong> <a href={selectedNgo.website.startsWith('http') ? selectedNgo.website : 'https://' + selectedNgo.website} target="_blank" rel="noreferrer">{selectedNgo.website}</a></p>}</div>}</section></div>}
      {authError && <p className="public-auth-error">{authError}</p>}
    </main><footer className="public-footer"><span>© 2026 NGO Connect</span><span>{hi ? 'सार्वजनिक वेबसाइट · सभी के लिए खुली' : 'Public website · Open to everyone'}</span></footer>
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
  const [form, setForm] = useState({ name: '', contact: '', email: '', phone: '', state: '', mission: '' });
  const [pendingRegistrations, setPendingRegistrations] = useState<Array<Record<string, unknown> & { id: string }>>([]);
  const [approvalBusyId, setApprovalBusyId] = useState('');
  const [registrationLoadError, setRegistrationLoadError] = useState('');
  const [adminQrImage, setAdminQrImage] = useState('');
  const [qrSaveBusy, setQrSaveBusy] = useState(false);
  const [qrSaveMessage, setQrSaveMessage] = useState('');
  useEffect(() => {
    if (!authUser || !isSuperAdmin(authUser) || section !== 'subscriptions') return;
    let active = true;
    getDoc(doc(db, 'publicSettings', 'payment')).then(snapshot => {
      if (active && snapshot.exists() && typeof snapshot.data().qrImage === 'string') setAdminQrImage(snapshot.data().qrImage as string);
    }).catch(() => { if (active) setQrSaveMessage('QR सेटिंग लोड नहीं हुई। Firestore Rules प्रकाशित हैं या नहीं जाँचें।'); });
    getDocs(collection(db, 'ngoRegistrations')).then(snapshot => {
      if (active) setPendingRegistrations(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
    }).catch(() => { if (active) setRegistrationLoadError('रजिस्ट्रेशन लोड नहीं हुए। Firestore rules प्रकाशित हैं या नहीं, जाँचें।'); });
    return () => { active = false; };
  }, [authUser, section]);
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
      const ngoRef = await addDoc(collection(db, 'ngos'), {
        name: String(registration.name || ''),
        ngoName: String(registration.name || ''),
        type: 'Social organization',
        description: String(registration.mission || ''),
        city: String(registration.state || ''),
        status: 'LIVE',
        ownerUid: String(registration.ownerUid || ''),
        registrationId: registration.id,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'ngoRegistrations', registration.id), {
        status: 'ACTIVE', paymentStatus: 'VERIFIED', activatedNgoId: ngoRef.id,
        verifiedBy: authUser?.email || '', verifiedAt: serverTimestamp(),
      });
      setPendingRegistrations(current => current.map(item => item.id === registration.id ? { ...item, status: 'ACTIVE', paymentStatus: 'VERIFIED', activatedNgoId: ngoRef.id } : item));
      notify('भुगतान सत्यापित; NGO LIVE कर दिया गया।');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Approval नहीं हो पाया। Firestore rules प्रकाशित करें।');
    } finally { setApprovalBusyId(''); }
  };
  const t = copy[language];
  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, user => {
      // Any Google account may sign in; admin access is decided separately by role.
      setAuthUser(user);
      setAuthError('');
    });
  }, []);
  const loginAsSuperAdmin = async () => {
    if (!auth) return;
    setAuthError('');
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (error) { setAuthError(error instanceof Error ? error.message : 'Google sign-in failed.'); }
  };
  const filteredNgos = useMemo(() => ngoSamples.filter(n => `${n.name} ${n.type} ${n.city}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 3800); };
  const chooseSection = (id: Section) => { setSection(id); setMobileMenu(false); };
  const submitRegistration = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); notify(t.saved); setShowRegistration(false); setForm({ name: '', contact: '', email: '', phone: '', state: '', mission: '' }); };
  const pageTitle = nav.find(item => item.id === section)?.key ?? 'overview';

  if (window.location.pathname.startsWith('/member-verify')) return <MemberVerifyPage />;
  if (window.location.pathname.startsWith('/members')) return <MemberIDPortal authUser={authUser} onLogin={loginAsSuperAdmin} language={language} />;
  if (window.location.pathname.startsWith('/ngo-admin') && authUser && !isSuperAdmin(authUser)) return <NgoAdminPortal authUser={authUser} language={language} />;
  if (!authUser || !isSuperAdmin(authUser)) return <PublicHome language={language} setLanguage={setLanguage} authUser={authUser} onLogin={loginAsSuperAdmin} onLogout={() => { if (auth) void signOut(auth); }} authError={authError} />;
  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Leaf size={22} strokeWidth={2.4} /></div><div><div className="brand-name">NGO<span>Connect</span></div><div className="brand-caption">{t.tagline}</div></div><button className="icon-button close-menu" onClick={() => setMobileMenu(false)} aria-label="Close menu"><X size={19}/></button></div>
      <div className="workspace-label">{t.platform}</div>
      <nav className="side-nav">{nav.map(item => <button key={item.id} className={`nav-item ${section === item.id ? 'nav-active' : ''}`} onClick={() => chooseSection(item.id)}><item.icon size={19}/><span>{t[item.key]}</span>{item.id === 'subscriptions' && <span className="nav-dot"/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={19}/></div><div><strong>{language === 'hi' ? 'मदद चाहिए?' : 'Need a hand?'}</strong><p>{language === 'hi' ? 'सेटअप गाइड देखें' : 'Explore the setup guide'}</p></div><ChevronDown size={15}/></div><div className="profile-row"><div className="avatar avatar-admin">NC</div><div className="profile-info"><strong>{language === 'hi' ? 'प्लेटफ़ॉर्म एडमिन' : 'Platform Admin'}</strong><span>{authUser?.email ?? 'Demo preview'}</span></div>{authUser && <button className="small-icon-button" aria-label="Sign out" onClick={() => auth && signOut(auth)}><X size={16}/></button>}<Settings2 size={18} className="muted-icon"/></div></div>
    </aside>
    {mobileMenu && <button className="mobile-scrim" onClick={() => setMobileMenu(false)} aria-label="Close navigation"/>}
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="icon-button menu-button" onClick={() => setMobileMenu(true)} aria-label="Open menu"><Menu size={21}/></button><div className="breadcrumb">{t.dashboard}<span>/</span><strong>{t[pageTitle]}</strong></div></div><div className="topbar-actions"><label className="search-box"><Search size={17}/><input placeholder={t.search} value={query} onChange={e => setQuery(e.target.value)} aria-label={t.search}/><kbd>⌘ K</kbd></label><button className="language-button" onClick={() => setLanguage(language === 'hi' ? 'en' : 'hi')}><Globe2 size={17}/>{language === 'hi' ? 'हिन्दी' : 'English'}<ChevronDown size={14}/></button><button className="notification-button" aria-label="Notifications" onClick={() => notify(language === 'hi' ? 'अभी कोई नई सूचना नहीं है।' : 'No new notifications yet.')}><Bell size={19}/><span/></button><button className="outline-button topbar-logout" onClick={() => { if (auth) void signOut(auth); }}><LogOut size={16}/>{language === 'hi' ? 'लॉगआउट' : 'Sign out'}</button><div className="avatar avatar-admin top-avatar">NC</div></div></header>
      <div className="page-content">
        <div className="eyebrow"><span className="eyebrow-dot"/>{t.demo}<span className="eyebrow-line"/></div>
        <section className="welcome-row"><div><h1>{section === 'overview' ? t.welcome : t[pageTitle]}</h1><p>{section === 'overview' ? t.intro : t.activityText}</p></div><button className="primary-button" onClick={() => setShowRegistration(true)}><Plus size={18}/>{t.register}</button></section>
        {!firebaseConfigured && <div className="setup-banner"><div className="setup-icon"><ShieldCheck size={20}/></div><div className="setup-copy"><strong>{t.setup}</strong><p>{t.setupText}</p></div><a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer">{t.seeSetup}<ArrowUpRight size={15}/></a></div>}
        {section === 'subscriptions' && <><section className="panel directory-panel payment-qr-admin"><div className="panel-heading"><div><h3>UPI QR इमेज सेटिंग</h3><p>यह QR NGO रजिस्ट्रेशन फ़ॉर्म में सभी यूज़र को दिखेगा।</p></div></div><form onSubmit={savePaymentQr} className="qr-admin-form"><label>QR कोड इमेज अपलोड करें (JPG / PNG / WebP, अधिकतम 500 KB)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => handleQrFile(e.target.files?.[0])}/></label>{adminQrImage && <img className="admin-qr-preview" src={adminQrImage} alt="UPI QR preview"/>}{qrSaveMessage && <p role="status" className="qr-save-message">{qrSaveMessage}</p>}<button className="primary-button" type="submit" disabled={qrSaveBusy || !adminQrImage}>{qrSaveBusy ? 'सेव हो रहा है…' : 'QR इमेज सेव करें'}</button></form></section><section className="panel directory-panel"><div className="panel-heading"><div><h3>NGO रजिस्ट्रेशन और भुगतान जाँच</h3><p>UTR को बैंक/UPI रिकॉर्ड से मिलाने के बाद ही Activate करें।</p></div><span className="status-pill pill-pending">{pendingRegistrations.filter(item => item.status === 'PENDING_PAYMENT').length} Pending</span></div>{registrationLoadError && <p role="alert">{registrationLoadError}</p>}{pendingRegistrations.length === 0 ? <div className="empty-state">अभी कोई रजिस्ट्रेशन नहीं मिला। Firebase में rules प्रकाशित करें और नए रजिस्ट्रेशन आने दें।</div> : <div className="ngo-table-wrap"><table className="ngo-table"><thead><tr><th>NGO</th><th>संपर्क</th><th>प्लान</th><th>UTR / स्थिति</th><th>कार्रवाई</th></tr></thead><tbody>{pendingRegistrations.map(item => <tr key={item.id}><td><strong>{String(item.name || 'नाम नहीं')}</strong><br/><span className="table-muted">{String(item.state || '')}</span></td><td>{String(item.contactName || '')}<br/><span className="table-muted">{String(item.email || '')} · {String(item.phone || '')}</span></td><td>{String(item.subscriptionPlan || '')}</td><td>{String(item.paymentReference || 'UTR नहीं दिया')}<br/><span className="table-muted">{String(item.paymentStatus || item.status || '')}</span></td><td>{item.status === 'PENDING_PAYMENT' ? <button className="primary-button" disabled={approvalBusyId === item.id} onClick={() => void approveRegistration(item)}>{approvalBusyId === item.id ? 'जाँच…' : 'भुगतान सत्यापित कर Activate'}</button> : <span className="status-pill pill-active">LIVE / VERIFIED</span>}</td></tr>)}</tbody></table></div>}</section></>}
        {section === 'overview' && <>
          <section className="hero-panel"><div className="hero-copy"><div className="hero-pill"><Activity size={14}/>{language === 'hi' ? 'सामाजिक प्रभाव, एक जगह' : 'Social impact, all in one place'}</div><h2>{t.activityTitle}</h2><p>{t.activityText}</p><button className="hero-button" onClick={() => chooseSection('ngos')}>{t.directory}<ArrowUpRight size={16}/></button><div className="hero-avatars"><div className="mini-avatar mini-one">UF</div><div className="mini-avatar mini-two">ND</div><div className="mini-avatar mini-three">GE</div><span>{language === 'hi' ? 'समुदाय से जुड़ें' : 'Growing together'}</span></div></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-circle"><HeartHandshake size={68} strokeWidth={1.35}/></div><div className="floating-chip chip-top"><span className="chip-icon green"><Users size={16}/></span><span><b>86</b><small>{t.membersCount}</small></span></div><div className="floating-chip chip-bottom"><span className="chip-icon yellow"><HandCoins size={16}/></span><span><b>₹2.4L</b><small>{t.totalDonations}</small></span></div><div className="sparkle sparkle-one">✦</div><div className="sparkle sparkle-two">✳</div></div></section>
          <section className="stats-grid"><article className="stat-card"><div className="stat-top"><span>{t.totalDonations}</span><span className="stat-icon icon-green"><HandCoins size={19}/></span></div><div className="stat-number">₹2,40,500</div><div className="stat-foot"><span className="trend positive"><ArrowUpRight size={14}/>12.8%</span><span>{t.month}</span></div><div className="stat-sparkline spark-green"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article><article className="stat-card"><div className="stat-top"><span>{t.expenses}</span><span className="stat-icon icon-orange"><Wallet size={19}/></span></div><div className="stat-number">₹84,250</div><div className="stat-foot"><span className="trend positive"><ArrowDownLeft size={14}/>4.2%</span><span>{t.expenseBy}</span></div><div className="stat-sparkline spark-orange"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article><article className="stat-card"><div className="stat-top"><span>{t.membersCount}</span><span className="stat-icon icon-purple"><Users size={19}/></span></div><div className="stat-number">86</div><div className="stat-foot"><span className="trend positive"><ArrowUpRight size={14}/>8 new</span><span>{t.registered}</span></div><div className="avatar-stack"><span>AM</span><span>SK</span><span>RJ</span><span>+83</span></div></article><article className="stat-card"><div className="stat-top"><span>{t.programs}</span><span className="stat-icon icon-blue"><CalendarDays size={19}/></span></div><div className="stat-number">12</div><div className="stat-foot"><span className="trend neutral">3 {t.active.toLowerCase()}</span><span>{t.month}</span></div><div className="event-progress"><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/></div></article></section>
          <section className="content-grid"><div className="panel activity-panel"><div className="panel-heading"><div><h3>{t.recent}</h3><p>{language === 'hi' ? 'आपके कार्यक्षेत्र में हाल ही में' : 'What has happened in your workspace'}</p></div><button className="text-button" onClick={() => chooseSection('finance')}>{t.viewAll}<ArrowUpRight size={15}/></button></div><div className="activity-list"><div className="activity-item"><div className="activity-icon activity-donation"><ArrowDownLeft size={17}/></div><div className="activity-description"><strong>{language === 'hi' ? 'नया दान प्राप्त हुआ' : 'New donation received'}</strong><span>Umeed Foundation · {language === 'hi' ? 'आज, 10:42 AM' : 'Today, 10:42 AM'}</span></div><div className="activity-amount">+₹5,000</div></div><div className="activity-item"><div className="activity-icon activity-member"><Users size={17}/></div><div className="activity-description"><strong>{language === 'hi' ? 'नया स्वयंसेवक जुड़ा' : 'New volunteer joined'}</strong><span>Nayi Disha Seva Trust · {language === 'hi' ? 'आज, 9:15 AM' : 'Today, 9:15 AM'}</span></div><div className="activity-status status-pending">{t.pending}</div></div><div className="activity-item"><div className="activity-icon activity-event"><CalendarDays size={17}/></div><div className="activity-description"><strong>{t.event1}</strong><span>Umeed Foundation · {language === 'hi' ? 'कल' : 'Yesterday'}</span></div><div className="activity-status status-active">{t.active}</div></div><div className="activity-item"><div className="activity-icon activity-doc"><FileBadge size={17}/></div><div className="activity-description"><strong>{language === 'hi' ? 'मासिक रिपोर्ट तैयार' : 'Monthly report prepared'}</strong><span>Green Earth Collective · {language === 'hi' ? 'कल' : 'Yesterday'}</span></div><button className="small-icon-button" aria-label="Open report" onClick={() => chooseSection('documents')}><ArrowUpRight size={16}/></button></div></div></div>
          <div className="panel quick-panel"><div className="panel-heading"><div><h3>{t.quick}</h3><p>{language === 'hi' ? 'काम जल्दी शुरू करें' : 'Get things moving'}</p></div><div className="panel-heading-icon"><ClipboardList size={18}/></div></div><div className="quick-actions"><button onClick={() => setShowRegistration(true)}><span className="quick-icon quick-green"><HeartHandshake size={19}/></span><span><b>{t.register}</b><small>{language === 'hi' ? 'नई संस्था जोड़ें' : 'Add a new organization'}</small></span><Plus size={16}/></button><button onClick={() => chooseSection('members')}><span className="quick-icon quick-purple"><Users size={19}/></span><span><b>{t.addMember}</b><small>{language === 'hi' ? 'टीम में लोगों को जोड़ें' : 'Grow your team'}</small></span><Plus size={16}/></button><button onClick={() => chooseSection('finance')}><span className="quick-icon quick-yellow"><HandCoins size={19}/></span><span><b>{t.recordDonation}</b><small>{language === 'hi' ? 'दान और खर्च का हिसाब' : 'Track contributions'}</small></span><Plus size={16}/></button><button onClick={() => chooseSection('events')}><span className="quick-icon quick-blue"><CalendarDays size={19}/></span><span><b>{t.createEvent}</b><small>{language === 'hi' ? 'अगला कार्यक्रम प्लान करें' : 'Plan what comes next'}</small></span><Plus size={16}/></button></div></div></section>
          <section className="panel directory-panel"><div className="panel-heading"><div><h3>{t.directory}</h3><p>{language === 'hi' ? 'हाल ही में जोड़ी गई संस्थाएँ' : 'Organizations recently added'}</p></div><button className="text-button" onClick={() => chooseSection('ngos')}>{t.viewAll}<ArrowUpRight size={15}/></button></div><div className="ngo-table-wrap"><table className="ngo-table"><thead><tr><th>{language === 'hi' ? 'संस्था' : 'Organization'}</th><th>{language === 'hi' ? 'स्थान' : 'Location'}</th><th>{t.membersCount}</th><th>{t.status}</th><th/></tr></thead><tbody>{filteredNgos.slice(0,3).map(ngo => <tr key={ngo.name}><td><div className="ngo-name-cell"><div className={`ngo-logo ${ngo.color}`}>{ngo.initials}</div><div><strong>{ngo.name}</strong><span>{ngo.type}</span></div></div></td><td className="table-muted">{ngo.city}</td><td><span className="people-count"><Users size={14}/>{ngo.people}</span></td><td><span className={`status-pill ${ngo.state === 'Active' ? 'pill-active' : 'pill-pending'}`}><i/>{ngo.state === 'Active' ? t.active : t.pending}</span></td><td><button className="small-icon-button" aria-label={`Open ${ngo.name}`} onClick={() => notify(`${ngo.name} — ${t.noData}`)}><ArrowUpRight size={16}/></button></td></tr>)}</tbody></table>{filteredNgos.length === 0 && <div className="empty-state">{t.noData}</div>}</div></section>
        </>}
        {section !== 'overview' && <section className="section-view"><div className="section-intro"><div className="section-icon"><>{nav.find(n => n.id === section)?.icon && (() => { const Icon = nav.find(n => n.id === section)!.icon; return <Icon size={26}/>; })()}</></div><div><h2>{t[pageTitle]}</h2><p>{section === 'subscriptions' ? t.subscriptionNote : t.activityText}</p></div>{section === 'ngos' && <button className="primary-button" onClick={() => setShowRegistration(true)}><Plus size={17}/>{t.register}</button>}</div>{section === 'ngos' ? <div className="ngo-cards">{filteredNgos.map(ngo => <article className="ngo-card" key={ngo.name}><div className={`ngo-logo large ${ngo.color}`}>{ngo.initials}</div><span className={`status-pill ${ngo.state === 'Active' ? 'pill-active' : 'pill-pending'}`}><i/>{ngo.state === 'Active' ? t.active : t.pending}</span><h3>{ngo.name}</h3><p>{ngo.type}</p><div className="ngo-card-meta"><span><Users size={15}/>{ngo.people} {t.membersCount.toLowerCase()}</span><span>{ngo.city}</span></div><button className="outline-button" onClick={() => notify(`${ngo.name} — ${t.noData}`)}>{language === 'hi' ? 'प्रोफ़ाइल देखें' : 'View profile'}<ArrowUpRight size={15}/></button></article>)}</div> : <div className="empty-panel"><div className="empty-illustration"><BookOpenCheck size={32}/></div><h3>{t.noData}</h3><p>{section === 'subscriptions' ? t.subscriptionNote : t.setupText}</p>{section === 'finance' && <button className="primary-button" onClick={() => notify(language === 'hi' ? 'दान और खर्च मॉड्यूल अभी डेमो में है।' : 'Donations and expenses are demo-only for now.')}><Plus size={17}/>{t.recordDonation}</button>}{section === 'members' && <button className="primary-button" onClick={() => notify(language === 'hi' ? 'सदस्य मॉड्यूल अभी डेमो में है।' : 'The members module is demo-only for now.')}><Plus size={17}/>{t.addMember}</button>}{section === 'events' && <button className="primary-button" onClick={() => notify(language === 'hi' ? 'इवेंट मॉड्यूल अभी डेमो में है।' : 'The events module is demo-only for now.')}><Plus size={17}/>{t.createEvent}</button>}{section === 'documents' && <FileBadge size={20} className="empty-secondary-icon"/>}</div>}</section>}
        <footer className="page-footer"><span>© 2026 NGO Connect · {t.footer}</span><span><span className="footer-status"/> {language === 'hi' ? 'डेमो मोड' : 'Demo mode'}</span></footer>
      </div>
    </main>
    {showRegistration && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setShowRegistration(false); }}><section className="registration-modal" role="dialog" aria-modal="true" aria-labelledby="registration-title"><div className="modal-heading"><div><span className="modal-eyebrow">NGO CONNECT</span><h2 id="registration-title">{t.registerTitle}</h2><p>{t.registrationNote}</p></div><button className="icon-button" onClick={() => setShowRegistration(false)} aria-label={t.cancel}><X size={20}/></button></div><form onSubmit={submitRegistration}><label>{t.orgName} *<input required value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder={language === 'hi' ? 'जैसे: उम्मीद फाउंडेशन' : 'e.g. Umeed Foundation'}/></label><div className="form-two-col"><label>{t.contactName} *<input required value={form.contact} onChange={e => setForm({...form, contact:e.target.value})} placeholder={language === 'hi' ? 'पूरा नाम' : 'Full name'}/></label><label>{t.phone} *<input required type="tel" value={form.phone} onChange={e => setForm({...form, phone:e.target.value})} placeholder="+91"/></label></div><label>{t.email} *<input required type="email" value={form.email} onChange={e => setForm({...form, email:e.target.value})} placeholder="name@example.org"/></label><label>{t.state}<select value={form.state} onChange={e => setForm({...form, state:e.target.value})}><option value="">{language === 'hi' ? 'राज्य चुनें' : 'Select state'}</option>{['Maharashtra','Uttar Pradesh','Madhya Pradesh','Gujarat','Karnataka','Rajasthan','Delhi','Other'].map(s => <option key={s}>{s}</option>)}</select></label><label>{t.mission}<textarea rows={3} value={form.mission} onChange={e => setForm({...form, mission:e.target.value})} placeholder={language === 'hi' ? 'आपकी संस्था किस क्षेत्र में काम करती है?' : 'What does your organization work on?'}/></label><div className="form-note"><ShieldCheck size={17}/><span>{t.registrationNote}</span></div><div className="modal-actions"><button type="button" className="outline-button" onClick={() => setShowRegistration(false)}>{t.cancel}</button><button type="submit" className="primary-button"><CheckCircle2 size={17}/>{t.submit}</button></div></form></section></div>}
    {toast && <div className="toast"><CheckCircle2 size={18}/>{toast}<button onClick={() => setToast('')} aria-label="Dismiss"><X size={16}/></button></div>}
  </div>;
}
