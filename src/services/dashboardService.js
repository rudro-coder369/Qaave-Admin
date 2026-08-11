import { supabase } from '../config/supabase';

// 🚀 Helper: Centralized Payload Validation
const validateQuestionPayload = (payload) => {
  if (!payload.text || !payload.text.trim()) {
    throw new Error("Validation Error: Question stem/text cannot be empty.");
  }
  
  if (payload.qType === 'mcq') {
    if (!payload.optionsArray || payload.optionsArray.length < 2) {
      throw new Error("Validation Error: MCQ must have at least 2 options.");
    }
    const correctCount = payload.optionsArray.filter(o => o.isCorrect).length;
    if (correctCount !== 1) {
      throw new Error(`Validation Error: MCQ must have exactly 1 correct option (Found: ${correctCount}).`);
    }
  }
  
  if (payload.qType === 'cq') {
    if (!payload.cqParts || payload.cqParts.length === 0) {
      throw new Error("Validation Error: CQ must have question parts.");
    }
    if (payload.cqParts.some(p => !p.qText || !p.qText.trim())) {
      throw new Error("Validation Error: All CQ parts must contain question text.");
    }
  }
};

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
        // 🔥 FIXED: Convert to exact Bangladesh Timezone (Asia/Dhaka)
        const timeRes = await fetch('https://worldtimeapi.org/api/timezone/Asia/Dhaka');
        const timeData = await timeRes.json();
        
        // timeData.datetime looks like "2026-08-12T00:45:00.123456+06:00"
        // We parse it into a Date object
        const bdDate = new Date(timeData.datetime);
        
        // Convert to YYYY-MM-DD specifically for Asia/Dhaka
        const year = bdDate.toLocaleString("en-US", { timeZone: "Asia/Dhaka", year: "numeric" });
        const month = bdDate.toLocaleString("en-US", { timeZone: "Asia/Dhaka", month: "2-digit" });
        const day = bdDate.toLocaleString("en-US", { timeZone: "Asia/Dhaka", day: "2-digit" });
        
        todayStr = `${year}-${month}-${day}`;
      } catch (e) {
        console.warn("Time API failed, using fallback device time");
        const fallbackDate = new Date();
        const year = fallbackDate.toLocaleString("en-US", { timeZone: "Asia/Dhaka", year: "numeric" });
        const month = fallbackDate.toLocaleString("en-US", { timeZone: "Asia/Dhaka", month: "2-digit" });
        const day = fallbackDate.toLocaleString("en-US", { timeZone: "Asia/Dhaka", day: "2-digit" });
        todayStr = `${year}-${month}-${day}`;
      }

      const [subjectsRes, chaptersRes, topicsRes, totalQuestionsRes] = await Promise.all([
        supabase.from('subjects').select('id, name'),
        supabase.from('chapters').select('*', { count: 'exact', head: true }),
        supabase.from('topics').select('*', { count: 'exact', head: true }),
        supabase.from('questions').select('*', { count: 'exact', head: true })
      ]);

      const subjects = subjectsRes.data || [];
      const totalQuestionsCount = totalQuestionsRes.count || 0;

      // 🚀 Query logic remains the same, but todayStr is now accurate
      const { count: todaysCount } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${todayStr}T00:00:00+06:00`) // Ensures comparison in BD time
        .lte('created_at', `${todayStr}T23:59:59+06:00`);

      const subjectPromises = subjects.map(async (sub) => {
        const { count: totalCount } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('subject_id', sub.id);
          
        const { count: todayCount } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('subject_id', sub.id)
          .gte('created_at', `${todayStr}T00:00:00+06:00`)
          .lte('created_at', `${todayStr}T23:59:59+06:00`);
        
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