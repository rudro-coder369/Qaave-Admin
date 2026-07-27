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

    if (topicId !== null && topicId !== '') {
      query = query.eq('topic_id', topicId);
    }

    if (examMaterialOnly) query = query.eq('is_exam_material', true);
    if (contentMaterialOnly) query = query.eq('is_content_material', true);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // 🚀 ৩. Add Question
  addQuestion: async (payload) => {
    const { 
      subjectId, chapterId, topicId, qType, text, imagePath, 
      explanation, solution, importance, isExamMaterial, isContentMaterial, 
      optionsArray, cqParts, boardTags, mcqStatements 
    } = payload;
    
    // 🛠️ FIX: Strict validation BEFORE hitting the database
    validateQuestionPayload(payload);

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
      mcq_statements: mcqStatements || null, 
      status: 'published'
    }]).select();
    
    if (qError) throw qError;
    const questionId = qData[0].id;

    // ৪. Pseudo-Transaction Handling
    try {
      if (qType === 'mcq' && optionsArray?.length > 0) {
        const opts = optionsArray.map((opt, i) => ({
          question_id: questionId, option_order: i + 1, option_text: opt.text, is_correct: opt.isCorrect
        }));
        const { error: optError } = await supabase.from('mcq_options').insert(opts);
        if (optError) throw optError;
      }

      if (qType === 'cq' && cqParts?.length > 0) {
        const parts = cqParts.map(p => ({
          question_id: questionId, label: p.label, question_text: p.qText, answer_text: p.aText
        }));
        const { error: cqError } = await supabase.from('cq_parts').insert(parts);
        if (cqError) throw cqError;
      }

      if (boardTags && boardTags.length > 0) {
        const validBoards = boardTags.map(b => ({
          board_id: b.boardId || b.board_id || b.boards?.id,
          year: parseInt(b.year)
        })).filter(b => b.board_id && !isNaN(b.year));

        if (validBoards.length > 0) {
          const boardInserts = validBoards.map(b => ({
            question_id: questionId, board_id: b.board_id, year: b.year
          }));
          const { error: boardError } = await supabase.from('question_board_history').insert(boardInserts);
          if (boardError) throw boardError;
        }
      }

      return qData[0];

    } catch (insertionError) {
      // 🛑 ROLLBACK: Delete main question if children fail
      await supabase.from('questions').delete().eq('id', questionId);
      throw new Error(`Failed to save sub-items. Rolled back question. Reason: ${insertionError.message}`);
    }
  },

  // 🚀 ৪. Update Question (Edit Feature)
  updateQuestion: async (questionId, payload) => {
    const { 
      topicId, qType, text, imagePath, explanation, solution, importance, 
      isExamMaterial, isContentMaterial, optionsArray, cqParts, boardTags, mcqStatements 
    } = payload;
    
    // 🛠️ FIX: Strict validation BEFORE deleting old relationships
    validateQuestionPayload(payload);

    const { error: qError } = await supabase.from('questions').update({
      topic_id: (topicId !== null && topicId !== '') ? topicId : null, 
      q_type: qType, 
      question_text: text, 
      question_image_path: imagePath || null,
      explanation, 
      solution, 
      importance, 
      is_exam_material: isExamMaterial,
      is_content_material: isContentMaterial,
      mcq_statements: mcqStatements || null 
    }).eq('id', questionId);
    
    if (qError) throw qError;

    try {
      // Clear old relationships
      const { error: delOptErr } = await supabase.from('mcq_options').delete().eq('question_id', questionId);
      if (delOptErr) throw delOptErr;

      const { error: delCqErr } = await supabase.from('cq_parts').delete().eq('question_id', questionId);
      if (delCqErr) throw delCqErr;

      const { error: delBoardErr } = await supabase.from('question_board_history').delete().eq('question_id', questionId);
      if (delBoardErr) throw delBoardErr;

      // Insert new relationships
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
        const validBoards = boardTags.map(b => ({
          board_id: b.boardId || b.board_id || b.boards?.id,
          year: parseInt(b.year)
        })).filter(b => b.board_id && !isNaN(b.year));

        if (validBoards.length > 0) {
          const boardInserts = validBoards.map(b => ({ 
            question_id: questionId, board_id: b.board_id, year: b.year 
          }));
          const { error: insBoardErr } = await supabase.from('question_board_history').insert(boardInserts);
          if (insBoardErr) throw insBoardErr;
        }
      }
      return true;
    } catch (err) {
      throw new Error(`Main question updated, but failed to sync options/boards: ${err.message}`);
    }
  },

  // 🚀 ৫. Delete Question
  deleteQuestion: async (questionId) => {
    // 🛠️ FIX: Manually delete child records first to prevent orphans if ON DELETE CASCADE is missing
    await Promise.all([
      supabase.from('mcq_options').delete().eq('question_id', questionId),
      supabase.from('cq_parts').delete().eq('question_id', questionId),
      supabase.from('question_board_history').delete().eq('question_id', questionId)
    ]);

    const { error } = await supabase.from('questions').delete().eq('id', questionId);
    if (error) throw error;
    return true;
  },

  // 🚀 ৬. Upload Image to Cloudinary (Auto Optimize to WebP)
  uploadImageToCloudinary: async (file) => {
    try {
      // 🛠️ FIX: Strict size validation (Max 5MB)
      const MAX_SIZE_MB = 5;
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        throw new Error(`File is too large. Maximum allowed size is ${MAX_SIZE_MB}MB.`);
      }

      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        throw new Error("Cloudinary credentials missing in environment variables.");
      }
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Cloudinary upload failed.");
      }

      // 🛠️ FIX: Robust Cloudinary URL parameter injection
      const urlParts = data.secure_url.split('/upload/');
      if (urlParts.length > 1) {
        // Safe join in case there are multiple '/upload/' in the URL
        return `${urlParts[0]}/upload/f_auto,q_auto/${urlParts.slice(1).join('/upload/')}`;
      }
      
      return data.secure_url;

    } catch (error) {
      console.error("Image Upload Error:", error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }
};