import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { 
  Users, MapPin, Sparkles, Loader2, CheckCircle2, Heart, Check, AlertCircle 
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged, 
  signInWithCustomToken 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  collection, 
  getDoc, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';

// --- CONFIGURATION ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzBkG1WdRxbI6cEMd6K_VhVwc0-T71zfkArvLhMME-C2rW84EgMyR-DzCG8noRtQuDA/exec";

// Global variables provided by environment
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'luminara-2022-reunion';

const FluidSmokeEffect = memo(() => {
  const canvasRef = useRef(null);
  const particles = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    let animationFrameId;

    const handleResize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    const handleMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      for (let i = 0; i < 2; i++) {
        particles.current.push({
          x: clientX - rect.left,
          y: clientY - rect.top,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5 - 0.5,
          alpha: 0.5,
          size: Math.random() * 15 + 5,
          life: 1.0
        });
      }
      if (particles.current.length > 40) particles.current.shift();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.current.length; i++) {
        const p = particles.current[i];
        p.x += p.vx; p.y += p.vy;
        p.alpha -= 0.015; p.life -= 0.02;
        if (p.life <= 0) { 
          particles.current.splice(i, 1); 
          i--; 
          continue; 
        }
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', handleResize);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('touchmove', handleMove, { passive: true });
    handleResize(); 
    animate();
    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('touchmove', handleMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-20 pointer-events-none opacity-40 will-change-transform" />;
});

const CrewMember = ({ person }) => {
  const is2022 = String(person.batch || "").toLowerCase().includes("2022");
  return (
    <div className="group relative flex items-center gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/5 transition-all hover:bg-white/[0.06]">
      <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-sm font-black text-white ${is2022 ? "bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.3)]" : "bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.3)]"}`}>
        {person.name ? person.name.charAt(0).toUpperCase() : '?'}
      </div>
      <div className="flex flex-col min-w-0 flex-1 text-left">
        <span className={`text-[14px] font-bold truncate ${is2022 ? "text-blue-400" : "text-red-400"}`}>{person.name}</span>
        <span className="text-[9px] font-black uppercase tracking-widest text-white/40 italic">{person.batch} Member</span>
      </div>
      <Heart size={14} className={`shrink-0 opacity-30 ${is2022 ? "text-blue-500" : "text-red-500"}`} fill="currentColor" />
    </div>
  );
};

const App = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [user, setUser] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [userNameInput, setUserNameInput] = useState("");
  const [userPhoneInput, setUserPhoneInput] = useState(""); 
  const [batchSelection, setBatchSelection] = useState("2022 O/L"); 
  const [isAgreed, setIsAgreed] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [nameError, setNameError] = useState("");
  const [agreeError, setAgreeError] = useState("");

  const details = {
    schoolName: "POLPITHIGAMA NATIONAL COLLEGE",
    batchYear: "CLASS OF 2022",
    theme: "LUMINARA",
    date: "2026 පෙබරවාරි 20",
    venue: "HOTEL WHITE DIAMOND",
    contact: "077 123 4567",
    logoUrl: "https://raw.githubusercontent.com/amidunishela-a11y/LUMINARA-EVENT/main/Gemini_Generated_Image_7z3gk47z3gk47z3g.png"
  };

  const fetchSheetData = useCallback(async () => {
    try {
      const response = await fetch(SCRIPT_URL);
      const data = await response.json();
      if (data && Array.isArray(data)) {
        setAttendees([...data].reverse()); 
      }
    } catch (error) { 
      console.warn("Sheet list error:", error); 
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initializeAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        const userDocRef = doc(db, 'artifacts', appId, 'users', u.uid, 'votes', 'rsvpStatus');
        getDoc(userDocRef).then(snap => { 
          if (snap.exists() && snap.data().voted) setHasVoted(true); 
        });
      }
    });
    
    setIsVisible(true);
    fetchSheetData(); 
    const interval = setInterval(fetchSheetData, 10000);
    return () => {
      unsubscribeAuth();
      clearInterval(interval);
    };
  }, [fetchSheetData]);

  const handleRsvp = async () => {
    const name = userNameInput.trim();
    const phone = userPhoneInput.trim();
    const nameParts = name.split(/\s+/).filter(part => part.length > 0);

    // 1. Full Name Validation
    if (nameParts.length < 2) { 
      setNameError("කරුණාකර ඔබගේ සම්පූර්ණ නම (නම සහ වාසගම) ඇතුළත් කරන්න!"); 
      return; 
    }

    // 2. Duplicate Check
    const isDuplicate = attendees.some(
      (person) => person.name && person.name.toLowerCase() === name.toLowerCase()
    );
    if (isDuplicate) {
      setHasVoted(true);
      return;
    }

    // 3. Agreement Check
    if (!isAgreed) { 
      setAgreeError("කරුණාකර මෙතන හරි ලකුණ (Tick) යොදන්න!"); 
      return; 
    }

    if (!user || isVoting || hasVoted) return;

    setIsVoting(true);
    try {
      await fetch(SCRIPT_URL, { 
        method: 'POST', 
        mode: 'no-cors', 
        body: JSON.stringify({ name, phone, batch: batchSelection }) 
      });

      const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'votes', 'rsvpStatus');
      const attendeesCol = collection(db, 'artifacts', appId, 'public', 'data', 'attendees');
      
      await addDoc(attendeesCol, { 
        name, 
        phone, 
        batch: batchSelection, 
        uid: user.uid, 
        createdAt: serverTimestamp() 
      });
      await setDoc(userDocRef, { voted: true }, { merge: true });
      
      setHasVoted(true);
      fetchSheetData();
    } catch (error) { 
      console.error('RSVP Error:', error); 
    } finally { 
      setIsVoting(false); 
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col items-center justify-center p-2 selection:bg-purple-500 overflow-hidden">
      <div className={`relative w-full max-w-[420px] h-[92vh] flex items-center justify-center transition-all duration-1000 transform ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-98'}`}>
        <div className="absolute inset-0 rounded-[40px] sm:rounded-[60px] overflow-hidden shadow-2xl border border-white/5 bg-[#070707] flex flex-col">
          <FluidSmokeEffect />
          
          <div className="absolute inset-0 flex flex-col z-10 overflow-y-auto custom-scrollbar p-5">
            
            <div className="w-full text-center pt-2 mb-6 shrink-0">
              <p className="text-[8px] sm:text-[10px] tracking-[0.4em] font-black text-purple-400 uppercase mb-2">{details.schoolName}</p>
              <h2 className="text-[10px] font-bold tracking-[0.3em] text-white/30 uppercase italic">{details.batchYear} REUNION</h2>
            </div>

            {!hasVoted ? (
              <div className="w-full flex flex-col items-center flex-1 space-y-6">
                <h1 className="text-5xl font-black italic tracking-tighter text-transparent bg-clip-text animate-shine shrink-0">LUMINARA</h1>
                <div className="relative group w-20 h-20 perspective-1000 shrink-0">
                  <img src={details.logoUrl} className="w-full h-full object-contain animate-logo-spin" alt="Logo" />
                </div>
                <p className="text-[9px] font-black tracking-[0.3em] text-purple-500 uppercase italic shrink-0">— RELIVE THE MEMORIES —</p>

                <div className="w-full px-1">
                  <div className="bg-white/5 backdrop-blur-md rounded-[35px] border border-white/10 p-6 shadow-inner">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <span className="text-3xl font-black">{attendees.length || 0}</span>
                      <span className="text-[10px] font-bold text-purple-500 uppercase tracking-widest italic">Attending</span>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-center gap-3 py-1">
                        <button onClick={() => setBatchSelection("2022 O/L")} className={`px-4 py-1.5 rounded-full border text-[9px] font-black transition-all ${batchSelection === "2022 O/L" ? "bg-blue-600/20 border-blue-500 text-blue-400" : "bg-white/5 border-white/10 text-gray-500"}`}>2022 O/L</button>
                        <button onClick={() => setBatchSelection("2025 A/L")} className={`px-4 py-1.5 rounded-full border text-[9px] font-black transition-all ${batchSelection === "2025 A/L" ? "bg-red-600/20 border-red-500 text-red-400" : "bg-white/5 border-white/10 text-gray-500"}`}>2025 A/L</button>
                      </div>
                      
                      <div className="space-y-1">
                        <input 
                          className={`w-full bg-black/40 border ${nameError ? 'border-red-500 animate-shake' : 'border-white/10'} p-3 rounded-2xl text-xs text-center text-white outline-none focus:border-purple-500 transition-all`} 
                          placeholder="ENTER YOUR FULL NAME" 
                          value={userNameInput} 
                          onChange={(e) => {setUserNameInput(e.target.value); setNameError("");}} 
                        />
                        {nameError && <p className="text-[9px] text-red-500 font-bold text-center animate-pulse">{nameError}</p>}
                      </div>

                      <input 
                        className="w-full bg-black/40 border border-white/10 p-3 rounded-2xl text-xs text-center text-white outline-none focus:border-purple-500 transition-all" 
                        placeholder="PHONE NUMBER" 
                        type="tel" 
                        value={userPhoneInput} 
                        onChange={(e) => setUserPhoneInput(e.target.value)} 
                      />

                      <div className="flex flex-col items-center gap-2 pt-2">
                        <div 
                          className={`flex items-center justify-center gap-2.5 py-1 cursor-pointer group transition-all ${agreeError ? 'animate-shake' : ''}`} 
                          onClick={() => {
                            setIsAgreed(!isAgreed); 
                            setAgreeError(""); 
                          }}
                        >
                          <div className={`h-5 w-5 rounded border flex items-center justify-center transition-all ${isAgreed ? 'bg-purple-600 border-purple-500' : agreeError ? 'border-red-500 bg-red-500/10' : 'border-white/20'}`}>
                            {isAgreed && <Check size={14} />}
                          </div>
                          <span className={`text-[10px] font-bold uppercase transition-colors ${agreeError ? 'text-red-500' : isAgreed ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                            මම පැමිණීම තහවුරු කරමි
                          </span>
                        </div>
                        {agreeError && !isAgreed && (
                           <div className="flex items-center gap-1.5 text-red-500">
                             <AlertCircle size={10} className="animate-bounce" />
                             <p className="text-[9px] font-black uppercase tracking-tighter">{agreeError}</p>
                           </div>
                        )}
                      </div>

                      <button onClick={handleRsvp} disabled={isVoting} className="w-full py-4 bg-white text-black rounded-2xl font-black text-xs active:scale-95 transition-all hover:bg-purple-500 hover:text-white shadow-xl">
                        {isVoting ? <Loader2 className="animate-spin h-4 w-4 mx-auto" /> : "CONFIRM ATTENDANCE"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* --- පූර්ණ ලැයිස්තුව පෙන්වන කොටස (ALL ATTENDEES) --- */}
                <div className="w-full bg-black/40 p-5 rounded-[40px] border border-white/5 flex flex-col shadow-2xl mb-4">
                  <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-4">
                    <p className="text-[11px] font-black text-purple-400 uppercase tracking-widest">JOINING CREW LIST</p>
                    <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-bold">{attendees.length}</span>
                  </div>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                    {attendees.length > 0 ? attendees.map((person, idx) => (
                      <CrewMember key={idx} person={person} />
                    )) : (
                      <div className="py-4 opacity-20 text-[10px] font-bold uppercase tracking-widest italic text-center">Syncing crew list...</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* --- THANK YOU PAGE --- */
              <div className="flex-1 flex flex-col items-center py-2 animate-in zoom-in-95 duration-500 w-full space-y-6">
                <div className="bg-white/5 border border-white/10 p-5 rounded-full backdrop-blur-3xl relative shrink-0">
                  <CheckCircle2 size={40} className="text-purple-400" />
                </div>
                <div className="text-center shrink-0">
                  <h1 className="text-4xl font-black italic text-transparent bg-clip-text animate-shine from-white to-purple-500 uppercase">THANK YOU!</h1>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mt-2 tracking-widest">OYAA DEN LIST EKATA ETHLATH WELA TIYENNE</p>
                </div>
                
                <div className="w-full flex flex-col space-y-4">
                  <div className="flex items-center justify-between px-2 border-b border-white/5 pb-2">
                    <p className="text-[12px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                      <Users size={14} /> JOINING CREW
                    </p>
                    <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-black">{attendees.length}</span>
                  </div>
                  <div className="space-y-3 w-full pb-10 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                    {attendees.map((att, idx) => (
                      <CrewMember key={idx} person={att} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="shrink-0 mt-auto space-y-3 pt-6 border-t border-white/5 w-full pb-4">
              <div className="flex items-center justify-center gap-1.5 opacity-30 text-[7px] font-bold uppercase">
                <MapPin size={10} /> {details.venue}
              </div>
              <div className="flex justify-between items-center px-4 py-3 bg-white/5 rounded-2xl border border-white/5">
                <div className="text-left font-bold">
                  <p className="text-[6px] text-gray-500 uppercase">DATE</p>
                  <p className="text-[10px]">FEB 20, 2026</p>
                </div>
                <div className="text-right font-bold">
                  <p className="text-[6px] text-gray-500 uppercase">RSVP</p>
                  <p className="text-[10px]">{details.contact}</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <div className="mt-4 opacity-10 text-[7px] font-black tracking-[0.4em] uppercase text-center pointer-events-none">
        <p>© 2026 LUMINARA PRODUCTIONS — POWERED BY @AMIDUNISHELA</p>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(168, 85, 247, 0.4); border-radius: 10px; }
        @keyframes shine { 0% { background-position: 200% center; } 100% { background-position: -200% center; } }
        .animate-shine { background: linear-gradient(90deg, #fff 0%, #a855f7 50%, #fff 100%); background-size: 200% auto; background-clip: text; animation: shine 4s linear infinite; }
        @keyframes logo-spin { from { transform: rotateY(0deg); } to { transform: rotateY(360deg); } }
        .animate-logo-spin { animation: logo-spin 10s linear infinite; transform-style: preserve-3d; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
        .perspective-1000 { perspective: 1000px; }
      `}</style>
    </div>
  );
};

export default App;