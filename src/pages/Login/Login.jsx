import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase'; // ফায়ারবেস অথ
import { supabase } from '../../config/supabase'; // 👈 সুপাবেস ইমপোর্ট করা হলো
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { BookOpen } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // ১. ফায়ারবেস দিয়ে লগইন
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // ২. সুপাবেস এজ ফাংশন কল করে 'role: authenticated' ক্লেইম বসানো এবং প্রোফাইল সিঙ্ক করা
      const token = await userCredential.user.getIdToken();
      await supabase.functions.invoke('ensure-profile', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // ৩. নতুন ক্লেইমসহ টোকেন ফোর্স-রিফ্রেশ করা (সবচেয়ে গুরুত্বপূর্ণ, এটি না থাকলে 401 এরর আসবে)
      await userCredential.user.getIdToken(true);

      toast.success('Successfully logged in!');
      
      // 🚀 সফল লগইনের পর ড্যাশবোর্ডে রিডাইরেক্ট করা
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 1000); 

    } catch (error) {
      toast.error(error.message || 'Login Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Toaster position="top-right" />
      <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="bg-primary p-3 rounded-full">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Qaave Admin
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to manage your educational content
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                type="email"
                required
                className="appearance-none rounded relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                type="password"
                required
                className="appearance-none rounded relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}