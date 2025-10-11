// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB13S2YY7GSMuSlUQnoDmK1Jj6ZfJKea8Q",
  authDomain: "mymusiccity-e4e9c.firebaseapp.com",
  projectId: "mymusiccity-e4e9c",
  storageBucket: "mymusiccity-e4e9c.firebasestorage.app",
  messagingSenderId: "406899664965",
  appId: "1:406899664965:web:7ace0405b2003f1dac9b2c",
  measurementId: "G-MYRR5JX4E0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

export default app;