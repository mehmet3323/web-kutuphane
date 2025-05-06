import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useNavigate } from 'react-router-dom';
import { FaBook, FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import './Login.css';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Kullanıcı zaten giriş yapmış
        navigate('/home');
      } else {
        setIsLoading(false);
      }
    }, (error) => {
      console.error('Kimlik doğrulama hatası:', error);
      setIsLoading(false);
    });

    // Temizleme fonksiyonu
    return () => unsubscribe();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Lütfen tüm alanları doldurunuz.');
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('Giriş başarılı:', user.email);
      // Giriş başarılı, home sayfasına yönlendir
      navigate('/home');
    } catch (error) {
      console.error('Giriş hatası:', error);
      
      switch (error.code) {
        case 'auth/network-request-failed':
          setError('İnternet bağlantınızı kontrol edin.');
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setError('E-posta veya şifre hatalı.');
          break;
        case 'auth/invalid-email':
          setError('Geçersiz e-posta formatı.');
          break;
        case 'auth/too-many-requests':
          setError('Çok fazla başarısız giriş denemesi. Lütfen sonra tekrar deneyin.');
          break;
        default:
          setError('Giriş yapılırken bir hata oluştu.');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <FaBook />
          <h1>Kütüphanem</h1>
          <p>Kişisel Kütüphane Asistanınız</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          {error && <div className="error-message">{error}</div>}

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

          <div className="input-group">
            <FaLock className="input-icon" />
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Şifre" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button 
              type="button" 
              className="show-password-btn"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <button 
            type="button" 
            className="forgot-password-btn"
            onClick={() => navigate('/forgot-password')}
          >
            Şifremi Unuttum?
          </button>

          <button type="submit" className="login-btn">
            Giriş Yap
          </button>

          <div className="register-link">
            Hesabınız yok mu? 
            <button 
              type="button" 
              onClick={() => navigate('/register')}
            >
              Kayıt Ol
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;
