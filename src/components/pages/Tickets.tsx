import React, { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Check, Loader2, KeyRound, IndianRupee, ShieldCheck, X, AlertCircle, Plus, Minus, User as UserIcon, Mail, Clock, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { doc, getDoc, setDoc, serverTimestamp, getDocs, collection, query, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getPublicTicketCategories, getTicketCategoryByAccessCode } from "@/lib/firestore/tickets";
import type { TicketCategory } from "@/lib/firestore/tickets";
import { loadRazorpayScript } from "@/lib/razorpay";

declare global {
  interface Window {
    Razorpay: any;
  }
}


const codeSchema = z.object({
  code: z.string().min(3, "Code is required").toUpperCase(),
});

type CodeFormValues = z.infer<typeof codeSchema>;

export default function Tickets() {
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [userTicketCounts, setUserTicketCounts] = useState<Record<string, number>>({});
  const [userHasAnyTicket, setUserHasAnyTicket] = useState(false);

  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockMessage, setUnlockMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [claimLoading, setClaimLoading] = useState<string | null>(null);
  const [claimMessage, setClaimMessage] = useState<{ id: string, type: "success" | "error"; text: string } | null>(null);

  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Cart & Assignment States
  const [showModal, setShowModal] = useState(false);
  const [selectedTicketForCart, setSelectedTicketForCart] = useState<TicketCategory | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [primaryAttendee, setPrimaryAttendee] = useState({
    name: "", email: "", phone: "", gender: "", age: "", location: "",
    linkedin: "", occupation: "", designation: "", organisation: "",
    osExperience: "", expectations: "", foodPreference: "",
    emergencyContactName: "", emergencyContactNumber: "", medicalCondition: "",
    source: "", consentPromote: false, consentConduct: false
  });
  const [assignees, setAssignees] = useState<Array<{ name: string, email: string }>>([]);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes

  // OTP States
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [sendOtpLoading, setSendOtpLoading] = useState(false);
  const [verifyOtpLoading, setVerifyOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTimer > 0) {
      timer = setInterval(() => setResendTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleSendOtp = async () => {
    if (!primaryAttendee.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(primaryAttendee.email)) {
      setOtpError("Please enter a valid email address");
      return;
    }

    setSendOtpLoading(true);
    setOtpError(null);
    try {
      const resp = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: primaryAttendee.email })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to send OTP");
      setOtpSent(true);
      setResendTimer(60);
    } catch (err: any) {
      setOtpError(err.message);
    } finally {
      setSendOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpInput.length !== 6) {
      setOtpError("Please enter a 6-digit OTP");
      return;
    }

    setVerifyOtpLoading(true);
    setOtpError(null);
    try {
      const resp = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: primaryAttendee.email, otp: otpInput })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Invalid OTP");
      setIsEmailVerified(true);
      setOtpSent(false);
    } catch (err: any) {
      setOtpError(err.message);
    } finally {
      setVerifyOtpLoading(false);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showModal) {
      if (timeLeft > 0 && !paymentProcessing && !claimMessage?.type) {
        timer = setInterval(() => {
          setTimeLeft(prev => prev - 1);
        }, 1000);
      } else if (timeLeft <= 0) {
        setShowModal(false);
        setClaimMessage({ id: selectedTicketForCart?.id || "", type: "error", text: "Checkout timed out. Please try again." });
      }
    } else {
      setTimeLeft(600); // reset when modal closes
    }
    return () => clearInterval(timer);
  }, [showModal, timeLeft, paymentProcessing, claimMessage]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CodeFormValues>({
    resolver: zodResolver(codeSchema),
  });

  useEffect(() => {
    async function loadTickets() {
      try {
        const publicTix = await getPublicTicketCategories();
        setCategories(publicTix);

        // Fetch user's existing tickets to enforce per-person limits and total block
        if (auth.currentUser && db) {
          const snap = await getDocs(collection(db, "users", auth.currentUser.uid, "tickets"));
          const counts: Record<string, number> = {};
          let hasAny = false;
          snap.forEach(doc => {
            const data = doc.data();
            if (data.categoryId) {
              counts[data.categoryId] = (counts[data.categoryId] || 0) + 1;
              hasAny = true;
            }
          });
          setUserTicketCounts(counts);
          setUserHasAnyTicket(hasAny);
        }

      } catch (err) {
        console.error("Failed to load tickets", err);
      } finally {
        setLoadingInitial(false);
      }
    }

    // Wait for auth to initialize before checking
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        if (!user.isAnonymous && user.displayName) setPrimaryAttendee(prev => ({ ...prev, name: user.displayName! }));
        if (!user.isAnonymous && user.email) setPrimaryAttendee(prev => ({ ...prev, email: user.email! }));

        // Check if user is already verified in their profile
        if (!user.isAnonymous && db) {
          try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists() && userDoc.data().emailVerified) {
              setIsEmailVerified(true);
            }
          } catch (err) {
            console.error("Failed to check user verification status", err);
          }
        }
      }
      loadTickets();
    });

    return () => unsubscribe();
  }, []);

  const onCodeSubmit = async (data: CodeFormValues) => {
    setUnlockLoading(true);
    setUnlockMessage(null);
    try {
      const hiddenCategory = await getTicketCategoryByAccessCode(data.code);
      if (hiddenCategory) {
        // Tag the returned category with the exact code used so we can increment usage later
        hiddenCategory.accessCode = data.code;

        setCategories(prev => {
          if (prev.some(c => c.id === hiddenCategory.id)) return prev;
          return [...prev, hiddenCategory];
        });
        setUnlockMessage({ type: "success", text: "Special ticket unlocked!" });
        reset();
      } else {
        setUnlockMessage({ type: "error", text: "Invalid access code." });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUnlockLoading(false);
    }
  };

  const handlePurchaseClick = (category: TicketCategory) => {
    // Default config: 1 ticket, clear assignees
    setSelectedTicketForCart(category);
    setQuantity(1);
    setAssignees([]);
    setShowModal(true);
  };

  const processCheckout = async () => {
    if (!selectedTicketForCart) return;

    if (selectedTicketForCart.price === 0) {
      handleSuccessfulPayment();
      return;
    }

    try {
      setClaimLoading(selectedTicketForCart.id);
      setClaimMessage(null);

      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        setClaimMessage({ id: selectedTicketForCart.id, type: "error", text: "Failed to load payment gateway." });
        setClaimLoading(null);
        return;
      }

      const publicKey = import.meta.env.PUBLIC_RAZORPAY_KEY_ID || import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_live_SNuw6JVmpkOI5f";
      const isTestMode = publicKey.startsWith("rzp_test_");

      let orderData: any = null;
      const totalAmount = selectedTicketForCart.price * quantity;

      if (!isTestMode) {
        const orderResponse = await fetch("/api/create-razorpay-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoryId: selectedTicketForCart.id,
            quantity: quantity,
            currency: "INR",
            receipt: `rcpt_${auth.currentUser?.uid?.slice(0, 5) || "anon"}_${Date.now()}`
          })
        });
        orderData = await orderResponse.json();
        if (!orderResponse.ok) throw new Error(orderData.error || "Failed to create order");
      }

      const options = {
        key: publicKey,
        amount: isTestMode ? totalAmount * 100 : orderData.amount,
        currency: isTestMode ? "INR" : orderData.currency,
        name: "OPEN EVEN",
        description: `${quantity}x ${selectedTicketForCart.name} Pass${isTestMode ? " (TEST MODE)" : ""}`,
        ...(orderData ? { order_id: orderData.id } : {}),
        handler: async function (response: any) {
          try {
            setPaymentProcessing(true);

            if (!isTestMode) {
              setClaimMessage({ id: selectedTicketForCart.id, type: "success", text: "Verifying payment securely..." });
              const verifyResponse = await fetch("/api/verify-razorpay-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                })
              });
              if (!verifyResponse.ok) throw new Error("Payment verification failed");
            } else {
              setClaimMessage({ id: selectedTicketForCart.id, type: "success", text: "Test payment successful!" });
            }

            await handleSuccessfulPayment();

          } catch (err: any) {
            console.error(err);
            setClaimMessage({ id: selectedTicketForCart.id, type: "error", text: "Payment verification failed. If money was deducted, please contact support." });
            setPaymentProcessing(false);
            setClaimLoading(null);
          }
        },
        prefill: {
          name: primaryAttendee.name || auth.currentUser?.displayName || "",
          email: primaryAttendee.email || auth.currentUser?.email || "",
        },
        theme: { color: "#002b5e" },
        modal: { ondismiss: function () { setClaimLoading(null); } }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        setClaimMessage({ id: selectedTicketForCart.id, type: "error", text: response.error.description || "Payment failed. Please try again." });
        setClaimLoading(null);
      });
      rzp.open();

    } catch (err: any) {
      console.error(err);
      setClaimMessage({ id: selectedTicketForCart.id, type: "error", text: err.message || "Error starting payment" });
      setClaimLoading(null);
    }
  };

  const handleSuccessfulPayment = async () => {
    if (!selectedTicketForCart) return;
    const paymentStatus = selectedTicketForCart.price === 0 ? "free" : "paid";

    try {
      setClaimMessage({ id: selectedTicketForCart.id, type: "success", text: "Generating passes..." });

      const issuedTickets: any[] = [];

      // Issue primary ticket 1 to buyer
      const primaryTicket = await processTicketIssuance(selectedTicketForCart, paymentStatus, {
        isPrimary: true,
        assigneeName: primaryAttendee.name || auth.currentUser?.displayName || 'Unknown',
        assigneeEmail: primaryAttendee.email || auth.currentUser?.email || ''
      });
      issuedTickets.push(primaryTicket);

      // Issue extra tickets (if quantity > 1) to assignees
      for (let i = 0; i < quantity - 1; i++) {
        const assignee = assignees[i];
        if (assignee && assignee.email.trim() !== '') {
          const extraTicket = await processTicketIssuance(selectedTicketForCart, paymentStatus, {
            isPrimary: false,
            assigneeName: assignee.name || 'Guest',
            assigneeEmail: assignee.email,
            purchasedBy: auth.currentUser?.uid || 'anonymous'
          });
          issuedTickets.push(extraTicket);
        }
      }

      // Send confirmation emails
      try {
        await fetch("/api/send-ticket-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tickets: issuedTickets })
        });
      } catch (emailErr) {
        console.error("Failed to send ticket emails:", emailErr);
      }

      setClaimMessage({ id: selectedTicketForCart.id, type: "success", text: "Successfully issued passes!" });
      setShowModal(false);

      setTimeout(() => {
        window.location.href = "/profile";
      }, 1500);

    } catch (err) {
      console.error(err);
      setClaimMessage({ id: selectedTicketForCart.id, type: "error", text: "Failed to issue tickets." });
      setClaimLoading(null);
    }
  };

  const processTicketIssuance = async (
    category: TicketCategory,
    paymentStatus: "free" | "paid",
    details: { isPrimary: boolean, assigneeName: string, assigneeEmail: string, purchasedBy?: string }
  ) => {
    try {
      const ticketId = `TIX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      let targetUid = auth.currentUser!.uid;
      let ticketStatus = "active";

      // If not primary ticket, search DB to see if assignee is already a platform user
      if (!details.isPrimary) {
        const usersRef = collection(db!, "users");
        const q = query(usersRef, where("email", "==", details.assigneeEmail.trim()));
        const snap = await getDocs(q);

        if (!snap.empty) {
          // Send it to the Assignee's UID requiring approval
          targetUid = snap.docs[0].id;
          ticketStatus = "pending_approval";
        } else {
          // Give it to the Buyer, but mark it as an assigned guest pass
          targetUid = auth.currentUser!.uid;
          ticketStatus = "assigned_guest";
        }
      }

      const ticketData = {
        ticketId,
        categoryId: category.id,
        categoryName: category.name,
        userId: targetUid,
        userEmail: details.assigneeEmail,
        userName: details.assigneeName,
        purchasedBy: details.purchasedBy || auth.currentUser?.uid || 'anonymous',
        purchasedAt: serverTimestamp(),
        paymentStatus,
        amount: category.price,
        status: ticketStatus,
        active: ticketStatus === "active",
        ...(details.isPrimary ? {
          phone: primaryAttendee.phone,
          gender: primaryAttendee.gender,
          age: primaryAttendee.age,
          location: primaryAttendee.location,
          linkedin: primaryAttendee.linkedin,
          occupation: primaryAttendee.occupation,
          designation: primaryAttendee.designation,
          organisation: primaryAttendee.organisation,
          osExperience: primaryAttendee.osExperience,
          expectations: primaryAttendee.expectations,
          foodPreference: primaryAttendee.foodPreference,
          emergencyContactName: primaryAttendee.emergencyContactName,
          emergencyContactNumber: primaryAttendee.emergencyContactNumber,
          medicalCondition: primaryAttendee.medicalCondition,
          source: primaryAttendee.source,
          consentPromote: primaryAttendee.consentPromote,
          consentConduct: primaryAttendee.consentConduct
        } : {})
      };

      await setDoc(doc(db!, "users", targetUid, "tickets", ticketId), ticketData);
      await setDoc(doc(db!, "tickets", ticketId), ticketData);

      // If unlocked via access code, only increment once for the primary purchase
      if (details.isPrimary && category.accessCode && !category.isVisible) {
        const { incrementTicketCodeUsage } = await import("@/lib/firestore/tickets");
        await incrementTicketCodeUsage(category.accessCode);
      }

      return ticketData;
    } catch (err) {
      console.error("Ticket issuance failed:", err);
      throw err;
    }
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // The global 'Block route if user already holds a ticket' has been removed.
  // We now rely entirely on the per-category limit (`isLimitReached`) logic mapped beautifully inside each ticket card!

  return (
    <div className="min-h-screen pt-24 px-4 max-w-7xl mx-auto pb-24 relative">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Get Your Ticket</h1>
        <p className="text-[var(--text-secondary)] text-lg max-w-2xl mx-auto">
          Join us for the biggest open source event of the year. Choose the pass that suits you best.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {categories.map((ticket, index) => {
          const userCount = userTicketCounts[ticket.id] || 0;
          const isLimitReached = userCount >= ticket.perPersonLimit;

          return (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard
                className="h-full flex flex-col relative transition-all duration-300"
                greenBorder={ticket.price > 0}
              >
                {ticket.isEarlyBird && (
                  <div className="absolute top-4 right-4 bg-primary text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider z-10 shadow-lg shadow-primary/20">
                    Early Bird
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-2" style={{ color: ticket.color }}>{ticket.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-[var(--text-primary)]">
                      {ticket.price === 0 ? "Free" : `₹${ticket.price.toFixed(2)}`}
                    </span>
                    {ticket.price > 0 && <span className="text-[var(--text-secondary)] text-sm">INR / person</span>}
                  </div>
                  <p className="text-[var(--text-secondary)] text-sm mt-2">{ticket.description}</p>
                </div>

                <div className="flex-grow space-y-3 mb-8">
                  {ticket.features && ticket.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  {claimMessage && claimMessage.id === ticket.id && (
                    <div className={`p-2 rounded-lg text-xs text-center ${claimMessage.type === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'}`}>
                      {claimMessage.text}
                    </div>
                  )}

                  {ticket.availableQuantity === 0 ? (
                    <button disabled className="w-full py-3 rounded-xl bg-[var(--glass-bg)] text-[var(--text-secondary)] font-bold border border-[var(--glass-border)] opacity-50 cursor-not-allowed">
                      Sold Out
                    </button>
                  ) : isLimitReached ? (
                    <button disabled className="w-full py-3 rounded-xl bg-[var(--glass-bg)] text-red-400 font-bold border border-red-500/30 opacity-80 cursor-not-allowed">
                      Limit Reached ({userCount}/{ticket.perPersonLimit})
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePurchaseClick(ticket)}
                      disabled={claimLoading === ticket.id}
                      className="w-full py-3 rounded-xl bg-primary text-black font-bold hover:bg-primary-light transition-colors flex justify-center items-center"
                    >
                      {claimLoading === ticket.id ? <Loader2 className="w-5 h-5 animate-spin" /> : "Select Ticket"}
                    </button>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {/* Hidden Ticket Unlock Section */}
      <GlassCard className="max-w-md mx-auto p-6">
        <h3 className="text-lg font-bold mb-4 text-center">Have a special access code?</h3>
        <form onSubmit={handleSubmit(onCodeSubmit)} className="space-y-3">
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
            <input
              {...register("code")}
              type="text"
              placeholder="Enter Access Code"
              className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl pl-10 pr-4 py-3 text-[var(--text-primary)] uppercase focus:outline-none focus:border-primary/50"
            />
          </div>
          {errors.code && <p className="text-red-500 text-xs">{errors.code.message}</p>}

          {unlockMessage && (
            <div className={`p-2 rounded-lg text-xs text-center ${unlockMessage.type === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'}`}>
              {unlockMessage.text}
            </div>
          )}

          <button
            type="submit"
            disabled={unlockLoading}
            className="w-full py-3 rounded-xl bg-[var(--glass-border)] hover:bg-[var(--glass-bg)] text-[var(--text-primary)] font-bold transition-colors border border-[var(--glass-border)] hover:border-primary/30 flex justify-center items-center"
          >
            {unlockLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Unlock Hidden Tickets"}
          </button>
        </form>
      </GlassCard>

      {/* Cart Modal */}
      <AnimatePresence>
        {showModal && selectedTicketForCart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white text-gray-900 rounded-2xl w-full max-w-3xl my-8 relative shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Sticky Header */}
              <div className="sticky top-0 z-20 bg-white border-b border-gray-100 p-6 rounded-t-2xl flex justify-between items-start shrink-0">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Pass Checkout</h2>
                  <p className="text-gray-500">You are purchasing the <strong className="text-primary">{selectedTicketForCart.name}</strong></p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 bg-red-50 text-red-600 font-bold rounded-lg flex items-center gap-2 border border-red-100 shadow-sm">
                    <Clock className="w-4 h-4" />
                    <span>{formatTime(timeLeft)}</span>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Form Area */}
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                {/* Quantity Selector */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="font-bold text-gray-800">Quantity (Max 10)</span>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (quantity > 1) {
                          setQuantity(q => q - 1);
                          setAssignees(a => a.slice(0, -1));
                        }
                      }}
                      disabled={quantity <= 1}
                      className="p-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg disabled:opacity-50 transition-colors text-gray-700 shadow-sm"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-xl font-bold w-6 text-center text-gray-900">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (quantity < 10 && quantity < selectedTicketForCart.perPersonLimit) {
                          setQuantity(q => q + 1);
                          setAssignees(a => [...a, { name: "", email: "" }]);
                        }
                      }}
                      disabled={quantity >= 10 || quantity >= selectedTicketForCart.perPersonLimit}
                      className="p-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg disabled:opacity-50 transition-colors text-gray-700 shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Primary Attendee Inputs */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2">Primary Attendee Details</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Full Name*</label>
                      <input
                        type="text"
                        value={primaryAttendee.name}
                        onChange={e => setPrimaryAttendee({ ...primaryAttendee, name: e.target.value })}
                        required
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 text-gray-900 transition-all placeholder:text-gray-400"
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Email Address*</label>
                      <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          type="email"
                          value={primaryAttendee.email}
                          onChange={e => setPrimaryAttendee({ ...primaryAttendee, email: e.target.value })}
                          required
                          disabled={otpSent || isEmailVerified}
                          className={`w-full bg-gray-50 border ${isEmailVerified ? 'border-green-500 ring-4 ring-green-500/10' : 'border-gray-200'} rounded-xl pl-10 pr-24 py-3 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 text-gray-900 transition-all placeholder:text-gray-400`}
                          placeholder="john@example.com"
                        />
                        {!isEmailVerified && !otpSent && (
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={sendOtpLoading || !primaryAttendee.email}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-black font-black px-4 py-1.5 rounded-lg text-[10px] transition-all disabled:opacity-30 shadow-sm uppercase tracking-wider"
                          >
                            {sendOtpLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Verify"}
                          </button>
                        )}
                        {isEmailVerified && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-200 rounded-lg text-green-600">
                            <ShieldCheck className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Verified</span>
                          </div>
                        )}
                      </div>

                      {otpSent && !isEmailVerified && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-4 p-5 bg-primary/5 border-2 border-primary/20 rounded-2xl relative overflow-hidden"
                        >
                          <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3">
                              <KeyRound className="w-4 h-4 text-primary" />
                              <label className="block text-[11px] font-black text-primary uppercase tracking-widest">Verify Your Mail</label>
                            </div>
                            <p className="text-[10px] text-gray-500 mb-4 font-medium">
                              Enter the 6-digit code sent to <span className="text-gray-900 font-bold">{primaryAttendee.email}</span>
                            </p>
                            <div className="space-y-3">
                              <input
                                type="text"
                                maxLength={6}
                                value={otpInput}
                                onChange={e => setOtpInput(e.target.value)}
                                className="w-full bg-white border border-primary/20 rounded-xl px-4 py-4 text-3xl font-mono font-black tracking-[0.5em] text-center focus:outline-none focus:border-primary text-gray-900 transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-gray-200"
                                placeholder="000000"
                              />
                              <button
                                type="button"
                                onClick={handleVerifyOtp}
                                disabled={verifyOtpLoading || otpInput.length !== 6}
                                className="w-full bg-primary text-black font-black px-6 py-4 rounded-xl text-sm hover:translate-y-[-1px] active:translate-y-[0px] transition-all disabled:opacity-30 disabled:grayscale shadow-lg shadow-primary/20 flex items-center justify-center gap-2 uppercase tracking-widest"
                              >
                                {verifyOtpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify OTP"}
                              </button>
                            </div>
                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-primary/10">
                              <button
                                type="button"
                                onClick={() => { setOtpSent(false); setOtpInput(""); }}
                                className="text-gray-400 hover:text-red-500 font-bold text-[9px] uppercase transition-colors flex items-center gap-1"
                              >
                                <X className="w-2.5 h-2.5" /> Edit Email
                              </button>
                              <button
                                type="button"
                                onClick={handleSendOtp}
                                disabled={resendTimer > 0 || sendOtpLoading}
                                className="text-primary font-black hover:underline disabled:text-gray-300 text-[9px] uppercase transition-all tracking-wider"
                              >
                                {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend"}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {otpError && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 mt-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-red-600">
                          <AlertCircle className="w-3 h-3" />
                          <p className="text-[10px] font-bold">{otpError}</p>
                        </motion.div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Phone Number*</label>
                      <div className="flex shadow-sm rounded-xl overflow-hidden border border-gray-200 group focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all">
                        <span className="inline-flex items-center px-4 bg-gray-50 text-gray-500 text-sm font-bold border-r border-gray-200">+91</span>
                        <input type="tel" value={primaryAttendee.phone} onChange={e => setPrimaryAttendee({ ...primaryAttendee, phone: e.target.value })} required className="flex-1 bg-white px-4 py-3 text-sm focus:outline-none text-gray-900 placeholder:text-gray-400" placeholder="9876543210" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Gender*</label>
                      <select value={primaryAttendee.gender} onChange={e => setPrimaryAttendee({ ...primaryAttendee, gender: e.target.value })} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 text-gray-900 transition-all appearance-none cursor-pointer">
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Non-Binary">Non-Binary</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Age*</label>
                    <input type="number" min="10" max="100" value={primaryAttendee.age} onChange={e => setPrimaryAttendee({ ...primaryAttendee, age: e.target.value })} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 text-gray-900 transition-all placeholder:text-gray-400" placeholder="25" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">City, State*</label>
                    <input type="text" value={primaryAttendee.location} onChange={e => setPrimaryAttendee({ ...primaryAttendee, location: e.target.value })} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 text-gray-900 transition-all placeholder:text-gray-400" placeholder="Mumbai, Maharashtra" />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">LinkedIn URL*</label>
                      <input type="url" value={primaryAttendee.linkedin} onChange={e => setPrimaryAttendee({ ...primaryAttendee, linkedin: e.target.value })} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 text-gray-900 transition-all placeholder:text-gray-400" placeholder="https://linkedin.com/in/yourprofile" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Occupation*</label>
                      <select value={primaryAttendee.occupation} onChange={e => setPrimaryAttendee({ ...primaryAttendee, occupation: e.target.value })} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 text-gray-900 transition-all appearance-none cursor-pointer">
                        <option value="">Select Occupation</option>
                        <option value="Student">Student</option>
                        <option value="Professional">Professional</option>
                        <option value="Freelancer">Freelancer</option>
                        <option value="Entrepreneur">Entrepreneur</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Designation*</label>
                      <input type="text" value={primaryAttendee.designation} onChange={e => setPrimaryAttendee({ ...primaryAttendee, designation: e.target.value })} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 text-gray-900 transition-all placeholder:text-gray-400" placeholder="Student / Developer etc." />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Organisation*</label>
                      <input type="text" value={primaryAttendee.organisation} onChange={e => setPrimaryAttendee({ ...primaryAttendee, organisation: e.target.value })} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 text-gray-900 transition-all placeholder:text-gray-400" placeholder="College / Company Name" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Open Source Experience?*</label>
                      <textarea value={primaryAttendee.osExperience} onChange={e => setPrimaryAttendee({ ...primaryAttendee, osExperience: e.target.value })} required rows={2} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 text-gray-900 transition-all resize-none placeholder:text-gray-400" placeholder="If yes, which one and how you contributed?"></textarea>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Your Expectations?*</label>
                      <textarea value={primaryAttendee.expectations} onChange={e => setPrimaryAttendee({ ...primaryAttendee, expectations: e.target.value })} required rows={2} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 text-gray-900 transition-all resize-none placeholder:text-gray-400" placeholder="Tell us what you expect from OPEN EVEN..."></textarea>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Food Preference*</label>
                      <select value={primaryAttendee.foodPreference} onChange={e => setPrimaryAttendee({ ...primaryAttendee, foodPreference: e.target.value })} required className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-gray-900">
                        <option value="">Select Food Preference</option>
                        <option value="Veg">Vegetarian</option>
                        <option value="Non-Veg">Non-Vegetarian</option>
                        <option value="Vegan">Vegan</option>
                        <option value="Jain">Jain</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Emergency Contact Name*</label>
                      <input type="text" value={primaryAttendee.emergencyContactName} onChange={e => setPrimaryAttendee({ ...primaryAttendee, emergencyContactName: e.target.value })} required className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-gray-900" placeholder="Contact Name" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Emergency Contact Number*</label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-600 text-sm font-medium">+91</span>
                        <input type="tel" value={primaryAttendee.emergencyContactNumber} onChange={e => setPrimaryAttendee({ ...primaryAttendee, emergencyContactNumber: e.target.value })} required className="flex-1 min-w-0 block w-full bg-white border border-gray-300 rounded-none rounded-r-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-gray-900" placeholder="9876543210" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Do you have any medical condition that we should be aware of? (Ignore if none)</label>
                      <input type="text" value={primaryAttendee.medicalCondition} onChange={e => setPrimaryAttendee({ ...primaryAttendee, medicalCondition: e.target.value })} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-gray-900" placeholder="e.g. Allergy to peanuts, Asthma, etc." />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">From where did you hear about event?*</label>
                      <select value={primaryAttendee.source} onChange={e => setPrimaryAttendee({ ...primaryAttendee, source: e.target.value })} required className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-gray-900">
                        <option value="">Select an option</option>
                        {["Facebook", "Twitter", "Instagram", "LinkedIn", "WhatsApp", "Snapchat", "Friends", "Family", "From your organization", "Event you attended", "Website", "News Paper", "News Channel", "Collegue", "From our Community Partners", "From Our Sponsors", "Other"].map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Consents */}
                  <div className="space-y-3 pt-4 border-t border-gray-200">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className="flex items-center h-5">
                        <input type="checkbox" checked={primaryAttendee.consentPromote} onChange={e => setPrimaryAttendee({ ...primaryAttendee, consentPromote: e.target.checked })} required className="w-4 h-4 text-primary bg-white border-gray-300 rounded focus:ring-primary focus:ring-2" />
                      </div>
                      <div className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                        I hereby give consent and understand that information provided by me in this form will be used to promote the event. (News Letter Subscription) also I would like to receive updates & notifications from this event organizer.*
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className="flex items-center h-5">
                        <input type="checkbox" checked={primaryAttendee.consentConduct} onChange={e => setPrimaryAttendee({ ...primaryAttendee, consentConduct: e.target.checked })} required className="w-4 h-4 text-primary bg-white border-gray-300 rounded focus:ring-primary focus:ring-2" />
                      </div>
                      <div className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                        I hereby declare that I accept and agree to abide by the event's policies and all the terms and condition mentioned in Code of Conduct, Publication Guidelines, Copyright Policy, assigned by the organization to me. If found violating, organization can suspend me.*
                      </div>
                    </label>
                  </div>

                </div>

                {/* Assignee Inputs for Extra Tickets */}
                {quantity > 1 && (
                  <div className="pt-6 border-t border-gray-200 space-y-4">
                    <h3 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2">Assign Additional Passes</h3>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>Tickets assigned to emails registered on our platform will appear in their profile to accept. Otherwise, they will be saved as "Guest Passes" under your account.</p>
                    </div>

                    <div className="space-y-4">
                      {assignees.map((assignee, index) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3 relative">
                          <button
                            type="button"
                            onClick={() => {
                              // Remove this specific assignee
                              if (quantity > 1) {
                                setQuantity(q => q - 1);
                                setAssignees(a => a.filter((_, i) => i !== index));
                              }
                            }}
                            className="absolute top-3 right-3 text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="font-bold text-sm text-gray-700 flex items-center gap-2">
                            <UserIcon className="w-4 h-4 text-gray-500" /> Pass #{index + 2} Details
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input
                              type="text"
                              placeholder="Attendee Name"
                              value={assignee.name}
                              onChange={(e) => {
                                const newA = [...assignees];
                                newA[index].name = e.target.value;
                                setAssignees(newA);
                              }}
                              required
                              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-gray-900"
                            />
                            <input
                              type="email"
                              placeholder="Attendee Email"
                              value={assignee.email}
                              onChange={(e) => {
                                const newA = [...assignees];
                                newA[index].email = e.target.value;
                                setAssignees(newA);
                              }}
                              required
                              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-gray-900"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer / Actions - Sticky Bottom */}
              <div className="border-t border-gray-200 p-6 bg-white rounded-b-2xl shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-600 font-medium">Total Amount</span>
                  <span className="text-3xl font-black text-gray-900">
                    {selectedTicketForCart.price === 0 ? "Free" : `₹${(selectedTicketForCart.price * quantity).toFixed(2)}`}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={processCheckout}
                  disabled={
                    claimLoading === selectedTicketForCart.id ||
                    paymentProcessing ||
                    !isEmailVerified ||
                    !primaryAttendee.name || !primaryAttendee.email || !primaryAttendee.phone ||
                    !primaryAttendee.gender || !primaryAttendee.age || !primaryAttendee.location ||
                    !primaryAttendee.linkedin || !primaryAttendee.occupation || !primaryAttendee.designation ||
                    !primaryAttendee.organisation || !primaryAttendee.osExperience || !primaryAttendee.expectations ||
                    !primaryAttendee.foodPreference || !primaryAttendee.emergencyContactName || !primaryAttendee.emergencyContactNumber ||
                    !primaryAttendee.source || !primaryAttendee.consentPromote || !primaryAttendee.consentConduct ||
                    (quantity > 1 && assignees.some(a => !a.name || !a.email))
                  }
                  className="w-full py-4 rounded-xl bg-primary text-black font-bold text-lg hover:bg-primary-light transition-colors flex justify-center items-center shadow-[0_0_20px_rgba(0,200,83,0.3)] disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  {claimLoading === selectedTicketForCart.id || paymentProcessing ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : !isEmailVerified ? (
                    "Verify Email to Continue"
                  ) : (
                    `Proceed to Checkout`
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
