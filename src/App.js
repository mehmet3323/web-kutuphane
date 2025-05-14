import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginScreen from './pages/Login';
import RegisterScreen from './pages/Register';
import HomeScreen, { libraryBooks } from './pages/Home';
import FavoritesScreen from './pages/Favorites';
import ProfileScreen from './pages/Profile';
import ForgotPasswordScreen from './pages/ForgotPassword';
import SocialScreen from './pages/Social';
import AdminPanel from './pages/AdminPanel';
import Layout from './components/Layout';
import './App.css';
import { addDoc, collection, query, where, getDocs } from "firebase/firestore";
import { firestore, auth } from "./config/firebase";

function App() {
  const handleBorrowRequest = async (book) => {
    const currentDate = new Date();
    const dueDate = new Date(currentDate);
    dueDate.setDate(dueDate.getDate() + (borrowDuration * 7));
    await addDoc(collection(firestore, "bookBorrows"), {
      userId: auth.currentUser.uid,
      userEmail: auth.currentUser.email,
      bookId: book.id,
      status: "pending",
      borrowedDate: currentDate.toISOString(),
      dueDate: dueDate.toISOString(),
      borrowDuration,
      adminApproved: false,
      adminRejected: false
    });
    alert("Kitap ödünç alma talebiniz admin onayına gönderildi!");
  };

  const fetchPendingRequests = async () => {
    setLoading(true);
    try {
      const requestsQuery = query(
        collection(firestore, "bookBorrows"),
        where("status", "==", "pending")
      );
      const requestsSnapshot = await getDocs(requestsQuery);
      const requests = requestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPendingRequests(requests);
    } catch (err) {
      setPendingRequests([]);
    }
    setLoading(false);
  };

  const fetchAllBookBorrows = async () => {
    const snapshot = await getDocs(collection(firestore, "bookBorrows"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
        <Route path="/admin" element={<AdminPanel />} />

        <Route element={<Layout />}>
          <Route path="/home" element={<HomeScreen />} />
          <Route path="/favorites" element={<FavoritesScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="/social" element={<SocialScreen />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
