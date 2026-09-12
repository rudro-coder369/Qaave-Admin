import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Settings, BarChart2, LineChart as LineIcon } from 'lucide-react';

const ChartComponent = ({ node, updateAttributes }) => {
  const [isEditing, setIsEditing] = useState(false);
  
  // Parse data from node attributes
  const chartType = node.attrs.chartType;
  const title = node.attrs.title;
  let data = [];
  try {
    data = JSON.parse(node.attrs.chartData);
  } catch (e) {
    data = [{ name: 'A', value: 100 }, { name: 'B', value: 200 }];
  }

  const handleDataChange = (e) => {
    updateAttributes({ chartData: e.target.value });
  };

  return (
    <NodeViewWrapper className="my-6 border border-[#1E293B] rounded-xl bg-[#0B0F19] overflow-hidden shadow-lg">
      {/* Chart Header & Controls */}
      <div className="flex justify-between items-center bg-[#07090E] p-3 border-b border-[#1E293B]">
        <div className="flex gap-2">
          <button 
            onClick={() => updateAttributes({ chartType: 'bar' })}
            className={`p-1.5 rounded ${chartType === 'bar' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:bg-[#1E293B]'}`}
          >
            <BarChart2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => updateAttributes({ chartType: 'line' })}
            className={`p-1.5 rounded ${chartType === 'line' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:bg-[#1E293B]'}`}
          >
            <LineIcon className="w-4 h-4" />
          </button>
        </div>
        <input 
          type="text" 
          value={title}
          onChange={(e) => updateAttributes({ title: e.target.value })}
          className="bg-transparent text-slate-200 text-sm font-bold text-center outline-none w-1/2"
          placeholder="Chart Title"
        />
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className={`p-1.5 rounded ${isEditing ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:bg-[#1E293B]'}`}
          title="Edit Data"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Editor / Preview Area */}
      <div className="p-4">
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <label className="text-xs text-slate-400 font-bold uppercase tracking-widest">Chart Data (JSON Format)</label>
            <textarea
              className="w-full h-40 bg-[#07090E] text-[#2563EB] font-mono text-xs p-3 rounded-lg border border-[#1E293B] outline-none focus:border-[#2563EB]"
              value={node.attrs.chartData}
              onChange={handleDataChange}
              placeholder='[{"name": "Jan", "value": 400}, {"name": "Feb", "value": 300}]'
            />
          </div>
        ) : (
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                  <YAxis stroke="#64748B" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#1E293B', color: '#F8FAFC' }} />
                  <Line type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              ) : (
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                  <YAxis stroke="#64748B" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#1E293B', color: '#F8FAFC' }} />
                  <Bar dataKey="value" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export default Node.create({
  name: 'chartNode',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      chartType: { default: 'bar' },
      chartData: { default: '[\n  {"name": "A", "value": 400},\n  {"name": "B", "value": 300},\n  {"name": "C", "value": 500}\n]' },
      title: { default: 'New Chart' }
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="chart-node"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'chart-node' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChartComponent);
  },
});