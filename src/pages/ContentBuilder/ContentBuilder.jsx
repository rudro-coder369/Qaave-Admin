import { useState, useEffect } from 'react';
import { taxonomyApi } from '../../services/taxonomyService';
import { contentService } from '../../services/contentService';
import toast, { Toaster } from 'react-hot-toast';
import { Layers, Plus, Save, Type, Image as ImageIcon, FileWarning, Search, Trash2, BookOpen, Lightbulb, Zap, HelpCircle, Code, List, MessageSquare, Video } from 'lucide-react';

export default function ContentBuilder() {
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  
  const [selectedSub, setSelectedSub] = useState('');
  const [selectedChap, setSelectedChap] = useState('');
  const [selectedTop, setSelectedTop] = useState('');

  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Core Block State
  const [newBlock, setNewBlock] = useState({
    block_type: 'concept',
    text_content: '',
  });

  // Rich Media & Metadata States
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [qaPair, setQaPair] = useState({ question: '', answer: '' });
  const [bulletPoints, setBulletPoints] = useState(['', '']);

  const blockTypes = ['definition', 'concept', 'example', 'formula', 'diagram', 'note', 'warning', 'shortcut', 'bullet_points', 'qa_pair'];

  useEffect(() => {
    taxonomyApi.getSubjects().then(setSubjects).catch(err => toast.error(err.message));
  }, []);

  useEffect(() => {
    if (selectedSub) {
      taxonomyApi.getChapters(selectedSub).then(setChapters).catch(err => toast.error(err.message));
      setSelectedChap(''); setSelectedTop(''); setBlocks([]);
    }
  }, [selectedSub]);

  useEffect(() => {
    if (selectedChap) {
      taxonomyApi.getTopics(selectedChap).then(setTopics).catch(err => toast.error(err.message));
      setSelectedTop(''); setBlocks([]);
    }
  }, [selectedChap]);

  useEffect(() => {
    if (selectedTop) {
      loadBlocks(selectedTop);
    }
  }, [selectedTop]);

  const loadBlocks = async (topicId) => {
    setLoading(true);
    try {
      const data = await contentService.getBlocks(topicId);
      setBlocks(data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBlock = async (e) => {
    e.preventDefault();
    if (!selectedTop) return toast.error("Please select a topic first!");
    
    const isSpecialBlock = ['qa_pair', 'bullet_points'].includes(newBlock.block_type);
    if (!isSpecialBlock && !newBlock.text_content.trim()) {
      return toast.error("Main content cannot be empty!");
    }

    const nextOrder = blocks.length > 0 ? Math.max(...blocks.map(b => b.block_order)) + 1 : 1;

    // Compile Metadata
    let metadata = {};
    if (imageUrl.trim()) metadata.image_url = imageUrl.trim();
    if (videoUrl.trim()) metadata.video_url = videoUrl.trim();
    if (newBlock.block_type === 'qa_pair') metadata.qa = qaPair;
    if (newBlock.block_type === 'bullet_points') metadata.points = bulletPoints.filter(p => p.trim() !== '');

    try {
      setLoading(true);
      const addedBlock = await contentService.addBlock(
        selectedTop,
        nextOrder,
        newBlock.block_type,
        newBlock.text_content,
        metadata
      );
      
      setBlocks([...blocks, addedBlock]);
      
      // Reset Form completely
      setNewBlock({ ...newBlock, text_content: '' }); 
      setImageUrl('');
      setVideoUrl('');
      setQaPair({ question: '', answer: '' });
      setBulletPoints(['', '']);

      toast.success("Rich Block added seamlessly!");
    } catch (error) {
      toast.error("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBlock = async (blockId) => {
    if (!window.confirm("Are you sure you want to delete this block?")) return;
    try {
      await contentService.deleteBlock(blockId);
      setBlocks(blocks.filter(b => b.id !== blockId));
      toast.success("Block deleted successfully.");
    } catch (error) {
      toast.error("Failed to delete: " + error.message);
    }
  };

  const getBlockIcon = (type) => {
    const iconClass = "w-4 h-4 text-[#2563EB]";
    switch(type) {
      case 'warning': return <FileWarning className={iconClass} />;
      case 'diagram': return <ImageIcon className={iconClass} />;
      case 'formula': return <Code className={iconClass} />;
      case 'example': return <Lightbulb className={iconClass} />;
      case 'shortcut': return <Zap className={iconClass} />;
      case 'definition': return <BookOpen className={iconClass} />;
      case 'note': return <HelpCircle className={iconClass} />;
      case 'qa_pair': return <MessageSquare className={iconClass} />;
      case 'bullet_points': return <List className={iconClass} />;
      default: return <Type className={iconClass} />;
    }
  };

  return (
    // Fixed height layout to enable internal scrolling
    <div className="flex flex-col h-[calc(100vh-100px)] text-slate-200">
      <Toaster position="top-right" 
        toastOptions={{ style: { background: '#0B0F19', color: '#F1F5F9', border: '1px solid #1E293B' } }} 
      />
      
      {/* 🚀 Compact Header & Filters Bar */}
      <div className="bg-[#0B0F19] p-3 md:p-4 rounded-2xl border border-[#1E293B] mb-4 flex flex-col lg:flex-row items-center justify-between gap-4 shrink-0 shadow-lg">
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="p-2 bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-lg shadow-inner">
            <Layers className="w-5 h-5 text-[#2563EB]" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight leading-none">Content Studio</h1>
            <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest mt-1">Rich Content Engine</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row flex-1 w-full lg:max-w-3xl gap-3">
          <select 
            className="flex-1 p-2.5 bg-[#07090E] border border-[#1E293B] rounded-xl focus:ring-2 focus:ring-[#2563EB] outline-none shadow-inner text-xs font-bold text-slate-300" 
            value={selectedSub} onChange={(e) => setSelectedSub(e.target.value)}
          >
            <option value="">1. Select Subject</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          
          <select 
            className="flex-1 p-2.5 bg-[#07090E] border border-[#1E293B] rounded-xl focus:ring-2 focus:ring-[#2563EB] outline-none shadow-inner disabled:opacity-40 text-xs font-bold text-slate-300" 
            value={selectedChap} onChange={(e) => setSelectedChap(e.target.value)} disabled={!selectedSub}
          >
            <option value="">2. Select Chapter</option>
            {chapters.map(c => <option key={c.id} value={c.id}>Ch {c.chapter_number}: {c.title}</option>)}
          </select>

          <select 
            className="flex-1 p-2.5 bg-[#2563EB]/5 border border-[#2563EB]/20 rounded-xl focus:ring-2 focus:ring-[#2563EB] outline-none shadow-inner disabled:opacity-40 text-xs font-black text-blue-300" 
            value={selectedTop} onChange={(e) => setSelectedTop(e.target.value)} disabled={!selectedChap}
          >
            <option value="" className="bg-[#07090E] text-slate-400">3. Select Topic</option>
            {topics.map(t => <option key={t.id} value={t.id} className="bg-[#07090E]">{t.topic_order}. {t.title}</option>)}
          </select>
        </div>
      </div>

      {/* 🖥️ Main Workspace (8:4 Split) */}
      {!selectedTop ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#0B0F19] rounded-2xl border border-dashed border-[#1E293B] text-slate-500 shadow-inner">
          <Search className="w-10 h-10 text-slate-600 mb-3 opacity-50" />
          <p className="text-xs font-bold tracking-widest uppercase">Select Topic to start building</p>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 pb-2">
          
          {/* Left: Reading Flow Preview (8 Columns) */}
          <div className="lg:col-span-8 flex flex-col bg-[#0B0F19] rounded-2xl shadow-lg border border-[#1E293B] overflow-hidden">
            <div className="p-3 bg-[#07090E]/50 border-b border-[#1E293B] flex justify-between items-center shrink-0">
              <h2 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#2563EB]" /> Reading Flow & Assets
              </h2>
              <span className="px-2.5 py-1 bg-[#2563EB]/10 text-[#2563EB] rounded-lg text-[9px] font-black uppercase tracking-widest border border-[#2563EB]/20 shadow-inner">
                {blocks.length} Blocks
              </span>
            </div>
            
            {/* Scrollable Preview Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {blocks.length === 0 ? (
                <div className="text-center text-slate-500 mt-10 flex flex-col items-center">
                  <BookOpen className="w-8 h-8 mb-2 opacity-20 text-[#2563EB]" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">No content blocks yet</p>
                </div>
              ) : blocks.map((block) => (
                <div key={block.id} className="p-4 rounded-xl bg-transparent hover:bg-[#1E293B]/30 border border-transparent hover:border-[#1E293B] transition-all duration-300 group relative flex gap-3">
                  
                  {/* Delete Button */}
                  <button 
                    onClick={() => handleDeleteBlock(block.id)}
                    className="absolute top-3 right-3 p-1.5 bg-transparent text-slate-500 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-200"
                    title="Delete Block"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="mt-0.5 p-2 rounded-lg bg-[#2563EB]/10 border border-[#2563EB]/20 h-fit shadow-inner">
                    {getBlockIcon(block.block_type)}
                  </div>
                  
                  <div className="flex-1 pr-8">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20">
                        {block.block_type}
                      </span>
                      <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest">Ord: {block.block_order}</span>
                    </div>

                    {/* Standard Text Content */}
                    {block.text_content && (
                      <p className="text-slate-300 whitespace-pre-wrap leading-relaxed text-xs font-medium">
                        {block.text_content}
                      </p>
                    )}

                    {/* Math / Q&A Render */}
                    {block.block_type === 'qa_pair' && block.metadata?.qa && (
                      <div className="bg-[#07090E] p-3 rounded-xl border border-[#1E293B] space-y-2 mt-3 shadow-inner">
                        <div className="border-b border-[#1E293B] pb-2">
                          <span className="text-[8px] font-black uppercase tracking-widest text-[#2563EB] block mb-1">Q (Problem / Math)</span>
                          <p className="text-xs text-slate-200 font-bold whitespace-pre-wrap">{block.metadata.qa.question}</p>
                        </div>
                        <div>
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">Solution / Answer</span>
                          <p className="text-xs text-slate-300 whitespace-pre-wrap font-medium">{block.metadata.qa.answer}</p>
                        </div>
                      </div>
                    )}

                    {/* Bullet Points Render */}
                    {block.block_type === 'bullet_points' && block.metadata?.points && (
                      <ul className="list-disc list-inside space-y-1.5 mt-3 text-xs text-slate-300 font-medium">
                        {block.metadata.points.map((pt, i) => (
                          <li key={i} className="leading-relaxed">{pt}</li>
                        ))}
                      </ul>
                    )}

                    {/* Rich Media Render */}
                    {block.metadata?.image_url && (
                      <img src={block.metadata.image_url} alt="asset" className="max-h-32 rounded-lg border border-[#1E293B] mt-3 object-contain" />
                    )}

                    {block.metadata?.video_url && (
                      <a href={block.metadata.video_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 mt-3 p-2 bg-[#07090E] border border-[#1E293B] rounded-lg w-fit hover:border-[#2563EB] transition-colors shadow-inner">
                        <Video className="w-3.5 h-3.5 text-[#2563EB]" />
                        <span className="text-[10px] font-bold text-slate-300">Watch Attached Video</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Form Sidebar (4 Columns) */}
          <div className="lg:col-span-4 bg-[#0B0F19] rounded-2xl shadow-lg border border-[#1E293B] flex flex-col overflow-hidden">
            <div className="p-3 bg-[#07090E]/50 border-b border-[#1E293B] shrink-0">
              <h2 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#2563EB]" /> Add Content Block
              </h2>
            </div>
            
            {/* Scrollable Form Area */}
            <form onSubmit={handleAddBlock} className="flex-1 overflow-y-auto p-4 flex flex-col space-y-5 custom-scrollbar">
              
              {/* Block Type Selection */}
              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Block Type</label>
                <div className="flex flex-wrap gap-1.5">
                  {blockTypes.map(type => (
                    <button 
                      key={type}
                      type="button" 
                      onClick={() => setNewBlock({...newBlock, block_type: type})}
                      className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-200 border ${
                        newBlock.block_type === type 
                          ? 'bg-[#2563EB] border-[#2563EB] text-white shadow-md shadow-[#2563EB]/20 transform scale-[1.02]' 
                          : 'bg-transparent border-[#1E293B] text-slate-400 hover:bg-[#1E293B]/50 hover:text-slate-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Inputs Based on Type */}
              
              {/* 1. QA / Math Input */}
              {newBlock.block_type === 'qa_pair' ? (
                <div className="space-y-3 bg-[#07090E] p-3 rounded-xl border border-[#1E293B] shadow-inner">
                  <div>
                    <label className="block text-[8px] font-black text-[#2563EB] uppercase tracking-widest mb-1">Question (Supports LaTeX)</label>
                    <textarea className="w-full p-2.5 bg-[#0B0F19] border border-[#1E293B] rounded-lg text-xs text-slate-200 outline-none resize-none focus:ring-1 focus:ring-[#2563EB]" rows="2" placeholder="e.g. Solve for x..." value={qaPair.question} onChange={(e) => setQaPair({...qaPair, question: e.target.value})} required></textarea>
                  </div>
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Solution / Answer</label>
                    <textarea className="w-full p-2.5 bg-[#0B0F19] border border-[#1E293B] rounded-lg text-xs text-slate-200 outline-none resize-none focus:ring-1 focus:ring-[#2563EB]" rows="3" placeholder="Step-by-step solution..." value={qaPair.answer} onChange={(e) => setQaPair({...qaPair, answer: e.target.value})} required></textarea>
                  </div>
                </div>
              ) : newBlock.block_type === 'bullet_points' ? (
                
              /* 2. Bullet Points Input */
                <div className="space-y-2 bg-[#07090E] p-3 rounded-xl border border-[#1E293B] shadow-inner">
                  <label className="block text-[8px] font-black text-[#2563EB] uppercase tracking-widest">Bullet List</label>
                  {bulletPoints.map((pt, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input type="text" className="flex-1 p-2 bg-[#0B0F19] border border-[#1E293B] rounded-lg text-xs text-slate-200 outline-none focus:ring-1 focus:ring-[#2563EB]" placeholder={`Point ${idx + 1}`} value={pt} onChange={(e) => {
                        const updated = [...bulletPoints];
                        updated[idx] = e.target.value;
                        setBulletPoints(updated);
                      }} />
                      <button type="button" onClick={() => setBulletPoints(bulletPoints.filter((_, i) => i !== idx))} className="px-2 text-slate-500 hover:text-rose-400 bg-[#0B0F19] border border-[#1E293B] hover:border-rose-500/30 rounded-lg">✕</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setBulletPoints([...bulletPoints, ''])} className="w-full py-2 text-[9px] font-bold text-slate-400 bg-[#0B0F19] hover:text-[#2563EB] border border-[#1E293B] border-dashed rounded-lg transition-colors">+ Add Point</button>
                </div>
              ) : (

              /* 3. Standard Text Input */
                <div className="flex flex-col">
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Content Text (Optional if Media only)</label>
                  <textarea 
                    className="w-full p-4 bg-[#07090E] border border-[#1E293B] rounded-xl focus:ring-2 focus:ring-[#2563EB] outline-none transition-all resize-none text-xs font-medium text-slate-200 shadow-inner placeholder:text-slate-600 min-h-[100px]"
                    placeholder={`Type ${newBlock.block_type} details...`}
                    value={newBlock.text_content}
                    onChange={(e) => setNewBlock({...newBlock, text_content: e.target.value})}
                  ></textarea>
                </div>
              )}

              {/* Rich Media Links (Image / Video) */}
              <div className="space-y-2 bg-[#07090E] p-3 rounded-xl border border-[#1E293B] shadow-inner">
                <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Media Attachments (Optional)</label>
                <div className="flex items-center gap-2 bg-[#0B0F19] p-2 rounded-lg border border-[#1E293B] focus-within:ring-1 focus-within:ring-[#2563EB]">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                  <input type="text" className="flex-1 bg-transparent text-xs outline-none text-slate-200 placeholder-slate-600" placeholder="Image URL..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
                </div>
                <div className="flex items-center gap-2 bg-[#0B0F19] p-2 rounded-lg border border-[#1E293B] focus-within:ring-1 focus-within:ring-[#2563EB]">
                  <Video className="w-3.5 h-3.5 text-slate-500" />
                  <input type="text" className="flex-1 bg-transparent text-xs outline-none text-slate-200 placeholder-slate-600" placeholder="Video URL..." value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 shrink-0">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-3.5 bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-[#2563EB]/20 transform hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-500"
                >
                  {loading ? 'Saving...' : <><Save className="w-4 h-4" /> Save Content Block</>}
                </button>
              </div>
            </form>
          </div>

        </div>
      )}
    </div>
  );
}