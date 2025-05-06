import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, firestore } from "../config/firebase";
import { FaBook, FaSignOutAlt, FaSearch, FaHeart, FaRegHeart, FaComment, FaUser } from "react-icons/fa";
import "./Favorites.css";

const Favorites = () => {
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("Tümü");
  const [searchQuery, setSearchQuery] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const loadFavoriteBooks = async () => {
      if (!auth.currentUser) {
        navigate("/login");
        return;
      }

      setIsLoading(true);
      try {
        // Kullanıcının beğendiği kitapların ID'lerini al
        const likesQuery = query(
          collection(firestore, "bookLikes"),
          where("userId", "==", auth.currentUser.uid),
          where("liked", "==", true)
        );
        const likesSnapshot = await getDocs(likesQuery);
        const favoriteBookIds = likesSnapshot.docs.map(doc => doc.data().bookId);

        // Eğer beğenilen bir kitap yoksa, boş liste göster
        if (favoriteBookIds.length === 0) {
          setBooks([]);
          setIsLoading(false);
          return;
        }

        // Kitap verilerini yükle ve filtrele
        // Not: Burada veritabanından değil, lokal kitap listesinden yüklüyoruz
        // Bu nedenle import etmemiz gerekiyor
        const { libraryBooks } = await import("./Home");

        // Beğenilen kitapları filtrele
        const favoriteBooks = libraryBooks.filter(book => 
          favoriteBookIds.includes(book.id)
        );

        // Beğeni sayılarını Firebase'den çekerek güncelle
        for (const book of favoriteBooks) {
          const likesQuery = query(
            collection(firestore, "bookLikes"),
            where("bookId", "==", book.id),
            where("liked", "==", true)
          );
          const likesSnapshot = await getDocs(likesQuery);
          book.likes = likesSnapshot.size;
        }

        setBooks(favoriteBooks);
      } catch (error) {
        console.error("Favori kitaplar yüklenirken hata:", error);
        alert("Favori kitaplar yüklenirken bir hata oluştu.");
      } finally {
        setIsLoading(false);
      }
    };

    loadFavoriteBooks();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Çıkış yapılırken hata:", error);
      alert("Çıkış yapılırken bir sorun oluştu.");
    }
  };

  const handleCommentClick = (book) => {
    navigate(`/book/${book.id}`, { state: { book } });
  };

  // Kategorileri al
  const categories = ["Tümü", ...new Set(books.map(book => book.category))].sort();

  // Kitapları kategoriye ve arama sorgusuna göre filtrele
  const filteredBooks = books
    .filter(book => activeCategory === "Tümü" || book.category === activeCategory)
    .filter(book => 
      searchQuery === "" || 
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="favorites-container">
      <header className="favorites-header">
        <div className="logo">
          <FaBook />
          <h1>Favorilerim</h1>
        </div>
        <div className="header-buttons">
          <button className="logout-button" onClick={handleLogout}>
            <FaSignOutAlt /> Çıkış
          </button>
        </div>
      </header>

      <div className="search-bar">
        <FaSearch className="search-icon" />
        <input
          type="text"
          placeholder="Kitap veya yazar ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Kategori Filtreleme */}
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
          <p>Favori kitaplarınız yükleniyor...</p>
        </div>
      ) : filteredBooks.length > 0 ? (
        <div className="books-container">
          {filteredBooks.map((book) => (
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
                  <button className="like-button liked">
                    <FaHeart />
                    <span>{book.likes || 0}</span>
                  </button>
                  <button 
                    className="comment-button"
                    onClick={() => handleCommentClick(book)}
                  >
                    <FaComment /> Yorumlar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-favorites">
          <FaHeart className="empty-icon" />
          <h2>Henüz favori kitabınız bulunmamaktadır</h2>
          <p>Kitapları favorilere ekleyerek burada görüntüleyebilirsiniz</p>
          <button className="browse-button" onClick={() => navigate("/home")}>
            Kitaplara Göz At
          </button>
        </div>
      )}
    </div>
  );
};

export default Favorites;
