import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { firestore } from '../config/firebase';
import { libraryBooks } from '../data/libraryBooks';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card, CardContent, Typography, Grid, Box, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import Navbar from './Navbar';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  borderRadius: '18px',
  boxShadow: '0 6px 32px rgba(44,102,159,0.10)',
  transition: 'transform 0.2s cubic-bezier(.4,2,.6,1)',
  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  '&:hover': {
    transform: 'translateY(-7px) scale(1.01)',
    boxShadow: '0 12px 40px rgba(44,102,159,0.18)',
  },
}));

const COLORS = ['#4c669f', '#6a1b9a', '#ff9800', '#43a047', '#e53935'];

// Custom label for better multiline and ellipsis
const CustomXAxisTick = ({ x, y, payload }) => {
  let label = payload.value;
  if (label.length > 18) label = label.slice(0, 16) + '...';
  else if (label.length > 10) label = label.slice(0, 10) + '\n' + label.slice(10);
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="end" fill="#333" fontSize={12} fontWeight="bold">
        {label.split('\n').map((line, i) => (
          <tspan x={0} dy={i === 0 ? 0 : 14} key={i}>{line}</tspan>
        ))}
      </text>
    </g>
  );
};

const Statistics = () => {
  const [loading, setLoading] = useState(true);
  const [mostLikedBooks, setMostLikedBooks] = useState([]);
  const [mostReadBooks, setMostReadBooks] = useState([]);
  const [topReaders, setTopReaders] = useState([]);
  const [mostLikedPosts, setMostLikedPosts] = useState([]);
  const [mostCommentedPosts, setMostCommentedPosts] = useState([]);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const books = [...libraryBooks];
      for (const book of books) {
        const likesQuery = query(
          collection(firestore, 'bookLikes'),
          where('bookId', '==', book.id),
          where('liked', '==', true)
        );
        const likesSnapshot = await getDocs(likesQuery);
        book.likes = likesSnapshot.size;
      }
      for (const book of books) {
        const readsQuery = query(
          collection(firestore, 'bookReads'),
          where('bookId', '==', book.id),
          where('read', '==', true)
        );
        const readsSnapshot = await getDocs(readsQuery);
        book.reads = readsSnapshot.size;
      }
      const sortedByLikes = [...books].sort((a, b) => b.likes - a.likes).slice(0, 5);
      setMostLikedBooks(sortedByLikes);
      const sortedByReads = [...books].sort((a, b) => b.reads - a.reads).slice(0, 5);
      setMostReadBooks(sortedByReads);

      const readsQuery = query(collection(firestore, 'bookReads'), where('read', '==', true));
      const readsSnapshot = await getDocs(readsQuery);
      const userReadCounts = {};
      readsSnapshot.docs.forEach(doc => {
        const { userEmail } = doc.data();
        if (userEmail) {
          userReadCounts[userEmail] = (userReadCounts[userEmail] || 0) + 1;
        }
      });
      const sortedReaders = Object.entries(userReadCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([email, count]) => ({ name: email.split('@')[0], value: count }));
      setTopReaders(sortedReaders);

      const postsQuery = query(collection(firestore, 'socialPosts'), orderBy('likes', 'desc'));
      const postsSnapshot = await getDocs(postsQuery);
      const posts = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMostLikedPosts(posts.slice(0, 5));

      const commentsQuery = query(collection(firestore, 'postComments'));
      const commentsSnapshot = await getDocs(commentsQuery);
      const postCommentCounts = {};
      commentsSnapshot.docs.forEach(doc => {
        const { postId } = doc.data();
        if (postId) {
          postCommentCounts[postId] = (postCommentCounts[postId] || 0) + 1;
        }
      });
      const postsWithComments = posts.map(post => ({
        ...post,
        commentCount: postCommentCounts[post.id] || 0
      }));
      const sortedByComments = [...postsWithComments].sort((a, b) => b.commentCount - a.commentCount).slice(0, 5);
      setMostCommentedPosts(sortedByComments);
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="80vh">
        <Navbar />
        <CircularProgress sx={{ mt: 8 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 0, background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
      <Navbar />
      <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
        <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 4, fontWeight: 700, color: '#2c3e50' }}>
          İstatistikler
        </Typography>
        <Grid container spacing={4}>
          {/* En Çok Beğenilen Kitaplar */}
          <Grid item xs={12} md={6}>
            <StyledCard>
              <CardContent>
                <Typography variant="h6" gutterBottom align="center" sx={{ fontWeight: 600 }}>
                  En Çok Beğenilen Kitaplar
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mostLikedBooks} margin={{ left: 10, right: 10, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="title" tick={<CustomXAxisTick />} interval={0} height={60} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="likes" fill="#4c669f" radius={[8,8,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </StyledCard>
          </Grid>

          {/* En Çok Okunan Kitaplar */}
          <Grid item xs={12} md={6}>
            <StyledCard>
              <CardContent>
                <Typography variant="h6" gutterBottom align="center" sx={{ fontWeight: 600 }}>
                  En Çok Okunan Kitaplar
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mostReadBooks} margin={{ left: 10, right: 10, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="title" tick={<CustomXAxisTick />} interval={0} height={60} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="reads" stroke="#6a1b9a" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </StyledCard>
          </Grid>

          {/* En Çok Kitap Okuyan Kullanıcılar */}
          <Grid item xs={12} md={6}>
            <StyledCard>
              <CardContent>
                <Typography variant="h6" gutterBottom align="center" sx={{ fontWeight: 600 }}>
                  En Çok Kitap Okuyan Kullanıcılar
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={topReaders}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={90}
                        fill="#8884d8"
                        dataKey="value"
                        stroke="#fff"
                        strokeWidth={2}
                      >
                        {topReaders.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </StyledCard>
          </Grid>

          {/* En Çok Beğenilen Gönderiler */}
          <Grid item xs={12} md={6}>
            <StyledCard>
              <CardContent>
                <Typography variant="h6" gutterBottom align="center" sx={{ fontWeight: 600 }}>
                  En Çok Beğenilen Gönderiler
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mostLikedPosts} margin={{ left: 10, right: 10, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="content" tick={<CustomXAxisTick />} interval={0} height={60} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="likes" fill="#ff9800" radius={[8,8,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </StyledCard>
          </Grid>

          {/* En Çok Yorum Alan Gönderiler */}
          <Grid item xs={12}>
            <StyledCard>
              <CardContent>
                <Typography variant="h6" gutterBottom align="center" sx={{ fontWeight: 600 }}>
                  En Çok Yorum Alan Gönderiler
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mostCommentedPosts} margin={{ left: 10, right: 10, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="content" tick={<CustomXAxisTick />} interval={0} height={60} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="commentCount" fill="#43a047" radius={[8,8,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </StyledCard>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default Statistics; 