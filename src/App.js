import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginScreen from './pages/Login';
import RegisterScreen from './pages/Register';
import HomeScreen from './pages/Home';
import FavoritesScreen from './pages/Favorites';
import ProfileScreen from './pages/Profile';
import ForgotPasswordScreen from './pages/ForgotPassword';
import SocialScreen from './pages/Social';
import AdminPanel from './pages/AdminPanel';
import Layout from './components/Layout';
import './App.css';

function App() {
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
