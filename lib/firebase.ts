import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, OAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAoIqAmnq-XQX6SNLqnb_pPXUo-kmg5DHg",
  authDomain: "popmatch-6d273.firebaseapp.com",
  projectId: "popmatch-6d273",
  storageBucket: "popmatch-6d273.firebasestorage.app",
  messagingSenderId: "331036448795",
  appId: "1:331036448795:web:26ff0c2c2ab173cf2f40be",
  measurementId: "G-E60LE54P5N"
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

export const microsoftProvider = new OAuthProvider("microsoft.com");
microsoftProvider.setCustomParameters({
  prompt: "select_account",
});

if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      getAnalytics(firebaseApp);
    }
  });
}