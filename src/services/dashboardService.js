import { supabase } from '../config/supabase';

export const dashboardService = {
  getQuickStats: async () => {
    try {
      // Promise.all ব্যবহার করে একসাথে ৪টি টেবিলের Count আনা হচ্ছে (খুবই ফাস্ট)
      const [subjects, chapters, topics, questions] = await Promise.all([
        supabase.from('subjects').select('*', { count: 'exact', head: true }),
        supabase.from('chapters').select('*', { count: 'exact', head: true }),
        supabase.from('topics').select('*', { count: 'exact', head: true }),
        supabase.from('questions').select('*', { count: 'exact', head: true }),
      ]);

      return {
        subjectsCount: subjects.count || 0,
        chaptersCount: chapters.count || 0,
        topicsCount: topics.count || 0,
        questionsCount: questions.count || 0,
      };
    } catch (error) {
      console.error("Dashboard Stats Error:", error);
      return { subjectsCount: 0, chaptersCount: 0, topicsCount: 0, questionsCount: 0 };
    }
  }
};