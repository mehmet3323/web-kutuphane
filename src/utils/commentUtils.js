import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { firestore, auth } from '../config/firebase';

/**
 * Bir kitaba yorum ekleme fonksiyonu
 * @param {string} bookId - Yorumun ekleneceği kitabın ID'si
 * @param {string} comment - Yorum metni
 * @returns {Promise<Object>} - Eklenen yorumun detayları
 */
export const addBookComment = async (bookId, comment) => {
  try {
    if (!auth.currentUser) {
      throw new Error('Yorum yapabilmek için giriş yapmalısınız.');
    }

    if (!comment.trim()) {
      throw new Error('Yorum boş olamaz.');
    }

    const commentRef = collection(firestore, 'bookComments');
    const newComment = await addDoc(commentRef, {
      userId: auth.currentUser.uid,
      userEmail: auth.currentUser.email,
      bookId: bookId,
      comment: comment.trim(),
      createdAt: serverTimestamp()
    });

    return {
      id: newComment.id,
      userId: auth.currentUser.uid,
      userEmail: auth.currentUser.email,
      bookId: bookId,
      comment: comment.trim(),
      createdAt: new Date()
    };
  } catch (error) {
    console.error('Yorum eklenirken hata:', error);
    throw error;
  }
};

/**
 * Bir kitabın yorumlarını yükleme fonksiyonu
 * @param {string} bookId - Yorumları getirilecek kitabın ID'si
 * @returns {Promise<Array>} - Kitabın yorumları
 */
export const loadBookComments = async (bookId) => {
  try {
    if (!bookId) {
      console.error('Kitap ID si belirtilmedi');
      throw new Error('Geçersiz kitap ID');
    }

    // Firestore bağlantısını kontrol et
    if (!firestore) {
      console.error('Firestore bağlantısı kurulamadı');
      throw new Error('Veritabanı bağlantısı hatası');
    }

    const commentsRef = collection(firestore, 'bookComments');
    const commentsQuery = query(
      commentsRef,
      where('bookId', '==', bookId),
      orderBy('createdAt', 'asc'), // Sıralama yönü 'asc' olarak değiştirildi
      // Performans ve güvenlik için sınırlama
      limit(50)
    );
    
    const commentsSnapshot = await getDocs(commentsQuery);
    
    const comments = commentsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        userEmail: data.userEmail || 'Anonim Kullanıcı'
      };
    });

    console.log(`${bookId} ID'li kitap için ${comments.length} yorum bulundu`);
    return comments;
  } catch (error) {
    console.error(`${bookId} ID'li kitabın yorumları yüklenirken hata:`, error);
    
    // Detaylı hata yönetimi
    if (error.code === 'failed-precondition' || error.message?.includes('requires an index')) {
      console.warn('Firebase indeks hatası: Lütfen gerekli indeksi oluşturun');
    } else if (error.code === 'permission-denied') {
      console.warn('Yorum okuma izni reddedildi');
    }
    
    // Kullanıcıya gösterilebilecek daha açık bir hata mesajı
    throw new Error('Yorumlar yüklenemedi. Lütfen daha sonra tekrar deneyin.');
  }
};

/**
 * Tüm kitapların yorumlarını sıfırlama fonksiyonu
 * @returns {Promise<boolean>} - İşlem başarılı olursa true
 */
// resetAllBookComments fonksiyonu writeBatch kullanıyordu, şimdilik yorum satırına alınıyor.
// export const resetAllBookComments = async () => {
//   try {
//     const commentsSnapshot = await getDocs(collection(firestore, 'bookComments'));
    
//     const batch = firestore.batch(); // writeBatch importu kaldırıldığı için bu satır hata verir.
    
//     commentsSnapshot.docs.forEach(commentDoc => {
//       const commentRef = doc(firestore, 'bookComments', commentDoc.id);
//       batch.delete(commentRef);
//     });
    
//     await batch.commit();
//     return true;
//   } catch (error) {
//     console.error('Yorumlar sıfırlanırken hata:', error);
//     return false;
//   }
// };
