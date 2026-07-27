import React, { useState, useEffect, useMemo } from 'react';
import { taxonomyApi } from '../../services/taxonomyService';
import toast, { Toaster } from 'react-hot-toast';
import { Folder, FileText, Bookmark, Plus, ChevronRight, X, LayoutGrid, Layers, CheckCircle2, Trash2, CornerDownRight, Pencil, Loader2, AlertTriangle } from 'lucide-react';

const CLASS_LEVELS = ['SSC', 'HSC', 'Admission', 'JSC'];
const BOARD_GROUPS = ['Science', 'Arts', 'Commerce', 'General', 'Common'];

export default function Taxonomy() {
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);

  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null); 

  // Modal States
  const [modal, setModal] = useState({ isOpen: false, type: '' });
  const [formData, setFormData] = useState({});
  const [editingId, setEditingId] = useState(null);

  // Custom Confirm Modal State
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const data = await taxonomyApi.getSubjects();
      setSubjects(data || []);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSubjectClick = async (subject) => {
    setSelectedSubject(subject);
    setSelectedChapter(null);
    setTopics([]);
    try {
      const data = await taxonomyApi.getChapters(subject.id);
      const sortedChapters = (data || []).sort((a, b) => String(a.chapter_label || '').localeCompare(String(b.chapter_label || ''), undefined, { numeric: true }));
      setChapters(sortedChapters);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleChapterClick = async (chapter) => {
    setSelectedChapter(chapter);
    try {
      const data = await taxonomyApi.getTopics(chapter.id);
      const sortedTopics = (data || []).sort((a, b) => a.topic_order - b.topic_order);
      setTopics(sortedTopics);
    } catch (error) {
      toast.error(error.message);
    }
  };

  // 🚀 UX FIX: Smart Modal Opener
  const openModal = (type, item = null, parentItem = null) => {
    setEditingId(item ? item.id : null);
    
    if (type === 'subject') {
      setFormData({
        name: item?.name || '',
        classLevel: item?.class_level || 'SSC',
        boardGroup: item?.board_group || 'Science'
      });
    } 
    else if (type === 'chapter') { // Main Chapter
      setFormData({
        isSubChapter: false,
        sectionName: item?.section_name || '',
        parentChapterId: null,
        chapterLabel: item?.chapter_label || '',
        title: item?.title || ''
      });
    } 
    else if (type === 'sub_chapter') { // 🚀 Sub-Chapter Specific Logic
      setFormData({
        isSubChapter: true,
        parentChapterId: item ? item.parent_chapter_id : parentItem?.id,
        parentChapterName: parentItem?.title || 'Selected Chapter',
        chapterLabel: item?.chapter_label || '',
        title: item?.title || ''
      });
    } 
    else if (type === 'topic') {
      setFormData({
        topicOrder: item?.topic_order || '',
        stars: item?.importance_stars || 1,
        title: item?.title || ''
      });
    }
    
    setModal({ isOpen: true, type });
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    
    if (modal.type === 'subject') {
      const isDuplicate = subjects.some(s => s.name.toLowerCase() === formData.name.trim().toLowerCase() && s.id !== editingId);
      if (isDuplicate) return toast.error("A subject with this name already exists!");
    }

    if (modal.type === 'topic') {
      const isDuplicateOrder = topics.some(t => t.topic_order === parseInt(formData.topicOrder) && t.id !== editingId);
      if (isDuplicateOrder) return toast.error(`Topic Order ${formData.topicOrder} is already in use!`);
    }

    setLoading(true);

    try {
      if (modal.type === 'subject') {
        if (editingId) {
          const updatedSub = await taxonomyApi.updateSubject(editingId, formData.name, formData.classLevel || 'SSC', formData.boardGroup || 'Science');
          if (updatedSub && updatedSub.id) {
            setSubjects(prev => prev.map(s => s.id === editingId ? updatedSub : s)); 
            if (selectedSubject?.id === editingId) setSelectedSubject(updatedSub);
            toast.success("Subject updated successfully.");
          } else throw new Error("Update blocked by Database RLS!");
        } else {
          const newSub = await taxonomyApi.addSubject(formData.name, formData.classLevel || 'SSC', formData.boardGroup || 'Science');
          if (newSub && newSub.id) {
            setSubjects(prev => [...prev, newSub]); 
            toast.success("Subject added successfully.");
          } else throw new Error("Insert blocked by Database RLS!");
        }
      } 
      else if (modal.type === 'chapter' || modal.type === 'sub_chapter') {
        const payload = {
          subject_id: selectedSubject.id,
          chapter_label: formData.chapterLabel,
          title: formData.title,
          section_name: formData.isSubChapter ? null : (formData.sectionName || null),
          parent_chapter_id: formData.isSubChapter ? formData.parentChapterId : null
        };

        if (editingId) {
          const updatedChap = await taxonomyApi.updateChapter(editingId, payload);
          if (updatedChap && updatedChap.id) {
            setChapters(prev => prev.map(c => c.id === editingId ? updatedChap : c).sort((a, b) => String(a.chapter_label || '').localeCompare(String(b.chapter_label || ''), undefined, { numeric: true })));
            toast.success("Updated successfully.");
          } else throw new Error("Update blocked by Database RLS!");
        } else {
          const newChap = await taxonomyApi.addChapter(payload);
          if (newChap && newChap.id) {
            setChapters(prev => [...prev, newChap].sort((a, b) => String(a.chapter_label || '').localeCompare(String(b.chapter_label || ''), undefined, { numeric: true })));
            toast.success("Added successfully.");
          } else throw new Error("Insert blocked by Database RLS!");
        }
      } 
      else if (modal.type === 'topic') {
        if (editingId) {
          const updatedTopic = await taxonomyApi.updateTopic(editingId, parseInt(formData.topicOrder), formData.title, parseInt(formData.stars || 1));
          if (updatedTopic && updatedTopic.id) {
            setTopics(prev => prev.map(t => t.id === editingId ? updatedTopic : t).sort((a, b) => a.topic_order - b.topic_order));
            toast.success("Topic updated successfully.");
          } else throw new Error("Update blocked by Database RLS!");
        } else {
          const newTopic = await taxonomyApi.addTopic(selectedChapter.id, parseInt(formData.topicOrder), formData.title, parseInt(formData.stars || 1));
          if (newTopic && newTopic.id) {
            setTopics(prev => [...prev, newTopic].sort((a, b) => a.topic_order - b.topic_order));
            toast.success("Topic added successfully.");
          } else throw new Error("Insert blocked by Database RLS!");
        }
      }
      setModal({ isOpen: false, type: '' });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const requestDelete = (e, type, id) => {
    e.stopPropagation();
    let message = '';
    let onConfirm = null;

    if (type === 'subject') {
      message = 'Deleting this subject will also permanently delete all its chapters and topics!';
      onConfirm = async () => {
        setDeletingId(id);
        try {
          await taxonomyApi.deleteSubject(id);
          setSubjects(prev => prev.filter(s => s.id !== id));
          if (selectedSubject?.id === id) { setSelectedSubject(null); setChapters([]); setTopics([]); }
          toast.success("Subject deleted.");
        } catch (error) { toast.error(error.message); } finally { setDeletingId(null); }
      };
    } else if (type === 'chapter') {
      message = 'Deleting this chapter will also delete all its sub-chapters and topics!';
      onConfirm = async () => {
        setDeletingId(id);
        try {
          await taxonomyApi.deleteChapter(id);
          setChapters(prev => prev.filter(c => c.id !== id && c.parent_chapter_id !== id));
          if (selectedChapter?.id === id || selectedChapter?.parent_chapter_id === id) { setSelectedChapter(null); setTopics([]); }
          toast.success("Chapter deleted.");
        } catch (error) { toast.error(error.message); } finally { setDeletingId(null); }
      };
    } else if (type === 'topic') {
      message = 'Are you sure you want to delete this topic?';
      onConfirm = async () => {
        setDeletingId(id);
        try {
          await taxonomyApi.deleteTopic(id);
          setTopics(prev => prev.filter(t => t.id !== id));
          toast.success("Topic deleted.");
        } catch (error) { toast.error(error.message); } finally { setDeletingId(null); }
      };
    }

    setConfirmModal({ isOpen: true, title: `Delete ${type}?`, message, onConfirm });
  };

  const groupedChapters = useMemo(() => {
    if (!chapters || chapters.length === 0) return null;
    const groups = {};
    chapters.forEach(chap => {
      const sec = chap.section_name || 'General Chapters';
      if (!groups[sec]) groups[sec] = { main: [], sub: {} };
      if (!chap.parent_chapter_id) {
        groups[sec].main.push(chap);
      } else {
        if (!groups[sec].sub[chap.parent_chapter_id]) Object.assign(groups[sec].sub, { [chap.parent_chapter_id]: [] });
        groups[sec].sub[chap.parent_chapter_id].push(chap);
      }
    });
    return groups;
  }, [chapters]);

  const renderChapters = () => {
    if (!groupedChapters) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs font-medium">
          <Layers className="w-12 h-12 mb-3 opacity-10 text-slate-400" />
          <p>No Chapters found. Add one!</p>
        </div>
      );
    }

    return Object.entries(groupedChapters).map(([sectionName, sectionData]) => (
      <div key={sectionName} className="mb-4">
        <div className="text-[10px] uppercase text-slate-400 font-black tracking-widest mx-2 mb-2 pb-1 border-b border-[#1E293B]">
          {sectionName}
        </div>

        {sectionData.main.map(mainChap => (
          <React.Fragment key={mainChap.id}>
            <ChapterCard chap={mainChap} isSub={false} />
            {(sectionData.sub[mainChap.id] || []).map(subChap => (
                <div key={subChap.id} className="pl-6 relative">
                  <div className="absolute left-3 top-0 bottom-4 w-px bg-[#1E293B]"></div>
                  <ChapterCard chap={subChap} isSub={true} />
                </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    ));
  };

  const ChapterCard = ({ chap, isSub }) => (
    <div 
      onClick={() => handleChapterClick(chap)}
      className={`p-3.5 mb-2 rounded-2xl cursor-pointer flex justify-between items-center group transition-all duration-200 border relative ${
        selectedChapter?.id === chap.id 
          ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-lg shadow-[#2563EB]/20' 
          : 'bg-[#0B0F19] hover:bg-[#1E293B]/40 border-[#1E293B] hover:border-slate-700'
      }`}
    >
      <div className="flex gap-3 items-center">
        {isSub && <CornerDownRight className={`w-4 h-4 ${selectedChapter?.id === chap.id ? 'text-white/70' : 'text-slate-500'}`} />}
        <div>
          <div className={`text-[9px] font-black tracking-widest uppercase mb-0.5 ${selectedChapter?.id === chap.id ? 'text-blue-200' : 'text-[#2563EB]'}`}>
            {chap.chapter_label || 'CH'}
          </div>
          <div className="font-bold text-sm leading-tight pr-2">{chap.title}</div>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {/* 🚀 QUICK ADD SUB-CHAPTER BUTTON (Only on main chapters) */}
        {!isSub && (
          <button onClick={(e) => { e.stopPropagation(); openModal('sub_chapter', null, chap); }} className={`p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 ${selectedChapter?.id === chap.id ? 'text-white hover:bg-blue-700' : 'text-emerald-400 hover:bg-emerald-500/10'}`} title="Add Sub-Chapter">
            <Plus className="w-4 h-4" />
          </button>
        )}
        <button onClick={(e) => { e.stopPropagation(); openModal(isSub ? 'sub_chapter' : 'chapter', chap); }} disabled={deletingId === chap.id} className={`p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 ${selectedChapter?.id === chap.id ? 'text-blue-200 hover:text-white hover:bg-blue-700' : 'text-slate-500 hover:text-blue-400 hover:bg-blue-500/10'}`}><Pencil className="w-4 h-4" /></button>
        <button onClick={(e) => requestDelete(e, 'chapter', chap.id)} disabled={deletingId === chap.id} className={`p-2 rounded-xl transition-all duration-200 ${deletingId === chap.id ? 'opacity-100 text-rose-500' : 'opacity-0 group-hover:opacity-100'} ${selectedChapter?.id === chap.id ? 'text-blue-200 hover:text-white hover:bg-blue-700' : 'text-slate-500 hover:text-rose-400 hover:bg-rose-500/10'}`}>
          {deletingId === chap.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
        <ChevronRight className={`w-4 h-4 transition-transform ml-1 ${selectedChapter?.id === chap.id ? 'opacity-100 translate-x-1' : 'opacity-0 group-hover:opacity-100'}`} />
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col relative bg-transparent text-slate-200">
      <Toaster position="top-right" toastOptions={{ style: { background: '#0B0F19', color: '#F1F5F9', border: '1px solid #1E293B' } }} />
      
      {/* Header Area */}
      <div className="flex justify-between items-center mb-6 bg-[#0B0F19] p-6 rounded-3xl shadow-lg border border-[#1E293B]">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Syllabus Architecture</h1>
          <p className="text-slate-400 text-xs mt-1 font-medium">Design the perfect learning journey with advanced sectioning</p>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden pb-4">
        
        {/* Column 1: Subjects */}
        <div className="bg-[#0B0F19] rounded-3xl shadow-lg border border-[#1E293B] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#1E293B] flex justify-between items-center bg-[#07090E]/50">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <div className="p-1.5 bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-lg"><LayoutGrid className="w-4 h-4 text-[#2563EB]" /></div> Subjects
            </h2>
            <button onClick={() => openModal('subject')} className="text-[#2563EB] bg-[#2563EB]/10 hover:bg-[#2563EB] hover:text-white border border-[#2563EB]/20 p-1.5 rounded-xl transition-all"><Plus className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {subjects.map(sub => (
              <div key={sub.id} onClick={() => handleSubjectClick(sub)} className={`p-4 rounded-2xl cursor-pointer flex justify-between items-center group transition-all duration-200 border relative ${selectedSubject?.id === sub.id ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-lg shadow-[#2563EB]/20' : 'bg-transparent hover:bg-[#1E293B]/40 border-transparent hover:border-[#1E293B]'}`}>
                <div>
                  <div className="font-bold text-sm">{sub.name}</div>
                  <div className={`text-[10px] mt-1 font-medium uppercase tracking-wider ${selectedSubject?.id === sub.id ? 'text-blue-200' : 'text-slate-500'}`}>{sub.class_level} • {sub.board_group}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); openModal('subject', sub); }} disabled={deletingId === sub.id} className={`p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 ${selectedSubject?.id === sub.id ? 'text-blue-200 hover:text-white hover:bg-blue-700' : 'text-slate-500 hover:text-blue-400 hover:bg-blue-500/10'}`}><Pencil className="w-4 h-4" /></button>
                  <button onClick={(e) => requestDelete(e, 'subject', sub.id)} disabled={deletingId === sub.id} className={`p-2 rounded-xl transition-all duration-200 ${deletingId === sub.id ? 'opacity-100 text-rose-500' : 'opacity-0 group-hover:opacity-100'} ${selectedSubject?.id === sub.id ? 'text-blue-200 hover:text-white hover:bg-blue-700' : 'text-slate-500 hover:text-rose-400 hover:bg-rose-500/10'}`}>
                    {deletingId === sub.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                  <ChevronRight className={`w-4 h-4 transition-transform ml-1 ${selectedSubject?.id === sub.id ? 'opacity-100 translate-x-1' : 'opacity-0 group-hover:opacity-100'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Chapters */}
        <div className="bg-[#0B0F19] rounded-3xl shadow-lg border border-[#1E293B] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#1E293B] flex justify-between items-center bg-[#07090E]/50">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <div className="p-1.5 bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-lg"><Layers className="w-4 h-4 text-[#2563EB]" /></div> Chapters & Sections
            </h2>
            <button onClick={() => openModal('chapter')} disabled={!selectedSubject} className="text-[#2563EB] bg-[#2563EB]/10 hover:bg-[#2563EB] hover:text-white border border-[#2563EB]/20 p-1.5 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"><Plus className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
            {!selectedSubject ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs font-medium">
                <LayoutGrid className="w-12 h-12 mb-3 opacity-10 text-slate-400" /> <p>Select a Subject first</p>
              </div>
            ) : renderChapters()}
          </div>
        </div>

        {/* Column 3: Topics */}
        <div className="bg-[#0B0F19] rounded-3xl shadow-lg border border-[#1E293B] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#1E293B] flex justify-between items-center bg-[#07090E]/50">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <div className="p-1.5 bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-lg"><Bookmark className="w-4 h-4 text-[#2563EB]" /></div> Topics
            </h2>
            <button onClick={() => openModal('topic')} disabled={!selectedChapter} className="text-[#2563EB] bg-[#2563EB]/10 hover:bg-[#2563EB] hover:text-white border border-[#2563EB]/20 p-1.5 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"><Plus className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {!selectedChapter ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs font-medium">
                <Layers className="w-12 h-12 mb-3 opacity-10 text-slate-400" /> <p>Select a Chapter first</p>
              </div>
            ) : topics.map(topic => (
              <div key={topic.id} className="p-4 rounded-2xl bg-transparent hover:bg-[#1E293B]/40 border border-transparent hover:border-[#1E293B] flex justify-between items-center transition-all duration-200 group relative">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-md bg-[#2563EB]/10 border border-[#2563EB]/20 text-[#2563EB] flex items-center justify-center text-[10px] font-black">{topic.topic_order}</span>
                    <span className="text-[10px] font-bold text-slate-500 tracking-widest">{Array(topic.importance_stars).fill('★').join('')}</span>
                  </div>
                  <div className="font-bold text-slate-200 text-sm group-hover:text-white transition-colors">{topic.title}</div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                  <button onClick={(e) => { e.stopPropagation(); openModal('topic', topic); }} disabled={deletingId === topic.id} className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl"><Pencil className="w-4 h-4" /></button>
                  <button onClick={(e) => requestDelete(e, 'topic', topic.id)} disabled={deletingId === topic.id} className={`p-2 transition-all duration-200 rounded-xl ${deletingId === topic.id ? 'opacity-100 text-rose-500' : 'text-slate-500 hover:text-rose-400 hover:bg-rose-500/10'}`}>
                    {deletingId === topic.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- Data Entry Modal --- */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07090E]/80 backdrop-blur-sm p-4">
          <div className="bg-[#0B0F19] border border-[#1E293B] rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 bg-[#07090E] border-b border-[#1E293B] flex justify-between items-center">
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#2563EB]"></div> {editingId ? 'Edit' : 'Add New'} {modal.type.replace('_', ' ')}
              </h3>
              <button onClick={() => setModal({ isOpen: false, type: '' })} className="text-slate-500 hover:text-white bg-transparent hover:bg-[#1E293B] p-2 rounded-full transition-colors"><X className="w-4 h-4" /></button>
            </div>
            
            <form onSubmit={handleModalSubmit} className="p-6 space-y-5">
              
              {/* SUBJECT FIELDS */}
              {modal.type === 'subject' && (
                <>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 ml-1">Subject Name</label>
                    <input type="text" required autoFocus placeholder="e.g. Higher Math" className="w-full p-3.5 bg-[#07090E] border border-slate-800/90 rounded-2xl focus:ring-2 focus:ring-[#2563EB] text-slate-100 outline-none transition-all shadow-inner text-sm font-medium placeholder:text-slate-600" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 ml-1">Class Level</label>
                      <select className="w-full p-3.5 bg-[#07090E] border border-slate-800/90 rounded-2xl focus:ring-2 focus:ring-[#2563EB] text-slate-100 outline-none shadow-inner text-sm font-medium" value={formData.classLevel || 'SSC'} onChange={(e) => setFormData({...formData, classLevel: e.target.value})}>
                        {CLASS_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 ml-1">Group</label>
                      <select className="w-full p-3.5 bg-[#07090E] border border-slate-800/90 rounded-2xl focus:ring-2 focus:ring-[#2563EB] text-slate-100 outline-none shadow-inner text-sm font-medium" value={formData.boardGroup || 'Science'} onChange={(e) => setFormData({...formData, boardGroup: e.target.value})}>
                        {BOARD_GROUPS.map(group => <option key={group} value={group}>{group}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}
              
              {/* CHAPTER & SUB-CHAPTER FIELDS */}
              {(modal.type === 'chapter' || modal.type === 'sub_chapter') && (
                <>
                  {modal.type === 'chapter' ? (
                    <div className="bg-[#07090E]/50 p-4 rounded-xl border border-[#1E293B]">
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 ml-1">Section Group (Optional)</label>
                      <input 
                        type="text" 
                        placeholder="e.g. গদ্য, পদ্য..." 
                        className="w-full p-3.5 bg-[#0B0F19] border border-slate-800/90 rounded-2xl focus:ring-2 focus:ring-[#2563EB] text-slate-100 outline-none transition-all shadow-inner text-sm font-medium placeholder:text-slate-600 mb-3" 
                        value={formData.sectionName || ''} 
                        onChange={(e) => setFormData({...formData, sectionName: e.target.value})} 
                      />
                      <div className="flex flex-wrap gap-2">
                        {/* 🚀 UX FIX: Specific Bangla Sections only */}
                        {['গদ্য', 'পদ্য'].map(chip => (
                          <button 
                            key={chip} type="button" 
                            onClick={() => setFormData({...formData, sectionName: chip})}
                            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all border ${formData.sectionName === chip ? 'bg-[#2563EB]/20 border-[#2563EB] text-[#2563EB]' : 'bg-[#0B0F19] border-[#1E293B] text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    // 🚀 Sub-Chapter Read-Only Parent Display
                    <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                       <CornerDownRight className="w-5 h-5 text-emerald-500/60 shrink-0" />
                       <div>
                         <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Adding under parent:</div>
                         <div className="text-sm font-bold text-emerald-200 mt-0.5">{formData.parentChapterName}</div>
                       </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-1">
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 ml-1">{formData.isSubChapter ? 'Sub-Chapter Label' : 'Chapter Label'}</label>
                      <input type="text" required placeholder={formData.isSubChapter ? "e.g. 11.1" : "e.g. 11 or গল্প ১"} className="w-full p-3.5 bg-[#07090E] border border-slate-800/90 rounded-2xl focus:ring-2 focus:ring-[#2563EB] text-slate-100 outline-none transition-all shadow-inner text-sm font-medium placeholder:text-slate-600" value={formData.chapterLabel || ''} onChange={(e) => setFormData({...formData, chapterLabel: e.target.value})} />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 ml-1">Title</label>
                      <input type="text" required placeholder="e.g. স্থানাঙ্ক জ্যামিতি" className="w-full p-3.5 bg-[#07090E] border border-slate-800/90 rounded-2xl focus:ring-2 focus:ring-[#2563EB] text-slate-100 outline-none transition-all shadow-inner text-sm font-medium placeholder:text-slate-600" value={formData.title || ''} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                    </div>
                  </div>
                </>
              )}

              {/* TOPIC FIELDS */}
              {modal.type === 'topic' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 ml-1">Topic Order</label>
                      <input type="number" required autoFocus min="1" placeholder="e.g. 1" className="w-full p-3.5 bg-[#07090E] border border-slate-800/90 rounded-2xl focus:ring-2 focus:ring-[#2563EB] text-slate-100 outline-none transition-all shadow-inner text-sm font-medium placeholder:text-slate-600" value={formData.topicOrder || ''} onChange={(e) => setFormData({...formData, topicOrder: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 ml-1">Importance</label>
                      <select className="w-full p-3.5 bg-[#07090E] border border-slate-800/90 rounded-2xl focus:ring-2 focus:ring-[#2563EB] text-slate-300 font-bold outline-none shadow-inner text-sm" value={formData.stars || 1} onChange={(e) => setFormData({...formData, stars: e.target.value})}>
                        <option value="1">★ 1 Star</option>
                        <option value="2">★★ 2 Stars</option>
                        <option value="3">★★★ 3 Stars</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 ml-1">Topic Title</label>
                    <input type="text" required placeholder="e.g. Distance & Displacement" className="w-full p-3.5 bg-[#07090E] border border-slate-800/90 rounded-2xl focus:ring-2 focus:ring-[#2563EB] text-slate-100 outline-none transition-all shadow-inner text-sm font-medium placeholder:text-slate-600" value={formData.title || ''} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                  </div>
                </>
              )}

              <button type="submit" disabled={loading} className="w-full py-3.5 rounded-2xl text-white font-black text-sm uppercase tracking-wide transition-all shadow-lg hover:-translate-y-0.5 mt-2 disabled:opacity-50 flex justify-center items-center gap-2 border border-blue-500 bg-[#2563EB] hover:bg-blue-600 shadow-[#2563EB]/20">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving Data...</> : (editingId ? `Update ${modal.type.replace('_', ' ')}` : `Save ${modal.type.replace('_', ' ')}`)}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- Confirm Delete Modal --- */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#07090E]/90 backdrop-blur-md p-4">
          <div className="bg-[#0B0F19] border border-rose-500/30 rounded-3xl shadow-[0_20px_50px_-12px_rgba(225,29,72,0.3)] w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
                <AlertTriangle className="w-8 h-8 text-rose-500" />
              </div>
              <h3 className="text-xl font-black text-white tracking-tight mb-2">{confirmModal.title}</h3>
              <p className="text-slate-400 text-sm font-medium leading-relaxed mb-6">{confirmModal.message}</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })} 
                  className="flex-1 py-3 bg-transparent text-slate-300 border border-slate-700 hover:bg-slate-800 rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
                  }} 
                  className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold shadow-lg shadow-rose-600/20 hover:bg-rose-500 transition-all flex items-center justify-center gap-2"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}