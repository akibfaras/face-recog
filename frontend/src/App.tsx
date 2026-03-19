import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Settings, 
  LayoutDashboard, 
  Camera, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  LogOut,
  UserPlus,
  History,
  Smartphone,
  QrCode,
  Fingerprint
} from 'lucide-react';
import axios from 'axios';
import { QRCodeCanvas } from 'qrcode.react';

// --- GLOBAL CONFIG ---
axios.defaults.timeout = 10000;

// API Configuration - All traffic routed through Unified Proxy on Port 3000
const API_URLS = {
  USER: '/api/user',
  RECOGNITION: '/api/recognition',
  ATTENDANCE: '/api/attendance'
};

const App = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const isMobileAuthPage = window.location.pathname === '/mobile-auth' || urlParams.has('session');
  const sessionFromUrl = urlParams.get('session');

  const [activeTab, setActiveTab] = useState('dashboard');
  const [cameraStatus, setCameraStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  
  // --- Mobile Verification State ---
  const [mobileSessionId, setMobileSessionId] = useState<string | null>(null);
  const [serverIP, setServerIP] = useState<string | null>(null);
  const [mobileVerificationStatus, setMobileVerificationStatus] = useState<'IDLE' | 'PENDING' | 'VERIFIED'>('IDLE');
  const [sessionType, setSessionType] = useState<'VERIFY' | 'ENROLL'>('VERIFY');
  const [enrollmentProgress, setEnrollmentProgress] = useState<any>({});
  const [userAttendance, setUserAttendance] = useState<any[]>([]);
  const [isRegisteringMobile, setIsRegisteringMobile] = useState(false);
  const [mobileRegData, setMobileRegData] = useState({
    employee_id: '',
    full_name: '',
    department: '',
    position: ''
  });
  const mobileVideoRef = useRef<HTMLVideoElement>(null);
  const mobileFileInputRef = useRef<HTMLInputElement>(null);

  // --- Device Linking State ---
  const [linkedUser, setLinkedUser] = useState<any>(null);
  const [linkingEmployeeId, setLinkingEmployeeId] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  // --- Mobile Actions ---
  const triggerMobileCapture = () => {
    if (mobileFileInputRef.current) {
      mobileFileInputRef.current.click();
    }
  };

  const handleMobileFileCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !linkedUser) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsLinking(true);
      const resp = await axios.post(`${API_URLS.RECOGNITION}/recognize`, formData);
      if (resp.data.match && resp.data.user_id === linkedUser.id) {
        setMobileVerificationStatus('VERIFIED');
        fetchUserAttendance(linkedUser.id);
        alert("Identity Confirmed via Neural Match!");
      } else {
        alert("Face match failed. Please try again.");
      }
    } catch (err) {
      alert("Verification failed. Ensure your face is clear and laptop is reachable.");
    } finally {
      setIsLinking(false);
    }
  };

  const linkDevice = async () => {
    if (!linkingEmployeeId) return;
    setIsLinking(true);
    try {
      let deviceId = localStorage.getItem('device_id');
      if (!deviceId) {
        deviceId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem('device_id', deviceId);
      }
      const resp = await axios.post(`${API_URLS.USER}/users/link-device`, { employee_id: linkingEmployeeId, device_id: deviceId });
      setLinkedUser({ id: resp.data.user_id, full_name: resp.data.full_name });
      alert("Device linked successfully!");
    } catch (err: any) { 
      alert(`Linking failed. Ensure you are on the same network as the laptop.`);
    }
    finally { setIsLinking(false); }
  };

  const registerFromMobile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLinking(true);
    try {
      const userResp = await axios.post(`${API_URLS.USER}/users/`, { ...mobileRegData, status: 'Active' });
      let deviceId = localStorage.getItem('device_id') || Math.random().toString(36).substring(2);
      localStorage.setItem('device_id', deviceId);
      await axios.post(`${API_URLS.USER}/users/link-device`, { employee_id: mobileRegData.employee_id, device_id: deviceId });
      setLinkedUser({ id: userResp.data.id, full_name: userResp.data.full_name });
      setIsRegisteringMobile(false);
      alert("Registration Successful!");
    } catch (err) { alert("Registration failed."); }
    finally { setIsLinking(false); }
  };

  const fetchLinkedUserProfile = async () => {
    const deviceId = localStorage.getItem('device_id');
    if (!deviceId) return;
    try {
      const resp = await axios.get(`${API_URLS.USER}/users/me?device_id=${deviceId}`);
      setLinkedUser(resp.data);
      fetchUserAttendance(resp.data.id);
    } catch (err) { }
  };

  useEffect(() => { if (isMobileAuthPage) fetchLinkedUserProfile(); }, [isMobileAuthPage]);

  // --- WebAuthn / Passkey Helpers ---
  const registerBiometrics = async (userId: number) => {
    try {
      const optionsResp = await axios.get(`${API_URLS.USER}/users/${userId}/passkey/register/options`);
      const options = optionsResp.data;

      // Convert Base64URL to Uint8Array for the browser
      options.challenge = Uint8Array.from(atob(options.challenge.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
      options.user.id = Uint8Array.from(atob(options.user.id.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
      if (options.excludeCredentials) {
        options.excludeCredentials.forEach((c: any) => {
          c.id = Uint8Array.from(atob(c.id.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
        });
      }

      const credential: any = await navigator.credentials.create({ publicKey: options });
      
      // Convert response to JSON for backend
      const credentialJSON = {
        id: credential.id,
        rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
        type: credential.type,
        response: {
          clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
          attestationObject: btoa(String.fromCharCode(...new Uint8Array(credential.response.attestationObject))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
        },
        clientExtensionResults: credential.getClientExtensionResults(),
      };

      await axios.post(`${API_URLS.USER}/users/${userId}/passkey/register/verify`, credentialJSON);
      alert("Passkey Sync Successful!");
    } catch (err) {
      console.error(err);
      alert("Passkey registration failed. Ensure HTTPS and local hardware support.");
    }
  };

  const authenticateBiometrics = async (userId: number, action: 'CHECK_IN' | 'CHECK_OUT') => {
    try {
      const optionsResp = await axios.get(`${API_URLS.USER}/users/${userId}/passkey/login/options`);
      const options = optionsResp.data;

      options.challenge = Uint8Array.from(atob(options.challenge.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
      if (options.allowCredentials) {
        options.allowCredentials.forEach((c: any) => {
          c.id = Uint8Array.from(atob(c.id.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
        });
      }

      const assertion: any = await navigator.credentials.get({ publicKey: options });

      const assertionJSON = {
        id: assertion.id,
        rawId: btoa(String.fromCharCode(...new Uint8Array(assertion.rawId))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
        type: assertion.type,
        response: {
          clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(assertion.response.clientDataJSON))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
          authenticatorData: btoa(String.fromCharCode(...new Uint8Array(assertion.response.authenticatorData))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
          signature: btoa(String.fromCharCode(...new Uint8Array(assertion.response.signature))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
          userHandle: assertion.response.userHandle ? btoa(String.fromCharCode(...new Uint8Array(assertion.response.userHandle))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '') : null,
        },
        clientExtensionResults: assertion.getClientExtensionResults(),
      };

      await axios.post(`${API_URLS.USER}/users/${userId}/passkey/login/verify`, assertionJSON);
      
      await axios.post(`${API_URLS.ATTENDANCE}/attendance/log`, null, { 
        params: { user_id: userId, status: action, method: 'MOBILE_PASSKEY' } 
      });
      
      setMobileVerificationStatus('VERIFIED');
      fetchUserAttendance(userId);
      alert(`${action} Success via Passkey!`);
    } catch (err) {
      console.warn("Passkey failed, using Face Fallback...");
      triggerMobileCapture();
    }
  };

  // --- Admin / Laptop Core Logic ---
  const [users, setUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({ 
    employee_id: '', full_name: '', email: '', dob: '', contact_number: '',
    department: '', position: '', hire_date: '', salary: '', status: 'Active'
  });
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [stats, setStats] = useState<any>({
    present_today: 0, total_registered: 0, engagement_rate: 0, punctuality_rate: 0,
    ai_confidence_index: 0, model_stability: 100, method_distribution: { FACE: 0, MOBILE: 0 },
    department_distribution: {}, hourly_peaks: {}, system_status: 'Online'
  });
  const [lastResult, setLastResult] = useState<any>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const registrationVideoRef = useRef<HTMLVideoElement>(null);
  const recognitionInterval = useRef<any>(null);

  const fetchStats = async () => {
    try {
      const resp = await axios.get(`${API_URLS.ATTENDANCE}/attendance/stats/overview`);
      setStats(resp.data);
    } catch (err) { }
  };

  const fetchUsers = async () => {
    try {
      const resp = await axios.get(`${API_URLS.USER}/users/`);
      setUsers(resp.data);
    } catch (err) { }
  };

  const fetchLogs = async (userId?: number) => {
    const targetId = userId || lastResult?.user_id;
    if (targetId) {
      try {
        const resp = await axios.get(`${API_URLS.ATTENDANCE}/attendance/${targetId}`);
        setLogs(resp.data);
      } catch (err) { }
    }
  };

  const createMobileSession = async (type: 'VERIFY' | 'ENROLL' = 'VERIFY') => {
    try {
      setSessionType(type);
      const resp = await axios.post(`${API_URLS.ATTENDANCE}/attendance/session/create?type=${type}`);
      setMobileSessionId(resp.data.session_id);
      setServerIP(resp.data.server_ip);
      setMobileVerificationStatus('PENDING');
    } catch (err) { alert("Laptop server unreachable."); }
  };

  const captureAndRecognize = async () => {
    if (!videoRef.current || isRecognizing) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const formData = new FormData();
      formData.append('file', blob, 'capture.jpg');
      setIsRecognizing(true);
      try {
        const resp = await axios.post(`${API_URLS.RECOGNITION}/recognize`, formData);
        setLastResult(resp.data);
        if (resp.data.match) fetchStats();
      } catch (err) { setLastResult({ match: false, message: "Detection Error" }); }
      finally { setIsRecognizing(false); }
    }, 'image/jpeg', 0.8);
  };

  const toggleRecognition = () => {
    if (recognitionInterval.current) { 
      clearInterval(recognitionInterval.current); 
      recognitionInterval.current = null; 
      setLastResult(null); 
    }
    else recognitionInterval.current = setInterval(captureAndRecognize, 3000);
  };

  const captureEnrollmentPhoto = () => {
    if (!registrationVideoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = registrationVideoRef.current.videoWidth;
    canvas.height = registrationVideoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(registrationVideoRef.current, 0, 0);
    canvas.toBlob((blob) => setCapturedBlob(blob), 'image/jpeg', 0.95);
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    try {
      const resp = await axios.post(`${API_URLS.USER}/users/`, newUser);
      if (capturedBlob) {
        const formData = new FormData();
        formData.append('file', capturedBlob, 'enrollment.jpg');
        await axios.post(`${API_URLS.USER}/users/${resp.data.id}/enroll`, formData);
      }
      setNewUser({ employee_id: '', full_name: '', email: '', dob: '', contact_number: '', department: '', position: '', hire_date: '', salary: '', status: 'Active' });
      setCapturedBlob(null);
      setShowRegistrationForm(false);
      fetchUsers();
      alert("Success!");
    } catch (err) { alert("Error creating user."); }
    finally { setIsRegistering(false); }
  };

  const checkCamera = async (devId?: string) => {
    try {
      const constraints = devId ? { video: { deviceId: { exact: devId } } } : { video: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraStatus('connected');
    } catch (err) { setCameraStatus('error'); }
  };

  useEffect(() => { if (!isMobileAuthPage) { checkCamera(); fetchUsers(); fetchStats(); } }, [isMobileAuthPage]);

  // --- Attendance Calendar Logic ---
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const AttendanceCalendar = ({ attendanceLogs }: { attendanceLogs: any[] }) => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const statusMap: { [key: number]: string } = {};
    attendanceLogs.forEach(log => {
      const date = new Date(log.timestamp);
      if (date.getMonth() === selectedMonth && date.getFullYear() === selectedYear) statusMap[date.getDate()] = log.status;
    });
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<div key={`p-${i}`} className="h-12 border border-white/5 opacity-0"></div>);
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(
        <div key={d} className={`h-12 border border-white/5 p-1 flex flex-col items-center justify-center ${statusMap[d] === 'CHECK_IN' ? 'bg-green-500/10' : ''}`}>
          <span className={`text-xs font-bold ${statusMap[d] === 'CHECK_IN' ? 'text-green-500' : 'text-white/40'}`}>{d}</span>
          {statusMap[d] === 'CHECK_IN' && <div className="w-1 h-1 bg-green-500 rounded-full mt-1"></div>}
        </div>
      );
    }
    return (
      <div className="bg-[#111] rounded-2xl overflow-hidden border border-white/5">
        <div className="p-3 border-b border-white/5 flex justify-between items-center bg-white/5">
          <h4 className="font-bold text-xs uppercase">{monthNames[selectedMonth]} {selectedYear}</h4>
          <div className="flex gap-1">
            <button onClick={() => setSelectedMonth(m => m === 0 ? 11 : m - 1)} className="p-1 hover:bg-white/10 rounded"><RefreshCw size={12} /></button>
            <button onClick={() => setSelectedMonth(m => m === 11 ? 0 : m + 1)} className="p-1 hover:bg-white/10 rounded"><RefreshCw size={12} /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 text-center border-b border-white/5">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => <div key={idx} className="py-1 text-[8px] font-black text-white/20">{day}</div>)}
        </div>
        <div className="grid grid-cols-7">{days}</div>
      </div>
    );
  };

  const SidebarItem = ({ id, icon: Icon, label }: any) => (
    <button onClick={() => setActiveTab(id)} className={`flex items-center gap-3 w-full p-3 rounded-lg transition-colors ${activeTab === id ? 'bg-secondary text-secondary-foreground' : 'hover:bg-primary-foreground/10 text-primary-foreground'}`}>
      <Icon size={20} /> <span className="font-medium">{label}</span>
    </button>
  );

  // --- MOBILE UI ---
  if (isMobileAuthPage) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans">
        <input type="file" accept="image/*" capture="user" ref={mobileFileInputRef} onChange={handleMobileFileCapture} className="hidden" />
        <header className="p-4 border-b border-white/10 flex justify-between items-center bg-[#111] sticky top-0 z-50">
          <div className="flex items-center gap-2"><div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center"><Smartphone size={18} className="text-black" /></div><span className="font-bold tracking-tight uppercase text-xs">Aayam Portal</span></div>
          {linkedUser && <button onClick={() => { localStorage.removeItem('device_id'); setLinkedUser(null); }} className="text-[10px] font-bold text-red-500/60 uppercase border border-red-500/20 px-2 py-1 rounded">Logout</button>}
        </header>
        <main className="flex-1 overflow-auto p-6 space-y-8 animate-in fade-in duration-700">
          {window.location.protocol !== 'https:' && (
            <div className="bg-red-600 text-white p-4 text-center space-y-2 rounded-2xl shadow-xl">
              <p className="text-xs font-black uppercase">⚠️ CONNECTION NOT SECURE</p>
              <button onClick={() => window.location.href = window.location.href.replace('http:', 'https:')} className="w-full py-2 bg-white text-black rounded-lg font-black uppercase text-[10px]">Switch to Secure HTTPS</button>
            </div>
          )}
          {!linkedUser ? (
            <div className="space-y-8">
              <div className="text-center py-6"><h1 className="text-4xl font-black italic tracking-tighter uppercase">Device <span className="text-secondary">Unlinked</span></h1></div>
              <div className="bg-[#111] rounded-[40px] p-8 border border-white/5 space-y-6">
                <input type="text" placeholder="Enter ID to Link" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold" value={linkingEmployeeId} onChange={(e) => setLinkingEmployeeId(e.target.value)} />
                <button onClick={linkDevice} disabled={isLinking} className="w-full py-5 bg-white/10 text-white rounded-[25px] font-black uppercase tracking-widest">{isLinking ? 'SYNCING...' : 'Verify & Link'}</button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in zoom-in duration-500">
               <div className="flex items-center gap-4 bg-white/5 p-5 rounded-[32px] border border-white/10">
                  <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center font-black text-black text-xl">{linkedUser.full_name[0]}</div>
                  <div><h2 className="text-lg font-black uppercase tracking-tight">{linkedUser.full_name}</h2><p className="text-[10px] font-bold text-white/30 uppercase">{linkedUser.employee_id} • {linkedUser.department}</p></div>
               </div>
               <div className="bg-[#111] border border-white/5 rounded-[45px] p-8 text-center space-y-8 shadow-2xl">
                  <div className="space-y-4">
                    <h3 className="text-2xl font-black italic uppercase text-secondary tracking-tighter">Identity Check</h3>
                    <button onClick={() => registerBiometrics(linkedUser.id)} className="text-[10px] font-bold text-secondary border border-secondary/20 px-4 py-2 rounded-full uppercase">Sync Fingerprint (Passkey)</button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => authenticateBiometrics(linkedUser.id, 'CHECK_IN')} disabled={isLinking} className="py-8 bg-green-600 text-white rounded-[35px] flex flex-col items-center gap-2 active:scale-95 transition-all"><Fingerprint size={32} /><span className="font-black text-[10px] uppercase">Punch In</span></button>
                    <button onClick={() => authenticateBiometrics(linkedUser.id, 'CHECK_OUT')} disabled={isLinking} className="py-8 bg-white/5 border border-white/10 text-white rounded-[35px] flex flex-col items-center gap-2 active:scale-95 transition-all"><LogOut size={32} className="opacity-40"/><span className="font-black text-[10px] uppercase">Punch Out</span></button>
                  </div>
                  <button onClick={triggerMobileCapture} disabled={isLinking} className="w-full py-4 bg-white/5 text-white/40 rounded-2xl text-[10px] font-bold uppercase tracking-widest border border-white/5">Face Fallback</button>
               </div>
               <AttendanceCalendar attendanceLogs={userAttendance} />
            </div>
          )}
        </main>
      </div>
    );
  }

  // --- LAPTOP UI ---
  return (
    <div className="flex h-screen bg-[#050505] text-white">
      <div className="w-72 bg-[#0a0a0a] border-r border-white/5 p-6 flex flex-col gap-10">
        <div className="flex items-center gap-3 px-2"><div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center shadow-lg shadow-secondary/20"><Camera size={24} className="text-black" /></div><h1 className="text-xl font-black tracking-tighter uppercase italic">Face <span className="text-secondary font-light not-italic">Recog</span></h1></div>
        <nav className="flex flex-col gap-1">
          <SidebarItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <SidebarItem id="users" icon={Users} label="Personnel" />
          <SidebarItem id="recognition" icon={Camera} label="Live View" />
          <SidebarItem id="mobile-auth" icon={Smartphone} label="Mobile Link" />
          <SidebarItem id="history" icon={History} label="Audit Logs" />
        </nav>
      </div>
      <div className="flex-1 overflow-auto p-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <header><h2 className="text-3xl font-bold uppercase italic tracking-tighter">Facility Telemetry</h2></header>
            <div className="grid grid-cols-4 gap-6">
              <div className="card border-l-4 border-l-blue-500"><p className="text-[10px] font-black uppercase text-white/40">Engagement</p><h3 className="text-4xl font-black mt-2">{stats.engagement_rate}%</h3></div>
              <div className="card border-l-4 border-l-green-500"><p className="text-[10px] font-black uppercase text-white/40">Punctuality</p><h3 className="text-4xl font-black mt-2 text-green-500">{stats.punctuality_rate}%</h3></div>
              <div className="card border-l-4 border-l-secondary bg-secondary/5"><p className="text-[10px] font-black uppercase text-white/40">AI Confidence</p><h3 className="text-4xl font-black mt-2 text-secondary">{(stats.ai_confidence_index * 100).toFixed(1)}%</h3></div>
              <div className="card border-l-4 border-l-white/20"><p className="text-[10px] font-black uppercase text-white/40">Status</p><h3 className="text-xl font-bold mt-2 uppercase">{stats.system_status}</h3></div>
            </div>
          </div>
        )}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <header className="flex justify-between items-center"><div><h2 className="text-2xl font-bold">Personnel Registry</h2></div><button onClick={() => setShowRegistrationForm(!showRegistrationForm)} className="px-4 py-2 bg-secondary text-black rounded-lg font-bold flex items-center gap-2">{showRegistrationForm ? 'View List' : <><UserPlus size={18}/> New Registration</>}</button></header>
            {showRegistrationForm ? (
              <div className="card"><form onSubmit={createUser} className="space-y-6"><div className="grid grid-cols-2 gap-6"><input type="text" placeholder="Employee ID" className="input-field" value={newUser.employee_id} onChange={e => setNewUser({...newUser, employee_id: e.target.value})} /><input type="text" placeholder="Full Name" className="input-field" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} /></div><button type="submit" className="w-full py-3 bg-secondary text-black rounded-xl font-bold">Save Profile</button></form></div>
            ) : (
              <div className="card overflow-hidden"><table className="w-full text-left text-sm"><thead><tr className="bg-white/5 uppercase text-[10px] font-black"> <th className="p-4">ID</th><th className="p-4">Name</th><th className="p-4">Dept</th><th className="p-4">Status</th> </tr></thead><tbody>{users.map(u => (<tr key={u.id} className="border-t border-white/5 hover:bg-white/5"><td className="p-4 font-mono">{u.employee_id}</td><td className="p-4 font-bold">{u.full_name}</td><td className="p-4 opacity-60">{u.department || 'N/A'}</td><td className="p-4"><span className="px-2 py-1 rounded bg-green-500/20 text-green-500 font-bold text-[10px] uppercase">{u.status}</span></td></tr>))}</tbody></table></div>
            )}
          </div>
        )}
        {activeTab === 'recognition' && (
          <div className="space-y-6">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold uppercase italic tracking-tighter">Biometric Gateway</h2>
                <p className="text-white/40">Select authentication modality.</p>
              </div>
            </header>
            <div className="grid grid-cols-3 gap-8">
              <div className="col-span-2 bg-black rounded-3xl overflow-hidden aspect-video relative border-4 border-white/5">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover grayscale" />
                <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none"></div>
                <div className="absolute bottom-6 left-6 flex gap-4">
                   <button onClick={toggleRecognition} className="px-6 py-3 bg-secondary text-black rounded-2xl font-black uppercase shadow-2xl active:scale-95 transition-all text-xs">
                     {recognitionInterval.current ? 'Stop Neural Face' : 'Start Neural Face'}
                   </button>
                   <button onClick={async () => {
                      if (!videoRef.current) return;
                      const canvas = document.createElement('canvas');
                      canvas.width = videoRef.current.videoWidth;
                      canvas.height = videoRef.current.videoHeight;
                      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
                      canvas.toBlob(async (blob) => {
                        if (!blob) return;
                        const formData = new FormData();
                        formData.append('file', blob, 'finger.jpg');
                        try {
                          const resp = await axios.post(`${API_URLS.RECOGNITION}/recognize/vision-fingerprint`, formData);
                          setLastResult(resp.data);
                          if (resp.data.match) fetchStats();
                        } catch(e) { setLastResult({match: false, message: 'Vision AI failed'}); }
                      }, 'image/jpeg');
                   }} className="px-6 py-3 bg-blue-500 text-white rounded-2xl font-black uppercase shadow-2xl active:scale-95 transition-all text-xs">
                     Vision Fingerprint Scan
                   </button>
                </div>
              </div>
              <div className="card space-y-6">
                 <h3 className="font-black uppercase italic tracking-widest text-white/40">Telemetry & Options</h3>
                 {lastResult ? (
                   <div className={`p-6 rounded-2xl border-2 ${lastResult.match ? 'border-green-500/50 bg-green-500/5' : 'border-red-500/50 bg-red-500/5'}`}>
                     <p className="text-2xl font-black">{lastResult.match ? 'MATCH FOUND' : 'NO MATCH'}</p>
                     <p className="text-sm opacity-60 mt-1">{lastResult.match ? `User #${lastResult.user_id}` : 'Access Denied'}</p>
                     {lastResult.method && <p className="text-[10px] uppercase font-bold text-secondary mt-2">Via: {lastResult.method}</p>}
                   </div>
                 ) : (
                   <div className="text-center py-6 opacity-20"><Camera size={48} className="mx-auto mb-2" /><p className="text-xs font-bold uppercase">Node Idle</p></div>
                 )}
                 <div className="pt-6 border-t border-white/10 space-y-4">
                    <h4 className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Hardware Fallbacks</h4>
                    <button onClick={async () => {
                       const uid = prompt("Enter User ID to simulate USB scan (Mantra/DigitalPersona):");
                       if (uid) {
                         try {
                           const resp = await axios.post(`${API_URLS.RECOGNITION}/recognize/usb-fingerprint?user_id=${uid}`);
                           setLastResult(resp.data);
                           if (resp.data.match) fetchStats();
                         } catch(e) { setLastResult({match: false, message: 'USB Read Error'}); }
                       }
                    }} className="w-full py-4 bg-white/5 border border-white/20 rounded-xl font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                       <Fingerprint size={18} /> USB Sensor Scan
                    </button>
                    <p className="text-[9px] text-white/30 leading-relaxed pt-2">
                       * Option 1: Mobile Wireless (Use Mobile Link tab)<br/>
                       * Option 2: Vision AI (Laptop Camera)<br/>
                       * Option 3: USB Sensor (Mocked hardware logic)
                    </p>
                 </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'mobile-auth' && (
          <div className="max-w-md mx-auto text-center space-y-8 py-12">
            <h2 className="text-4xl font-black uppercase italic tracking-tighter">Mobile Handshake</h2>
            <div className="card p-8 flex flex-col items-center gap-8 bg-white/5 border border-white/10 rounded-[40px]">
              {mobileVerificationStatus === 'IDLE' ? (
                <button onClick={() => createMobileSession('VERIFY')} className="px-10 py-5 bg-secondary text-black rounded-3xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Generate QR</button>
              ) : (
                <div className="p-6 bg-white rounded-[32px] shadow-2xl"><QRCodeCanvas value={`https://${serverIP || window.location.hostname}:3000/mobile-auth?session=${mobileSessionId}`} size={256} /></div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'history' && (
          <div className="space-y-8">
            <div className="grid grid-cols-3 gap-8"><div className="col-span-2 card"><h3 className="font-black text-white/40 mb-6 uppercase tracking-widest">Monthly Overview</h3><AttendanceCalendar attendanceLogs={logs} /></div><div className="card"><select onChange={(e) => fetchLogs(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm mb-6 uppercase font-bold text-white/60"><option value="">Select Employee...</option>{users.map(u => (<option key={u.id} value={u.id}>{u.full_name}</option>))}</select><div className="space-y-2 overflow-auto max-h-[400px]">{logs.map(log => (<div key={log.id} className="p-3 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center"><div><p className="text-xs font-bold">{log.status}</p><p className="text-[10px] opacity-40">{new Date(log.timestamp).toLocaleDateString()}</p></div><p className="text-xs font-mono">{new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p></div>))}</div></div></div>
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="max-w-5xl space-y-8 animate-in fade-in duration-500 pb-20">
            <header>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">System Configuration</h2>
              <p className="text-white/40">Fine-tune the Neural Engine and Operational parameters.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* AI & NEURAL SETTINGS */}
              <section className="card space-y-6 text-primary-foreground">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                   <Fingerprint className="text-secondary" size={20} />
                   <h3 className="font-bold uppercase tracking-widest text-sm">Neural Sensitivity</h3>
                </div>
                <div className="space-y-6">
                   <div className="space-y-3">
                      <div className="flex justify-between text-xs font-bold uppercase">
                         <span className="text-white/40">Face Match Threshold (L2)</span>
                         <span className="text-secondary">0.50</span>
                      </div>
                      <input type="range" min="0.1" max="1.0" step="0.01" defaultValue="0.5" className="w-full accent-secondary" />
                      <p className="text-[10px] text-white/30 italic leading-tight">Lower = Stricter matching. Higher = Faster but less secure.</p>
                   </div>
                   <div className="space-y-3">
                      <div className="flex justify-between text-xs font-bold uppercase">
                         <span className="text-white/40">Vision Fingerprint Samples</span>
                         <span className="text-blue-500">12 Frames</span>
                      </div>
                      <input type="range" min="1" max="30" defaultValue="12" className="w-full accent-blue-500" />
                   </div>
                </div>
              </section>

              {/* OPERATIONAL PARAMETERS */}
              <section className="card space-y-6 text-primary-foreground">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                   <History className="text-secondary" size={20} />
                   <h3 className="font-bold uppercase tracking-widest text-sm">Operational Rules</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/30 uppercase">Shift Start Time</label>
                      <input type="time" defaultValue="09:00" className="bg-white/5 border border-white/10 rounded-lg p-2 text-white w-full" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/30 uppercase">Grace Period (min)</label>
                      <input type="number" defaultValue="15" className="bg-white/5 border border-white/10 rounded-lg p-2 text-white w-full" />
                   </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                   <span className="text-xs font-bold uppercase text-white/60">Auto-Logout Desktop</span>
                   <div className="w-10 h-5 bg-secondary rounded-full relative"><div className="w-4 h-4 bg-black rounded-full absolute right-0.5 top-0.5"></div></div>
                </div>
              </section>

              {/* NETWORK & SERVICES */}
              <section className="card lg:col-span-2 space-y-6 text-primary-foreground">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                   <Settings className="text-secondary" size={20} />
                   <h3 className="font-bold uppercase tracking-widest text-sm">Service Orchestration</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/30 uppercase">User Service Entry</label>
                      <div className="flex items-center gap-2 bg-black p-3 rounded-xl border border-white/5 text-xs font-mono text-green-500">
                         <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                         PORT 9001
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/30 uppercase">Recognition Engine</label>
                      <div className="flex items-center gap-2 bg-black p-3 rounded-xl border border-white/5 text-xs font-mono text-green-500">
                         <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                         PORT 9003
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/30 uppercase">Attendance Registry</label>
                      <div className="flex items-center gap-2 bg-black p-3 rounded-xl border border-white/5 text-xs font-mono text-green-500">
                         <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                         PORT 9002
                      </div>
                   </div>
                </div>
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex justify-between items-center">
                   <div>
                      <p className="text-xs font-black text-blue-400 uppercase">Unified Proxy Gateway</p>
                      <p className="text-[10px] text-blue-400/60 font-mono">Status: ACTIVE (Forwarding Mobile Traffic)</p>
                   </div>
                   <button className="px-4 py-2 bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase">Refresh Map</button>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
