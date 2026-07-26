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

  // 🚀 Update Subject
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
      .select(); // 🚀 Removed .single()
      
    if (error) throw error;
    return data[0]; // 🚀 Returning first object
  },

  deleteSubject: async (id) => {
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // ================= CHAPTERS =================
  getChapters: async (subjectId) => {
    const { data, error } = await supabase.from('chapters')
      .select('*')
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },

  addChapter: async ({ subject_id, chapter_label, title, section_name, parent_chapter_id }) => {
    const slug = generateSlug(title) + '-' + Date.now().toString().slice(-4);
    
    const parsedNumber = parseInt(chapter_label.replace(/[^0-9]/g, '')) || 0;

    const { data, error } = await supabase.from('chapters').insert([{
      subject_id: subject_id,
      chapter_number: parsedNumber,       
      chapter_label: chapter_label,       
      title: title,
      slug: slug,
      section_name: section_name || null, 
      parent_chapter_id: parent_chapter_id || null, 
      status: 'published'
    }]).select();
    
    if (error) throw error;
    return data[0];
  },

  // 🚀 Update Chapter
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
      .select(); // 🚀 Removed .single()
      
    if (error) throw error;
    return data[0]; // 🚀 Returning first object
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

  // 🚀 Update Topic
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
      .select(); // 🚀 Removed .single()
      
    if (error) throw error;
    return data[0]; // 🚀 Returning first object
  },

  deleteTopic: async (id) => {
    const { error } = await supabase.from('topics').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};