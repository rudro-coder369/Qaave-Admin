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

  deleteSubject: async (id) => {
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // ================= CHAPTERS =================
  getChapters: async (subjectId) => {
    const { data, error } = await supabase.from('chapters').select('*').eq('subject_id', subjectId).order('chapter_number', { ascending: true });
    if (error) throw error;
    return data;
  },

  addChapter: async (subjectId, chapterNumber, title) => {
    const slug = generateSlug(title) + '-' + Date.now().toString().slice(-4);
    const { data, error } = await supabase.from('chapters').insert([{
      subject_id: subjectId, chapter_number: chapterNumber, title, slug, status: 'published'
    }]).select();
    if (error) throw error;
    return data[0];
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

  deleteTopic: async (id) => {
    const { error } = await supabase.from('topics').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};