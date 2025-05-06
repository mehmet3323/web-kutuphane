import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaBook, FaHeart, FaUser } from 'react-icons/fa';
import './Navbar.css';

function Navbar() {
  const location = useLocation();

  // Aktif sayfayı kontrol et
  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <div className="top-navbar">
      <div className="navbar-logo">
        <FaBook />
        <span>Kütüphanem</span>
      </div>
      
      <div className="navbar-links">
        <Link to="/home" className={`navbar-link ${isActive('/home')}`}>
          <FaBook />
          <span>Ana Sayfa</span>
        </Link>
        
        <Link to="/favorites" className={`navbar-link ${isActive('/favorites')}`}>
          <FaHeart />
          <span>Favorilerim</span>
        </Link>
        
        <Link to="/profile" className={`navbar-link ${isActive('/profile')}`}>
          <FaUser />
          <span>Profilim</span>
        </Link>
      </div>
    </div>
  );
}

export default Navbar;
