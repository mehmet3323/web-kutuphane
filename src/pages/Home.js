import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
  orderBy,
  updateDoc
} from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth, firestore } from "../config/firebase";
import { FaBook, FaSignOutAlt, FaPlus, FaHeart, FaRegHeart, FaComment, FaBookOpen, FaHandHolding, FaBell } from "react-icons/fa";
import "./Home.css";
import { libraryBooks } from '../data/libraryBooks';

const Home = () => {
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [likedBooks, setLikedBooks] = useState([]);
  const [borrowedBooks, setBorrowedBooks] = useState([]);
  const [readBooks, setReadBooks] = useState([]);
  const [comment, setComment] = useState("");
  const [bookComments, setBookComments] = useState({});
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [borrowDuration, setBorrowDuration] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("Tümü");
  const [myBorrows, setMyBorrows] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [newBookRequests, setNewBookRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestTitle, setRequestTitle] = useState("");
  const [requestAuthor, setRequestAuthor] = useState("");
  const [requestDescription, setRequestDescription] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchLikesAndSetBooks = async () => {
      setIsLoading(true);
      try {
        const booksWithLikes = [...libraryBooks];
        await loadUserLikedBooks();
        await loadUserBorrowedBooks();
        await loadUserReadBooks();

        for (const book of booksWithLikes) {
          try {
            const likesQuery = query(
              collection(firestore, 'bookLikes'),
              where('bookId', '==', book.id),
              where('liked', '==', true)
            );
            const likesSnapshot = await getDocs(likesQuery);
            const totalLikes = likesSnapshot.size;
            book.likes = totalLikes;
          } catch (err) {
            console.error(`Kitap ${book.id} beğeni sayısı yüklenirken hata:`, err);
          }
        }

        setBooks(booksWithLikes);
        setIsLoading(false);
      } catch (error) {
        console.error("Beğeni sayıları yüklenirken hata:", error);
        setBooks(libraryBooks);
        setIsLoading(false);
      }
    };

    fetchLikesAndSetBooks();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsLoading(false);
        navigate("/login", { replace: true });
      } else {
        await loadUserLikedBooks();
        await loadUserBorrowedBooks();
        await loadUserReadBooks();
      }
    });
    
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const fetchMyBorrows = async () => {
      if (!auth.currentUser) return;
      
      try {
        const q = query(
          collection(firestore, "bookBorrows"),
          where("userId", "==", auth.currentUser.uid)
        );
        const snapshot = await getDocs(q);
        setMyBorrows(snapshot.docs.map(doc => doc.data()));
      } catch (error) {
        console.error("Ödünç alınan kitaplar yüklenirken hata:", error);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchMyBorrows();
        fetchNotifications();
      } else {
        setMyBorrows([]);
        setNotifications([]);
        setUnreadCount(0);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadUserLikedBooks = async () => {
    if (!auth.currentUser) {
      setLikedBooks([]);
      return [];
    }

    try {
      const likesQuery = query(
        collection(firestore, "bookLikes"),
        where("userId", "==", auth.currentUser.uid),
        where("liked", "==", true)
      );
      const likesSnapshot = await getDocs(likesQuery);
      const userLikedBooks = likesSnapshot.docs.map((doc) => doc.data().bookId);
      setLikedBooks(userLikedBooks);
      return userLikedBooks;
    } catch (error) {
      console.error("Beğenilen kitaplar yüklenirken hata:", error);
      return [];
    }
  };
  
  const loadUserBorrowedBooks = async () => {
    if (!auth.currentUser) {
      setBorrowedBooks([]);
      return [];
    }
    try {
      const borrowedQuery = query(
        collection(firestore, "bookBorrows"),
        where("userId", "==", auth.currentUser.uid)
      );
      const borrowedSnapshot = await getDocs(borrowedQuery);
      const userBorrowedBooks = borrowedSnapshot.docs.map(doc => ({
        bookId: doc.data().bookId,
        status: doc.data().status,
        adminApproved: doc.data().adminApproved,
        adminRejected: doc.data().adminRejected
      }));
      setBorrowedBooks(userBorrowedBooks);
      return userBorrowedBooks;
    } catch (error) {
      console.error("Ödünç alınan kitaplar yüklenirken hata:", error);
      return [];
    }
  };
  
  const loadUserReadBooks = async () => {
    if (!auth.currentUser) {
      setReadBooks([]);
      return [];
    }

    try {
      const readQuery = query(
        collection(firestore, "bookReads"),
        where("userId", "==", auth.currentUser.uid),
        where("read", "==", true)
      );
      const readSnapshot = await getDocs(readQuery);
      const userReadBooks = readSnapshot.docs.map((doc) => doc.data().bookId);
      setReadBooks(userReadBooks);
      return userReadBooks;
    } catch (error) {
      console.error("Okunan kitaplar yüklenirken hata:", error);
      return [];
    }
  };

  const handleLogout = async () => {
    try {
      console.log('Çıkış fonksiyonu tetiklendi');
      await signOut(auth);
      console.log('Firebase signOut başarılı');
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Çıkış hatası:', error);
      alert('Çıkış yapılırken bir hata oluştu.');
    }
  };

  const handleLike = async (bookId) => {
    try {
      if (!auth.currentUser) {
        alert("Beğeni yapabilmek için giriş yapmalısınız.");
        return;
      }
      
      const isCurrentlyLiked = likedBooks.includes(bookId);
      const likeRef = doc(firestore, 'bookLikes', `${bookId}_${auth.currentUser.uid}`);
      
      await setDoc(likeRef, {
        userId: auth.currentUser.uid,
        bookId: bookId,
        liked: !isCurrentlyLiked,
        updatedAt: serverTimestamp()
      });
      
      if (isCurrentlyLiked) {
        setLikedBooks(prev => prev.filter(id => id !== bookId));
      } else {
        setLikedBooks(prev => [...prev, bookId]);
      }
      
      const likesQuery = query(
        collection(firestore, 'bookLikes'),
        where('bookId', '==', bookId),
        where('liked', '==', true)
      );
      const likesSnapshot = await getDocs(likesQuery);
      const totalLikes = likesSnapshot.size;
      
      const updatedBooks = [...books];
      const bookIndex = updatedBooks.findIndex(book => book.id === bookId);
      
      if (bookIndex !== -1) {
        updatedBooks[bookIndex] = {
          ...updatedBooks[bookIndex],
          likes: totalLikes
        };
        setBooks(updatedBooks);
      }
    } catch (error) {
      console.error("Beğeni işlemi sırasında hata:", error);
      alert("Beğeni işlemi sırasında bir hata oluştu.");
    }
  };

  const loadBookComments = async (bookId) => {
    try {
      const commentsQuery = query(
        collection(firestore, "bookComments"),
        where("bookId", "==", bookId),
        orderBy("createdAt", "asc")
      );
      const commentsSnapshot = await getDocs(commentsQuery);
      const comments = commentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      setBookComments(prev => ({ ...prev, [bookId]: comments }));
    } catch (error) {
      console.error("Yorumlar yüklenirken hata:", error);
      alert("Yorumlar yüklenirken bir hata oluştu.");
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim() || !selectedBook) {
      return;
    }

    try {
      if (!auth.currentUser) {
        alert("Yorum yapabilmek için giriş yapmalısınız.");
        return;
      }

      await addDoc(collection(firestore, "bookComments"), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        bookId: selectedBook.id,
        comment: comment.trim(),
        createdAt: serverTimestamp()
      });
      
      setComment("");
      await loadBookComments(selectedBook.id);
      alert("Yorumunuz eklendi!");
    } catch (error) {
      console.error("Yorum eklerken hata:", error);
      alert("Yorum eklerken bir hata oluştu.");
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

    try {
      if (borrowedBooks.includes(selectedBook.id)) {
        alert("Bu kitabı zaten ödünç aldınız. İade etmeden tekrar alamazsınız.");
        setShowBorrowModal(false);
        return;
      }

      const currentDate = new Date();
      const dueDate = new Date(currentDate);
      dueDate.setDate(dueDate.getDate() + (borrowDuration * 7));
      const documentId = `${selectedBook.id}_${auth.currentUser.uid}`;
      const borrowData = {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        bookId: selectedBook.id,
        borrowed: true,
        borrowDuration: borrowDuration,
        borrowedDate: currentDate.toISOString(),
        dueDate: dueDate.toISOString(),
        status: 'pending', // 'pending', 'approved', 'rejected'
        adminApproved: false,
        adminRejected: false
      };
      const borrowRef = doc(firestore, "bookBorrows", documentId);
      await setDoc(borrowRef, borrowData);
      setBorrowedBooks(prev => [...prev, selectedBook.id]);
      setShowBorrowModal(false);
      alert(`"${selectedBook.title}" kitabı için ödünç alma talebi gönderildi. Admin onayı bekleniyor.`);
    } catch (error) {
      console.error("Kitap ödünç alınırken hata:", error);
      alert("Kitap ödünç alınırken bir hata oluştu. Detay: " + error.message);
    }
  };

  const handleReturn = async (bookId) => {
    if (!auth.currentUser) {
      alert("İade işlemi için giriş yapmalısınız.");
      return;
    }
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

  const handleRead = async (bookId) => {
    try {
      if (!auth.currentUser) {
        alert("Kitabı okudum olarak işaretlemek için lütfen giriş yapın.");
        return;
      }
      
      const isCurrentlyRead = readBooks.includes(bookId);
      const readRef = doc(firestore, 'bookReads', `${bookId}_${auth.currentUser.uid}`);
      
      await setDoc(readRef, {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        bookId: bookId,
        read: !isCurrentlyRead,
        updatedAt: serverTimestamp()
      });
      
      if (isCurrentlyRead) {
        setReadBooks(prev => prev.filter(id => id !== bookId));
        alert(`Kitap okunmadı olarak işaretlendi.`);
      } else {
        setReadBooks(prev => [...prev, bookId]);
        alert(`Kitap okundu olarak işaretlendi!`);
      }
    } catch (error) {
      console.error("Okuma işlemi sırasında hata:", error);
      alert("Kitap işaretlenirken bir hata oluştu.");
    }
  };

  const categories = ["Tümü", ...new Set(books.map(book => book.category))].sort();
  const filteredBooks = activeCategory === "Tümü" 
    ? books 
    : books.filter(book => book.category === activeCategory);

  const handleApproveBorrow = async (id) => {
    const ref = doc(firestore, "bookBorrows", id);
    await updateDoc(ref, {
      status: "approved",
      adminApproved: true,
      adminRejected: false,
    });
    sendNotification(id, "borrow", "approved");
    alert("Onaylandı!");
  };

  const handleRejectBorrow = async (id) => {
    const ref = doc(firestore, "bookBorrows", id);
    await updateDoc(ref, {
      status: "rejected",
      adminApproved: false,
      adminRejected: true,
    });
    sendNotification(id, "borrow", "rejected");
    alert("Reddedildi!");
  };

  const handleApproveRequest = async (id) => {
    const ref = doc(firestore, "bookRequests", id);
    await updateDoc(ref, {
      status: "approved",
    });
    sendNotification(id, "request", "approved");
    alert("Talep onaylandı!");
  };

  const handleRejectRequest = async (id) => {
    const ref = doc(firestore, "bookRequests", id);
    await updateDoc(ref, {
      status: "rejected",
    });
    sendNotification(id, "request", "rejected");
    alert("Talep reddedildi!");
  };

  const sendNotification = async (docId, type, status) => {
    let userId = "";
    let userEmail = "";
    let title = "";
    if (type === "borrow") {
      const ref = doc(firestore, "bookBorrows", docId);
      const snap = await getDocs(ref);
      userId = snap.data().userId;
      userEmail = snap.data().userEmail;
      title = snap.data().bookId;
    } else {
      const ref = doc(firestore, "bookRequests", docId);
      const snap = await getDocs(ref);
      userId = snap.data().userId;
      userEmail = snap.data().userEmail;
      title = snap.data().title;
    }

    let message = "";
    if (status === "approved") {
      message = type === "borrow"
        ? `"${title}" kitabı ödünç alma isteğiniz onaylandı!`
        : `"${title}" kitap talebiniz onaylandı!`;
    } else {
      message = type === "borrow"
        ? `"${title}" kitabı ödünç alma isteğiniz reddedildi.`
        : `"${title}" kitap talebiniz reddedildi.`;
    }

    await addDoc(collection(firestore, "notifications"), {
      userId,
      userEmail,
      message,
      createdAt: new Date().toISOString(),
      read: false,
    });
  };

  const loadAllRequests = async () => {
    try {
      // Tüm ödünç alma taleplerini çek (filtre yok!)
      const borrowRequestsSnapshot = await getDocs(collection(firestore, "bookBorrows"));
      const borrowRequests = borrowRequestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPendingRequests(borrowRequests);

      // Tüm yeni kitap taleplerini çek (filtre yok!)
      const newBookRequestsSnapshot = await getDocs(collection(firestore, "bookRequests"));
      const newRequests = newBookRequestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNewBookRequests(newRequests);
    } catch (error) {
      console.error("İstekler yüklenirken hata:", error);
      setPendingRequests([]);
      setNewBookRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNotifications = async () => {
    if (!auth.currentUser) return;
    try {
      const q = query(
        collection(firestore, "admin_notifications"),
        where("userId", "==", auth.currentUser.uid),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const notifs = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: doc.data().createdAt ? new Date(doc.data().createdAt) : new Date()
      }));
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    } catch (error) {
      console.error("Bildirimler yüklenirken hata:", error);
    }
  };

  const markNotificationsAsRead = async () => {
    if (!auth.currentUser) return;
    const unread = notifications.filter(n => !n.read);
    for (const notif of unread) {
      const notifRef = doc(firestore, "admin_notifications", notif.id);
      await updateDoc(notifRef, { read: true });
    }
    setUnreadCount(0);
  };

  const handleBookRequest = async () => {
    if (!requestTitle.trim() || !requestAuthor.trim()) {
      alert("Kitap adı ve yazar zorunlu!");
      return;
    }
    setRequestLoading(true);
    try {
      await addDoc(collection(firestore, "bookRequests"), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        title: requestTitle.trim(),
        author: requestAuthor.trim(),
        description: requestDescription.trim(),
        requestDate: new Date().toISOString(),
        status: "pending"
      });
      setShowRequestModal(false);
      setRequestTitle("");
      setRequestAuthor("");
      setRequestDescription("");
      alert("Kitap talebiniz başarıyla gönderildi!");
    } catch (error) {
      alert("Talep gönderilirken hata oluştu.");
    }
    setRequestLoading(false);
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="logo">
          <FaBook />
          <h1>Kütüphanem</h1>
        </div>
        <div className="header-buttons">
          <button className="notification-bell" onClick={() => { setShowNotifications(true); markNotificationsAsRead(); }}>
            <FaBell />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>
          <button className="logout-button" onClick={handleLogout}>
            <FaSignOutAlt /> Çıkış
          </button>
        </div>
      </header>

      <div className="category-filter">
        {categories.map(category => (
          <button 
            key={category} 
            className={`category-button ${activeCategory === category ? 'active' : ''}`}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Kitaplar yükleniyor...</p>
        </div>
      ) : (
        <div className="books-container">
          {filteredBooks.map((book) => {
            const borrowedBook = borrowedBooks.find(b => b.bookId === book.id);
            const isBorrowed = borrowedBook !== undefined && borrowedBook.status !== 'rejected';
            const isPending = isBorrowed && borrowedBook.status === 'pending';
            const isApproved = isBorrowed && borrowedBook.status === 'approved';

            return (
              <div key={book.id} className="book-card">
                <div className="book-image">
                  <img src={book.imageUrl} alt={book.title} />
                </div>
                <div className="book-info">
                  <h3>{book.title}</h3>
                  <p className="book-author">{book.author}</p>
                  <p className="book-category">{book.category}</p>
                  <p className="book-description">{book.description}</p>
                  <div className="book-details">
                    <span>Yayın Yılı: {book.year}</span>
                    <span>{book.pages} Sayfa</span>
                  </div>
                  <div className="book-actions">
                    <button 
                      className={`like-button ${likedBooks.includes(book.id) ? 'liked' : ''}`}
                      onClick={() => handleLike(book.id)}
                    >
                      {likedBooks.includes(book.id) ? <FaHeart /> : <FaRegHeart />}
                      <span>{book.likes || 0}</span>
                    </button>
                    <button 
                      className="comment-button"
                      onClick={async () => {
                        setSelectedBook(book);
                        await loadBookComments(book.id);
                        setShowCommentModal(true);
                      }}
                    >
                      <FaComment /> Yorumlar
                    </button>
                  </div>
                  <div className="book-actions second-row">
                    <button 
                      className={`borrow-button ${isBorrowed ? (isPending ? 'pending' : isApproved ? 'approved' : '') : ''}`}
                      onClick={() => {
                        if (isBorrowed) {
                          if (isApproved) {
                            handleReturn(book.id);
                          } else if (isPending) {
                            alert("Bu kitap için onay bekleniyor.");
                          }
                        } else {
                          handleBorrow(book.id);
                        }
                      }}
                    >
                      <FaHandHolding /> 
                      {isBorrowed 
                        ? (isPending 
                          ? 'Onay Bekliyor' 
                          : isApproved 
                            ? 'İade Et' 
                            : 'Ödünç Al')
                        : 'Ödünç Al'}
                    </button>
                    <button 
                      className={`read-button ${readBooks.includes(book.id) ? 'read' : ''}`}
                      onClick={() => handleRead(book.id)}
                    >
                      <FaBookOpen /> {readBooks.includes(book.id) ? 'Okundu' : 'Okudum'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCommentModal && selectedBook && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{selectedBook.title} - Yorumlar</h2>
            
            <div className="comments-container">
              {bookComments[selectedBook.id] && bookComments[selectedBook.id].length > 0 ? (
                <div className="comments-list">
                  {bookComments[selectedBook.id].map((comment) => (
                    <div key={comment.id} className="comment-item">
                      <div className="comment-header">
                        <span className="comment-author">{comment.userEmail}</span>
                        <span className="comment-date">
                          {comment.createdAt && comment.createdAt.toDate 
                            ? new Date(comment.createdAt.toDate()).toLocaleString('tr-TR') 
                            : 'Yeni eklendi'}
                        </span>
                      </div>
                      <p className="comment-text">{comment.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-comments">
                  <p>Henüz yorum yapılmamış. İlk yorumu siz yapın!</p>
                </div>
              )}
            </div>
            
            <div className="comment-form">
              <textarea
                placeholder="Yorumunuzu yazın..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              ></textarea>
              
              <div className="modal-buttons">
                <button onClick={() => {
                  setShowCommentModal(false);
                  setComment("");
                }}>
                  İptal
                </button>
                <button onClick={handleAddComment}>
                  Yorum Ekle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBorrowModal && selectedBook && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Ödünç Alma Süresi Seçin</h2>
            <p>"{selectedBook.title}" kitabını ne kadar süreyle ödünç almak istiyorsunuz?</p>
            <div className="borrow-options">
              <div 
                className={`borrow-option ${borrowDuration === 1 ? 'selected' : ''}`} 
                onClick={() => setBorrowDuration(1)}
              >
                <span className="borrow-duration">1 Hafta</span>
                <span className="borrow-info">Kısa süre</span>
              </div>
              <div 
                className={`borrow-option ${borrowDuration === 2 ? 'selected' : ''}`} 
                onClick={() => setBorrowDuration(2)}
              >
                <span className="borrow-duration">2 Hafta</span>
                <span className="borrow-info">Standart süre</span>
              </div>
              <div 
                className={`borrow-option ${borrowDuration === 3 ? 'selected' : ''}`} 
                onClick={() => setBorrowDuration(3)}
              >
                <span className="borrow-duration">3 Hafta</span>
                <span className="borrow-info">Uzun süre</span>
              </div>
              <div 
                className={`borrow-option ${borrowDuration === 4 ? 'selected' : ''}`} 
                onClick={() => setBorrowDuration(4)}
              >
                <span className="borrow-duration">4 Hafta</span>
                <span className="borrow-info">Maksimum süre</span>
              </div>
            </div>
            <div className="modal-buttons">
              <button onClick={() => setShowBorrowModal(false)}>İptal</button>
              <button onClick={confirmBorrow}>Onayla</button>
            </div>
          </div>
        </div>
      )}

      {showNotifications && (
        <div className="notification-modal-overlay" onClick={() => setShowNotifications(false)}>
          <div className="notification-modal" onClick={e => e.stopPropagation()}>
            <div className="notification-modal-header">
              <FaBell /> Bildirimler
              <button className="close-modal-btn" onClick={() => setShowNotifications(false)}>×</button>
            </div>
            <div className="notification-modal-list">
              {notifications.length === 0 ? (
                <div className="no-notifications">Hiç bildiriminiz yok.</div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className={`notification-item${!n.read ? ' unread' : ''}`}>
                    <div className="notification-message">{n.message}</div>
                    <div className="notification-date">{n.createdAt && n.createdAt.toDate ? n.createdAt.toDate().toLocaleString('tr-TR') : ''}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div>
        <h2>Ödünç Aldığım Kitaplar</h2>
        {myBorrows.map(borrow => (
          <div key={borrow.bookId}>
            {borrow.bookId} - Durum: {borrow.status === "pending" ? "Admin Onayı Bekliyor" : borrow.status === "approved" ? "Onaylandı" : "Reddedildi"}
          </div>
        ))}
      </div>

      <button className="book-request-button" onClick={() => setShowRequestModal(true)}>
        + Kitap Talebi Oluştur
      </button>
      {showRequestModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Kitap Talebi Oluştur</h2>
            <input
              type="text"
              placeholder="Kitap Adı"
              value={requestTitle}
              onChange={e => setRequestTitle(e.target.value)}
              style={{ width: '100%', marginBottom: 10 }}
            />
            <input
              type="text"
              placeholder="Yazar"
              value={requestAuthor}
              onChange={e => setRequestAuthor(e.target.value)}
              style={{ width: '100%', marginBottom: 10 }}
            />
            <textarea
              placeholder="Açıklama (isteğe bağlı)"
              value={requestDescription}
              onChange={e => setRequestDescription(e.target.value)}
              style={{ width: '100%', marginBottom: 10 }}
            />
            <div className="modal-buttons">
              <button onClick={() => setShowRequestModal(false)}>İptal</button>
              <button onClick={handleBookRequest} disabled={requestLoading}>
                {requestLoading ? "Gönderiliyor..." : "Gönder"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;