import { supabase } from '../config/supabase';

export const contentService = {
  // Get all blocks for a specific content topic
  getBlocks: async (contentTopicId) => {
    const { data, error } = await supabase
      .from('topic_blocks')
      .select('*')
      .eq('content_topic_id', contentTopicId) // 👈 FIXED
      .order('block_order', { ascending: true });
      
    if (error) throw error;
    return data;
  },

  // Add a new block
  addBlock: async (contentTopicId, blockOrder, blockType, textContent, metadata = {}) => {
    const cleanMetadata = (metadata && Object.keys(metadata).length > 0) ? metadata : null;
    const wordCount = textContent ? textContent.split(' ').length : 0;
    const dynamicTime = textContent ? Math.max(30, Math.ceil((wordCount / 100) * 60)) : 60;

    const { data, error } = await supabase
      .from('topic_blocks')
      .insert([{
        content_topic_id: contentTopicId, // 👈 FIXED
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
    const { error } = await supabase.from('topic_blocks').delete().eq('id', blockId);
    if (error) throw error;
    return true;
  },

  // 🚀 NEW: Update block orders for Move Up / Move Down
  updateBlockOrders: async (blocksToUpdate) => {
    const promises = blocksToUpdate.map(b => 
      supabase.from('topic_blocks').update({ block_order: b.block_order }).eq('id', b.id)
    );
    await Promise.all(promises);
    return true;
  }
};