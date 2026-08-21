import { useState, useEffect, useMemo } from 'react';
import { taxonomyApi } from '../../services/taxonomyService';
import { questionService } from '../../services/questionService';
import toast from 'react-hot-toast';

export function useQuestionBankLogic() {
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  const [boards, setBoards] = useState([]);
  
  const [selectedSub, setSelectedSub] = useState('');
  const [selectedChap, setSelectedChap] = useState('');
  const [selectedTop, setSelectedTop] = useState('');

  const [questions, setQuestions] = useState([]);
  
  // Loading & Edit States
  const [isFetchingQuestions, setIsFetchingQuestions] = useState(false);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  
  // Track which specific input is currently uploading
  const [uploadingTarget, setUploadingTarget] = useState(null); 
  
  const [editingId, setEditingId] = useState(null); 

  // Standalone Uploader State
  const [standaloneImageUrl, setStandaloneImageUrl] = useState('');
  const [isUploadingStandalone, setIsUploadingStandalone] = useState(false);

  // Form States
  const [qType, setQType] = useState('mcq');
  const [newQ, setNewQ] = useState({
    text: '', imagePath: '', explanation: '', solution: '', 
    importance: 3, isExamMaterial: false, isContentMaterial: false
  });
  
  const [isPolyMCQ, setIsPolyMCQ] = useState(false);
  
  const [mcqStatements, setMcqStatements] = useState([
    { text: '', imagePath: '' }, 
    { text: '', imagePath: '' }, 
    { text: '', imagePath: '' }
  ]);
  const [boardTags, setBoardTags] = useState([]);

  const [options, setOptions] = useState([
    { text: '', imagePath: '', isCorrect: true }, { text: '', imagePath: '', isCorrect: false },
    { text: '', imagePath: '', isCorrect: false }, { text: '', imagePath: '', isCorrect: false }
  ]);
  
  const [cqParts, setCqParts] = useState([
    { label: 'k', qText: '', aText: '' }, { label: 'kh', qText: '', aText: '' },
    { label: 'g', qText: '', aText: '' }, { label: 'gh', qText: '', aText: '' }
  ]);

  const boardsMap = useMemo(() => {
    return boards.reduce((acc, board) => {
      acc[board.id] = board;
      return acc;
    }, {});
  }, [boards]);

  const generateId = () => window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2);

  useEffect(() => { 
    taxonomyApi.getSubjects().then(setSubjects).catch(err => toast.error("Failed to load subjects: " + err.message));
    questionService.getBoards().then(setBoards).catch(err => toast.error("Failed to load boards: " + err.message));
  }, []);
  
  useEffect(() => {
    let isMounted = true;

    if (!selectedChap) {
      if (isMounted) setQuestions([]);
      return;
    }

    setIsFetchingQuestions(true);
    questionService.getQuestions(selectedChap, selectedTop || null)
      .then(data => {
        if (isMounted) setQuestions(data);
      })
      .catch(err => {
        if (isMounted) toast.error("Failed to fetch questions: " + err.message);
      })
      .finally(() => {
        if (isMounted) setIsFetchingQuestions(false);
      });

    return () => { isMounted = false; };
  }, [selectedChap, selectedTop]);

  const resetForm = () => {
    setEditingId(null);
    setNewQ({ text: '', imagePath: '', explanation: '', solution: '', importance: 3, isExamMaterial: false, isContentMaterial: false });
    setBoardTags([]);
    setIsPolyMCQ(false);
    setMcqStatements([{ text: '', imagePath: '' }, { text: '', imagePath: '' }, { text: '', imagePath: '' }]);
    setOptions([
      { text: '', imagePath: '', isCorrect: true }, { text: '', imagePath: '', isCorrect: false }, 
      { text: '', imagePath: '', isCorrect: false }, { text: '', imagePath: '', isCorrect: false }
    ]);
    setCqParts([{ label: 'k', qText: '', aText: '' }, { label: 'kh', qText: '', aText: '' }, { label: 'g', qText: '', aText: '' }, { label: 'gh', qText: '', aText: '' }]);
  };

  const handleSubjectChange = async (e) => {
    const val = e.target.value;
    setSelectedSub(val);
    setSelectedChap('');
    setSelectedTop('');
    resetForm();
    if (val) {
      taxonomyApi.getChapters(val).then(setChapters).catch(err => toast.error(err.message));
    } else {
      setChapters([]);
    }
  };

  const handleChapterChange = async (e) => {
    const val = e.target.value;
    setSelectedChap(val);
    setSelectedTop('');
    resetForm();
    if (val) {
      taxonomyApi.getTopics(val).then(setTopics).catch(err => toast.error(err.message));
    } else {
      setTopics([]);
    }
  };

  const handleTopicChange = (e) => {
    setSelectedTop(e.target.value);
    resetForm();
  };

  const handleEditClick = (q) => {
    setEditingId(q.id);
    const type = q.q_type === 'sq' ? 'sq1' : q.q_type === 'written' ? 'sq2' : q.q_type;
    setQType(type);
    
    setNewQ({
      text: q.question_text || '',
      imagePath: q.question_image_path || '',
      explanation: q.explanation || '',
      solution: q.solution || '',
      importance: q.importance || 3,
      isExamMaterial: q.is_exam_material || false,
      isContentMaterial: q.is_content_material || false
    });

    if (q.q_type === 'mcq') {
      if (q.mcq_options) {
        const formattedOptions = q.mcq_options.map(o => ({ 
          text: o.option_text || '', 
          imagePath: o.option_image_path || '',
          isCorrect: o.is_correct 
        })).slice(0, 4);
        while(formattedOptions.length < 4) formattedOptions.push({ text: '', imagePath: '', isCorrect: false });
        setOptions(formattedOptions);
      }
      if (q.mcq_statements && q.mcq_statements.length > 0) {
        setIsPolyMCQ(true);
        const parsedStatements = q.mcq_statements.map(s => {
           if (typeof s === 'string') return { text: s, imagePath: '' };
           return { text: s.text || '', imagePath: s.imagePath || '' };
        });
        setMcqStatements([
          parsedStatements[0] || { text: '', imagePath: '' }, 
          parsedStatements[1] || { text: '', imagePath: '' }, 
          parsedStatements[2] || { text: '', imagePath: '' }
        ]);
      } else {
        setIsPolyMCQ(false);
        setMcqStatements([{ text: '', imagePath: '' }, { text: '', imagePath: '' }, { text: '', imagePath: '' }]);
      }
    }

    if (q.q_type === 'cq' && q.cq_parts) {
      const parts = ['k', 'kh', 'g', 'gh'].map(label => {
        const existing = q.cq_parts.find(p => p.label === label);
        return { label, qText: existing?.question_text || '', aText: existing?.answer_text || '' };
      });
      setCqParts(parts);
    }

    if (q.question_board_history) {
      setBoardTags(q.question_board_history.map(h => ({ 
        tempId: generateId(),
        boardId: h.board_id || h.boards?.id, 
        year: h.year 
      })));
    } else {
      setBoardTags([]);
    }

    toast.success("Question loaded into form.", { icon: '✏️' });
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this question?')) return;
    try {
      await questionService.deleteQuestion(id);
      setQuestions(prev => prev.filter(q => q.id !== id));
      if (editingId === id) resetForm();
      toast.success('Question deleted.');
    } catch (error) { toast.error("Failed to delete: " + error.message); }
  };

  const handleStandaloneImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setIsUploadingStandalone(true);
      toast.loading("Generating URL...", { id: "std-img-upload" });
      const imageUrl = await questionService.uploadImageToCloudinary(file);
      setStandaloneImageUrl(imageUrl);
      
      navigator.clipboard.writeText(imageUrl);
      toast.success("Image URL Copied to Clipboard!", { id: "std-img-upload" });
    } catch (error) {
      toast.error(error.message, { id: "std-img-upload" });
    } finally {
      setIsUploadingStandalone(false);
      e.target.value = null; 
    }
  };

  const handleDynamicImageUpload = async (e, target) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingTarget(target);
      toast.loading("Uploading image...", { id: "dyn-img-upload" });
      
      const imageUrl = await questionService.uploadImageToCloudinary(file);
      
      if (target === 'main') {
        setNewQ(prev => ({ ...prev, imagePath: imageUrl }));
      } else if (target.startsWith('stmt-')) {
        const idx = parseInt(target.split('-')[1]);
        setMcqStatements(prev => prev.map((s, i) => i === idx ? { ...s, imagePath: imageUrl } : s));
      } else if (target.startsWith('opt-')) {
        const idx = parseInt(target.split('-')[1]);
        setOptions(prev => prev.map((o, i) => i === idx ? { ...o, imagePath: imageUrl } : o));
      }

      toast.success("Image attached!", { id: "dyn-img-upload" });
    } catch (error) {
      toast.error(error.message, { id: "dyn-img-upload" });
    } finally {
      setUploadingTarget(null);
      e.target.value = null; 
    }
  };

  const addBoardTag = (boardId) => {
    setBoardTags(prev => [...prev, { tempId: generateId(), boardId, year: '' }]);
  };

  const updateBoardYear = (tempId, year) => {
    setBoardTags(prev => prev.map(b => b.tempId === tempId ? { ...b, year } : b));
  };

  const removeBoardTag = (tempId) => {
    setBoardTags(prev => prev.filter(b => b.tempId !== tempId));
  };

  const handleAddOrUpdateQuestion = async (e) => {
    e.preventDefault();
    if (!selectedChap) return toast.error("Please select a subject and chapter first.");
    
    if (!newQ.text.trim()) return toast.error("The main question text cannot be empty.");

    if (qType === 'mcq' && isPolyMCQ) {
      const filledCount = mcqStatements.filter(s => s.text.trim() !== '' || s.imagePath.trim() !== '').length;
      if (filledCount !== 0 && filledCount !== 3) {
        return toast.error("For multiple completion, please fill all 3 statements.");
      }
    }

    const actualQType = qType === 'sq1' ? 'sq' : qType === 'sq2' ? 'written' : qType;
    const validBoardTags = boardTags.filter(b => b.boardId && String(b.year).trim()).map(b => ({ boardId: b.boardId, year: b.year }));

    const payload = {
      subjectId: selectedSub, chapterId: selectedChap, topicId: selectedTop || null,
      qType: actualQType, text: newQ.text.trim(), imagePath: ['mcq', 'cq'].includes(qType) ? newQ.imagePath : null,
      explanation: newQ.explanation.trim(), solution: newQ.solution.trim(), importance: newQ.importance,
      isExamMaterial: newQ.isExamMaterial, isContentMaterial: newQ.isContentMaterial,
      optionsArray: qType === 'mcq' ? options : null, 
      cqParts: qType === 'cq' ? cqParts : null,
      boardTags: ['mcq', 'cq'].includes(qType) ? validBoardTags : [],
      mcqStatements: (qType === 'mcq' && isPolyMCQ) ? mcqStatements : null
    };

    try {
      setIsSavingQuestion(true);
      if (editingId) {
        await questionService.updateQuestion(editingId, payload);
        toast.success(`Question updated successfully.`);
      } else {
        await questionService.addQuestion(payload);
        toast.success(`Question added to database.`);
      }
      resetForm();
      
      questionService.getQuestions(selectedChap, selectedTop || null).then(setQuestions);
    } catch (error) { 
      toast.error("Error saving data: " + error.message); 
    } finally { 
      setIsSavingQuestion(false); 
    }
  };

  const activeQType = qType === 'sq1' ? 'sq' : qType === 'sq2' ? 'written' : qType;
  const filteredQuestions = questions.filter(q => q.q_type === activeQType);

  return {
    // States
    subjects, chapters, topics, boards, questions,
    selectedSub, setSelectedSub, selectedChap, setSelectedChap, selectedTop, setSelectedTop,
    isFetchingQuestions, isSavingQuestion, setIsSavingQuestion, uploadingTarget, editingId,
    standaloneImageUrl, isUploadingStandalone, qType, setQType, newQ, setNewQ,
    isPolyMCQ, setIsPolyMCQ, mcqStatements, setMcqStatements, boardTags, setBoardTags,
    options, setOptions, cqParts, setCqParts,
    
    // Memos
    boardsMap, filteredQuestions,

    // Handlers
    resetForm, handleSubjectChange, handleChapterChange, handleTopicChange, handleEditClick, 
    handleDeleteQuestion, handleStandaloneImageUpload, handleDynamicImageUpload, 
    addBoardTag, updateBoardYear, removeBoardTag, handleAddOrUpdateQuestion,
  };
}