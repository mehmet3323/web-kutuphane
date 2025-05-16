import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
  limit,
  doc,
  getDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, firestore } from '../config/firebase';
import { FaBook, FaSignOutAlt, FaHeart, FaRegHeart, FaComment, FaUser } from 'react-icons/fa';
import './Social.css';

const Social = () => {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [selectedPost, setSelectedPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [comments, setComments] = useState({});
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [comment, setComment] = useState('');
  const [likedPosts, setLikedPosts] = useState(new Set());

  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }
    loadPosts();
  }, [navigate]);

  const loadPosts = async () => {
    try {
      setIsLoading(true);
      const postsQuery = query(
        collection(firestore, 'socialPosts'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      
      const postsSnapshot = await getDocs(postsQuery);
      const postsData = postsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      
      // Load user's liked posts
      const likedPostsQuery = query(
        collection(firestore, 'postLikes'),
        where('userId', '==', auth.currentUser.uid)
      );
      const likedPostsSnapshot = await getDocs(likedPostsQuery);
      const likedPostsSet = new Set(likedPostsSnapshot.docs.map(doc => doc.data().postId));
      
      setLikedPosts(likedPostsSet);
      setPosts(postsData);
    } catch (error) {
      console.error('Paylaşımlar yüklenirken hata:', error);
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
    }
  };

  const handleAddPost = async () => {
    if (!newPost.trim()) return;

    try {
      await addDoc(collection(firestore, 'socialPosts'), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        content: newPost.trim(),
        createdAt: serverTimestamp(),
        likes: 0
      });

      setNewPost('');
      loadPosts();
    } catch (error) {
      console.error('Paylaşım eklenirken hata:', error);
    }
  };

  const handleLike = async (postId) => {
    try {
      // Check if user has already liked this post
      const likeQuery = query(
        collection(firestore, 'postLikes'),
        where('postId', '==', postId),
        where('userId', '==', auth.currentUser.uid)
      );
      
      const likeSnapshot = await getDocs(likeQuery);
      
      if (!likeSnapshot.empty) {
        // User has already liked this post - unlike it
        const likeDoc = likeSnapshot.docs[0];
        await deleteDoc(doc(firestore, 'postLikes', likeDoc.id));
        
        // Update post like count
        const postRef = doc(firestore, 'socialPosts', postId);
        const postDoc = await getDoc(postRef);
        
        if (postDoc.exists()) {
          const currentLikes = postDoc.data().likes || 0;
          await updateDoc(postRef, {
            likes: Math.max(0, currentLikes - 1)
          });
        }
        
        // Update local state
        setLikedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
      } else {
        // Add new like record
        await addDoc(collection(firestore, 'postLikes'), {
          postId: postId,
          userId: auth.currentUser.uid,
          createdAt: serverTimestamp()
        });

        // Update post like count
        const postRef = doc(firestore, 'socialPosts', postId);
        const postDoc = await getDoc(postRef);
        
        if (postDoc.exists()) {
          const currentLikes = postDoc.data().likes || 0;
          await updateDoc(postRef, {
            likes: currentLikes + 1
          });
        }
        
        // Update local state
        setLikedPosts(prev => {
          const newSet = new Set(prev);
          newSet.add(postId);
          return newSet;
        });
      }
      
      loadPosts();
    } catch (error) {
      console.error('Beğeni işlemi sırasında hata:', error);
    }
  };

  const handleComment = async (postId) => {
    try {
      if (!comment.trim()) return;

      await addDoc(collection(firestore, 'postComments'), {
        postId: postId,
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        comment: comment.trim(),
        createdAt: serverTimestamp()
      });

      setComment('');
      loadComments(postId);
    } catch (error) {
      console.error('Yorum eklenirken hata:', error);
    }
  };

  const loadComments = async (postId) => {
    const commentsQuery = query(
      collection(firestore, 'postComments'),
      where('postId', '==', postId),
      orderBy('createdAt', 'asc')
    );
    const commentsSnapshot = await getDocs(commentsQuery);
    const commentsData = commentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }));
    setComments(prev => ({ ...prev, [postId]: commentsData }));
  };

  return (
    <div className="social-container">
      <header className="social-header">
        <div className="logo">
          <FaBook />
          <h1>Sosyal Medya</h1>
        </div>
        <div className="header-buttons">
          <button className="logout-button" onClick={handleLogout}>
            <FaSignOutAlt /> Çıkış
          </button>
        </div>
      </header>

      <div className="post-form">
        <textarea
          placeholder="Bir şeyler paylaşın..."
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
        />
        <button onClick={handleAddPost}>Paylaş</button>
      </div>

      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Paylaşımlar yükleniyor...</p>
        </div>
      ) : (
        <div className="posts-container">
          {posts.map((post) => (
            <div key={post.id} className="post-card">
              <div className="post-header">
                <FaUser className="user-icon" />
                <span className="post-author">{post.userEmail}</span>
                <span className="post-date">
                  {post.createdAt?.toLocaleString('tr-TR')}
                </span>
              </div>
              <div className="post-content">{post.content}</div>
              <div className="post-actions">
                <button 
                  className={`like-button ${likedPosts.has(post.id) ? 'liked' : ''}`}
                  onClick={() => handleLike(post.id)}
                >
                  {likedPosts.has(post.id) ? <FaHeart /> : <FaRegHeart />}
                  <span>{post.likes || 0}</span>
                </button>
                <button 
                  className="comment-button"
                  onClick={() => {
                    setSelectedPost(post);
                    loadComments(post.id);
                    setShowCommentModal(true);
                  }}
                >
                  <FaComment /> Yorumlar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCommentModal && selectedPost && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Yorumlar</h2>
            
            <div className="comments-container">
              {comments[selectedPost.id]?.length > 0 ? (
                <div className="comments-list">
                  {comments[selectedPost.id].map((comment) => (
                    <div key={comment.id} className="comment-item">
                      <div className="comment-header">
                        <span className="comment-author">{comment.userEmail}</span>
                        <span className="comment-date">
                          {comment.createdAt?.toLocaleString('tr-TR')}
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
              />
              
              <div className="modal-buttons">
                <button onClick={() => {
                  setShowCommentModal(false);
                  setComment('');
                }}>
                  İptal
                </button>
                <button onClick={() => handleComment(selectedPost.id)}>
                  Yorum Ekle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Social; 