import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useNavigate } from 'react-router-dom';
import { FaBook, FaEnvelope, FaArrowLeft } from 'react-icons/fa';
import './Login.css'; // Aynı stili kullanacağız

const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    if (!email) {
      setError('Lütfen e-posta adresinizi giriniz.');
      setIsLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
      setEmail('');
      setIsLoading(false);
    } catch (error) {
      console.error('Şifre sıfırlama hatası:', error);
      
      switch (error.code) {
        case 'auth/network-request-failed':
          setError('İnternet bağlantınızı kontrol edin.');
          break;
        case 'auth/user-not-found':
          setError('Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı.');
          break;
        case 'auth/invalid-email':
          setError('Geçersiz e-posta formatı.');
          break;
        case 'auth/too-many-requests':
          setError('Çok fazla talep gönderildi. Lütfen sonra tekrar deneyin.');
          break;
        default:
          setError('Şifre sıfırlama işlemi sırasında bir hata oluştu.');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <FaBook />
          <h1>Kütüphanem</h1>
          <p>Şifre Sıfırlama</p>
        </div>

        <form onSubmit={handleResetPassword} className="login-form">
          {error && <div className="error-message">{error}</div>}
          {success && (
            <div className="success-message">
              Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen e-postanızı kontrol edin.
            </div>
          )}

          <div className="input-group">
            <FaEnvelope className="input-icon" />
            <input 
              type="email" 
              placeholder="E-posta" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="login-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Gönderiliyor...' : 'Şifre Sıfırlama Bağlantısı Gönder'}
          </button>

          <button 
            type="button" 
            className="back-to-login-btn"
            onClick={() => navigate('/login')}
            disabled={isLoading}
          >
            <FaArrowLeft /> Giriş Sayfasına Dön
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordScreen; 