import { supabase } from '../config/supabase';

// Helper function to auto-generate slugs (e.g., "Physics 1st Paper" -> "physics-1st-paper")
const generateSlug = (text) => {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
};

export const taxonomyApi = {
  // ================= SUBJECTS =================
  getSubjects: async () => {
    const { data, error } = await supabase.from('subjects').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },
  
  addSubject: async (name, classLevel, boardGroup) => {
    const slug = generateSlug(name) + '-' + Date.now().toString().slice(-4); // Unique slug
    const { data, error } = await supabase.from('subjects').insert([{
      name, slug, class_level: classLevel, board_group: boardGroup, status: 'published'
    }]).select();
    if (error) throw error;
    return data[0];
  },

  // 🚀 Update Subject Added
  updateSubject: async (id, name, classLevel, boardGroup) => {
    const { data, error } = await supabase
      .from('subjects')
      .update({ 
        name, 
        class_level: classLevel, 
        board_group: boardGroup,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  deleteSubject: async (id) => {
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // ================= CHAPTERS =================
  getChapters: async (subjectId) => {
    // 🚀 Update: Ordered by created_at so main chapters and sub-chapters stay in logical insertion sequence
    const { data, error } = await supabase.from('chapters')
      .select('*')
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },

  // 🚀 Update: Now accepts an object to match the frontend and includes the new columns
  addChapter: async ({ subject_id, chapter_label, title, section_name, parent_chapter_id }) => {
    const slug = generateSlug(title) + '-' + Date.now().toString().slice(-4);
    
    // 🚀 Fallback Logic: Extract number from chapter_label (e.g. "11.1" -> 11, "গল্প ১" -> 1) to satisfy old chapter_number INT NOT NULL constraint
    const parsedNumber = parseInt(chapter_label.replace(/[^0-9]/g, '')) || 0;

    const { data, error } = await supabase.from('chapters').insert([{
      subject_id: subject_id,
      chapter_number: parsedNumber,       // Legacy NOT NULL field
      chapter_label: chapter_label,       // New field (e.g. 11.1, গল্প ১)
      title: title,
      slug: slug,
      section_name: section_name || null, // New field
      parent_chapter_id: parent_chapter_id || null, // New field
      status: 'published'
    }]).select();
    
    if (error) throw error;
    return data[0];
  },

  // 🚀 Update Chapter Added
  updateChapter: async (id, { chapter_label, title, section_name, parent_chapter_id }) => {
    const parsedNumber = parseInt(chapter_label.replace(/[^0-9]/g, '')) || 0;
    
    const { data, error } = await supabase
      .from('chapters')
      .update({ 
        chapter_number: parsedNumber,
        chapter_label: chapter_label,
        title: title,
        section_name: section_name || null,
        parent_chapter_id: parent_chapter_id || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  deleteChapter: async (id) => {
    const { error } = await supabase.from('chapters').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // ================= TOPICS =================
  getTopics: async (chapterId) => {
    const { data, error } = await supabase.from('topics').select('*').eq('chapter_id', chapterId).order('topic_order', { ascending: true });
    if (error) throw error;
    return data;
  },

  addTopic: async (chapterId, topicOrder, title, importance) => {
    const slug = generateSlug(title) + '-' + Date.now().toString().slice(-4);
    const { data, error } = await supabase.from('topics').insert([{
      chapter_id: chapterId, topic_order: topicOrder, title, slug, importance_stars: importance, status: 'published'
    }]).select();
    if (error) throw error;
    return data[0];
  },

  // 🚀 Update Topic Added
  updateTopic: async (id, topicOrder, title, importance) => {
    const { data, error } = await supabase
      .from('topics')
      .update({ 
        topic_order: topicOrder, 
        title: title, 
        importance_stars: importance,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  deleteTopic: async (id) => {
    const { error } = await supabase.from('topics').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};