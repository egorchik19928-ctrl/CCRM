import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun
} from "docx";
import { jsPDF } from "jspdf";
import type { CorporateResumeDocument } from "./corporateDocument";

export type ResumeExportFormat = "txt" | "docx" | "pdf";

export function renderCorporateResumeText(document: CorporateResumeDocument): string {
  const lines = [
    document.companyName,
    document.title,
    document.subtitle,
    "",
    ...document.sections.flatMap((section) => [
      section.title.toUpperCase(),
      ...section.lines.map((line) => `- ${line}`),
      ""
    ])
  ];

  return lines.filter((line, index) => line !== undefined && !(line === "" && index === 0)).join("\n");
}

export async function renderCorporateResumeDocx(
  document: CorporateResumeDocument
): Promise<Blob> {
  const docxDocument = new Document({
    creator: "CCRM",
    title: document.title,
    description: `${document.companyName} corporate resume`,
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: document.companyName,
            heading: HeadingLevel.HEADING_2
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: document.title,
                bold: true,
                size: 36,
                color: stripHex(document.branding.secondaryColor)
              })
            ]
          }),
          ...(document.subtitle
            ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: document.subtitle,
                      color: stripHex(document.branding.primaryColor)
                    })
                  ]
                })
              ]
            : []),
          ...document.sections.flatMap((section) => [
            new Paragraph({
              text: section.title,
              heading: HeadingLevel.HEADING_3
            }),
            ...section.lines.map(
              (line) =>
                new Paragraph({
                  bullet: {
                    level: 0
                  },
                  children: [new TextRun(line)]
                })
            )
          ])
        ]
      }
    ]
  });

  return Packer.toBlob(docxDocument);
}

export function renderCorporateResumePdf(document: CorporateResumeDocument): Blob {
  const pdf = new jsPDF();
  const margin = 18;
  const pageHeight = pdf.internal.pageSize.getHeight();
  const maxWidth = pdf.internal.pageSize.getWidth() - margin * 2;
  let y = 20;

  const writeLine = (text: string, options: { size?: number; bold?: boolean } = {}) => {
    pdf.setFont("helvetica", options.bold ? "bold" : "normal");
    pdf.setFontSize(options.size ?? 11);

    for (const line of pdf.splitTextToSize(text, maxWidth)) {
      if (y > pageHeight - 18) {
        pdf.addPage();
        y = 20;
      }

      pdf.text(line, margin, y);
      y += (options.size ?? 11) * 0.45 + 3;
    }
  };

  writeLine(document.companyName, { size: 12, bold: true });
  writeLine(document.title, { size: 20, bold: true });

  if (document.subtitle) {
    writeLine(document.subtitle, { size: 12 });
  }

  y += 4;

  for (const section of document.sections) {
    writeLine(section.title, { size: 14, bold: true });
    for (const line of section.lines) {
      writeLine(`- ${line}`);
    }
    y += 3;
  }

  return pdf.output("blob");
}

function stripHex(color: string): string {
  return color.replace(/^#/, "");
}
