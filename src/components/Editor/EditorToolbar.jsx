import { useState, useRef, useEffect } from 'react';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  Code, Quote, List, ListOrdered, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Undo, Redo, Minus, Eraser, Link as LinkIcon, Image as ImageIcon,
  FileCode2, Loader2, Sigma, Highlighter, Palette, BarChart2,
  Table as TableIcon, Trash2,
  // 🚀 ADVANCED ICONS FOR INTERACTIVE E-BOOK
  PlusCircle, Lightbulb, AlertTriangle, Layers, CodeSquare, 
  LayoutTemplate, ChevronDown, Columns, Star, Target, Globe, 
  BookOpen, ListChecks, CheckSquare, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function EditorToolbar({ editor }) {
  if (!editor) return null;

  const [isUploading, setIsUploading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const fileInputRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!cloudName || !uploadPreset) {
      toast.error("Cloudinary credentials missing! Please check your .env file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    setIsUploading(true);
    const toastId = toast.loading("Uploading image to Cloudinary...");

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.secure_url) {
        editor.chain().focus().setImage({ src: data.secure_url }).run();
        toast.success("Image uploaded successfully!", { id: toastId });
      } else {
        throw new Error(data.error?.message || "Upload failed");
      }
    } catch (error) {
      toast.error("Error uploading image: " + error.message, { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const ToolbarButton = ({ onClick, isActive, disabled, icon: Icon, textIcon, label, className = '' }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`p-2 rounded-lg transition-colors flex items-center justify-center min-w-[32px] h-8 ${
        isActive ? 'bg-[#2563EB] text-white shadow-inner' : 'text-slate-400 hover:bg-[#1E293B] hover:text-slate-200'
      } ${disabled ? 'opacity-30 cursor-not-allowed hover:bg-transparent' : ''} ${className}`}
      title={label}
    >
      {Icon ? <Icon className={`w-4 h-4 ${isUploading && Icon === Loader2 ? 'animate-spin' : ''}`} /> : <span className="font-bold text-xs">{textIcon}</span>}
    </button>
  );

  const InsertMenuItem = ({ icon: Icon, label, onClick }) => (
    <button 
      onClick={() => { onClick(); setIsMenuOpen(false); }}
      className="flex items-center w-full gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-[#2563EB] hover:text-white transition-colors"
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="text-left">{label}</span>
    </button>
  );

  const Divider = () => <div className="w-[1px] h-6 bg-[#1E293B] mx-1 shrink-0" />;

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-[#07090E] border-b border-[#1E293B] sticky top-0 z-10">
      
      {/* History & Font */}
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} icon={Undo} label="Undo" />
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} icon={Redo} label="Redo" />
      <Divider />
      <select 
        onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()} 
        className="bg-[#0B0F19] border border-[#1E293B] text-slate-300 text-[11px] font-medium rounded p-1.5 outline-none focus:border-[#2563EB] cursor-pointer"
        title="Font Family"
      >
        <option value="">Default Font</option>
        <option value="Inter">Inter</option>
        <option value="Arial">Arial</option>
        <option value="Courier New">Monospace</option>
      </select>
      <Divider />

      {/* Typography & Formatting */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} icon={Bold} label="Bold" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} icon={Italic} label="Italic" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} icon={UnderlineIcon} label="Underline" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} icon={Strikethrough} label="Strikethrough" />
      <ToolbarButton onClick={() => editor.chain().focus().unsetAllMarks().run()} icon={Eraser} label="Clear Formatting" />
      <Divider />

      {/* Colors & Highlights */}
      <div className="relative flex items-center justify-center p-2 rounded-lg hover:bg-[#1E293B] cursor-pointer transition-colors" title="Text Color">
        <Palette className="w-4 h-4 text-slate-400" />
        <input 
          type="color" 
          onInput={(e) => editor.chain().focus().setColor(e.target.value).run()} 
          value={editor.getAttributes('textStyle').color || '#ffffff'} 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      <div className="relative flex items-center justify-center p-2 rounded-lg hover:bg-[#1E293B] cursor-pointer transition-colors" title="Highlight Color">
        <Highlighter className="w-4 h-4 text-slate-400" />
        <input 
          type="color" 
          onInput={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()} 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      <Divider />

      {/* Headings & Alignment */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} textIcon="H1" label="Heading 1" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} textIcon="H2" label="Heading 2" />
      <Divider />
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} icon={AlignLeft} label="Align Left" />
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} icon={AlignCenter} label="Align Center" />
      <Divider />

      {/* Lists & Tables */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} icon={List} label="Bullet List" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} icon={ListOrdered} label="Numbered List" />
      
      <ToolbarButton onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} icon={TableIcon} label="Insert Table" />
      {editor.isActive('table') && (
        <div className="flex bg-[#0B0F19] rounded-lg border border-[#2563EB]/30 overflow-hidden ml-1">
          <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()} textIcon="+Col" className="hover:bg-[#2563EB]/20 text-[#2563EB]" />
          <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()} textIcon="+Row" className="hover:bg-[#2563EB]/20 text-[#2563EB]" />
          <ToolbarButton onClick={() => editor.chain().focus().deleteColumn().run()} textIcon="-Col" className="hover:bg-red-500/20 text-red-400" />
          <ToolbarButton onClick={() => editor.chain().focus().deleteRow().run()} textIcon="-Row" className="hover:bg-red-500/20 text-red-400" />
          <ToolbarButton onClick={() => editor.chain().focus().deleteTable().run()} icon={Trash2} className="hover:bg-red-500/20 text-red-400" />
        </div>
      )}
      <Divider />

      {/* Math, Chart & Media */}
      <ToolbarButton onClick={() => editor.chain().focus().insertContent({ type: 'mathNode' }).run()} icon={Sigma} label="Add Math Equation" />
      <ToolbarButton onClick={() => editor.chain().focus().insertContent({ type: 'chartNode' }).run()} icon={BarChart2} label="Add Chart/Graph" /> 
      <ToolbarButton onClick={() => fileInputRef.current?.click()} disabled={isUploading} icon={isUploading ? Loader2 : ImageIcon} label="Add Image via Cloudinary" />
      
      <Divider />

      {/* 🚀 EXTENDED ADVANCED INSERT MENU (Interactive & Education) */}
      <div className="relative" ref={menuRef}>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            isMenuOpen ? 'bg-blue-600 text-white' : 'text-slate-300 bg-[#1E293B] hover:bg-[#2563EB] hover:text-white'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Insert Block</span>
          <ChevronDown className="w-3 h-3 ml-1" />
        </button>

        {isMenuOpen && (
          <div className="absolute top-full right-0 mt-2 w-64 max-h-96 overflow-y-auto bg-[#0B0F19] border border-[#1E293B] rounded-lg shadow-xl z-50 custom-scrollbar pb-2">
            
            <div className="px-3 py-2 bg-[#1E293B] text-[10px] uppercase font-bold text-slate-400 tracking-wider sticky top-0 z-10">Callouts & Highlights</div>
            <InsertMenuItem icon={Lightbulb} label="Concept Box (💡)" onClick={() => editor.chain().focus().insertContent({ type: 'conceptBox' }).run()} />
            <InsertMenuItem icon={Star} label="Important Note (⭐)" onClick={() => editor.chain().focus().insertContent({ type: 'importantBox' }).run()} />
            <InsertMenuItem icon={Target} label="Exam Tip (🎯)" onClick={() => editor.chain().focus().insertContent({ type: 'examTipBox' }).run()} />
            <InsertMenuItem icon={AlertTriangle} label="Warning / Mistake (⚠️)" onClick={() => editor.chain().focus().insertContent({ type: 'warningBox' }).run()} />
            <InsertMenuItem icon={Globe} label="Real Life Example (🌍)" onClick={() => editor.chain().focus().insertContent({ type: 'realLifeBox' }).run()} />

            <div className="px-3 py-2 bg-[#1E293B] text-[10px] uppercase font-bold text-slate-400 tracking-wider sticky top-0 z-10 mt-1">Problem Solving</div>
            <InsertMenuItem icon={BookOpen} label="Example & Solution Block" onClick={() => editor.chain().focus().insertContent({ type: 'exampleSolutionBlock' }).run()} />
            <InsertMenuItem icon={ListChecks} label="Step-by-Step Breakdown" onClick={() => editor.chain().focus().insertContent({ type: 'stepByStepBlock' }).run()} />
            
            <div className="px-3 py-2 bg-[#1E293B] text-[10px] uppercase font-bold text-slate-400 tracking-wider sticky top-0 z-10 mt-1">Interactive & Assessment</div>
            <InsertMenuItem icon={Layers} label="Accordion (Expandable Details)" onClick={() => editor.chain().focus().insertContent({ type: 'accordionBlock' }).run()} />
            <InsertMenuItem icon={LayoutTemplate} label="Tabbed Layout" onClick={() => editor.chain().focus().insertContent({ type: 'tabsBlock' }).run()} />
            <InsertMenuItem icon={Eye} label="Reveal Answer / Flashcard" onClick={() => editor.chain().focus().insertContent({ type: 'revealAnswerBlock' }).run()} />
            <InsertMenuItem icon={CheckSquare} label="Inline MCQ Question" onClick={() => editor.chain().focus().insertContent({ type: 'mcqBlock' }).run()} />

            <div className="px-3 py-2 bg-[#1E293B] text-[10px] uppercase font-bold text-slate-400 tracking-wider sticky top-0 z-10 mt-1">Code & Layout</div>
            <InsertMenuItem icon={CodeSquare} label="Code Block (Syntax)" onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
            <InsertMenuItem icon={Columns} label="2-Column Layout" onClick={() => editor.chain().focus().insertContent({ type: 'twoColumnLayout' }).run()} />
          </div>
        )}
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        accept="image/*" 
        className="hidden" 
      />
    </div>
  );
}