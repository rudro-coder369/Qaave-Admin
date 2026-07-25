import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login/Login';
import AdminLayout from './components/Layout/AdminLayout';

// আসল পেজগুলো ইম্পোর্ট করা হলো
import Dashboard from './pages/Dashboard/Dashboard';
import Taxonomy from './pages/Taxonomy/Taxonomy';
import ContentBuilder from './pages/ContentBuilder/ContentBuilder';
import QuestionBank from './pages/QuestionBank/QuestionBank';
import LiveExams from './pages/LiveExams/LiveExams';

// Protected Route Component (লগইন ছাড়া কেউ ড্যাশবোর্ডে ঢুকতে পারবে না)
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

        {/* Protected Admin Routes */}
        <Route path="/" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="taxonomy" element={<Taxonomy />} />
          <Route path="content" element={<ContentBuilder />} />
          <Route path="questions" element={<QuestionBank />} />
          <Route path="exams" element={<LiveExams />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;