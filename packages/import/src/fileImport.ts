import * as mammoth from "mammoth";
import { parseTextResume, type ParsedTextResume } from "@ccrm/parser";

export type ResumeImportFileKind = "plain-text" | "docx" | "pdf" | "unsupported";

export type BrowserResumeFile = Blob & {
  name: string;
  type: string;
};

export type ResumeTextExtraction = {
  kind: ResumeImportFileKind;
  fileName: string;
  text: string;
  warnings: string[];
};

export type ResumeFileImportResult = {
  extraction: ResumeTextExtraction;
  parsed: ParsedTextResume;
};

export class UnsupportedResumeFileError extends Error {
  constructor(
    readonly kind: ResumeImportFileKind,
    readonly fileName: string,
    message = `Unsupported resume file: ${fileName}`
  ) {
    super(message);
    this.name = "UnsupportedResumeFileError";
  }
}

export async function importResumeFromBrowserFile(
  file: BrowserResumeFile,
  importedAt = new Date()
): Promise<ResumeFileImportResult> {
  const extraction = await extractTextFromBrowserFile(file);
  const parsed = parseTextResume({
    text: extraction.text,
    fileName: extraction.fileName,
    importedAt
  });

  return {
    extraction,
    parsed: {
      ...parsed,
      warnings: [...extraction.warnings, ...parsed.warnings]
    }
  };
}

export async function extractTextFromBrowserFile(
  file: BrowserResumeFile
): Promise<ResumeTextExtraction> {
  const kind = detectResumeFileKind(file.name, file.type);

  if (kind === "plain-text") {
    return {
      kind,
      fileName: file.name,
      text: await file.text(),
      warnings: []
    };
  }

  if (kind === "docx") {
    const result = await mammoth.extractRawText({
      arrayBuffer: await file.arrayBuffer()
    });

    return {
      kind,
      fileName: file.name,
      text: normalizeExtractedText(result.value),
      warnings: normalizeMammothMessages(result.messages)
    };
  }

  if (kind === "pdf") {
    throw new UnsupportedResumeFileError(
      kind,
      file.name,
      "PDF extraction is not implemented in the browser importer yet."
    );
  }

  throw new UnsupportedResumeFileError(kind, file.name);
}

export function detectResumeFileKind(fileName: string, mimeType = ""): ResumeImportFileKind {
  const lowerName = fileName.toLowerCase();
  const lowerMime = mimeType.toLowerCase();

  if (
    lowerMime.startsWith("text/") ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".md") ||
    lowerName.endsWith(".csv")
  ) {
    return "plain-text";
  }

  if (
    lowerMime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lowerName.endsWith(".docx")
  ) {
    return "docx";
  }

  if (lowerMime === "application/pdf" || lowerName.endsWith(".pdf")) {
    return "pdf";
  }

  return "unsupported";
}

function normalizeExtractedText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function normalizeMammothMessages(messages: Array<{ message?: string }> | undefined): string[] {
  return (messages ?? [])
    .map((message) => message.message)
    .filter((message): message is string => Boolean(message));
}
