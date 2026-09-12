import { useEditor, EditorContent } from '@tiptap/react';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import { TextStyle } from '@tiptap/extension-text-style'; 
import { Color } from '@tiptap/extension-color'; 
import { Highlight } from '@tiptap/extension-highlight'; 
import { FontFamily } from '@tiptap/extension-font-family'; 
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';

import MathNode from './extensions/MathNode'; 
import ChartNode from './extensions/ChartNode'; 
import EditorToolbar from './EditorToolbar';
import { useEffect, useState } from 'react';
import { ChevronDown, Eye, Layers, CheckSquare, BookOpen, LayoutTemplate } from 'lucide-react';

// ==============================================================================
// 🚀 PHASE 2: STATIC EDUCATIONAL CALLOUTS (💡, ⭐, ⚠️, 🎯, 🌍)
// ==============================================================================

const createCalloutNode = (name, icon, title, bgClass, borderClass, textClass) => {
  return Node.create({
    name: name,
    group: 'block',
    content: 'inline*',
    parseHTML() { return [{ tag: `div[data-type="${name}"]` }]; },
    renderHTML({ HTMLAttributes }) {
      return [
        'div', mergeAttributes(HTMLAttributes, { 'data-type': name, class: `${bgClass} border-l-4 ${borderClass} p-4 rounded-r-lg my-6 flex flex-col gap-2 relative shadow-sm` }), 
        ['span', { contenteditable: 'false', class: `${textClass} font-bold text-sm tracking-wide uppercase select-none flex items-center gap-2` }, `${icon} ${title}`],
        ['div', { class: 'text-slate-200 leading-relaxed m-0' }, 0]
      ];
    },
  });
};

const ConceptBox = createCalloutNode('conceptBox', '💡', 'Concept', 'bg-[#2563EB]/10', 'border-[#2563EB]', 'text-[#2563EB]');
const ImportantBox = createCalloutNode('importantBox', '⭐', 'Important Note', 'bg-amber-500/10', 'border-amber-500', 'text-amber-500');
const ExamTipBox = createCalloutNode('examTipBox', '🎯', 'Exam Tip', 'bg-purple-500/10', 'border-purple-500', 'text-purple-400');
const WarningBox = createCalloutNode('warningBox', '⚠️', 'Warning / Mistake', 'bg-red-500/10', 'border-red-500', 'text-red-500');
const RealLifeBox = createCalloutNode('realLifeBox', '🌍', 'Real Life Example', 'bg-emerald-500/10', 'border-emerald-500', 'text-emerald-500');


// ==============================================================================
// 🚀 PHASE 3: INTERACTIVE COMPONENTS (React Node Views)
// ==============================================================================

// 1. Accordion / Expandable Block
const AccordionComponent = ({ node, updateAttributes }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <NodeViewWrapper className="my-6 border border-[#1E293B] rounded-xl bg-[#0B0F19] overflow-hidden">
      <div onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between p-3.5 bg-[#07090E] cursor-pointer hover:bg-[#1E293B]/50 transition-colors select-none">
        <div className="flex items-center gap-2 text-slate-200 font-bold text-sm w-full">
          <Layers className="w-4 h-4 text-[#2563EB]" />
          <input type="text" value={node.attrs.title} onChange={(e) => updateAttributes({ title: e.target.value })} onClick={(e) => e.stopPropagation()} className="bg-transparent outline-none text-slate-200 w-full font-medium" placeholder="Accordion Title (Click to expand)" />
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      {isOpen && (
        <div className="p-4 text-slate-300 border-t border-[#1E293B] text-sm">
          <textarea value={node.attrs.content} onChange={(e) => updateAttributes({ content: e.target.value })} className="w-full bg-transparent outline-none text-slate-300 resize-none min-h-[80px]" placeholder="Write hidden expandable details here..." />
        </div>
      )}
    </NodeViewWrapper>
  );
};
const AccordionBlock = Node.create({
  name: 'accordionBlock', group: 'block', atom: true,
  addAttributes() { return { title: { default: 'বিস্তারিত ব্যাখ্যা' }, content: { default: '' } }; },
  parseHTML() { return [{ tag: 'div[data-type="accordion-block"]' }]; },
  renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'accordion-block' })]; },
  addNodeView() { return ReactNodeViewRenderer(AccordionComponent); },
});


