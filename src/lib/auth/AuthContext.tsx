import React, { createContext, useContext, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged, signOut as firebaseSignOut, signInAnonymously } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: "attendee" | "volunteer" | "manager" | "admin";
  photoURL?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser && db) {
        try {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            if (currentUser.email === "admin@OPEN EVEN.org" && data.role !== "admin") {
              data.role = "admin";
              // Auto-fix in DB so permissions apply properly everywhere
              try {
                const { setDoc } = await import("firebase/firestore");
                await setDoc(docRef, { role: "admin" }, { merge: true });
              } catch (e) {
                console.error("Failed to force admin role to db", e);
              }
            }
            setProfile(data);
          } else {
            // Handle Google Sign-in users who don't have a Firestore document yet
            const isDefaultAdmin = currentUser.email === "admin@OPEN EVEN.org";
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || "",
              displayName: currentUser.displayName || "",
              role: isDefaultAdmin ? "admin" : "attendee",
              photoURL: currentUser.photoURL || undefined
            };

            try {
              const { setDoc } = await import("firebase/firestore");
              await setDoc(docRef, newProfile);
            } catch (e) {
              console.error("Failed to create new user doc", e);
            }
            setProfile(newProfile);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        // If no user is signed in, check if we are on the login page.
        // If not, sign them in anonymously
        if (typeof window !== "undefined" && !window.location.pathname.startsWith('/login')) {
          try {
            await signInAnonymously(auth);
          } catch (error) {
            console.error("Error signing in anonymously:", error);
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    if (auth) {
      await firebaseSignOut(auth);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
