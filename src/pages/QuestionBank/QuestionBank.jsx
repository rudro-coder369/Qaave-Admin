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

  // 🚀 FIXED: O(1) Lookup for Boards instead of O(n) mapping in renders
  const boardsMap = useMemo(() => {
    return boards.reduce((acc, board) => {
      acc[board.id] = board;
      return acc;
    }, {});
  }, [boards]);

  // 🚀 Helper for Unique IDs
  const generateId = () => window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2);

  // Initial Fetch
  useEffect(() => { 
    taxonomyApi.getSubjects().then(setSubjects).catch(err => toast.error("Failed to load subjects: " + err.message));
    questionService.getBoards().then(setBoards).catch(err => toast.error("Failed to load boards: " + err.message));
  }, []);
  
  // 🚀 FIXED: Race Condition handling with isMounted flag
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

  // 🚀 FIXED: Centralized Reset avoiding double calls
  const resetForm = () => {
    setEditingId(null);
    setNewQ({ text: '', imagePath: '', explanation: '', solution: '', importance: 3, isExamMaterial: false, isContentMaterial: false });
    setBoardTags([]);
    setIsPolyMCQ(false);
    setMcqStatements(['', '', '']);
    setOptions([{ text: '', isCorrect: true }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }]);
    setCqParts([{ label: 'k', qText: '', aText: '' }, { label: 'kh', qText: '', aText: '' }, { label: 'g', qText: '', aText: '' }, { label: 'gh', qText: '', aText: '' }]);
  };

  // Dropdown Handlers (Manages cascade changes & form resets centrally)
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
        // 🚀 FIXED: Prevent >4 options rendering in case of DB corruption
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
    
    // 🚀 FIXED: Trim whitespace check
    if (!newQ.text.trim()) return toast.error("The main question text cannot be empty.");

    // 🚀 FIXED: MCQ Statements Validation
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
      
      // Refresh the list manually to reflect new data
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
        <optgroup key={mainChap.id} label={`${sectionPrefix}${mainChap.chapter_label || 'CH'}: ${mainChap.title}`} className="bg-slate-900 text-slate-400 font-bold">
          <option value={mainChap.id} className="text-slate-200 bg-slate-900 font-medium">• {mainChap.title} (Main)</option>
          {subChapters.map(subChap => (
            <option key={subChap.id} value={subChap.id} className="text-blue-300 bg-slate-900 font-medium">&nbsp;&nbsp;&nbsp;↳ {subChap.chapter_label || 'Sub'}: {subChap.title}</option>
          ))}
        </optgroup>
      );
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] text-slate-200 font-sans">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #334155' } }} />
      
      {/* 🚀 UI FLAT DESIGN UPDATE: Clean Headers & Nav */}
      <div className="bg-slate-900 px-6 py-4 rounded-lg border border-slate-800 mb-4 flex flex-col lg:flex-row items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="p-2 bg-blue-600/10 rounded"><DatabaseIcon className="w-5 h-5 text-blue-500" /></div>
          <div>
            <h1 className="text-lg font-bold text-slate-100 leading-tight">Question Database</h1>
          </div>
        </div>

        <div className="flex flex-col md:flex-row flex-1 w-full lg:max-w-2xl gap-3">
          <select className="flex-1 p-2.5 bg-slate-950 border border-slate-700 rounded focus:border-blue-500 outline-none text-xs font-semibold text-slate-200 transition-colors" value={selectedSub} onChange={handleSubjectChange}>
            <option value="" className="bg-slate-950 text-slate-400">1. Select Subject</option>
            {subjects.map(s => <option key={s.id} value={s.id} className="bg-slate-950 text-slate-200">{s.name}</option>)}
          </select>
          <select className="flex-1 p-2.5 bg-slate-950 border border-slate-700 rounded focus:border-blue-500 outline-none disabled:opacity-50 text-xs font-semibold text-slate-200 transition-colors" value={selectedChap} onChange={handleChapterChange} disabled={!selectedSub}>
            <option value="" className="bg-slate-950 text-slate-400">2. Select Chapter</option>
            {renderChapterOptions()}
          </select>
          <select className="flex-1 p-2.5 bg-slate-950 border border-slate-700 rounded focus:border-blue-500 outline-none disabled:opacity-50 text-xs font-semibold text-slate-200 transition-colors" value={selectedTop} onChange={handleTopicChange} disabled={!selectedChap}>
            <option value="" className="bg-slate-950 text-slate-400">3. Filter by Topic (Optional)</option>
            {topics.map(t => <option key={t.id} value={t.id} className="bg-slate-950 text-slate-200">{t.topic_order}. {t.title}</option>)}
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
            existingQuestions={questions} // 🚀 ADDED existingQuestions for duplicate validation
          />
        )}
      </div>

      {!selectedChap ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 rounded-lg border border-slate-800 text-slate-500">
          <Search className="w-8 h-8 text-blue-500 mb-3 opacity-50" />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Select Subject & Chapter to view repository</p>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0 pb-2">
          
          {/* 🚀 LIVE REPOSITORY LIST */}
          <div className="lg:col-span-7 flex flex-col bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
             <div className="p-3 bg-slate-950 border-b border-slate-800 flex justify-between items-center shrink-0">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-blue-500" /> Database List
              </span>
              <div className="flex gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">Practice: {questions.filter(q => q.is_exam_material).length}</span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Content: {questions.filter(q => q.is_content_material).length}</span>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Exam (3+⭐): {questions.filter(q => q.importance >= 3).length}</span>
                <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">Total: {questions.length}</span>
              </div>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
              {isFetchingQuestions ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500"><Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2" /><span className="text-xs">Loading data...</span></div>
              ) : questions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-70"><FolderOpenIcon className="w-10 h-10 mb-2" /><span className="text-xs font-semibold">No questions found</span></div>
              ) : (
                questions.map((q, idx) => (
                  <div key={q.id} className={`p-4 rounded-lg border transition-all duration-200 group relative ${editingId === q.id ? 'bg-blue-950/30 border-blue-500/50' : 'bg-slate-800/40 border-slate-700 hover:border-slate-600'}`}>
                    <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button onClick={() => handleEditClick(q)} className="p-1.5 text-blue-400 bg-blue-900/50 rounded hover:bg-blue-600 hover:text-white transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteQuestion(q.id)} className="p-1.5 text-rose-400 bg-rose-900/50 rounded hover:bg-rose-600 hover:text-white transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>

                    <div className="mb-3 pr-16 flex flex-wrap gap-2 items-center">
                      <span className="text-[10px] font-bold text-slate-200 bg-slate-700 px-2 py-0.5 rounded border border-slate-600">{q.q_type.toUpperCase()}</span>
                      {q.is_exam_material && <span className="text-[10px] font-bold text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">PRACTICE</span>}
                      {q.is_content_material && <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">CONTENT</span>}
                      {q.importance >= 3 && <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1"><Star className="w-3 h-3"/> EXAM</span>}
                      
                      {q.question_board_history?.map((history, hIdx) => (
                        <span
                          key={`${history.boards?.id}-${history.year}-${hIdx}`}
                          className="text-[10px] font-semibold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-600"
                        >
                          {history.boards?.short_name || history.boards?.name} '
                          {String(history.year).slice(-2)}
                        </span>
                      ))}
                    </div>

                    <p className="text-slate-200 text-sm leading-relaxed mb-3"><span className="text-slate-500 font-bold mr-2">{idx + 1}.</span>{q.question_text}</p>
                    {q.question_image_path && <img src={q.question_image_path} alt="Question Graphic" className="max-h-32 object-contain mb-3 rounded border border-slate-700" />}
                    
                    {q.q_type === 'mcq' && q.mcq_statements && q.mcq_statements.length > 0 && (
                      <div className="mt-2 mb-3 pl-3 py-2 border-l-2 border-slate-600 text-xs text-slate-300 space-y-1.5">
                        <div className="flex gap-2"><span className="font-semibold text-blue-400 w-4">i.</span> {q.mcq_statements[0]}</div>
                        <div className="flex gap-2"><span className="font-semibold text-blue-400 w-4">ii.</span> {q.mcq_statements[1]}</div>
                        <div className="flex gap-2"><span className="font-bold text-blue-400 w-4">iii.</span> {q.mcq_statements[2]}</div>
                      </div>
                    )}

                    {q.q_type === 'mcq' && (
                      <div className="mt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {q.mcq_options?.map((opt, i) => (
                            <div key={opt.id} className={`px-3 py-2 text-xs rounded border flex items-start gap-2 ${opt.is_correct ? 'bg-blue-900/20 border-blue-500/40 text-blue-100 font-medium' : 'bg-slate-800/40 border-slate-700 text-slate-400'}`}>
                              <span className={`flex items-center justify-center w-4 h-4 rounded-sm text-[10px] font-bold mt-px shrink-0 ${opt.is_correct ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}>{String.fromCharCode(65 + i)}</span>
                              <span className="leading-snug">{opt.option_text}</span>
                            </div>
                          ))}
                        </div>
                        {q.explanation && (
                          <div className="mt-3 p-3 bg-slate-800/60 border border-slate-700 rounded text-xs text-slate-300">
                            <span className="font-semibold text-slate-400 mr-2">Explanation:</span> {q.explanation}
                          </div>
                        )}
                      </div>
                    )}

                    {q.q_type === 'cq' && (
                      <div className="mt-3 space-y-2.5 bg-slate-800/40 p-3 rounded border border-slate-700">
                        {q.cq_parts?.map(p => (
                          <div className="text-xs" key={p.id}>
                            <span className="text-blue-400 font-bold mr-1">({p.label})</span> <span className="text-slate-200">{p.question_text}</span>
                            {p.answer_text && <div className="pl-6 text-slate-400 mt-1"><span className="text-slate-500 font-semibold text-[10px]">ANS:</span> {p.answer_text}</div>}
                          </div>
                        ))}
                      </div>
                    )}

                    {['sq', 'written'].includes(q.q_type) && (
                      <div className="mt-3 text-xs bg-slate-800/40 p-3 rounded border border-slate-700 text-slate-300 leading-relaxed">
                        <strong className="text-slate-400 mr-2">Answer:</strong> {q.solution}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 🚀 ADD / EDIT DATA ENTRY FORM */}
          <div className="lg:col-span-5 flex flex-col h-full overflow-hidden bg-slate-900 rounded-lg border border-slate-800">
            <div className="flex bg-slate-950 p-1 border-b border-slate-800 shrink-0">
              {[{ id: 'mcq', label: 'MCQ' }, { id: 'sq1', label: 'Short Q' }, { id: 'sq2', label: 'Written Q' }, { id: 'cq', label: 'Creative (CQ)' }].map(tab => (
                <button key={tab.id} type="button" onClick={() => setQType(tab.id)} className={`flex-1 py-2 text-xs font-semibold transition-colors rounded-md ${qType === tab.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>{tab.label}</button>
              ))}
            </div>

            <form onSubmit={handleAddOrUpdateQuestion} className="flex-1 overflow-y-auto flex flex-col p-4 gap-5 custom-scrollbar">
              
              <div className="flex flex-col gap-3">
                <label className="text-xs font-semibold text-slate-400">Main Question / Stem</label>
                <textarea required className="w-full p-3 bg-slate-950 border border-slate-700 rounded focus:border-blue-500 outline-none resize-y min-h-[100px] text-sm text-slate-200 placeholder:text-slate-600" value={newQ.text} onChange={(e) => setNewQ({...newQ, text: e.target.value})} placeholder="Write the question or scenario here..."></textarea>
                
                {['mcq', 'cq'].includes(qType) && (
                  <div className="flex items-center gap-3 bg-slate-950 px-3 py-2 rounded border border-slate-700 focus-within:border-blue-500">
                    <ImageIcon className="w-4 h-4 text-slate-500 shrink-0" />
                    <input type="text" className="flex-1 bg-transparent border-none focus:ring-0 text-xs outline-none text-slate-200 placeholder-slate-600" placeholder="Paste image URL here..." value={newQ.imagePath || ''} onChange={(e) => setNewQ({...newQ, imagePath: e.target.value})} disabled={isUploadingImage} />
                    <div className="w-px h-4 bg-slate-700"></div>
                    <label className={`cursor-pointer px-2 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 ${isUploadingImage ? 'text-slate-500 cursor-not-allowed' : 'text-blue-400 hover:bg-blue-500/10'}`}>
                      {isUploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                      {isUploadingImage ? 'Uploading' : 'Upload File'}
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploadingImage} />
                    </label>
                  </div>
                )}
              </div>

              {qType === 'mcq' && (
                <div className="flex flex-col gap-3 bg-slate-800/30 p-4 rounded border border-slate-700/50">
                  <label className="flex items-center gap-2 cursor-pointer w-max select-none group">
                    <input type="checkbox" className="hidden" checked={isPolyMCQ} onChange={(e) => setIsPolyMCQ(e.target.checked)} />
                    <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${isPolyMCQ ? 'bg-blue-600 border-blue-600' : 'bg-slate-950 border-slate-600 group-hover:border-slate-400'}`}>
                      {isPolyMCQ && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className="text-xs font-semibold text-slate-300">Enable Multiple Completion (i, ii, iii)</span>
                  </label>
                  
                  {isPolyMCQ && (
                    <div className="space-y-2 mt-2">
                      {mcqStatements.map((stmt, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <span className="text-xs font-bold text-slate-400 w-6">{['i.', 'ii.', 'iii.'][idx]}</span>
                          <input type="text" className="flex-1 p-2 text-xs bg-slate-950 border border-slate-700 rounded focus:border-blue-500 outline-none text-slate-200" placeholder={`Statement ${idx + 1}`} value={stmt} onChange={(e) => setMcqStatements(mcqStatements.map((s, i) => i === idx ? e.target.value : s))} required={isPolyMCQ} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-slate-800 pt-4">
                {qType === 'mcq' && (
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-slate-400">Options (Select the correct one)</label>
                    {options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div onClick={() => setOptions(options.map((o, i) => ({...o, isCorrect: i===idx})))} className={`w-6 h-6 shrink-0 rounded flex items-center justify-center cursor-pointer font-bold text-xs transition-colors ${opt.isCorrect ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{String.fromCharCode(65+idx)}</div>
                        <input type="text" required className={`flex-1 p-2 text-sm rounded outline-none transition-colors border ${opt.isCorrect ? 'bg-blue-900/20 border-blue-500/50 text-blue-100' : 'bg-slate-950 border-slate-700 text-slate-300 focus:border-slate-500'}`} placeholder={`Option ${String.fromCharCode(65+idx)} text...`} value={opt.text} onChange={(e) => setOptions(options.map((o, i) => i === idx ? {...o, text: e.target.value} : o))} />
                      </div>
                    ))}
                    <div className="pt-2">
                       <label className="text-xs font-semibold text-slate-400 mb-2 block">Explanation (Optional)</label>
                       <textarea className="w-full p-3 bg-slate-950 border border-slate-700 rounded focus:border-blue-500 text-xs outline-none text-slate-300 resize-y min-h-[60px]" value={newQ.explanation} onChange={(e) => setNewQ({...newQ, explanation: e.target.value})} placeholder="Why is this answer correct?"></textarea>
                    </div>
                  </div>
                )}

                {['sq1', 'sq2'].includes(qType) && (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-slate-400">Exact Answer / Solution</label>
                    <textarea required className="w-full p-3 bg-slate-950 border border-slate-700 rounded focus:border-blue-500 outline-none resize-y min-h-[100px] text-sm text-slate-200" placeholder="Provide direct answer or solution steps..." value={newQ.solution} onChange={(e) => setNewQ({...newQ, solution: e.target.value})}></textarea>
                  </div>
                )}

                {qType === 'cq' && (
                  <div className="space-y-4">
                     <label className="text-xs font-semibold text-slate-400 mb-1 block">Creative Question Parts</label>
                    {cqParts.map((part, idx) => (
                      <div key={idx} className="flex flex-col gap-2 bg-slate-800/30 p-3 rounded border border-slate-700/50">
                        <div className="flex gap-3 items-center">
                          <span className="text-xs font-bold text-slate-400 w-4">({part.label})</span>
                          <input type="text" required className="flex-1 p-2 text-xs bg-slate-950 border border-slate-700 rounded focus:border-blue-500 outline-none text-slate-200" placeholder="Question text..." value={part.qText} onChange={(e) => setCqParts(cqParts.map((p, i) => i === idx ? {...p, qText: e.target.value} : p))} />
                        </div>
                        <div className="flex gap-3 items-start">
                          <span className="text-[10px] font-bold text-slate-500 w-4 pt-2">Ans:</span>
                          <textarea required className="flex-1 p-2 text-xs bg-slate-950 border border-slate-700 rounded focus:border-slate-500 outline-none text-slate-300 resize-y min-h-[50px]" placeholder="Answer..." value={part.aText} onChange={(e) => setCqParts(cqParts.map((p, i) => i === idx ? {...p, aText: e.target.value} : p))}></textarea>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {['mcq', 'cq'].includes(qType) && (
                <div className="border-t border-slate-800 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-semibold text-slate-400">Board Assignments</label>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {boards.map(b => (
                      <button type="button" key={b.id} onClick={() => addBoardTag(b.id)} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded hover:border-slate-500 text-[10px] font-semibold text-slate-300 hover:text-white transition-colors">
                        + {b.short_name || b.name}
                      </button>
                    ))}
                  </div>

                  {boardTags.length > 0 && (
                    <div className="space-y-2 bg-slate-950 p-3 rounded border border-slate-800">
                      {boardTags.map(tag => (
                         <div key={tag.tempId} className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-slate-300 flex-1 truncate">
                              {boardsMap[tag.boardId]?.name || 'Board'}
                            </span>
                            <input 
                              type="number" 
                              min="1990" max="2099" 
                              className="w-20 p-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-slate-200 outline-none focus:border-blue-500 text-center" 
                              placeholder="Year" 
                              value={tag.year} 
                              onChange={(e) => updateBoardYear(tag.tempId, e.target.value)} 
                            />
                            <button type="button" onClick={() => removeBoardTag(tag.tempId)} className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"><X className="w-4 h-4" /></button>
                         </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-slate-800 pt-4 flex gap-3">
                <label className="flex-1 flex flex-col justify-center items-center gap-1 cursor-pointer p-2 rounded bg-slate-950 border border-slate-800 hover:border-slate-600 transition-colors select-none">
                  <input type="checkbox" className="hidden" checked={newQ.isExamMaterial} onChange={(e) => setNewQ({...newQ, isExamMaterial: e.target.checked})} />
                  <div className={`w-3.5 h-3.5 rounded-sm border transition-colors flex items-center justify-center ${newQ.isExamMaterial ? 'bg-blue-600 border-blue-600' : 'bg-slate-900 border-slate-600'}`}>
                     {newQ.isExamMaterial && <CheckSquare className="w-3 h-3 text-white" />}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${newQ.isExamMaterial ? 'text-slate-200' : 'text-slate-500'}`}>Practice Flow</span>
                </label>
                
                <label className="flex-1 flex flex-col justify-center items-center gap-1 cursor-pointer p-2 rounded bg-slate-950 border border-slate-800 hover:border-slate-600 transition-colors select-none">
                  <input type="checkbox" className="hidden" checked={newQ.isContentMaterial} onChange={(e) => setNewQ({...newQ, isContentMaterial: e.target.checked})} />
                  <div className={`w-3.5 h-3.5 rounded-sm border transition-colors flex items-center justify-center ${newQ.isContentMaterial ? 'bg-emerald-600 border-emerald-600' : 'bg-slate-900 border-slate-600'}`}>
                     {newQ.isContentMaterial && <CheckSquare className="w-3 h-3 text-white" />}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${newQ.isContentMaterial ? 'text-slate-200' : 'text-slate-500'}`}>Core Reading</span>
                </label>

                <div className="flex-1 flex flex-col justify-center items-center gap-1 bg-slate-950 border border-slate-800 rounded p-2">
                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quality Rating</span>
                   <select className="bg-transparent text-sm outline-none text-amber-400 font-bold text-center appearance-none cursor-pointer mt-0.5" value={newQ.importance} onChange={(e) => setNewQ({...newQ, importance: parseInt(e.target.value)})}>
                    {[1,2,3,4,5].map(n => <option key={n} value={n} className="bg-slate-900 text-amber-400">{'★'.repeat(n)}</option>)}
                   </select>
                </div>
              </div>

              <div className="mt-2 flex gap-3 pt-2">
                {editingId && (
                  <button type="button" onClick={resetForm} className="px-5 py-2.5 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded font-bold text-xs transition-colors border border-slate-700">Cancel Edit</button>
                )}
                <button type="submit" disabled={isSavingQuestion || isUploadingImage} className="flex-1 py-2.5 bg-blue-600 text-white rounded font-bold text-sm hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
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