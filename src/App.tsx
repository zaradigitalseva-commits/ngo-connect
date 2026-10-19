import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { GoogleAuthProvider, getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, type User } from 'firebase/auth';
import { Activity, ArrowUpRight, BadgeCheck, Bell, CalendarDays, CheckCircle2, ChevronDown, CircleHelp, ClipboardList, FileBadge, FileText, Globe2, HandCoins, HeartHandshake, LayoutDashboard, Leaf, LogOut, Menu, Plus, Search, ShieldCheck, Users, Wallet, X } from 'lucide-react';
import { auth, db, firebaseConfigured } from './firebase';
import { MemberIDPortal, MemberVerifyPage, NgoAdminPortal } from './MemberIDPortal';
import { NgoWorkspacePortal } from './NgoWorkspace';
import { addDoc, collection, doc, getDoc, getDocs, query as firestoreQuery, serverTimestamp, setDoc, where, runTransaction, Timestamp, updateDoc } from 'firebase/firestore';

const SUPER_ADMIN_EMAILS = ['ngogrant454@gmail.com', 'zaradigitalseva@gmail.com'];
const isSuperAdmin = (user: User | null) => Boolean(user?.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase()));

type Language = 'en' | 'hi';
type Section = 'overview' | 'ngos' | 'members' | 'finance' | 'events' | 'documents' | 'subscriptions';
const copy = {
  en: { tagline: 'Stronger communities. Better impact.', overview: 'Overview', ngos: 'NGO Directory', members: 'Members & Volunteers', finance: 'Donations & Expenses', events: 'Programs & Events', documents: 'Reports & Certificates', subscriptions: 'Subscriptions', welcome: 'Good morning 👋', intro: 'Here is what is happening across your NGO workspace.', totalDonations: 'Total donations', expenses: 'Total expenses', membersCount: 'Members & volunteers', programs: 'Programs this month', recent: 'Recent activity', quick: 'Quick actions', register: 'Register an NGO', addMember: 'Add a member', recordDonation: 'Record donation', createEvent: 'Create an event', directory: 'NGO directory', viewAll: 'View all', active: 'Active', pending: 'Pending review', draft: 'Draft', month: 'This month', activityTitle: 'Your impact at a glance', activityText: 'Keep your team, community and finances in one place.', registerTitle: 'Register your NGO', orgName: 'NGO / organization name', contactName: 'Contact person', email: 'Email address', phone: 'Phone number', state: 'State', mission: 'Short mission / purpose', submit: 'Submit registration', cancel: 'Cancel', registrationNote: 'New registrations are reviewed after subscription payment is submitted. Approval is manual.', saved: 'Registration saved in this demo. Connect Firebase to enable secure saving.', language: 'Language', dashboard: 'Dashboard', platform: 'Platform workspace', setup: 'Firebase setup needed', setupText: 'Firebase is not configured. Set the NGO Connect environment variables before using real records.', seeSetup: 'View setup guide', subscriptionNote: 'UPI payment verification and activation are manual and must be implemented before launch.', noData: 'No live records yet', demo: 'Live Firebase data', search: 'Search NGOs, members…', all: 'All activity', registered: 'Registered', volunteers: 'Volunteers', donatedBy: 'Community contributions', expenseBy: 'Program spending', event1: 'Community health camp', event2: 'Youth skills workshop', event3: 'Winter relief distribution', status: 'Status', plan: 'Plan', amount: 'Amount', due: 'Next renewal', footer: 'Built for grassroots organizations' },
  hi: { tagline: 'मजबूत समुदाय। बेहतर बदलाव।', overview: 'डैशबोर्ड', ngos: 'NGO सूची', members: 'सदस्य और स्वयंसेवक', finance: 'दान और खर्च', events: 'कार्यक्रम और इवेंट', documents: 'रिपोर्ट और प्रमाणपत्र', subscriptions: 'सब्सक्रिप्शन', welcome: 'सुप्रभात 👋', intro: 'आपके NGO कार्यक्षेत्र की ताज़ा जानकारी यहाँ है।', totalDonations: 'कुल दान', expenses: 'कुल खर्च', membersCount: 'सदस्य और स्वयंसेवक', programs: 'इस महीने के कार्यक्रम', recent: 'हाल की गतिविधियाँ', quick: 'जल्दी करें', register: 'NGO रजिस्टर करें', addMember: 'सदस्य जोड़ें', recordDonation: 'दान दर्ज करें', createEvent: 'कार्यक्रम बनाएँ', directory: 'NGO सूची', viewAll: 'सभी देखें', active: 'सक्रिय', pending: 'जाँच बाकी', draft: 'ड्राफ्ट', month: 'इस महीने', activityTitle: 'आपके काम की एक झलक', activityText: 'टीम, समुदाय और हिसाब-किताब एक जगह रखें।', registerTitle: 'अपना NGO रजिस्टर करें', orgName: 'NGO / संस्था का नाम', contactName: 'संपर्क व्यक्ति', email: 'ईमेल पता', phone: 'मोबाइल नंबर', state: 'राज्य', mission: 'संस्था का उद्देश्य', submit: 'रजिस्ट्रेशन भेजें', cancel: 'रद्द करें', registrationNote: 'सब्सक्रिप्शन भुगतान भेजने के बाद नए रजिस्ट्रेशन की मैनुअल जाँच होगी।', saved: 'डेमो में रजिस्ट्रेशन दर्ज हुआ। सुरक्षित सेविंग के लिए Firebase जोड़ें।', language: 'भाषा', dashboard: 'डैशबोर्ड', platform: 'प्लेटफ़ॉर्म कार्यक्षेत्र', setup: 'Firebase सेटअप बाकी', setupText: 'Firebase सेटअप उपलब्ध नहीं है। असली रिकॉर्ड के लिए NGO Connect के environment variables जाँचें।', seeSetup: 'सेटअप गाइड देखें', subscriptionNote: 'UPI भुगतान की जाँच और NGO सक्रिय करना मैनुअल होगा; लॉन्च से पहले इसे बनाना ज़रूरी है।', noData: 'अभी लाइव रिकॉर्ड नहीं हैं', demo: 'लाइव Firebase डेटा', search: 'NGO, सदस्य खोजें…', all: 'सभी गतिविधियाँ', registered: 'रजिस्टर', volunteers: 'स्वयंसेवक', donatedBy: 'समुदाय का योगदान', expenseBy: 'कार्यक्रम पर खर्च', event1: 'सामुदायिक स्वास्थ्य शिविर', event2: 'युवाओं के कौशल की कार्यशाला', event3: 'सर्दियों में राहत वितरण', status: 'स्थिति', plan: 'प्लान', amount: 'राशि', due: 'अगला नवीनीकरण', footer: 'जमीनी स्तर पर काम करने वाली संस्थाओं के लिए' }
};
const nav = [
  { id: 'overview' as const, icon: LayoutDashboard, key: 'overview' as const }, { id: 'ngos' as const, icon: HeartHandshake, key: 'ngos' as const },
  { id: 'members' as const, icon: Users, key: 'members' as const }, { id: 'finance' as const, icon: Wallet, key: 'finance' as const },
  { id: 'events' as const, icon: CalendarDays, key: 'events' as const }, { id: 'documents' as const, icon: FileText, key: 'documents' as const },
  { id: 'subscriptions' as const, icon: BadgeCheck, key: 'subscriptions' as const }
];
type DashboardNgo = { id: string; name: string; type: string; city: string; status: string; ownerUid: string; people: number };
type DashboardRecord = Record<string, any> & { id: string };
type SubscriptionPlan = { id: string; name: string; price: number; durationDays: number; description: string; active: boolean };


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
  district: string;
  state: string;
  logo: string;
  mission: string;
  status: string;
  phone: string;
  email: string;
  website: string;
  address: string;
};
const INDIAN_STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'];
const normalizeState = (value: string) => value.trim().toLocaleLowerCase().replace(/&/g, 'and').replace(/[^a-z]/g, '');
function PublicHome({ language, setLanguage, authUser, onLogin, onLogout, authError }: PublicHomeProps) {
  const hi = language === 'hi';
  const [publicNgos, setPublicNgos] = useState<PublicNgo[]>([]);
  const [selectedDirectoryState, setSelectedDirectoryState] = useState('__ALL__');
  const [selectedDirectoryDistrict, setSelectedDirectoryDistrict] = useState('');
  const [selectedDirectoryCategory, setSelectedDirectoryCategory] = useState('');
  const [directorySearch, setDirectorySearch] = useState('');
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const availableDistricts = [...new Set(publicNgos.filter(ngo => !selectedDirectoryState || selectedDirectoryState === '__ALL__' || normalizeState(ngo.state) === normalizeState(selectedDirectoryState)).map(ngo => ngo.district).filter(Boolean))].sort((a,b) => a.localeCompare(b));
  const availableCategories = [...new Set(publicNgos.map(ngo => ngo.type).filter(Boolean))].sort((a,b) => a.localeCompare(b));
  const filteredDirectoryNgos = publicNgos.filter(ngo => (!selectedDirectoryState || selectedDirectoryState === '__ALL__' || normalizeState(ngo.state) === normalizeState(selectedDirectoryState)) && (!selectedDirectoryDistrict || normalizeState(ngo.district) === normalizeState(selectedDirectoryDistrict)) && (!selectedDirectoryCategory || normalizeState(ngo.type) === normalizeState(selectedDirectoryCategory)) && (!directorySearch.trim() || [ngo.name, ngo.type, ngo.city, ngo.district, ngo.state, ngo.address].join(' ').toLocaleLowerCase().includes(directorySearch.trim().toLocaleLowerCase())));
  const [selectedNgo, setSelectedNgo] = useState<PublicNgo | null>(null);
  const [profileLoginRequired, setProfileLoginRequired] = useState(false);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [showPublicRegistration, setShowPublicRegistration] = useState(false);
  const [registrationBusy, setRegistrationBusy] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState('');
  const [paymentQrImage, setPaymentQrImage] = useState('');
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [publicForm, setPublicForm] = useState({ name: '', contact: '', phone: '', state: '', mission: '', planId: '', paymentReference: '' });
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
        mission: publicForm.mission.trim(), planId: publicForm.planId,
        subscriptionPlan: subscriptionPlans.find(p => p.id === publicForm.planId)?.name || '',
        planPrice: subscriptionPlans.find(p => p.id === publicForm.planId)?.price || 0,
        planDurationDays: subscriptionPlans.find(p => p.id === publicForm.planId)?.durationDays || 0,
        paymentReference: publicForm.paymentReference.trim(),
        status: 'PENDING_PAYMENT',
        paymentStatus: publicForm.paymentReference.trim() ? 'SUBMITTED_FOR_REVIEW' : 'NOT_SUBMITTED',
        ownerUid: authUser.uid, createdAt: serverTimestamp(),
      });
      setRegistrationMessage(hi ? 'रजिस्ट्रेशन जमा हो गया। भुगतान/UTR की जाँच और एडमिन की मंज़ूरी के बाद ही NGO सक्रिय होगा।' : 'Registration submitted. The NGO will activate only after payment verification and admin approval.');
      setPublicForm({ name: '', contact: '', phone: '', state: '', mission: '', planId: subscriptionPlans.find(p => p.active)?.id || '', paymentReference: '' });
    } catch (error) {
      setRegistrationMessage(error instanceof Error ? error.message : (hi ? 'रजिस्ट्रेशन सेव नहीं हुआ। Firebase नियम जाँचें।' : 'Could not save registration. Check Firebase rules.'));
    } finally { setRegistrationBusy(false); }
  };
  useEffect(() => {
    let active = true;
    getDocs(firestoreQuery(collection(db, 'subscriptionPlans'), where('active', '==', true))).then(snapshot => {
      if (active) setSubscriptionPlans(snapshot.docs.map(item => ({ id: item.id, name: String(item.data().name || ''), price: Number(item.data().price) || 0, durationDays: Number(item.data().durationDays) || 0, description: String(item.data().description || ''), active: item.data().active === true })).filter(p => p.name && p.price > 0 && p.durationDays > 0));
    }).catch(() => { if (active) setSubscriptionPlans([]); });
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
            city: str('city', 'district', 'location'),
            district: str('district', 'districtName', 'city'),
            state: str('state', 'stateName', 'province'),
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
      <nav className="public-nav"><a href="/members">{hi ? "Member ID कार्ड" : "Member ID Card"}</a><a href="/ngo-admin">{hi ? "NGO Admin" : "NGO Admin"}</a><a href="#about">{hi ? 'हमारे बारे में' : 'About'}</a><a href="#features">{hi ? 'सुविधाएँ' : 'Features'}</a><a href="#contact">{hi ? 'संपर्क' : 'Contact'}</a></nav>
      <div className="public-actions"><button className="language-button" onClick={() => setLanguage(hi ? 'en' : 'hi')}>{hi ? 'English' : 'हिन्दी'}</button><button className="outline-button" onClick={() => { setRegistrationMessage(''); setShowPublicRegistration(true); }}>{hi ? 'NGO रजिस्टर करें' : 'Register NGO'}</button>{authUser ? <div className="public-user"><span>{authUser.email}</span><button className="outline-button" onClick={onLogout}>{hi ? 'लॉगआउट' : 'Sign out'}</button></div> : <button className="primary-button" onClick={onLogin} disabled={!firebaseConfigured}><Globe2 size={17}/>{hi ? 'Google से लॉगिन' : 'Sign in with Google'}</button>}</div>
    </header>
    <main>
      <section className="public-hero" id="about"><div className="public-hero-copy"><span className="public-kicker"><HeartHandshake size={15}/>{hi ? 'सामाजिक बदलाव के लिए एक मंच' : 'A platform for social impact'}</span><h1>{hi ? <>सेवा का हर कदम,<br/><em>बदलाव की नई उम्मीद।</em></> : <>Every act of service,<br/><em>a new hope for change.</em></>}</h1><p>{hi ? 'NGO Connect संस्थाओं को अपने सदस्यों, स्वयंसेवकों, कार्यक्रमों, दान और रिपोर्ट को व्यवस्थित करने में मदद करने के लिए बनाया जा रहा है।' : 'NGO Connect is being built to help organizations manage members, volunteers, events, donations and reports in one place.'}</p><div className="public-hero-actions"><a className="primary-button" href="#features">{hi ? 'वेबसाइट देखें' : 'Explore the website'} <ArrowUpRight size={17}/></a></div>{authUser && <p className="public-signed-in">{hi ? 'लॉगिन ईमेल:' : 'Signed in as:'} <strong>{authUser.email}</strong>{!isSuperAdmin(authUser) && <span> · {hi ? 'सामान्य यूज़र' : 'Regular user'}</span>}</p>}</div><div className="public-hero-art" aria-hidden="true"><div className="public-art-ring ring-a"/><div className="public-art-ring ring-b"/><div className="public-art-main"><HeartHandshake size={78} strokeWidth={1.4}/></div><div className="public-art-chip chip-a"><Users size={18}/><span>{hi ? 'समुदाय' : 'Community'}</span></div><div className="public-art-chip chip-b"><HandCoins size={18}/><span>{hi ? 'पारदर्शिता' : 'Transparency'}</span></div><span className="public-art-spark spark-a">✦</span><span className="public-art-spark spark-b">✳</span></div></section>
      <section className="public-directory" id="ngos">
        <div className="public-section-heading"><span>{hi ? 'भारत भर की NGO सूची' : 'NGO DIRECTORY — INDIA'}</span><h2>{hi ? 'सभी सक्रिय NGO Connect संस्थाएँ' : 'Explore active NGO Connect organizations'}</h2><p>{hi ? 'राज्य, जिला, श्रेणी या नाम से खोजें। पूरी सार्वजनिक प्रोफ़ाइल देखने के लिए Google लॉगिन ज़रूरी है।' : 'Filter by state, district, category or name. Sign in with Google to view a complete public profile.'}</p></div>
        <div className="public-state-directory">
          <button type="button" className="public-state-toggle" aria-expanded={stateDropdownOpen} aria-controls="public-state-options" onClick={() => setStateDropdownOpen(open => !open)}><span className="public-state-toggle-icon"><Globe2 size={22}/></span><span><strong>NGO LIST</strong><small>{hi ? 'राज्य चुनकर NGO की सूची देखें' : 'Choose a state to browse its NGOs'}</small></span><ChevronDown className={stateDropdownOpen ? 'state-chevron is-open' : 'state-chevron'} size={22}/></button>
          {stateDropdownOpen && <div className="public-state-options" id="public-state-options"><button type="button" className={selectedDirectoryState === '__ALL__' ? 'public-state-option selected' : 'public-state-option'} onClick={() => { setSelectedDirectoryState('__ALL__'); setStateDropdownOpen(false); }}>{hi ? 'सभी राज्य और केंद्र शासित प्रदेश' : 'All states and union territories'} <span>{publicNgos.length}</span></button>{INDIAN_STATES.map(state => { const count = publicNgos.filter(ngo => normalizeState(ngo.state) === normalizeState(state)).length; return <button type="button" key={state} className={selectedDirectoryState === state ? 'public-state-option selected' : 'public-state-option'} onClick={() => { setSelectedDirectoryState(state); setStateDropdownOpen(false); }}><span>{state}</span><span>{count}</span></button>; })}</div>}
        </div>
        <div className="public-directory-filters">
          <label><span>{hi ? 'जिला' : 'District'}</span><select value={selectedDirectoryDistrict} onChange={e => setSelectedDirectoryDistrict(e.target.value)}><option value="">{hi ? 'सभी जिले' : 'All districts'}</option>{availableDistricts.map(district => <option key={district} value={district}>{district}</option>)}</select></label>
          <label><span>{hi ? 'NGO श्रेणी' : 'NGO category'}</span><select value={selectedDirectoryCategory} onChange={e => setSelectedDirectoryCategory(e.target.value)}><option value="">{hi ? 'सभी श्रेणियाँ' : 'All categories'}</option>{availableCategories.map(category => <option key={category} value={category}>{category}</option>)}</select></label>
          <label className="public-directory-search"><span>{hi ? 'नाम / स्थान खोजें' : 'Search name / location'}</span><input value={directorySearch} onChange={e => setDirectorySearch(e.target.value)} placeholder={hi ? 'NGO का नाम, शहर या पता…' : 'NGO name, city or address…'} /></label>
        </div>
        {directoryLoading ? <p className="public-directory-empty">{hi ? 'NGO सूची लोड हो रही है…' : 'Loading NGO directory…'}</p> : !selectedDirectoryState ? <p className="public-directory-empty">{hi ? 'अभी NGO Connect के सक्रिय रिकॉर्ड दिख रहे हैं। सरकारी रजिस्ट्री के रिकॉर्ड की जाँच के लिए नीचे NGO-DARPAN खोलें।' : 'Showing active NGO Connect records. Open NGO-DARPAN below to check records in the official government registry.'}</p> : filteredDirectoryNgos.length === 0 ? <p className="public-directory-empty">{hi ? (selectedDirectoryState === '__ALL__' ? 'अभी कोई सक्रिय NGO नहीं मिला।' : selectedDirectoryState + ' में अभी कोई सक्रिय NGO नहीं मिला।') : (selectedDirectoryState === '__ALL__' ? 'No active NGOs found in the directory yet.' : 'No active NGOs found in ' + selectedDirectoryState + ' yet.')}</p> : <div className="public-ngo-grid">{filteredDirectoryNgos.map(ngo => <button type="button" className="public-ngo-card" key={ngo.id} onClick={() => { setSelectedNgo(ngo); setProfileLoginRequired(!authUser); }}><div className="public-ngo-logo">{ngo.logo ? <img src={ngo.logo} alt="" /> : <HeartHandshake size={28}/>}</div><h3>{ngo.name}</h3><p>{ngo.type}</p><span>{[ngo.city, ngo.state].filter(Boolean).join(', ') || (hi ? 'स्थान उपलब्ध नहीं' : 'Location not listed')}</span><strong>{hi ? 'प्रोफ़ाइल देखें' : 'View profile'} <ArrowUpRight size={15}/></strong></button>)}</div>}
      </section>
      <section className="public-features" id="features"><div className="public-section-heading"><span>{hi ? 'एक ही जगह सब कुछ' : 'EVERYTHING IN ONE PLACE'}</span><h2>{hi ? 'समाज सेवा को आसान और व्यवस्थित बनाएँ' : 'Make community work simpler and organized'}</h2></div><div className="public-feature-grid"><article><div className="public-feature-icon"><HeartHandshake size={24}/></div><h3>{hi ? 'NGO प्रोफ़ाइल' : 'NGO profiles'}</h3><p>{hi ? 'संस्था की पहचान, उद्देश्य और सार्वजनिक जानकारी दिखाने के लिए।' : 'Share an organization’s mission and public information.'}</p></article><article><div className="public-feature-icon"><Users size={24}/></div><h3>{hi ? 'सदस्य और स्वयंसेवक' : 'Members & volunteers'}</h3><p>{hi ? 'टीम और स्वयंसेवकों के काम को व्यवस्थित करने की सुविधा।' : 'Organize teams and volunteer activity.'}</p></article><article><div className="public-feature-icon"><HandCoins size={24}/></div><h3>{hi ? 'दान और खर्च' : 'Donations & expenses'}</h3><p>{hi ? 'दान और खर्च का रिकॉर्ड रखने के लिए नियोजित सुविधा।' : 'Planned tools to keep donation and expense records.'}</p></article><article><div className="public-feature-icon"><CalendarDays size={24}/></div><h3>{hi ? 'कार्यक्रम और रिपोर्ट' : 'Events & reports'}</h3><p>{hi ? 'कार्यक्रम, दस्तावेज़, प्रमाणपत्र और रिपोर्ट के लिए।' : 'Tools for events, documents, certificates and reports.'}</p></article></div></section>
      <section className="public-cta" id="contact"><div><span>NGO CONNECT</span><h2>{hi ? 'बेहतर बदलाव के लिए साथ आएँ।' : 'Come together for a better impact.'}</h2><button className="primary-button" onClick={() => { setRegistrationMessage(''); setShowPublicRegistration(true); }}>{hi ? 'अपना NGO रजिस्टर करें' : 'Register your NGO'} <ArrowUpRight size={17}/></button></div></section>
      {showPublicRegistration && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !registrationBusy) setShowPublicRegistration(false); }}><section className="registration-modal" role="dialog" aria-modal="true" aria-labelledby="public-registration-title"><div className="modal-heading"><div><span className="modal-eyebrow">NGO CONNECT</span><h2 id="public-registration-title">{hi ? 'NGO रजिस्ट्रेशन' : 'NGO registration'}</h2><p>{hi ? 'Google लॉगिन के बाद जानकारी भेजें। भुगतान सत्यापन और एडमिन मंज़ूरी तक NGO सक्रिय नहीं होगा।' : 'Sign in with Google and submit your details. Activation happens only after payment verification and admin approval.'}</p></div><button className="icon-button" onClick={() => setShowPublicRegistration(false)} aria-label={hi ? 'बंद करें' : 'Close'}><X size={20}/></button></div>{!authUser ? <div className="public-profile-gate"><p>{hi ? 'रजिस्ट्रेशन के लिए पहले Google से लॉगिन करें।' : 'Sign in with Google before registering.'}</p><button className="primary-button" onClick={onLogin} disabled={!firebaseConfigured}><Globe2 size={17}/>{hi ? 'Google से लॉगिन' : 'Sign in with Google'}</button></div> : <form onSubmit={submitPublicRegistration}><label>{hi ? 'NGO / संस्था का नाम' : 'NGO / organization name'} *<input required maxLength={120} value={publicForm.name} onChange={e => setPublicForm({...publicForm, name:e.target.value})}/></label><label>{hi ? 'संपर्क व्यक्ति' : 'Contact person'} *<input required maxLength={100} value={publicForm.contact} onChange={e => setPublicForm({...publicForm, contact:e.target.value})}/></label><label>{hi ? 'मोबाइल नंबर' : 'Phone number'} *<input required type="tel" maxLength={25} value={publicForm.phone} onChange={e => setPublicForm({...publicForm, phone:e.target.value})}/></label><label>{hi ? 'राज्य' : 'State'}<select value={publicForm.state} onChange={e => setPublicForm({...publicForm, state:e.target.value})}><option value="">{hi ? 'राज्य चुनें' : 'Select state'}</option>{['Maharashtra','Uttar Pradesh','Madhya Pradesh','Gujarat','Karnataka','Rajasthan','Delhi','Other'].map(s => <option key={s}>{s}</option>)}</select></label><label>{hi ? 'संस्था का उद्देश्य' : 'Mission / purpose'}<textarea rows={3} maxLength={1000} value={publicForm.mission} onChange={e => setPublicForm({...publicForm, mission:e.target.value})}/></label><label>{hi ? 'सब्सक्रिप्शन प्लान' : 'Subscription plan'}<select required value={publicForm.planId} onChange={e => setPublicForm({...publicForm, planId:e.target.value})}><option value="">{hi ? 'प्लान चुनें' : 'Choose a plan'}</option>{subscriptionPlans.map(plan => <option key={plan.id} value={plan.id}>{plan.name} — ₹{plan.price} / {plan.durationDays} {hi ? 'दिन' : 'days'}</option>)}</select>{subscriptionPlans.length === 0 && <small>{hi ? 'अभी कोई सक्रिय प्लान उपलब्ध नहीं है। एडमिन से संपर्क करें।' : 'No active plans are available. Contact the administrator.'}</small>}</label>{paymentQrImage && <div className="payment-qr-preview"><h3>{hi ? 'UPI से भुगतान करें' : 'Pay by UPI'}</h3><img src={paymentQrImage} alt={hi ? 'NGO Connect UPI QR कोड' : 'NGO Connect UPI QR code'} /><p>{hi ? 'QR स्कैन करके भुगतान करें, फिर नीचे UTR नंबर भरें।' : 'Scan this QR to pay, then enter the UTR below.'}</p></div>}<label>{hi ? 'भुगतान UTR / संदर्भ नंबर (यदि भुगतान कर दिया है)' : 'Payment UTR / reference (if already paid)'}<input maxLength={80} value={publicForm.paymentReference} onChange={e => setPublicForm({...publicForm, paymentReference:e.target.value})} placeholder="UTR / transaction reference"/></label><div className="form-note"><ShieldCheck size={17}/><span>{hi ? 'UTR भेजना भुगतान का प्रमाण नहीं है। एडमिन बैंक/UPI रिकॉर्ड से सत्यापन करेगा। भुगतान निर्देश एडमिन से प्राप्त करें।' : 'A UTR is not proof by itself. Admin will verify against UPI/bank records. Obtain payment instructions from the administrator.'}</span></div>{registrationMessage && <p role="status" className="public-auth-error">{registrationMessage}</p>}<div className="modal-actions"><button type="button" className="outline-button" disabled={registrationBusy} onClick={() => setShowPublicRegistration(false)}>{hi ? 'बंद करें' : 'Close'}</button><button type="submit" className="primary-button" disabled={registrationBusy || subscriptionPlans.length === 0 || !publicForm.planId}>{registrationBusy ? (hi ? 'सेव हो रहा है…' : 'Saving…') : (hi ? 'रजिस्ट्रेशन जमा करें' : 'Submit registration')}</button></div></form>}</section></div>}
      {selectedNgo && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) { setSelectedNgo(null); setProfileLoginRequired(false); } }}><section className="registration-modal public-profile-modal" role="dialog" aria-modal="true" aria-labelledby="public-profile-title"><div className="modal-heading"><div><span className="modal-eyebrow">NGO CONNECT</span><h2 id="public-profile-title">{profileLoginRequired || !authUser ? (hi ? 'पूरा प्रोफ़ाइल देखने के लिए लॉगिन करें' : 'Sign in to view the full profile') : selectedNgo.name}</h2><p>{profileLoginRequired || !authUser ? (hi ? 'NGO की पूरी सार्वजनिक जानकारी देखने के लिए Google से लॉगिन करें।' : 'Sign in with Google to view the full public NGO profile.') : selectedNgo.type}</p></div><button className="icon-button" onClick={() => { setSelectedNgo(null); setProfileLoginRequired(false); }} aria-label={hi ? 'बंद करें' : 'Close'}><X size={20}/></button></div>{profileLoginRequired || !authUser ? <div className="public-profile-gate"><button className="primary-button" onClick={() => { setProfileLoginRequired(false); onLogin(); }} disabled={!firebaseConfigured}><Globe2 size={17}/>{hi ? 'Google से लॉगिन करें' : 'Sign in with Google'}</button></div> : <div className="public-profile-details"><h3>{selectedNgo.name}</h3><p>{selectedNgo.mission || (hi ? 'इस NGO ने अभी अपना परिचय नहीं जोड़ा है।' : 'This NGO has not added a description yet.')}</p>{selectedNgo.address && <p><strong>{hi ? 'पता:' : 'Address:'}</strong> {selectedNgo.address}</p>}{selectedNgo.phone && <p><strong>{hi ? 'संपर्क नंबर:' : 'Contact phone:'}</strong> {selectedNgo.phone}</p>}{selectedNgo.email && <p><strong>{hi ? 'संपर्क ईमेल:' : 'Contact email:'}</strong> {selectedNgo.email}</p>}{selectedNgo.website && <p><strong>{hi ? 'वेबसाइट:' : 'Website:'}</strong> <a href={selectedNgo.website.startsWith('http') ? selectedNgo.website : 'https://' + selectedNgo.website} target="_blank" rel="noreferrer">{selectedNgo.website}</a></p>}</div>}</section></div>}
      {authError && <p className="public-auth-error">{authError}</p>}
    </main><footer className="public-footer"><span>© 2026 NGO Connect</span></footer>
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
  const [form, setForm] = useState({ name: '', contact: '', email: '', phone: '', state: '', mission: '', planId: '' });
  const [pendingRegistrations, setPendingRegistrations] = useState<Array<Record<string, unknown> & { id: string }>>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [planForm, setPlanForm] = useState({ id: '', name: '', price: '300', durationDays: '30', description: '', active: true });
  const [planSaveBusy, setPlanSaveBusy] = useState(false);
  const [planMessage, setPlanMessage] = useState('');
  const [approvalBusyId, setApprovalBusyId] = useState('');
  const [registrationLoadError, setRegistrationLoadError] = useState('');
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
  useEffect(() => {
    if (!authUser || !isSuperAdmin(authUser) || section !== 'subscriptions') return;
    let active = true;
    getDoc(doc(db, 'publicSettings', 'payment')).then(snapshot => {
      if (active && snapshot.exists() && typeof snapshot.data().qrImage === 'string') setAdminQrImage(snapshot.data().qrImage as string);
    }).catch(() => { if (active) setQrSaveMessage('QR सेटिंग लोड नहीं हुई। Firestore Rules प्रकाशित हैं या नहीं जाँचें।'); });
    getDocs(collection(db, 'subscriptionPlans')).then(snapshot => {
      if (active) setSubscriptionPlans(snapshot.docs.map(item => ({ id: item.id, name: String(item.data().name || ''), price: Number(item.data().price) || 0, durationDays: Number(item.data().durationDays) || 0, description: String(item.data().description || ''), active: item.data().active === true })));
    }).catch(() => { if (active) setPlanMessage('सब्सक्रिप्शन प्लान लोड नहीं हुए। Firestore Rules जाँचें।'); });
    getDocs(collection(db, 'ngoRegistrations')).then(snapshot => {
      if (active) setPendingRegistrations(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
    }).catch(() => { if (active) setRegistrationLoadError('रजिस्ट्रेशन लोड नहीं हुए। Firestore rules प्रकाशित हैं या नहीं, जाँचें।'); });
    return () => { active = false; };
  }, [authUser, section]);
  useEffect(() => {
    if (!authUser || !isSuperAdmin(authUser) || !firebaseConfigured) {
      setDashboardLoading(false);
      return;
    }
    let active = true;
    const loadDashboard = async () => {
      setDashboardLoading(true);
      setDashboardError('');
      try {
        const [ngoSnap, memberSnap, transactionSnap, eventSnap, documentSnap] = await Promise.all([
          getDocs(collection(db, 'ngos')),
          getDocs(collection(db, 'ngoMembers')),
          getDocs(collection(db, 'ngoTransactions')),
          getDocs(collection(db, 'ngoEvents')),
          getDocs(collection(db, 'ngoDocuments')),
        ]);
        if (!active) return;
        const members = memberSnap.docs.map(d => ({ id: d.id, ...d.data() } as DashboardRecord));
        const transactions = transactionSnap.docs.map(d => ({ id: d.id, ...d.data() } as DashboardRecord));
        const events = eventSnap.docs.map(d => ({ id: d.id, ...d.data() } as DashboardRecord));
        const documents = documentSnap.docs.map(d => ({ id: d.id, ...d.data() } as DashboardRecord));
        const ngos = ngoSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            name: String(data.name || data.ngoName || 'NGO'),
            type: String(data.type || data.category || data.mission || 'Social organization'),
            city: String(data.city || data.district || data.location || data.state || '—'),
            status: String(data.status || 'UNKNOWN'),
            ownerUid: String(data.ownerUid || ''),
            people: members.filter(m => m.ngoId === d.id).length,
          };
        });
        setLiveNgos(ngos);
        setLiveMembers(members);
        setLiveTransactions(transactions);
        setLiveEvents(events);
        setLiveDocuments(documents);
      } catch (error) {
        if (active) setDashboardError(error instanceof Error ? error.message : 'Firebase डेटा लोड नहीं हुआ। Firestore Rules और कनेक्शन जाँचें।');
      } finally {
        if (active) setDashboardLoading(false);
      }
    };
    void loadDashboard();
    return () => { active = false; };
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
          city: String(data.state || ''),
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
        phone: form.phone.trim(), state: form.state, mission: form.mission.trim(),
        planId: form.planId || subscriptionPlans.find(p => p.active)?.id || '',
        subscriptionPlan: subscriptionPlans.find(p => p.id === (form.planId || subscriptionPlans.find(p => p.active)?.id))?.name || '',
        planPrice: subscriptionPlans.find(p => p.id === (form.planId || subscriptionPlans.find(p => p.active)?.id))?.price || 0,
        planDurationDays: subscriptionPlans.find(p => p.id === (form.planId || subscriptionPlans.find(p => p.active)?.id))?.durationDays || 0,
        paymentReference: '', status: 'PENDING_PAYMENT', paymentStatus: 'NOT_SUBMITTED', ownerUid: authUser.uid, createdAt: serverTimestamp(),
      });
      setPendingRegistrations(current => [{ id: ref.id, name: form.name.trim(), contactName: form.contact.trim(), email: authUser.email, phone: form.phone.trim(), state: form.state, mission: form.mission.trim(), planId: form.planId || subscriptionPlans.find(p => p.active)?.id || '', subscriptionPlan: subscriptionPlans.find(p => p.id === (form.planId || subscriptionPlans.find(p => p.active)?.id))?.name || '', planPrice: subscriptionPlans.find(p => p.id === (form.planId || subscriptionPlans.find(p => p.active)?.id))?.price || 0, planDurationDays: subscriptionPlans.find(p => p.id === (form.planId || subscriptionPlans.find(p => p.active)?.id))?.durationDays || 0, paymentReference: '', status: 'PENDING_PAYMENT', paymentStatus: 'NOT_SUBMITTED', ownerUid: authUser.uid }, ...current]);
      notify(language === 'hi' ? 'NGO रजिस्ट्रेशन Firebase में सेव हुआ। UPI भुगतान और सत्यापन के बाद ही सक्रिय होगा।' : 'NGO registration saved to Firebase. It activates only after payment and verification.');
      setShowRegistration(false);
      setForm({ name: '', contact: '', email: authUser.email, phone: '', state: '', mission: '', planId: '' });
    } catch (error) {
      notify(error instanceof Error ? error.message : (language === 'hi' ? 'रजिस्ट्रेशन सेव नहीं हुआ। Firestore Rules जाँचें।' : 'Registration failed. Check Firestore rules.'));
    }
  };
  const pageTitle = nav.find(item => item.id === section)?.key ?? 'overview';

  if (window.location.pathname.startsWith('/member-verify')) return <MemberVerifyPage />;
  if (window.location.pathname.startsWith('/ngo-workspace')) {
    if (authUser) return <NgoWorkspacePortal authUser={authUser} language={language} />;
    return <main className="member-portal"><section className="member-portal-hero"><span>NGO CONNECT</span><h1>{language === 'hi' ? 'NGO Admin लॉगिन' : 'NGO Admin sign in'}</h1><p>{language === 'hi' ? 'अपने NGO के owner Google खाते से लॉगिन करें।' : 'Sign in with the Google account that owns your NGO.'}</p><button className="primary-button" onClick={() => void loginAsSuperAdmin()} disabled={!firebaseConfigured}><Globe2 size={17}/> {language === 'hi' ? 'Google से लॉगिन करें' : 'Continue with Google'}</button>{authError && <p className="member-notice" role="alert">{authError}</p>}</section></main>;
  }
  if (window.location.pathname.startsWith('/members')) return <MemberIDPortal authUser={authUser} onLogin={loginAsSuperAdmin} language={language} />;
  if (window.location.pathname.startsWith('/ngo-admin')) {
    if (authUser) return <NgoAdminPortal authUser={authUser} language={language} />;
    return <main className="member-portal">
      <header className="member-portal-header"><a className="member-brand" href="/">NGO<span>Connect</span></a><a className="outline-button" href="/">होम</a></header>
      <section className="member-portal-hero"><span>NGO ADMIN</span><h1>{language === 'hi' ? 'NGO Admin लॉगिन' : 'NGO Admin sign in'}</h1><p>{language === 'hi' ? 'अपने NGO के मालिक वाले Google खाते से लॉगिन करें।' : 'Sign in with the Google account that owns your NGO.'}</p>
        <button className="primary-button" onClick={() => void loginAsSuperAdmin()} disabled={!firebaseConfigured}><Globe2 size={17}/> {language === 'hi' ? 'Google से लॉगिन करें' : 'Continue with Google'}</button>
        {authError && <p className="member-notice" role="alert">{authError}</p>}
      </section>
    </main>;
  }
  if (!authUser || !isSuperAdmin(authUser)) return <PublicHome language={language} setLanguage={setLanguage} authUser={authUser} onLogin={loginAsSuperAdmin} onLogout={() => { if (auth) void signOut(auth); }} authError={authError} />;
  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Leaf size={22} strokeWidth={2.4} /></div><div><div className="brand-name">NGO<span>Connect</span></div><div className="brand-caption">{t.tagline}</div></div><button className="icon-button close-menu" onClick={() => setMobileMenu(false)} aria-label="Close menu"><X size={19}/></button></div>
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
        </section><section className="panel directory-panel payment-qr-admin"><div className="panel-heading"><div><h3>UPI QR इमेज सेटिंग</h3><p>यह QR NGO रजिस्ट्रेशन फ़ॉर्म में सभी यूज़र को दिखेगा।</p></div></div><form onSubmit={savePaymentQr} className="qr-admin-form"><label>QR कोड इमेज अपलोड करें (JPG / PNG / WebP, अधिकतम 500 KB)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => handleQrFile(e.target.files?.[0])}/></label>{adminQrImage && <img className="admin-qr-preview" src={adminQrImage} alt="UPI QR preview"/>}{qrSaveMessage && <p role="status" className="qr-save-message">{qrSaveMessage}</p>}<button className="primary-button" type="submit" disabled={qrSaveBusy || !adminQrImage}>{qrSaveBusy ? 'सेव हो रहा है…' : 'QR इमेज सेव करें'}</button></form></section><section className="panel directory-panel"><div className="panel-heading"><div><h3>NGO रजिस्ट्रेशन और भुगतान जाँच</h3><p>UTR को बैंक/UPI रिकॉर्ड से मिलाने के बाद ही Activate करें।</p></div><span className="status-pill pill-pending">{pendingRegistrations.filter(item => item.status === 'PENDING_PAYMENT').length} Pending</span></div>{registrationLoadError && <p role="alert">{registrationLoadError}</p>}{pendingRegistrations.length === 0 ? <div className="empty-state">अभी कोई रजिस्ट्रेशन नहीं मिला। Firebase में rules प्रकाशित करें और नए रजिस्ट्रेशन आने दें।</div> : <div className="ngo-table-wrap"><table className="ngo-table"><thead><tr><th>NGO</th><th>संपर्क</th><th>प्लान</th><th>UTR / स्थिति</th><th>कार्रवाई</th></tr></thead><tbody>{pendingRegistrations.map(item => <tr key={item.id}><td><strong>{String(item.name || 'नाम नहीं')}</strong><br/><span className="table-muted">{String(item.state || '')}</span></td><td>{String(item.contactName || '')}<br/><span className="table-muted">{String(item.email || '')} · {String(item.phone || '')}</span></td><td>{String(item.subscriptionPlan || '')}<br/><span className="table-muted">₹{Number(item.planPrice || 0).toLocaleString('en-IN')} / {Number(item.planDurationDays || 0)} दिन</span></td><td>{String(item.paymentReference || 'UTR नहीं दिया')}<br/><span className="table-muted">{String(item.paymentStatus || item.status || '')}</span></td><td>{item.status === 'PENDING_PAYMENT' ? <button className="primary-button" disabled={approvalBusyId === item.id} onClick={() => void approveRegistration(item)}>{approvalBusyId === item.id ? 'जाँच…' : 'भुगतान सत्यापित कर Activate'}</button> : <span className="status-pill pill-active">LIVE / VERIFIED</span>}</td></tr>)}</tbody></table></div>}</section></>}
        {section === 'overview' && <>
          {dashboardError && <div className="setup-banner" role="alert"><div className="setup-icon"><ShieldCheck size={20}/></div><div className="setup-copy"><strong>Firebase डेटा लोड नहीं हुआ</strong><p>{dashboardError}</p></div></div>}
          {dashboardLoading && <div className="empty-state">Firebase से असली डेटा लोड हो रहा है…</div>}
          {!dashboardLoading && !dashboardError && <section className="hero-panel"><div className="hero-copy"><div className="hero-pill"><Activity size={14}/>{language === 'hi' ? 'सामाजिक प्रभाव, एक जगह' : 'Social impact, all in one place'}</div><h2>{t.activityTitle}</h2><p>{language === 'hi' ? 'यह डैशबोर्ड Firebase में सेव असली रिकॉर्ड दिखाता है।' : 'This dashboard shows real records saved in Firebase.'}</p><button className="hero-button" onClick={() => chooseSection('ngos')}>{t.directory}<ArrowUpRight size={16}/></button><div className="hero-avatars"><div className="mini-avatar mini-one">NG</div><div className="mini-avatar mini-two">CO</div><div className="mini-avatar mini-three">NN</div><span>{liveNgos.length} {language === 'hi' ? 'संस्थाएँ' : 'organizations'}</span></div></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-circle"><HeartHandshake size={68} strokeWidth={1.35}/></div><div className="floating-chip chip-top"><span className="chip-icon green"><Users size={16}/></span><span><b>{liveMembers.length}</b><small>{t.membersCount}</small></span></div><div className="floating-chip chip-bottom"><span className="chip-icon yellow"><HandCoins size={16}/></span><span><b>₹{totalDonations.toLocaleString('en-IN')}</b><small>{t.totalDonations}</small></span></div><div className="sparkle sparkle-one">✦</div><div className="sparkle sparkle-two">✳</div></div></section>}
          <section className="stats-grid"><article className="stat-card"><div className="stat-top"><span>{t.totalDonations}</span><span className="stat-icon icon-green"><HandCoins size={19}/></span></div><div className="stat-number">₹{totalDonations.toLocaleString('en-IN')}</div><div className="stat-foot"><span className="trend neutral">{liveTransactions.filter(row => String(row.type || '').toUpperCase() === 'DONATION').length}</span><span>{language === 'hi' ? 'दान रिकॉर्ड' : 'donation records'}</span></div></article><article className="stat-card"><div className="stat-top"><span>{t.expenses}</span><span className="stat-icon icon-orange"><Wallet size={19}/></span></div><div className="stat-number">₹{totalExpenses.toLocaleString('en-IN')}</div><div className="stat-foot"><span className="trend neutral">{liveTransactions.filter(row => String(row.type || '').toUpperCase() === 'EXPENSE').length}</span><span>{language === 'hi' ? 'खर्च रिकॉर्ड' : 'expense records'}</span></div></article><article className="stat-card"><div className="stat-top"><span>{t.membersCount}</span><span className="stat-icon icon-purple"><Users size={19}/></span></div><div className="stat-number">{liveMembers.length}</div><div className="stat-foot"><span className="trend neutral">{liveMembers.filter(row => String(row.role || '').toUpperCase() === 'VOLUNTEER').length}</span><span>{t.volunteers}</span></div></article><article className="stat-card"><div className="stat-top"><span>{t.programs}</span><span className="stat-icon icon-blue"><CalendarDays size={19}/></span></div><div className="stat-number">{liveEvents.length}</div><div className="stat-foot"><span className="trend neutral">{activeEvents} {t.active.toLowerCase()}</span><span>{t.month}</span></div></article></section>
          <section className="content-grid"><div className="panel activity-panel"><div className="panel-heading"><div><h3>{t.recent}</h3><p>{language === 'hi' ? 'Firebase में सेव हाल के रिकॉर्ड' : 'Recent records saved in Firebase'}</p></div><button className="text-button" onClick={() => chooseSection('finance')}>{t.viewAll}<ArrowUpRight size={15}/></button></div><div className="activity-list">{recentItems.length === 0 ? <div className="empty-state">{t.noData}</div> : recentItems.map(row => <div className="activity-item" key={row.kind + row.id}><div className={`activity-icon ${row.kind === 'transaction' ? 'activity-donation' : row.kind === 'member' ? 'activity-member' : row.kind === 'event' ? 'activity-event' : 'activity-doc'}`}>{row.kind === 'transaction' ? <HandCoins size={17}/> : row.kind === 'member' ? <Users size={17}/> : row.kind === 'event' ? <CalendarDays size={17}/> : <FileBadge size={17}/>}</div><div className="activity-description"><strong>{String(row.name || row.title || row.category || (row.kind === 'transaction' ? row.type : row.kind === 'member' ? (language === 'hi' ? 'नया सदस्य' : 'Member record') : 'Record'))}</strong><span>{String(row.ngoName || liveNgos.find(n => n.id === row.ngoId)?.name || 'NGO')} · {row.when && !Number.isNaN(row.when.getTime()) ? row.when.toLocaleString(language === 'hi' ? 'hi-IN' : 'en-IN') : (language === 'hi' ? 'तारीख उपलब्ध नहीं' : 'Date unavailable')}</span></div><div className="activity-amount">{row.kind === 'transaction' ? (String(row.type).toUpperCase() === 'DONATION' ? '+' : '−') + '₹' + (Number(row.amount) || 0).toLocaleString('en-IN') : String(row.status || '')}</div></div>)}</div></div>
          <div className="panel quick-panel"><div className="panel-heading"><div><h3>{t.quick}</h3><p>{language === 'hi' ? 'काम जल्दी शुरू करें' : 'Get things moving'}</p></div><div className="panel-heading-icon"><ClipboardList size={18}/></div></div><div className="quick-actions"><button onClick={() => setShowRegistration(true)}><span className="quick-icon quick-green"><HeartHandshake size={19}/></span><span><b>{t.register}</b><small>{language === 'hi' ? 'नई संस्था जोड़ें' : 'Add a new organization'}</small></span><Plus size={16}/></button><button onClick={() => chooseSection('members')}><span className="quick-icon quick-purple"><Users size={19}/></span><span><b>{t.addMember}</b><small>{language === 'hi' ? 'टीम में लोगों को जोड़ें' : 'Grow your team'}</small></span><Plus size={16}/></button><button onClick={() => chooseSection('finance')}><span className="quick-icon quick-yellow"><HandCoins size={19}/></span><span><b>{t.recordDonation}</b><small>{language === 'hi' ? 'दान और खर्च का हिसाब' : 'Track contributions'}</small></span><Plus size={16}/></button><button onClick={() => chooseSection('events')}><span className="quick-icon quick-blue"><CalendarDays size={19}/></span><span><b>{t.createEvent}</b><small>{language === 'hi' ? 'अगला कार्यक्रम प्लान करें' : 'Plan what comes next'}</small></span><Plus size={16}/></button></div></div></section>
          <section className="panel directory-panel"><div className="panel-heading"><div><h3>{t.directory}</h3><p>{language === 'hi' ? 'Firebase में सेव संस्थाएँ' : 'Organizations saved in Firebase'}</p></div><button className="text-button" onClick={() => chooseSection('ngos')}>{t.viewAll}<ArrowUpRight size={15}/></button></div><div className="ngo-table-wrap"><table className="ngo-table"><thead><tr><th>{language === 'hi' ? 'संस्था' : 'Organization'}</th><th>{language === 'hi' ? 'स्थान' : 'Location'}</th><th>{t.membersCount}</th><th>{t.status}</th><th/></tr></thead><tbody>{filteredNgos.slice(0,3).map(ngo => <tr key={ngo.id}><td><div className="ngo-name-cell"><div className="ngo-logo mint">{ngo.name.slice(0,2).toUpperCase()}</div><div><strong>{ngo.name}</strong><span>{ngo.type}</span></div></div></td><td className="table-muted">{ngo.city}</td><td><span className="people-count"><Users size={14}/>{ngo.people}</span></td><td><span className={`status-pill ${['LIVE','ACTIVE','APPROVED'].includes(ngo.status.toUpperCase()) ? 'pill-active' : 'pill-pending'}`}><i/>{ngo.status}</span></td><td><button className="small-icon-button" aria-label={`Open ${ngo.name}`} onClick={() => { window.location.href = '/ngo-workspace'; }}><ArrowUpRight size={16}/></button></td></tr>)}</tbody></table>{filteredNgos.length === 0 && <div className="empty-state">{t.noData}</div>}</div></section>
        </>}
        {section !== 'overview' && <section className="section-view"><div className="section-intro"><div className="section-icon"><>{nav.find(n => n.id === section)?.icon && (() => { const Icon = nav.find(n => n.id === section)!.icon; return <Icon size={26}/>; })()}</></div><div><h2>{t[pageTitle]}</h2><p>{section === 'subscriptions' ? 'NGO registration and payment verification status from Firebase.' : (language === 'hi' ? 'यह सूची Firebase के असली रिकॉर्ड से आती है।' : 'This list is loaded from real Firebase records.')}</p></div></div>
          {dashboardError && <div className="empty-state" role="alert">{dashboardError}</div>}
          {section === 'ngos' && <div className="ngo-cards">{filteredNgos.map(ngo => <article className="ngo-card" key={ngo.id}><div className="ngo-logo large mint">{ngo.name.slice(0,2).toUpperCase()}</div><span className={`status-pill ${['LIVE','ACTIVE','APPROVED'].includes(ngo.status.toUpperCase()) ? 'pill-active' : 'pill-pending'}`}><i/>{ngo.status}</span><h3>{ngo.name}</h3><p>{ngo.type}</p><div className="ngo-card-meta"><span><Users size={15}/>{ngo.people} {t.membersCount.toLowerCase()}</span><span>{ngo.city}</span></div></article>)}{filteredNgos.length === 0 && <div className="empty-panel">
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
          {section === 'subscriptions' && <section className="panel directory-panel"><div className="panel-heading"><h3>NGO registration/payment · {pendingRegistrations.length}</h3></div>{pendingRegistrations.length === 0 ? <div className="empty-state">{registrationLoadError || t.noData}</div> : <div className="ngo-table-wrap"><table className="ngo-table"><thead><tr><th>NGO</th><th>ईमेल</th><th>प्लान</th><th>भुगतान</th><th>स्थिति</th></tr></thead><tbody>{pendingRegistrations.map(row => <tr key={row.id}><td>{String(row.name || '—')}</td><td>{String(row.email || '—')}</td><td>{String(row.subscriptionPlan || '—')}</td><td>{String(row.paymentStatus || '—')} · {String(row.paymentReference || 'UTR नहीं')}</td><td>{String(row.status || '—')}</td></tr>)}</tbody></table></div>}</section>}
        </section>}
        <footer className="page-footer"><span>© 2026 NGO Connect · {t.footer}</span><span><span className="footer-status"/> {dashboardLoading ? (language === 'hi' ? 'डेटा लोड हो रहा है' : 'Loading data') : dashboardError ? (language === 'hi' ? 'डेटा त्रुटि' : 'Data error') : (language === 'hi' ? 'Firebase से जुड़ा' : 'Connected to Firebase')}</span></footer>
      </div>
    </main>
    {showRegistration && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setShowRegistration(false); }}><section className="registration-modal" role="dialog" aria-modal="true" aria-labelledby="registration-title"><div className="modal-heading"><div><span className="modal-eyebrow">NGO CONNECT</span><h2 id="registration-title">{t.registerTitle}</h2><p>{t.registrationNote}</p></div><button className="icon-button" onClick={() => setShowRegistration(false)} aria-label={t.cancel}><X size={20}/></button></div><form onSubmit={submitRegistration}><label>{language === 'hi' ? 'सब्सक्रिप्शन प्लान' : 'Subscription plan'}<select required value={form.planId || subscriptionPlans.find(p => p.active)?.id || ''} onChange={e => setForm({...form, planId:e.target.value})}><option value="">{language === 'hi' ? 'प्लान चुनें' : 'Choose a plan'}</option>{subscriptionPlans.filter(p => p.active).map(plan => <option key={plan.id} value={plan.id}>{plan.name} — ₹{plan.price} / {plan.durationDays} दिन</option>)}</select></label><label>{t.orgName} *<input required value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder={language === 'hi' ? 'जैसे: उम्मीद फाउंडेशन' : 'e.g. Umeed Foundation'}/></label><div className="form-two-col"><label>{t.contactName} *<input required value={form.contact} onChange={e => setForm({...form, contact:e.target.value})} placeholder={language === 'hi' ? 'पूरा नाम' : 'Full name'}/></label><label>{t.phone} *<input required type="tel" value={form.phone} onChange={e => setForm({...form, phone:e.target.value})} placeholder="+91"/></label></div><label>{t.email}<input type="email" value={authUser?.email || form.email} readOnly /></label><label>{t.state}<select value={form.state} onChange={e => setForm({...form, state:e.target.value})}><option value="">{language === 'hi' ? 'राज्य चुनें' : 'Select state'}</option>{['Maharashtra','Uttar Pradesh','Madhya Pradesh','Gujarat','Karnataka','Rajasthan','Delhi','Other'].map(s => <option key={s}>{s}</option>)}</select></label><label>{t.mission}<textarea rows={3} value={form.mission} onChange={e => setForm({...form, mission:e.target.value})} placeholder={language === 'hi' ? 'आपकी संस्था किस क्षेत्र में काम करती है?' : 'What does your organization work on?'}/></label><div className="form-note"><ShieldCheck size={17}/><span>{t.registrationNote}</span></div><div className="modal-actions"><button type="button" className="outline-button" onClick={() => setShowRegistration(false)}>{t.cancel}</button><button type="submit" className="primary-button" disabled={!subscriptionPlans.some(p => p.active)}><CheckCircle2 size={17}/>{t.submit}</button></div></form></section></div>}
    {toast && <div className="toast"><CheckCircle2 size={18}/>{toast}<button onClick={() => setToast('')} aria-label="Dismiss"><X size={16}/></button></div>}
  </div>;
}
