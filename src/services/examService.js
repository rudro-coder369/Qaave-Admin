import { supabase } from '../config/supabase';

export const examService = {
  // 📅 ভবিষ্যতের এবং অতীতের শিডিউল করা এক্সামগুলো দেখা
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

  // 🎲 UI-তে প্রিভিউ এবং শাফেল করার জন্য প্রশ্নাবলি (Pool) ফেচ করা (মাল্টিপল চ্যাপ্টার সাপোর্টেড)
  generateQuestionPool: async (chapterIds, limit) => {
    const { data, error } = await supabase
      .from('questions')
      .select(`
        id, 
        question_text, 
        q_type, 
        difficulty, 
        importance,
        mcq_options (*)
      `)
      .in('chapter_id', chapterIds) // 👈 এখানে Array of IDs রিসিভ করবে
      .eq('q_type', 'mcq')
      .limit(150); 

    if (error) throw error;

    const shuffled = data.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, limit); 
  },

  // 🚀 নতুন লাইভ এক্সাম শিডিউল করা (Added syllabusDetails)
  scheduleLiveExam: async (title, runAt, durationMin, targetClass, targetBatchYear, chapterIds, finalQuestionIds, syllabusDetails) => {
    const totalQuestions = finalQuestionIds ? finalQuestionIds.length : 0;

    // ১. প্রথমে মূল Exam তৈরি করা (Syllabus সহ)
    const { data: examData, error: examError } = await supabase
      .from('exams')
      .insert([{
        title: title,
        exam_type: 'live',
        duration_minutes: durationMin,
        total_questions: totalQuestions,
        target_class: targetClass,           
        target_batch_year: targetBatchYear,  
        syllabus_details: syllabusDetails, // 👈 রুটিনের জন্য JSONB তে সেভ হবে
        status: 'published'
      }])
      .select();
      
    if (examError) throw examError;
    const examId = examData[0].id;

    // ২. exam_questions টেবিলে নির্দিষ্ট প্রশ্নগুলো সেভ করা
    if(finalQuestionIds && finalQuestionIds.length > 0) {
      const examQuestionsData = finalQuestionIds.map((qId, index) => ({
        exam_id: examId,
        question_id: qId,
        order_no: index + 1 
      }));
      const { error: eqError } = await supabase.from('exam_questions').insert(examQuestionsData);
      if (eqError) throw eqError;
    }

    // ৩. Scheduler টেবিলে এন্ট্রি দেওয়া
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

    // ৪. কোন কোন চ্যাপ্টার থেকে প্রশ্ন হয়েছে সেটা ম্যাপ করা (Multiple Insert)
    if(chapterIds && chapterIds.length > 0) {
      const chapterInserts = chapterIds.map(chapId => ({
        scheduler_id: schedulerId,
        chapter_id: chapId,
        is_mandatory: true
      }));

      const { error: chapError } = await supabase.from('scheduler_chapters').insert(chapterInserts);
      if (chapError) throw chapError;
    }

    return scheduleData[0];
  },

  // 🗑️ লাইভ এক্সাম ডিলিট করা
  deleteScheduledExam: async (schedulerId, examId) => {
    await supabase.from('scheduler_chapters').delete().eq('scheduler_id', schedulerId);

    const { data: schedData, error: schedError } = await supabase
      .from('live_exam_scheduler')
      .delete()
      .eq('id', schedulerId)
      .select();
      
    if (schedError) throw schedError;
    if (!schedData || schedData.length === 0) throw new Error("Delete failed: Record not found.");

    if (examId) {
      await supabase.from('exam_questions').delete().eq('exam_id', examId);
      const { error: examError } = await supabase.from('exams').delete().eq('id', examId);
      if (examError) throw examError;
    }
    return true;
  },

  // ✏️ লাইভ এক্সাম এডিট/আপডেট করা
  updateScheduledExam: async (schedulerId, examId, title, runAt, durationMin, targetClass, targetBatchYear, chapterIds, finalQuestionIds, syllabusDetails) => {
    const examUpdatePayload = {
      title: title,
      duration_minutes: durationMin,
      target_class: targetClass,
      target_batch_year: targetBatchYear,
      syllabus_details: syllabusDetails // 👈 Update syllabus
    };
    if (finalQuestionIds && finalQuestionIds.length > 0) {
      examUpdatePayload.total_questions = finalQuestionIds.length;
    }

    const { error: examError } = await supabase.from('exams').update(examUpdatePayload).eq('id', examId);
    if (examError) throw examError;

    const { error: schedError } = await supabase.from('live_exam_scheduler').update({ run_at: runAt }).eq('id', schedulerId);
    if (schedError) throw schedError;

    if (finalQuestionIds && finalQuestionIds.length > 0) {
      await supabase.from('exam_questions').delete().eq('exam_id', examId);
      const examQuestionsData = finalQuestionIds.map((qId, index) => ({
        exam_id: examId, question_id: qId, order_no: index + 1
      }));
      const { error: eqError } = await supabase.from('exam_questions').insert(examQuestionsData);
      if (eqError) throw eqError;
    }

    if (chapterIds && chapterIds.length > 0) {
      await supabase.from('scheduler_chapters').delete().eq('scheduler_id', schedulerId);
      const chapterInserts = chapterIds.map(chapId => ({
        scheduler_id: schedulerId, chapter_id: chapId, is_mandatory: true
      }));
      const { error: chapError } = await supabase.from('scheduler_chapters').insert(chapterInserts);
      if (chapError) throw chapError;
    }
    return true;
  }
};