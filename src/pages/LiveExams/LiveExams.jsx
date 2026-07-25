import { useState, useEffect } from 'react';
import { taxonomyApi } from '../../services/taxonomyService';
import { examService } from '../../services/examService';
import toast, { Toaster } from 'react-hot-toast';
import { Calendar, Clock, BookOpen, PlusCircle, CheckCircle, Radio, Layers, AlignLeft, CalendarClock, Settings2, CheckSquare, Loader2 } from 'lucide-react';

export default function LiveExams() {
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [scheduledExams, setScheduledExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // Form State
  const [selectedSub, setSelectedSub] = useState('');
  const [examForm, setExamForm] = useState({
    title: '',
    date: '',
    time: '22:00', // Default রাত ১০টা
    duration: 20, // 20 minutes default
    totalQuestions: 25, // 25 qs default
    selectedChapterId: '' // আপাতত একটি চ্যাপ্টারের এক্সাম
  });

  useEffect(() => { 
    taxonomyApi.getSubjects().then(setSubjects).catch(err => toast.error(err.message));
    loadExams();
  }, []);

  useEffect(() => {
    if (selectedSub) {
      taxonomyApi.getChapters(selectedSub).then(setChapters).catch(err => toast.error(err.message));
    }
  }, [selectedSub]);

  const loadExams = async () => {
    try {
      setIsFetching(true);
      const data = await examService.getScheduledExams();
      setScheduledExams(data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsFetching(false);
    }
  };

  const handleScheduleExam = async (e) => {
    e.preventDefault();
    if (!examForm.selectedChapterId) return toast.error("Please select a chapter!");
    if (!examForm.date || !examForm.time) return toast.error("Please set date and time!");

    // Combine date and time to ISO string
    const runAt = new Date(`${examForm.date}T${examForm.time}:00`).toISOString();

    try {
      setLoading(true);
      await examService.scheduleLiveExam(
        examForm.title,
        runAt,
        examForm.duration,
        examForm.totalQuestions,
        [examForm.selectedChapterId] // Array হিসেবে পাঠাচ্ছি API এর জন্য
      );
      toast.success("Live Exam Scheduled Successfully!");
      loadExams();
      
      // Reset form slightly
      setExamForm({ ...examForm, title: '', selectedChapterId: '' });
    } catch (error) {
      toast.error("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] text-slate-200">
      <Toaster position="top-right" toastOptions={{ style: { background: '#0B0F19', color: '#F1F5F9', border: '1px solid #1E293B' } }} />
      
      {/* 🚀 Top Header */}
      <div className="bg-[#0B0F19] p-4 rounded-2xl border border-[#1E293B] mb-5 flex flex-col lg:flex-row items-center justify-between gap-4 shrink-0 shadow-lg">
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl shadow-inner relative">
            <Radio className="w-6 h-6 text-rose-500" />
            <span className="absolute top-2 right-2 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight leading-none">Live Exam Scheduler</h1>
            <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest mt-1.5">Automate Daily Challenges</p>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0 pb-2">
        
        {/* ==========================================
            LEFT: SCHEDULE FORM PANEL (5 Columns)
        ========================================== */}
        <div className="lg:col-span-5 bg-[#0B0F19] rounded-2xl shadow-lg border border-[#1E293B] flex flex-col h-full overflow-hidden">
          
          <div className="p-4 bg-[#07090E]/80 border-b border-[#1E293B] flex items-center gap-2 shrink-0">
            <CalendarClock className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest">Deploy New Exam</h2>
          </div>
          
          <form onSubmit={handleScheduleExam} className="flex-1 overflow-y-auto p-5 flex flex-col space-y-5 custom-scrollbar">
            
            {/* Step 1: Syllabus Selection */}
            <div className="bg-[#07090E]/50 p-4 rounded-xl border border-[#1E293B]">
              <h3 className="text-[10px] font-black text-[#2563EB] uppercase tracking-widest mb-3 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5" /> Step 1: Target Syllabus
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Select Subject</label>
                  <select className="w-full p-3 bg-[#0B0F19] border border-[#1E293B] rounded-xl focus:ring-1 focus:ring-[#2563EB] outline-none text-xs font-bold text-slate-300 transition-all shadow-inner" value={selectedSub} onChange={(e) => setSelectedSub(e.target.value)}>
                    <option value="" className="bg-[#0B0F19]">-- Choose Subject --</option>
                    {subjects.map(s => <option key={s.id} value={s.id} className="bg-[#0B0F19]">{s.name}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Select Chapter</label>
                  <select className="w-full p-3 bg-[#0B0F19] border border-[#1E293B] rounded-xl focus:ring-1 focus:ring-[#2563EB] outline-none text-xs font-bold text-slate-300 transition-all shadow-inner disabled:opacity-40" value={examForm.selectedChapterId} onChange={(e) => setExamForm({...examForm, selectedChapterId: e.target.value})} disabled={!selectedSub} required>
                    <option value="" className="bg-[#0B0F19]">-- Choose Chapter --</option>
                    {chapters.map(c => <option key={c.id} value={c.id} className="bg-[#0B0F19]">Ch {c.chapter_number}: {c.title}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Step 2: Exam Meta */}
            <div className="bg-[#07090E]/50 p-4 rounded-xl border border-[#1E293B]">
              <h3 className="text-[10px] font-black text-[#2563EB] uppercase tracking-widest mb-3 flex items-center gap-2">
                <AlignLeft className="w-3.5 h-3.5" /> Step 2: Exam Details
              </h3>
              
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Exam Title / Label</label>
              <input 
                type="text" required
                className="w-full p-3 bg-[#0B0F19] border border-[#1E293B] rounded-xl focus:ring-1 focus:ring-[#2563EB] outline-none text-xs font-medium text-slate-200 shadow-inner placeholder:text-slate-600"
                placeholder="e.g. Physics Ch-2 Mega Test (Pro)"
                value={examForm.title} onChange={(e) => setExamForm({...examForm, title: e.target.value})}
              />
            </div>

            {/* Step 3: Timing & Limits */}
            <div className="bg-[#07090E]/50 p-4 rounded-xl border border-[#1E293B]">
              <h3 className="text-[10px] font-black text-[#2563EB] uppercase tracking-widest mb-3 flex items-center gap-2">
                <Settings2 className="w-3.5 h-3.5" /> Step 3: Scheduling & Limits
              </h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Live Date</label>
                  <input 
                    type="date" required
                    className="w-full p-3 bg-[#0B0F19] border border-[#1E293B] rounded-xl focus:ring-1 focus:ring-[#2563EB] outline-none text-xs font-medium text-slate-200 shadow-inner [color-scheme:dark]"
                    value={examForm.date} onChange={(e) => setExamForm({...examForm, date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Start Time</label>
                  <input 
                    type="time" required
                    className="w-full p-3 bg-[#0B0F19] border border-[#1E293B] rounded-xl focus:ring-1 focus:ring-[#2563EB] outline-none text-xs font-medium text-slate-200 shadow-inner [color-scheme:dark]"
                    value={examForm.time} onChange={(e) => setExamForm({...examForm, time: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Duration (Mins)</label>
                  <input 
                    type="number" required min="1"
                    className="w-full p-3 bg-[#0B0F19] border border-[#1E293B] rounded-xl focus:ring-1 focus:ring-[#2563EB] outline-none text-xs font-medium text-slate-200 shadow-inner placeholder:text-slate-600 text-center"
                    value={examForm.duration} onChange={(e) => setExamForm({...examForm, duration: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Question Count</label>
                  <input 
                    type="number" required min="1"
                    className="w-full p-3 bg-[#0B0F19] border border-[#1E293B] rounded-xl focus:ring-1 focus:ring-[#2563EB] outline-none text-xs font-medium text-slate-200 shadow-inner placeholder:text-slate-600 text-center"
                    value={examForm.totalQuestions} onChange={(e) => setExamForm({...examForm, totalQuestions: parseInt(e.target.value)})}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 shrink-0">
              <button type="submit" disabled={loading} className="w-full py-4 bg-[#2563EB] text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-[#2563EB]/25 hover:bg-blue-600 transform hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-500/50">
                {loading ? <><Loader2 className="w-5 h-5 animate-spin"/> Scheduling...</> : <><PlusCircle className="w-5 h-5" /> Schedule Live Exam</>}
              </button>
            </div>
          </form>
        </div>

        {/* ==========================================
            RIGHT: SCHEDULED EXAMS LIST (7 Columns)
        ========================================== */}
        <div className="lg:col-span-7 flex flex-col bg-[#0B0F19] rounded-2xl shadow-lg border border-[#1E293B] overflow-hidden">
          <div className="p-4 bg-[#07090E]/80 border-b border-[#1E293B] flex justify-between items-center shrink-0">
            <h2 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[#2563EB]" /> Execution Timeline
            </h2>
            <span className="px-3 py-1 bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20 font-black text-[10px] uppercase tracking-widest rounded-lg shadow-inner">
              {scheduledExams.length} Routines
            </span>
          </div>
          
          <div className="flex-1 p-5 overflow-y-auto space-y-4 custom-scrollbar">
            {isFetching ? (
               <div className="flex flex-col items-center justify-center h-full text-slate-500">
                 <Loader2 className="w-8 h-8 animate-spin text-[#2563EB] mb-3" />
                 <p className="text-[10px] font-bold uppercase tracking-widest">Fetching Timeline...</p>
               </div>
            ) : scheduledExams.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-60">
                <Calendar className="w-12 h-12 mb-3 text-slate-600" />
                <p className="text-[10px] font-bold uppercase tracking-widest">No exams scheduled yet.</p>
              </div>
            ) : (
              scheduledExams.map((schedule) => {
                const isPending = schedule.status === 'pending';
                
                return (
                  <div key={schedule.id} className="bg-[#07090E]/50 p-5 rounded-2xl border border-[#1E293B] hover:border-[#2563EB]/50 transition-all duration-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
                    
                    {/* Status Glow (Left Border Accent) */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${isPending ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>

                    <div className="pl-2">
                      <h3 className="font-bold text-slate-200 text-sm mb-2">{schedule.exams.title}</h3>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-[#0B0F19] text-slate-400 border border-[#1E293B] px-2.5 py-1 rounded-md">
                          <Clock className="w-3 h-3 text-[#2563EB]"/> {formatDateTime(schedule.run_at)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-[#0B0F19] text-slate-400 border border-[#1E293B] px-2.5 py-1 rounded-md">
                          <BookOpen className="w-3 h-3 text-[#2563EB]"/> {schedule.exams.total_questions} Qs / {schedule.exams.duration_minutes} Mins
                        </span>
                      </div>
                    </div>
                    
                    <div className="pl-2 sm:pl-0 shrink-0">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                        isPending 
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]' 
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                      }`}>
                        {!isPending ? <CheckCircle className="w-3 h-3"/> : <Clock className="w-3 h-3"/>}
                        {schedule.status}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}