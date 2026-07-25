import { supabase } from '../config/supabase';

export const contentService = {
  // Get all blocks for a specific topic
  getBlocks: async (topicId) => {
    const { data, error } = await supabase
      .from('topic_blocks')
      .select('*')
      .eq('topic_id', topicId)
      .order('block_order', { ascending: true });
      
    if (error) throw error;
    return data;
  },

  // Add a new block (with Safe Metadata Handler)
  addBlock: async (topicId, blockOrder, blockType, textContent, metadata = {}) => {
    // ফাকা বা নাল মেটাডাটা হ্যান্ডেল করার জন্য সেফটি চেক
    const cleanMetadata = (metadata && Object.keys(metadata).length > 0) ? metadata : null;

    const { data, error } = await supabase
      .from('topic_blocks')
      .insert([{
        topic_id: topicId,
        block_order: blockOrder,
        block_type: blockType,
        text_content: textContent || null,
        metadata: cleanMetadata,
        estimated_time_sec: 60 // ডিফল্ট ১ মিনিট
      }])
      .select();
      
    if (error) throw error;
    return data[0];
  },

  // Delete a block
  deleteBlock: async (blockId) => {
    const { error } = await supabase
      .from('topic_blocks')
      .delete()
      .eq('id', blockId);
      
    if (error) throw error;
    return true;
  }
};