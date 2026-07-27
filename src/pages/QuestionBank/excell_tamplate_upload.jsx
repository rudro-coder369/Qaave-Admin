import React from 'react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { UploadCloud } from 'lucide-react';
import { questionService } from '../../services/questionService'; // ⚠️ পাথটি আপনার ফোল্ডার অনুযায়ী ঠিক করে নেবেন

export default function ExcelTemplateUpload({ 
  selectedSub, 
  selectedChap, 
  selectedTop, 
  boards, 
  fetchQuestions, 
  isSavingQuestion, 
  setIsSavingQuestion,
  existingQuestions = [] // 🚀 ডুপ্লিকেট চেকিংয়ের জন্য Parent থেকে existing questions পাঠাতে হবে
}) {

  // 🚀 ১. EXCEL TEMPLATE DOWNLOAD LOGIC
  const downloadSpecificTemplate = (type) => {
    let templateData = [];
    let fileName = "";
    
    if (type === 'mcq') {
      templateData = [{ Type: "mcq", Question_Stem: "নিচের কোনটি ভেক্টর রাশি?", Statement_i: "", Statement_ii: "", Statement_iii: "", Image_URL: "", Importance_1_to_5: 5, Is_Exam_Material: "TRUE", Is_Content_Material: "TRUE", Option_A: "কাজ", Option_B: "তাপমাত্রা", Option_C: "বেগ", Option_D: "দ্রুতি", Correct_Option_ABCD: "C", Explanation: "বেগের মান ও দিক উভয়ই আছে।", Board_Tags: "Dhaka-2023, Comilla-2022" }];
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

  // 🚀 Helper: Generate Error Log Excel
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

  // 🚀 ২. EXCEL UPLOAD & PARSING LOGIC (Optimized & Validated)
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
        let failedRows = [];
        let processedCount = 0;
        
        // 🚀 Duplicate Prevention Sets
        const existingTextSet = new Set(existingQuestions.map(q => q.question_text.trim().toLowerCase()));
        const fileTextSet = new Set(); // Prevent duplicates within the file itself

        // 🚀 Chunk / Batch Processing Setup
        const BATCH_SIZE = 15; // ১৫টি করে প্রশ্ন একসাথে আপলোড হবে
        
        for (let i = 0; i < totalRows; i += BATCH_SIZE) {
          const batch = rawData.slice(i, i + BATCH_SIZE);
          
          const batchPromises = batch.map(async (row, index) => {
            const rowNum = i + index + 2; // Header is row 1
            const text = String(row.Question_Stem || row.Stem_Text || '').trim();

            try {
              // 🔴 VALIDATION 1: Empty Question
              if (!text) throw new Error("Empty Question_Stem or Stem_Text.");

              // 🔴 VALIDATION 2: Duplicate Detection
              const normalizedText = text.toLowerCase();
              if (existingTextSet.has(normalizedText)) throw new Error("Duplicate: Question already exists in database.");
              if (fileTextSet.has(normalizedText)) throw new Error("Duplicate: Question appears multiple times in this Excel file.");
              fileTextSet.add(normalizedText);

              const rowQType = String(row.Type || 'mcq').toLowerCase().trim();
              
              // 🔴 VALIDATION 3: Options (If MCQ)
              let optionsArray = null;
              let rowMcqStatements = null;
              
              if (rowQType === 'mcq') {
                const correctOpt = String(row.Correct_Option_ABCD || '').trim().toUpperCase();
                if (!['A', 'B', 'C', 'D'].includes(correctOpt)) {
                  throw new Error(`Invalid Correct_Option_ABCD: "${correctOpt}". Must be A, B, C, or D.`);
                }
                
                optionsArray = [
                  { text: String(row.Option_A || '').trim(), isCorrect: correctOpt === 'A' },
                  { text: String(row.Option_B || '').trim(), isCorrect: correctOpt === 'B' },
                  { text: String(row.Option_C || '').trim(), isCorrect: correctOpt === 'C' },
                  { text: String(row.Option_D || '').trim(), isCorrect: correctOpt === 'D' }
                ];
                
                if (optionsArray.some(o => !o.text)) throw new Error("One or more MCQ options are empty.");

                if (row.Statement_i || row.Statement_ii || row.Statement_iii) {
                   rowMcqStatements = [String(row.Statement_i || ''), String(row.Statement_ii || ''), String(row.Statement_iii || '')];
                   if (rowMcqStatements.some(s => !s.trim())) throw new Error("Multiple completion requires all 3 statements to be filled.");
                }
              }

              // 🔴 VALIDATION 4: Importance Rating
              let importance = parseInt(row.Importance_1_to_5);
              if (isNaN(importance) || importance < 1 || importance > 5) {
                importance = 3; // Default fallback if invalid
              }

              // 🔴 VALIDATION 5: Robust Board Parsing (Using lastIndexOf)
              let validBoardTags = [];
              if (row.Board_Tags) {
                const tags = String(row.Board_Tags).split(',');
                for (const tag of tags) {
                  const tagTrimmed = tag.trim();
                  if (!tagTrimmed) continue;

                  const lastDashIdx = tagTrimmed.lastIndexOf('-');
                  if (lastDashIdx === -1) throw new Error(`Invalid board tag: "${tagTrimmed}". Format must be BoardName-Year.`);
                  
                  const boardName = tagTrimmed.substring(0, lastDashIdx).trim();
                  const yearStr = tagTrimmed.substring(lastDashIdx + 1).trim();
                  const year = parseInt(yearStr);

                  if (!boardName || isNaN(year)) throw new Error(`Invalid board name or year in tag: "${tagTrimmed}".`);

                  const foundBoard = boards.find(b => 
                    b.short_name?.toLowerCase() === boardName.toLowerCase() || 
                    b.name?.toLowerCase() === boardName.toLowerCase()
                  );

                  if (!foundBoard) throw new Error(`Board not found in database: "${boardName}".`);
                  
                  validBoardTags.push({ boardId: foundBoard.id, year });
                }
              }

              const rowCqParts = rowQType === 'cq' ? [
                { label: 'k', qText: row.Q_K || '', aText: row.Ans_K || '' }, { label: 'kh', qText: row.Q_Kh || '', aText: row.Ans_Kh || '' },
                { label: 'g', qText: row.Q_G || '', aText: row.Ans_G || '' }, { label: 'gh', qText: row.Q_Gh || '', aText: row.Ans_Gh || '' }
              ] : null;
              
              if (rowQType === 'cq' && rowCqParts.some(p => !p.qText.trim())) {
                throw new Error("CQ missing one or more questions (k, kh, g, gh).");
              }
              
              // Proceed to Insert
              await questionService.addQuestion({
                subjectId: selectedSub, chapterId: selectedChap, topicId: selectedTop || null,
                qType: rowQType, text: text, imagePath: row.Image_URL || null,
                explanation: String(row.Explanation || '').trim(), 
                solution: ['sq', 'written'].includes(rowQType) ? String(row.Exact_Solution || '').trim() : '',
                importance: importance, 
                isExamMaterial: String(row.Is_Exam_Material).toUpperCase() === 'TRUE',
                isContentMaterial: String(row.Is_Content_Material).toUpperCase() === 'TRUE', 
                optionsArray, cqParts: rowCqParts, boardTags: validBoardTags,
                mcqStatements: rowMcqStatements
              });
              
              return { success: true };

            } catch (err) { 
              return { success: false, rowNumber: rowNum, text: text || 'Unknown', reason: err.message };
            }
          });

          // Wait for the batch to finish
          const results = await Promise.all(batchPromises);
          
          results.forEach(res => {
            if (res.success) successCount++;
            else failedRows.push(res);
          });

          processedCount += batch.length;
          toast.loading(`Processing ${processedCount} / ${totalRows}...`, { id: "excel-upload" });
        }
        
        // 🚀 Report Generation
        if (failedRows.length > 0) {
          console.error("Upload Error Report:", failedRows);
          toast.error(`Uploaded: ${successCount}. Failed: ${failedRows.length}. Downloading Error Log...`, { id: "excel-upload", duration: 5000 });
          downloadErrorLog(failedRows);
        } else if (successCount > 0) {
          toast.success(`Successfully uploaded all ${successCount} questions!`, { id: "excel-upload" });
        } else {
          toast.error(`No questions were uploaded. Please check the format.`, { id: "excel-upload" });
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

  // 🚀 ৩. UI RENDER (Buttons)
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