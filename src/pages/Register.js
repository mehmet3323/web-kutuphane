import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, firestore } from '../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import './Register.css';

const RegisterScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  const navigate = useNavigate();

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword || !fullName) {
      alert('Uyarı: Lütfen tüm alanları doldurunuz.');
      return;
    }

    if (password !== confirmPassword) {
      alert('Uyarı: Şifreler eşleşmiyor.');
      return;
    }

    try {
      console.log('Kayıt başlatılıyor:', email);

      // Auth işlemi
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user) {
        throw new Error('Kullanıcı oluşturulamadı');
      }

      console.log('Auth başarılı, user:', user.uid);

      // Firestore işlemi
      const userRef = doc(firestore, 'users', user.uid);
      await setDoc(userRef, {
        fullName,
        email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('Firestore kaydı başarılı');

      alert('Başarılı: Kayıt işlemi tamamlandı.');
      navigate('/login');
    } catch (error) {
      console.error('Hata detayı:', error);

      // Hata koduna göre özel mesajlar
      if (error.code === 'auth/network-request-failed') {
        alert('Bağlantı Hatası: İnternet bağlantınızı kontrol edin ve tekrar deneyin. WiFi veya mobil veri bağlantınızın açık olduğundan emin olun.');
      } else if (error.code === 'auth/email-already-in-use') {
        alert('Kayıt Hatası: Bu e-posta adresi zaten kullanımda. Lütfen başka bir e-posta adresi deneyin veya giriş yapın.');
      } else if (error.code === 'auth/invalid-email') {
        alert('Kayıt Hatası: Geçersiz e-posta formatı. Lütfen geçerli bir e-posta adresi girin.');
      } else if (error.code === 'auth/weak-password') {
        alert('Kayıt Hatası: Şifre çok zayıf. Lütfen en az 6 karakterden oluşan daha güçlü bir şifre belirleyin.');
      } else {
        alert(`Hata: Kayıt işlemi sırasında bir hata oluştu: ${error.message || error}`);
      }
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-logo">
          <img
            src="https://cdn-icons-png.flaticon.com/512/2702/2702154.png"
            alt="Logo"
            className="logo"
          />
          <h1 className="title">Yeni Hesap Oluştur</h1>
          <p className="subtitle">Kütüphane Dünyasına Hoş Geldiniz</p>
        </div>

        <div className="register-form">
          <div className="input-group">
            <input
              className="input"
              type="text"
              placeholder="Ad Soyad"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
          </div>
          <div className="input-group">
            <input
              className="input"
              type="email"
              placeholder="E-posta"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="input-group">
            <input
              className="input"
              type="password"
              placeholder="Şifre"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <div className="input-group">
            <input
              className="input"
              type="password"
              placeholder="Şifre Tekrar"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>

          <button className="register-btn" onClick={handleRegister}>
            Kayıt Ol
          </button>

          <div className="login-link">
            <p className="loginText">Zaten hesabınız var mı? </p>
            <button onClick={() => navigate('/login')}>
              Giriş Yap
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterScreen;
