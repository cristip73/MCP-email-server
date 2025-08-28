import * as fs from 'fs';
import * as path from 'path';
import pdf from 'pdf-parse';

/**
 * Clean and normalize text extracted from PDF
 */
function cleanText(text: string): string {
  // Undo hyphenation at line breaks like "word-\nnext" before other joins
  text = text.replace(/-\s*\n/g, '');

  // Preserve double newlines as paragraph markers using a placeholder
  const PARA = '<<<__PARA__>>>';
  text = text.replace(/\n{2,}/g, PARA);

  // Collapse single newlines to spaces
  text = text.replace(/\n+/g, ' ');

  // Restore paragraph breaks
  text = text.replace(new RegExp(PARA, 'g'), '\n\n');

  // Collapse excessive whitespace
  text = text.replace(/\s+/g, ' ');

  // Clean up Romanian diacritics spacing issues
  text = text.replace(/\s+([ăâîșțĂÂÎȘȚ])/g, '$1');

  return text.trim();
}

/**
 * Convert PDF buffer to Markdown string
 */
export async function pdfToMarkdown(
  pdfBuffer: Buffer,
  filename: string,
  options: { verbose?: boolean } = {}
): Promise<string> {
  const { verbose = false } = options;
  
  let pageCounter = 0;

  // Custom per-page renderer to:
  // - Build line breaks using item.y (pdf-parse example approach)
  // - Prefix each page with a level-2 header when multi-page
  const renderPage = (page: any) => {
    const renderOptions = {
      normalizeWhitespace: false,
      disableCombineTextItems: false,
    };

    return page.getTextContent(renderOptions).then((tc: any) => {
      let lastY: number | undefined;
      let text = '';
      for (const item of tc.items) {
        const y = item.transform?.[5];
        if (lastY === y || lastY == null) {
          text += item.str;
        } else {
          text += '\n' + item.str;
        }
        lastY = y;
      }
      pageCounter += 1;
      return `\n\n## Page ${pageCounter}\n\n${text}\n`;
    });
  };

  const pdfOptions = {
    pagerender: renderPage,
    max: 0, // all pages
  };

  if (verbose) console.error(`Converting PDF: ${filename}`);

  let data: any;
  try {
    data = await pdf(pdfBuffer, pdfOptions);
  } catch (e: any) {
    throw new Error(`Error processing PDF: ${e.message}`);
  }

  // data.text is the concatenation of page renderings above
  const totalPages = data.numpages || pageCounter;
  if (verbose) console.error(`Detected ${totalPages} page(s)`);

  // Build Markdown body
  const mdLines: string[] = [];
  const baseFilename = path.basename(filename, path.extname(filename));
  mdLines.push(`# ${baseFilename}`);
  mdLines.push('');
  mdLines.push(`*Converted from PDF: ${path.basename(filename)}*`);
  mdLines.push('');

  // Clean and structure each page section we added in renderPage
  // Split on our "## Page X" headers to process page content individually.
  const pageSections = data.text.split(/\n{2,}## Page \d+\n{2,}/g);
  // Find all headers to re-align with sections
  const headers = (data.text.match(/\n{2,}## Page \d+\n{2,}/g) || []).map((h: string) => h.trim());

  // If a single-page PDF, we won't have inserted a header at all; handle that gracefully
  if (headers.length === 0) {
    const cleaned = cleanText(data.text);
    const paragraphs = cleaned.split(/\n{2,}/);
    for (const p of paragraphs) {
      const para = p.trim();
      if (!para) continue;
      // Preserve list-like lines when they already look like bullets or numbered items
      if (/^(\d+[\)\.]|\-|\•|\u2022)\s+/.test(para)) {
        mdLines.push(para);
      } else {
        mdLines.push(para);
      }
      mdLines.push('');
    }
  } else {
    // Re-zip headers with sections
    for (let i = 0; i < headers.length; i++) {
      mdLines.push(headers[i].replace(/\n+/g, '\n'));
      mdLines.push('');

      const section = pageSections[i + 1] || ''; // first split chunk is preface before first header
      const cleaned = cleanText(section);
      const paragraphs = cleaned.split(/\n{2,}/);
      for (const p of paragraphs) {
        const para = p.trim();
        if (!para) continue;
        if (/^(\d+[\)\.]|\-|\•|\u2022)\s+/.test(para)) {
          mdLines.push(para);
        } else {
          mdLines.push(para);
        }
        mdLines.push('');
      }
    }
  }

  const finalContent = mdLines.join('\n');
  
  if (verbose) console.error(`✅ Successfully converted PDF to Markdown`);
  return finalContent;
}

/**
 * Convert PDF file to Markdown and save to disk
 */
export async function pdfFileToMarkdownFile(
  inputPath: string,
  outputPath?: string,
  options: { verbose?: boolean } = {}
): Promise<string> {
  const { verbose = false } = options;
  
  const absIn = path.resolve(inputPath);
  if (!fs.existsSync(absIn)) {
    throw new Error(`PDF file not found: ${absIn}`);
  }

  const defaultOut = absIn.replace(/\.pdf$/i, '.md');
  const absOut = path.resolve(outputPath || defaultOut);
  fs.mkdirSync(path.dirname(absOut), { recursive: true });

  const pdfBuffer = fs.readFileSync(absIn);
  const markdownContent = await pdfToMarkdown(pdfBuffer, path.basename(absIn), { verbose });
  
  fs.writeFileSync(absOut, markdownContent, 'utf8');
  
  if (verbose) console.error(`✅ Successfully saved Markdown to: ${absOut}`);
  return absOut;
}