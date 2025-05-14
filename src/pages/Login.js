import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useNavigate } from 'react-router-dom';
import { FaBook, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaSignOutAlt } from 'react-icons/fa';
import './Login.css';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, doc, setDoc, limit } from 'firebase/firestore';
import { firestore } from '../config/firebase';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [lastRequest, setLastRequest] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [borrowDuration, setBorrowDuration] = useState(1);
  const [borrowedBooks, setBorrowedBooks] = useState([]);

  useEffect(() => {
    // Admin oturumu varsa admin panele yönlendir
    if (localStorage.getItem('isAdmin') === 'true') {
      navigate('/admin');
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate('/home');
      } else {
        setIsLoading(false);
      }
    }, (error) => {
      console.error('Kimlik doğrulama hatası:', error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!auth.currentUser) return;
      const q = query(
        collection(firestore, "notifications"),
        where("userId", "==", auth.currentUser.uid),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchNotifications();
  }, []);

  useEffect(() => {
    const fetchLastRequest = async () => {
      if (!auth.currentUser) return;
      const q = query(
        collection(firestore, "bookRequests"),
        where("userId", "==", auth.currentUser.uid),
        orderBy("requestDate", "desc"),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (snapshot.docs.length > 0) {
        const lastRequestData = snapshot.docs[0].data();
        setLastRequest({ id: snapshot.docs[0].id, ...lastRequestData });
      }
    };
    fetchLastRequest();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Lütfen tüm alanları doldurunuz.');
      return;
    }
    // Admin girişi kontrolü
    if (email === 'admin' && password === 'admin') {
      try {
        // Admin için özel bir kullanıcı oluştur
        const adminUser = {
          uid: 'admin',
          email: 'admin@admin.com',
          isAdmin: true
        };
        // Admin bilgilerini localStorage'a kaydet
        localStorage.setItem('isAdmin', 'true');
        localStorage.setItem('adminUser', JSON.stringify(adminUser));
        navigate('/admin');
      } catch (error) {
        setError('Admin girişi sırasında bir hata oluştu.');
      }
      return;
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('Giriş başarılı:', user.email);
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

  const handleBorrow = async (bookId) => {
    if (!auth.currentUser) {
      alert("Kitap ödünç almak için lütfen giriş yapın.");
      return;
    }
    setSelectedBook(books.find(book => book.id === bookId));
    setShowBorrowModal(true);
  };

  const confirmBorrow = async () => {
    if (!selectedBook || !auth.currentUser) return;

    // Son talebi bul
    const requestsQuery = query(
      collection(firestore, "bookBorrows"),
      where("userId", "==", auth.currentUser.uid),
      where("bookId", "==", selectedBook.id),
      orderBy("borrowedDate", "desc")
    );
    const requestsSnapshot = await getDocs(requestsQuery);
    const lastRequest = requestsSnapshot.docs[0]?.data();

    if (!lastRequest || lastRequest.status === "rejected") {
      // Talep yoksa veya reddedildiyse yeni talep oluştur
      const currentDate = new Date();
      const dueDate = new Date(currentDate);
      dueDate.setDate(dueDate.getDate() + (borrowDuration * 7));
      
      const borrowData = {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        bookId: selectedBook.id,
        status: "pending",
        borrowDuration: borrowDuration,
        borrowedDate: currentDate.toISOString(),
        dueDate: dueDate.toISOString(),
        adminApproved: false,
        adminRejected: false
      };

      await addDoc(collection(firestore, "bookBorrows"), borrowData);
      await addDoc(collection(firestore, "notifications"), {
        userId: auth.currentUser.uid,
        message: `Kitap talebiniz oluşturuldu ve admin onayı bekliyor: ${selectedBook.title}`,
        createdAt: new Date(),
        read: false
      });
      setShowBorrowModal(false);
      alert("Kitap talebiniz oluşturuldu ve admin onayı bekliyor!");
      return;
    }

    if (lastRequest.status === "pending") {
      alert("Kitap talebiniz admin onayı bekliyor!");
      setShowBorrowModal(false);
      return;
    }

    if (lastRequest.status === "approved") {
      try {
        if (borrowedBooks.includes(selectedBook.id)) {
          alert("Bu kitabı zaten ödünç aldınız. İade etmeden tekrar alamazsınız.");
          setShowBorrowModal(false);
          return;
        }
        setBorrowedBooks(prev => [...prev, selectedBook.id]);
        setShowBorrowModal(false);
        alert(`"${selectedBook.title}" kitabı ${borrowDuration} haftalığına başarıyla ödünç alındı!`);
      } catch (error) {
        console.error("Kitap ödünç alınırken hata:", error);
        alert("Kitap ödünç alınırken bir hata oluştu.");
      }
      return;
    }

    if (lastRequest.status === "rejected") {
      alert("Kitap talebiniz reddedildi!");
      setShowBorrowModal(false);
      return;
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
              type="text" 
              placeholder="E-posta veya admin"
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
      {lastRequest && lastRequest.status === "pending" && (
        <div className="profile-request-status pending">Kitap talebiniz admin onayı bekliyor</div>
      )}
      {lastRequest && lastRequest.status === "approved" && (
        <div className="profile-request-status approved">Kitap talebiniz onaylandı, ödünç alabilirsiniz</div>
      )}
      {lastRequest && lastRequest.status === "rejected" && (
        <div className="profile-request-status rejected">Kitap talebiniz reddedildi</div>
      )}
    </div>
  );
};

export default LoginScreen;
