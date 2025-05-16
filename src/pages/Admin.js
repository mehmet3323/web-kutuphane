import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, query, where, getDoc, orderBy } from 'firebase/firestore';
import { FaEnvelope, FaSignOutAlt, FaBell } from 'react-icons/fa';
import { firestore, auth } from '../config/firebase';
import { useNavigate } from 'react-router-dom';
import './Admin.css';

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showUserSelectModal, setShowUserSelectModal] = useState(false);
  const navigate = useNavigate();

  // Kullanıcıları yükle
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersQuery = query(collection(firestore, "users"));
        const snapshot = await getDocs(usersQuery);
        const usersList = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const userData = doc.data();
            return {
              uid: doc.id,
              email: userData.email,
              role: userData.role || 'user',
              fullName: userData.fullName || userData.email.split('@')[0]
            };
          })
        );
        setUsers(usersList);
        setIsLoading(false);
      } catch (error) {
        console.error("Kullanıcılar yüklenirken hata:", error);
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Rol değiştirme fonksiyonu
  const handleRoleChange = async (userId, newRole) => {
    try {
      const userRef = doc(firestore, "users", userId);
      await updateDoc(userRef, {
        role: newRole
      });

      // Kullanıcı listesini güncelle
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.uid === userId ? { ...user, role: newRole } : user
        )
      );

      alert(`Kullanıcı rolü ${newRole === 'admin' ? 'admin' : 'kullanıcı'} olarak güncellendi!`);
    } catch (error) {
      console.error("Rol değiştirilirken hata:", error);
      alert("Rol değiştirilirken bir hata oluştu.");
    }
  };

  const handleSendMessage = async () => {
    if (!selectedUser || !messageText.trim()) return;

    try {
      // Bildirim oluştur
      const notificationData = {
        userId: selectedUser.uid,
        userEmail: selectedUser.email,
        message: messageText.trim(),
        createdAt: new Date().toISOString(),
        read: false,
        type: "admin_message",
        sender: "Admin",
        title: "Yeni Mesaj",
        adminId: auth.currentUser.uid
      };

      // Bildirimi Firestore'a kaydet
      await addDoc(collection(firestore, "admin_notifications"), notificationData);

      setMessageText("");
      setShowMessageModal(false);
      setShowUserSelectModal(false);
      alert("Mesaj başarıyla gönderildi!");
    } catch (error) {
      console.error("Mesaj gönderilirken hata:", error);
      alert("Mesaj gönderilirken bir hata oluştu.");
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error("Çıkış yapılırken hata:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="admin-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="admin-header-left">
          <h1>Admin Paneli</h1>
        </div>
        <div className="admin-header-right">
          <button 
            className="send-message-button"
            onClick={() => setShowUserSelectModal(true)}
          >
            <FaBell /> Kullanıcıya Mesaj Gönder
          </button>
          <button className="logout-button" onClick={handleLogout}>
            <FaSignOutAlt /> Çıkış Yap
          </button>
        </div>
      </header>

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
                <button 
                  className={`role-button ${user.role === 'admin' ? 'admin' : ''}`}
                  onClick={() => handleRoleChange(user.uid, user.role === 'admin' ? 'user' : 'admin')}
                >
                  {user.role === 'admin' ? 'Admin Yetkisini Al' : 'Admin Yap'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Kullanıcı Seçme Modalı */}
      {showUserSelectModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Kullanıcı Seçin</h2>
            <div className="user-select-list">
              {users.map(user => (
                <div 
                  key={user.uid} 
                  className="user-select-item"
                  onClick={() => {
                    setSelectedUser(user);
                    setShowUserSelectModal(false);
                    setShowMessageModal(true);
                  }}
                >
                  <span className="user-email">{user.email}</span>
                  <span className="user-role">{user.role || 'Kullanıcı'}</span>
                </div>
              ))}
            </div>
            <div className="modal-buttons">
              <button onClick={() => setShowUserSelectModal(false)}>
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
};

export default Admin; 