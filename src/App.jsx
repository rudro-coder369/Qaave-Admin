import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login/Login';
import AdminLayout from './components/Layout/AdminLayout';

import Dashboard from './pages/Dashboard/Dashboard';
import Taxonomy from './pages/Taxonomy/Taxonomy';
// 🚀 ContentBuilder ইমপোর্ট করা আছে
import ContentBuilder from './pages/ContentStudio/ContentStudio.jsx';
import QuestionBank from './pages/QuestionBank/QuestionBank';
import LiveExams from './pages/LiveExams/LiveExams';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  if (user) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Route: লগইন করা থাকলে সোজা ড্যাশবোর্ডে পাঠাবে */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

      {/* Protected Admin Routes: লগইন না থাকলে লগইনে পাঠাবে */}
      <Route path="/" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="taxonomy" element={<Taxonomy />} />
        {/* 🚀 FIX: <contentDocumentService /> এর বদলে <ContentBuilder /> বসানো হয়েছে */}
        <Route path="content" element={<ContentBuilder />} />
        <Route path="questions" element={<QuestionBank />} />
        <Route path="exams" element={<LiveExams />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;