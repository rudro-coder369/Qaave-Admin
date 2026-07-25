import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Layers, FileText, HelpCircle, Calendar, LogOut, LayoutDashboard, Activity } from 'lucide-react';

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Taxonomy', href: '/taxonomy', icon: Layers },
    { name: 'Content Builder', href: '/content', icon: FileText },
    { name: 'Question Bank', href: '/questions', icon: HelpCircle },
    { name: 'Live Exams', href: '/exams', icon: Calendar },
  ];

  // Helper function to format page title neatly
  const getPageTitle = () => {
    if (location.pathname === '/') return 'Dashboard Overview';
    const path = location.pathname.replace('/', '');
    return path.charAt(0).toUpperCase() + path.slice(1);
  };

  return (
    <div className="flex h-screen bg-[#07090E] text-slate-100 font-sans selection:bg-[#2563EB] selection:text-white">
      
      {/* 🚀 Slim & Focused Sidebar */}
      <div className="w-64 bg-[#0B0F19] border-r border-[#1E293B] flex flex-col transition-all duration-300 relative z-20 shrink-0">
        
        {/* Brand / Logo Area (Fixed Height to match Topbar) */}
        <div className="h-16 px-6 flex items-center gap-3.5 border-b border-[#1E293B]">
          <div className="bg-[#2563EB] p-2 rounded-xl shadow-lg shadow-[#2563EB]/20 text-white">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight leading-none">Qaave</h1>
            <p className="text-[9px] font-extrabold text-[#2563EB] uppercase tracking-widest mt-1">Admin Engine</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-3 ml-2 mt-2">Core Modules</p>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-sm transition-all duration-200 group ${
                  isActive 
                    ? 'bg-[#2563EB] text-white shadow-md shadow-[#2563EB]/20' 
                    : 'text-slate-400 hover:text-slate-100 hover:bg-[#1E293B]/50'
                }`}
              >
                <item.icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-[#1E293B] bg-[#07090E]/50">
          <div className="flex items-center gap-3 mb-3 p-2 rounded-xl bg-[#0B0F19] border border-[#1E293B]">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 border border-[#2563EB]/20 flex items-center justify-center text-[#2563EB] font-black uppercase text-xs">
              {user?.email?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 truncate">
              <p className="text-xs font-bold text-slate-200 truncate">{user?.email?.split('@')[0]}</p>
              <p className="text-[10px] text-slate-500 truncate font-medium">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white bg-[#1E293B]/30 hover:bg-[#1E293B] rounded-xl border border-transparent hover:border-[#1E293B] transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* 🖥️ Main Workspace Area (Expanded) */}
      <div className="flex-1 flex flex-col min-w-0 relative bg-[#07090E]">
        
        {/* Subtle Ambient Glow (Only Blue) */}
        <div className="absolute top-0 left-1/2 w-[600px] h-[400px] bg-[#2563EB]/[0.03] rounded-full blur-[100px] pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>

        {/* Slim Topbar */}
        <header className="h-16 bg-[#0B0F19]/80 backdrop-blur-xl border-b border-[#1E293B] z-10 px-6 md:px-8 flex justify-between items-center sticky top-0 shrink-0">
          <h2 className="text-xl font-black text-white capitalize tracking-tight flex items-center gap-2">
            {getPageTitle()}
          </h2>
          
          {/* System Status (Strictly Blue & Slate, No Green) */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse"></div>
            <span className="text-[10px] font-extrabold text-[#2563EB] uppercase tracking-widest">Sys Online</span>
          </div>
        </header>

        {/* 📄 Dynamic Workspace (Maximized Area) */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 relative z-10 custom-scrollbar">
          <Outlet />
        </main>
      </div>

    </div>
  );
}