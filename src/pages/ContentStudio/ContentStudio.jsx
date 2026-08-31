import { useState, useEffect, useRef } from 'react';
import { taxonomyApi } from '../../services/taxonomyService';
import { contentDocumentService } from '../../services/contentDocumentService';
import { supabase } from '../../config/supabase';
import toast, { Toaster } from 'react-hot-toast';
import { Layers, Save, CheckCircle, FileEdit } from 'lucide-react';
import LearningEditor from '../../components/Editor/LearningEditor';

export default function ContentStudio() {
  const [user, setUser] = useState(null);
  
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  
  const [selectedSub, setSelectedSub] = useState('');
  const [selectedChap, setSelectedChap] = useState('');
  const [selectedTop, setSelectedTop] = useState('');

  const [documentId, setDocumentId] = useState(null);
  const [editorJson, setEditorJson] = useState(null);
  const [status, setStatus] = useState('draft');
  const [isSaving, setIsSaving] = useState(false);
  
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUser(user);
    });

    taxonomyApi.getSubjects().then(setSubjects).catch(err => toast.error(err.message));
  }, []);

  useEffect(() => {
    if (selectedSub) {
      taxonomyApi.getChapters(selectedSub).then(setChapters).catch(err => toast.error(err.message));
      setSelectedChap(''); setSelectedTop(''); resetEditor();
    }
  }, [selectedSub]);

  useEffect(() => {
    if (selectedChap) {
      taxonomyApi.getContentTopics(selectedChap).then(setTopics).catch(err => toast.error(err.message));
      setSelectedTop(''); resetEditor();
    }
  }, [selectedChap]);

  useEffect(() => {
    if (selectedTop) {
      loadDocument(selectedTop);
    }
  }, [selectedTop]);

  const resetEditor = () => {
    setEditorJson(null);
    setDocumentId(null);
    setStatus('draft');
  };

  const loadDocument = async (topicId) => {
    try {
      const doc = await contentDocumentService.getDocument(topicId);
      if (doc) {
        setEditorJson(doc.content);
        setDocumentId(doc.id);
        setStatus(doc.status);
      } else {
        setEditorJson({ type: 'doc', content: [] });
        setDocumentId(null);
        setStatus('draft');
      }
    } catch (error) {
      toast.error("Failed to load document.");
    }
  };

  const handleEditorUpdate = (json) => {
    setEditorJson(json);
    setStatus('draft'); 
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
      manualSave(json);
    }, 2000);
  };

  const manualSave = async (jsonContent = editorJson) => {
    if (!selectedTop) return;
    setIsSaving(true);
    try {
      const savedDoc = await contentDocumentService.saveDocument(
        selectedTop, 
        jsonContent, 
        user?.id
      );
      setDocumentId(savedDoc.id);
      toast.success('Autosaved', { id: 'save-toast', duration: 1000 });
    } catch (error) {
      toast.error("Save failed!");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!documentId) return toast.error("Please wait for autosave first.");
    try {
      await contentDocumentService.publishDocument(documentId);
      setStatus('published');
      toast.success("Document Published Successfully! 🚀");
    } catch (error) {
      toast.error("Failed to publish.");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] text-slate-200">
      <Toaster position="top-right" />
      
      {/* 🚀 Header & Taxonomy Selectors - FLATTENED */}
      <div className="pb-5 mb-5 border-b border-[#1E293B] flex flex-col lg:flex-row items-center justify-between gap-6 shrink-0">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-[#2563EB]" />
          <div>
            <h1 className="text-xl font-black text-white leading-none">QAAVE Studio</h1>
            <p className="text-[10px] text-slate-500 font-extrabold uppercase mt-1 tracking-wider">Smart Workspace</p>
          </div>
        </div>

        <div className="flex w-full lg:max-w-3xl gap-3">
          <select className="flex-1 p-2.5 bg-[#0B0F19] border border-[#1E293B] rounded-lg text-sm text-slate-300 outline-none focus:border-[#2563EB] transition-colors" value={selectedSub} onChange={(e) => setSelectedSub(e.target.value)}>
            <option value="">1. Select Subject</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="flex-1 p-2.5 bg-[#0B0F19] border border-[#1E293B] rounded-lg text-sm text-slate-300 outline-none focus:border-[#2563EB] transition-colors disabled:opacity-40" value={selectedChap} onChange={(e) => setSelectedChap(e.target.value)} disabled={!selectedSub}>
            <option value="">2. Select Chapter</option>
            {chapters.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <select className="flex-1 p-2.5 bg-[#0B0F19] border border-[#1E293B] rounded-lg text-sm font-bold text-[#2563EB] outline-none focus:border-[#2563EB] transition-colors disabled:opacity-40" value={selectedTop} onChange={(e) => setSelectedTop(e.target.value)} disabled={!selectedChap}>
            <option value="" className="text-slate-400">3. Select Topic</option>
            {topics.map(t => <option key={t.id} value={t.id} className="text-slate-300">{t.title}</option>)}
          </select>
        </div>
      </div>

      {/* 🖥️ Main Workspace - SEAMLESS EDGE-TO-EDGE */}
      {!selectedTop || !editorJson ? (
        <div className="flex-1 flex flex-col items-center justify-center opacity-50">
          <FileEdit className="w-12 h-12 text-slate-600 mb-4" />
          <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Select a Topic to Open Workspace</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Top Bar for Actions - FLATTENED */}
          <div className="flex justify-between items-center mb-4 px-2 shrink-0">
            <div className="flex items-center gap-3">
              <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest ${status === 'published' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                {status}
              </span>
              {isSaving && <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Saving changes...</span>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => manualSave()} className="px-4 py-2 bg-[#0B0F19] border border-[#1E293B] hover:bg-[#1E293B] hover:text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2">
                <Save className="w-3.5 h-3.5" /> Save Draft
              </button>
              <button onClick={handlePublish} disabled={status === 'published'} className="px-4 py-2 bg-[#2563EB] hover:bg-blue-600 disabled:bg-[#1E293B] disabled:text-slate-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5" /> Publish Topic
              </button>
            </div>
          </div>

          {/* Tiptap Editor Wrapper */}
          <div className="flex-1 min-h-0 bg-[#07090E] -mx-4 px-4 overflow-hidden flex flex-col">
             <LearningEditor 
               initialContent={editorJson} 
               onUpdate={handleEditorUpdate} 
             />
          </div>
        </div>
      )}
    </div>
  );
}