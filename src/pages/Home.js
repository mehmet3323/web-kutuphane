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
import { FaBook, FaSignOutAlt, FaPlus, FaHeart, FaRegHeart, FaComment, FaBookOpen, FaHandHolding } from "react-icons/fa";
import "./Home.css";

// Kitap verileri - doğrudan bu listeden alınacak
export const libraryBooks = [
  {
    id: "book-0",
    title: "Suç ve Ceza",
    author: "Fyodor Dostoyevski",
    description: "Rus edebiyatının en önemli eserlerinden biri olan bu roman, yoksul bir öğrencinin işlediği cinayetin psikolojik ve felsefi sonuçlarını ele alır.",
    category: "Roman",
    year: 1866,
    pages: 705,
    likes: 0,
    imageUrl: "https://picsum.photos/seed/book0/200/300",
  },
  {
    id: "book-1",
    title: "İnce Memed",
    author: "Yaşar Kemal",
    description: "Çukurovanın toplumsal gerçeklerini anlatan, eşkıyalık ve adalet temalı başyapıt.",
    category: "Roman",
    year: 1955,
    pages: 450,
    likes: 0,
    imageUrl: "https://picsum.photos/seed/book1/200/300",
  },
  {
    id: "book-2",
    title: "Kuyucaklı Yusuf",
    author: "Sabahattin Ali",
    description: "Anadoluda geçen, toplumsal adaletsizlik ve yozlaşmayı anlatan etkileyici bir roman.",
    category: "Roman",
    year: 1937,
    pages: 220,
    likes: 0,
    imageUrl: "https://picsum.photos/seed/book2/200/300",
  },
  {
    id: "book-3",
    title: "Beyaz Diş",
    author: "Jack London",
    description: "Alaskanın vahşi doğasında geçen, bir kurt köpeğinin hayatta kalma mücadelesi.",
    category: "Macera",
    year: 1906,
    pages: 298,
    likes: 0,
    imageUrl: "https://picsum.photos/seed/book3/200/300",
  },
  {
    id: "book-4",
    title: "Dönüşüm",
    author: "Franz Kafka",
    description: "Modern toplumda yabancılaşmayı anlatan, absürt ve alegorik bir başyapıt.",
    category: "Roman",
    year: 1915,
    pages: 74,
    likes: 0,
    imageUrl: "https://picsum.photos/seed/book4/200/300",
  },
  {
    id: "book-5",
    title: "Serenad",
    author: "Zülfü Livaneli",
    description: "İkinci Dünya Savaşı döneminde geçen, aşk ve tarih temalı etkileyici bir roman.",
    category: "Roman",
    year: 2011,
    pages: 481,
    likes: 0,
    imageUrl: "https://picsum.photos/seed/book5/200/300",
  },
  {
    id: "book-6",
    title: "Şeker Portakalı",
    author: "José Mauro de Vasconcelos",
    description: "Yoksul bir çocuğun gözünden hayatı anlatan, dokunaklı bir büyüme romanı.",
    category: "Roman",
    year: 1968,
    pages: 182,
    likes: 0,
    imageUrl: "https://picsum.photos/seed/book6/200/300",
  },
  {
    id: "book-7",
    title: "Fahrenheit 451",
    author: "Ray Bradbury",
    description: "Kitapların yakıldığı distopik bir gelecekte geçen, düşünce özgürlüğünü savunan roman.",
    category: "Bilim-Kurgu",
    year: 1953,
    pages: 256,
    likes: 0,
    imageUrl: "https://picsum.photos/seed/book7/200/300",
  },
  {
    id: "book-8",
    title: "Bin Muhteşem Güneş",
    author: "Khaled Hosseini",
    description: "Afganistanda iki kadının hayatını anlatan, dostluk ve umut temalı roman.",
    category: "Roman",
    year: 2007,
    pages: 384,
    likes: 0,
    imageUrl: "https://picsum.photos/seed/book8/200/300",
  },
  {
    id: "book-9",
    title: "Uçurtma Avcısı",
    author: "Khaled Hosseini",
    description: "Afganistanda geçen, dostluk ve ihanet temalı etkileyici bir roman.",
    category: "Roman",
    year: 2003,
    pages: 371,
    likes: 0,
    imageUrl: "https://picsum.photos/seed/book9/200/300",
  },
  {
    id: "book-10",
    title: "Simyacı",
    author: "Paulo Coelho",
    description: "Bir çobanın kişisel efsanesini gerçekleştirmek için çıktığı yolculuğu anlatan felsefi roman.",
    category: "Roman",
    year: 1988,
    pages: 208,
    likes: 0,
    imageUrl: "https://picsum.photos/seed/book10/200/300",
  },
  {
    id: "book-11",
    title: "Yüzüklerin Efendisi",
    author: "J.R.R. Tolkien",
    description: "Orta Dünyada geçen, iyilik ve kötülük arasındaki mücadeleyi anlatan epik fantastik roman serisi.",
    category: "Fantastik",
    year: 1954,
    pages: 1178,
    likes: 0,
    imageUrl: "https://picsum.photos/seed/book11/200/300",
  },
  {
    id: "book-12",
    title: "Harry Potter ve Felsefe Taşı",
    author: "J.K. Rowling",
    description: "Genç bir büyücünün Hogwartstaki ilk yılını anlatan fantastik roman.",
    category: "Fantastik",
    year: 1997,
    pages: 332,
    likes: 0,
    imageUrl: "https://picsum.photos/seed/book12/200/300",
  },
  {
    id: "book-13",
    title: "Küçük Prens",
    author: "Antoine de Saint-Exupéry",
    description: "Bir pilotun çölde karşılaştığı küçük prensin hikayesini anlatan felsefi masal.",
    category: "Çocuk",
    year: 1943,
    pages: 96,
    likes: 0,
    imageUrl: "https://picsum.photos/seed/book13/200/300",
  },
  {
    id: "book-14",
    title: "Hayvan Çiftliği",
    author: "George Orwell",
    description: "Bir çiftlikte hayvanların devrim yapmasını konu alan, totaliter rejimleri eleştiren alegorik roman.",
    category: "Roman",
    year: 1945,
    pages: 112,
    likes: 0,
    imageUrl: "https://picsum.photos/seed/book14/200/300",
  },
  {
    id: "book-15",
    title: "1984",
    author: "George Orwell",
    description: "Gözetim toplumunu ve düşünce kontrolünü konu alan distopik roman.",
    category: "Distopya",
    year: 1949,
    pages: 328,
    likes: 0,
    imageUrl: "https://picsum.photos/seed/book15/200/300",
  },
  {
    id: "book-16",
    title: "Cesur Yeni Dünya",
    author: "Aldous Huxley",
    description: "Teknolojik ilerlemenin insanlığı getirdiği noktayı anlatan distopik roman.",
    category: "Distopya",
    year: 1932,
    pages: 288,
    likes: 0,
    imageUrl: "https://picsum.photos/seed/book16/200/300",
  },
  {
    id: "book-17",
    title: "Savaş ve Barış",
    author: "Lev Tolstoy",
    description: "Napolyonun Rusya seferini ve Rus toplumunu anlatan epik roman.",
    category: "Roman",
    year: 1869,
    pages: 1225,
    likes: 0,
    imageUrl: "https://picsum.photos/seed/book17/200/300",
  },
  {
    id: "book-18",
    title: "Anna Karenina",
    author: "Lev Tolstoy",
    description: "Yasak aşk ve toplumsal normlar arasında sıkışan bir kadının hikayesi.",
    category: "Roman",
    year: 1877,
    pages: 864,
    likes: 0,
    imageUrl: "https://picsum.photos/seed/book18/200/300",
  },
  {
    id: "book-19",
    title: "Bülbülü Öldürmek",
    author: "Harper Lee",
    description: "Amerikan Güneyinde ırkçılık ve adaletsizliği bir çocuğun gözünden anlatan roman.",
    category: "Roman",
    year: 1960,
    pages: 281,
    likes: 0,
    imageUrl: "https://picsum.photos/seed/book19/200/300",
  }
];

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
      const q = query(
        collection(firestore, "bookBorrows"),
        where("userId", "==", auth.currentUser.uid)
      );
      const snapshot = await getDocs(q);
      setMyBorrows(snapshot.docs.map(doc => doc.data()));
    };
    fetchMyBorrows();
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
    if (!borrowedBooks.includes(bookId)) {
      alert("Bu kitabı iade edemezsiniz çünkü ödünç almamışsınız.");
      return;
    }
    try {
      const borrowRef = doc(firestore, 'bookBorrows', `${bookId}_${auth.currentUser.uid}`);
      await setDoc(borrowRef, {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        bookId: bookId,
        borrowed: false,
        updatedAt: serverTimestamp()
      });
      setBorrowedBooks(prev => prev.filter(id => id !== bookId));
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

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="logo">
          <FaBook />
          <h1>Kütüphanem</h1>
        </div>
        <div className="header-buttons">
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
            const isBorrowed = borrowedBook !== undefined;
            const isPending = isBorrowed && borrowedBook.status === 'pending';
            const isApproved = isBorrowed && borrowedBook.adminApproved;
            const isRejected = isBorrowed && borrowedBook.adminRejected;

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
                      className={`borrow-button ${isBorrowed ? (isPending ? 'pending' : isApproved ? 'approved' : isRejected ? 'rejected' : '') : ''}`}
                      onClick={() => {
                        if (isBorrowed) {
                          if (isApproved) {
                            handleReturn(book.id);
                          } else {
                            alert(isPending ? "Bu kitap için onay bekleniyor." : "Bu kitap reddedildi.");
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
                            : isRejected 
                              ? 'Reddedildi' 
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

      <div>
        <h2>Ödünç Aldığım Kitaplar</h2>
        {myBorrows.map(borrow => (
          <div key={borrow.bookId}>
            {borrow.bookId} - Durum: {borrow.status === "pending" ? "Admin Onayı Bekliyor" : borrow.status === "approved" ? "Onaylandı" : "Reddedildi"}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;