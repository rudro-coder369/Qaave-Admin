import { supabase } from '../config/supabase';

export const examService = {
  // ভবিষ্যতের এবং অতীতের শিডিউল করা এক্সামগুলো দেখা
  getScheduledExams: async () => {
    const { data, error } = await supabase
      .from('live_exam_scheduler')
      .select(`
        *,
        exams (*)
      `)
      .order('run_at', { ascending: true });
      
    if (error) throw error;
    return data;
  },

  // নতুন লাইভ এক্সাম শিডিউল করা
  scheduleLiveExam: async (title, runAt, durationMin, totalQuestions, chapterIds) => {
    // ১. প্রথমে মূল Exam তৈরি করা
    const { data: examData, error: examError } = await supabase
      .from('exams')
      .insert([{
        title: title,
        exam_type: 'live',
        duration_minutes: durationMin,
        total_questions: totalQuestions,
        status: 'published'
      }])
      .select();
      
    if (examError) throw examError;
    const examId = examData[0].id;

    // ২. এবার Scheduler টেবিলে এন্ট্রি দেওয়া
    const { data: scheduleData, error: scheduleError } = await supabase
      .from('live_exam_scheduler')
      .insert([{
        run_at: runAt,
        status: 'pending',
        generated_exam_id: examId
      }])
      .select();
      
    if (scheduleError) throw scheduleError;
    const schedulerId = scheduleData[0].id;

    // ৩. কোন কোন চ্যাপ্টার থেকে প্রশ্ন হবে সেটা ম্যাপ করা
    const chapterInserts = chapterIds.map(chapId => ({
      scheduler_id: schedulerId,
      chapter_id: chapId,
      is_mandatory: true
    }));

    const { error: chapError } = await supabase
      .from('scheduler_chapters')
      .insert(chapterInserts);
      
    if (chapError) throw chapError;

    return scheduleData[0];
  }
};