import { useState, useEffect, useMemo } from 'react';
import { taxonomyApi } from '../../services/taxonomyService';
import { questionService } from '../../services/questionService';
import toast, { Toaster } from 'react-hot-toast';
import { Plus, Zap, Image as ImageIcon, Trash2, BookOpen, Search, Layers, X, Loader2, CheckSquare, UploadCloud, Pencil, Star, Info } from 'lucide-react';
import ExcelTemplateUpload from './excell_tamplate_upload';

export default function QuestionBank() {
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  const [boards, setBoards] = useState([]);
  
  const [selectedSub, setSelectedSub] = useState('');
  const [selectedChap, setSelectedChap] = useState('');
  const [selectedTop, setSelectedTop] = useState('');

  const [questions, setQuestions] = useState([]);
  
  // Loading & Edit States
  const [isFetchingQuestions, setIsFetchingQuestions] = useState(false);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [editingId, setEditingId] = useState(null); 

  // Form States
  const [qType, setQType] = useState('mcq');
  const [newQ, setNewQ] = useState({
    text: '', imagePath: '', explanation: '', solution: '', 
    importance: 3, isExamMaterial: false, isContentMaterial: false
  });
  
  const [isPolyMCQ, setIsPolyMCQ] = useState(false);
  const [mcqStatements, setMcqStatements] = useState(['', '', '']);
  const [boardTags, setBoardTags] = useState([]);

  const [options, setOptions] = useState([
    { text: '', isCorrect: true }, { text: '', isCorrect: false },
    { text: '', isCorrect: false }, { text: '', isCorrect: false }
  ]);
  
  const [cqParts, setCqParts] = useState([
    { label: 'k', qText: '', aText: '' }, { label: 'kh', qText: '', aText: '' },
    { label: 'g', qText: '', aText: '' }, { label: 'gh', qText: '', aText: '' }
  ]);

  // 🚀 O(1) Lookup for Boards (used for data entry mapping)
  const boardsMap = useMemo(() => {
    return boards.reduce((acc, board) => {
      acc[board.id] = board;
      return acc;
    }, {});
  }, [boards]);

  const generateId = () => window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2);

  // Initial Fetch
  useEffect(() => { 
    taxonomyApi.getSubjects().then(setSubjects).catch(err => toast.error("Failed to load subjects: " + err.message));
    questionService.getBoards().then(setBoards).catch(err => toast.error("Failed to load boards: " + err.message));
  }, []);
  
  useEffect(() => {
    let isMounted = true;

    if (!selectedChap) {
      if (isMounted) setQuestions([]);
      return;
    }

    setIsFetchingQuestions(true);
    questionService.getQuestions(selectedChap, selectedTop || null)
      .then(data => {
        if (isMounted) setQuestions(data);
      })
      .catch(err => {
        if (isMounted) toast.error("Failed to fetch questions: " + err.message);
      })
      .finally(() => {
        if (isMounted) setIsFetchingQuestions(false);
      });

    return () => { isMounted = false; };
  }, [selectedChap, selectedTop]);

  const resetForm = () => {
    setEditingId(null);
    setNewQ({ text: '', imagePath: '', explanation: '', solution: '', importance: 3, isExamMaterial: false, isContentMaterial: false });
    setBoardTags([]);
    setIsPolyMCQ(false);
    setMcqStatements(['', '', '']);
    setOptions([{ text: '', isCorrect: true }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }]);
    setCqParts([{ label: 'k', qText: '', aText: '' }, { label: 'kh', qText: '', aText: '' }, { label: 'g', qText: '', aText: '' }, { label: 'gh', qText: '', aText: '' }]);
  };

  const handleSubjectChange = async (e) => {
    const val = e.target.value;
    setSelectedSub(val);
    setSelectedChap('');
    setSelectedTop('');
    resetForm();
    if (val) {
      taxonomyApi.getChapters(val).then(setChapters).catch(err => toast.error(err.message));
    } else {
      setChapters([]);
    }
  };

  const handleChapterChange = async (e) => {
    const val = e.target.value;
    setSelectedChap(val);
    setSelectedTop('');
    resetForm();
    if (val) {
      taxonomyApi.getTopics(val).then(setTopics).catch(err => toast.error(err.message));
    } else {
      setTopics([]);
    }
  };

  const handleTopicChange = (e) => {
    setSelectedTop(e.target.value);
    resetForm();
  };

  const handleEditClick = (q) => {
    setEditingId(q.id);
    const type = q.q_type === 'sq' ? 'sq1' : q.q_type === 'written' ? 'sq2' : q.q_type;
    setQType(type);
    
    setNewQ({
      text: q.question_text || '',
      imagePath: q.question_image_path || '',
      explanation: q.explanation || '',
      solution: q.solution || '',
      importance: q.importance || 3,
      isExamMaterial: q.is_exam_material || false,
      isContentMaterial: q.is_content_material || false
    });

    if (q.q_type === 'mcq') {
      if (q.mcq_options) {
        const formattedOptions = q.mcq_options.map(o => ({ text: o.option_text, isCorrect: o.is_correct })).slice(0, 4);
        while(formattedOptions.length < 4) formattedOptions.push({ text: '', isCorrect: false });
        setOptions(formattedOptions);
      }
      if (q.mcq_statements && q.mcq_statements.length > 0) {
        setIsPolyMCQ(true);
        setMcqStatements([q.mcq_statements[0] || '', q.mcq_statements[1] || '', q.mcq_statements[2] || '']);
      } else {
        setIsPolyMCQ(false);
        setMcqStatements(['', '', '']);
      }
    }

    if (q.q_type === 'cq' && q.cq_parts) {
      const parts = ['k', 'kh', 'g', 'gh'].map(label => {
        const existing = q.cq_parts.find(p => p.label === label);
        return { label, qText: existing?.question_text || '', aText: existing?.answer_text || '' };
      });
      setCqParts(parts);
    }

    if (q.question_board_history) {
      setBoardTags(q.question_board_history.map(h => ({ 
        tempId: generateId(),
        boardId: h.board_id || h.boards?.id, 
        year: h.year 
      })));
    } else {
      setBoardTags([]);
    }

    toast.success("Question loaded into form.", { icon: '✏️' });
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this question?')) return;
    try {
      await questionService.deleteQuestion(id);
      setQuestions(prev => prev.filter(q => q.id !== id));
      if (editingId === id) resetForm();
      toast.success('Question deleted.');
    } catch (error) { toast.error("Failed to delete: " + error.message); }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      toast.loading("Uploading and optimizing image...", { id: "img-upload" });
      const imageUrl = await questionService.uploadImageToCloudinary(file);
      setNewQ(prev => ({ ...prev, imagePath: imageUrl }));
      toast.success("Image added successfully!", { id: "img-upload" });
    } catch (error) {
      toast.error(error.message, { id: "img-upload" });
    } finally {
      setIsUploadingImage(false);
      e.target.value = null; 
    }
  };

  const addBoardTag = (boardId) => {
    setBoardTags(prev => [...prev, { tempId: generateId(), boardId, year: '' }]);
  };

  const updateBoardYear = (tempId, year) => {
    setBoardTags(prev => prev.map(b => b.tempId === tempId ? { ...b, year } : b));
  };

  const removeBoardTag = (tempId) => {
    setBoardTags(prev => prev.filter(b => b.tempId !== tempId));
  };

  const handleAddOrUpdateQuestion = async (e) => {
    e.preventDefault();
    if (!selectedChap) return toast.error("Please select a subject and chapter first.");
    
    if (!newQ.text.trim()) return toast.error("The main question text cannot be empty.");

    if (qType === 'mcq' && isPolyMCQ) {
      const filledCount = mcqStatements.filter(s => s.trim() !== '').length;
      if (filledCount !== 0 && filledCount !== 3) {
        return toast.error("For multiple completion, please fill all 3 statements.");
      }
    }

    const actualQType = qType === 'sq1' ? 'sq' : qType === 'sq2' ? 'written' : qType;
    const validBoardTags = boardTags.filter(b => b.boardId && String(b.year).trim()).map(b => ({ boardId: b.boardId, year: b.year }));

    const payload = {
      subjectId: selectedSub, chapterId: selectedChap, topicId: selectedTop || null,
      qType: actualQType, text: newQ.text.trim(), imagePath: ['mcq', 'cq'].includes(qType) ? newQ.imagePath : null,
      explanation: newQ.explanation.trim(), solution: newQ.solution.trim(), importance: newQ.importance,
      isExamMaterial: newQ.isExamMaterial, isContentMaterial: newQ.isContentMaterial,
      optionsArray: qType === 'mcq' ? options : null, 
      cqParts: qType === 'cq' ? cqParts : null,
      boardTags: ['mcq', 'cq'].includes(qType) ? validBoardTags : [],
      mcqStatements: (qType === 'mcq' && isPolyMCQ) ? mcqStatements : null
    };

    try {
      setIsSavingQuestion(true);
      if (editingId) {
        await questionService.updateQuestion(editingId, payload);
        toast.success(`Question updated successfully.`);
      } else {
        await questionService.addQuestion(payload);
        toast.success(`Question added to database.`);
      }
      resetForm();
      
      questionService.getQuestions(selectedChap, selectedTop || null).then(setQuestions);
    } catch (error) { 
      toast.error("Error saving data: " + error.message); 
    } finally { 
      setIsSavingQuestion(false); 
    }
  };

  const renderChapterOptions = () => {
    const mainChapters = chapters.filter(c => !c.parent_chapter_id);
    return mainChapters.map(mainChap => {
      const subChapters = chapters.filter(c => c.parent_chapter_id === mainChap.id);
      const sectionPrefix = mainChap.section_name ? `[${mainChap.section_name}] ` : '';
      return (
        <optgroup key={mainChap.id} label={`${sectionPrefix}${mainChap.chapter_label || 'CH'}: ${mainChap.title}`} className="bg-[#0B0F19] text-slate-400 font-bold">
          <option value={mainChap.id} className="text-slate-200 bg-[#0B0F19] font-medium">• {mainChap.title} (Main)</option>
          {subChapters.map(subChap => (
            <option key={subChap.id} value={subChap.id} className="text-[#2563EB] bg-[#0B0F19] font-medium">&nbsp;&nbsp;&nbsp;↳ {subChap.chapter_label || 'Sub'}: {subChap.title}</option>
          ))}
        </optgroup>
      );
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] text-slate-200 font-sans">
      <Toaster position="top-right" toastOptions={{ style: { background: '#0B0F19', color: '#f8fafc', border: '1px solid #1E293B' } }} />
      
      {/* 🚀 HEADER & NAVIGATION (Deep Dark Theme) */}
      <div className="bg-[#0B0F19] px-6 py-4 rounded-2xl border border-[#1E293B] mb-4 flex flex-col lg:flex-row items-center justify-between gap-4 shrink-0 shadow-lg">
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="p-2 bg-[#2563EB]/10 rounded border border-[#2563EB]/20"><DatabaseIcon className="w-5 h-5 text-[#2563EB]" /></div>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight leading-tight">Question Database</h1>
          </div>
        </div>

        <div className="flex flex-col md:flex-row flex-1 w-full lg:max-w-2xl gap-3">
          <select className="flex-1 p-2.5 bg-[#07090E] border border-[#1E293B] rounded-xl focus:border-[#2563EB] outline-none text-xs font-bold text-slate-200 transition-colors shadow-inner" value={selectedSub} onChange={handleSubjectChange}>
            <option value="" className="bg-[#07090E] text-slate-500">1. Select Subject</option>
            {subjects.map(s => <option key={s.id} value={s.id} className="bg-[#07090E] text-slate-200">{s.name}</option>)}
          </select>
          <select className="flex-1 p-2.5 bg-[#07090E] border border-[#1E293B] rounded-xl focus:border-[#2563EB] outline-none disabled:opacity-50 text-xs font-bold text-slate-200 transition-colors shadow-inner" value={selectedChap} onChange={handleChapterChange} disabled={!selectedSub}>
            <option value="" className="bg-[#07090E] text-slate-500">2. Select Chapter</option>
            {renderChapterOptions()}
          </select>
          <select className="flex-1 p-2.5 bg-[#07090E] border border-[#1E293B] rounded-xl focus:border-[#2563EB] outline-none disabled:opacity-50 text-xs font-bold text-slate-200 transition-colors shadow-inner" value={selectedTop} onChange={handleTopicChange} disabled={!selectedChap}>
            <option value="" className="bg-[#07090E] text-slate-500">3. Filter by Topic (Optional)</option>
            {topics.map(t => <option key={t.id} value={t.id} className="bg-[#07090E] text-slate-200">{t.topic_order}. {t.title}</option>)}
          </select>
        </div>

        {selectedChap && (
          <ExcelTemplateUpload 
            selectedSub={selectedSub}
            selectedChap={selectedChap}
            selectedTop={selectedTop}
            boards={boards}
            fetchQuestions={() => questionService.getQuestions(selectedChap, selectedTop || null).then(setQuestions)}
            isSavingQuestion={isSavingQuestion}
            setIsSavingQuestion={setIsSavingQuestion}
            existingQuestions={questions} 
          />
        )}
      </div>

      {!selectedChap ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#0B0F19] rounded-2xl border border-[#1E293B] text-slate-500 shadow-inner">
          <Search className="w-10 h-10 text-[#2563EB] mb-3 opacity-30" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Select Subject & Chapter to view repository</p>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0 pb-2">
          
          {/* 🚀 LIVE REPOSITORY LIST (Dark Theme) */}
          <div className="lg:col-span-7 flex flex-col bg-[#0B0F19] rounded-3xl border border-[#1E293B] overflow-hidden shadow-lg">
             <div className="p-4 bg-[#07090E] border-b border-[#1E293B] flex justify-between items-center shrink-0">
              <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#2563EB]" /> Database List
              </span>
              <div className="flex gap-2 flex-wrap">
                <span className="text-[9px] font-black text-rose-400 bg-rose-500/10 px-2 py-1 rounded-md border border-rose-500/20">Practice: {questions.filter(q => q.is_exam_material).length}</span>
                <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">Content: {questions.filter(q => q.is_content_material).length}</span>
                <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">Exam (3+⭐): {questions.filter(q => q.importance >= 3).length}</span>
                <span className="text-[9px] font-black text-[#2563EB] bg-[#2563EB]/10 px-2 py-1 rounded-md border border-[#2563EB]/20">Total: {questions.length}</span>
              </div>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
              {isFetchingQuestions ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500"><Loader2 className="w-8 h-8 animate-spin text-[#2563EB] mb-3" /><span className="text-xs font-bold uppercase tracking-widest">Loading data...</span></div>
              ) : questions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-50"><FolderOpenIcon className="w-12 h-12 mb-3" /><span className="text-[10px] font-black uppercase tracking-widest">No questions found</span></div>
              ) : (
                questions.map((q, idx) => (
                  <div key={q.id} className={`p-5 rounded-2xl border transition-all duration-200 group relative ${editingId === q.id ? 'bg-[#2563EB]/10 border-[#2563EB]/50 shadow-[0_0_15px_rgba(37,99,235,0.1)]' : 'bg-[#07090E]/60 border-[#1E293B] hover:border-slate-600'}`}>
                    <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button onClick={() => handleEditClick(q)} className="p-2 text-[#2563EB] bg-[#2563EB]/10 rounded-lg hover:bg-[#2563EB] hover:text-white transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteQuestion(q.id)} className="p-2 text-rose-500 bg-rose-500/10 rounded-lg hover:bg-rose-500 hover:text-white transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>

                    <div className="mb-4 pr-20 flex flex-wrap gap-2 items-center">
                      <span className="text-[9px] font-black text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{q.q_type.toUpperCase()}</span>
                      {q.is_exam_material && <span className="text-[9px] font-black text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">PRACTICE</span>}
                      {q.is_content_material && <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">CONTENT</span>}
                      {q.importance >= 3 && <span className="text-[9px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1"><Star className="w-3 h-3"/> EXAM</span>}
                      
                      {/* 🚀 FIXED LOGIC FOR BOARDS */}
                      {q.question_board_history?.map((history, hIdx) => (
                        <span
                          key={`${history.boards?.id}-${history.year}-${hIdx}`}
                          className="text-[9px] font-bold text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700"
                        >
                          {history.boards?.short_name || history.boards?.name} '{String(history.year).slice(-2)}
                        </span>
                      ))}
                    </div>

                    <p className="text-slate-200 text-sm font-medium leading-relaxed mb-4"><span className="text-slate-500 font-black mr-2">{idx + 1}.</span>{q.question_text}</p>
                    {q.question_image_path && <img src={q.question_image_path} alt="Question Graphic" className="max-h-40 object-contain mb-4 rounded-lg border border-[#1E293B]" />}
                    
                    {q.q_type === 'mcq' && q.mcq_statements && q.mcq_statements.length > 0 && (
                      <div className="mt-2 mb-4 pl-4 py-2 border-l-2 border-[#1E293B] text-xs text-slate-300 space-y-2">
                        <div className="flex gap-2"><span className="font-bold text-[#2563EB] w-4">i.</span> {q.mcq_statements[0]}</div>
                        <div className="flex gap-2"><span className="font-bold text-[#2563EB] w-4">ii.</span> {q.mcq_statements[1]}</div>
                        <div className="flex gap-2"><span className="font-bold text-[#2563EB] w-4">iii.</span> {q.mcq_statements[2]}</div>
                      </div>
                    )}

                    {q.q_type === 'mcq' && (
                      <div className="mt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {q.mcq_options?.map((opt, i) => (
                            <div key={opt.id} className={`px-4 py-2.5 text-xs rounded-xl border flex items-start gap-3 ${opt.is_correct ? 'bg-[#2563EB]/10 border-[#2563EB]/40 text-blue-200 font-bold' : 'bg-[#0B0F19] border-[#1E293B] text-slate-400'}`}>
                              <span className={`flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-black shrink-0 ${opt.is_correct ? 'bg-[#2563EB] text-white shadow-md shadow-[#2563EB]/20' : 'bg-slate-800 text-slate-300'}`}>{String.fromCharCode(65 + i)}</span>
                              <span className="leading-snug mt-0.5">{opt.option_text}</span>
                            </div>
                          ))}
                        </div>
                        {q.explanation && (
                          <div className="mt-4 p-3 bg-[#0B0F19] border border-[#1E293B] rounded-xl text-xs text-slate-300 font-medium">
                            <span className="font-black text-slate-500 uppercase tracking-widest mr-2 text-[10px]">Explanation:</span> {q.explanation}
                          </div>
                        )}
                      </div>
                    )}

                    {q.q_type === 'cq' && (
                      <div className="mt-4 space-y-3 bg-[#0B0F19] p-4 rounded-xl border border-[#1E293B]">
                        {q.cq_parts?.map(p => (
                          <div className="text-xs" key={p.id}>
                            <span className="text-[#2563EB] font-black mr-2 uppercase">({p.label})</span> <span className="text-slate-200 font-medium">{p.question_text}</span>
                            {p.answer_text && <div className="pl-7 text-slate-400 mt-1.5"><span className="text-emerald-500/70 font-black text-[9px] uppercase tracking-widest mr-2">ANS:</span> {p.answer_text}</div>}
                          </div>
                        ))}
                      </div>
                    )}

                    {['sq', 'written'].includes(q.q_type) && (
                      <div className="mt-4 text-xs bg-[#0B0F19] p-4 rounded-xl border border-[#1E293B] text-slate-300 leading-relaxed font-medium">
                        <strong className="text-slate-500 font-black uppercase tracking-widest text-[10px] mr-2">Answer:</strong> {q.solution}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 🚀 ADD / EDIT DATA ENTRY FORM (Dark Theme) */}
          <div className="lg:col-span-5 flex flex-col h-full overflow-hidden bg-[#0B0F19] rounded-3xl border border-[#1E293B] shadow-lg">
            <div className="flex bg-[#07090E] p-2 border-b border-[#1E293B] shrink-0 rounded-t-3xl">
              {[{ id: 'mcq', label: 'MCQ' }, { id: 'sq1', label: 'Short Q' }, { id: 'sq2', label: 'Written Q' }, { id: 'cq', label: 'Creative' }].map(tab => (
                <button key={tab.id} type="button" onClick={() => setQType(tab.id)} className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all rounded-xl ${qType === tab.id ? 'bg-[#2563EB] text-white shadow-md shadow-[#2563EB]/20' : 'text-slate-500 hover:text-slate-200 hover:bg-[#1E293B]/50'}`}>{tab.label}</button>
              ))}
            </div>

            <form onSubmit={handleAddOrUpdateQuestion} className="flex-1 overflow-y-auto flex flex-col p-5 gap-6 custom-scrollbar">
              
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Main Question / Stem</label>
                <textarea required className="w-full p-4 bg-[#07090E] border border-[#1E293B] rounded-2xl focus:border-[#2563EB] outline-none resize-y min-h-[120px] text-sm text-slate-200 font-medium placeholder:text-slate-600 shadow-inner" value={newQ.text} onChange={(e) => setNewQ({...newQ, text: e.target.value})} placeholder="Write the question or scenario here..."></textarea>
                
                {['mcq', 'cq'].includes(qType) && (
                  <div className="flex items-center gap-3 bg-[#07090E] px-4 py-2.5 rounded-2xl border border-[#1E293B] focus-within:border-[#2563EB] shadow-inner">
                    <ImageIcon className="w-4 h-4 text-slate-500 shrink-0" />
                    <input type="text" className="flex-1 bg-transparent border-none focus:ring-0 text-xs font-medium outline-none text-slate-200 placeholder-slate-600" placeholder="Paste image URL here..." value={newQ.imagePath || ''} onChange={(e) => setNewQ({...newQ, imagePath: e.target.value})} disabled={isUploadingImage} />
                    <div className="w-px h-5 bg-[#1E293B]"></div>
                    <label className={`cursor-pointer px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isUploadingImage ? 'text-slate-600 cursor-not-allowed' : 'text-[#2563EB] bg-[#2563EB]/10 hover:bg-[#2563EB]/20'}`}>
                      {isUploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                      {isUploadingImage ? 'Uploading' : 'Upload File'}
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploadingImage} />
                    </label>
                  </div>
                )}
              </div>

              {qType === 'mcq' && (
                <div className="flex flex-col gap-4 bg-[#07090E]/50 p-5 rounded-2xl border border-[#1E293B]">
                  <label className="flex items-center gap-3 cursor-pointer w-max select-none group">
                    <input type="checkbox" className="hidden" checked={isPolyMCQ} onChange={(e) => setIsPolyMCQ(e.target.checked)} />
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isPolyMCQ ? 'bg-[#2563EB] border-[#2563EB]' : 'bg-[#0B0F19] border-[#1E293B] group-hover:border-slate-500'}`}>
                      {isPolyMCQ && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className="text-xs font-bold text-slate-300">Enable Multiple Completion (i, ii, iii)</span>
                  </label>
                  
                  {isPolyMCQ && (
                    <div className="space-y-3 mt-1">
                      {mcqStatements.map((stmt, idx) => (
                        <div key={idx} className="flex gap-3 items-center">
                          <span className="text-xs font-black text-slate-500 w-6 uppercase">{['i.', 'ii.', 'iii.'][idx]}</span>
                          <input type="text" className="flex-1 p-3 text-xs bg-[#0B0F19] border border-[#1E293B] rounded-xl focus:border-[#2563EB] outline-none text-slate-200 font-medium shadow-inner" placeholder={`Statement ${idx + 1}`} value={stmt} onChange={(e) => setMcqStatements(mcqStatements.map((s, i) => i === idx ? e.target.value : s))} required={isPolyMCQ} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-4 border-t border-[#1E293B] pt-5">
                {qType === 'mcq' && (
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Options (Select the correct one)</label>
                    {options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div onClick={() => setOptions(options.map((o, i) => ({...o, isCorrect: i===idx})))} className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center cursor-pointer font-black text-xs transition-all ${opt.isCorrect ? 'bg-[#2563EB] text-white shadow-lg shadow-[#2563EB]/30' : 'bg-[#07090E] border border-[#1E293B] text-slate-500 hover:text-slate-300'}`}>{String.fromCharCode(65+idx)}</div>
                        <input type="text" required className={`flex-1 p-3 text-xs font-medium rounded-xl outline-none transition-colors border shadow-inner ${opt.isCorrect ? 'bg-[#2563EB]/5 border-[#2563EB]/50 text-blue-200' : 'bg-[#07090E] border-[#1E293B] text-slate-300 focus:border-slate-500'}`} placeholder={`Option ${String.fromCharCode(65+idx)} text...`} value={opt.text} onChange={(e) => setOptions(options.map((o, i) => i === idx ? {...o, text: e.target.value} : o))} />
                      </div>
                    ))}
                    <div className="pt-3">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 block">Explanation (Optional)</label>
                       <textarea className="w-full p-4 bg-[#07090E] border border-[#1E293B] rounded-2xl focus:border-[#2563EB] text-xs font-medium outline-none text-slate-300 resize-y min-h-[80px] shadow-inner" value={newQ.explanation} onChange={(e) => setNewQ({...newQ, explanation: e.target.value})} placeholder="Why is this answer correct?"></textarea>
                    </div>
                  </div>
                )}

                {['sq1', 'sq2'].includes(qType) && (
                  <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Exact Answer / Solution</label>
                    <textarea required className="w-full p-4 bg-[#07090E] border border-[#1E293B] rounded-2xl focus:border-[#2563EB] outline-none resize-y min-h-[120px] text-sm text-slate-200 font-medium shadow-inner" placeholder="Provide direct answer or solution steps..." value={newQ.solution} onChange={(e) => setNewQ({...newQ, solution: e.target.value})}></textarea>
                  </div>
                )}

                {qType === 'cq' && (
                  <div className="space-y-5">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Creative Question Parts</label>
                    {cqParts.map((part, idx) => (
                      <div key={idx} className="flex flex-col gap-3 bg-[#07090E]/50 p-4 rounded-2xl border border-[#1E293B]">
                        <div className="flex gap-3 items-center">
                          <span className="text-[10px] font-black text-[#2563EB] w-6 uppercase">({part.label})</span>
                          <input type="text" required className="flex-1 p-3 text-xs bg-[#0B0F19] border border-[#1E293B] rounded-xl focus:border-[#2563EB] outline-none text-slate-200 font-medium shadow-inner" placeholder="Question text..." value={part.qText} onChange={(e) => setCqParts(cqParts.map((p, i) => i === idx ? {...p, qText: e.target.value} : p))} />
                        </div>
                        <div className="flex gap-3 items-start">
                          <span className="text-[10px] font-black text-slate-600 w-6 pt-3 uppercase">Ans:</span>
                          <textarea required className="flex-1 p-3 text-xs bg-[#0B0F19] border border-[#1E293B] rounded-xl focus:border-emerald-500/50 outline-none text-slate-300 resize-y min-h-[60px] font-medium shadow-inner" placeholder="Answer..." value={part.aText} onChange={(e) => setCqParts(cqParts.map((p, i) => i === idx ? {...p, aText: e.target.value} : p))}></textarea>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {['mcq', 'cq'].includes(qType) && (
                <div className="border-t border-[#1E293B] pt-5">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Board Assignments</label>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {boards.map(b => (
                      <button type="button" key={b.id} onClick={() => addBoardTag(b.id)} className="px-3 py-1.5 bg-[#07090E] border border-[#1E293B] rounded-lg hover:border-slate-500 text-[10px] font-bold text-slate-400 hover:text-white transition-colors">
                        + {b.short_name || b.name}
                      </button>
                    ))}
                  </div>

                  {boardTags.length > 0 && (
                    <div className="space-y-2 bg-[#07090E] p-4 rounded-2xl border border-[#1E293B]">
                      {boardTags.map(tag => (
                         <div key={tag.tempId} className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-300 flex-1 truncate pl-1">
                              {boardsMap[tag.boardId]?.name || 'Board'}
                            </span>
                            <input 
                              type="number" 
                              min="1990" max="2099" 
                              className="w-24 p-2 text-xs font-black bg-[#0B0F19] border border-[#1E293B] rounded-lg text-slate-200 outline-none focus:border-[#2563EB] text-center shadow-inner" 
                              placeholder="Year" 
                              value={tag.year} 
                              onChange={(e) => updateBoardYear(tag.tempId, e.target.value)} 
                            />
                            <button type="button" onClick={() => removeBoardTag(tag.tempId)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
                         </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-[#1E293B] pt-5 flex gap-3">
                <label className="flex-1 flex flex-col justify-center items-center gap-2 cursor-pointer p-3 rounded-2xl bg-[#07090E] border border-[#1E293B] hover:border-[#2563EB]/50 transition-colors select-none shadow-inner">
                  <input type="checkbox" className="hidden" checked={newQ.isExamMaterial} onChange={(e) => setNewQ({...newQ, isExamMaterial: e.target.checked})} />
                  <div className={`w-4 h-4 rounded-[4px] border transition-all flex items-center justify-center ${newQ.isExamMaterial ? 'bg-[#2563EB] border-[#2563EB] shadow-[0_0_10px_rgba(37,99,235,0.4)]' : 'bg-[#0B0F19] border-[#1E293B]'}`}>
                     {newQ.isExamMaterial && <CheckSquare className="w-3 h-3 text-white" />}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${newQ.isExamMaterial ? 'text-blue-300' : 'text-slate-500'}`}>Practice Flow</span>
                </label>
                
                <label className="flex-1 flex flex-col justify-center items-center gap-2 cursor-pointer p-3 rounded-2xl bg-[#07090E] border border-[#1E293B] hover:border-emerald-500/50 transition-colors select-none shadow-inner">
                  <input type="checkbox" className="hidden" checked={newQ.isContentMaterial} onChange={(e) => setNewQ({...newQ, isContentMaterial: e.target.checked})} />
                  <div className={`w-4 h-4 rounded-[4px] border transition-all flex items-center justify-center ${newQ.isContentMaterial ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-[#0B0F19] border-[#1E293B]'}`}>
                     {newQ.isContentMaterial && <CheckSquare className="w-3 h-3 text-white" />}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${newQ.isContentMaterial ? 'text-emerald-300' : 'text-slate-500'}`}>Core Reading</span>
                </label>

                <div className="flex-1 flex flex-col justify-center items-center gap-1.5 bg-[#07090E] border border-[#1E293B] rounded-2xl p-3 shadow-inner">
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Quality Rating</span>
                   <select className="bg-transparent text-sm outline-none text-amber-400 font-bold text-center appearance-none cursor-pointer mt-0.5" value={newQ.importance} onChange={(e) => setNewQ({...newQ, importance: parseInt(e.target.value)})}>
                    {[1,2,3,4,5].map(n => <option key={n} value={n} className="bg-[#0B0F19] text-amber-400 font-sans tracking-widest">{'★'.repeat(n)}</option>)}
                   </select>
                </div>
              </div>

              <div className="mt-3 flex gap-3 pt-2">
                {editingId && (
                  <button type="button" onClick={resetForm} className="px-6 py-3.5 bg-[#07090E] text-slate-400 hover:bg-[#1E293B] hover:text-white rounded-xl font-black text-[11px] uppercase tracking-widest transition-colors border border-[#1E293B]">Cancel Edit</button>
                )}
                <button type="submit" disabled={isSavingQuestion || isUploadingImage} className="flex-1 py-3.5 bg-[#2563EB] text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#2563EB]/20">
                  {(isSavingQuestion || isUploadingImage) ? <Loader2 className="w-4 h-4 animate-spin"/> : editingId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {isSavingQuestion ? 'Saving Data...' : isUploadingImage ? 'Uploading Image...' : editingId ? 'Update Question' : 'Save Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DatabaseIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5V19A9 3 0 0 0 21 19V5" />
      <path d="M3 12A9 3 0 0 0 21 12" />
    </svg>
  )
}
function FolderOpenIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2" />
    </svg>
  )
}