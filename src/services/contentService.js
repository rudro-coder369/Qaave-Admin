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

  // Add a new block (with Safe Metadata & Dynamic Time Handler)
  addBlock: async (topicId, blockOrder, blockType, textContent, metadata = {}) => {
    // ফাকা বা নাল মেটাডাটা হ্যান্ডেল করার জন্য সেফটি চেক
    const cleanMetadata = (metadata && Object.keys(metadata).length > 0) ? metadata : null;

    // 🚀 Pro-Tip: টেক্সটের সাইজ অনুযায়ী ডাইনামিক রিডিং টাইম ক্যালকুলেট করা (প্রতি ১০০ শব্দে ১ মিনিট)
    const wordCount = textContent ? textContent.split(' ').length : 0;
    const dynamicTime = textContent ? Math.max(30, Math.ceil((wordCount / 100) * 60)) : 60; // মিনিমাম ৩০ সেকেন্ড

    const { data, error } = await supabase
      .from('topic_blocks')
      .insert([{
        topic_id: topicId,
        block_order: blockOrder,
        block_type: blockType,
        text_content: textContent || null,
        metadata: cleanMetadata,
        estimated_time_sec: dynamicTime 
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
  },

  // 🚀 Future-Proofing: Update an existing block
  updateBlock: async (blockId, textContent, metadata = {}) => {
    const cleanMetadata = (metadata && Object.keys(metadata).length > 0) ? metadata : null;
    const wordCount = textContent ? textContent.split(' ').length : 0;
    const dynamicTime = textContent ? Math.max(30, Math.ceil((wordCount / 100) * 60)) : 60;

    const { data, error } = await supabase
      .from('topic_blocks')
      .update({
        text_content: textContent || null,
        metadata: cleanMetadata,
        estimated_time_sec: dynamicTime,
        updated_at: new Date().toISOString()
      })
      .eq('id', blockId)
      .select();
      
    if (error) throw error;
    return data[0];
  }
};