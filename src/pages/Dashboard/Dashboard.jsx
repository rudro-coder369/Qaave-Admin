import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '../../services/dashboardService';
import { BookOpen, Layers, FileText, HelpCircle, Calendar, ArrowRight, Lightbulb, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ subjectsCount: 0, chaptersCount: 0, topicsCount: 0, questionsCount: 0 });

  useEffect(() => {
    dashboardService.getQuickStats().then(setStats);
  }, []);

  // Workflow Steps strict to Blue & Slate theme
  const workflowSteps = [
    {
      step: 1,
      title: 'সিলেবাস তৈরি করুন',
      desc: 'প্রথমে Taxonomy পেজে গিয়ে বিষয় (Subject), অধ্যায় (Chapter) এবং টপিক (Topic) তৈরি করুন। এটি কন্টেন্টের ভিত্তি।',
      icon: Layers,
      path: '/taxonomy'
    },
    {
      step: 2,
      title: 'পড়ার ম্যাটেরিয়াল দিন',
      desc: 'Content Builder-এ গিয়ে সিলেক্ট করা টপিকের আন্ডারে সংজ্ঞা, সূত্র, বা ব্যাখ্যা (Blocks) যুক্ত করুন।',
      icon: FileText,
      path: '/content'
    },
    {
      step: 3,
      title: 'প্রশ্নমালা (MCQ) সাজান',
      desc: 'Question Bank-এ গিয়ে টপিক ভিত্তিক প্রশ্ন দিন। ২০/৮০ রুলের প্রশ্নগুলোতে "Exam Material" টিক দিন।',
      icon: HelpCircle,
      path: '/questions'
    },
    {
      step: 4,
      title: 'লাইভ এক্সাম শিডিউল',
      desc: 'সবকিছু রেডি হলে Live Exams পেজ থেকে রাত ১০ টার (বা যেকোনো সময়ের) এক্সাম টাইম সেট করুন।',
      icon: Calendar,
      path: '/exams'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10 text-slate-200">
      
      {/* 🚀 Gorgeous Welcome Banner (Pure Royal Blue) */}
      <div className="relative bg-[#2563EB] p-8 md:p-10 rounded-3xl shadow-[0_10px_40px_-15px_rgba(37,99,235,0.6)] overflow-hidden flex items-center justify-between text-white border border-blue-400/30">
        {/* Abstract Background Shapes (Subtle White/Blue glows, NO rainbow) */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-white opacity-10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-900 opacity-30 blur-3xl"></div>
        
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-black mb-2 flex items-center gap-3 tracking-tight">
            স্বাগতম, কন্টেন্ট টিম! <Sparkles className="w-7 h-7 text-white animate-pulse opacity-80" />
          </h1>
          <p className="text-blue-100 text-sm md:text-base max-w-xl font-medium leading-relaxed">
            Qaave লার্নিং ইঞ্জিনের ডেটা এন্ট্রি প্যানেলে আপনাকে স্বাগতম। আপনার গোছানো কন্টেন্টই শিক্ষার্থীদের সাফল্যের চাবিকাঠি! <br/> 
            <span className="text-[11px] font-extrabold uppercase tracking-widest opacity-90 mt-4 inline-block bg-black/20 px-3 py-1.5 rounded-lg border border-white/10 shadow-inner">
              লগইন আইডি: {user?.email}
            </span>
          </p>
        </div>

        <div className="hidden lg:flex relative z-10 bg-black/20 backdrop-blur-md p-5 rounded-2xl border border-white/10 items-start gap-4 max-w-sm shadow-inner">
          <div className="p-2.5 bg-white/10 rounded-xl border border-white/10">
            <Lightbulb className="text-white w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-xs mb-1 uppercase tracking-wider">প্রো-টিপস</h3>
            <p className="text-blue-100 text-xs leading-relaxed font-medium">
              ডেটা এন্ট্রি করার সময় সবসময় ধাপ ১ (Taxonomy) থেকে শুরু করবেন। তাহলে ডাটাবেস একদম নিখুঁত থাকবে।
            </p>
          </div>
        </div>
      </div>

      {/* 📊 Quick Stats (Strict Blue & Slate Theme) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="মোট বিষয় (Subjects)" value={stats.subjectsCount} icon={BookOpen} />
        <StatCard title="মোট অধ্যায় (Chapters)" value={stats.chaptersCount} icon={Layers} />
        <StatCard title="মোট টপিক (Topics)" value={stats.topicsCount} icon={FileText} />
        <StatCard title="মোট প্রশ্ন (MCQ/CQ)" value={stats.questionsCount} icon={HelpCircle} />
      </div>

      {/* 🗺️ Workflow Instructions (Interactive Clean Grid) */}
      <div className="mt-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-2 h-7 bg-[#2563EB] rounded-full shadow-[0_0_15px_rgba(37,99,235,0.6)]"></div>
          <h2 className="text-xl font-black text-white tracking-tight">কাজের ধারাবাহিকতা (Workflow)</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {workflowSteps.map((step) => (
            <div 
              key={step.step}
              onClick={() => navigate(step.path)}
              className="bg-[#0B0F19] p-6 rounded-3xl shadow-lg border border-[#1E293B] hover:border-[#2563EB]/50 hover:shadow-[0_10px_30px_-15px_rgba(37,99,235,0.3)] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group flex flex-col h-full relative overflow-hidden"
            >
              {/* Subtle Blue hover background highlight */}
              <div className={`absolute top-0 left-0 w-full h-1 bg-[#2563EB] opacity-0 group-hover:opacity-100 transition-opacity`}></div>
              
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white bg-[#2563EB] shadow-lg shadow-[#2563EB]/30 group-hover:scale-110 transition-transform duration-300 border border-blue-400/20">
                  {step.step}
                </div>
                <div className="p-3 rounded-2xl bg-[#2563EB]/10 border border-[#2563EB]/20 group-hover:bg-[#2563EB]/20 transition-colors">
                  <step.icon className="w-5 h-5 text-[#2563EB]" />
                </div>
              </div>
              
              <h3 className="text-base font-bold text-slate-200 mb-2 group-hover:text-white transition-colors">{step.title}</h3>
              <p className="text-slate-400 text-xs flex-1 leading-relaxed font-medium">{step.desc}</p>
              
              <div className="mt-6 pt-5 border-t border-[#1E293B] flex items-center font-bold text-xs text-[#2563EB] group-hover:gap-2 transition-all uppercase tracking-wider">
                কাজ শুরু করুন <ArrowRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// 💎 Reusable Stat Card Component (Strict Theme)
function StatCard({ title, value, icon: Icon }) {
  return (
    <div className="bg-[#0B0F19] p-6 rounded-3xl shadow-lg border border-[#1E293B] hover:border-slate-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-5 group cursor-default">
      <div className="p-4 rounded-2xl bg-[#2563EB]/10 border border-[#2563EB]/20 group-hover:scale-110 transition-transform duration-300 shadow-inner text-[#2563EB]">
        <Icon className="w-7 h-7" />
      </div>
      <div>
        <p className="text-slate-500 text-[10px] font-extrabold mb-1 uppercase tracking-widest">{title}</p>
        <p className="text-3xl font-black text-white tracking-tight">{value}</p>
      </div>
    </div>
  );
}