import { useState, useEffect } from 'react';
import { taxonomyApi } from '../../services/taxonomyService';
import { questionService } from '../../services/questionService';
import toast, { Toaster } from 'react-hot-toast';
import { Plus, Zap, Image as ImageIcon, Trash2, HelpCircle, BookOpen, Search, CheckCircle2, Layers, X, PlusCircle, Loader2, AlignLeft, Settings, CheckSquare } from 'lucide-react';

export default function QuestionBank() {
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  const [boards, setBoards] = useState([]);
  
  const [selectedSub, setSelectedSub] = useState('');
  const [selectedChap, setSelectedChap] = useState('');
  const [selectedTop, setSelectedTop] = useState('');

  const [questions, setQuestions] = useState([]);
  
  // Loading States
  const [isFetchingQuestions, setIsFetchingQuestions] = useState(false);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  // Ultimate Form State
  const [qType, setQType] = useState('mcq');
  const [newQ, setNewQ] = useState({
    text: '', imagePath: '', explanation: '', solution: '', 
    importance: 3, isExamMaterial: false, isContentMaterial: false
  });
  
  // Multiple Boards State
  const [boardTags, setBoardTags] = useState([]);

  const [options, setOptions] = useState([
    { text: '', isCorrect: true }, { text: '', isCorrect: false },
    { text: '', isCorrect: false }, { text: '', isCorrect: false }
  ]);
  
  const [cqParts, setCqParts] = useState([
    { label: 'k', qText: '', aText: '', explanation: '' }, 
    { label: 'kh', qText: '', aText: '', explanation: '' },
    { label: 'g', qText: '', aText: '', explanation: '' }, 
    { label: 'gh', qText: '', aText: '', explanation: '' }
  ]);

  useEffect(() => { 
    taxonomyApi.getSubjects().then(setSubjects).catch(err => toast.error(err.message));
    
    // 🚀 লগ দিয়ে চেক করা হচ্ছে বোর্ড আসছে কি না
    questionService.getBoards()
      .then(data => {
        console.log("DB Boards Loaded Successfully:", data);
        setBoards(data);
      })
      .catch(err => {
        console.error("Board Fetch Error:", err);
        toast.error("Failed to load Boards: " + err.message);
      });
  }, []);
  
  useEffect(() => {
    if (selectedSub) {
      taxonomyApi.getChapters(selectedSub).then(setChapters);
      setSelectedChap(''); setSelectedTop(''); setQuestions([]);
    }
  }, [selectedSub]);

  // Double API Call Fix
  useEffect(() => {
    if (selectedChap) {
      taxonomyApi.getTopics(selectedChap).then(setTopics);
      setSelectedTop(''); 
    } else {
      setTopics([]);
      setQuestions([]);
    }
  }, [selectedChap]);

  useEffect(() => {
    let isMounted = true;
    if (selectedChap) {
      setIsFetchingQuestions(true);
      questionService.getQuestions(selectedChap, selectedTop || null)
        .then(data => { if (isMounted) setQuestions(data); })
        .catch(err => toast.error(err.message))
        .finally(() => { if (isMounted) setIsFetchingQuestions(false); });
    }
    return () => { isMounted = false; };
  }, [selectedChap, selectedTop]);

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      await questionService.deleteQuestion(id);
      setQuestions(questions.filter(q => q.id !== id));
      toast.success('Question deleted successfully!');
    } catch (error) {
      toast.error("Failed to delete: " + error.message);
    }
  };

  // 🚀 FIX: React Immutable State Update for Board Tags
  const addBoardTag = () => setBoardTags(prev => [...prev, { boardId: '', year: '' }]);
  
  const updateBoardTag = (index, field, value) => {
    setBoardTags(prevTags => 
      prevTags.map((tag, i) => (i === index ? { ...tag, [field]: value } : tag))
    );
  };
  
  const removeBoardTag = (index) => {
    setBoardTags(prevTags => prevTags.filter((_, i) => i !== index));
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    if (!selectedChap) return toast.error("Select at least Subject & Chapter!");
    if (!newQ.text) return toast.error("Question stem/text is empty!");

    const actualQType = qType === 'sq1' ? 'sq' : qType === 'sq2' ? 'written' : qType;
    const validBoardTags = boardTags.filter(b => b.boardId && b.year);

    try {
      setIsSavingQuestion(true);
      await questionService.addQuestion({
        subjectId: selectedSub,
        chapterId: selectedChap,
        topicId: selectedTop || null,
        qType: actualQType,
        text: newQ.text,
        imagePath: ['mcq', 'cq'].includes(qType) ? newQ.imagePath : null,
        explanation: newQ.explanation,
        solution: newQ.solution,
        importance: newQ.importance,
        isExamMaterial: newQ.isExamMaterial,
        isContentMaterial: newQ.isContentMaterial,
        optionsArray: qType === 'mcq' ? options : null,
        cqParts: qType === 'cq' ? cqParts : null,
        boardTags: ['mcq', 'cq'].includes(qType) ? validBoardTags : []
      });
      
      toast.success(`Question saved seamlessly!`);
      
      // Reset States
      setNewQ({ text: '', imagePath: '', explanation: '', solution: '', importance: 3, isExamMaterial: false, isContentMaterial: false });
      setBoardTags([]);
      setOptions([{ text: '', isCorrect: true }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }]);
      setCqParts([{ label: 'k', qText: '', aText: '', explanation: '' }, { label: 'kh', qText: '', aText: '', explanation: '' }, { label: 'g', qText: '', aText: '', explanation: '' }, { label: 'gh', qText: '', aText: '', explanation: '' }]);
      
      // Refresh list
      const freshQuestions = await questionService.getQuestions(selectedChap, selectedTop || null);
      setQuestions(freshQuestions);

    } catch (error) {
      toast.error("Error: " + error.message);
    } finally {
      setIsSavingQuestion(false);
    }
  };

  // 🚀 Helper Function to Group Chapters for the Dropdown
  const renderChapterOptions = () => {
    const mainChapters = chapters.filter(c => !c.parent_chapter_id);
    
    return mainChapters.map(mainChap => {
      const subChapters = chapters.filter(c => c.parent_chapter_id === mainChap.id);
      return (
        <optgroup key={mainChap.id} label={`${mainChap.section_name ? `[${mainChap.section_name}] ` : ''}${mainChap.chapter_label || 'CH'}: ${mainChap.title}`}>
          <option value={mainChap.id}>• {mainChap.title} (Main)</option>
          {subChapters.map(subChap => (
            <option key={subChap.id} value={subChap.id}>
              ↳ {subChap.chapter_label || 'Sub'}: {subChap.title}
            </option>
          ))}
        </optgroup>
      );
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] text-slate-200">
      <Toaster position="top-right" toastOptions={{ style: { background: '#0B0F19', color: '#F1F5F9', border: '1px solid #1E293B' } }} />
      
      <div className="bg-[#0B0F19] p-4 rounded-2xl border border-[#1E293B] mb-4 flex flex-col lg:flex-row items-center justify-between gap-4 shrink-0 shadow-lg">
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="p-2.5 bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-xl shadow-inner">
            <Layers className="w-5 h-5 text-[#2563EB]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight leading-none">Question Bank</h1>
            <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest mt-1">Content Team Workspace</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row flex-1 w-full lg:max-w-3xl gap-3">
          <select className="flex-1 p-3 bg-[#07090E] border border-[#1E293B] rounded-xl focus:ring-2 focus:ring-[#2563EB] outline-none shadow-inner text-xs font-bold text-slate-300 transition-all" value={selectedSub} onChange={(e) => setSelectedSub(e.target.value)}>
            <option value="">1. Select Subject</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          
          {/* 🚀 Updated Chapter Select with Grouping */}
          <select className="flex-1 p-3 bg-[#07090E] border border-[#1E293B] rounded-xl focus:ring-2 focus:ring-[#2563EB] outline-none shadow-inner disabled:opacity-40 text-xs font-bold text-slate-300 transition-all" value={selectedChap} onChange={(e) => setSelectedChap(e.target.value)} disabled={!selectedSub}>
            <option value="">2. Select Chapter</option>
            {renderChapterOptions()}
          </select>
          
          <select className="flex-1 p-3 bg-[#2563EB]/5 border border-[#2563EB]/20 rounded-xl focus:ring-2 focus:ring-[#2563EB] outline-none shadow-inner disabled:opacity-40 text-xs font-black text-[#2563EB] transition-all" value={selectedTop} onChange={(e) => setSelectedTop(e.target.value)} disabled={!selectedChap}>
            <option value="" className="bg-[#07090E] text-slate-400">3. Topic (Optional)</option>
            {topics.map(t => <option key={t.id} value={t.id} className="bg-[#07090E]">{t.topic_order}. {t.title}</option>)}
          </select>
        </div>
      </div>

      {!selectedChap ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#0B0F19] rounded-2xl border border-dashed border-[#1E293B] text-slate-500 shadow-inner">
          <Search className="w-12 h-12 text-[#2563EB] mb-4 opacity-40" />
          <p className="text-xs font-bold tracking-widest uppercase text-slate-400">Select Subject & Chapter to begin data entry</p>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0 pb-2">
          
          <div className="lg:col-span-7 flex flex-col bg-[#0B0F19] rounded-2xl shadow-lg border border-[#1E293B] overflow-hidden">
            <div className="p-4 bg-[#07090E]/80 border-b border-[#1E293B] flex justify-between items-center shrink-0">
              <h2 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#2563EB]" /> Live Repository
              </h2>
              <span className="px-3 py-1 bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20 font-black text-[10px] uppercase tracking-widest rounded-lg shadow-inner">
                {questions.length} Questions
              </span>
            </div>
            
            <div className="flex-1 p-5 overflow-y-auto space-y-4 custom-scrollbar">
              {isFetchingQuestions ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin text-[#2563EB] mb-3" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Syncing Data...</p>
                </div>
              ) : questions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-60">
                  <BookOpen className="w-12 h-12 mb-3" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">No questions yet</p>
                </div>
              ) : (
                questions.map((q, idx) => (
                  <div key={q.id} className="bg-[#07090E]/50 p-5 rounded-2xl border border-[#1E293B] hover:border-[#2563EB]/50 transition-all duration-300 group relative">
                    <button onClick={() => handleDeleteQuestion(q.id)} className="absolute top-4 right-4 p-2 bg-transparent text-slate-500 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-200" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="flex justify-between items-start mb-3 pr-8">
                      <span className="font-bold text-slate-200 leading-relaxed text-sm">
                        <span className="text-[9px] font-black uppercase tracking-widest bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20 px-2.5 py-1 rounded-md mr-2">
                          {q.q_type === 'sq' ? 'SQ (1)' : q.q_type === 'written' ? 'SQ (2)' : q.q_type}
                        </span>
                        <span className="text-slate-500 mr-1">{idx + 1}.</span> {q.question_text}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {q.is_exam_material && <div className="inline-flex items-center gap-1.5 text-[9px] font-black bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-md uppercase tracking-widest"><Zap className="w-3 h-3"/> 20/80 Exam Flow</div>}
                      {q.is_content_material && <div className="inline-flex items-center gap-1.5 text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-md uppercase tracking-widest"><Layers className="w-3 h-3"/> Core Content Flow</div>}
                      
                      {q.question_board_history?.map(history => (
                        <div key={`${history.board_id}-${history.year}`} className="inline-flex items-center text-[9px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-md uppercase tracking-widest">
                          {history.boards?.short_name || history.boards?.name} '{history.year?.toString().slice(-2)}
                        </div>
                      ))}
                    </div>

                    {q.question_image_path && <img src={q.question_image_path} alt="Q" className="max-h-40 object-contain my-4 rounded-lg border border-[#1E293B] shadow-sm" />}
                    
                    {q.q_type === 'mcq' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
                        {q.mcq_options?.map((opt, i) => (
                          <div key={opt.id} className={`p-3 text-xs rounded-xl border transition-colors ${opt.is_correct ? 'bg-[#2563EB]/10 border-[#2563EB]/40 font-bold text-[#2563EB]' : 'bg-[#0B0F19] border-[#1E293B] text-slate-400'}`}>
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md mr-2 text-[10px] font-black ${opt.is_correct ? 'bg-[#2563EB]/20 text-[#2563EB]' : 'bg-[#1E293B] text-slate-500'}`}>{String.fromCharCode(65 + i)}</span>
                            {opt.option_text}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.q_type === 'cq' && (
                      <div className="mt-2 space-y-3 bg-[#0B0F19] p-4 rounded-xl border border-[#1E293B]">
                        {q.cq_parts?.map(p => (
                          <div key={p.id} className="flex flex-col gap-1 pb-3 border-b border-[#1E293B] last:border-0 last:pb-0">
                            <div className="text-xs text-slate-200 font-bold flex gap-2"><span className="text-[#2563EB]">({p.label})</span> {p.question_text}</div>
                            {p.answer_text && <div className="pl-6 text-xs text-slate-400 font-medium mt-1"><span className="text-emerald-400 font-bold mr-1">Ans:</span> {p.answer_text}</div>}
                            {p.explanation && <div className="pl-6 text-[11px] text-slate-500 italic mt-0.5"><span className="text-[#2563EB] font-bold not-italic mr-1">Exp:</span> {p.explanation}</div>}
                          </div>
                        ))}
                      </div>
                    )}

                    {['sq', 'written'].includes(q.q_type) && (
                      <div className="mt-2 text-xs bg-[#0B0F19] p-4 rounded-xl border border-[#1E293B] text-slate-300 font-medium">
                        <strong className="text-[#2563EB] mr-2">Solution:</strong> {q.solution}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-5 bg-[#0B0F19] rounded-2xl shadow-lg border border-[#1E293B] flex flex-col h-full overflow-hidden">
            
            <div className="p-4 bg-[#07090E]/80 border-b border-[#1E293B] shrink-0">
              <div className="flex bg-[#07090E] p-1.5 rounded-xl border border-[#1E293B] shadow-inner">
                {[{ id: 'mcq', label: 'MCQ' }, { id: 'sq1', label: 'SQ (1 Marks)' }, { id: 'sq2', label: 'SQ (2 Marks)' }, { id: 'cq', label: 'Creative (CQ)' }].map(tab => (
                  <button key={tab.id} type="button" onClick={() => setQType(tab.id)} className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg ${qType === tab.id ? 'bg-[#2563EB] text-white shadow-lg shadow-[#2563EB]/20' : 'text-slate-500 hover:text-slate-300 hover:bg-[#1E293B]/50'}`}>{tab.label}</button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddQuestion} className="flex-1 overflow-y-auto p-5 flex flex-col space-y-6 custom-scrollbar">
              
              <div className="bg-[#07090E]/50 p-4 rounded-xl border border-[#1E293B]">
                <h3 className="text-[10px] font-black text-[#2563EB] uppercase tracking-widest mb-3 flex items-center gap-2">
                  <AlignLeft className="w-3.5 h-3.5" /> Step 1: Core Content
                </h3>
                
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">{qType === 'cq' ? 'Stem (উদ্দীপক)' : 'Main Question Text'}</label>
                <textarea className="w-full p-4 bg-[#0B0F19] border border-[#1E293B] rounded-xl focus:ring-2 focus:ring-[#2563EB] outline-none transition-all resize-none text-xs font-medium text-slate-200 shadow-inner placeholder:text-slate-600 mb-3" rows={qType === 'cq' ? '3' : '3'} required value={newQ.text} onChange={(e) => setNewQ({...newQ, text: e.target.value})} placeholder="Type the question here..."></textarea>
                
                {['mcq', 'cq'].includes(qType) && (
                  <div className="flex items-center gap-2 bg-[#0B0F19] p-2 rounded-xl border border-[#1E293B] focus-within:ring-1 focus-within:ring-[#2563EB] transition-all shadow-inner">
                    <ImageIcon className="w-4 h-4 text-slate-500 ml-2" />
                    <input type="text" className="flex-1 bg-transparent border-none focus:ring-0 text-xs outline-none text-slate-200 placeholder-slate-600" placeholder="Attach Image URL (Optional)" value={newQ.imagePath || ''} onChange={(e) => setNewQ({...newQ, imagePath: e.target.value})} />
                  </div>
                )}
              </div>

              <div className="bg-[#07090E]/50 p-4 rounded-xl border border-[#1E293B]">
                <h3 className="text-[10px] font-black text-[#2563EB] uppercase tracking-widest mb-3 flex items-center gap-2">
                  <CheckSquare className="w-3.5 h-3.5" /> Step 2: Answers & Logic
                </h3>

                {qType === 'mcq' && (
                  <div className="space-y-3">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Write Options & Mark Correct</label>
                    {options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="relative flex items-center justify-center">
                          <input type="radio" name="corr_opt" checked={opt.isCorrect} onChange={() => setOptions(options.map((o, i) => ({...o, isCorrect: i===idx})))} className="peer w-5 h-5 cursor-pointer opacity-0 absolute" />
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${opt.isCorrect ? 'border-[#2563EB] bg-[#2563EB]' : 'border-slate-600 bg-[#0B0F19]'}`}>
                            {opt.isCorrect && <div className="w-2 h-2 bg-white rounded-full"></div>}
                          </div>
                        </div>
                        <input type="text" required className={`flex-1 p-3 text-xs rounded-xl outline-none transition-all shadow-inner border ${opt.isCorrect ? 'border-[#2563EB]/50 bg-[#2563EB]/5 text-[#2563EB] font-bold' : 'border-[#1E293B] bg-[#0B0F19] text-slate-300 focus:border-[#2563EB]'}`} placeholder={`Option ${String.fromCharCode(65+idx)}`} value={opt.text} onChange={(e) => setOptions(options.map((o, i) => i === idx ? {...o, text: e.target.value} : o))} />
                      </div>
                    ))}
                    <div className="pt-2">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Explanation (Why is this correct?)</label>
                      <textarea className="w-full p-3 bg-[#0B0F19] border border-[#1E293B] rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#2563EB] text-slate-300 shadow-inner resize-none" rows="2" value={newQ.explanation} onChange={(e) => setNewQ({...newQ, explanation: e.target.value})} placeholder="Optional explanation..."></textarea>
                    </div>
                  </div>
                )}

                {['sq1', 'sq2'].includes(qType) && (
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Write Exact Solution</label>
                    <textarea required className="w-full p-4 bg-[#0B0F19] border border-[#1E293B] rounded-xl focus:ring-2 focus:ring-[#2563EB] outline-none transition-all resize-none text-xs text-slate-200 shadow-inner" rows={qType === 'sq2' ? '4' : '2'} placeholder="Provide the direct answer or brief logic..." value={newQ.solution} onChange={(e) => setNewQ({...newQ, solution: e.target.value})}></textarea>
                  </div>
                )}

                {qType === 'cq' && (
                  <div className="space-y-4">
                    {cqParts.map((part, idx) => (
                      <div key={idx} className="bg-[#0B0F19] p-4 rounded-xl border border-[#1E293B] space-y-3">
                        <div className="flex gap-3 items-center">
                          <div className="w-8 h-8 shrink-0 bg-[#07090E] border border-[#1E293B] rounded-lg flex items-center justify-center text-xs font-black text-[#2563EB] uppercase shadow-inner">{part.label}</div>
                          <input type="text" required className="flex-1 p-2.5 text-xs bg-[#07090E] border border-[#1E293B] rounded-lg focus:ring-1 focus:ring-[#2563EB] outline-none transition-all text-slate-200 placeholder-slate-600 shadow-inner" placeholder={`Question for (${part.label})`} value={part.qText} onChange={(e) => setCqParts(cqParts.map((p, i) => i === idx ? {...p, qText: e.target.value} : p))} />
                        </div>
                        <div className="pl-11 space-y-2">
                          <textarea required className="w-full p-2.5 text-xs bg-[#07090E] border border-[#1E293B] rounded-lg focus:ring-1 focus:ring-emerald-500/50 outline-none text-emerald-100 placeholder-slate-600 resize-none shadow-inner" rows="2" placeholder="Main Answer..." value={part.aText} onChange={(e) => setCqParts(cqParts.map((p, i) => i === idx ? {...p, aText: e.target.value} : p))}></textarea>
                          <textarea className="w-full p-2.5 text-xs bg-[#07090E] border border-[#1E293B] rounded-lg focus:ring-1 focus:ring-[#2563EB] outline-none text-slate-300 placeholder-slate-600 resize-none shadow-inner" rows="1" placeholder="Detailed Logic/Explanation (Optional)..." value={part.explanation} onChange={(e) => setCqParts(cqParts.map((p, i) => i === idx ? {...p, explanation: e.target.value} : p))}></textarea>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-[#07090E]/50 p-4 rounded-xl border border-[#1E293B]">
                <h3 className="text-[10px] font-black text-[#2563EB] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5" /> Step 3: Tags & Metadata
                </h3>

                {['mcq', 'cq'].includes(qType) && (
                  <div className="mb-5">
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Board / Cadet Tags</label>
                      <button type="button" onClick={addBoardTag} className="text-[9px] font-black text-[#2563EB] flex items-center gap-1 hover:text-blue-400 transition-colors bg-[#2563EB]/10 px-2 py-1 rounded-md"><PlusCircle className="w-3 h-3" /> Add Tag</button>
                    </div>
                    <div className="space-y-2.5">
                      {boardTags.length === 0 && <p className="text-[10px] text-slate-600 italic ml-1">No tags assigned yet.</p>}
                      {boardTags.map((tag, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-[#0B0F19] p-1.5 rounded-xl border border-[#1E293B]">
                          
                          {/* 🚀 FIX: Cadet Grouping */}
                          <select className="flex-1 p-2 bg-transparent text-xs outline-none font-medium text-slate-200" value={tag.boardId} onChange={(e) => updateBoardTag(idx, 'boardId', e.target.value)}>
                            <option value="" className="bg-[#0B0F19]">Select Board / Cadet</option>
                            
                            <optgroup label="General Boards" className="text-slate-500 font-bold bg-[#0B0F19]">
                              {boards.filter(b => b.name !== 'Cadet College').map(b => (
                                <option key={b.id} value={b.id} className="text-slate-200">{b.name}</option>
                              ))}
                            </optgroup>

                            <optgroup label="Special Institutions" className="text-[#2563EB] font-bold bg-[#0B0F19] mt-2">
                              {boards.filter(b => b.name === 'Cadet College').map(b => (
                                <option key={b.id} value={b.id} className="text-blue-400 font-black">★ {b.name}</option>
                              ))}
                            </optgroup>
                          </select>

                          <div className="w-[1px] h-6 bg-[#1E293B]"></div>
                          <input type="number" min="1990" max="2099" className="w-20 p-2 bg-transparent text-xs outline-none font-medium text-slate-200 placeholder-slate-600 text-center" placeholder="Year" value={tag.year} onChange={(e) => updateBoardTag(idx, 'year', e.target.value)} />
                          <button type="button" onClick={() => removeBoardTag(idx)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mb-5">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Importance Rating</label>
                  <select className="w-full p-3 bg-[#0B0F19] border border-[#1E293B] rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#2563EB] text-[#2563EB] font-black shadow-inner" value={newQ.importance} onChange={(e) => setNewQ({...newQ, importance: parseInt(e.target.value)})}>
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{'⭐'.repeat(n)} ({n} Stars)</option>)}
                  </select>
                </div>
                
                <div className="space-y-3 pt-2">
                  <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl bg-[#0B0F19] border border-[#1E293B] hover:border-rose-500/50 transition-all shadow-inner">
                    <div className="relative shrink-0">
                      <input type="checkbox" className="peer appearance-none w-5 h-5 rounded border-2 border-[#1E293B] bg-[#07090E] checked:bg-rose-500 checked:border-rose-500 transition-all outline-none" checked={newQ.isExamMaterial} onChange={(e) => setNewQ({...newQ, isExamMaterial: e.target.checked})} />
                      {newQ.isExamMaterial && <CheckCircle2 className="w-3.5 h-3.5 text-white absolute top-[3px] left-[3px] pointer-events-none" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-black text-[10px] text-rose-400 uppercase tracking-widest">20/80 Exam Flow</span>
                      <span className="text-[9px] text-slate-500 font-medium">Critical questions for exam generation</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl bg-[#0B0F19] border border-[#1E293B] hover:border-emerald-500/50 transition-all shadow-inner">
                    <div className="relative shrink-0">
                      <input type="checkbox" className="peer appearance-none w-5 h-5 rounded border-2 border-[#1E293B] bg-[#07090E] checked:bg-emerald-500 checked:border-emerald-500 transition-all outline-none" checked={newQ.isContentMaterial} onChange={(e) => setNewQ({...newQ, isContentMaterial: e.target.checked})} />
                      {newQ.isContentMaterial && <CheckCircle2 className="w-3.5 h-3.5 text-white absolute top-[3px] left-[3px] pointer-events-none" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-black text-[10px] text-emerald-400 uppercase tracking-widest">Core Content Flow</span>
                      <span className="text-[9px] text-slate-500 font-medium">Shows directly inside chapter reading</span>
                    </div>
                  </label>
                </div>

              </div>

              <div className="pt-4 pb-2 shrink-0">
                <button type="submit" disabled={isSavingQuestion} className="w-full py-4 bg-[#2563EB] text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-[#2563EB]/25 hover:bg-blue-600 transform hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-500/50">
                  {isSavingQuestion ? <><Loader2 className="w-5 h-5 animate-spin"/> Processing...</> : <><Plus className="w-5 h-5" /> Push to Database</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}