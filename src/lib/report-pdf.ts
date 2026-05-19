import jsPDF from "jspdf";
import { formatMoney } from "@/lib/regions";
import type { ProfileData, ReportData } from "@/hooks/useDashboardData";

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

function drawHeader(doc: jsPDF, profile: ProfileData | null) {
  // Reignite navy
  doc.setFillColor(24, 41, 84);
  doc.rect(0, 0, PAGE_W, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("AI Readiness Report", MARGIN, 14);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const meta = [
    profile?.fullName,
    profile?.sector,
    profile?.gradeLevel,
    new Date().toLocaleDateString(),
  ]
    .filter(Boolean)
    .join("  •  ");
  doc.text(meta, MARGIN, 21);
  doc.setTextColor(20, 20, 20);
}

function sectionTitle(doc: jsPDF, y: number, label: string): number {
  y = ensureSpace(doc, y, 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(24, 41, 84);
  doc.text(label, MARGIN, y);
  doc.setDrawColor(24, 41, 84);
  doc.line(MARGIN, y + 1.5, MARGIN + 35, y + 1.5);
  doc.setTextColor(20, 20, 20);
  return y + 8;
}

export function downloadReportPDF(profile: ProfileData | null, report: ReportData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const fmt = (n: number) =>
    formatMoney(n, profile?.currency || "NGN", profile?.language || "en-NG");

  drawHeader(doc, profile);
  let y = 36;

  // ---------- Readiness summary ----------
  const salaryPct =
    profile && profile.currentSalary > 0
      ? Math.round((profile.pensionProjection / profile.currentSalary) * 100)
      : 0;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(46, 139, 87);
  doc.text(`${report.readinessScore}%`, MARGIN, y + 8);
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const summary = doc.splitTextToSize(
    `You are ${report.readinessScore}% ready for retirement. With ${
      profile?.yearsInService ?? 0
    } years of service in ${profile?.sector ?? "your sector"} at ${
      profile?.gradeLevel ?? "your grade"
    }, your pension will cover about ${salaryPct}% of your current salary.`,
    CONTENT_W - 40
  );
  doc.text(summary, MARGIN + 38, y + 4);
  y += Math.max(16, summary.length * 5 + 6);

  // ---------- Pension Gap ----------
  y = sectionTitle(doc, y + 4, "Pension Gap Analysis");
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const rows: [string, string][] = [
    ["Current Salary", fmt(profile?.currentSalary || 0)],
    ["Projected Pension", fmt(profile?.pensionProjection || 0)],
    ["Monthly Gap", fmt(report.pensionGap)],
  ];
  rows.forEach(([label, value]) => {
    y = ensureSpace(doc, y, 7);
    doc.setTextColor(90);
    doc.text(label, MARGIN, y);
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.text(value, PAGE_W - MARGIN, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 6;
  });
  y += 2;
  if (report.inflationNote) {
    doc.setFont("helvetica", "italic");
    doc.setTextColor(120);
    const noteLines = doc.splitTextToSize(`⚠ ${report.inflationNote}`, CONTENT_W);
    y = ensureSpace(doc, y, noteLines.length * 5);
    doc.text(noteLines, MARGIN, y);
    y += noteLines.length * 5 + 4;
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "normal");
  }

  // ---------- Top Ideas ----------
  if (report.topIdeas.length > 0) {
    y = sectionTitle(doc, y + 2, "Recommended Business Ideas");
    doc.setFontSize(10);
    report.topIdeas.forEach((idea, i) => {
      y = ensureSpace(doc, y, 14);
      doc.setFont("helvetica", "bold");
      doc.text(`${i + 1}. ${idea.title}`, MARGIN, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(46, 139, 87);
      doc.text(`${fmt(idea.projectedIncome)}/mo`, PAGE_W - MARGIN, y, {
        align: "right",
      });
      doc.setTextColor(20, 20, 20);
      y += 5;
      if (idea.description) {
        const descLines = doc.splitTextToSize(idea.description, CONTENT_W - 4);
        y = ensureSpace(doc, y, descLines.length * 4.5);
        doc.setFontSize(9);
        doc.setTextColor(90);
        doc.text(descLines, MARGIN + 4, y);
        doc.setTextColor(20, 20, 20);
        doc.setFontSize(10);
        y += descLines.length * 4.5 + 2;
      }
    });
    y += 2;
  }

  // ---------- Next Steps ----------
  if (report.nextSteps.length > 0) {
    y = sectionTitle(doc, y + 2, "Your Next Steps");
    doc.setFontSize(10);
    report.nextSteps.forEach((step, i) => {
      const lines = doc.splitTextToSize(`${i + 1}. ${step}`, CONTENT_W - 4);
      y = ensureSpace(doc, y, lines.length * 5 + 1);
      doc.text(lines, MARGIN, y);
      y += lines.length * 5 + 1;
    });
  }

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Reignite • AI Retirement & Career Transition • Page ${p} of ${pageCount}`,
      PAGE_W / 2,
      PAGE_H - 8,
      { align: "center" }
    );
  }

  const safe = (profile?.fullName || "report").replace(/[^\w\d-]+/g, "_").slice(0, 50);
  doc.save(`reignite_report_${safe}.pdf`);
}
