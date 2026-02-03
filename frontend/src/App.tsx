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
  Fingerprint
} from 'lucide-react';
import axios from 'axios';

// API Configuration
const API_URLS = {
  USER: 'http://localhost:9001',
  RECOGNITION: 'http://localhost:9003',
  ATTENDANCE: 'http://localhost:9002',
  FINGERPRINT: 'http://localhost:9004'
};

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [cameraStatus, setCameraStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);

  // --- Users State ---
  const [users, setUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({ 
    employee_id: '', 
    full_name: '', 
    email: '',
    dob: '',
    contact_number: '',
    department: '',
    position: '',
    hire_date: '',
    salary: '',
    status: 'Active'
  });
  const [enrollmentUserId, setEnrollmentUserId] = useState<number | null>(null);
  const [enrollFile, setEnrollFile] = useState<File | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const registrationVideoRef = useRef<HTMLVideoElement>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [isFingerprintPending, setIsFingerprintPending] = useState(false);
  const [fingerprintReady, setFingerprintReady] = useState(false);

  // --- Recognition & Logs State ---
  const [lastResult, setLastResult] = useState<any>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const recognitionInterval = useRef<any>(null);

  // --- API Calls ---
  const fetchLogs = async () => {
    if (lastResult?.user_id) {
      try {
        const resp = await axios.get(`${API_URLS.ATTENDANCE}/attendance/${lastResult.user_id}`);
        setLogs(resp.data);
      } catch (err) {
        console.error("Error fetching logs", err);
      }
    }
  };

  const fetchUsers = async () => {
    try {
      const resp = await axios.get(`${API_URLS.USER}/users/`);
      setUsers(resp.data);
    } catch (err) {
      console.error("Error fetching users", err);
    }
  };

  const captureAndRecognize = async () => {
    if (!videoRef.current || isRecognizing) return;
    
    // Create canvas to capture frame
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      
      const formData = new FormData();
      formData.append('file', blob, 'capture.jpg');
      
      setIsRecognizing(true);
      try {
        const resp = await axios.post(`${API_URLS.RECOGNITION}/recognize`, formData);
        setLastResult(resp.data);
        if (resp.data.match) {
          console.log("Recognized:", resp.data.user_id);
        }
      } catch (err) {
        // Silently fail for "no face" or "not recognized" to keep loop clean
        setLastResult({ match: false, message: "No face detected" });
      } finally {
        setIsRecognizing(false);
      }
    }, 'image/jpeg', 0.8);
  };

  const toggleRecognition = () => {
    if (recognitionInterval.current) {
      clearInterval(recognitionInterval.current);
      recognitionInterval.current = null;
      setLastResult(null);
    } else {
      recognitionInterval.current = setInterval(captureAndRecognize, 3000); // Try every 3 seconds
    }
    // Force re-render
    setUsers([...users]); 
  };

  const captureEnrollmentPhoto = () => {
    if (!registrationVideoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = registrationVideoRef.current.videoWidth;
    canvas.height = registrationVideoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(registrationVideoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      setCapturedBlob(blob);
    }, 'image/jpeg', 0.95);
  };

  const handleFingerprintRegistration = async () => {
    setIsFingerprintPending(true);
    try {
      // In a real Morpho setup, this would trigger the hardware agent
      // For the web UI registration flow, we simulate the "capture" phase
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate hardware delay
      setFingerprintReady(true);
    } catch (e) {
      alert("Hardware capture failed");
    } finally {
      setIsFingerprintPending(false);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    try {
      // Send data in the request BODY (JSON)
      const resp = await axios.post(`${API_URLS.USER}/users/`, newUser);
      const createdUser = resp.data;
      
      // 1. Enroll Face if captured
      if (capturedBlob) {
        const formData = new FormData();
        formData.append('file', capturedBlob, 'enrollment.jpg');
        await axios.post(`${API_URLS.USER}/users/${createdUser.id}/enroll`, formData);
      }

      // 2. Enroll Fingerprint if ready
      if (fingerprintReady) {
        await axios.post(`${API_URLS.FINGERPRINT}/fingerprint/enroll/${createdUser.id}`, {
          raw_template: "REGISTERED_DURING_ONBOARDING_" + Date.now()
        });
      }

      setNewUser({ 
        employee_id: '', 
        full_name: '', 
        email: '',
        dob: '',
        contact_number: '',
        department: '',
        position: '',
        hire_date: '',
        salary: '',
        status: 'Active'
      });
      setCapturedBlob(null);
      setFingerprintReady(false);
      setShowRegistrationForm(false);
      fetchUsers();
      alert("Employee registered with full biometrics!");
    } catch (err) {
      alert("Error creating user. Check if Employee ID is unique.");
    } finally {
      setIsRegistering(false);
    }
  };

  const enrollFace = async (userId: number) => {
    if (!enrollFile) return;
    const formData = new FormData();
    formData.append('file', enrollFile);
    try {
      await axios.post(`${API_URLS.USER}/users/${userId}/enroll`, formData);
      alert("Enrollment triggered! The background worker will process it.");
      setEnrollmentUserId(null);
      setEnrollFile(null);
    } catch (err) {
      alert("Error enrolling face");
    }
  };

  const enrollFingerprint = async (userId: number) => {
    try {
      await axios.post(`${API_URLS.FINGERPRINT}/fingerprint/enroll/${userId}`);
      alert("Fingerprint template enrolled!");
    } catch (err) {
      alert("Error enrolling fingerprint");
    }
  };

  const verifyFingerprint = async () => {
    setIsRecognizing(true);
    try {
      const resp = await axios.post(`${API_URLS.FINGERPRINT}/fingerprint/verify`);
      setLastResult(resp.data);
      alert(`Fingerprint Match! User ID: ${resp.data.user_id}`);
    } catch (err) {
      alert("Fingerprint not recognized or no enrollment found.");
    } finally {
      setIsRecognizing(false);
    }
  };

  const checkCamera = async (deviceId?: string) => {
    try {
      const constraints = deviceId ? { video: { deviceId: { exact: deviceId } } } : { video: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraStatus('connected');
      
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      setDevices(allDevices.filter(d => d.kind === 'videoinput'));
    } catch (err) {
      console.error(err);
      setCameraStatus('error');
    }
  };

  useEffect(() => {
    checkCamera();
    fetchUsers();
  }, []);

  // --- Components ---
  const SidebarItem = ({ id, icon: Icon, label }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-3 w-full p-3 rounded-lg transition-colors ${
        activeTab === id ? 'bg-secondary text-secondary-foreground' : 'hover:bg-primary-foreground/10 text-primary-foreground'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-primary">
      {/* Sidebar */}
      <div className="w-64 bg-primary border-r border-primary-foreground/10 p-4 flex flex-col gap-8">
        <div className="flex items-center gap-2 px-2">
          <h1 className="text-xl font-bold tracking-tight text-primary-foreground">
            Attendance <span className="bg-secondary text-secondary-foreground p-1 rounded">System</span>
          </h1>
        </div>
        
        <nav className="flex flex-col gap-2">
          <SidebarItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <SidebarItem id="users" icon={Users} label="Employee Management" />
          <SidebarItem id="recognition" icon={Camera} label="Live Recognition" />
          <SidebarItem id="fingerprint" icon={Fingerprint} label="Fingerprint Auth" />
          <SidebarItem id="history" icon={History} label="Attendance Logs" />
          <SidebarItem id="settings" icon={Settings} label="System Preferences" />
        </nav>

        <div className="mt-auto">
          <SidebarItem id="logout" icon={LogOut} label="Sign Out" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <header>
              <h2 className="text-3xl font-bold text-primary-foreground">Welcome back, Admin</h2>
              <p className="text-primary-foreground/60">Here's what's happening today.</p>
            </header>
            
            <div className="grid grid-cols-3 gap-6">
              <div className="card">
                <p className="text-primary-foreground/60 font-medium">Total Employees</p>
                <h3 className="text-3xl font-bold mt-2 text-primary-foreground">124</h3>
              </div>
              <div className="card">
                <p className="text-primary-foreground/60 font-medium">Present Today</p>
                <h3 className="text-3xl font-bold mt-2 text-green-600">98</h3>
              </div>
              <div className="card">
                <p className="text-primary-foreground/60 font-medium">System Status</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <h3 className="text-xl font-semibold text-primary-foreground">Online</h3>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-primary-foreground">Employee Management</h2>
                <p className="text-primary-foreground/60">Manage employee profiles and biometric data.</p>
              </div>
              <button 
                onClick={() => {
                  setShowRegistrationForm(!showRegistrationForm);
                  if (!showRegistrationForm) {
                    // Try to start camera for registration
                    setTimeout(async () => {
                      try {
                        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                        if (registrationVideoRef.current) registrationVideoRef.current.srcObject = stream;
                      } catch (e) {}
                    }, 100);
                  }
                }}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-bold flex items-center gap-2"
              >
                {showRegistrationForm ? 'View Employee List' : <><UserPlus size={18}/> Register New Employee</>}
              </button>
            </header>

            {showRegistrationForm ? (
              <div className="card">
                <form onSubmit={createUser} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                      <h3 className="font-bold text-lg text-primary-foreground border-b border-primary-foreground/10 pb-2">Basic Information</h3>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-primary-foreground/80">Employee ID *</label>
                        <input type="text" required className="input-field" placeholder="EMP001" value={newUser.employee_id} onChange={e => setNewUser({...newUser, employee_id: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-primary-foreground/80">Full Name *</label>
                        <input type="text" required className="input-field" placeholder="John Doe" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-primary-foreground/80">Date of Birth</label>
                        <input type="date" className="input-field" value={newUser.dob} onChange={e => setNewUser({...newUser, dob: e.target.value})} />
                      </div>
                    </div>

                    {/* Contact & Status */}
                    <div className="space-y-4">
                      <h3 className="font-bold text-lg text-primary-foreground border-b border-primary-foreground/10 pb-2">Employment Details</h3>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-primary-foreground/80">Department</label>
                        <input type="text" className="input-field" placeholder="Engineering" value={newUser.department} onChange={e => setNewUser({...newUser, department: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-primary-foreground/80">Position</label>
                        <input type="text" className="input-field" placeholder="Software Engineer" value={newUser.position} onChange={e => setNewUser({...newUser, position: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-primary-foreground/80">Status</label>
                        <select className="input-field" value={newUser.status} onChange={e => setNewUser({...newUser, status: e.target.value})}>
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                          <option value="On Leave">On Leave</option>
                        </select>
                      </div>
                    </div>

                    {/* Finance & Contact */}
                    <div className="space-y-4">
                      <h3 className="font-bold text-lg text-primary-foreground border-b border-primary-foreground/10 pb-2">Contact & Compensation</h3>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-primary-foreground/80">Email Address</label>
                        <input type="email" className="input-field" placeholder="john@example.com" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-primary-foreground/80">Contact Number</label>
                        <input type="tel" className="input-field" placeholder="+1 234 567 890" value={newUser.contact_number} onChange={e => setNewUser({...newUser, contact_number: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-primary-foreground/80">Salary (Monthly)</label>
                        <input type="text" className="input-field" placeholder="$5000" value={newUser.salary} onChange={e => setNewUser({...newUser, salary: e.target.value})} />
                      </div>
                    </div>
                  </div>

                  {/* Biometric Enrollment Section */}
                  <div className="mt-8 space-y-4">
                    <h3 className="font-bold text-lg text-primary-foreground border-b border-primary-foreground/10 pb-2">Biometric Enrollment</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      
                      {/* Face Capture */}
                      <div className="flex gap-6 items-start bg-primary-foreground/5 p-4 rounded-2xl border border-primary-foreground/10">
                        <div className="w-40 aspect-square bg-black rounded-xl overflow-hidden relative border-2 border-primary-foreground/20 flex-shrink-0">
                          <video ref={registrationVideoRef} autoPlay playsInline className="w-full h-full object-cover grayscale" />
                          {capturedBlob && (
                            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                              <CheckCircle2 size={32} className="text-green-500" />
                            </div>
                          )}
                        </div>
                        <div className="space-y-3">
                          <h4 className="font-bold text-sm text-primary-foreground flex items-center gap-2">
                            <Camera size={16} /> Face Recognition
                          </h4>
                          <p className="text-xs text-primary-foreground/60">
                            Capture face data for automatic camera-based attendance.
                          </p>
                          <button type="button" onClick={captureEnrollmentPhoto} className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-lg hover:bg-primary-foreground/10 transition-colors border border-primary-foreground/20">
                            {capturedBlob ? 'Recapture' : 'Capture Photo'}
                          </button>
                        </div>
                      </div>

                      {/* Fingerprint Capture */}
                      <div className="flex gap-6 items-start bg-primary-foreground/5 p-4 rounded-2xl border border-primary-foreground/10">
                        <div className={`w-40 aspect-square rounded-xl flex items-center justify-center border-2 transition-all flex-shrink-0 ${
                          fingerprintReady ? 'bg-blue-500/20 border-blue-500' : 'bg-black border-primary-foreground/20'
                        }`}>
                          <Fingerprint size={48} className={fingerprintReady ? 'text-blue-400' : 'text-primary-foreground/20'} />
                          {isFingerprintPending && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl">
                              <RefreshCw className="animate-spin text-white" />
                            </div>
                          )}
                        </div>
                        <div className="space-y-3">
                          <h4 className="font-bold text-sm text-primary-foreground flex items-center gap-2">
                            <Fingerprint size={16} /> Fingerprint Scan
                          </h4>
                          <p className="text-xs text-primary-foreground/60">
                            Enroll fingerprint template via Safran Morpho hardware.
                          </p>
                          <button type="button" onClick={handleFingerprintRegistration} disabled={isFingerprintPending} className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-lg hover:bg-primary-foreground/10 transition-colors border border-primary-foreground/20 disabled:opacity-50">
                            {fingerprintReady ? 'Scan Again' : 'Initialize Scan'}
                          </button>
                          {fingerprintReady && <p className="text-[10px] text-green-500 font-bold">Template captured!</p>}
                        </div>
                      </div>

                    </div>
                  </div>

                  <div className="flex justify-end gap-4 pt-6 border-t border-primary-foreground/10">
                    <button type="button" onClick={() => setShowRegistrationForm(false)} className="px-6 py-2 bg-primary-foreground/5 text-primary-foreground rounded-lg hover:bg-primary-foreground/10 transition-colors font-bold">
                      Cancel
                    </button>
                    <button type="submit" disabled={isRegistering} className="px-8 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors font-bold shadow-lg shadow-secondary/20 disabled:opacity-50">
                      {isRegistering ? 'Processing...' : 'Save Employee Profile'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="card">
                <div className="overflow-hidden rounded-lg border border-primary-foreground/10">
                  <table className="w-full text-left">
                    <thead className="bg-primary-foreground/5 text-primary-foreground/80 text-sm">
                      <tr>
                        <th className="p-4">Employee ID</th>
                        <th className="p-4">Full Name</th>
                        <th className="p-4">Department</th>
                        <th className="p-4">Position</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary-foreground/10">
                      {users.length > 0 ? users.map(u => (
                        <tr key={u.id} className="text-primary-foreground/70 hover:bg-primary-foreground/5 transition-colors">
                          <td className="p-4 font-mono">{u.employee_id}</td>
                          <td className="p-4 font-medium text-primary-foreground">{u.full_name}</td>
                          <td className="p-4">{u.department || 'N/A'}</td>
                          <td className="p-4">{u.position || 'N/A'}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                              u.status === 'Active' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                            }`}>
                              {u.status?.toUpperCase() || 'ACTIVE'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button onClick={() => enrollFingerprint(u.id)} className="text-blue-400 hover:text-blue-300 text-xs font-bold inline-flex items-center gap-1">
                              <Fingerprint size={14} /> Enroll FP
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={6} className="p-12 text-center text-primary-foreground/40 italic">
                            No employees registered yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'recognition' && (
          <div className="space-y-6">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-primary-foreground">Live Recognition</h2>
                <p className="text-primary-foreground/60">Position face in front of the camera.</p>
              </div>
              <button 
                onClick={toggleRecognition}
                className={`px-6 py-2 rounded-lg font-bold transition-colors ${
                  recognitionInterval.current ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
                }`}
              >
                {recognitionInterval.current ? 'Stop Recognition' : 'Start Recognition'}
              </button>
            </header>
            
            <div className="grid grid-cols-3 gap-8">
              <div className="col-span-2 bg-black rounded-2xl overflow-hidden aspect-video relative flex items-center justify-center border-4 border-primary-foreground/10">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover grayscale" />
                <div className="absolute inset-0 border-[40px] border-black/20 pointer-events-none"></div>
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${recognitionInterval.current ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></span>
                  {recognitionInterval.current ? 'LIVE RECOGNITION ACTIVE' : 'RECOGNITION PAUSED'}
                </div>

                {lastResult && lastResult.match && (
                  <div className="absolute top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg animate-bounce">
                    Match Found: User #{lastResult.user_id}
                  </div>
                )}
              </div>
              
              <div className="card">
                <h3 className="font-bold mb-4 text-primary-foreground">Recognition Result</h3>
                <div className="space-y-4">
                  {lastResult ? (
                    <div className={`p-4 rounded-lg border ${lastResult.match ? 'bg-green-500/10 border-green-500/50' : 'bg-red-500/10 border-red-500/50'}`}>
                      <p className="text-lg font-bold text-primary-foreground">
                        {lastResult.match ? 'Success!' : 'No Match'}
                      </p>
                      <p className="text-sm text-primary-foreground/60">
                        {lastResult.match 
                          ? `User ID: ${lastResult.user_id}` 
                          : lastResult.message || 'Face not recognized'}
                      </p>
                      {lastResult.distance && (
                        <p className="text-xs text-primary-foreground/40 mt-2">
                          Confidence Distance: {lastResult.distance.toFixed(4)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-primary-foreground/40 gap-2">
                      <Camera size={32} />
                      <p className="text-sm">Waiting for detection...</p>
                    </div>
                  )}
                  
                  {lastResult && lastResult.attendance && (
                    <div className="mt-4 p-3 bg-secondary/20 rounded-lg">
                      <p className="text-xs font-bold text-secondary-foreground">ATTENDANCE LOGGED</p>
                      <p className="text-xs text-secondary-foreground/80">{new Date(lastResult.attendance.timestamp).toLocaleTimeString()}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'fingerprint' && (
          <div className="space-y-6">
            <header>
              <h2 className="text-2xl font-bold text-primary-foreground">Fingerprint Authentication</h2>
              <p className="text-primary-foreground/60">Simulate fingerprint scanning for attendance.</p>
            </header>

            <div className="flex flex-col items-center justify-center py-20 card max-w-2xl mx-auto border-dashed border-4 border-primary-foreground/20">
               <div className={`p-10 rounded-full mb-6 ${isRecognizing ? 'bg-blue-500 animate-pulse' : 'bg-primary-foreground/10'}`}>
                  <Fingerprint size={100} className="text-primary-foreground/40" />
               </div>
               
               <h3 className="text-xl font-bold text-primary-foreground mb-2">
                 {isRecognizing ? 'Scanning Finger...' : 'Ready to Scan'}
               </h3>
               <p className="text-primary-foreground/60 mb-8 text-center max-w-sm">
                 In a real application, the hardware scanner would trigger the verification process.
               </p>

               <button 
                 onClick={verifyFingerprint}
                 disabled={isRecognizing}
                 className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50"
               >
                 {isRecognizing ? 'Processing...' : 'Simulate Finger Scan'}
               </button>

               {lastResult && lastResult.method === 'FINGERPRINT' && (
                 <div className="mt-8 p-4 bg-green-500/10 border border-green-500/50 rounded-xl flex items-center gap-3">
                    <CheckCircle2 className="text-green-500" />
                    <div>
                      <p className="font-bold text-primary-foreground">Attendance Logged</p>
                      <p className="text-sm text-primary-foreground/60">User ID: {lastResult.user_id}</p>
                    </div>
                 </div>
               )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-primary-foreground">Attendance Logs</h2>
                <p className="text-primary-foreground/60">View recent check-in/out activity.</p>
              </div>
              <button 
                onClick={fetchLogs}
                className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90"
              >
                <RefreshCw size={18} /> Refresh Logs
              </button>
            </header>

            <div className="card">
              <div className="overflow-hidden rounded-lg border border-primary-foreground/10">
                <table className="w-full text-left">
                  <thead className="bg-primary-foreground/5 text-primary-foreground/80 text-sm">
                    <tr>
                      <th className="p-3">User ID</th>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary-foreground/10">
                    {logs.length > 0 ? logs.map(log => (
                      <tr key={log.id} className="text-primary-foreground/70">
                        <td className="p-3 font-mono">#{lastResult?.user_id || 'Unknown'}</td>
                        <td className="p-3">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            log.status === 'CHECK_IN' ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-500'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-primary-foreground/40">
                          No logs found for the current session user.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-4xl space-y-8">
            <header>
              <h2 className="text-2xl font-bold text-primary-foreground">System Preferences</h2>
              <p className="text-primary-foreground/60">Configure hardware and service connectivity.</p>
            </header>

            <section className="card space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-primary-foreground">Camera Connectivity</h3>
                  <p className="text-sm text-primary-foreground/60">Manage integrated and external cameras.</p>
                </div>
                {cameraStatus === 'connected' ? (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-medium">
                    <CheckCircle2 size={16} /> Connected
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1 rounded-full text-sm font-medium">
                    <XCircle size={16} /> Disconnected
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-primary-foreground/80">Select Input Device</label>
                  <select 
                    className="w-full p-2.5 bg-primary border border-primary-foreground/20 rounded-lg focus:ring-2 focus:ring-secondary outline-none"
                    value={selectedDevice}
                    onChange={(e) => {
                      setSelectedDevice(e.target.value);
                      checkCamera(e.target.value);
                    }}
                  >
                    {devices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                    {devices.length === 0 && <option>No cameras found</option>}
                  </select>
                </div>
                <div className="flex items-end">
                  <button 
                    onClick={() => checkCamera(selectedDevice)}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors w-full"
                  >
                    <RefreshCw size={18} /> Refresh Camera
                  </button>
                </div>
              </div>

              <div className="bg-primary/80 rounded-xl p-4 flex items-center justify-center aspect-video relative overflow-hidden max-w-md mx-auto">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover rounded-lg" />
                {cameraStatus === 'error' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-primary/90 text-primary-foreground/60 gap-2">
                    <XCircle size={48} />
                    <p className="font-medium">Camera source not available</p>
                  </div>
                )}
              </div>
            </section>

            <section className="grid grid-cols-2 gap-6">
              <div className="card">
                <h3 className="font-bold mb-4 text-primary-foreground">Service Status</h3>
                <div className="space-y-3">
                  {['User Service', 'Recognition Service', 'Attendance Service'].map(svc => (
                    <div key={svc} className="flex items-center justify-between text-sm">
                      <span className="text-primary-foreground/80">{svc}</span>
                      <span className="text-green-600 font-bold">ONLINE</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <h3 className="font-bold mb-4 text-primary-foreground">Hardware Info</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-primary-foreground/80">Platform</span>
                    <span className="font-mono text-primary-foreground">win32</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-primary-foreground/80">GPU Acceleration</span>
                    <span className="text-primary-foreground/60 italic">Enabled (NVIDIA)</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;