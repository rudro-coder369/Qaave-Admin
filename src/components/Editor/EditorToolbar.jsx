import { useState, useRef } from 'react';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  Code, Quote, List, ListOrdered, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Undo, Redo, Minus, Eraser, Link as LinkIcon, Image as ImageIcon,
  FileCode2, Loader2, Sigma, Highlighter, Palette
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function EditorToolbar({ editor }) {
  if (!editor) return null;

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // 🚀 Read from Vite .env variables
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  // 🚀 Cloudinary Direct Upload Function
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

  const ToolbarButton = ({ onClick, isActive, disabled, icon: Icon, textIcon, label }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`p-2 rounded-lg transition-colors flex items-center justify-center min-w-[32px] h-8 ${
        isActive ? 'bg-[#2563EB] text-white shadow-inner' : 'text-slate-400 hover:bg-[#1E293B] hover:text-slate-200'
      } ${disabled ? 'opacity-30 cursor-not-allowed hover:bg-transparent' : ''}`}
      title={label}
    >
      {Icon ? <Icon className={`w-4 h-4 ${isUploading && Icon === Loader2 ? 'animate-spin' : ''}`} /> : <span className="font-bold text-xs">{textIcon}</span>}
    </button>
  );

  const Divider = () => <div className="w-[1px] h-6 bg-[#1E293B] mx-1" />;

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-[#07090E] border-b border-[#1E293B] sticky top-0 z-10">
      
      {/* History */}
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} icon={Undo} label="Undo" />
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} icon={Redo} label="Redo" />
      
      <Divider />

      {/* Font Family Selector */}
      <select 
        onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()} 
        className="bg-[#0B0F19] border border-[#1E293B] text-slate-300 text-[11px] font-medium rounded p-1.5 outline-none focus:border-[#2563EB] cursor-pointer"
        title="Font Family"
      >
        <option value="">Default Font</option>
        <option value="Inter">Inter</option>
        <option value="Arial">Arial</option>
        <option value="Times New Roman">Times New Roman</option>
        <option value="Courier New">Monospace</option>
      </select>

      <Divider />

      {/* Typography */}
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

      {/* Headings */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} textIcon="H1" label="Heading 1" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} textIcon="H2" label="Heading 2" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} textIcon="H3" label="Heading 3" />
      
      <Divider />

      {/* Alignment */}
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} icon={AlignLeft} label="Align Left" />
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} icon={AlignCenter} label="Align Center" />
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} icon={AlignRight} label="Align Right" />
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })} icon={AlignJustify} label="Justify" />
      
      <Divider />

      {/* Lists & Blocks */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} icon={List} label="Bullet List" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} icon={ListOrdered} label="Numbered List" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} icon={Quote} label="Blockquote" />
      
      <Divider />

      {/* Math & Inserts */}
      <ToolbarButton onClick={() => editor.chain().focus().insertContent({ type: 'mathNode' }).run()} icon={Sigma} label="Add Math Equation" />
      <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} icon={Minus} label="Horizontal Rule" />
      <ToolbarButton onClick={() => alert('Link insertion coming in next phase!')} isActive={editor.isActive('link')} icon={LinkIcon} label="Add Link" />
      
      {/* 🚀 Cloudinary Image Upload */}
      <ToolbarButton 
        onClick={() => fileInputRef.current?.click()} 
        disabled={isUploading} 
        icon={isUploading ? Loader2 : ImageIcon} 
        label="Add Image via Cloudinary" 
      />

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