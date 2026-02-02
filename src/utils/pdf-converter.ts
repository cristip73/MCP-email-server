import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';

/**
 * Clean and normalize text extracted from PDF with safer whitespace handling
 */
function cleanText(text: string): string {
  // Step 1: Protect URLs and email addresses from modification
  const urlMap: Map<string, string> = new Map();
  let urlCounter = 0;
  
  // Match URLs (http/https) and email addresses
  const urlRegex = /(?:https?:\/\/[^\s\]]+|\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b)/g;
  text = text.replace(urlRegex, (match) => {
    const placeholder = `<<<URL_${urlCounter++}>>>`;
    urlMap.set(placeholder, match);
    return placeholder;
  });

  // Step 2: Undo hyphenation at line breaks like "word-\nnext"
  text = text.replace(/-\s*\n/g, '');

  // Step 3: Preserve double newlines as paragraph markers
  const PARA = '<<<__PARA__>>>';
  text = text.replace(/\n{2,}/g, PARA);

  // Step 4: Collapse single newlines to spaces
  text = text.replace(/\n/g, ' ');

  // Step 5: Fix missing spaces after punctuation and before capital letters (but not in URLs)
  text = text.replace(/([.!?])([A-ZĂÂÎȘȚ])/g, '$1 $2');
  
  // Step 6: Fix missing spaces between lowercase and uppercase letters  
  text = text.replace(/([a-zăâîșț])([A-ZĂÂÎȘȚ])/g, '$1 $2');
  
  // Step 7: Fix specific Romanian word boundaries (CAREFUL - only safe ones)
  text = text.replace(/\bul([A-ZĂÂÎȘȚ])/g, 'ul $1');
  // REMOVED problematic "că" regex that breaks "către"
  text = text.replace(/\bsă([îi])/g, 'să $1');
  
  // Step 8: Restore paragraph breaks
  text = text.replace(new RegExp(PARA, 'g'), '\n\n');

  // Step 9: Collapse excessive whitespace
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s+\n/g, '\n\n');
  
  // Step 10: Fix spacing around punctuation (but exclude dots that are part of URLs/decimals)
  text = text.replace(/\s+([,!?;:])/g, '$1');
  // Only add space after punctuation if it's followed by a letter and not part of URL pattern
  text = text.replace(/([,!?;:])\s*([a-zA-ZăâîșțĂÂÎȘȚ])/g, '$1 $2');

  // Step 11: Restore protected URLs
  for (const [placeholder, originalUrl] of urlMap) {
    text = text.replace(placeholder, originalUrl);
  }

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

  // Enhanced per-page renderer to extract both text and links
  const renderPage = (page: any) => {
    const renderOptions = {
      normalizeWhitespace: false,
      disableCombineTextItems: false,
    };

    // Get both text content and annotations (links)
    const textPromise = page.getTextContent(renderOptions);
    const annotationsPromise = page.getAnnotations().catch(() => []); // Handle if no annotations

    return Promise.all([textPromise, annotationsPromise]).then(([tc, annotations]: [any, any[]]) => {
      // Build text with line breaks
      let lastY: number | undefined;
      let text = '';
      const textItems: Array<{str: string, x: number, y: number, width: number, height: number}> = [];
      
      for (const item of tc.items) {
        const y = item.transform?.[5];
        const x = item.transform?.[4];
        const width = item.width || 0;
        const height = item.height || 0;
        
        // Store text item with position for link matching
        textItems.push({
          str: item.str,
          x: x || 0,
          y: y || 0, 
          width: width,
          height: height
        });
        
        if (lastY === y || lastY == null) {
          text += item.str;
        } else {
          text += '\n' + item.str;
        }
        lastY = y;
      }

      // Process links and add them to the text
      let finalText = text;
      
      if (verbose) console.error(`Found ${annotations.length} annotations`);
      
      for (const annotation of annotations) {
        if (annotation.subtype === 'Link' && annotation.url) {
          if (verbose) console.error(`Link found: ${annotation.url} at rect: ${annotation.rect}`);
          
          const [x1, y1, x2, y2] = annotation.rect || [];
          
          // Find text items that overlap with link rectangle
          const overlappingTexts = textItems.filter(item => {
            const itemRight = item.x + item.width;
            const itemTop = item.y + item.height;
            
            // More lenient overlap detection
            const overlap = !(item.x > x2 + 10 || itemRight < x1 - 10 || item.y > y2 + 10 || itemTop < y1 - 10);
            return overlap;
          });
          
          if (overlappingTexts.length > 0) {
            const linkText = overlappingTexts.map(item => item.str).join('').trim();
            if (verbose) console.error(`Link text found: "${linkText}"`);
            
            if (linkText) {
              // Replace the text with Markdown link format
              const markdownLink = `[${linkText}](${annotation.url})`;
              finalText = finalText.replace(linkText, markdownLink);
              if (verbose) console.error(`Replaced "${linkText}" with "${markdownLink}"`);
            }
          } else {
            // If no overlapping text found, append the link at the end
            if (verbose) console.error(`No overlapping text found for link ${annotation.url}, appending to text`);
            finalText += `\n\n[Link](${annotation.url})`;
          }
        }
      }

      pageCounter += 1;
      return `\n\n## Page ${pageCounter}\n\n${finalText}\n`;
    });
  };

  const pdfOptions = {
    pagerender: renderPage,
    max: 0, // all pages
  };

  if (verbose) console.error(`Converting PDF: ${filename}`);

  let data: any;
  try {
    // Use createRequire to properly import CommonJS module in ES context
    const require = createRequire(import.meta.url);
    const pdfParse = require('pdf-parse');
    data = await pdfParse(pdfBuffer, pdfOptions);
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

  // Process the full text (no hardcoded links - they should be extracted from PDF annotations)
  let fullText = data.text;

  // Clean and structure the text
  const cleaned = cleanText(fullText);
  
  // Split into reasonable paragraphs
  const paragraphs = cleaned.split(/\n{2,}/);
  for (const p of paragraphs) {
    const para = p.trim();
    if (!para) continue;
    
    // Skip page headers we already added
    if (para.match(/^## Page \d+$/)) continue;
    
    mdLines.push(para);
    mdLines.push('');
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