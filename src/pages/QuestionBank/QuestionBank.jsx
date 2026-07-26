import { useState, useEffect } from 'react';
import { taxonomyApi } from '../../services/taxonomyService';
import { questionService } from '../../services/questionService';
import toast, { Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx'; 
import { Plus, Zap, Image as ImageIcon, Trash2, BookOpen, Search, CheckCircle2, Layers, X, Loader2, AlignLeft, Settings, CheckSquare, Download, UploadCloud, Pencil } from 'lucide-react';

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
  const [editingId, setEditingId] = useState(null); 

  // Ultimate Form State
  const [qType, setQType] = useState('mcq');
  const [newQ, setNewQ] = useState({
    text: '', imagePath: '', explanation: '', solution: '', 
    importance: 3, isExamMaterial: false, isContentMaterial: false
  });
  
  const [boardTags, setBoardTags] = useState([]);

  const [options, setOptions] = useState([
    { text: '', isCorrect: true }, { text: '', isCorrect: false },
    { text: '', isCorrect: false }, { text: '', isCorrect: false }
  ]);
  
  const [cqParts, setCqParts] = useState([
    { label: 'k', qText: '', aText: '' }, { label: 'kh', qText: '', aText: '' },
    { label: 'g', qText: '', aText: '' }, { label: 'gh', qText: '', aText: '' }
  ]);

  useEffect(() => { 
    taxonomyApi.getSubjects().then(setSubjects).catch(err => toast.error(err.message));
    questionService.getBoards().then(setBoards).catch(err => toast.error("Failed to load Boards: " + err.message));
  }, []);
  
  useEffect(() => {
    if (selectedSub) {
      taxonomyApi.getChapters(selectedSub).then(setChapters);
      setSelectedChap(''); setSelectedTop(''); setQuestions([]); resetForm();
    }
  }, [selectedSub]);

  useEffect(() => {
    if (selectedChap) {
      taxonomyApi.getTopics(selectedChap).then(setTopics);
      setSelectedTop(''); resetForm();
    } else {
      setTopics([]); setQuestions([]); resetForm();
    }
  }, [selectedChap]);

  const fetchQuestions = () => {
    if (!selectedChap) return;
    setIsFetchingQuestions(true);
    questionService.getQuestions(selectedChap, selectedTop || null)
      .then(setQuestions)
      .catch(err => toast.error(err.message))
      .finally(() => setIsFetchingQuestions(false));
  };

  useEffect(() => { fetchQuestions(); }, [selectedChap, selectedTop]);

  // 🚀 FORM RESET FUNCTION
  const resetForm = () => {
    setEditingId(null);
    setNewQ({ text: '', imagePath: '', explanation: '', solution: '', importance: 3, isExamMaterial: false, isContentMaterial: false });
    setBoardTags([]);
    setOptions([{ text: '', isCorrect: true }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }]);
    setCqParts([{ label: 'k', qText: '', aText: '' }, { label: 'kh', qText: '', aText: '' }, { label: 'g', qText: '', aText: '' }, { label: 'gh', qText: '', aText: '' }]);
  };

  // 🚀 EDIT FUNCTION (Populates the form)
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

    if (q.q_type === 'mcq' && q.mcq_options) {
      const formattedOptions = q.mcq_options.map(o => ({ text: o.option_text, isCorrect: o.is_correct }));
      while(formattedOptions.length < 4) formattedOptions.push({ text: '', isCorrect: false });
      setOptions(formattedOptions);
    }

    if (q.q_type === 'cq' && q.cq_parts) {
      const parts = ['k', 'kh', 'g', 'gh'].map(label => {
        const existing = q.cq_parts.find(p => p.label === label);
        return { label, qText: existing?.question_text || '', aText: existing?.answer_text || '' };
      });
      setCqParts(parts);
    }

    // 🔥 FIX: Properly map Board Tags on Edit
    if (q.question_board_history) {
      setBoardTags(q.question_board_history.map(h => ({ 
        boardId: h.board_id || h.boards?.id, 
        year: h.year 
      })));
    } else {
      setBoardTags([]);
    }

    toast.success("Question loaded for editing.", { icon: '✏️' });
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      await questionService.deleteQuestion(id);
      setQuestions(questions.filter(q => q.id !== id));
      if (editingId === id) resetForm();
      toast.success('Question deleted successfully!');
    } catch (error) { toast.error("Failed to delete: " + error.message); }
  };

  // 🚀 SMART BOARD SELECTION LOGIC
  const toggleBoardTag = (boardId) => {
    const exists = boardTags.find(b => b.boardId === boardId);
    if (exists) {
      setBoardTags(boardTags.filter(b => b.boardId !== boardId));
    } else {
      setBoardTags([...boardTags, { boardId, year: new Date().getFullYear().toString() }]);
    }
  };

  const updateBoardYear = (boardId, year) => {
    setBoardTags(boardTags.map(b => b.boardId === boardId ? { ...b, year } : b));
  };

  // 🚀 SUBMIT FUNCTION
  const handleAddOrUpdateQuestion = async (e) => {
    e.preventDefault();
    if (!selectedChap) return toast.error("Select at least Subject & Chapter!");
    if (!newQ.text) return toast.error("Question stem/text is empty!");

    const actualQType = qType === 'sq1' ? 'sq' : qType === 'sq2' ? 'written' : qType;
    const validBoardTags = boardTags.filter(b => b.boardId && b.year);

    const payload = {
      subjectId: selectedSub, chapterId: selectedChap, topicId: selectedTop || null,
      qType: actualQType, text: newQ.text, imagePath: ['mcq', 'cq'].includes(qType) ? newQ.imagePath : null,
      explanation: newQ.explanation, solution: newQ.solution, importance: newQ.importance,
      isExamMaterial: newQ.isExamMaterial, isContentMaterial: newQ.isContentMaterial,
      optionsArray: qType === 'mcq' ? options : null, cqParts: qType === 'cq' ? cqParts : null,
      boardTags: ['mcq', 'cq'].includes(qType) ? validBoardTags : []
    };

    try {
      setIsSavingQuestion(true);
      if (editingId) {
        await questionService.updateQuestion(editingId, payload);
        toast.success(`Question updated successfully!`);
      } else {
        await questionService.addQuestion(payload);
        toast.success(`Question saved seamlessly!`);
      }
      resetForm();
      fetchQuestions();
    } catch (error) { toast.error("Error: " + error.message); } 
    finally { setIsSavingQuestion(false); }
  };

  // 🚀 EXCEL TEMPLATES & UPLOAD 
  const downloadSpecificTemplate = (type) => {
    // ... [No changes needed in Excel generation] ...
    let templateData = [];
    let fileName = "";
    if (type === 'mcq') {
      templateData = [{ Type: "mcq", Question_Stem: "নিচের কোনটি ভেক্টর রাশি?", Image_URL: "", Importance_1_to_5: 5, Is_Exam_Material: "TRUE", Is_Content_Material: "TRUE", Option_A: "কাজ", Option_B: "তাপমাত্রা", Option_C: "বেগ", Option_D: "দ্রুতি", Correct_Option_ABCD: "C", Explanation: "বেগের মান ও দিক উভয়ই আছে।", Board_Tags: "Dhaka-2023, Comilla-2022" }];
      fileName = "Qaave_MCQ_Template.xlsx";
    } else if (type === 'sq1') {
      templateData = [{ Type: "sq", Question_Stem: "বলবিদ্যা কাকে বলে?", Image_URL: "", Importance_1_to_5: 3, Is_Exam_Material: "FALSE", Is_Content_Material: "TRUE", Exact_Solution: "পদার্থবিজ্ঞানের যে শাখায় বল ও বস্তুর গতির সম্পর্ক নিয়ে আলোচনা করা হয়...", Board_Tags: "Rajshahi-2021" }];
      fileName = "Qaave_SQ_1_Mark_Template.xlsx";
    } else if (type === 'sq2') {
      templateData = [{ Type: "written", Question_Stem: "গাড়ির টায়ার খাঁজকাটা থাকে কেন?", Image_URL: "", Importance_1_to_5: 4, Is_Exam_Material: "TRUE", Is_Content_Material: "TRUE", Exact_Solution: "ঘর্ষণ বল বৃদ্ধি করার জন্য...", Board_Tags: "Sylhet-2023" }];
      fileName = "Qaave_SQ_2_Marks_Template.xlsx";
    } else if (type === 'cq') {
      templateData = [{ Type: "cq", Stem_Text: "একটি গাড়ি স্থির অবস্থান থেকে... (উদ্দীপক)", Image_URL: "https://example.com/car.jpg", Importance_1_to_5: 4, Is_Exam_Material: "TRUE", Is_Content_Material: "FALSE", Q_K: "ত্বরণ কাকে বলে?", Ans_K: "সময়ের সাথে বেগ বৃদ্ধির হারকে...", Q_Kh: "সুষম ত্বরণ কী?", Ans_Kh: "বেগ নির্দিষ্ট দিকে...", Q_G: "5 সেকেন্ডে কত দূরত্ব?", Ans_G: "25 মিটার", Q_Gh: "গ্রাফটি বিশ্লেষণ করো।", Ans_Gh: "মূলবিন্দুগামী সরলরেখা হবে...", Board_Tags: "Cadet College-2024" }];
      fileName = "Qaave_CQ_Template.xlsx";
    }
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Questions");
    XLSX.writeFile(workbook, fileName);
    toast.success(`${fileName} Downloaded!`);
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!selectedChap) return toast.error("Please select Subject & Chapter from UI first!");
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setIsSavingQuestion(true);
        toast.loading(`Uploading data, please wait...`, { id: "excel-upload" });
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(worksheet);
        if (rawData.length === 0) throw new Error("The uploaded Excel file is empty.");
        let successCount = 0;
        for (const row of rawData) {
          try {
            const rowQType = String(row.Type || 'mcq').toLowerCase().trim();
            let validBoardTags = [];
            if (row.Board_Tags) {
              validBoardTags = String(row.Board_Tags).split(',').map(tag => {
                const [boardName, year] = tag.trim().split('-');
                if(!boardName || !year) return null;
                const foundBoard = boards.find(b => b.short_name?.toLowerCase() === boardName.toLowerCase() || b.name?.toLowerCase() === boardName.toLowerCase());
                return { boardId: foundBoard?.id || '', year: parseInt(year) };
              }).filter(b => b && b.boardId && b.year);
            }
            const optionsArray = rowQType === 'mcq' ? [
              { text: String(row.Option_A || ''), isCorrect: String(row.Correct_Option_ABCD || '').trim().toUpperCase() === 'A' },
              { text: String(row.Option_B || ''), isCorrect: String(row.Correct_Option_ABCD || '').trim().toUpperCase() === 'B' },
              { text: String(row.Option_C || ''), isCorrect: String(row.Correct_Option_ABCD || '').trim().toUpperCase() === 'C' },
              { text: String(row.Option_D || ''), isCorrect: String(row.Correct_Option_ABCD || '').trim().toUpperCase() === 'D' }
            ] : null;
            const rowCqParts = rowQType === 'cq' ? [
              { label: 'k', qText: row.Q_K || '', aText: row.Ans_K || '' }, { label: 'kh', qText: row.Q_Kh || '', aText: row.Ans_Kh || '' },
              { label: 'g', qText: row.Q_G || '', aText: row.Ans_G || '' }, { label: 'gh', qText: row.Q_Gh || '', aText: row.Ans_Gh || '' }
            ] : null;
            await questionService.addQuestion({
              subjectId: selectedSub, chapterId: selectedChap, topicId: selectedTop || null,
              qType: rowQType, text: row.Question_Stem || row.Stem_Text || '', imagePath: row.Image_URL || null,
              explanation: row.Explanation || '', solution: ['sq', 'written'].includes(rowQType) ? (row.Exact_Solution || '') : '',
              importance: parseInt(row.Importance_1_to_5) || 3, isExamMaterial: String(row.Is_Exam_Material).toUpperCase() === 'TRUE',
              isContentMaterial: String(row.Is_Content_Material).toUpperCase() === 'TRUE', optionsArray, cqParts: rowCqParts, boardTags: validBoardTags
            });
            successCount++;
          } catch (rowError) { console.error("Failed to add row:", row, rowError); }
        }
        if (successCount === 0) throw new Error("No valid questions could be imported.");
        toast.success(`Successfully imported ${successCount} out of ${rawData.length} questions!`, { id: "excel-upload" });
        fetchQuestions();
      } catch (err) { toast.error("Import failed: " + err.message, { id: "excel-upload" }); } 
      finally { setIsSavingQuestion(false); }
    };
    reader.readAsBinaryString(file);
    e.target.value = null; 
  };

  const renderChapterOptions = () => {
    const mainChapters = chapters.filter(c => !c.parent_chapter_id);
    return mainChapters.map(mainChap => {
      const subChapters = chapters.filter(c => c.parent_chapter_id === mainChap.id);
      const sectionPrefix = mainChap.section_name ? `[${mainChap.section_name}] ` : '';
      return (
        <optgroup key={mainChap.id} label={`${sectionPrefix}${mainChap.chapter_label || 'CH'}: ${mainChap.title}`}>
          <option value={mainChap.id} className="text-slate-200 bg-[#07090E]">• {mainChap.title} (Main)</option>
          {subChapters.map(subChap => (
            <option key={subChap.id} value={subChap.id} className="text-blue-300 bg-[#0B0F19] font-medium">&nbsp;&nbsp;&nbsp;↳ {subChap.chapter_label || 'Sub'}: {subChap.title}</option>
          ))}
        </optgroup>
      );
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] text-slate-200">
      <Toaster position="top-right" toastOptions={{ style: { background: '#0B0F19', color: '#F1F5F9', border: '1px solid #1E293B' } }} />
      
      {/* 🚀 Header Actions (Glassmorphism Line) */}
      <div className="bg-[#0B0F19]/80 backdrop-blur-md px-6 py-4 rounded-xl border border-slate-800/60 mb-4 flex flex-col lg:flex-row items-center justify-between gap-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="p-2 bg-[#2563EB]/10 rounded-lg"><Layers className="w-5 h-5 text-[#2563EB]" /></div>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight leading-none">Content Repository</h1>
          </div>
        </div>

        <div className="flex flex-col md:flex-row flex-1 w-full lg:max-w-2xl gap-2">
          <select className="flex-1 p-2.5 bg-slate-900/50 border border-slate-800 rounded-lg focus:border-blue-500 outline-none text-xs font-bold text-slate-300 transition-all" value={selectedSub} onChange={(e) => setSelectedSub(e.target.value)}>
            <option value="">1. Select Subject</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="flex-1 p-2.5 bg-slate-900/50 border border-slate-800 rounded-lg focus:border-blue-500 outline-none disabled:opacity-40 text-xs font-bold text-slate-300 transition-all" value={selectedChap} onChange={(e) => setSelectedChap(e.target.value)} disabled={!selectedSub}>
            <option value="">2. Select Chapter</option>
            {renderChapterOptions()}
          </select>
          <select className="flex-1 p-2.5 bg-blue-900/10 border border-blue-900/30 rounded-lg focus:border-blue-500 outline-none disabled:opacity-40 text-xs font-bold text-blue-400 transition-all" value={selectedTop} onChange={(e) => setSelectedTop(e.target.value)} disabled={!selectedChap}>
            <option value="" className="bg-slate-900 text-slate-400">3. Filter by Topic</option>
            {topics.map(t => <option key={t.id} value={t.id} className="bg-slate-900">{t.topic_order}. {t.title}</option>)}
          </select>
        </div>

        {selectedChap && (
          <div className="hidden lg:flex gap-2 items-center">
            <select onChange={(e) => { if(e.target.value) { downloadSpecificTemplate(e.target.value); e.target.value = ''; } }} className="px-3 py-2.5 bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 rounded-lg text-[10px] font-black uppercase tracking-widest cursor-pointer outline-none">
              <option value="">📥 Template</option>
              <option value="mcq">MCQ</option>
              <option value="sq1">SQ(1)</option>
              <option value="sq2">SQ(2)</option>
              <option value="cq">CQ</option>
            </select>
            <label htmlFor="excel-upload" className="cursor-pointer flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
              <UploadCloud className="w-3.5 h-3.5" /> Upload Excel
              <input type="file" id="excel-upload" accept=".xlsx, .xls" className="hidden" onChange={handleExcelUpload} disabled={isSavingQuestion} />
            </label>
          </div>
        )}
      </div>

      {!selectedChap ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-900/30 rounded-xl border border-slate-800/50 text-slate-500 backdrop-blur-sm">
          <Search className="w-10 h-10 text-[#2563EB] mb-3 opacity-30" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Select Subject & Chapter to view repository</p>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0 pb-2">
          
          {/* 🚀 LIVE REPOSITORY (Left Side) */}
          <div className="lg:col-span-7 flex flex-col bg-slate-900/30 rounded-xl border border-slate-800/60 overflow-hidden backdrop-blur-sm">
            <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex justify-between items-center shrink-0">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-[#2563EB]" /> Repository
              </span>
              <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded uppercase">{questions.length} Items</span>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
              {isFetchingQuestions ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500"><Loader2 className="w-6 h-6 animate-spin text-[#2563EB] mb-2" /><span className="text-[10px]">Syncing...</span></div>
              ) : questions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-60"><BookOpen className="w-10 h-10 mb-2" /><span className="text-[10px] font-bold uppercase">Empty Repository</span></div>
              ) : (
                questions.map((q, idx) => (
                  <div key={q.id} className={`bg-slate-900/60 p-4 rounded-xl border transition-all duration-300 group relative ${editingId === q.id ? 'border-[#2563EB] bg-blue-900/10' : 'border-slate-800 hover:border-slate-700'}`}>
                    
                    {/* Action Buttons */}
                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <button onClick={() => handleEditClick(q)} className="p-1.5 text-blue-400 bg-blue-500/10 rounded-md hover:bg-blue-500 hover:text-white transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteQuestion(q.id)} className="p-1.5 text-rose-500 bg-rose-500/10 rounded-md hover:bg-rose-500 hover:text-white transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>

                    {/* Question Header & Tags */}
                    <div className="mb-2 pr-16 flex flex-wrap gap-2 items-center">
                      <span className="text-[9px] font-black text-white bg-slate-800 px-2 py-0.5 rounded uppercase border border-slate-700">
                        {q.q_type === 'sq' ? 'SQ(1)' : q.q_type === 'written' ? 'SQ(2)' : q.q_type}
                      </span>
                      {q.is_exam_material && <span className="text-[9px] font-black text-rose-400 uppercase flex items-center gap-1"><Zap className="w-3 h-3"/> Exam</span>}
                      {q.is_content_material && <span className="text-[9px] font-black text-emerald-400 uppercase flex items-center gap-1"><Layers className="w-3 h-3"/> Core</span>}
                      
                      {/* 🔥 Display Board Tags Inline */}
                      {q.question_board_history?.map(history => (
                        <span key={`${history.board_id}-${history.year}`} className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          {history.boards?.short_name || history.boards?.name} '{history.year?.toString().slice(-2)}
                        </span>
                      ))}
                    </div>

                    {/* Main Question Text */}
                    <p className="font-semibold text-slate-200 text-sm leading-relaxed mb-3">
                      <span className="text-slate-500 mr-1">{idx + 1}.</span>{q.question_text}
                    </p>
                    
                    {q.question_image_path && <img src={q.question_image_path} alt="Img" className="max-h-32 object-contain mb-3 rounded border border-slate-700" />}
                    
                    {/* MCQ Layout with Explanation */}
                    {q.q_type === 'mcq' && (
                      <div className="mt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.mcq_options?.map((opt, i) => (
                            <div key={opt.id} className={`px-3 py-2 text-[11px] rounded-lg border flex items-center gap-2 ${opt.is_correct ? 'bg-blue-500/10 border-blue-500/30 text-blue-200 font-bold' : 'bg-slate-800/50 border-transparent text-slate-400'}`}>
                              <span className={`flex items-center justify-center w-4 h-4 rounded text-[9px] font-black ${opt.is_correct ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}>{String.fromCharCode(65 + i)}</span>
                              {opt.option_text}
                            </div>
                          ))}
                        </div>
                        {/* 🔥 Explanation Display */}
                        {q.explanation && (
                          <div className="mt-2 p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-xs text-emerald-200/80 font-medium">
                            <span className="font-bold text-emerald-400 mr-1">Explanation:</span> {q.explanation}
                          </div>
                        )}
                      </div>
                    )}

                    {/* CQ Layout */}
                    {q.q_type === 'cq' && (
                      <div className="mt-2 space-y-2 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                        {q.cq_parts?.map(p => (
                          <div key={p.id} className="text-xs">
                            <span className="text-[#2563EB] font-black mr-1">({p.label})</span> <span className="text-slate-300 font-medium">{p.question_text}</span>
                            {p.answer_text && <div className="pl-6 text-slate-500 mt-0.5 font-medium"><span className="text-emerald-400 font-bold text-[10px]">ANS:</span> {p.answer_text}</div>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* SQ Layout */}
                    {['sq', 'written'].includes(q.q_type) && (
                      <div className="mt-2 text-[11px] bg-slate-900/50 p-3 rounded-lg border border-slate-800 text-slate-400 font-medium leading-relaxed">
                        <strong className="text-emerald-400 mr-1">Ans:</strong> {q.solution}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 🚀 ADD / EDIT FORM (Right Side - Linear Layout) */}
          <div className="lg:col-span-5 flex flex-col h-full overflow-hidden">
            
            {/* Type Selector Tabs (Linear) */}
            <div className="flex bg-slate-900/40 p-1 rounded-xl border border-slate-800/60 mb-3 shrink-0 backdrop-blur-md">
              {[{ id: 'mcq', label: 'MCQ' }, { id: 'sq1', label: 'SQ(1)' }, { id: 'sq2', label: 'SQ(2)' }, { id: 'cq', label: 'CQ' }].map(tab => (
                <button key={tab.id} type="button" onClick={() => setQType(tab.id)} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg ${qType === tab.id ? 'bg-[#2563EB] text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>{tab.label}</button>
              ))}
            </div>

            <form onSubmit={handleAddOrUpdateQuestion} className="flex-1 overflow-y-auto flex flex-col gap-4 custom-scrollbar pr-1">
              
              {/* Question Text & Media (Linear Minimal) */}
              <div className="flex flex-col gap-2">
                <textarea required className="w-full p-4 bg-slate-900/40 border border-slate-700/50 rounded-xl focus:border-blue-500 outline-none resize-none text-sm font-medium text-slate-200 placeholder:text-slate-600 backdrop-blur-sm" rows={qType === 'cq' ? '4' : '3'} value={newQ.text} onChange={(e) => setNewQ({...newQ, text: e.target.value})} placeholder={qType === 'cq' ? "Write Stem (উদ্দীপক) here..." : "Write main question here..."}></textarea>
                
                {['mcq', 'cq'].includes(qType) && (
                  <div className="flex items-center gap-2 bg-slate-900/40 px-3 py-2 rounded-xl border border-slate-700/50 focus-within:border-blue-500 backdrop-blur-sm">
                    <ImageIcon className="w-4 h-4 text-slate-500" />
                    <input type="text" className="flex-1 bg-transparent border-none focus:ring-0 text-xs outline-none text-slate-200 placeholder-slate-600" placeholder="Optional Image URL" value={newQ.imagePath || ''} onChange={(e) => setNewQ({...newQ, imagePath: e.target.value})} />
                  </div>
                )}
              </div>

              {/* Answers & Logic Section */}
              <div className="flex flex-col gap-3 border-t border-slate-800/50 pt-3">
                {qType === 'mcq' && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Options & Explanations</span>
                    {options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div onClick={() => setOptions(options.map((o, i) => ({...o, isCorrect: i===idx})))} className={`w-6 h-6 shrink-0 rounded flex items-center justify-center cursor-pointer font-black text-[10px] transition-colors ${opt.isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}>{String.fromCharCode(65+idx)}</div>
                        <input type="text" required className={`flex-1 p-2.5 text-xs rounded-lg outline-none transition-all border ${opt.isCorrect ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-300' : 'bg-slate-900/40 border-slate-700/50 text-slate-300 focus:border-blue-500'}`} placeholder={`Option ${String.fromCharCode(65+idx)}`} value={opt.text} onChange={(e) => setOptions(options.map((o, i) => i === idx ? {...o, text: e.target.value} : o))} />
                      </div>
                    ))}
                    <textarea className="w-full mt-1 p-3 bg-slate-900/40 border border-slate-700/50 rounded-xl text-xs outline-none focus:border-blue-500 text-slate-300 resize-none backdrop-blur-sm" rows="2" value={newQ.explanation} onChange={(e) => setNewQ({...newQ, explanation: e.target.value})} placeholder="Explanation (Why is this answer correct?). Provides great value to students."></textarea>
                  </div>
                )}

                {['sq1', 'sq2'].includes(qType) && (
                  <textarea required className="w-full p-4 bg-slate-900/40 border border-slate-700/50 rounded-xl focus:border-blue-500 outline-none resize-none text-xs text-slate-200 backdrop-blur-sm" rows={qType === 'sq2' ? '5' : '3'} placeholder="Provide direct answer or solution steps..." value={newQ.solution} onChange={(e) => setNewQ({...newQ, solution: e.target.value})}></textarea>
                )}

                {qType === 'cq' && (
                  <div className="space-y-3">
                    {cqParts.map((part, idx) => (
                      <div key={idx} className="flex flex-col gap-2 bg-slate-900/30 p-3 rounded-xl border border-slate-700/50">
                        <div className="flex gap-2">
                          <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2 py-1.5 rounded uppercase">{part.label}</span>
                          <input type="text" required className="flex-1 p-2 text-xs bg-transparent border-b border-slate-700 focus:border-blue-500 outline-none text-slate-200 placeholder-slate-600" placeholder={`Question (${part.label})`} value={part.qText} onChange={(e) => setCqParts(cqParts.map((p, i) => i === idx ? {...p, qText: e.target.value} : p))} />
                        </div>
                        <textarea required className="w-full p-2 text-xs bg-transparent border-b border-slate-700 focus:border-emerald-500 outline-none text-emerald-200/80 placeholder-slate-600 resize-none" rows="2" placeholder="Answer..." value={part.aText} onChange={(e) => setCqParts(cqParts.map((p, i) => i === idx ? {...p, aText: e.target.value} : p))}></textarea>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 🔥 SUPER SMOOTH BOARD SELECTION UI (Chips) */}
              {['mcq', 'cq'].includes(qType) && (
                <div className="border-t border-slate-800/50 pt-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Boards & Tags</span>
                  <div className="flex flex-wrap gap-2">
                    {boards.map(board => {
                      const selectedTag = boardTags.find(t => t.boardId === board.id);
                      const isSelected = !!selectedTag;
                      return (
                        <div key={board.id} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all ${isSelected ? 'border-blue-500/50 bg-blue-500/10' : 'border-slate-800 bg-slate-900/30 hover:border-slate-700'}`}>
                          <div className={`cursor-pointer text-[10px] font-bold select-none transition-colors ${isSelected ? 'text-blue-300' : 'text-slate-400'}`} onClick={() => toggleBoardTag(board.id)}>
                            {board.short_name || board.name}
                          </div>
                          {isSelected && (
                            <input type="number" min="1990" max="2099" className="w-10 bg-transparent border-b border-blue-500/50 text-[10px] font-black text-blue-400 outline-none text-center pb-0.5" value={selectedTag.year} onChange={(e) => updateBoardYear(board.id, e.target.value)} placeholder="Year" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Metadata Toggles */}
              <div className="border-t border-slate-800/50 pt-3 pb-2 flex gap-3">
                <label className="flex-1 flex flex-col justify-center items-center gap-1 cursor-pointer p-2 rounded-xl bg-slate-900/40 border border-slate-700/50 hover:border-rose-500/50 transition-all select-none text-center">
                  <input type="checkbox" className="hidden" checked={newQ.isExamMaterial} onChange={(e) => setNewQ({...newQ, isExamMaterial: e.target.checked})} />
                  <div className={`w-3 h-3 rounded-full border-2 transition-all ${newQ.isExamMaterial ? 'bg-rose-500 border-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'border-slate-600 bg-transparent'}`}></div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${newQ.isExamMaterial ? 'text-rose-400' : 'text-slate-500'}`}>Exam</span>
                </label>
                
                <label className="flex-1 flex flex-col justify-center items-center gap-1 cursor-pointer p-2 rounded-xl bg-slate-900/40 border border-slate-700/50 hover:border-emerald-500/50 transition-all select-none text-center">
                  <input type="checkbox" className="hidden" checked={newQ.isContentMaterial} onChange={(e) => setNewQ({...newQ, isContentMaterial: e.target.checked})} />
                  <div className={`w-3 h-3 rounded-full border-2 transition-all ${newQ.isContentMaterial ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'border-slate-600 bg-transparent'}`}></div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${newQ.isContentMaterial ? 'text-emerald-400' : 'text-slate-500'}`}>Content</span>
                </label>

                <div className="flex-1 flex flex-col justify-center items-center gap-1 bg-slate-900/40 border border-slate-700/50 rounded-xl p-1">
                   <span className="text-[9px] font-black text-amber-500/70 uppercase">Rating</span>
                   <select className="bg-transparent text-xs outline-none text-amber-400 font-bold text-center appearance-none cursor-pointer" value={newQ.importance} onChange={(e) => setNewQ({...newQ, importance: parseInt(e.target.value)})}>
                    {[1,2,3,4,5].map(n => <option key={n} value={n} className="bg-slate-900">{'★'.repeat(n)}</option>)}
                   </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="shrink-0 flex gap-2 pt-2">
                {editingId && (
                  <button type="button" onClick={resetForm} className="px-4 py-3 bg-transparent text-slate-400 hover:text-white rounded-lg font-black text-xs uppercase tracking-widest transition-all border border-slate-700 hover:border-slate-500">Cancel</button>
                )}
                <button type="submit" disabled={isSavingQuestion} className="flex-1 py-3 bg-[#2563EB] text-white rounded-lg font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {isSavingQuestion ? <Loader2 className="w-4 h-4 animate-spin"/> : editingId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {isSavingQuestion ? 'Saving...' : editingId ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}