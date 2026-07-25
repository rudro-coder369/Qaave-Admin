import React, { useState, useEffect } from 'react';
import { taxonomyApi } from '../../services/taxonomyService';
import toast, { Toaster } from 'react-hot-toast';
import { Folder, FileText, Bookmark, Plus, ChevronRight, X, LayoutGrid, Layers, CheckCircle2, Trash2, CornerDownRight } from 'lucide-react';

export default function Taxonomy() {
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);

  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [modal, setModal] = useState({ isOpen: false, type: '' });
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const data = await taxonomyApi.getSubjects();
      setSubjects(data);
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
      setChapters(data);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleChapterClick = async (chapter) => {
    setSelectedChapter(chapter);
    try {
      const data = await taxonomyApi.getTopics(chapter.id);
      setTopics(data);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const openModal = (type) => {
    setFormData({});
    setModal({ isOpen: true, type });
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (modal.type === 'subject') {
        const newSub = await taxonomyApi.addSubject(formData.name, formData.classLevel || 'SSC', formData.boardGroup || 'Science');
        setSubjects([...subjects, newSub]);
        toast.success("Subject added successfully.");
      } 
      else if (modal.type === 'chapter') {
        // API কল আপডেট করা হলো নতুন ডাটাবেজ কলাম অনুযায়ী
        const newChap = await taxonomyApi.addChapter({
          subject_id: selectedSubject.id,
          chapter_label: formData.chapterLabel,
          title: formData.title,
          section_name: formData.sectionName || null,
          parent_chapter_id: formData.parentChapterId || null
        });
        setChapters([...chapters, newChap]);
        toast.success("Chapter added successfully.");
      } 
      else if (modal.type === 'topic') {
        const newTopic = await taxonomyApi.addTopic(selectedChapter.id, parseInt(formData.topicOrder), formData.title, parseInt(formData.stars || 1));
        setTopics([...topics, newTopic]);
        toast.success("Topic added successfully.");
      }
      setModal({ isOpen: false, type: '' });
    } catch (error) {
      toast.error("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete Handlers
  const handleDeleteSubject = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure? Deleting this subject will also delete all its chapters and topics!")) return;
    try {
      await taxonomyApi.deleteSubject(id);
      setSubjects(subjects.filter(s => s.id !== id));
      if (selectedSubject?.id === id) { setSelectedSubject(null); setChapters([]); setTopics([]); }
      toast.success("Subject deleted.");
    } catch (error) {
      toast.error("Error: " + error.message);
    }
  };

  const handleDeleteChapter = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure? Deleting this chapter will also delete all its sub-chapters and topics!")) return;
    try {
      await taxonomyApi.deleteChapter(id);
      // Main chapter ডিলিট হলে UI থেকে তার sub-chapter গুলোও সরাতে হবে
      setChapters(chapters.filter(c => c.id !== id && c.parent_chapter_id !== id));
      if (selectedChapter?.id === id || selectedChapter?.parent_chapter_id === id) { 
        setSelectedChapter(null); 
        setTopics([]); 
      }
      toast.success("Chapter deleted.");
    } catch (error) {
      toast.error("Error: " + error.message);
    }
  };

  const handleDeleteTopic = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this topic?")) return;
    try {
      await taxonomyApi.deleteTopic(id);
      setTopics(topics.filter(t => t.id !== id));
      toast.success("Topic deleted.");
    } catch (error) {
      toast.error("Error: " + error.message);
    }
  };

  // 🚀 Chapters Grouping Logic: Section অনুযায়ী সাজানো এবং Parent-Child মেলানো
  const renderChapters = () => {
    if (!chapters || chapters.length === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs font-medium">
          <Layers className="w-12 h-12 mb-3 opacity-10 text-slate-400" />
          <p>No Chapters found. Add one!</p>
        </div>
      );
    }

    // ১. Section অনুযায়ী গ্রুপ করা (গদ্য, পদ্য, বীজগণিত)
    const grouped = chapters.reduce((acc, chap) => {
      const sec = chap.section_name || 'General Chapters';
      if (!acc[sec]) acc[sec] = [];
      acc[sec].push(chap);
      return acc;
    }, {});

    return Object.entries(grouped).map(([sectionName, sectionChapters]) => (
      <div key={sectionName} className="mb-4">
        {/* Section Header */}
        <div className="text-[10px] uppercase text-slate-400 font-black tracking-widest mx-2 mb-2 pb-1 border-b border-[#1E293B]">
          {sectionName}
        </div>

        {/* Main Chapters */}
        {sectionChapters.filter(c => !c.parent_chapter_id).map(mainChap => (
          <React.Fragment key={mainChap.id}>
            {/* Main Chapter Card */}
            <ChapterCard chap={mainChap} isSub={false} />
            
            {/* Sub Chapters (১১.১, ১১.২) */}
            {sectionChapters
              .filter(c => c.parent_chapter_id === mainChap.id)
              .map(subChap => (
                <div key={subChap.id} className="pl-6 relative">
                  {/* Tree connector line */}
                  <div className="absolute left-3 top-0 bottom-4 w-px bg-[#1E293B]"></div>
                  <ChapterCard chap={subChap} isSub={true} />
                </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    ));
  };

  // Reusable Chapter Card Widget
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
          <div className="font-bold text-sm leading-tight">{chap.title}</div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button 
          onClick={(e) => handleDeleteChapter(e, chap.id)}
          className={`p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 ${
            selectedChapter?.id === chap.id ? 'text-blue-200 hover:text-white hover:bg-blue-700' : 'text-slate-500 hover:text-rose-400 hover:bg-rose-500/10'
          }`}
          title="Delete Chapter"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <ChevronRight className={`w-4 h-4 transition-transform ${selectedChapter?.id === chap.id ? 'opacity-100 translate-x-1' : 'opacity-0 group-hover:opacity-100'}`} />
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col relative bg-transparent text-slate-200">
      <Toaster position="top-right" 
        toastOptions={{ style: { background: '#0B0F19', color: '#F1F5F9', border: '1px solid #1E293B' } }} 
      />
      
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
              <div className="p-1.5 bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-lg"><LayoutGrid className="w-4 h-4 text-[#2563EB]" /></div>
              Subjects
            </h2>
            <button onClick={() => openModal('subject')} className="text-[#2563EB] bg-[#2563EB]/10 hover:bg-[#2563EB] hover:text-white border border-[#2563EB]/20 p-1.5 rounded-xl transition-all"><Plus className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {/* Same Subjects Rendering as before... */}
            {subjects.map(sub => (
              <div 
                key={sub.id} 
                onClick={() => handleSubjectClick(sub)}
                className={`p-4 rounded-2xl cursor-pointer flex justify-between items-center group transition-all duration-200 border relative ${
                  selectedSubject?.id === sub.id 
                    ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-lg shadow-[#2563EB]/20' 
                    : 'bg-transparent hover:bg-[#1E293B]/40 border-transparent hover:border-[#1E293B]'
                }`}
              >
                <div>
                  <div className="font-bold text-sm">{sub.name}</div>
                  <div className={`text-[10px] mt-1 font-medium uppercase tracking-wider ${selectedSubject?.id === sub.id ? 'text-blue-200' : 'text-slate-500'}`}>
                    {sub.class_level} • {sub.board_group}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => handleDeleteSubject(e, sub.id)} className={`p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 ${selectedSubject?.id === sub.id ? 'text-blue-200 hover:text-white hover:bg-blue-700' : 'text-slate-500 hover:text-rose-400 hover:bg-rose-500/10'}`}><Trash2 className="w-4 h-4" /></button>
                  <ChevronRight className={`w-4 h-4 transition-transform ${selectedSubject?.id === sub.id ? 'opacity-100 translate-x-1' : 'opacity-0 group-hover:opacity-100'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Chapters */}
        <div className="bg-[#0B0F19] rounded-3xl shadow-lg border border-[#1E293B] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#1E293B] flex justify-between items-center bg-[#07090E]/50">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <div className="p-1.5 bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-lg"><Layers className="w-4 h-4 text-[#2563EB]" /></div>
              Chapters & Sections
            </h2>
            <button onClick={() => openModal('chapter')} disabled={!selectedSubject} className="text-[#2563EB] bg-[#2563EB]/10 hover:bg-[#2563EB] hover:text-white border border-[#2563EB]/20 p-1.5 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"><Plus className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
            {!selectedSubject ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs font-medium">
                <LayoutGrid className="w-12 h-12 mb-3 opacity-10 text-slate-400" />
                <p>Select a Subject first</p>
              </div>
            ) : (
              renderChapters()
            )}
          </div>
        </div>

        {/* Column 3: Topics (Same as before) */}
        <div className="bg-[#0B0F19] rounded-3xl shadow-lg border border-[#1E293B] flex flex-col overflow-hidden">
          {/* ... [Topics Header & Render logic exactly same as your code] ... */}
          <div className="p-4 border-b border-[#1E293B] flex justify-between items-center bg-[#07090E]/50">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <div className="p-1.5 bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-lg"><Bookmark className="w-4 h-4 text-[#2563EB]" /></div>
              Topics
            </h2>
            <button onClick={() => openModal('topic')} disabled={!selectedChapter} className="text-[#2563EB] bg-[#2563EB]/10 hover:bg-[#2563EB] hover:text-white border border-[#2563EB]/20 p-1.5 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"><Plus className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {!selectedChapter ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs font-medium">
                <Layers className="w-12 h-12 mb-3 opacity-10 text-slate-400" />
                <p>Select a Chapter first</p>
              </div>
            ) : (
              topics.map(topic => (
                <div key={topic.id} className="p-4 rounded-2xl bg-transparent hover:bg-[#1E293B]/40 border border-transparent hover:border-[#1E293B] flex justify-between items-center transition-all duration-200 group relative">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-5 h-5 rounded-md bg-[#2563EB]/10 border border-[#2563EB]/20 text-[#2563EB] flex items-center justify-center text-[10px] font-black">{topic.topic_order}</span>
                      <span className="text-[10px] font-bold text-slate-500 tracking-widest">
                        {Array(topic.importance_stars).fill('★').join('')}
                      </span>
                    </div>
                    <div className="font-bold text-slate-200 text-sm group-hover:text-white transition-colors">{topic.title}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => handleDeleteTopic(e, topic.id)} className="p-2 text-slate-500 bg-transparent hover:text-rose-400 hover:bg-rose-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* --- Strict Theme Modal --- */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07090E]/80 backdrop-blur-sm p-4">
          <div className="bg-[#0B0F19] border border-[#1E293B] rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 bg-[#07090E] border-b border-[#1E293B] flex justify-between items-center">
              <h3 className="text-lg font-black text-white capitalize tracking-tight flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#2563EB]"></div> Add New {modal.type}
              </h3>
              <button onClick={() => setModal({ isOpen: false, type: '' })} className="text-slate-500 hover:text-white bg-transparent hover:bg-[#1E293B] p-2 rounded-full transition-colors"><X className="w-4 h-4" /></button>
            </div>
            
            <form onSubmit={handleModalSubmit} className="p-6 space-y-5">
              
              {/* SUBJECT FIELDS (Same as before) ... */}
              
              {/* 🚀 NEW CHAPTER FIELDS */}
              {modal.type === 'chapter' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 ml-1">Chapter Label</label>
                      <input type="text" required autoFocus placeholder="e.g. 11.1 or গল্প ১" className="w-full p-3.5 bg-[#07090E] border border-slate-800/90 rounded-2xl focus:ring-2 focus:ring-[#2563EB] text-slate-100 outline-none transition-all shadow-inner text-sm font-medium placeholder:text-slate-600" onChange={(e) => setFormData({...formData, chapterLabel: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 ml-1">Section (Optional)</label>
                      <input type="text" placeholder="e.g. গদ্য, পদ্য, বীজগণিত" className="w-full p-3.5 bg-[#07090E] border border-slate-800/90 rounded-2xl focus:ring-2 focus:ring-[#2563EB] text-slate-100 outline-none transition-all shadow-inner text-sm font-medium placeholder:text-slate-600" onChange={(e) => setFormData({...formData, sectionName: e.target.value})} />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 ml-1">Parent Chapter (Optional)</label>
                    <select className="w-full p-3.5 bg-[#07090E] border border-slate-800/90 rounded-2xl focus:ring-2 focus:ring-[#2563EB] text-slate-300 font-medium outline-none shadow-inner text-sm" onChange={(e) => setFormData({...formData, parentChapterId: e.target.value})}>
                      <option value="">None (It's a Main Chapter)</option>
                      {/* শুধুমাত্র মেইন চ্যাপ্টারগুলো ড্রপডাউনে দেখাবে */}
                      {chapters.filter(c => !c.parent_chapter_id).map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 ml-1">Chapter Title</label>
                    <input type="text" required placeholder="e.g. স্থানাঙ্ক জ্যামিতি" className="w-full p-3.5 bg-[#07090E] border border-slate-800/90 rounded-2xl focus:ring-2 focus:ring-[#2563EB] text-slate-100 outline-none transition-all shadow-inner text-sm font-medium placeholder:text-slate-600" onChange={(e) => setFormData({...formData, title: e.target.value})} />
                  </div>
                </>
              )}

              {/* TOPIC FIELDS (Same as before) ... */}
              {modal.type === 'topic' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 ml-1">Topic Order</label>
                      <input type="number" required autoFocus min="1" placeholder="e.g. 1" className="w-full p-3.5 bg-[#07090E] border border-slate-800/90 rounded-2xl focus:ring-2 focus:ring-[#2563EB] text-slate-100 outline-none transition-all shadow-inner text-sm font-medium placeholder:text-slate-600" onChange={(e) => setFormData({...formData, topicOrder: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 ml-1">Importance</label>
                      <select className="w-full p-3.5 bg-[#07090E] border border-slate-800/90 rounded-2xl focus:ring-2 focus:ring-[#2563EB] text-slate-300 font-bold outline-none shadow-inner text-sm" onChange={(e) => setFormData({...formData, stars: e.target.value})}>
                        <option value="1">★ 1 Star</option>
                        <option value="2">★★ 2 Stars</option>
                        <option value="3">★★★ 3 Stars</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 ml-1">Topic Title</label>
                    <input type="text" required placeholder="e.g. Distance & Displacement" className="w-full p-3.5 bg-[#07090E] border border-slate-800/90 rounded-2xl focus:ring-2 focus:ring-[#2563EB] text-slate-100 outline-none transition-all shadow-inner text-sm font-medium placeholder:text-slate-600" onChange={(e) => setFormData({...formData, title: e.target.value})} />
                  </div>
                </>
              )}

              <button type="submit" disabled={loading} className="w-full py-3.5 rounded-2xl text-white font-black text-sm uppercase tracking-wide transition-all shadow-lg hover:-translate-y-0.5 mt-2 disabled:opacity-50 flex justify-center items-center gap-2 border border-blue-500 bg-[#2563EB] hover:bg-blue-600 shadow-[#2563EB]/20">
                {loading ? 'Saving Data...' : `Save ${modal.type}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}