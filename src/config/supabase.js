import { createClient } from '@supabase/supabase-js';
import { auth } from './firebase'; // ফায়ারবেস অথ ইমপোর্ট

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    // 🚀 কাস্টম ফেচ: apikey যেন মুছে না যায়, তার জন্য Headers অবজেক্ট ব্যবহার করা হয়েছে
    fetch: async (url, options = {}) => {
      const user = auth.currentUser;
      const headers = new Headers(options.headers); // 👈 সঠিক পদ্ধতি

      if (user) {
        const token = await user.getIdToken();
        headers.set('Authorization', `Bearer ${token}`);
      }

      return fetch(url, { ...options, headers });
    }
  }
});