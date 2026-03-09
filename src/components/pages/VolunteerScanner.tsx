import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, getDoc, updateDoc, doc, onSnapshot, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { Loader2, QrCode, ScanLine, UserCheck, AlertCircle, CheckCircle2, Search, ArrowLeft, Megaphone, Map, Send, Clock, User as UserIcon, Camera } from "lucide-react";
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";

export default function VolunteerDashboard() {
    const { profile, loading } = useAuth();
    const [scannedUid, setScannedUid] = useState("");
    const [isScanning, setIsScanning] = useState(false);

    const [attendee, setAttendee] = useState<any | null>(null);
    const [ticket, setTicket] = useState<any | null>(null);

    const [status, setStatus] = useState<{ type: "idle" | "loading" | "success" | "error" | "warning"; message: string }>({ type: "idle", message: "" });
    const [cameraActive, setCameraActive] = useState(false);
    const [currentSession, setCurrentSession] = useState("Main Check-in");

    // Rapid Mode State
    const [rapidMode, setRapidMode] = useState(false);
    const [rapidCount, setRapidCount] = useState(0);
    const [rapidLimit, setRapidLimit] = useState(50);

    // Stats State
    const [totalCheckedIn, setTotalCheckedIn] = useState(0);
    const [totalTickets, setTotalTickets] = useState(0);
    const [myScanCount, setMyScanCount] = useState(0);

    const sessionOptions = ["Main Check-in", "Goodies", "Session 1", "Session 2", "Workshop A", "Networking Mixer"];

    // Dashboard Tabs State
    const [activeTab, setActiveTab] = useState<"scanner" | "assignments" | "comms">("scanner");

    // Communications State
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [sendingMsg, setSendingMsg] = useState(false);

    // Assignments State
    const [assignments, setAssignments] = useState<any[]>([]);

    useEffect(() => {
        if (!loading && (!profile || !["admin", "manager", "volunteer"].includes(profile.role))) {
            window.location.href = "/profile";
        }
    }, [profile, loading]);

    // Use a ref to store current status to avoid reloading scanner dependency
    const scanStateRef = useRef({ attendee, status });
    useEffect(() => {
        scanStateRef.current = { attendee, status };
    }, [attendee, status]);

    // Setup Html5Qrcode Scanner
    useEffect(() => {
        if (activeTab !== "scanner" || attendee || status.type === "loading") {
            stopCamera();
            return;
        }

        startCamera();

        // Handle visibility change (tab switching)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && activeTab === 'scanner' && !attendee && status.type !== 'loading') {
                startCamera();
            } else {
                // We don't necessarily stop here because some browsers might kill the stream anyway,
                // but restarting on visible is the key fix.
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            stopCamera();
        };
    }, [activeTab, attendee, status.type]);

    const scannerRef = useRef<Html5Qrcode | null>(null);

    const startCamera = async () => {
        // If already active or currently trying to start, skip
        if (cameraActive || scannerRef.current) return;

        try {
            // Give the UI a moment to render the div#reader
            setTimeout(async () => {
                const readerElement = document.getElementById("reader");
                if (!readerElement) return;

                const html5QrCode = new Html5Qrcode("reader");
                scannerRef.current = html5QrCode;

                try {
                    await html5QrCode.start(
                        { facingMode: "environment" },
                        {
                            fps: 10,
                            qrbox: { width: 250, height: 250 },
                            aspectRatio: 1.0
                        },
                        (decodedText) => {
                            if (!scanStateRef.current.attendee && scanStateRef.current.status.type !== "loading") {
                                setScannedUid(decodedText);
                                handleScanCode(decodedText);
                                if (!rapidModeRef.current) {
                                    stopCamera();
                                }
                            }
                        },
                        () => { } // Ignore scan errors
                    );
                    setCameraActive(true);
                } catch (err) {
                    console.error("Error starting camera", err);
                    scannerRef.current = null;
                    setStatus({ type: "error", message: "Camera access denied or unavailable." });
                }
            }, 150);

        } catch (err) {
            console.error("Camera setup failed", err);
            setStatus({ type: "error", message: "Camera error. Please refresh." });
        }
    };

    const stopCamera = async () => {
        if (!scannerRef.current) {
            setCameraActive(false);
            return;
        }

        const scanner = scannerRef.current;
        scannerRef.current = null; // Clear ref immediately to prevent race conditions
        setCameraActive(false);

        try {
            if (scanner.isScanning) {
                await scanner.stop();
            }
            scanner.clear();
        } catch (err) {
            console.error("Failed to stop scanner", err);
        }
    };

    // Real-time listener for communications
    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, "communications"), orderBy("timestamp", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            const msgs: any[] = [];
            snap.forEach(doc => msgs.push({ id: doc.id, ...doc.data() }));
            setMessages(msgs);
        });
        return () => unsub();
    }, []);

    // Fetch Assignments based on user
    useEffect(() => {
        const fetchAssignments = async () => {
            if (!db || !profile) return;
            const q = query(collection(db, "assignments"), where("assignedTo", "==", profile.uid));
            const snap = await getDocs(q);
            const asg: any[] = [];
            snap.forEach(doc => asg.push({ id: doc.id, ...doc.data() }));
            setAssignments(asg);
        };
        fetchAssignments();
    }, [profile]);

    // Use refs for rapid mode inside callbacks
    const rapidModeRef = useRef(rapidMode);
    const rapidCountRef = useRef(rapidCount);
    const rapidLimitRef = useRef(rapidLimit);
    useEffect(() => {
        rapidModeRef.current = rapidMode;
        rapidCountRef.current = rapidCount;
        rapidLimitRef.current = rapidLimit;
    }, [rapidMode, rapidCount, rapidLimit]);

    useEffect(() => {
        // Fetch Total Checked In for current session
        const fetchTotals = async () => {
            if (!db) return;
            try {
                const ticketsRef = collection(db, "tickets");
                const q = query(ticketsRef, where("active", "==", true));
                const snap = await getDocs(q);

                setTotalTickets(snap.size);

                let count = 0;
                let myCount = 0;
                snap.forEach(doc => {
                    const tData = doc.data();
                    if (tData.scans && tData.scans[currentSession]) {
                        count++;
                        if (tData.scannedBy && tData.scannedBy[currentSession] === profile?.uid) {
                            myCount++;
                        }
                    }
                });
                setTotalCheckedIn(count);
                setMyScanCount(myCount);
            } catch (e) {
                console.error("Failed fetching totals", e);
            }
        };
        fetchTotals();
    }, [currentSession, activeTab, profile?.uid]);

    const handleScanCode = async (codeToScan: string) => {
        const code = codeToScan.trim();
        if (!code) return;

        setStatus({ type: "loading", message: "Verifying pass..." });
        setAttendee(null);
        setTicket(null);

        try {
            if (!db) return;

            // 1. Try direct lookup by Ticket ID (Primary Method)
            const globalTicketRef = doc(db, "tickets", code);
            const ticketSnap = await getDoc(globalTicketRef);

            if (ticketSnap.exists()) {
                const tData = ticketSnap.data();
                const ticketId = ticketSnap.id;
                const attendeeObj = {
                    uid: tData.userId,
                    name: tData.userName,
                    email: tData.userEmail
                };

                setTicket({ id: ticketId, ...tData });
                setAttendee(attendeeObj);
                processValidation(tData, ticketId, attendeeObj);
                return;
            }

            // 2. Fallback: Lookup by Email (Manual Entry)
            if (code.includes("@")) {
                const globalTicketsRef = collection(db, "tickets");
                const emailQuery = query(globalTicketsRef, where("userEmail", "==", code), where("active", "==", true));
                const emailSnap = await getDocs(emailQuery);

                if (!emailSnap.empty) {
                    const ticketDoc = emailSnap.docs[0];
                    const tData = ticketDoc.data();
                    const ticketId = ticketDoc.id;
                    const attendeeObj = {
                        uid: tData.userId,
                        name: tData.userName,
                        email: tData.userEmail
                    };

                    setTicket({ id: ticketId, ...tData });
                    setAttendee(attendeeObj);
                    processValidation(tData, ticketId, attendeeObj);
                    return;
                }
            }

            setStatus({ type: "error", message: "Invalid ticket code or email." });
            setScannedUid("");

        } catch (err) {
            console.error(err);
            setStatus({ type: "error", message: "Error looking up pass." });
        }
    };

    const processValidation = async (tData: any, ticketId: string, attendeeObj: any) => {
        const alreadyScanned = tData.scans && tData.scans[currentSession];
        if (alreadyScanned) {
            setStatus({ type: "warning", message: `Attendee already scanned for ${currentSession}!` });
        } else if (currentSession !== "Main Check-in" && (!tData.scans || !tData.scans["Main Check-in"])) {
            setStatus({ type: "warning", message: `Attendee hasn't completed Main Check-in yet!` });
        } else {
            setStatus({ type: "success", message: `Valid pass ready for: ${currentSession}` });

            // If Rapid Mode is ON and under limit, auto trigger checking
            if (rapidModeRef.current && rapidCountRef.current < rapidLimitRef.current) {
                await executeCheckIn(tData, ticketId, attendeeObj);
            } else if (rapidModeRef.current && rapidCountRef.current >= rapidLimitRef.current) {
                setRapidMode(false);
                setStatus({ type: "warning", message: `Rapid limit (${rapidLimitRef.current}) reached. Mode disabled. Please reset count to continue rapid scanning.` });
            }
        }
        setScannedUid("");
    };

    const executeCheckIn = async (currentTicket: any, tId: string, currentAttendee: any) => {
        setStatus({ type: "loading", message: `Marking attendance for ${currentSession}...` });
        try {
            const timestamp = serverTimestamp();
            const isMain = currentSession === "Main Check-in";

            const updatePayload = {
                [`scans.${currentSession}`]: true,
                [`scanTimes.${currentSession}`]: timestamp,
                [`scannedBy.${currentSession}`]: profile?.uid || "unknown",
                ...(isMain ? { checkedIn: true, checkedInAt: timestamp } : {})
            };

            // Update the main global ticket doc (Source of Truth)
            const globalTicketRef = doc(db, "tickets", tId);
            await updateDoc(globalTicketRef, updatePayload);

            // Optional: Also update user-specific doc if UID is available and not 'anonymous'
            if (currentAttendee.uid && currentAttendee.uid !== 'anonymous') {
                try {
                    const userTicketRef = doc(db, "users", currentAttendee.uid, "tickets", tId);
                    await updateDoc(userTicketRef, updatePayload);
                } catch (userDocErr) {
                    console.warn("Could not update user-specific ticket doc, proceeding anyway:", userDocErr);
                }
            }

            const newScans = { ...(currentTicket.scans || {}), [currentSession]: true };
            setTicket({ ...currentTicket, scans: newScans, ...(isMain ? { checkedIn: true } : {}) });
            setStatus({ type: "success", message: `Successfully checked in to ${currentSession}!` });

            setTotalCheckedIn(prev => prev + 1);
            if (rapidModeRef.current) {
                setRapidCount(prev => prev + 1);
            }

            // Auto clear screen after success
            setTimeout(() => {
                setAttendee(null);
                setTicket(null);
                setStatus({ type: "idle", message: "" });
            }, rapidModeRef.current ? 1000 : 2500);

        } catch (err) {
            console.error(err);
            setStatus({ type: "error", message: "Failed to check in attendee." });
        }
    };

    const handleCheckIn = () => {
        if (!ticket || !attendee) return;
        executeCheckIn(ticket, ticket.id, attendee);
    };

    const resetScanner = () => {
        setAttendee(null);
        setTicket(null);
        setStatus({ type: "idle", message: "" });
        setScannedUid("");
        startCamera();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#00C853]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-20 px-4 pb-20">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <a href="/profile" className="p-2 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-gray-900 transition-colors shadow-sm">
                        <ArrowLeft className="w-5 h-5" />
                    </a>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Staff Dashboard</h1>
                        <p className="text-gray-500 text-sm">Volunteer & Manager Portal</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex overflow-x-auto gap-2 mb-6 pb-2 hide-scrollbar">
                    <button
                        onClick={() => setActiveTab("scanner")}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-colors whitespace-nowrap ${activeTab === "scanner" ? "bg-[#00C853] text-white shadow-md shadow-green-500/20" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
                    >
                        <ScanLine className="w-5 h-5" /> Scanner
                    </button>
                    <button
                        onClick={() => setActiveTab("assignments")}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-colors whitespace-nowrap ${activeTab === "assignments" ? "bg-[#00C853] text-white shadow-md shadow-green-500/20" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
                    >
                        <Map className="w-5 h-5" /> My Assignments
                    </button>
                    <button
                        onClick={() => setActiveTab("comms")}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-colors whitespace-nowrap ${activeTab === "comms" ? "bg-[#00C853] text-white shadow-md shadow-green-500/20" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
                    >
                        <Megaphone className="w-5 h-5" /> Comms
                        {messages.length > 0 && (
                            <span className="ml-1 w-5 h-5 rounded-full bg-white text-green-600 text-xs flex items-center justify-center">
                                {messages.length > 9 ? '9+' : messages.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* TAB: SCANNER */}
                {activeTab === "scanner" && (
                    <>
                        {/* Session Selector & Rapid Mode */}
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 mb-6 flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                    <ScanLine className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Scanning For Event / Station</label>
                                    <select
                                        value={currentSession}
                                        onChange={(e) => setCurrentSession(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-gray-900 font-bold focus:outline-none focus:border-[#00C853] appearance-none"
                                    >
                                        {sessionOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-gray-800 flex items-center gap-2 text-sm">Rapid Scan Mode</h4>
                                    <p className="text-xs text-gray-500 max-w-[200px]">Auto-confirms scans without clicking buttons.</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {rapidMode && (
                                        <div className="flex items-center gap-2 mr-2">
                                            <div className="flex flex-col items-end mr-2">
                                                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">Count: {rapidCount}/</span>
                                                {rapidCount > 0 && (
                                                    <button onClick={() => setRapidCount(0)} className="text-[10px] text-red-500 hover:underline mt-1 bg-white font-bold px-1 rounded border">Reset</button>
                                                )}
                                            </div>
                                            <input
                                                type="number"
                                                value={rapidLimit}
                                                onChange={(e) => setRapidLimit(Number(e.target.value) || 50)}
                                                className="w-16 h-8 text-sm font-bold border border-amber-200 rounded px-2 text-center focus:outline-amber-400 bg-amber-50 text-amber-900"
                                                min={1} max={999}
                                            />
                                        </div>
                                    )}
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={rapidMode} onChange={(e) => setRapidMode(e.target.checked)} />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00C853]"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Live Camera Scanner */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 mb-6 relative overflow-hidden">
                            {!attendee && (
                                <div className="animate-in fade-in zoom-in duration-300">
                                    <div className="flex items-center gap-2 mb-4 justify-center text-gray-700 font-bold uppercase tracking-wider text-sm">
                                        <Camera className="w-4 h-4 text-[#00C853]" />
                                        <span>Align QR Code in Frame</span>
                                    </div>
                                    <div className="relative w-full max-w-sm mx-auto overflow-hidden rounded-xl border-2 border-[#00C853]/30 bg-black aspect-square flex items-center justify-center">
                                        <div id="reader" className="w-full h-full"></div>
                                        {!cameraActive && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 z-20 bg-black/80">
                                                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                                <span className="text-sm font-medium">Accessing Camera...</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Status Overlay */}
                            {status.message && !attendee && (
                                <div className={`mt-4 mx-auto max-w-sm p-4 rounded-xl flex items-center justify-center gap-3 ${status.type === "error" ? "bg-red-50 text-red-700 border border-red-200" :
                                    status.type === "loading" ? "bg-blue-50 text-blue-700 border border-blue-200" : ""
                                    }`}>
                                    {status.type === "error" && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                                    {status.type === "loading" && <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />}
                                    <span className="font-medium text-center">{status.message}</span>
                                </div>
                            )}
                        </div>

                        {/* Manual Entry Fallback */}
                        {!attendee && (
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 mb-6">
                                <form onSubmit={(e) => { e.preventDefault(); handleScanCode(scannedUid); }}>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 text-center">Or Enter Ticket ID / Email Manually</label>
                                    <div className="flex gap-3 max-w-sm mx-auto">
                                        <input
                                            type="text"
                                            value={scannedUid}
                                            onChange={(e) => setScannedUid(e.target.value)}
                                            placeholder="Enter Ticket ID or Email..."
                                            className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:border-[#00C853] focus:ring-2 focus:ring-[#00C853]/20 font-mono transition-all"
                                            autoComplete="off"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!scannedUid.trim() || status.type === "loading"}
                                            className="bg-gray-900 hover:bg-black text-white px-6 rounded-xl font-bold transition-colors shadow-md disabled:opacity-50 flex items-center gap-2"
                                        >
                                            <Search className="w-4 h-4" />
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Scanned Result Area */}
                        {attendee && ticket && (
                            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden transform transition-all animate-in fade-in slide-in-from-bottom-4">
                                <div className={`p-6 ${ticket.checkedIn ? 'bg-amber-50 border-b border-amber-200' : 'bg-green-50 border-b border-green-200'}`}>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-900 mb-1">{attendee.name}</h2>
                                            <p className="text-gray-600 font-medium">{attendee.email}</p>
                                            <p className="text-xs text-gray-400 font-mono mt-2">Ticket ID: {ticket.id}</p>
                                        </div>
                                        <div className={`p-3 rounded-full ${ticket.checkedIn ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                                            {ticket.checkedIn ? <AlertCircle className="w-8 h-8" /> : <UserCheck className="w-8 h-8" />}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Pass Details</h3>

                                    <div className="grid grid-cols-2 gap-6 mb-8">
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Pass Type</p>
                                            <div className="flex items-center gap-2">
                                                <QrCode className="w-4 h-4 text-gray-400" />
                                                <p className="font-bold text-gray-900 text-lg">{ticket.categoryName}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Pass ID</p>
                                            <p className="font-mono text-gray-900 font-bold">{ticket.id.split('-')[1] || ticket.id}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Payment</p>
                                            <p className="font-bold text-gray-900 capitalize">
                                                {ticket.paymentStatus === "free" ? "Free" : `Paid (₹${ticket.amount})`}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Pass Status</p>
                                            {ticket.checkedIn ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-bold">
                                                    Event Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
                                                    Valid Base Pass
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{currentSession} Status</p>
                                            {ticket.scans && ticket.scans[currentSession] ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-bold">
                                                    Already Scanned
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-bold">
                                                    Ready to Scan
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Check-In Action Section */}
                                    <div className="pt-6 border-t border-gray-100 space-y-3">
                                        {ticket.scans && ticket.scans[currentSession] ? (
                                            <div className="w-full bg-gray-100 text-gray-500 font-bold py-4 rounded-xl text-center flex items-center justify-center gap-2">
                                                <CheckCircle2 className="w-5 h-5" />
                                                Already Scanned For {currentSession}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={handleCheckIn}
                                                disabled={status.type === "loading" || rapidMode}
                                                className="w-full bg-[#00C853] hover:bg-[#007B33] text-white font-bold text-xl py-5 rounded-xl transition-all shadow-lg shadow-green-600/30 hover:shadow-green-600/40 flex items-center justify-center gap-3 disabled:opacity-70 disabled:shadow-none"
                                            >
                                                {status.type === "loading" ? (
                                                    <>
                                                        <Loader2 className="w-6 h-6 animate-spin" />
                                                        Processing...
                                                    </>
                                                ) : rapidMode ? (
                                                    <>
                                                        <ScanLine className="w-6 h-6 animate-pulse" />
                                                        Auto-Scanning in Rapid Mode...
                                                    </>
                                                ) : (
                                                    <>
                                                        <UserCheck className="w-6 h-6" />
                                                        SCAN FOR: {currentSession.toUpperCase()}
                                                    </>
                                                )}
                                            </button>
                                        )}

                                        {!rapidMode && (
                                            <button
                                                onClick={resetScanner}
                                                className="w-full py-4 text-sm font-bold text-[#00C853] hover:text-[#007B33] bg-green-50 hover:bg-green-100 rounded-xl transition-colors mt-2"
                                            >
                                                Scan Next
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Total Scanned Floating Bar */}
                        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-40 flex items-center justify-between px-6 max-w-2xl mx-auto rounded-t-2xl">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5"><Clock className="w-3 h-3" /> {currentSession}</span>
                                <span className="text-sm font-medium text-gray-700 mt-0.5">Scanned by me: <strong className="text-[#00C853] ml-1">{myScanCount}</strong></span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total In / Out Of</span>
                                <div className="text-xl font-black text-blue-600 tracking-tight flex items-baseline gap-1 mt-0.5">
                                    {totalCheckedIn} <span className="text-sm text-gray-400 font-medium">/ {totalTickets}</span>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* TAB: ASSIGNMENTS */}
                {activeTab === "assignments" && (
                    <div className="space-y-6">
                        {assignments.length === 0 ? (
                            <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-200 text-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Map className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">No Active Assignments</h3>
                                <p className="text-gray-500">You currently have no stations assigned. Check back later or ask a Manager.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {assignments.map((asg) => (
                                    <div key={asg.id} className="bg-white rounded-2xl p-6 shadow-sm border border-green-200 border-l-4 border-l-[#00C853]">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-bold flex items-center gap-2 text-gray-800 text-lg">
                                                {asg.title}
                                            </h3>
                                            <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded-full uppercase tracking-wider">{asg.status || 'Active'}</span>
                                        </div>
                                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-gray-600">
                                            {asg.description}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB: COMMUNICATIONS */}
                {activeTab === "comms" && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[600px]">
                        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <Megaphone className="w-5 h-5 text-blue-500" />
                                Staff Communications Channel
                            </h3>
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded font-bold uppercase tracking-wider">{profile?.role}</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col-reverse">
                            {messages.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">No messages yet.</div>
                            ) : (
                                messages.map((msg) => {
                                    const isMe = msg.senderId === profile?.uid;
                                    const isAdmin = msg.senderRole === "admin" || msg.senderRole === "manager";

                                    return (
                                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-gray-500">{msg.senderName}</span>
                                                {isAdmin && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded uppercase font-bold tracking-wider">{msg.senderRole}</span>}
                                                <span className="text-xs text-gray-400 font-mono">
                                                    {msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </span>
                                            </div>
                                            <div className={`px-4 py-3 rounded-2xl max-w-[85%] ${isMe ? 'bg-[#00C853] text-white rounded-br-sm shadow-md shadow-green-200' : isAdmin ? 'bg-red-50 border border-red-100 text-red-900 rounded-bl-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                                                <p className="text-sm">{msg.text}</p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Send Message Input */}
                        <div className="p-4 border-t border-gray-200 bg-white">
                            <form
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    if (!newMessage.trim() || !db) return;
                                    setSendingMsg(true);
                                    try {
                                        await addDoc(collection(db, "communications"), {
                                            text: newMessage.trim(),
                                            senderId: profile?.uid,
                                            senderName: profile?.displayName || "Staff Member",
                                            senderRole: profile?.role,
                                            timestamp: serverTimestamp()
                                        });
                                        setNewMessage("");
                                    } catch (err) {
                                        console.error(err);
                                    } finally {
                                        setSendingMsg(false);
                                    }
                                }}
                                className="flex gap-2"
                            >
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message to all staff..."
                                    className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00C853] focus:ring-1 focus:ring-[#00C853]"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim() || sendingMsg}
                                    className="bg-gray-900 hover:bg-black text-white px-4 rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center shadow-md"
                                >
                                    {sendingMsg ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
