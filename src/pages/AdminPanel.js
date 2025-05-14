import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { firestore, auth } from '../config/firebase';
// Statik import yerine dinamik import kullanacağız
import { FaSignOutAlt, FaCheck, FaTimes, FaBook } from 'react-icons/fa';
import './AdminPanel.css';

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
  const [bookRequests, setBookRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [libraryBooks, setLibraryBooks] = useState([]); // Kitaplar için state ekliyoruz
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setLoading(false);
        navigate('/login', { replace: true });
      } else {
        loadLibraryBooks(); // Önce kitapları yükle
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Kitapları yüklemek için yeni fonksiyon
  const loadLibraryBooks = async () => {
    try {
      console.log("Kitapları yükleme işlemi başladı");
      
      // Doğrudan Home.js'den statik kitap listesini alalım (Profile.js'deki gibi)
      // Dynamic import kullanarak Home.js'den libraryBooks'u import ediyoruz
      const HomeModule = await import("./Home");
      
      if (HomeModule.libraryBooks && HomeModule.libraryBooks.length > 0) {
        setLibraryBooks(HomeModule.libraryBooks);
        console.log("Home.js'den kitaplar yüklendi. Toplam kitap sayısı:", HomeModule.libraryBooks.length);
        
        // Kitaplar yüklendikten sonra istekleri çekelim
        await fetchAllRequests();
      } else {
        console.log("Home.js'den kitaplar yüklenemedi, Firebase'e bakılıyor");
        // Eğer statik liste boşsa Firebase'den deneyelim
        const booksCollection = collection(firestore, 'books');
        const booksSnapshot = await getDocs(booksCollection);
        
        if (!booksSnapshot.empty) {
          const booksList = booksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setLibraryBooks(booksList);
          console.log("Firebase'den kitaplar yüklendi, toplam:", booksList.length);
          
          // Kitaplar yüklendikten sonra istekleri çekelim
          await fetchAllRequests();
        } else {
          console.error("Hiçbir kaynaktan kitap yüklenemedi");
          setLoading(false);
        }
      }
    } catch (error) {
      console.error("Kitapları yükleme hatası:", error);
      // Hata durumunda boş bir dizi ile devam edelim
      setLibraryBooks([]);
      // Hata olsa bile istekleri çekmeyi deneyelim
      try {
        await fetchAllRequests();
      } catch (requestError) {
        console.error("İstekler yüklenirken hata:", requestError);
        setLoading(false);
      }
    }
  };

  const fetchAllRequests = async () => {
    setLoading(true);
    try {
      console.log("Talepleri çekme işlemi başladı");
      
      // Tüm ödünç alma taleplerini çek
      const borrowCollection = collection(firestore, 'bookBorrows');
      const borrowSnapshot = await getDocs(borrowCollection);
      console.log("bookBorrows koleksiyonu çekildi, belge sayısı:", borrowSnapshot.size);
      
      // Ödünç alma taleplerini işle
      const borrows = [];
      borrowSnapshot.forEach(doc => {
        borrows.push({ id: doc.id, ...doc.data() });
      });
      
      console.log("Çekilen ödünç alma talepleri:", borrows.length);
      setBorrowRequests(borrows);
  
      // Tüm yeni kitap taleplerini çek
      const bookReqCollection = collection(firestore, 'bookRequests');
      const bookReqSnapshot = await getDocs(bookReqCollection);
      console.log("bookRequests koleksiyonu çekildi, belge sayısı:", bookReqSnapshot.size);
      
      // Kitap taleplerini işle
      const books = [];
      bookReqSnapshot.forEach(doc => {
        books.push({ id: doc.id, ...doc.data() });
      });
      
      console.log("Çekilen kitap talepleri:", books.length);
      setBookRequests(books);
      
      // Kitaplar ve talepler yüklendi, loading durumunu kapat
      console.log("Tüm talepler başarıyla yüklendi");
    } catch (error) {
      console.error('İstekler yüklenirken hata:', error);
      // Hata durumunda boş diziler ata
      setBorrowRequests([]);
      setBookRequests([]);
      alert('Talepler yüklenirken bir hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getBookDetails = (bookId) => {
    console.log("Aranan kitap ID:", bookId);
    
    // libraryBooks dizisi boş ise hata vermemek için kontrol edelim
    if (!libraryBooks || libraryBooks.length === 0) {
      console.log("Kitap listesi henüz yüklenmedi");
      return { title: `Kitap (ID: ${bookId})` };
    }
    
    // Firebase'den gelen ID'ler genellikle "book-6" formatında değil, doğrudan "6" olabilir
    // Önce doğrudan eşleşme ara
    let book = libraryBooks.find(book => book.id === bookId);
    
    // Eşleşme yoksa, "book-" önekini ekleyerek dene
    if (!book && !bookId.startsWith("book-")) {
      book = libraryBooks.find(book => book.id === `book-${bookId}`);
    }
    
    // Hala bulunamadıysa, ID'nin son kısmını kontrol et
    if (!book) {
      // "book-6" formatından "6" kısmını çıkar
      const idParts = bookId.split("-");
      const idNumber = idParts[idParts.length - 1];
      
      // "book-6" formatında ara
      book = libraryBooks.find(book => {
        const bookIdParts = book.id.split("-");
        return bookIdParts[bookIdParts.length - 1] === idNumber;
      });
    }
    
    if (!book) {
      console.log(`ID'si ${bookId} olan kitap bulunamadı`);
      return { title: `Kitap (ID: ${bookId})` };
    }
    
    return book;
  };

  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('adminUser');
    navigate('/login', { replace: true });
  };

  const handleBorrowAction = async (request, approved) => {
    try {
      const requestRef = doc(firestore, 'bookBorrows', request.id);
      await updateDoc(requestRef, {
        status: approved ? 'approved' : 'rejected',
        adminApproved: approved,
        adminRejected: !approved,
        updatedAt: new Date(),
      });
      await addDoc(collection(firestore, 'notifications'), {
        userId: request.userId,
        message: `Kitap ödünç alma talebiniz ${approved ? 'onaylandı' : 'reddedildi'}: ${getBookDetails(request.bookId).title}`,
        createdAt: new Date(),
        read: false,
      });
      fetchAllRequests();
      alert(`Ödünç alma talebi ${approved ? 'onaylandı' : 'reddedildi'}.`);
    } catch (error) {
      alert('İşlem sırasında bir hata oluştu.');
    }
  };

  const handleBookRequestAction = async (request, approved) => {
    try {
      const requestRef = doc(firestore, 'bookRequests', request.id);
      await updateDoc(requestRef, {
        status: approved ? 'approved' : 'rejected',
        updatedAt: new Date(),
      });
      await addDoc(collection(firestore, 'notifications'), {
        userId: request.userId,
        message: `Yeni kitap talebiniz ${approved ? 'onaylandı' : 'reddedildi'}: ${request.title}`,
        createdAt: new Date(),
        read: false,
      });
      fetchAllRequests();
      alert(`Yeni kitap talebi ${approved ? 'onaylandı' : 'reddedildi'}.`);
    } catch (error) {
      alert('İşlem sırasında bir hata oluştu.');
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>İstekler yükleniyor...</p>
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
      <div className="admin-sections">
        <section className="pending-requests-section">
          <h2>Kitap Ödünç Alma Talepleri</h2>
          {borrowRequests.length === 0 ? (
            <div className="no-requests">
              <p>Hiç ödünç alma talebi yok.</p>
            </div>
          ) : (
            <div className="requests-container">
              {borrowRequests.map((request) => {
                const book = getBookDetails(request.bookId);
                return (
                  <div key={request.id} className="request-card">
                    <div className="request-info">
                      <h3>{book.title}</h3>
                      <p><strong>Kullanıcı:</strong> {request.userEmail}</p>
                      <p><strong>Talep Tarihi:</strong> {request.borrowedDate ? new Date(request.borrowedDate).toLocaleString('tr-TR') : '-'}</p>
                      <p><strong>İstenen Süre:</strong> {request.borrowDuration} Hafta</p>
                      <p><strong>Son Teslim Tarihi:</strong> {request.dueDate ? new Date(request.dueDate).toLocaleString('tr-TR') : '-'}</p>
                      <p><strong>Durum:</strong> <span style={{ color: statusColors[request.status] || '#888' }}>{statusLabels[request.status] || 'Belirtilmemiş'}</span></p>
                    </div>
                    <div className="request-actions">
                      {request.status !== 'approved' && request.status !== 'rejected' && (
                        <>
                          <button className="approve-button" onClick={() => handleBorrowAction(request, true)}><FaCheck /> Onayla</button>
                          <button className="reject-button" onClick={() => handleBorrowAction(request, false)}><FaTimes /> Reddet</button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        <section className="book-requests-section">
          <h2>Yeni Kitap Talepleri</h2>
          {bookRequests.length === 0 ? (
            <div className="no-requests">
              <p>Hiç yeni kitap talebi yok.</p>
            </div>
          ) : (
            <div className="requests-container">
              {bookRequests.map((request) => (
                <div key={request.id} className="request-card">
                  <div className="request-info">
                    <h3>{request.title}</h3>
                    <p><strong>Kullanıcı:</strong> {request.userEmail}</p>
                    <p><strong>Yazar:</strong> {request.author}</p>
                    <p><strong>Yayın Yılı:</strong> {request.year}</p>
                    <p><strong>Talep Tarihi:</strong> {request.requestDate ? new Date(request.requestDate).toLocaleString('tr-TR') : '-'}</p>
                    <p><strong>Durum:</strong> <span style={{ color: statusColors[request.status] || '#888' }}>{statusLabels[request.status] || 'Belirtilmemiş'}</span></p>
                    {request.description && (
                      <p><strong>Açıklama:</strong> {request.description}</p>
                    )}
                  </div>
                  <div className="request-actions">
                    {request.status !== 'approved' && request.status !== 'rejected' && (
                      <>
                        <button className="approve-button" onClick={() => handleBookRequestAction(request, true)}><FaCheck /> Onayla</button>
                        <button className="reject-button" onClick={() => handleBookRequestAction(request, false)}><FaTimes /> Reddet</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminPanel;