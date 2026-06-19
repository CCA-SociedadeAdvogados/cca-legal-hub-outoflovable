// Extração de texto de documentos (PDF / Word .docx / texto), partilhada.
// Reaproveita a abordagem comprovada do parse-contract.

interface PdfTextItem {
  str: string;
}
interface PdfPage {
  getTextContent(): Promise<{ items: PdfTextItem[] }>;
}
interface PdfDocument {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfPage>;
}
interface PdfjsModule {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument(params: { data: Uint8Array }): { promise: Promise<PdfDocument> };
}

export async function extractTextFromPDF(fileBytes: Uint8Array): Promise<string> {
  const pdfjs = (await import(
    "https://esm.sh/pdfjs-dist@4.8.69/build/pdf.min.mjs?external=canvas"
  )) as unknown as PdfjsModule;
  // Worker raw do jsDelivr (o esm.sh com ?external=canvas devolvia 404 no worker).
  pdfjs.GlobalWorkerOptions.workerSrc =
    "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs";

  const pdf = await pdfjs.getDocument({ data: fileBytes }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((it) => it.str).join(" "));
  }
  return pages.join("\n\n");
}

function extractTextFromXml(xml: string): string {
  const withBreaks = xml.replace(/<\/w:p>/g, "\n");
  const allText: string[] = [];
  const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(withBreaks)) !== null) {
    allText.push(m[1]);
  }
  const decode = (s: string) =>
    s
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  return allText.map(decode).join("").replace(/\n{3,}/g, "\n\n").trim();
}

export async function extractTextFromWord(fileBytes: Uint8Array): Promise<string> {
  const { BlobReader, ZipReader, TextWriter } = await import(
    "https://deno.land/x/zipjs@v2.7.32/index.js"
  );
  const blob = new Blob([fileBytes]);
  const zipReader = new ZipReader(new BlobReader(blob));
  const entries = await zipReader.getEntries();
  const documentEntry = entries.find(
    (e: { filename: string }) =>
      e.filename === "word/document.xml" || e.filename === "word\\document.xml",
  );
  if (!documentEntry || !documentEntry.getData) {
    throw new Error("Ficheiro Word inválido: document.xml não encontrado");
  }
  const xmlContent = await documentEntry.getData(new TextWriter());
  await zipReader.close();
  return extractTextFromXml(xmlContent);
}

/**
 * Extrai texto de um ficheiro com base no nome/mime. Devolve "" para tipos não
 * suportados ou em caso de falha (não lança — a indexação deve ser tolerante).
 */
export async function extractText(
  fileBytes: Uint8Array,
  fileName: string,
  mimeType?: string | null,
): Promise<string> {
  const lower = (fileName ?? "").toLowerCase();
  try {
    if (mimeType === "application/pdf" || lower.endsWith(".pdf")) {
      return await extractTextFromPDF(fileBytes);
    }
    if (lower.endsWith(".docx")) {
      return await extractTextFromWord(fileBytes);
    }
    if (mimeType?.startsWith("text/") || lower.endsWith(".txt") || lower.endsWith(".csv")) {
      return new TextDecoder().decode(fileBytes);
    }
    // .doc antigo e outros formatos: não suportados
    return "";
  } catch (e) {
    console.warn(`[extractText] Falha a extrair ${fileName}:`, e instanceof Error ? e.message : e);
    return "";
  }
}
