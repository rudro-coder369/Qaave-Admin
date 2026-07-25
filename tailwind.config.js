/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#07090E',     // মেইন ডার্ক ব্যাকগ্রাউন্ড
        surface: '#0B0F19',     // কার্ড বা কন্টেইনার ব্যাকগ্রাউন্ড
        line: '#1E293B',        // বর্ডার বা ডিভাইডার কালার
        accent: '#2563EB',      // একমাত্র অ্যাকসেন্ট রয়্যাল ব্লু
      },
    },
  },
  plugins: [],
}