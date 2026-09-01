import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const MathNodeComponent = ({ node, updateAttributes, selected }) => {
  const { latex } = node.attrs;

  return (
    <NodeViewWrapper className="my-6 relative group transition-all">
      <div className={`p-4 rounded-xl border ${selected ? 'border-emerald-500 ring-1 ring-emerald-500/50 bg-[#0B0F19]' : 'border-[#1E293B] bg-[#07090E]'}`}>
         {/* Admin Input Field */}
         <div className="flex flex-col gap-3">
           <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">LaTeX Equation</span>
           <input
             type="text"
             value={latex}
             onChange={e => updateAttributes({ latex: e.target.value })}
             className="w-full bg-[#0B0F19] text-emerald-300 font-mono text-xs p-3 rounded-lg outline-none border border-[#1E293B] focus:border-emerald-500/50 transition-colors placeholder:text-slate-600"
             placeholder="Type equation e.g., \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}"
           />

           {/* Live KaTeX Render (Textbook Quality) */}
           <div
             className="py-4 overflow-x-auto flex justify-center text-lg text-white"
             dangerouslySetInnerHTML={{
               __html: katex.renderToString(latex || '\\text{Type equation above}', {
                 throwOnError: false,
                 displayMode: true, // Forces centered, textbook-style rendering
               })
             }}
           />
         </div>
      </div>
    </NodeViewWrapper>
  );
};

export default Node.create({
  name: 'mathNode',
  group: 'block',
  atom: true,
  addAttributes() {
    return { latex: { default: '' } };
  },
  parseHTML() {
    return [{ tag: 'div[data-math]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-math': '' })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(MathNodeComponent);
  },
});