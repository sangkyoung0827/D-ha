import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";

const DIHA_FIREBASE_OPTIONS: FirebaseOptions = {
  apiKey: "AIzaSyC-DUKllObF3QMPLS2RR-kvlwfGu1XpqyU",
  authDomain: "d-ha.vercel.app",
  projectId: "d-ha-game",
  storageBucket: "d-ha-game.firebasestorage.app",
  messagingSenderId: "541499327982",
  appId: "1:541499327982:web:f62088fa3021511c2a3aff"
};

function firebaseOptions(): FirebaseOptions | null {
  const options = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };

  return Object.values(options).every((value) => typeof value === "string" && value.length > 0) ? options : DIHA_FIREBASE_OPTIONS;
}

export function isFirebaseConfigured(): boolean {
  return firebaseOptions() !== null;
}

export function isE2eAccountMode(): boolean {
  return import.meta.env.VITE_DIHA_E2E_AUTH === "true";
}

export function getFirebaseClient(): FirebaseApp {
  const options = firebaseOptions();
  if (!options) throw new Error("Firebase 환경 설정이 없습니다.");
  return getApps().length > 0 ? getApp() : initializeApp(options);
}
