import { 
  doc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  serverTimestamp, 
  getDoc 
} from 'firebase/firestore';
import { firestore, auth } from '../config/firebase';

export const toggleLike = async (bookId) => {
  try {
    if (!auth.currentUser) {
      throw new Error('Beğeni yapabilmek için giriş yapmalısınız.');
    }

    const userId = auth.currentUser.uid;
    const likeId = `${bookId}_${userId}`;
    
    const likeRef = doc(firestore, 'bookLikes', likeId);
    const likeDoc = await getDoc(likeRef);
    
    const isLiked = likeDoc.exists() ? likeDoc.data().liked : false;
    
    await setDoc(likeRef, {
      userId: userId,
      bookId: bookId,
      liked: !isLiked,
      updatedAt: serverTimestamp()
    });
    
    await updateBookLikeCount(bookId);
    
    return !isLiked;
  } catch (error) {
    console.error('Beğeni işlemi sırasında hata:', error);
    return false;
  }
};

export const updateBookLikeCount = async (bookId) => {
  try {
    const likesQuery = query(
      collection(firestore, 'bookLikes'),
      where('bookId', '==', bookId),
      where('liked', '==', true)
    );
    
    const likesSnapshot = await getDocs(likesQuery);
    const totalLikes = likesSnapshot.size;
    
    const bookRef = doc(firestore, 'books', bookId);
    await setDoc(bookRef, { likes: totalLikes }, { merge: true });
    
    return totalLikes;
  } catch (error) {
    console.error('Beğeni sayısı güncellenirken hata:', error);
    return 0;
  }
};

export const getUserLikedBooks = async () => {
  try {
    if (!auth.currentUser) return [];
    
    const userId = auth.currentUser.uid;
    
    const likesQuery = query(
      collection(firestore, 'bookLikes'),
      where('userId', '==', userId),
      where('liked', '==', true)
    );
    
    const likesSnapshot = await getDocs(likesQuery);
    return likesSnapshot.docs.map(doc => doc.data().bookId);
  } catch (error) {
    console.error('Beğenilen kitaplar getirilirken hata:', error);
    return [];
  }
};

export const isBookLiked = async (bookId) => {
  try {
    if (!auth.currentUser) return false;
    
    const userId = auth.currentUser.uid;
    const likeId = `${bookId}_${userId}`;
    
    const likeRef = doc(firestore, 'bookLikes', likeId);
    const likeDoc = await getDoc(likeRef);
    
    return likeDoc.exists() && likeDoc.data().liked;
  } catch (error) {
    console.error('Beğeni durumu kontrol edilirken hata:', error);
    return false;
  }
};
