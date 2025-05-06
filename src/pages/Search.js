import React, { useState } from 'react';
import SearchComponent from '../components/SearchComponent';
import CardComponent from '../components/CardComponent';




// Örnek kitap verileri
const bookData = [
  {
    id: '1',
    title: 'Suç ve Ceza',
    location: 'Dünya Klasikleri',
    rating: '4.8',
    image: { uri: 'https://example.com/suc-ve-ceza.jpg' },
  },
  {
    id: '2',
    title: 'Sefiller',
    location: 'Dünya Klasikleri',
    rating: '4.7',
    image: { uri: 'https://example.com/sefiller.jpg' },
  },
  {
    id: '3',
    title: 'Tutunamayanlar',
    location: 'Türk Edebiyatı',
    rating: '4.6',
    image: { uri: 'https://example.com/tutunamayanlar.jpg' },
  },
  {
    id: '4',
    title: 'Kürk Mantolu Madonna',
    location: 'Türk Edebiyatı',
    rating: '4.5',
    image: { uri: 'https://example.com/kurk-mantolu-madonna.jpg' },
  },
];

// Kategori verileri
const categories = [
  { id: '1', name: 'Tümü' },
  { id: '2', name: 'Dünya Klasikleri' },
  { id: '3', name: 'Türk Edebiyatı' },
  { id: '4', name: 'Bilim Kurgu' },
  { id: '5', name: 'Fantastik' },
];

const Search = () => {
  const [selectedCategory, setSelectedCategory] = useState('1');
  const [filteredBooks, setFilteredBooks] = useState(bookData);

  // Kategori seçildiğinde kitapları filtrele
  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);

    if (categoryId === '1') {
      // Tümü seçildiğinde tüm kitapları göster
      setFilteredBooks(bookData);
    } else {
      // Seçilen kategoriye göre filtrele
      const category = categories.find(cat => cat.id === categoryId);
      const filtered = bookData.filter(book => book.location === category.name);
      setFilteredBooks(filtered);
    }
  };

  return (
    <div className="search-container">
      <div className="search-header">
        <p className="search-header-title">Kitap Ara</p>
      </div>

      <div className="search-input-container">
        <SearchComponent />
      </div>

      <div className="search-category-container">
        <div className="search-category-scroll">
          {categories.map((category) => (
            <button
              key={category.id}
              className={`search-category-button ${selectedCategory === category.id ? 'selected-category' : ''}`}
              onClick={() => handleCategorySelect(category.id)}
            >
              <span
                className={`search-category-text ${selectedCategory === category.id ? 'selected-category-text' : ''}`}
              >
                {category.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="search-book-list">
        {filteredBooks.map((item) => (
          <CardComponent
            key={item.id}
            title={item.title}
            location={item.location}
            rating={item.rating}
            image={item.image}
          />
        ))}
      </div>
    </div>
  );
};

export default Search;
