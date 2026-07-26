import { supabase } from '../config/supabase';

export const questionService = {
  // 🚀 ১. Get Boards
  getBoards: async () => {
    const { data, error } = await supabase.from('boards').select('*').order('name');
    if (error) throw error;
    return data;
  },

  // 🚀 ২. Get Questions with History & Relationships
  getQuestions: async (chapterId, topicId = null, examMaterialOnly = false, contentMaterialOnly = false) => {
    let query = supabase
      .from('questions')
      .select('*, mcq_options(*), cq_parts(*), question_board_history(year, boards(id, name, short_name))')
      .eq('chapter_id', chapterId)
      .order('created_at', { ascending: false });

    // UX FIX: টপিক সিলেক্ট করা থাকলে শুধু ওই টপিকের প্রশ্ন দেখাবে, 
    // আর সিলেক্ট করা না থাকলে ওই চ্যাপ্টারের "সব" প্রশ্ন দেখাবে।
    if (topicId !== null && topicId !== '') {
      query = query.eq('topic_id', topicId);
    }

    // ফিল্টার অপশনস
    if (examMaterialOnly) query = query.eq('is_exam_material', true);
    if (contentMaterialOnly) query = query.eq('is_content_material', true);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // 🚀 ৩. Add Question
  addQuestion: async ({ 
    subjectId, chapterId, topicId, qType, text, imagePath, 
    explanation, solution, importance, isExamMaterial, isContentMaterial, 
    optionsArray, cqParts, boardTags 
  }) => {
    
    // ১. Main Question Insert
    const { data: qData, error: qError } = await supabase.from('questions').insert([{
      subject_id: subjectId, 
      chapter_id: chapterId, 
      topic_id: (topicId !== null && topicId !== '') ? topicId : null, 
      q_type: qType, 
      question_text: text, 
      question_image_path: imagePath || null,
      explanation, 
      solution, 
      importance, 
      is_exam_material: isExamMaterial,
      is_content_material: isContentMaterial,
      status: 'published'
    }]).select();
    
    if (qError) throw qError;
    const questionId = qData[0].id;

    // ৪. Pseudo-Transaction: চাইল্ড ডেটা ইনসার্ট করার সময় Error Handling
    try {
      // Options Insert (If MCQ)
      if (qType === 'mcq' && optionsArray?.length > 0) {
        const opts = optionsArray.map((opt, i) => ({
          question_id: questionId, option_order: i + 1, option_text: opt.text, is_correct: opt.isCorrect
        }));
        const { error: optError } = await supabase.from('mcq_options').insert(opts);
        if (optError) throw optError; // Error Check
      }

      // CQ Parts Insert
      if (qType === 'cq' && cqParts?.length > 0) {
        const parts = cqParts.map(p => ({
          question_id: questionId, label: p.label, question_text: p.qText, answer_text: p.aText
        }));
        const { error: cqError } = await supabase.from('cq_parts').insert(parts);
        if (cqError) throw cqError; // Error Check
      }

      // Multiple Board History Insert
      if (boardTags && boardTags.length > 0) {
        // 🛠️ FIX: Универсальный বোর্ড আইডি ফাইন্ডার
        const validBoards = boardTags.map(b => ({
          board_id: b.boardId || b.board_id || b.boards?.id,
          year: parseInt(b.year)
        })).filter(b => b.board_id && !isNaN(b.year));

        if (validBoards.length > 0) {
          const boardInserts = validBoards.map(b => ({
            question_id: questionId, 
            board_id: b.board_id, 
            year: b.year
          }));
          const { error: boardError } = await supabase.from('question_board_history').insert(boardInserts);
          if (boardError) throw boardError; // Error Check
        }
      }

      return qData[0];

    } catch (insertionError) {
      // 🛑 ROLLBACK: যদি MCQ/CQ/Board সেভ হতে গিয়ে ফেইল করে, তবে মেইন প্রশ্নটাও ডিলিট করে দাও।
      await supabase.from('questions').delete().eq('id', questionId);
      throw new Error(`Failed to save question details. Rolled back. Reason: ${insertionError.message}`);
    }
  },

  // 🚀 ৪. Update Question (Edit Feature)
  updateQuestion: async (questionId, { 
    topicId, qType, text, imagePath, explanation, solution, importance, 
    isExamMaterial, isContentMaterial, optionsArray, cqParts, boardTags 
  }) => {
    
    // ১. মেইন প্রশ্ন আপডেট
    const { error: qError } = await supabase.from('questions').update({
      topic_id: (topicId !== null && topicId !== '') ? topicId : null, 
      q_type: qType, 
      question_text: text, 
      question_image_path: imagePath || null,
      explanation, 
      solution, 
      importance, 
      is_exam_material: isExamMaterial,
      is_content_material: isContentMaterial
    }).eq('id', questionId);
    
    if (qError) throw qError;

    try {
      // ২. পুরোনো চাইল্ড ডেটা ক্লিয়ার করে দেওয়া (যাতে ডুপ্লিকেট না হয়)
      const { error: delOptErr } = await supabase.from('mcq_options').delete().eq('question_id', questionId);
      if (delOptErr) throw delOptErr;

      const { error: delCqErr } = await supabase.from('cq_parts').delete().eq('question_id', questionId);
      if (delCqErr) throw delCqErr;

      const { error: delBoardErr } = await supabase.from('question_board_history').delete().eq('question_id', questionId);
      if (delBoardErr) throw delBoardErr;

      // ৩. নতুন করে চাইল্ড ডেটা ইনসার্ট করা
      if (qType === 'mcq' && optionsArray?.length > 0) {
        const opts = optionsArray.map((opt, i) => ({ 
          question_id: questionId, option_order: i + 1, option_text: opt.text, is_correct: opt.isCorrect 
        }));
        const { error: insOptErr } = await supabase.from('mcq_options').insert(opts);
        if (insOptErr) throw insOptErr;
      }
      
      if (qType === 'cq' && cqParts?.length > 0) {
        const parts = cqParts.map(p => ({ 
          question_id: questionId, label: p.label, question_text: p.qText, answer_text: p.aText 
        }));
        const { error: insCqErr } = await supabase.from('cq_parts').insert(parts);
        if (insCqErr) throw insCqErr;
      }
      
      if (boardTags && boardTags.length > 0) {
        // 🛠️ FIX: robust mapping to extract board UUID regardless of data source (fetch or new input)
        const validBoards = boardTags.map(b => ({
          board_id: b.boardId || b.board_id || b.boards?.id,
          year: parseInt(b.year)
        })).filter(b => b.board_id && !isNaN(b.year));

        if (validBoards.length > 0) {
          const boardInserts = validBoards.map(b => ({ 
            question_id: questionId, 
            board_id: b.board_id, 
            year: b.year 
          }));
          const { error: insBoardErr } = await supabase.from('question_board_history').insert(boardInserts);
          if (insBoardErr) throw insBoardErr;
        }
      }
      return true;
    } catch (err) {
      throw new Error(`Main question updated, but failed to update sub-items: ${err.message}`);
    }
  },

  // 🚀 ৫. Delete Question
  deleteQuestion: async (questionId) => {
    const { error } = await supabase.from('questions').delete().eq('id', questionId);
    if (error) throw error;
    return true;
  }
};