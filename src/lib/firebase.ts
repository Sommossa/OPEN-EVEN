import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBtjPAdxONqRkiThARJXeEDk8OY0phbVjs",
  authDomain: "OPEN EVEN26-6e70e.firebaseapp.com",
  projectId: "OPEN EVEN26-6e70e",
  storageBucket: "OPEN EVEN26-6e70e.firebasestorage.app",
  messagingSenderId: "87709713765",
  appId: "1:87709713765:web:78251d6b6fc4e57c6ccd8c",
  measurementId: "G-B44PJE4EG5",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Analytics only works in the browser
let analytics: ReturnType<typeof getAnalytics> | undefined;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

export { app, auth, db, storage, analytics };