// 2. Reveal Answer / Flashcard Block
const RevealAnswerComponent = ({ node, updateAttributes }) => {
  const [revealed, setRevealed] = useState(false);
  return (
    <NodeViewWrapper className="my-6 border border-[#1E293B] rounded-xl bg-[#0B0F19] p-4 shadow-sm">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider"><Eye className="w-4 h-4" /> Flashcard / Reveal Challenge</div>
        <input type="text" value={node.attrs.question} onChange={(e) => updateAttributes({ question: e.target.value })} className="bg-transparent font-semibold text-white outline-none border-b border-[#1E293B] pb-2 text-sm" placeholder="Type challenge question..." />
        {!revealed ? (
          <button onClick={() => setRevealed(true)} className="px-3 py-1.5 w-fit bg-[#2563EB]/20 hover:bg-[#2563EB] text-[#2563EB] hover:text-white rounded-lg text-xs font-bold transition-all">উত্তর দেখতে ক্লিক করুন</button>
        ) : (
          <div className="mt-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 text-sm">
            <textarea value={node.attrs.answer} onChange={(e) => updateAttributes({ answer: e.target.value })} className="w-full bg-transparent outline-none resize-none" placeholder="Type the answer here..." />
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};
const RevealAnswerBlock = Node.create({
  name: 'revealAnswerBlock', group: 'block', atom: true,
  addAttributes() { return { question: { default: '' }, answer: { default: '' } }; },
  parseHTML() { return [{ tag: 'div[data-type="reveal-answer"]' }]; },
  renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'reveal-answer' })]; },
  addNodeView() { return ReactNodeViewRenderer(RevealAnswerComponent); },
});


// 3. MCQ Question Block
const McqComponent = ({ node, updateAttributes }) => {
  return (
    <NodeViewWrapper className="my-6 border border-[#1E293B] rounded-xl bg-[#07090E] p-4 shadow-sm">
      <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-3"><CheckSquare className="w-4 h-4" /> Multiple Choice Question</div>
      <input type="text" value={node.attrs.question} onChange={(e) => updateAttributes({ question: e.target.value })} className="w-full bg-transparent font-semibold text-white outline-none border-b border-[#1E293B] pb-2 mb-3 text-sm" placeholder="Type MCQ Question here..." />
      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4].map((num) => (
          <div key={num} className={`flex items-center gap-3 p-2 rounded-lg border ${node.attrs.correctOption === num ? 'border-emerald-500 bg-emerald-500/10' : 'border-[#1E293B] bg-[#0B0F19]'}`}>
            <input type="radio" name={`mcq-${node.attrs.id}`} checked={node.attrs.correctOption === num} onChange={() => updateAttributes({ correctOption: num })} className="w-4 h-4 cursor-pointer" />
            <input type="text" value={node.attrs[`opt${num}`]} onChange={(e) => updateAttributes({ [`opt${num}`]: e.target.value })} className="w-full bg-transparent text-sm text-slate-300 outline-none" placeholder={`Option ${num}`} />
          </div>
        ))}
      </div>
    </NodeViewWrapper>
  );
};
const McqBlock = Node.create({
  name: 'mcqBlock', group: 'block', atom: true,
  addAttributes() {
    return {
      id: { default: () => Math.random().toString(36).substr(2, 9) },
      question: { default: '' },
      opt1: { default: '' }, opt2: { default: '' }, opt3: { default: '' }, opt4: { default: '' },
      correctOption: { default: 1 }
    };
  },
  parseHTML() { return [{ tag: 'div[data-type="mcq-block"]' }]; },
  renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'mcq-block' })]; },
  addNodeView() { return ReactNodeViewRenderer(McqComponent); },
});


// 4. Example & Solution Block
const ExampleSolutionComponent = ({ node, updateAttributes }) => {
  return (
    <NodeViewWrapper className="my-6 border border-[#1E293B] rounded-xl overflow-hidden shadow-sm">
      <div className="bg-[#1E293B] p-3 border-b border-[#0B0F19] flex items-center gap-2 font-bold text-slate-200 text-sm">
        <BookOpen className="w-4 h-4 text-[#38BDF8]" /> Example Problem
      </div>
      <div className="p-4 bg-[#07090E] flex flex-col gap-4">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Question</label>
          <textarea value={node.attrs.question} onChange={(e) => updateAttributes({ question: e.target.value })} className="w-full bg-[#0B0F19] text-white p-3 rounded-lg outline-none border border-[#1E293B] text-sm resize-none" placeholder="Type the math/physics question here..." />
        </div>
        <div>
          <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1 block">Solution & Explanation</label>
          <textarea value={node.attrs.solution} onChange={(e) => updateAttributes({ solution: e.target.value })} className="w-full bg-emerald-500/5 text-emerald-100 p-3 rounded-lg outline-none border border-emerald-500/30 text-sm min-h-[100px] resize-none" placeholder="Type the step-by-step solution here..." />
        </div>
      </div>
    </NodeViewWrapper>
  );
};
const ExampleSolutionBlock = Node.create({
  name: 'exampleSolutionBlock', group: 'block', atom: true,
  addAttributes() { return { question: { default: '' }, solution: { default: '' } }; },
  parseHTML() { return [{ tag: 'div[data-type="example-solution"]' }]; },
  renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'example-solution' })]; },
  addNodeView() { return ReactNodeViewRenderer(ExampleSolutionComponent); },
});


