import { format } from "date-fns";

import type { applications } from "@/db/schema";
import { APPLICATION_STATUS_CONFIG } from "@/modules/applications/constants";

type ApplicationRow = typeof applications.$inferSelect;

function applicationBaseName(): string {
  return `job-applications-${format(new Date(), "yyyy-MM-dd")}`;
}

function isClickableUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export async function exportToPdf(applicationsList: ApplicationRow[]): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text("Job Applications", margin, 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(115, 115, 115);
  doc.text(
    `${applicationsList.length} application${applicationsList.length === 1 ? "" : "s"} · Exported ${format(new Date(), "PPP")}`,
    margin,
    55
  );

  autoTable(doc, {
    startY: 70,
    margin: { left: margin, right: margin },
    theme: "grid",
    head: [["Company", "Position", "Status", "Location", "Source", "Salary", "Applied", "URL"]],
    body: applicationsList.map((application) => [
      application.company,
      application.position,
      APPLICATION_STATUS_CONFIG[application.status].label,
      application.location ?? "-",
      application.source ?? "-",
      application.salary ?? "-",
      application.appliedAt ? format(application.appliedAt, "MMM d, yyyy") : "-",
      application.url ?? "-",
    ]),
    styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak", textColor: [51, 65, 85] },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 110 },
      1: { cellWidth: 130 },
      2: { cellWidth: 52 },
      3: { cellWidth: 76 },
      4: { cellWidth: 56 },
      5: { cellWidth: 44 },
      6: { cellWidth: 56 },
      7: { cellWidth: contentWidth - 524 },
    },
    willDrawCell: (data) => {
      if (
        data.section === "body" &&
        data.column.index === 7 &&
        typeof data.cell.raw === "string" &&
        isClickableUrl(data.cell.raw)
      ) {
        data.cell.styles.textColor = [37, 99, 235];
      }
    },
    didDrawCell: (data) => {
      if (
        data.section === "body" &&
        data.column.index === 7 &&
        typeof data.cell.raw === "string" &&
        isClickableUrl(data.cell.raw)
      ) {
        doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, {
          url: data.cell.raw,
        });
      }
    },
  });

  const pageCount = doc.getNumberOfPages();
  for (let pageIndex = 1; pageIndex <= pageCount; pageIndex++) {
    doc.setPage(pageIndex);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text("Workly · Job Applications", margin, pageHeight - 24);
    doc.text(`Page ${pageIndex} of ${pageCount}`, pageWidth - margin, pageHeight - 24, {
      align: "right",
    });
  }

  doc.save(`${applicationBaseName()}.pdf`);
}
