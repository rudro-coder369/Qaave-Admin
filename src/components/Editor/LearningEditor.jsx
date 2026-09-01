import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import { TextStyle } from '@tiptap/extension-text-style'; 
import { Color } from '@tiptap/extension-color'; 
import { Highlight } from '@tiptap/extension-highlight'; 
import { FontFamily } from '@tiptap/extension-font-family'; 
import MathNode from './extensions/MathNode'; 
import EditorToolbar from './EditorToolbar';
import { useEffect } from 'react';

export default function LearningEditor({ initialContent, onUpdate }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        underline: false, 
        bulletList: {
          HTMLAttributes: { class: 'list-disc ml-6 space-y-2 text-slate-300 marker:text-slate-500' },
        },
        orderedList: {
          HTMLAttributes: { class: 'list-decimal ml-6 space-y-2 text-slate-300 marker:text-slate-500 font-medium' },
        },
        listItem: {
          HTMLAttributes: { class: 'pl-2 leading-relaxed whitespace-pre-wrap' },
        },
        heading: {
          HTMLAttributes: { class: 'text-white font-black tracking-tight mt-8 mb-4 whitespace-pre-wrap' }
        },
        paragraph: {
          HTMLAttributes: { class: 'leading-relaxed text-slate-300 mb-4 whitespace-pre-wrap' }
        }
      }),
      Underline,
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full rounded-xl my-6 border border-[#1E293B] mx-auto shadow-lg', 
        },
      }), 
      TextAlign.configure({ 
        types: ['heading', 'paragraph'] 
      }),
      TextStyle, 
      Color, 
      Highlight.configure({ multicolor: true }), 
      FontFamily, 
      MathNode,
    ],
    content: initialContent || { type: 'doc', content: [] },
    editorProps: {
      attributes: {
        // 🚀 FIX: Added 'prose' back here along with 'px-4 sm:px-6'. 
        // This injects padding directly inside the editable area, separating text from the absolute edge.
        class: 'prose prose-sm sm:prose-base prose-invert focus:outline-none max-w-none min-h-[500px] w-full text-slate-200 px-4 sm:px-6 pt-4 pb-20 outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      onUpdate(editor.getJSON());
    },
  });

  useEffect(() => {
    if (editor && initialContent) {
      if (!editor.isFocused) {
        const currentContent = editor.getJSON();
        if (JSON.stringify(currentContent) !== JSON.stringify(initialContent)) {
          editor.commands.setContent(initialContent, false);
        }
      }
    }
  }, [initialContent, editor]);

  return (
    <div className="flex flex-col h-full bg-transparent">
      <EditorToolbar editor={editor} />
      
      {/* 🚀 FIX: Removed padding and prose from the wrapper, letting the EditorContent handle it natively */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}