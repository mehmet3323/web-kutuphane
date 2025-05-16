import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc, query, orderBy, setDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { firestore, auth } from '../config/firebase';
// Statik import yerine dinamik import kullanacağız
import { FaSignOutAlt, FaCheck, FaTimes, FaBook, FaUser, FaCalendarAlt, FaClock, FaEnvelope } from 'react-icons/fa';
import './AdminPanel.css';
import { libraryBooks } from '../data/libraryBooks';

const statusColors = {
  pending: '#FFA500',
  approved: '#4CAF50',
  rejected: '#f44336',
};

const statusLabels = {
  pending: 'Bekliyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
};

const AdminPanel = () => {
  const [borrowRequests, setBorrowRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [bookRequests, setBookRequests] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Eğer localStorage'da isAdmin varsa, doğrudan verileri çek
    if (localStorage.getItem('isAdmin') === 'true') {
      fetchAllRequests();
      fetchUsers();
      fetchBookRequests();
    } else {
      // Normal kullanıcı ise Auth ile kontrol et
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (!user) {
          setLoading(false);
          navigate('/login', { replace: true });
        } else {
          fetchAllRequests();
          fetchUsers();
          fetchBookRequests();
        }
      });
      return () => unsubscribe();
    }
  }, [navigate]);

  const fetchAllRequests = async () => {
    setLoading(true);
    try {
      const borrowsSnapshot = await getDocs(collection(firestore, 'bookBorrows'));
      console.log('Firestore bookBorrows döküman sayısı:', borrowsSnapshot.docs.length);
      if (borrowsSnapshot.docs.length === 0) {
        alert('Veritabanında hiç ödünç alma talebi bulunamadı!');
        console.warn('Firestore bookBorrows koleksiyonu boş.');
      }
      const borrows = [];
      for (const docSnap of borrowsSnapshot.docs) {
        const data = docSnap.data();
        if (!data.bookId) {
          console.error('Eksik bookId:', data, docSnap.id);
        }
        const book = libraryBooks.find(b => b.id === data.bookId);
        if (!book) {
          console.warn('Kitap bulunamadı, bookId:', data.bookId, 'Firestore verisi:', data);
        }
        borrows.push({
          id: docSnap.id,
          ...data,
          bookTitle: book ? book.title : (data.bookTitle || 'Bilinmeyen Kitap'),
          author: book ? book.author : '',
          category: book ? book.category : '',
          year: book ? book.year : '',
          pages: book ? book.pages : '',
          description: book ? book.description : '',
          imageUrl: book ? book.imageUrl : '',
          borrowedDate: data.borrowedDate ? new Date(data.borrowedDate).toLocaleString('tr-TR') : '-',
          dueDate: data.dueDate ? new Date(data.dueDate).toLocaleString('tr-TR') : '-'
        });
      }
      borrows.sort((a, b) => new Date(b.borrowedDate) - new Date(a.borrowedDate));
      setBorrowRequests(borrows);
      if (borrows.length === 0) {
        alert('Veritabanından veri çekildi fakat hiç ödünç alma talebi bulunamadı!');
        console.warn('fetchAllRequests: borrows dizisi boş.');
      } else {
        console.log('Admin paneline gönderilecek borrows:', borrows);
      }
    } catch (error) {
      console.error('Veriler yüklenirken hata:', error);
      alert('Veriler yüklenirken bir hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Kullanıcıları çek
  const fetchUsers = async () => {
    try {
      const usersQuery = query(collection(firestore, "users"));
      const snapshot = await getDocs(usersQuery);
      const usersList = snapshot.docs.map(doc => {
        const userData = doc.data();
        return {
          uid: doc.id,
          email: userData.email,
          role: userData.role || 'user',
          fullName: userData.fullName || userData.email.split('@')[0]
        };
      });
      setUsers(usersList);
    } catch (error) {
      console.error("Kullanıcılar yüklenirken hata:", error);
    }
  };

  // Kitap isteklerini çek
  const fetchBookRequests = async () => {
    try {
      const snapshot = await getDocs(collection(firestore, "bookRequests"));
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookRequests(requests.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate)));
    } catch (error) {
      console.error("Kitap istekleri yüklenirken hata:", error);
    }
  };

  // Mesaj gönderme fonksiyonu
  const handleSendMessage = async () => {
    if (!selectedUser || !messageText.trim()) return;
    try {
      const notificationData = {
        userId: selectedUser.uid,
        userEmail: selectedUser.email,
        message: messageText.trim(),
        createdAt: new Date().toISOString(),
        read: false,
        type: "admin_message",
        sender: "Admin",
        title: "Yeni Mesaj",
        adminId: auth.currentUser ? auth.currentUser.uid : 'admin',
      };
      await addDoc(collection(firestore, "admin_notifications"), notificationData);
      setMessageText("");
      setShowMessageModal(false);
      setSelectedUser(null);
      alert("Mesaj başarıyla gönderildi!");
    } catch (error) {
      console.error("Mesaj gönderilirken hata:", error);
      alert("Mesaj gönderilirken bir hata oluştu.");
    }
  };

  const handleBorrowAction = async (request, approved) => {
    try {
      const requestRef = doc(firestore, 'bookBorrows', request.id);
      await updateDoc(requestRef, {
        status: approved ? 'approved' : 'rejected',
        adminApproved: approved,
        adminRejected: !approved,
        updatedAt: new Date()
      });

      // Kullanıcıya bildirim gönder
      await addDoc(collection(firestore, 'notifications'), {
        userId: request.userId,
        message: `Kitap ödünç alma talebiniz ${approved ? 'onaylandı' : 'reddedildi'}: ${request.bookTitle}`,
        createdAt: new Date(),
        read: false
      });

      await fetchAllRequests();
      alert(`Ödünç alma talebi ${approved ? 'onaylandı' : 'reddedildi'}.`);
    } catch (error) {
      console.error('İşlem sırasında hata:', error);
      alert('İşlem sırasında bir hata oluştu.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('adminUser');
    navigate('/login', { replace: true });
  };

  const handleReturn = async (bookId) => {
    if (!auth.currentUser) {
      alert("İade işlemi için giriş yapmalısınız.");
      return;
    }
    // Sadece gerçekten ödünç alınan ve onaylanan kitaplar iade edilebilsin
    const borrowedBook = borrowedBooks.find(b => b.bookId === bookId && b.status === 'approved');
    if (!borrowedBook) {
      alert("Bu kitabı iade edemezsiniz çünkü ödünç almamışsınız.");
      return;
    }
    try {
      const borrowRef = doc(firestore, 'bookBorrows', `${bookId}_${auth.currentUser.uid}`);
      await setDoc(borrowRef, {
        ...borrowedBook,
        borrowed: false,
        updatedAt: serverTimestamp()
      });
      setBorrowedBooks(prev => prev.filter(b => b.bookId !== bookId));
      alert("Kitap başarıyla iade edildi.");
    } catch (error) {
      console.error("Kitap iade edilirken hata:", error);
      alert("Kitap iade edilirken bir hata oluştu.");
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Veriler yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div className="logo">
          <FaBook />
          <h1>Admin Paneli</h1>
        </div>
        <button className="logout-button" onClick={handleLogout}>
          <FaSignOutAlt /> Çıkış
        </button>
      </div>

      {/* Kullanıcılar bölümü */}
      <div className="admin-section">
        <h2>Kullanıcılar</h2>
        <div className="users-list">
          {users.map(user => (
            <div key={user.uid} className="user-card">
              <div className="user-info">
                <span className="user-email">{user.email}</span>
                <span className="user-role">{user.role || 'Kullanıcı'}</span>
              </div>
              <div className="user-actions">
                <button 
                  className="message-button"
                  onClick={() => {
                    setSelectedUser(user);
                    setShowMessageModal(true);
                  }}
                >
                  <FaEnvelope /> Mesaj Gönder
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mesaj Gönderme Modalı */}
      {showMessageModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Kullanıcıya Mesaj Gönder</h2>
            <p>Alıcı: {selectedUser.email}</p>
            <div className="message-form">
              <textarea
                placeholder="Mesajınızı yazın..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows="4"
              ></textarea>
              <div className="modal-buttons">
                <button onClick={() => {
                  setShowMessageModal(false);
                  setMessageText("");
                  setSelectedUser(null);
                }}>
                  İptal
                </button>
                <button onClick={handleSendMessage}>
                  Gönder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kitap Ödünç Alma Talepleri bölümü */}
      <div className="admin-content">
        <section className="admin-section">
          <h2>Kitap Ödünç Alma Talepleri</h2>
          {borrowRequests.length === 0 ? (
            <div className="no-requests">
              <p>Henüz ödünç alma talebi bulunmuyor.</p>
              <p style={{color: 'red', fontWeight: 'bold'}}>Eğer burada veri olması gerekiyorsa, Firestore bağlantınızı ve admin girişi yaptığınızdan emin olun. Konsolda hata veya uyarı mesajlarını kontrol edin.</p>
            </div>
          ) : (
            <div className="requests-grid">
              {borrowRequests.map((request) => (
                <div key={request.id} className="request-card">
                  <div className="request-header">
                    <h3>{request.bookTitle}</h3>
                    <span className={`status-badge ${request.status}`}>
                      {statusLabels[request.status]}
                    </span>
                  </div>
                  <div className="request-details">
                    <div className="detail-item">
                      <FaUser />
                      <span>{request.userEmail}</span>
                    </div>
                    <div className="detail-item">
                      <FaBook />
                      <span>Yazar: {request.author}</span>
                    </div>
                    <div className="detail-item">
                      <span>Kategori: {request.category}</span>
                    </div>
                    <div className="detail-item">
                      <span>Yayın Yılı: {request.year}</span>
                    </div>
                    <div className="detail-item">
                      <span>Sayfa: {request.pages}</span>
                    </div>
                    <div className="detail-item">
                      <FaCalendarAlt />
                      <span>Talep: {request.borrowedDate}</span>
                    </div>
                    <div className="detail-item">
                      <FaClock />
                      <span>Süre: {request.borrowDuration} Hafta</span>
                    </div>
                    <div className="detail-item">
                      <FaCalendarAlt />
                      <span>İade: {request.dueDate}</span>
                    </div>
                  </div>
                  {request.status === 'pending' && (
                    <div className="request-actions">
                      <button 
                        className="approve-button"
                        onClick={() => handleBorrowAction(request, true)}
                      >
                        <FaCheck /> Onayla
                      </button>
                      <button 
                        className="reject-button"
                        onClick={() => handleBorrowAction(request, false)}
                      >
                        <FaTimes /> Reddet
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Kitap İstekleri Bölümü */}
      <div className="admin-section">
        <h2>Kitap İstekleri</h2>
        {bookRequests.length === 0 ? (
          <div className="no-requests">Henüz kitap talebi yok.</div>
        ) : (
          <div className="book-requests-list">
            {bookRequests.map(req => (
              <div key={req.id} className="book-request-card">
                <div><b>Kitap:</b> {req.title}</div>
                <div><b>Yazar:</b> {req.author}</div>
                {req.description && <div><b>Açıklama:</b> {req.description}</div>}
                <div><b>Kullanıcı:</b> {req.userEmail}</div>
                <div><b>Durum:</b> {req.status === 'pending' ? 'Bekliyor' : req.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}</div>
                <div><b>Tarih:</b> {req.requestDate ? new Date(req.requestDate).toLocaleString('tr-TR') : ''}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;