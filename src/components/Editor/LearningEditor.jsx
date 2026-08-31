import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image'; // 🚀 Added Tiptap Image Extension for Cloudinary
import EditorToolbar from './EditorToolbar';
import { useEffect } from 'react';

export default function LearningEditor({ initialContent, onUpdate }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        underline: false, 
      }),
      Underline,
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full rounded-xl my-4 border border-[#1E293B]', // Optional styling for uploaded images
        },
      }), // 🚀 Configured Image Extension
      TextAlign.configure({ 
        types: ['heading', 'paragraph'] 
      }),
    ],
    content: initialContent || { type: 'doc', content: [] },
    editorProps: {
      attributes: {
        className: 'prose prose-sm sm:prose-base prose-invert focus:outline-none max-w-none p-4 min-h-[500px] text-slate-200',
      },
    },
    onUpdate: ({ editor }) => {
      onUpdate(editor.getJSON());
    },
  });

  useEffect(() => {
    if (editor && initialContent) {
      const currentContent = editor.getJSON();
      if (JSON.stringify(currentContent) !== JSON.stringify(initialContent)) {
        editor.commands.setContent(initialContent, false);
      }
    }
  }, [initialContent, editor]);

  return (
    <div className="flex flex-col h-full bg-transparent">
      <EditorToolbar editor={editor} />
      <div className="flex-1 overflow-y-auto custom-scrollbar pt-4 pb-20">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}