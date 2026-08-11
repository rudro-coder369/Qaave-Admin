import { supabase } from '../config/supabase';

export const dashboardService = {
  getQuickStats: async () => {
    try {
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
  },

  getDetailedStats: async () => {
    try {
      let todayStr = '';
      try {
        const timeRes = await fetch('https://worldtimeapi.org/api/timezone/Asia/Dhaka');
        const timeData = await timeRes.json();
        todayStr = timeData.datetime.split('T')[0];
      } catch (e) {
        console.warn("Time API failed, using fallback device time");
        todayStr = new Date().toISOString().split('T')[0]; 
      }

      const [subjectsRes, chaptersRes, topicsRes, totalQuestionsRes] = await Promise.all([
        supabase.from('subjects').select('id, name'),
        supabase.from('chapters').select('*', { count: 'exact', head: true }),
        supabase.from('topics').select('*', { count: 'exact', head: true }),
        supabase.from('questions').select('*', { count: 'exact', head: true })
      ]);

      const subjects = subjectsRes.data || [];
      const totalQuestionsCount = totalQuestionsRes.count || 0;

      const { count: todaysCount } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${todayStr}T00:00:00`)
        .lte('created_at', `${todayStr}T23:59:59`);

      // 🚀 আপডেট: টোটাল কাউন্টের সাথে আজকের কাউন্টও বের করা হচ্ছে
      const subjectPromises = subjects.map(async (sub) => {
        const { count: totalCount } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('subject_id', sub.id);
          
        const { count: todayCount } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('subject_id', sub.id)
          .gte('created_at', `${todayStr}T00:00:00`)
          .lte('created_at', `${todayStr}T23:59:59`);
        
        return {
          id: sub.id,
          name: sub.name,
          count: totalCount || 0,
          todayCount: todayCount || 0
        };
      });

      const subjectWiseStatsUnsorted = await Promise.all(subjectPromises);
      const subjectWiseStats = subjectWiseStatsUnsorted.sort((a, b) => b.count - a.count);

      return {
        subjectsCount: subjects.length,
        chaptersCount: chaptersRes.count || 0,
        topicsCount: topicsRes.count || 0,
        questionsCount: totalQuestionsCount,
        subjectWise: subjectWiseStats,
        todaysCount: todaysCount || 0,
        currentDate: todayStr
      };
    } catch (error) {
      console.error("Dashboard Detailed Stats Error:", error);
      return null;
    }
  }
};