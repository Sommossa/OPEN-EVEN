import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { GlassCard } from "@/components/ui/GlassCard";
import { Loader2, ShieldCheck, KeyRound, X, AlertCircle, Mail } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OTP States
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [sendOtpLoading, setSendOtpLoading] = useState(false);
  const [verifyOtpLoading, setVerifyOtpLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const emailValue = watch("email");

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTimer > 0) {
      timer = setInterval(() => setResendTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleSendOtp = async () => {
    if (!emailValue || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      setError("Please enter a valid email address first");
      return;
    }

    setSendOtpLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailValue })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to send OTP");
      setOtpSent(true);
      setResendTimer(60);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSendOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpInput.length !== 6) {
      setError("Please enter a 6-digit OTP");
      return;
    }

    setVerifyOtpLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailValue, otp: otpInput })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Invalid OTP");
      setIsEmailVerified(true);
      setOtpSent(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setVerifyOtpLoading(false);
    }
  };

  const onSubmit = async (data: RegisterFormValues) => {
    if (!auth || !db) {
      setError("Firebase is not initialized.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: data.name,
      });

      const role = data.email.toLowerCase() === "admin@OPEN EVEN.org" ? "admin" : "attendee";

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: data.name,
        role: role,
        registeredAt: serverTimestamp(),
        permissions: [
          "view:home",
          "view:schedule",
          "view:speakers",
          "view:about",
          "view:own_profile",
          "view:own_ticket",
          "register:event",
        ],
        profileComplete: false,
        emailVerified: true,
      });

      window.location.href = "/profile";
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError("Email is already registered.");
      } else {
        setError("Failed to create account. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 px-4 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <GlassCard className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Create Account</h1>
            <p className="text-[var(--text-secondary)]">Join the community at OPEN EVEN</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg mb-6 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Full Name</label>
              <input
                {...register("name")}
                type="text"
                disabled={otpSent || isEmailVerified}
                className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all disabled:opacity-50 placeholder:text-gray-500"
                placeholder="John Doe"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Email</label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-primary transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  {...register("email")}
                  type="email"
                  disabled={otpSent || isEmailVerified}
                  className={`w-full bg-[var(--glass-bg)] border ${isEmailVerified ? 'border-green-500/50 ring-4 ring-green-500/10' : 'border-[var(--glass-border)]'} rounded-xl pl-10 pr-24 py-3 text-[var(--text-primary)] focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all disabled:opacity-50 placeholder:text-gray-500`}
                  placeholder="you@example.com"
                />
                {!isEmailVerified && !otpSent && (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendOtpLoading || !emailValue}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-black font-black px-4 py-1.5 rounded-lg text-[10px] transition-all disabled:opacity-30 shadow-sm uppercase tracking-wider"
                  >
                    {sendOtpLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Verify"}
                  </button>
                )}
                {isEmailVerified && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Verified</span>
                  </div>
                )}
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}

              <AnimatePresence>
                {otpSent && !isEmailVerified && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 p-5 bg-primary/5 border-2 border-primary/20 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <KeyRound className="w-4 h-4 text-primary" />
                          <label className="block text-[10px] font-black text-primary uppercase tracking-widest">Verify Your Mail</label>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setOtpSent(false); setOtpInput(""); }}
                          className="text-[10px] text-[var(--text-secondary)] hover:text-red-400 transition-colors font-bold uppercase"
                        >
                          Change
                        </button>
                      </div>
                      <p className="text-[10px] text-[var(--text-secondary)] font-medium">
                        We've sent a code to <span className="text-[var(--text-primary)] font-bold">{emailValue}</span>
                      </p>
                      <div className="space-y-4">
                        <input
                          type="text"
                          maxLength={6}
                          value={otpInput}
                          onChange={e => setOtpInput(e.target.value)}
                          className="w-full bg-black/40 border-2 border-primary/20 rounded-xl px-4 py-4 text-3xl font-mono font-black tracking-[0.5em] text-center focus:outline-none focus:border-primary text-[var(--text-primary)] transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-gray-700"
                          placeholder="000000"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyOtp}
                          disabled={verifyOtpLoading || otpInput.length !== 6}
                          className="w-full bg-primary text-black font-black px-6 py-4 rounded-xl text-sm hover:translate-y-[-1px] active:translate-y-[0px] transition-all disabled:opacity-30 disabled:grayscale shadow-xl shadow-primary/20 flex items-center justify-center gap-2 uppercase tracking-widest"
                        >
                          {verifyOtpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify OTP"}
                        </button>
                      </div>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-primary/10">
                        <button
                          type="button"
                          onClick={() => { setOtpSent(false); setOtpInput(""); }}
                          className="text-[var(--text-secondary)] hover:text-red-400 font-bold text-[9px] uppercase transition-colors flex items-center gap-1"
                        >
                          <X className="w-2.5 h-2.5" /> Edit Email
                        </button>
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={resendTimer > 0 || sendOtpLoading}
                          className="text-primary font-black hover:underline disabled:text-gray-500 text-[9px] uppercase transition-all tracking-wider"
                        >
                          {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Password</label>
              <input
                {...register("password")}
                type="password"
                disabled={otpSent || isEmailVerified}
                className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all disabled:opacity-50 placeholder:text-gray-500"
                placeholder="••••••••"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Confirm Password</label>
              <input
                {...register("confirmPassword")}
                type="password"
                disabled={otpSent || isEmailVerified}
                className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all disabled:opacity-50 placeholder:text-gray-500"
                placeholder="••••••••"
              />
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading || !isEmailVerified}
              className="w-full bg-primary text-black font-bold py-3 rounded-xl hover:bg-primary-light transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : !isEmailVerified ? "Verify Email to Continue" : "Create Account"}
            </button>
          </form >

          <p className="mt-8 text-center text-sm text-[var(--text-secondary)]">
            Already have an account?{" "}
            <a href="/login" className="text-primary hover:underline">
              Sign In
            </a>
          </p>
        </GlassCard >
      </motion.div >
    </div >
  );
}
