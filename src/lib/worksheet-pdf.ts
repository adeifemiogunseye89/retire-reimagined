import jsPDF from "jspdf";
import { pdfT, currentLang } from "@/lib/pdf-i18n";

export interface WorksheetQuestion {
  number: number;
  type: "multiple_choice" | "short_answer" | "fill_blank";
  question: string;
  options?: string[];
}

export interface WorksheetAnswer {
  number: number;
  answer: string;
  explanation?: string;
}

export interface WorksheetData {
  title: string;
  subject: string;
  topic: string;
  grade_level?: string | null;
  difficulty: string;
  instructions?: string | null;
  questions: WorksheetQuestion[];
  answer_key: WorksheetAnswer[];
}

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - MARGIN) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function drawHeader(doc: jsPDF, ws: WorksheetData) {
  doc.setFillColor(45, 122, 79); // Lagos green
  doc.rect(0, 0, PAGE_W, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(ws.title, MARGIN, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const meta = [
    ws.subject,
    ws.topic,
    ws.grade_level || null,
    ws.difficulty?.toUpperCase(),
  ]
    .filter(Boolean)
    .join("  •  ");
  doc.text(meta, MARGIN, 19);
  doc.setTextColor(20, 20, 20);
}

export function downloadWorksheetPDF(ws: WorksheetData) {
  const lang = currentLang();
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // ---------- Page 1: Worksheet ----------
  drawHeader(doc, ws);
  let y = 32;

  // Student info line
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(pdfT("pdf.worksheet.name", undefined, lang), MARGIN, y);
  doc.text(pdfT("pdf.worksheet.date", undefined, lang), MARGIN + 110, y);
  y += 8;

  if (ws.instructions) {
    doc.setFont("helvetica", "bold");
    doc.text(pdfT("pdf.worksheet.instructions", undefined, lang), MARGIN, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(ws.instructions, CONTENT_W);
    doc.text(lines, MARGIN, y);
    y += lines.length * 5 + 4;
  }

  // Questions
  doc.setFontSize(11);
  for (const q of ws.questions) {
    y = ensureSpace(doc, y, 18);
    doc.setFont("helvetica", "bold");
    const qLines = doc.splitTextToSize(
      `${q.number}. ${q.question}`,
      CONTENT_W,
    );
    doc.text(qLines, MARGIN, y);
    y += qLines.length * 5 + 1;

    doc.setFont("helvetica", "normal");
    if (q.type === "multiple_choice" && q.options?.length) {
      const letters = ["A", "B", "C", "D", "E", "F"];
      q.options.forEach((opt, idx) => {
        const optLines = doc.splitTextToSize(
          `${letters[idx]}. ${opt}`,
          CONTENT_W - 6,
        );
        y = ensureSpace(doc, y, optLines.length * 5 + 1);
        doc.text(optLines, MARGIN + 6, y);
        y += optLines.length * 5;
      });
      y += 3;
    } else if (q.type === "fill_blank") {
      y = ensureSpace(doc, y, 8);
      doc.text(pdfT("pdf.worksheet.answerLine", undefined, lang), MARGIN + 4, y + 4);
      y += 10;
    } else {
      // short answer — three lines
      for (let i = 0; i < 3; i++) {
        y = ensureSpace(doc, y, 6);
        doc.setDrawColor(180);
        doc.line(MARGIN + 4, y + 4, PAGE_W - MARGIN, y + 4);
        y += 6;
      }
      y += 2;
    }
  }

  // ---------- Answer Key page ----------
  doc.addPage();
  doc.setFillColor(212, 160, 23);
  doc.rect(0, 0, PAGE_W, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(pdfT("pdf.worksheet.answerKey", undefined, lang), MARGIN, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(ws.title, MARGIN, 19);
  doc.setTextColor(20, 20, 20);

  let ay = 32;
  doc.setFontSize(11);
  for (const a of ws.answer_key) {
    ay = ensureSpace(doc, ay, 12);
    doc.setFont("helvetica", "bold");
    doc.text(`${a.number}.`, MARGIN, ay);
    doc.setFont("helvetica", "normal");
    const ansLines = doc.splitTextToSize(a.answer, CONTENT_W - 10);
    doc.text(ansLines, MARGIN + 8, ay);
    ay += ansLines.length * 5 + 1;
    if (a.explanation) {
      doc.setFont("helvetica", "italic");
      doc.setTextColor(90);
      const expLines = doc.splitTextToSize(a.explanation, CONTENT_W - 10);
      ay = ensureSpace(doc, ay, expLines.length * 5);
      doc.text(expLines, MARGIN + 8, ay);
      ay += expLines.length * 5 + 2;
      doc.setTextColor(20, 20, 20);
      doc.setFont("helvetica", "normal");
    } else {
      ay += 2;
    }
  }

  const safe = ws.title.replace(/[^\w\d-]+/g, "_").slice(0, 60);
  doc.save(`${safe || "worksheet"}.pdf`);
}
