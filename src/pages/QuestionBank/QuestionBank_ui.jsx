import React from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { Plus, Image as ImageIcon, Trash2, BookOpen, Search, X, Loader2, CheckSquare, UploadCloud, Pencil, Star, Copy, Check } from 'lucide-react';
import ExcelTemplateUpload from './excell_tamplate_upload';
import { useQuestionBankLogic } from './QuestionBank_logic';

// LaTeX rendering imports
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

// LaTeX Text Renderer Component
const LatexText = ({ text }) => {
  if (!text) return null;
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);
  return (
    <span className="whitespace-pre-wrap break-words leading-relaxed text-zinc-300 text-sm">
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          return <BlockMath key={index} math={part.slice(2, -2)} />;
        } else if (part.startsWith('$') && part.endsWith('$')) {
          return <InlineMath key={index} math={part.slice(1, -1)} />;
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

export default function QuestionBank() {
  const {
    subjects, chapters, topics, boards, questions,
    selectedSub, setSelectedSub, selectedChap, setSelectedChap, selectedTop, setSelectedTop,
    isFetchingQuestions, isSavingQuestion, setIsSavingQuestion, uploadingTarget, editingId,
    standaloneImageUrl, isUploadingStandalone, qType, setQType, newQ, setNewQ,
    isPolyMCQ, setIsPolyMCQ, mcqStatements, setMcqStatements, boardTags, setBoardTags,
    options, setOptions, cqParts, setCqParts, boardsMap, filteredQuestions,
    resetForm, handleSubjectChange, handleChapterChange, handleTopicChange, handleEditClick, 
    handleDeleteQuestion, handleStandaloneImageUpload, handleDynamicImageUpload, 
    addBoardTag, updateBoardYear, removeBoardTag, handleAddOrUpdateQuestion, setQuestions
  } = useQuestionBankLogic();

  const renderChapterOptions = () => {
    const mainChapters = chapters.filter(c => !c.parent_chapter_id);
    return mainChapters.map(mainChap => {
      const subChapters = chapters.filter(c => c.parent_chapter_id === mainChap.id);
      const sectionPrefix = mainChap.section_name ? `[${mainChap.section_name}] ` : '';
      return (
        <optgroup key={mainChap.id} label={`${sectionPrefix}${mainChap.chapter_label || 'CH'}: ${mainChap.title}`} className="bg-zinc-900 text-zinc-500 font-semibold">
          <option value={mainChap.id} className="text-zinc-200 bg-zinc-900">&nbsp;&nbsp;{mainChap.title} (Main)</option>
          {subChapters.map(subChap => (
            <option key={subChap.id} value={subChap.id} className="text-zinc-400 bg-zinc-900">&nbsp;&nbsp;&nbsp;&nbsp;↳ {subChap.chapter_label || 'Sub'}: {subChap.title}</option>
          ))}
        </optgroup>
      );
    });
  };

  return (
    <div className="flex flex-col h-auto min-h-[calc(100vh-100px)] lg:h-[calc(100vh-100px)] lg:min-h-0 text-zinc-300 font-sans overflow-y-auto lg:overflow-hidden p-3 lg:p-4 bg-[#0a0a0a]">
      <Toaster position="top-right" toastOptions={{ style: { background: '#18181b', color: '#f4f4f5', border: '1px solid #27272a', fontSize: '14px' } }} />
      
      {/* HEADER SECTION - Supabase corporate layout */}
      <div className="bg-zinc-900/40 p-4 lg:px-6 rounded-xl border border-zinc-800/60 mb-5 flex flex-col lg:flex-row items-center justify-between gap-5 shrink-0 shadow-sm backdrop-blur-xl w-full">
        <div className="flex flex-col md:flex-row items-center justify-between w-full gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="p-2 bg-zinc-800/50 rounded-lg border border-zinc-700/50 shrink-0 shadow-inner">
              <DatabaseIcon className="w-5 h-5 text-zinc-300" />
            </div>
            <h1 className="text-lg font-medium text-zinc-100 tracking-tight">Question Database</h1>
          </div>

          <div className="flex items-center gap-2 bg-[#0a0a0a] p-1 rounded-lg border border-zinc-800/80 w-full md:w-auto shadow-inner">
            <label className={`cursor-pointer px-4 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 whitespace-nowrap ${isUploadingStandalone ? 'text-zinc-600 cursor-not-allowed' : 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 hover:text-emerald-300'}`}>
              {isUploadingStandalone ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
              {isUploadingStandalone ? 'Generating...' : 'Get Image URL'}
              <input type="file" accept="image/*" className="hidden" onChange={handleStandaloneImageUpload} disabled={isUploadingStandalone} />
            </label>
            {standaloneImageUrl && (
              <div className="flex items-center gap-2 px-2 overflow-hidden max-w-[150px] sm:max-w-[200px]">
                <input type="text" readOnly value={standaloneImageUrl} className="bg-transparent border-none text-[11px] text-zinc-400 w-full outline-none truncate" onClick={(e) => e.target.select()} title={standaloneImageUrl} />
                <button type="button" onClick={() => {navigator.clipboard.writeText(standaloneImageUrl); toast.success("Copied!");}} className="text-zinc-500 hover:text-emerald-400 p-1 shrink-0 transition-colors" title="Copy URL">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row flex-1 w-full lg:max-w-3xl gap-3">
          <select className="flex-1 p-2.5 bg-[#0a0a0a] border border-zinc-800/80 rounded-lg focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 outline-none text-sm font-medium text-zinc-300 transition-all shadow-inner" value={selectedSub} onChange={handleSubjectChange}>
            <option value="" className="text-zinc-600">1. Select Subject</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="flex-1 p-2.5 bg-[#0a0a0a] border border-zinc-800/80 rounded-lg focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 outline-none disabled:opacity-40 text-sm font-medium text-zinc-300 transition-all shadow-inner" value={selectedChap} onChange={handleChapterChange} disabled={!selectedSub}>
            <option value="" className="text-zinc-600">2. Select Chapter</option>
            {renderChapterOptions()}
          </select>
          <select className="flex-1 p-2.5 bg-[#0a0a0a] border border-zinc-800/80 rounded-lg focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 outline-none disabled:opacity-40 text-sm font-medium text-zinc-300 transition-all shadow-inner" value={selectedTop} onChange={handleTopicChange} disabled={!selectedChap}>
            <option value="" className="text-zinc-600">3. Filter Topic (Optional)</option>
            {topics.map(t => <option key={t.id} value={t.id}>{t.topic_order}. {t.title}</option>)}
          </select>
        </div>

        {selectedChap && (
          <div className="w-full lg:w-auto">
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
          </div>
        )}
      </div>

      {!selectedChap ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-zinc-900/20 rounded-xl border border-zinc-800/30 text-zinc-600 py-10 lg:py-0">
          <Search className="w-8 h-8 mb-4 opacity-20" />
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-500 text-center px-4">Select a Subject and Chapter to browse</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-5 min-h-0 pb-2">
          
          {/* DATABASE LIST SECTION */}
          <div className="lg:col-span-7 flex flex-col h-[60vh] lg:h-full bg-[#0a0a0a] rounded-xl border border-zinc-800/80 overflow-hidden shrink-0 lg:shrink">
             <div className="p-4 bg-zinc-900/50 border-b border-zinc-800/80 flex justify-between items-center shrink-0">
              <span className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-zinc-400" /> Database Records
              </span>
              <div className="flex gap-2">
                <span className="text-[10px] font-medium text-zinc-400 bg-zinc-800/50 px-2.5 py-1 rounded-full border border-zinc-700/50">Prac: {filteredQuestions.filter(q => q.is_exam_material).length}</span>
                <span className="text-[10px] font-medium text-zinc-400 bg-zinc-800/50 px-2.5 py-1 rounded-full border border-zinc-700/50">Core: {filteredQuestions.filter(q => q.is_content_material).length}</span>
                <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">Total: {filteredQuestions.length}</span>
              </div>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
              {isFetchingQuestions ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500"><Loader2 className="w-6 h-6 animate-spin text-zinc-400 mb-3" /><span className="text-xs font-medium tracking-wide">Fetching records...</span></div>
              ) : filteredQuestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-600 opacity-60"><FolderOpenIcon className="w-10 h-10 mb-3 opacity-50" /><span className="text-xs font-medium tracking-wide">Repository is empty</span></div>
              ) : (
                filteredQuestions.map((q, idx) => (
                  <div key={q.id} className={`p-5 rounded-xl border transition-all duration-200 group relative ${editingId === q.id ? 'bg-zinc-900 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.05)]' : 'bg-zinc-900/30 border-zinc-800/80 hover:bg-zinc-900/60 hover:border-zinc-700'}`}>
                    
                    {/* Floating Action Buttons */}
                    <div className="absolute top-4 right-4 flex gap-1.5 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button onClick={() => handleEditClick(q)} className="p-2 text-zinc-400 bg-zinc-950 hover:text-emerald-400 border border-zinc-800 hover:border-emerald-500/30 rounded-md transition-all shadow-sm" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteQuestion(q.id)} className="p-2 text-zinc-400 bg-zinc-950 hover:text-rose-400 border border-zinc-800 hover:border-rose-500/30 rounded-md transition-all shadow-sm" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>

                    {/* Meta Tags */}
                    <div className="mb-4 pr-20 flex flex-wrap gap-2 items-center">
                      <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded uppercase tracking-wider">{q.q_type}</span>
                      {q.is_exam_material && <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 tracking-wider">PRACTICE</span>}
                      {q.is_content_material && <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 tracking-wider">CONTENT</span>}
                      {q.importance >= 3 && <span className="text-[10px] font-semibold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1 tracking-wider"><Star className="w-3 h-3"/> EXAM</span>}
                      
                      {q.question_board_history?.map((history, hIdx) => (
                        <span key={`${history.boards?.id}-${history.year}-${hIdx}`} className="text-[10px] font-medium text-zinc-500 bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded">
                          {history.boards?.short_name || history.boards?.name} '{String(history.year).slice(-2)}
                        </span>
                      ))}
                    </div>

                    {/* Main Question */}
                    <div className="flex gap-3 mb-4">
                      <span className="text-zinc-600 font-medium text-sm mt-0.5 shrink-0 select-none">{idx + 1}.</span>
                      <div className="min-w-0 flex-1"><LatexText text={q.question_text} /></div>
                    </div>
                    {q.question_image_path && <img src={q.question_image_path} alt="Question" className="max-w-[80%] max-h-48 object-contain mb-4 rounded-lg border border-zinc-800 ml-6" />}
                    
                    {/* MCQ Statements */}
                    {q.q_type === 'mcq' && q.mcq_statements && q.mcq_statements.length > 0 && (
                      <div className="mb-5 ml-6 pl-4 border-l border-zinc-700/50 space-y-3">
                        {q.mcq_statements.map((stmt, i) => {
                          const text = typeof stmt === 'string' ? stmt : stmt?.text;
                          const img = typeof stmt === 'object' ? stmt?.imagePath : null;
                          if (!text && !img) return null;
                          return (
                            <div key={i} className="flex gap-3">
                              <span className="text-xs font-semibold text-zinc-500 shrink-0 mt-0.5">{['i.', 'ii.', 'iii.'][i]}</span> 
                              <div className="flex flex-col gap-1.5 min-w-0">
                                {text && <LatexText text={text} />}
                                {img && <img src={img} alt="Statement" className="max-h-24 rounded-md border border-zinc-800 object-contain mt-1" />}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Options */}
                    {q.q_type === 'mcq' && (
                      <div className="ml-6 mt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {q.mcq_options?.map((opt, i) => (
                            <div key={opt.id} className={`p-3 rounded-lg border flex items-start gap-3 transition-colors ${opt.is_correct ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-100' : 'bg-zinc-950/50 border-zinc-800/80 text-zinc-400'}`}>
                              <div className={`flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold shrink-0 transition-colors ${opt.is_correct ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                {opt.is_correct ? <Check className="w-3.5 h-3.5"/> : String.fromCharCode(65 + i)}
                              </div>
                              <div className="flex flex-col gap-1.5 w-full mt-0.5 min-w-0">
                                {opt.option_text && <LatexText text={opt.option_text} />}
                                {opt.option_image_path && <img src={opt.option_image_path} alt="Option" className="max-h-20 rounded-md border border-zinc-800 object-contain self-start mt-1" />}
                              </div>
                            </div>
                          ))}
                        </div>
                        {q.explanation && (
                          <div className="mt-4 p-3.5 bg-zinc-950 rounded-lg border border-zinc-800/80 flex gap-3 text-zinc-300">
                            <span className="font-semibold text-zinc-600 text-[10px] uppercase tracking-wider shrink-0 mt-1">Expl:</span> 
                            <div className="min-w-0"><LatexText text={q.explanation} /></div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Creative Questions */}
                    {q.q_type === 'cq' && (
                      <div className="mt-4 ml-6 space-y-4">
                        {q.cq_parts?.map(p => (
                          <div className="flex flex-col gap-2 p-4 bg-zinc-950 rounded-xl border border-zinc-800/80" key={p.id}>
                            <div className="flex gap-2">
                              <span className="text-zinc-500 font-semibold text-sm shrink-0">({p.label})</span> 
                              <div className="min-w-0"><LatexText text={p.question_text} /></div>
                            </div>
                            {p.answer_text && (
                              <div className="pl-6 pt-2 mt-2 border-t border-zinc-800/50 flex gap-2">
                                <span className="text-emerald-500/70 font-semibold text-[10px] uppercase tracking-wider shrink-0 mt-1">ANS:</span> 
                                <div className="min-w-0"><LatexText text={p.answer_text} /></div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Written / SQ */}
                    {['sq', 'written'].includes(q.q_type) && (
                      <div className="mt-4 ml-6 p-4 bg-zinc-950 rounded-xl border border-zinc-800/80 flex gap-3">
                        <span className="text-emerald-500/70 font-semibold uppercase tracking-wider text-[10px] shrink-0 mt-1">Answer:</span> 
                        <div className="min-w-0"><LatexText text={q.solution} /></div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* FORM EDITOR SECTION */}
          <div className="lg:col-span-5 flex flex-col h-[75vh] lg:h-full overflow-hidden bg-zinc-900/40 rounded-xl border border-zinc-800/80 shadow-sm shrink-0 lg:shrink">
            <div className="p-2 border-b border-zinc-800/80 shrink-0 rounded-t-xl bg-zinc-950/50">
              <div className="flex bg-[#0a0a0a] p-1 rounded-lg border border-zinc-800/50 shadow-inner">
                {[{ id: 'mcq', label: 'MCQ' }, { id: 'sq1', label: 'Short' }, { id: 'sq2', label: 'Written' }, { id: 'cq', label: 'Creative' }].map(tab => (
                  <button key={tab.id} type="button" onClick={() => setQType(tab.id)} className={`flex-1 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-all rounded-md ${qType === tab.id ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/50' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`}>{tab.label}</button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddOrUpdateQuestion} className="flex-1 overflow-y-auto flex flex-col p-4 sm:p-5 gap-5 custom-scrollbar">
              
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Stem / Scenario (Supports LaTeX: $$...$$ or $...$)</label>
                <textarea required className="w-full p-3.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 outline-none resize-y min-h-[100px] text-sm text-zinc-200 transition-all shadow-inner placeholder:text-zinc-700" value={newQ.text} onChange={(e) => setNewQ({...newQ, text: e.target.value})} placeholder="E.g., Evaluate the limit $\lim_{x \to 0} \frac{\sin x}{x}$"></textarea>
                
                {['mcq', 'cq'].includes(qType) && (
                  <div className="flex items-center gap-2 bg-[#0a0a0a] px-3 py-2 rounded-lg border border-zinc-800 focus-within:border-zinc-600 focus-within:ring-1 focus-within:ring-zinc-600 shadow-inner transition-all">
                    <ImageIcon className="w-4 h-4 text-zinc-600 shrink-0" />
                    <input type="text" className="flex-1 min-w-0 bg-transparent border-none focus:ring-0 text-xs outline-none text-zinc-300 placeholder-zinc-700" placeholder="Paste image URL..." value={newQ.imagePath || ''} onChange={(e) => setNewQ({...newQ, imagePath: e.target.value})} disabled={uploadingTarget === 'main'} />
                    <label className={`cursor-pointer px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5 shrink-0 ${uploadingTarget === 'main' ? 'text-zinc-600' : 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/10'}`}>
                      {uploadingTarget === 'main' ? <Loader2 className="w-3 h-3 animate-spin" /> : <UploadCloud className="w-3 h-3" />}
                      <span>Upload</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleDynamicImageUpload(e, 'main')} disabled={uploadingTarget === 'main'} />
                    </label>
                  </div>
                )}
              </div>

              {qType === 'mcq' && (
                <div className="flex flex-col gap-3 bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50">
                  <label className="flex items-center gap-3 cursor-pointer w-max select-none group">
                    <input type="checkbox" className="hidden" checked={isPolyMCQ} onChange={(e) => setIsPolyMCQ(e.target.checked)} />
                    <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all ${isPolyMCQ ? 'bg-emerald-500 border-emerald-500' : 'bg-[#0a0a0a] border-zinc-700 group-hover:border-zinc-500'}`}>
                      {isPolyMCQ && <CheckSquare className="w-3 h-3 text-zinc-950" />}
                    </div>
                    <span className="text-sm font-medium text-zinc-300">Enable Multiple Completion (i, ii, iii)</span>
                  </label>
                  
                  {isPolyMCQ && (
                    <div className="space-y-3 mt-2">
                      {mcqStatements.map((stmt, idx) => (
                        <div key={idx} className="flex gap-2 items-start">
                          <span className="text-xs font-semibold text-zinc-500 w-5 uppercase shrink-0 pt-3">{['i.', 'ii.', 'iii.'][idx]}</span>
                          <div className="flex flex-col gap-2 flex-1 min-w-0">
                            <input type="text" className="w-full p-2.5 text-sm bg-[#0a0a0a] border border-zinc-800 rounded-lg focus:border-zinc-600 outline-none text-zinc-200 shadow-inner placeholder:text-zinc-700" placeholder={`Statement ${idx + 1}`} value={stmt.text} onChange={(e) => setMcqStatements(mcqStatements.map((s, i) => i === idx ? {...s, text: e.target.value} : s))} />
                            <div className="flex items-center gap-2 bg-[#0a0a0a] px-2.5 py-1.5 rounded-lg border border-zinc-800 focus-within:border-emerald-500/50 shadow-inner">
                              <input type="text" className="flex-1 bg-transparent border-none text-[11px] outline-none text-zinc-400 placeholder:text-zinc-700 min-w-0" placeholder="Image URL (Optional)" value={stmt.imagePath} onChange={(e) => setMcqStatements(mcqStatements.map((s, i) => i === idx ? {...s, imagePath: e.target.value} : s))} disabled={uploadingTarget === `stmt-${idx}`} />
                              <label className={`cursor-pointer shrink-0 p-1 rounded-md transition-colors ${uploadingTarget === `stmt-${idx}` ? 'text-zinc-600' : 'text-emerald-500 hover:bg-emerald-500/10'}`} title="Upload Image">
                                {uploadingTarget === `stmt-${idx}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleDynamicImageUpload(e, `stmt-${idx}`)} disabled={uploadingTarget === `stmt-${idx}`} />
                              </label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-4 border-t border-zinc-800/80 pt-5">
                {qType === 'mcq' && (
                  <div className="space-y-4">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Options (Select Correct)</label>
                    {options.map((opt, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div onClick={() => setOptions(options.map((o, i) => ({...o, isCorrect: i===idx})))} className={`w-9 h-9 mt-0.5 shrink-0 rounded-lg flex items-center justify-center cursor-pointer font-bold text-xs transition-all border shadow-sm ${opt.isCorrect ? 'bg-emerald-500 border-emerald-500 text-emerald-950' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'}`}>{String.fromCharCode(65+idx)}</div>
                        
                        <div className="flex flex-col gap-2 flex-1 min-w-0">
                          <input type="text" className={`w-full p-2.5 text-sm font-medium rounded-lg outline-none transition-colors border shadow-inner ${opt.isCorrect ? 'bg-emerald-500/5 border-emerald-500/50 text-emerald-100' : 'bg-[#0a0a0a] border-zinc-800 text-zinc-200 focus:border-zinc-600 placeholder:text-zinc-700'}`} placeholder={`Option ${String.fromCharCode(65+idx)}`} value={opt.text} onChange={(e) => setOptions(options.map((o, i) => i === idx ? {...o, text: e.target.value} : o))} />
                          
                          <div className="flex items-center gap-2 bg-[#0a0a0a] px-2.5 py-1.5 rounded-lg border border-zinc-800 focus-within:border-emerald-500/50 shadow-inner">
                            <input type="text" className="flex-1 bg-transparent border-none text-[11px] outline-none text-zinc-400 placeholder:text-zinc-700 min-w-0" placeholder="Image URL (Optional)" value={opt.imagePath} onChange={(e) => setOptions(options.map((o, i) => i === idx ? {...o, imagePath: e.target.value} : o))} disabled={uploadingTarget === `opt-${idx}`} />
                            <label className={`cursor-pointer shrink-0 p-1 rounded-md transition-colors ${uploadingTarget === `opt-${idx}` ? 'text-zinc-600' : 'text-emerald-500 hover:bg-emerald-500/10'}`} title="Upload Image">
                              {uploadingTarget === `opt-${idx}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleDynamicImageUpload(e, `opt-${idx}`)} disabled={uploadingTarget === `opt-${idx}`} />
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="pt-3">
                       <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2 block">Explanation (Optional)</label>
                       <textarea className="w-full p-3.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg focus:border-zinc-600 outline-none text-sm text-zinc-300 resize-y min-h-[80px] shadow-inner placeholder:text-zinc-700" value={newQ.explanation} onChange={(e) => setNewQ({...newQ, explanation: e.target.value})} placeholder="Explain why this option is correct..."></textarea>
                    </div>
                  </div>
                )}

                {['sq1', 'sq2'].includes(qType) && (
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Solution</label>
                    <textarea required className="w-full p-3.5 bg-[#0a0a0a] border border-zinc-800 rounded-lg focus:border-zinc-600 outline-none resize-y min-h-[120px] text-sm text-zinc-200 shadow-inner placeholder:text-zinc-700" placeholder="Detailed solution steps..." value={newQ.solution} onChange={(e) => setNewQ({...newQ, solution: e.target.value})}></textarea>
                  </div>
                )}

                {qType === 'cq' && (
                  <div className="space-y-4">
                     <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Creative Parts</label>
                    {cqParts.map((part, idx) => (
                      <div key={idx} className="flex flex-col gap-3 bg-[#0a0a0a] p-4 rounded-xl border border-zinc-800 shadow-inner">
                        <div className="flex gap-3 items-center">
                          <span className="text-xs font-bold text-zinc-500 w-5 uppercase shrink-0">({part.label})</span>
                          <input type="text" required className="flex-1 min-w-0 p-2.5 text-sm bg-zinc-950 border border-zinc-800 rounded-md focus:border-zinc-600 outline-none text-zinc-200 placeholder:text-zinc-700" placeholder="Question text..." value={part.qText} onChange={(e) => setCqParts(cqParts.map((p, i) => i === idx ? {...p, qText: e.target.value} : p))} />
                        </div>
                        <div className="flex gap-3 items-start">
                          <span className="text-[10px] font-bold text-zinc-600 w-5 pt-3 uppercase shrink-0">Ans:</span>
                          <textarea required className="flex-1 min-w-0 p-2.5 text-sm bg-zinc-950 border border-zinc-800 rounded-md focus:border-emerald-500/50 outline-none text-zinc-300 resize-y min-h-[60px] placeholder:text-zinc-700" placeholder="Answer text..." value={part.aText} onChange={(e) => setCqParts(cqParts.map((p, i) => i === idx ? {...p, aText: e.target.value} : p))}></textarea>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {['mcq', 'cq'].includes(qType) && (
                <div className="border-t border-zinc-800/80 pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Board Assignments</label>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {boards.map(b => (
                      <button type="button" key={b.id} onClick={() => addBoardTag(b.id)} className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-md hover:border-zinc-500 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors shadow-sm">
                        + {b.short_name || b.name}
                      </button>
                    ))}
                  </div>

                  {boardTags.length > 0 && (
                    <div className="space-y-2 bg-[#0a0a0a] p-3 rounded-lg border border-zinc-800 shadow-inner">
                      {boardTags.map(tag => (
                         <div key={tag.tempId} className="flex items-center gap-3">
                            <span className="text-sm font-medium text-zinc-300 flex-1 truncate pl-1">
                              {boardsMap[tag.boardId]?.name || 'Board'}
                            </span>
                            <input type="number" min="1990" max="2099" className="w-24 p-2 text-xs font-semibold bg-zinc-900 border border-zinc-700 rounded-md text-zinc-200 outline-none focus:border-emerald-500 text-center" placeholder="Year" value={tag.year} onChange={(e) => updateBoardYear(tag.tempId, e.target.value)} />
                            <button type="button" onClick={() => removeBoardTag(tag.tempId)} className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"><X className="w-4 h-4" /></button>
                         </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-zinc-800/80 pt-5 flex flex-col sm:flex-row gap-3">
                <label className="flex-1 flex justify-between sm:justify-center items-center gap-2.5 cursor-pointer p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-600 transition-colors select-none shadow-sm">
                  <span className={`text-[11px] font-semibold uppercase tracking-wider ${newQ.isExamMaterial ? 'text-zinc-200' : 'text-zinc-500'}`}>Practice</span>
                  <input type="checkbox" className="hidden" checked={newQ.isExamMaterial} onChange={(e) => setNewQ({...newQ, isExamMaterial: e.target.checked})} />
                  <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all ${newQ.isExamMaterial ? 'bg-indigo-500 border-indigo-500' : 'bg-[#0a0a0a] border-zinc-700'}`}>
                     {newQ.isExamMaterial && <CheckSquare className="w-3 h-3 text-white" />}
                  </div>
                </label>
                
                <label className="flex-1 flex justify-between sm:justify-center items-center gap-2.5 cursor-pointer p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-600 transition-colors select-none shadow-sm">
                  <span className={`text-[11px] font-semibold uppercase tracking-wider ${newQ.isContentMaterial ? 'text-zinc-200' : 'text-zinc-500'}`}>Content</span>
                  <input type="checkbox" className="hidden" checked={newQ.isContentMaterial} onChange={(e) => setNewQ({...newQ, isContentMaterial: e.target.checked})} />
                  <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all ${newQ.isContentMaterial ? 'bg-emerald-500 border-emerald-500' : 'bg-[#0a0a0a] border-zinc-700'}`}>
                     {newQ.isContentMaterial && <CheckSquare className="w-3 h-3 text-emerald-950" />}
                  </div>
                </label>

                <div className="flex-1 flex justify-between sm:justify-center items-center gap-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-3.5 shadow-sm">
                   <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Rating</span>
                   <select className="bg-transparent text-sm outline-none text-amber-400 font-bold text-right sm:text-center appearance-none cursor-pointer" value={newQ.importance} onChange={(e) => setNewQ({...newQ, importance: parseInt(e.target.value)})}>
                    {[1,2,3,4,5].map(n => <option key={n} value={n} className="bg-zinc-900 text-amber-400">{'★'.repeat(n)}</option>)}
                   </select>
                </div>
              </div>

              <div className="mt-3 flex flex-col sm:flex-row gap-3 pt-2">
                {editingId && (
                  <button type="button" onClick={resetForm} className="w-full sm:w-auto px-6 py-3 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-lg font-semibold text-xs uppercase tracking-wider transition-colors border border-zinc-700 shadow-sm">Cancel Edit</button>
                )}
                <button type="submit" disabled={isSavingQuestion || uploadingTarget || isUploadingStandalone} className="flex-1 py-3 bg-emerald-500 text-emerald-950 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-500/10 border border-emerald-400/50">
                  {(isSavingQuestion || uploadingTarget) ? <Loader2 className="w-4 h-4 animate-spin"/> : editingId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {isSavingQuestion ? 'Saving Data...' : uploadingTarget ? 'Uploading Image...' : editingId ? 'Update Question' : 'Save Question'}
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