// 5. Tabs Block (Alternative Methods)
const TabsComponent = ({ node, updateAttributes }) => {
  const [activeTab, setActiveTab] = useState(1);
  return (
    <NodeViewWrapper className="my-6 border border-[#1E293B] rounded-xl overflow-hidden bg-[#07090E] shadow-sm">
      <div className="flex border-b border-[#1E293B] bg-[#0B0F19]">
        {[1, 2].map((num) => (
          <div key={num} onClick={() => setActiveTab(num)} className={`flex-1 p-3 text-center text-sm font-bold cursor-pointer transition-colors ${activeTab === num ? 'border-b-2 border-[#2563EB] text-[#2563EB] bg-[#07090E]' : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]/50'}`}>
            <input type="text" value={node.attrs[`tab${num}Title`]} onChange={(e) => updateAttributes({ [`tab${num}Title`]: e.target.value })} className="bg-transparent text-center outline-none w-full cursor-pointer" placeholder={`Tab ${num} Title`} />
          </div>
        ))}
      </div>
      <div className="p-4">
        <textarea value={node.attrs[`tab${activeTab}Content`]} onChange={(e) => updateAttributes({ [`tab${activeTab}Content`]: e.target.value })} className="w-full bg-transparent text-slate-300 text-sm outline-none resize-none min-h-[100px]" placeholder={`Write content for Tab ${activeTab} here... (e.g. Alternative Shortcut Method)`} />
      </div>
    </NodeViewWrapper>
  );
};
const TabsBlock = Node.create({
  name: 'tabsBlock', group: 'block', atom: true,
  addAttributes() { return { tab1Title: { default: 'Main Method' }, tab1Content: { default: '' }, tab2Title: { default: 'Shortcut Method' }, tab2Content: { default: '' } }; },
  parseHTML() { return [{ tag: 'div[data-type="tabs-block"]' }]; },
  renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'tabs-block' })]; },
  addNodeView() { return ReactNodeViewRenderer(TabsComponent); },
});


// ==============================================================================
// 🖥️ MAIN LEARNING EDITOR COMPONENT
// ==============================================================================

export default function LearningEditor({ initialContent, onUpdate }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        underline: false, 
        bulletList: { HTMLAttributes: { class: 'list-disc ml-6 space-y-2 text-slate-300 marker:text-slate-500' } },
        orderedList: { HTMLAttributes: { class: 'list-decimal ml-6 space-y-2 text-slate-300 marker:text-slate-500 font-medium' } },
        listItem: { HTMLAttributes: { class: 'pl-2 leading-relaxed whitespace-pre-wrap' } },
        heading: { HTMLAttributes: { class: 'text-white font-black tracking-tight mt-8 mb-4 whitespace-pre-wrap' } },
        paragraph: { HTMLAttributes: { class: 'leading-relaxed text-slate-300 mb-4 whitespace-pre-wrap' } },
        codeBlock: { HTMLAttributes: { class: 'bg-[#07090E] border border-[#1E293B] rounded-lg p-4 font-mono text-sm text-[#38BDF8] my-6 overflow-x-auto shadow-inner' } },
        code: { HTMLAttributes: { class: 'bg-[#1E293B] text-[#F472B6] px-1.5 py-0.5 rounded text-[13px] font-mono' } }
      }),
      Underline,
      Image.configure({ HTMLAttributes: { class: 'max-w-full rounded-xl my-6 border border-[#1E293B] mx-auto shadow-lg' } }), 
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle, Color, Highlight.configure({ multicolor: true }), FontFamily, 
      Table.configure({ resizable: true, HTMLAttributes: { class: 'w-full border-collapse border border-[#1E293B] my-6 rounded-lg overflow-hidden text-sm' } }),
      TableRow.configure({ HTMLAttributes: { class: 'border-b border-[#1E293B] hover:bg-[#0B0F19]/50 transition-colors' } }),
      TableHeader.configure({ HTMLAttributes: { class: 'border border-[#1E293B] bg-[#0B0F19] text-white font-bold p-3 text-left' } }),
      TableCell.configure({ HTMLAttributes: { class: 'border border-[#1E293B] p-3 text-slate-300' } }),

      // 🚀 Registering All Extensions
      MathNode,
      ChartNode, 
      ConceptBox,
      ImportantBox,
      ExamTipBox,
      WarningBox,
      RealLifeBox,
      AccordionBlock,
      RevealAnswerBlock,
      McqBlock,
      ExampleSolutionBlock,
      TabsBlock,
    ],
    content: initialContent || { type: 'doc', content: [] },
    editorProps: {
      attributes: {
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
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}