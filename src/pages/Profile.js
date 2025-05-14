import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  orderBy,
  addDoc
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, firestore } from "../config/firebase";
import { FaBook, FaSignOutAlt, FaHeart, FaUser, FaClock, FaEdit, FaBell, FaCheck, FaTimes } from "react-icons/fa";
import "./Profile.css";

// Profil resmi olarak emoji kullanılacak
const profileEmoji = "📚";

const Profile = () => {
  const [activeTab, setActiveTab] = useState("okunan");
  const [books, setBooks] = useState([]);
  const [borrowDetails, setBorrowDetails] = useState({});
  const [userStats, setUserStats] = useState({
    okunanKitap: 0,
    alinanKitap: 0,
    begenilenKitap: 0,
    hedef: 50
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showHedefModal, setShowHedefModal] = useState(false);
  const [hedefValue, setHedefValue] = useState(50);
  const [userData, setUserData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [bookRequests, setBookRequests] = useState([]);

  const navigate = useNavigate();

  // Kalan günleri hesaplama fonksiyonu
  const calculateRemainingDays = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Kullanıcı verilerini yükle
  const loadUserData = async () => {
    if (!auth.currentUser) return null;
    
    try {
      // Kullanıcı belgesine referans
      const userRef = doc(firestore, "users", auth.currentUser.uid);
      
      // Belgeyi getir
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return userSnap.data();
      } else {
        // Kullanıcı belgesi yoksa oluştur
        const userData = {
          fullName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
          email: auth.currentUser.email,
          kitapHedefi: 50,
          createdAt: new Date()
        };
        
        await setDoc(userRef, userData);
        return userData;
      }
    } catch (error) {
      console.error("Kullanıcı verisi yüklenirken hata:", error);
      return null;
    }
  };

  // Kitap hedefini güncelle
  const updateKitapHedefi = async () => {
    if (!auth.currentUser) return;
    
    try {
      const userRef = doc(firestore, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        kitapHedefi: hedefValue
      });
      
      // Kullanıcı verilerini yeniden yükle
      const updatedUserData = await loadUserData();
      setUserData(updatedUserData);
      
      // State'i güncelle
      setUserStats(prev => ({
        ...prev,
        hedef: hedefValue
      }));
      
      setShowHedefModal(false);
      alert("Kitap hedefi başarıyla güncellendi!");
    } catch (error) {
      console.error("Kitap hedefi güncellenirken hata:", error);
      alert("Kitap hedefi güncellenirken bir hata oluştu.");
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) {
        navigate('/login');
        return;
      }

      setIsLoading(true);
      try {
        console.log("Profil bilgileri yükleniyor...");

        // Kullanıcı verisini yükle
        const userDataResult = await loadUserData();
        setUserData(userDataResult);
        
        // Hedef değerini ayarla
        if (userDataResult?.kitapHedefi) {
          setHedefValue(userDataResult.kitapHedefi);
        }

        // Tüm kitapları import et
        const { libraryBooks } = await import("./Home");
        console.log("Kitaplar yüklendi. Toplam kitap sayısı:", libraryBooks.length);

        // BEĞENILEN KITAPLAR
        const likesQuery = query(
          collection(firestore, "bookLikes"),
          where("userId", "==", auth.currentUser.uid),
          where("liked", "==", true)
        );
        const likesSnapshot = await getDocs(likesQuery);
        const likedBooksCount = likesSnapshot.size;
        const likedBookIds = likesSnapshot.docs.map(doc => doc.data().bookId);
        
        // ÖDÜNÇ ALINAN KITAPLAR
        const borrowsQuery = query(
          collection(firestore, "bookBorrows"),
          where("userId", "==", auth.currentUser.uid)
        );
        const borrowsSnapshot = await getDocs(borrowsQuery);
        const borrowedBooksCount = borrowsSnapshot.size;
        const borrowedBookIds = borrowsSnapshot.docs.map(doc => ({
          bookId: doc.data().bookId,
          status: doc.data().status,
          adminApproved: doc.data().adminApproved,
          adminRejected: doc.data().adminRejected,
          borrowedDate: doc.data().borrowedDate,
          dueDate: doc.data().dueDate,
          borrowDuration: doc.data().borrowDuration
        }));
        
        // Ödünç alınan kitapların detaylarını al
        const borrowedDetails = {};
        borrowsSnapshot.forEach(doc => {
          const data = doc.data();
          borrowedDetails[data.bookId] = {
            status: data.status,
            adminApproved: data.adminApproved,
            adminRejected: data.adminRejected,
            borrowedDate: data.borrowedDate || new Date().toISOString(),
            dueDate: data.dueDate || new Date(Date.now() + 7*24*60*60*1000).toISOString(),
            borrowDuration: data.borrowDuration || 1
          };
        });
        setBorrowDetails(borrowedDetails);
        
        // OKUNAN KITAPLAR
        const readsQuery = query(
          collection(firestore, "bookReads"),
          where("userId", "==", auth.currentUser.uid),
          where("read", "==", true)
        );
        const readsSnapshot = await getDocs(readsQuery);
        const readBooksCount = readsSnapshot.size;
        const readBookIds = readsSnapshot.docs.map(doc => doc.data().bookId);

        // Profil istatistiklerini güncelle
        setUserStats({
          okunanKitap: readBooksCount,
          alinanKitap: borrowedBooksCount,
          begenilenKitap: likedBooksCount,
          hedef: userDataResult?.kitapHedefi || 50
        });

        // Gösterilecek kitapları belirle
        let filteredBooks = [];
        if (activeTab === "begenilen") {
          filteredBooks = libraryBooks.filter(book => likedBookIds.includes(book.id));
        } 
        else if (activeTab === "okunan") {
          filteredBooks = libraryBooks.filter(book => readBookIds.includes(book.id));
        } 
        else if (activeTab === "alinan") {
          filteredBooks = libraryBooks.filter(book => 
            borrowedBookIds.some(borrowed => borrowed.bookId === book.id)
          );
        }

        setBooks(filteredBooks);
        setIsLoading(false);

        // Bildirimleri yükle
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
      } catch (error) {
        console.error("Profil bilgileri yüklenirken hata:", error);
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [navigate, activeTab]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Çıkış yapılırken hata:", error);
      alert("Çıkış yapılırken bir sorun oluştu.");
    }
  };

  return (
    <div className="profile-container">
      {/* Bildirimler */}
      {notifications.length > 0 && (
        <div className="profile-notifications">
          <h3><FaBell /> Bildirimler</h3>
          <ul>
            {notifications.map(n => (
              <li key={n.id} className="profile-notification-item">
                {n.message} <span className="profile-notification-date">{n.createdAt && n.createdAt.toDate ? n.createdAt.toDate().toLocaleString('tr-TR') : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="profile-header-gradient">
        <div className="profile-emoji">{profileEmoji}</div>
        <h2 className="profile-username">{userData?.fullName || auth.currentUser?.email?.split('@')[0] || "Kullanıcı"}</h2>

        <div className="profile-stats">
          <div className="profile-stat-item">
            <span className="profile-stat-number">{userStats.okunanKitap}</span>
            <span className="profile-stat-label">Okunan</span>
          </div>
          <div className="profile-stat-item">
            <span className="profile-stat-number">{userStats.alinanKitap}</span>
            <span className="profile-stat-label">Alınan</span>
          </div>
          <div className="profile-stat-item">
            <span className="profile-stat-number">{userStats.begenilenKitap}</span>
            <span className="profile-stat-label">Beğenilen</span>
          </div>
        </div>

        <div className="profile-goal">
          <div className="profile-goal-header">
            <p className="profile-goal-text">Yıllık Hedef: {userStats.hedef} Kitap</p>
            <button className="edit-goal-button" onClick={() => setShowHedefModal(true)}>
              <FaEdit />
            </button>
          </div>
          <div className="profile-progress-bar">
            <div 
              className="profile-progress" 
              style={{ width: `${Math.min((userStats.okunanKitap / userStats.hedef) * 100, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="profile-tabs">
        <button 
          className={`profile-tab ${activeTab === 'okunan' ? 'active' : ''}`}
          onClick={() => setActiveTab('okunan')}
        >
          Okunan Kitaplar
        </button>
        <button 
          className={`profile-tab ${activeTab === 'alinan' ? 'active' : ''}`}
          onClick={() => setActiveTab('alinan')}
        >
          Alınan Kitaplar
        </button>
        <button 
          className={`profile-tab ${activeTab === 'begenilen' ? 'active' : ''}`}
          onClick={() => setActiveTab('begenilen')}
        >
          Beğenilen Kitaplar
        </button>
      </div>

      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Kitaplarınız yükleniyor...</p>
        </div>
      ) : (
        <div className="profile-books">
          {books.length > 0 ? (
            books.map(book => (
              <div className="profile-book-card" key={book.id}>
                <div className="profile-book-cover">
                  <img src={book.imageUrl} alt={book.title} />
                </div>
                <div className="profile-book-info">
                  <h3 className="profile-book-title">{book.title}</h3>
                  <p className="profile-book-author">{book.author}</p>
                  
                  {activeTab === 'alinan' && borrowDetails[book.id] && (
                    <div className="borrow-details">
                      {borrowDetails[book.id].status === 'pending' ? (
                        <div className="profile-request-status pending">
                          Admin Onayı Bekliyor
                        </div>
                      ) : borrowDetails[book.id].status === 'approved' ? (
                        <>
                          <div className="profile-request-status approved">
                            Onaylandı
                          </div>
                          <div className="remaining-days">
                            <FaClock />
                            <span>
                              {calculateRemainingDays(borrowDetails[book.id].dueDate)} gün kaldı
                            </span>
                          </div>
                          <div className="borrow-date">
                            Alış: {new Date(borrowDetails[book.id].borrowedDate).toLocaleDateString('tr-TR')}
                          </div>
                          <div className="due-date">
                            İade: {new Date(borrowDetails[book.id].dueDate).toLocaleDateString('tr-TR')}
                          </div>
                        </>
                      ) : borrowDetails[book.id].status === 'rejected' ? (
                        <div className="profile-request-status rejected">
                          Reddedildi
                        </div>
                      ) : null}
                    </div>
                  )}
                  
                  <div className="profile-book-status">
                    <span className="profile-book-status-text">
                      {activeTab === 'okunan' ? 'Tamamlandı' : 
                       activeTab === 'alinan' ? 'Ödünç Alındı' : 'Beğenildi'}
                    </span>
                    <span className="profile-book-progress">
                      {activeTab === 'okunan' ? '✅' : 
                       activeTab === 'alinan' ? '📚' : '❤️'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="profile-empty-books">
              <p className="profile-empty-text">
                {activeTab === 'okunan' ? 'Henüz okuduğunuz kitap bulunmamaktadır.' : 
                 activeTab === 'alinan' ? 'Henüz aldığınız kitap bulunmamaktadır.' :
                 'Henüz beğendiğiniz kitap bulunmamaktadır.'}
              </p>
              <button className="profile-browse-button" onClick={() => navigate("/home")}>
                Kitaplara Göz At
              </button>
            </div>
          )}
        </div>
      )}

      {/* Kitap Hedefi Ayarlama Modalı */}
      {showHedefModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Kitap Okuma Hedefiniz</h2>
            <p>Bu yıl kaç kitap okumayı hedefliyorsunuz?</p>
            
            <div className="hedef-input-container">
              <input
                type="number"
                min="1"
                max="1000"
                value={hedefValue}
                onChange={(e) => setHedefValue(parseInt(e.target.value) || 1)}
                className="hedef-input"
              />
              <span>kitap</span>
            </div>
            
            <div className="modal-buttons">
              <button onClick={() => setShowHedefModal(false)}>İptal</button>
              <button onClick={updateKitapHedefi}>Kaydet</button>
            </div>
          </div>
        </div>
      )}

      <button className="logout-button-absolute" onClick={handleLogout}>
        <FaSignOutAlt /> Çıkış Yap
      </button>
    </div>
  );
};

export default Profile;
