import React from 'react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { UploadCloud } from 'lucide-react';
import { questionService } from '../../services/questionService'; 

export default function ExcelTemplateUpload({ 
  selectedSub, 
  selectedChap, 
  selectedTop, 
  boards, 
  fetchQuestions, 
  isSavingQuestion, 
  setIsSavingQuestion,
  existingQuestions = [] 
}) {

  const downloadSpecificTemplate = (type) => {
    let templateData = [];
    let fileName = "";
    
    if (type === 'mcq') {
      // 🚀 UPDATED: Added Image columns for Statements and Options
      templateData = [{ 
        Type: "mcq", 
        Question_Stem: "নিচের কোনটি ভেক্টর রাশি?", 
        Image_URL: "", 
        Statement_i: "", 
        Statement_i_Image: "",
        Statement_ii: "", 
        Statement_ii_Image: "",
        Statement_iii: "", 
        Statement_iii_Image: "",
        Importance_1_to_5: 5, 
        Is_Exam_Material: "TRUE", 
        Is_Content_Material: "TRUE", 
        Option_A: "কাজ", 
        Option_A_Image: "",
        Option_B: "তাপমাত্রা", 
        Option_B_Image: "",
        Option_C: "বেগ", 
        Option_C_Image: "",
        Option_D: "দ্রুতি", 
        Option_D_Image: "",
        Correct_Option_ABCD: "C", 
        Explanation: "বেগের মান ও দিক উভয়ই আছে।", 
        Board_Tags: "Dhaka-2023, Comilla-2022" 
      }];
      fileName = "Qaave_MCQ_Template.xlsx";
    } else if (type === 'sq1') {
      templateData = [{ Type: "sq", Question_Stem: "বলবিদ্যা কাকে বলে?", Image_URL: "", Importance_1_to_5: 3, Is_Exam_Material: "FALSE", Is_Content_Material: "TRUE", Exact_Solution: "পদার্থবিজ্ঞানের যে শাখায় বল ও বস্তুর গতির সম্পর্ক নিয়ে আলোচনা করা হয়...", Board_Tags: "Rajshahi-2021" }];
      fileName = "Qaave_SQ_1_Mark_Template.xlsx";
    } else if (type === 'sq2') {
      templateData = [{ Type: "written", Question_Stem: "গাড়ির টায়ার খাঁজকাটা থাকে কেন?", Image_URL: "", Importance_1_to_5: 4, Is_Exam_Material: "TRUE", Is_Content_Material: "TRUE", Exact_Solution: "ঘর্ষণ বল বৃদ্ধি করার জন্য...", Board_Tags: "Sylhet-2023" }];
      fileName = "Qaave_SQ_2_Marks_Template.xlsx";
    } else if (type === 'cq') {
      templateData = [{ Type: "cq", Stem_Text: "একটি গাড়ি স্থির অবস্থান থেকে... (উদ্দীপক)", Image_URL: "https://example.com/car.jpg", Importance_1_to_5: 4, Is_Exam_Material: "TRUE", Is_Content_Material: "FALSE", Q_K: "ত্বরণ কাকে বলে?", Ans_K: "সময়ের সাথে বেগ বৃদ্ধির হারকে...", Q_Kh: "সুষম ত্বরণ কী?", Ans_Kh: "বেগ নির্দিষ্ট দিকে...", Q_G: "5 সেকেন্ডে কত দূরত্ব?", Ans_G: "25 মিটার", Q_Gh: "গ্রাফটি বিশ্লেষণ করো।", Ans_Gh: "মূলবিন্দুগামী সরলরেখা হবে...", Board_Tags: "Cadet College-2024" }];
      fileName = "Qaave_CQ_Template.xlsx";
    }

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Questions");
    XLSX.writeFile(workbook, fileName);
    toast.success(`${fileName} Downloaded!`);
  };

  const downloadErrorLog = (failedRows) => {
    const errorData = failedRows.map(r => ({
      Row_Number: r.rowNumber,
      Question_Text: r.text,
      Error_Reason: r.reason
    }));
    const worksheet = XLSX.utils.json_to_sheet(errorData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Failed_Rows");
    XLSX.writeFile(workbook, "Qaave_Upload_Error_Log.xlsx");
  };

  // 🚀 FIXED: Added imagePath check in signature to prevent wrong duplicates
  const getSignature = (type, text, optionsArr = []) => {
    const normalizedText = String(text || '').trim().toLowerCase();
    if (type === 'mcq') {
      const optStr = optionsArr.map(o => `${String(o.text || '').trim().toLowerCase()}~${String(o.imagePath || '').trim()}`).join('|');
      const correctOpt = optionsArr.find(o => o.isCorrect);
      const correctStr = correctOpt ? `${String(correctOpt.text || '').trim().toLowerCase()}~${String(correctOpt.imagePath || '').trim()}` : '';
      return `mcq|${normalizedText}|${optStr}|correct:${correctStr}`;
    }
    return `${type}|${normalizedText}`;
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!selectedChap) return toast.error("Please select Subject & Chapter from UI first!");
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setIsSavingQuestion(true);
        
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(worksheet);
        
        if (rawData.length === 0) throw new Error("The uploaded Excel file is empty.");

        const totalRows = rawData.length;
        toast.loading(`Processing 0 / ${totalRows}...`, { id: "excel-upload" });
        
        let successCount = 0;
        let mergedCount = 0;
        let skippedCount = 0;
        let failedRows = [];
        let processedCount = 0;
        
        const existingMap = new Map();
        existingQuestions.forEach(q => {
          let optsForSig = [];
          if (q.q_type === 'mcq' && q.mcq_options) {
            // 🚀 Fetching option_image_path for signature match
            optsForSig = q.mcq_options.map(o => ({ 
              text: o.option_text, 
              imagePath: o.option_image_path, 
              isCorrect: o.is_correct 
            }));
          }
          const sig = getSignature(q.q_type, q.question_text, optsForSig);
          existingMap.set(sig, q);
        });

        const fileMap = new Map(); 

        const BATCH_SIZE = 15; 
        
        for (let i = 0; i < totalRows; i += BATCH_SIZE) {
          const batch = rawData.slice(i, i + BATCH_SIZE);
          
          const batchPromises = batch.map(async (row, index) => {
            const rowNum = i + index + 2; 
            const text = String(row.Question_Stem || row.Stem_Text || '').trim();

            try {
              if (!text) throw new Error("Empty Question_Stem or Stem_Text.");

              const rowQType = String(row.Type || 'mcq').toLowerCase().trim();
              
              let optionsArray = null;
              let rowMcqStatements = null;
              
              if (rowQType === 'mcq') {
                const correctOpt = String(row.Correct_Option_ABCD || '').trim().toUpperCase();
                if (!['A', 'B', 'C', 'D'].includes(correctOpt)) throw new Error(`Invalid Correct_Option: "${correctOpt}".`);
                
                // 🚀 UPDATED: Mapping Excel columns to text and imagePath
                optionsArray = [
                  { text: String(row.Option_A || '').trim(), imagePath: String(row.Option_A_Image || '').trim() || null, isCorrect: correctOpt === 'A' },
                  { text: String(row.Option_B || '').trim(), imagePath: String(row.Option_B_Image || '').trim() || null, isCorrect: correctOpt === 'B' },
                  { text: String(row.Option_C || '').trim(), imagePath: String(row.Option_C_Image || '').trim() || null, isCorrect: correctOpt === 'C' },
                  { text: String(row.Option_D || '').trim(), imagePath: String(row.Option_D_Image || '').trim() || null, isCorrect: correctOpt === 'D' }
                ];
                
                // Ensure at least text or image is present
                if (optionsArray.some(o => !o.text && !o.imagePath)) throw new Error("One or more MCQ options are entirely empty (No text and No image).");

                // 🚀 UPDATED: Checking both text and image columns for statements
                if (row.Statement_i || row.Statement_ii || row.Statement_iii || row.Statement_i_Image || row.Statement_ii_Image || row.Statement_iii_Image) {
                   rowMcqStatements = [
                     { text: String(row.Statement_i || '').trim(), imagePath: String(row.Statement_i_Image || '').trim() },
                     { text: String(row.Statement_ii || '').trim(), imagePath: String(row.Statement_ii_Image || '').trim() },
                     { text: String(row.Statement_iii || '').trim(), imagePath: String(row.Statement_iii_Image || '').trim() }
                   ];
                   if (rowMcqStatements.some(s => !s.text && !s.imagePath)) throw new Error("Multiple completion requires all 3 statements to have text or an image.");
                }
              }

              let importance = parseInt(row.Importance_1_to_5);
              if (isNaN(importance) || importance < 1 || importance > 5) importance = 3; 

              let validBoardTags = [];
              if (row.Board_Tags) {
                const tags = String(row.Board_Tags).split(',');
                for (const tag of tags) {
                  const tagTrimmed = tag.trim();
                  if (!tagTrimmed) continue;

                  const lastDashIdx = tagTrimmed.lastIndexOf('-');
                  if (lastDashIdx === -1) throw new Error(`Invalid board tag format: "${tagTrimmed}".`);
                  
                  const boardName = tagTrimmed.substring(0, lastDashIdx).trim();
                  const year = parseInt(tagTrimmed.substring(lastDashIdx + 1).trim());

                  if (!boardName || isNaN(year)) throw new Error(`Invalid board name or year in tag: "${tagTrimmed}".`);

                  const foundBoard = boards.find(b => {
                    const target = boardName.toLowerCase();
                    return (b.name || '').toLowerCase() === target || 
                           (b.short_name || '').toLowerCase() === target || 
                           (b.name || '').toLowerCase().includes(target);
                  });

                  if (!foundBoard) throw new Error(`Board not found: "${boardName}".`);
                  validBoardTags.push({ boardId: foundBoard.id, year });
                }
              }

              const rowCqParts = rowQType === 'cq' ? [
                { label: 'k', qText: row.Q_K || '', aText: row.Ans_K || '' }, { label: 'kh', qText: row.Q_Kh || '', aText: row.Ans_Kh || '' },
                { label: 'g', qText: row.Q_G || '', aText: row.Ans_G || '' }, { label: 'gh', qText: row.Q_Gh || '', aText: row.Ans_Gh || '' }
              ] : null;
              
              if (rowQType === 'cq' && rowCqParts.some(p => !p.qText.trim())) throw new Error("CQ missing questions.");
              
              const payload = {
                subjectId: selectedSub, chapterId: selectedChap, topicId: selectedTop || null,
                qType: rowQType, text: text, imagePath: row.Image_URL || null,
                explanation: String(row.Explanation || '').trim(), 
                solution: ['sq', 'written'].includes(rowQType) ? String(row.Exact_Solution || '').trim() : '',
                importance: importance, 
                isExamMaterial: String(row.Is_Exam_Material).toUpperCase() === 'TRUE',
                isContentMaterial: String(row.Is_Content_Material).toUpperCase() === 'TRUE', 
                optionsArray, cqParts: rowCqParts, mcqStatements: rowMcqStatements
              };

              const rowSignature = getSignature(rowQType, text, optionsArray);
              let existingQ = existingMap.get(rowSignature) || fileMap.get(rowSignature);

              if (existingQ) {
                let existingBoards = [];
                if (existingQ.question_board_history) {
                  existingBoards = existingQ.question_board_history.map(h => ({
                    boardId: h.board_id || h.boardId, 
                    year: parseInt(h.year)
                  }));
                }

                const mergedBoardsMap = new Map();
                existingBoards.forEach(b => mergedBoardsMap.set(`${b.boardId}-${b.year}`, b));

                let hasNewBoard = false;
                let boardsToInsert = [];

                validBoardTags.forEach(b => {
                  const key = `${b.boardId}-${b.year}`;
                  if (!mergedBoardsMap.has(key)) {
                    mergedBoardsMap.set(key, b);
                    boardsToInsert.push(b);
                    hasNewBoard = true;
                  }
                });

                if (!hasNewBoard) {
                  throw new Error("SKIPPED: Exact question with identical options & boards already exists.");
                } else {
                  await questionService.mergeBoardTags(existingQ.id, boardsToInsert);
                  
                  const updatedBoardHistory = Array.from(mergedBoardsMap.values());
                  existingQ.question_board_history = updatedBoardHistory.map(b => ({ board_id: b.boardId, year: b.year }));
                  
                  existingMap.set(rowSignature, existingQ); 
                  fileMap.set(rowSignature, existingQ);
                  
                  return { success: true, merged: true };
                }
              } else {
                const newQData = await questionService.addQuestion({ ...payload, boardTags: validBoardTags });
                
                const newObj = {
                  id: newQData.id,
                  q_type: rowQType,
                  question_text: text,
                  question_board_history: validBoardTags.map(b => ({ board_id: b.boardId, year: b.year }))
                };
                
                existingMap.set(rowSignature, newObj); 
                fileMap.set(rowSignature, newObj);

                return { success: true, merged: false };
              }

            } catch (err) { 
              if (err.message.startsWith("SKIPPED:")) {
                return { skipped: true, rowNumber: rowNum, text: text, reason: err.message };
              }
              return { success: false, rowNumber: rowNum, text: text || 'Unknown', reason: err.message };
            }
          });

          const results = await Promise.all(batchPromises);
          
          results.forEach(res => {
            if (res.success) {
              if (res.merged) mergedCount++;
              else successCount++;
            } else if (res.skipped) {
              skippedCount++;
            } else {
              failedRows.push(res);
            }
          });

          processedCount += batch.length;
          toast.loading(`Processing ${processedCount} / ${totalRows}...`, { id: "excel-upload" });
        }
        
        if (failedRows.length > 0) {
          console.error("Upload Error Report:", failedRows);
          toast.error(`Inserted: ${successCount}, Merged: ${mergedCount}, Skipped: ${skippedCount}, Failed: ${failedRows.length}. Downloading Log...`, { id: "excel-upload", duration: 6000 });
          downloadErrorLog(failedRows);
        } else {
          toast.success(`Done! Inserted: ${successCount}, Boards Merged: ${mergedCount}, Skipped: ${skippedCount}.`, { id: "excel-upload", duration: 5000 });
        }
        
        fetchQuestions();
      } catch (err) { 
        toast.error("Import failed: " + err.message, { id: "excel-upload" }); 
      } finally { 
        setIsSavingQuestion(false); 
      }
    };
    
    reader.readAsBinaryString(file);
    e.target.value = null; 
  };

  return (
    <div className="hidden lg:flex gap-2 items-center">
      <select 
        onChange={(e) => { 
          if(e.target.value) { 
            downloadSpecificTemplate(e.target.value); 
            e.target.value = ''; 
          } 
        }} 
        className="px-3 py-2.5 bg-[#0B0F19] text-slate-300 border border-slate-700 hover:bg-slate-800 rounded-lg text-[10px] font-black uppercase tracking-widest cursor-pointer outline-none"
      >
        <option value="" className="bg-[#0B0F19]">📥 Template</option>
        <option value="mcq" className="bg-[#0B0F19]">MCQ</option>
        <option value="sq1" className="bg-[#0B0F19]">SQ(1)</option>
        <option value="sq2" className="bg-[#0B0F19]">SQ(2)</option>
        <option value="cq" className="bg-[#0B0F19]">CQ</option>
      </select>
      
      <label htmlFor="excel-upload" className="cursor-pointer flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm">
        <UploadCloud className="w-3.5 h-3.5" /> Upload Excel
        <input 
          type="file" 
          id="excel-upload" 
          accept=".xlsx, .xls" 
          className="hidden" 
          onChange={handleExcelUpload} 
          disabled={isSavingQuestion} 
        />
      </label>
    </div>
  );
}