import { useState, useEffect } from 'react';
import { taxonomyApi } from '../../services/taxonomyService';
import { examService } from '../../services/examService';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Calendar, Clock, BookOpen, CheckCircle, Radio, 
  CalendarClock, CheckSquare, Loader2, Target, GraduationCap, 
  RefreshCcw, Database, Trash2, Edit, XCircle, Archive
} from 'lucide-react';

import LiveExamExcelUpload from './LiveExamExcelUpload'; 

export default function LiveExams() {
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [scheduledExams, setScheduledExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  
  // 🚀 TABS FOR TIMELINE (Active vs History)
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history'

  const [editMode, setEditMode] = useState(null); 
  const [previewQuestions, setPreviewQuestions] = useState([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const [selectedSub, setSelectedSub] = useState('');
  const [examForm, setExamForm] = useState({
    title: '',
    date: '',
    time: '22:00',
    duration: 25, 
    totalQuestions: 25, 
    selectedChapterId: '', 
    targetClass: 'SSC',       
    targetBatchYear: 2027     
  });

  useEffect(() => { 
    taxonomyApi.getSubjects().then(setSubjects).catch(err => toast.error(err.message));
    loadExams();
    
    // UI Update interval to refresh Live/Ended status dynamically
    const interval = setInterval(() => {
      setScheduledExams([...scheduledExams]);
    }, 60000); // refresh every minute
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleGeneratePreview = async (e) => {
    if (e) e.preventDefault();
    if (!examForm.selectedChapterId) return toast.error("Please select a Chapter first!");
    if (!examForm.totalQuestions || examForm.totalQuestions < 1) return toast.error("Invalid question count!");

    try {
      setIsPreviewLoading(true);
      const questions = await examService.generateQuestionPool([examForm.selectedChapterId], examForm.totalQuestions);
      setPreviewQuestions(questions);
      
      if (questions.length === 0) {
        toast.error("No questions found! Please upload via Excel.", { icon: '⚠️' });
      } else if (questions.length < examForm.totalQuestions) {
        toast.success(`Found only ${questions.length} questions. You need ${examForm.totalQuestions - questions.length} more!`);
      } else {
        toast.success(`Successfully shuffled ${questions.length} questions!`, { icon: '🎲' });
      }
    } catch (error) {
      toast.error("Failed to load preview: " + error.message);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleDeployOrUpdate = async (e) => {
    e.preventDefault();
    
    if (!editMode) {
      const isDuplicate = scheduledExams.some(schedule => {
        if (!schedule.exams) return false;
        return (
          schedule.exams.title.trim().toLowerCase() === examForm.title.trim().toLowerCase() &&
          schedule.exams.target_class === examForm.targetClass &&
          Number(schedule.exams.target_batch_year) === Number(examForm.targetBatchYear)
        );
      });

      if (isDuplicate) {
        return toast.error(`An exam named "${examForm.title}" for ${examForm.targetClass} '${examForm.targetBatchYear}' already exists!`);
      }
    }

    if (!editMode && previewQuestions.length === 0) return toast.error("Generate a preview first!");
    if (!editMode && previewQuestions.length < examForm.totalQuestions) return toast.error("Not enough questions in repository to deploy!");
    if (!examForm.date || !examForm.time) return toast.error("Please set date and time!");

    const runAt = new Date(`${examForm.date}T${examForm.time}:00`).toISOString();
    const finalQuestionIds = previewQuestions.length > 0 ? previewQuestions.map(q => q.id) : null; 

    try {
      setLoading(true);
      if (editMode) {
        await examService.updateScheduledExam(
          editMode.schedulerId, editMode.examId, examForm.title, runAt, examForm.duration,
          examForm.targetClass, examForm.targetBatchYear,
          examForm.selectedChapterId ? [examForm.selectedChapterId] : null, finalQuestionIds
        );
        toast.success("Live Exam Updated Successfully!");
      } else {
        await examService.scheduleLiveExam(
          examForm.title, runAt, examForm.duration, examForm.targetClass,
          examForm.targetBatchYear, [examForm.selectedChapterId], finalQuestionIds 
        );
        toast.success("Live Exam Deployed Successfully!");
      }
      
      loadExams();
      setExamForm({ ...examForm, title: '', selectedChapterId: '' });
      setPreviewQuestions([]);
      setEditMode(null);
    } catch (error) {
      toast.error("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (schedule) => {
    const exam = schedule.exams;
    const localDate = new Date(schedule.run_at);
    
    const pad = (n) => n.toString().padStart(2, '0');
    const dateStr = `${localDate.getFullYear()}-${pad(localDate.getMonth() + 1)}-${pad(localDate.getDate())}`;
    const timeStr = `${pad(localDate.getHours())}:${pad(localDate.getMinutes())}`;

    setExamForm({
      ...examForm,
      title: exam.title, date: dateStr, time: timeStr, duration: exam.duration_minutes,
      totalQuestions: exam.total_questions, targetClass: exam.target_class, targetBatchYear: exam.target_batch_year,
      selectedChapterId: '' 
    });
    setEditMode({ schedulerId: schedule.id, examId: exam.id });
    setPreviewQuestions([]);
    setActiveTab('active');
    toast("Edit mode active. Change details and click Update.", { icon: '✍️' });
  };

  const handleDeleteExam = async (schedulerId, examId) => {
    if (!window.confirm("Are you sure you want to completely delete this pending exam?")) return;
    try {
      setIsFetching(true);
      await examService.deleteScheduledExam(schedulerId, examId);
      setScheduledExams(prev => prev.filter(s => s.id !== schedulerId));
      if (editMode?.schedulerId === schedulerId) cancelEdit();
      toast.success("Scheduled exam deleted successfully!");
    } catch (error) {
      toast.error("Delete failed: " + error.message);
      loadExams(); 
    } finally {
      setIsFetching(false);
    }
  };

  const cancelEdit = () => {
    setEditMode(null);
    setExamForm({ ...examForm, title: '', selectedChapterId: '' });
    setPreviewQuestions([]); 
    toast("Edit mode cancelled.");
  };

  const formatDateTime = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // ==========================================
  // 🚀 MAGIC MATH LOGIC (Real-time Filtering)
  // ==========================================
  const now = new Date();
  
  const filteredExams = scheduledExams.filter(schedule => {
    const runAt = new Date(schedule.run_at);
    const durationMin = schedule.exams?.duration_minutes || 0;
    const endTime = new Date(runAt.getTime() + durationMin * 60000);
    
    if (activeTab === 'active') {
      return endTime > now; // Upcoming or currently Live
    } else {
      return endTime <= now; // Ended (History)
    }
  });

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] text-slate-200">
      <Toaster position="top-right" toastOptions={{ style: { background: '#0B0F19', color: '#F1F5F9', border: '1px solid #1E293B' } }} />
      
      {/* 🚀 Top Header */}
      <div className="bg-gradient-to-r from-[#0B0F19] to-[#07090E] p-5 rounded-2xl border border-[#1E293B] mb-5 flex flex-col lg:flex-row items-center justify-between gap-4 shrink-0 shadow-[0_0_40px_rgba(37,99,235,0.05)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="flex items-center gap-4 w-full lg:w-auto z-10">
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl shadow-inner relative">
            <Radio className="w-6 h-6 text-rose-500" />
            <span className="absolute top-2 right-2 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight leading-none">Live Exam Scheduler</h1>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
              <Target className="w-3 h-3" /> Master Control Panel
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-5 min-h-0 pb-2">
        
        {/* ==========================================
            COLUMN 1: SETUP FORM
        ========================================== */}
        <div className="xl:col-span-4 bg-[#0B0F19] rounded-2xl shadow-lg border border-[#1E293B] flex flex-col h-full overflow-hidden relative">
          {/* Form Content - Same as before */}
          {editMode && (
            <div className="absolute top-0 left-0 right-0 bg-amber-500/90 text-black text-[10px] font-black uppercase tracking-widest py-1.5 text-center z-20 flex items-center justify-center gap-2 shadow-lg">
              <Edit className="w-3.5 h-3.5" /> Editing Existing Exam
            </div>
          )}

          <div className={`p-4 bg-[#07090E]/80 border-b border-[#1E293B] flex items-center gap-2 shrink-0 ${editMode ? 'pt-8' : ''}`}>
            <CalendarClock className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest">1. Exam Setup</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 flex flex-col space-y-6 custom-scrollbar">
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Class Level</label>
                  <select className="w-full p-2.5 bg-[#0B0F19] border border-[#1E293B] rounded-xl focus:ring-1 focus:ring-[#2563EB] outline-none text-xs font-bold text-slate-300" 
                          value={examForm.targetClass} onChange={(e) => setExamForm({...examForm, targetClass: e.target.value})}>
                    <option value="SSC">SSC</option>
                    <option value="HSC">HSC</option>
                    <option value="Admission">Admission</option>
                    <option value="JSC">JSC</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Batch Year</label>
                  <input 
                    type="number" required min="2020" max="2035"
                    className="w-full p-2.5 bg-[#0B0F19] border border-[#1E293B] rounded-xl focus:ring-1 focus:ring-[#2563EB] outline-none text-xs font-bold text-slate-300 text-center"
                    value={examForm.targetBatchYear} onChange={(e) => setExamForm({...examForm, targetBatchYear: parseInt(e.target.value)})}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Subject & Chapter</label>
                <select className="w-full p-2.5 mb-3 bg-[#0B0F19] border border-[#1E293B] rounded-xl focus:ring-1 focus:ring-[#2563EB] outline-none text-xs font-bold text-slate-300" 
                        value={selectedSub} onChange={(e) => setSelectedSub(e.target.value)}>
                  <option value="">-- Choose Subject --</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select className="w-full p-2.5 bg-[#0B0F19] border border-[#1E293B] rounded-xl focus:ring-1 focus:ring-[#2563EB] outline-none text-xs font-bold text-slate-300 disabled:opacity-40" 
                        value={examForm.selectedChapterId} onChange={(e) => setExamForm({...examForm, selectedChapterId: e.target.value})} disabled={!selectedSub} required={!editMode}>
                  <option value="">-- Choose Chapter --</option>
                  {chapters.map(c => <option key={c.id} value={c.id}>Ch {c.chapter_number}: {c.title}</option>)}
                </select>
              </div>
            </div>

            <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
               <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                 <Database className="w-3.5 h-3.5" /> External Questions
               </h3>
               <LiveExamExcelUpload 
                 selectedSub={selectedSub}
                 selectedChap={examForm.selectedChapterId}
                 selectedTop={null} 
                 boards={[]} 
                 fetchQuestions={handleGeneratePreview} 
                 isSavingQuestion={isSavingQuestion}
                 setIsSavingQuestion={setIsSavingQuestion}
               />
            </div>

            <div className="space-y-4">
              <input 
                type="text" required
                className="w-full p-2.5 bg-[#0B0F19] border border-[#1E293B] rounded-xl focus:ring-1 focus:ring-[#2563EB] outline-none text-xs font-bold text-slate-200 placeholder:text-slate-600"
                placeholder="Exam Label (e.g. Physics Mega Test)"
                value={examForm.title} onChange={(e) => setExamForm({...examForm, title: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="date" required
                  className="w-full p-2.5 bg-[#0B0F19] border border-[#1E293B] rounded-xl focus:ring-1 focus:ring-[#2563EB] outline-none text-xs font-bold text-slate-200 [color-scheme:dark]"
                  value={examForm.date} onChange={(e) => setExamForm({...examForm, date: e.target.value})}
                />
                <input 
                  type="time" required
                  className="w-full p-2.5 bg-[#0B0F19] border border-[#1E293B] rounded-xl focus:ring-1 focus:ring-[#2563EB] outline-none text-xs font-bold text-slate-200 [color-scheme:dark]"
                  value={examForm.time} onChange={(e) => setExamForm({...examForm, time: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="number" placeholder="Duration (Min)" required min="1"
                  className="w-full p-2.5 bg-[#0B0F19] border border-[#1E293B] rounded-xl focus:ring-1 focus:ring-[#2563EB] outline-none text-xs font-bold text-slate-200 text-center"
                  value={examForm.duration} onChange={(e) => setExamForm({...examForm, duration: parseInt(e.target.value)})}
                />
                <input 
                  type="number" placeholder="Total Qs" required min="1"
                  className="w-full p-2.5 bg-[#0B0F19] border border-[#1E293B] rounded-xl focus:ring-1 focus:ring-[#2563EB] outline-none text-xs font-bold text-slate-200 text-center"
                  value={examForm.totalQuestions} onChange={(e) => setExamForm({...examForm, totalQuestions: parseInt(e.target.value)})}
                />
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-[#1E293B] bg-[#07090E]/50 shrink-0">
             <button onClick={handleGeneratePreview} disabled={isPreviewLoading} className="w-full py-3 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white border border-indigo-500/20 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2">
               {isPreviewLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <RefreshCcw className="w-4 h-4" />}
               Generate New Preview
             </button>
          </div>
        </div>

        {/* ==========================================
            COLUMN 2: QUESTION REPOSITORY (PREVIEW)
        ========================================== */}
        <div className="xl:col-span-4 flex flex-col bg-[#0B0F19] rounded-2xl shadow-lg border border-[#1E293B] overflow-hidden">
          <div className="p-4 bg-[#07090E]/80 border-b border-[#1E293B] flex justify-between items-center shrink-0">
            <h2 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-500" /> 2. Repository
            </h2>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-black text-[10px] uppercase tracking-widest rounded-lg">
                {previewQuestions.length} / {examForm.totalQuestions} Qs
              </span>
            </div>
          </div>
          <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
            {isPreviewLoading ? (
               <div className="flex flex-col items-center justify-center h-full text-slate-500">
                 <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
               </div>
            ) : previewQuestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-60">
                <Database className="w-12 h-12 mb-3 text-slate-600" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-center px-4">Generate preview to see/shuffle new questions.</p>
              </div>
            ) : (
              previewQuestions.map((q, idx) => (
                <div key={q.id} className="p-3 bg-[#07090E]/50 border border-[#1E293B] rounded-xl flex gap-3 group">
                  <div className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-[10px] font-bold text-slate-400">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-300 font-medium line-clamp-2 leading-relaxed">{q.question_text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-4 border-t border-[#1E293B] bg-[#07090E]/50 shrink-0 flex gap-2">
             {editMode && (
               <button onClick={cancelEdit} className="px-4 py-4 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl font-black transition-all">
                 <XCircle className="w-5 h-5" />
               </button>
             )}
             <button 
                onClick={handleDeployOrUpdate} 
                disabled={loading || (!editMode && previewQuestions.length === 0)} 
                className={`flex-1 py-4 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 ${
                  editMode ? 'bg-amber-600 hover:bg-amber-500 border border-amber-500/50' : 'bg-[#2563EB] hover:bg-blue-600 border border-blue-500/50'
                }`}
             >
               {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : (editMode ? <Edit className="w-5 h-5" /> : <Target className="w-5 h-5" />)}
               {editMode ? 'Update Final Exam' : 'Deploy Final Exam'}
             </button>
          </div>
        </div>

        {/* ==========================================
            COLUMN 3: EXECUTION TIMELINE (DYNAMIC STATUS)
        ========================================== */}
        <div className="xl:col-span-4 flex flex-col bg-[#0B0F19] rounded-2xl shadow-lg border border-[#1E293B] overflow-hidden">
          
          <div className="p-4 bg-[#07090E]/80 border-b border-[#1E293B] flex flex-col shrink-0">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-500" /> 3. Timeline
              </h2>
            </div>
            
            {/* 🚀 Active / History Tabs */}
            <div className="flex bg-[#07090E] p-1 rounded-xl border border-[#1E293B]">
              <button 
                onClick={() => setActiveTab('active')}
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                  activeTab === 'active' ? 'bg-[#2563EB] text-white shadow-md' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Active / Upcoming
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                  activeTab === 'history' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Ended / History
              </button>
            </div>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
            {isFetching ? (
               <div className="flex flex-col items-center justify-center h-full text-slate-500">
                 <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
               </div>
            ) : filteredExams.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-60">
                {activeTab === 'active' ? <Calendar className="w-12 h-12 mb-3 text-slate-600" /> : <Archive className="w-12 h-12 mb-3 text-slate-600" />}
                <p className="text-[10px] font-bold uppercase tracking-widest">No {activeTab} exams found.</p>
              </div>
            ) : (
              filteredExams.map((schedule) => {
                const exam = schedule.exams;
                const runAt = new Date(schedule.run_at);
                const durationMin = exam?.duration_minutes || 0;
                const endTime = new Date(runAt.getTime() + durationMin * 60000);
                
                // Real-time status logic
                const isUpcoming = now < runAt;
                const isLive = now >= runAt && now < endTime;
                const isEnded = now >= endTime;

                return (
                  <div key={schedule.id} className={`bg-[#07090E]/50 p-4 rounded-xl border hover:border-[#2563EB]/40 transition-all flex relative overflow-hidden group ${editMode?.schedulerId === schedule.id ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'border-[#1E293B]'}`}>
                    
                    {/* Status Color Bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 transition-colors duration-300 ${
                      isLive ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 
                      isUpcoming ? 'bg-[#2563EB]' : 'bg-slate-600'
                    }`}></div>

                    <div className="pl-2 flex-1 flex flex-col gap-3">
                      <h3 className="font-bold text-slate-200 text-sm mb-1">{exam?.title || "Untitled Exam"}</h3>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-1 rounded">
                          <GraduationCap className="w-2.5 h-2.5"/> {exam?.target_class} '{exam?.target_batch_year?.toString().slice(-2)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest bg-[#0B0F19] text-slate-400 border border-[#1E293B] px-2 py-1 rounded">
                          <BookOpen className="w-2.5 h-2.5 text-[#2563EB]"/> {exam?.total_questions} Qs / {exam?.duration_minutes}m
                        </span>
                      </div>
                      
                      <div className="mt-2 flex items-center justify-between">
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                           <Clock className="w-3 h-3"/> {formatDateTime(schedule.run_at)}
                         </span>
                         {/* Dynamic Badge */}
                         <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded flex items-center gap-1 ${
                           isLive ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20' : 
                           isUpcoming ? 'text-blue-400 bg-blue-500/10 border border-blue-500/20' : 
                           'text-slate-400 bg-slate-800 border border-slate-700'
                         }`}>
                           {isLive ? <Radio className="w-2.5 h-2.5 animate-pulse"/> : 
                            isUpcoming ? <Clock className="w-2.5 h-2.5"/> : 
                            <CheckCircle className="w-2.5 h-2.5"/>}
                           {isLive ? 'LIVE NOW' : (isUpcoming ? 'UPCOMING' : 'ENDED')}
                         </span>
                      </div>
                    </div>

                    {/* Only show Edit/Delete if NOT ended */}
                    {!isEnded && (
                      <div className="flex flex-col gap-1.5 ml-2 border-l border-[#1E293B] pl-3 justify-center shrink-0">
                        <button 
                          onClick={() => handleEditClick(schedule)}
                          className="p-1.5 bg-blue-500/10 hover:bg-blue-500 hover:text-white text-blue-400 border border-blue-500/20 rounded-md transition-all"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteExam(schedule.id, exam?.id)}
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 border border-rose-500/20 rounded-md transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
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