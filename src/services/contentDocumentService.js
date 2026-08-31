import { supabase } from '../config/supabase';

export const contentDocumentService = {
  // Get document by Topic ID
  getDocument: async (topicId) => {
    const { data, error } = await supabase
      .from('topic_documents')
      .select('*')
      .eq('topic_id', topicId)
      .maybeSingle(); 
      
    if (error) throw error;
    return data;
  },

  // Upsert (Create or Update) Document smoothly without Race Conditions
  saveDocument: async (topicId, contentJson, userId) => {
    // 🚀 FIX: Using 'upsert' with 'onConflict' solves the race condition
    // caused by fast autosaves. It also saves an extra database read call!
    const { data, error } = await supabase
      .from('topic_documents')
      .upsert(
        {
          topic_id: topicId,
          content: contentJson,
          status: 'draft', 
          created_by: userId || null, // 🚀 FIX: Prevent 'undefined' error
          updated_at: new Date().toISOString()
        },
        { 
          onConflict: 'topic_id' // Uses the UNIQUE constraint to update existing records
        }
      )
      .select();

    if (error) throw error;
    return data[0];
  },

  // Publish Document
  publishDocument: async (documentId) => {
    const { error } = await supabase
      .from('topic_documents')
      .update({ 
        status: 'published',
        published_at: new Date().toISOString()
      })
      .eq('id', documentId);
      
    if (error) throw error;
    return true;
  }
};