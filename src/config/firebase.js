import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCiRNv1nsZJY1biOgvgQlHmpiuL9T0dyno",
  authDomain: "qaave-b7f03.firebaseapp.com",
  projectId: "qaave-b7f03",
  storageBucket: "qaave-b7f03.firebasestorage.app",
  messagingSenderId: "1059458069131",
  appId: "1:1059458069131:web:48888b15274ab5deda5a8e"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);