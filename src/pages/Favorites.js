import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { FaBook, FaSignOutAlt, FaSearch, FaMagic, FaRobot } from 'react-icons/fa';
import './Favorites.css';

const BookAI = () => {
  const [activeTab, setActiveTab] = useState('search'); // 'search' veya 'recommend'
  const [searchQuery, setSearchQuery] = useState('');
  const [moodQuery, setMoodQuery] = useState('');
  const [bookInfo, setBookInfo] = useState(null);
  const [recommendedBooks, setRecommendedBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  const searchOpenLibrary = async (query) => {
    try {
      const response = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=1`
      );
      const data = await response.json();

      if (data.docs && data.docs.length > 0) {
        const book = data.docs[0];
        const workResponse = await fetch(
          `https://openlibrary.org${book.key}.json`
        );
        const workData = await workResponse.json();

        return {
          title: book.title,
          authors: book.author_name ? book.author_name.join(', ') : 'Bilinmiyor',
          description: workData.description?.value || workData.description || 'Bu kitap için özet bulunamadı.',
          imageUrl: book.cover_i 
            ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`
            : 'https://via.placeholder.com/128x192?text=No+Image',
          publishedDate: book.first_publish_year || 'Bilinmiyor',
          pageCount: book.number_of_pages_median || 'Bilinmiyor',
          publisher: book.publisher ? book.publisher[0] : 'Bilinmiyor',
          categories: book.subject ? book.subject.slice(0, 3) : ['Bilinmiyor'],
          source: 'Open Library'
        };
      }
      return null;
    } catch (error) {
      console.error('Open Library arama hatası:', error);
      return null;
    }
  };

  const searchGoogleBooks = async (query) => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`
      );
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const book = data.items[0].volumeInfo;
        return {
          title: book.title,
          authors: book.authors ? book.authors.join(', ') : 'Bilinmiyor',
          description: book.description || 'Bu kitap için özet bulunamadı.',
          imageUrl: book.imageLinks?.thumbnail || 'https://via.placeholder.com/128x192?text=No+Image',
          publishedDate: book.publishedDate || 'Bilinmiyor',
          pageCount: book.pageCount || 'Bilinmiyor',
          publisher: book.publisher || 'Bilinmiyor',
          categories: book.categories || ['Bilinmiyor'],
          source: 'Google Books'
        };
      }
      return null;
    } catch (error) {
      console.error('Google Books arama hatası:', error);
      return null;
    }
  };

  const searchBook = async () => {
    if (!searchQuery.trim()) {
      alert('Lütfen bir kitap adı girin.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setBookInfo(null);

    try {
      let bookData = await searchGoogleBooks(searchQuery);
      if (!bookData) {
        bookData = await searchOpenLibrary(searchQuery);
      }

      if (bookData) {
        setBookInfo(bookData);
      } else {
        setError('Kitap bulunamadı. Lütfen farklı bir arama yapın.');
      }
    } catch (error) {
      console.error('Kitap arama hatası:', error);
      setError('Kitap bilgileri alınırken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  const getBookRecommendations = async () => {
    if (!moodQuery.trim()) {
      alert('Lütfen ruh halinizi veya istediğiniz kitap türünü yazın.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setRecommendedBooks([]);

    try {
      const moodKeywords = {
        'mutlu': ['romantic comedy', 'feel-good', 'inspirational'],
        'üzgün': ['motivational', 'self-help', 'inspirational'],
        'heyecanlı': ['thriller', 'adventure', 'mystery'],
        'sakin': ['philosophy', 'poetry', 'nature'],
        'romantik': ['romance', 'love story', 'contemporary romance'],
        'macera': ['adventure', 'action', 'fantasy'],
        'bilim': ['science', 'technology', 'popular science'],
        'tarih': ['history', 'historical fiction', 'biography']
      };

      const query = moodQuery.toLowerCase();
      let searchTerms = [];

      for (const [mood, keywords] of Object.entries(moodKeywords)) {
        if (query.includes(mood)) {
          searchTerms = keywords;
          break;
        }
      }

      if (searchTerms.length === 0) {
        searchTerms = [query];
      }

      const books = [];
      for (const term of searchTerms) {
        const bookData = await searchGoogleBooks(term);
        if (bookData) {
          books.push(bookData);
        }
      }

      if (books.length > 0) {
        setRecommendedBooks(books);
      } else {
        setError('Size uygun kitap önerisi bulunamadı. Lütfen farklı bir arama yapın.');
      }
    } catch (error) {
      console.error('Kitap önerisi hatası:', error);
      setError('Kitap önerileri alınırken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Çıkış yapılırken hata:', error);
      alert('Çıkış yapılırken bir sorun oluştu.');
    }
  };

  const renderBookCard = (book) => (
    <div className="book-card" key={book.title}>
      <div className="book-image">
        <img src={book.imageUrl} alt={book.title} />
      </div>
      <div className="book-info">
        <h3>{book.title}</h3>
        <p className="book-author">Yazar: {book.authors}</p>
        <p className="book-publisher">Yayınevi: {book.publisher}</p>
        <p className="book-year">Yayın Yılı: {book.publishedDate}</p>
        <p className="book-pages">Sayfa Sayısı: {book.pageCount}</p>
        <p className="book-categories">
          Kategoriler: {book.categories.join(', ')}
        </p>
        <div className="book-summary">
          <h4>Kitap Özeti:</h4>
          <p>{book.description}</p>
        </div>
        <p className="book-source">Kaynak: {book.source}</p>
      </div>
    </div>
  );

  return (
    <div className="favorites-container">
      <header className="favorites-header">
        <div className="logo">
          <FaRobot />
          <h1>Yapay Zeka</h1>
        </div>
        <div className="header-buttons">
          <button className="logout-button" onClick={handleLogout}>
            <FaSignOutAlt /> Çıkış
          </button>
        </div>
      </header>

      <div className="tab-container">
        <button 
          className={`tab-button ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          <FaSearch /> Kitap Ara
        </button>
        <button 
          className={`tab-button ${activeTab === 'recommend' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommend')}
        >
          <FaMagic /> Kitap Öner
        </button>
      </div>

      {activeTab === 'search' ? (
        <>
          <div className="search-container">
            <input
              type="text"
              placeholder="Kitap adı girin..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchBook()}
            />
            <button className="search-button" onClick={searchBook}>
              <FaSearch />
            </button>
          </div>

          <div className="content-container">
            {isLoading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Kitap bilgileri aranıyor...</p>
              </div>
            ) : error ? (
              <div className="error-container">
                <p>{error}</p>
              </div>
            ) : bookInfo ? (
              renderBookCard(bookInfo)
            ) : (
              <div className="empty-container">
                <FaBook className="empty-icon" />
                <h2>Kitap Özeti Arama</h2>
                <p>Aradığınız kitabın adını yazın ve yapay zeka destekli özet bilgilerini görüntüleyin.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="search-container">
            <input
              type="text"
              placeholder="Ruh halinizi veya istediğiniz kitap türünü yazın..."
              value={moodQuery}
              onChange={(e) => setMoodQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && getBookRecommendations()}
            />
            <button className="search-button" onClick={getBookRecommendations}>
              <FaMagic />
            </button>
          </div>

          <div className="content-container">
            {isLoading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Kitap önerileri hazırlanıyor...</p>
              </div>
            ) : error ? (
              <div className="error-container">
                <p>{error}</p>
              </div>
            ) : recommendedBooks.length > 0 ? (
              recommendedBooks.map(book => renderBookCard(book))
            ) : (
              <div className="empty-container">
                <FaMagic className="empty-icon" />
                <h2>Kitap Önerisi</h2>
                <p>Ruh halinizi veya istediğiniz kitap türünü yazın, size özel kitap önerileri sunalım.</p>
                <p className="mood-examples">
                  Örnek: "mutlu", "üzgün", "heyecanlı", "romantik", "macera", "bilim", "tarih"
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BookAI;
