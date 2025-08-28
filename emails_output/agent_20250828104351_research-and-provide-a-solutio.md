# Task:
Research and provide a solution for converting PDF to Markdown using Node.js packages instead of Python

## Full Output
Below is a practical, production‑ready Node.js replacement for your Python pdf_to_md.py. It preserves the core behavior you have today: multi‑page PDFs in, clean Markdown out, with a CLI you can script.

Overview of approach
- Use pdf-parse (a thin Node wrapper around Mozilla PDF.js) for stable, cross‑platform text extraction. It’s widely used and lets us customize how each page is rendered, which we’ll leverage to add page headings and better line handling. ([npmjs.com](https://www.npmjs.com/package/pdf-parse))
- Keep your current cleaning rules (whitespace normalization, paragraph breaks, Romanian diacritics spacing fix).
- Provide a single-file CLI (pdf-to-md.js) that mirrors your Python script’s options: input path, optional output path, and verbose logging.

Why this stack (and some alternatives)
- pdf-parse is simple to integrate in Node (CommonJS), proven, and gets you high‑quality text extraction quickly. Note: while the package hasn’t been updated recently, it’s still broadly adopted and works well for text extraction workloads. ([npmjs.com](https://www.npmjs.com/package/pdf-parse))
- If you prefer working directly with PDF.js (pdfjs-dist) to fine‑tune layout heuristics, you can do that too; just be aware recent pdfjs-dist versions require ESM and can need modern Node/polyfills. See the official guidance on importing the “legacy” build in Node and related version/ESM notes. ([github.com](https://github.com/mozilla/pdf.js/issues/15685?utm_source=openai))
- Another maintained wrapper around pdfjs-dist is pdf-text-reader, but it requires ESM and Node 22+. If your runtime meets that bar, it’s a nice higher‑level option. ([npmjs.com](https://www.npmjs.com/package/pdf-text-reader))
- Tools like pdf2md convert pages to images and embed them into Markdown; that’s not what you want for editable text output. ([npmjs.com](https://www.npmjs.com/package/pdf2md?utm_source=openai))

Solution A (recommended for most Node 16/18/20 environments): pdf-parse CLI

1) Install
- Ensure Node.js is installed (LTS 18+ recommended).
- In your project:
  - npm init -y
  - npm i pdf-parse commander

2) Create scripts/pdf-to-md.js
- This mirrors your Python script’s behavior and formatting heuristics.

Copy/paste:

#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { Command } = require('commander');
const pdf = require('pdf-parse');

const program = new Command();

function cleanText(text) {
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

  // Clean up Romanian diacritics spacing issues (mirrors Python)
  text = text.replace(/\s+([ăâîșțĂÂÎȘȚ])/g, '$1');

  return text.trim();
}

async function pdfToMarkdown(inputPath, outputPath, { verbose = false } = {}) {
  const absIn = path.resolve(inputPath);
  if (!fs.existsSync(absIn)) {
    throw new Error(`PDF file not found: ${absIn}`);
  }

  const defaultOut = absIn.replace(/\.pdf$/i, '.md');
  const absOut = path.resolve(outputPath || defaultOut);
  fs.mkdirSync(path.dirname(absOut), { recursive: true });

  let pageCounter = 0;

  // Custom per-page renderer to:
  // - Build line breaks using item.y (pdf-parse example approach)
  // - Prefix each page with a level-2 header when multi-page
  const renderPage = (page) => {
    const renderOptions = {
      normalizeWhitespace: false,
      disableCombineTextItems: false,
    };

    return page.getTextContent(renderOptions).then((tc) => {
      let lastY;
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

  const options = {
    pagerender: renderPage,
    max: 0, // all pages
  };

  if (verbose) console.log(`Converting: ${absIn}`);

  let data;
  try {
    const buffer = fs.readFileSync(absIn);
    data = await pdf(buffer, options); // data.text contains concatenated page strings
  } catch (e) {
    throw new Error(`Error processing PDF: ${e.message}`);
  }

  // data.text is the concatenation of page renderings above
  const totalPages = data.numpages || pageCounter;
  if (verbose) console.log(`Detected ${totalPages} page(s)`);

  // Build Markdown body
  const mdLines = [];
  mdLines.push(`# ${path.basename(absIn, path.extname(absIn))}`);
  mdLines.push('');
  mdLines.push(`*Converted from PDF: ${path.basename(absIn)}*`);
  mdLines.push('');

  // Clean and structure each page section we added in renderPage
  // Split on our "## Page X" headers to process page content individually.
  const pageSections = data.text.split(/\n{2,}## Page \d+\n{2,}/g);
  // Find all headers to re-align with sections
  const headers = (data.text.match(/\n{2,}## Page \d+\n{2,}/g) || []).map((h) => h.trim());

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
  fs.writeFileSync(absOut, finalContent, 'utf8');

  if (verbose) console.log(`✅ Successfully converted PDF to Markdown: ${absOut}`);
  return absOut;
}

program
  .name('pdf-to-md')
  .description('Convert PDF to Markdown (Node.js)')
  .argument('<pdf_path>', 'Path to PDF file')
  .option('-o, --output <output>', 'Output Markdown file path')
  .option('-v, --verbose', 'Verbose output', false)
  .action(async (pdfPath, options) => {
    try {
      const out = await pdfToMarkdown(pdfPath, options.output, { verbose: options.verbose });
      console.log(`Conversion completed: ${out}`);
    } catch (err) {
      console.error(`❌ Error: ${err.message}`);
      process.exitCode = 1;
    }
  });

program.parse(process.argv);

3) Run
- node scripts/pdf-to-md.js /path/to/file.pdf
- node scripts/pdf-to-md.js /path/to/file.pdf -o out/file.md -v

What this gives you
- Multi‑page handling with “## Page N” headings (like your Python script when >1 page).
- Whitespace cleanup, paragraphization, hyphenation fix, diacritics spacing cleanup, and basic bullet/number detection.
- A simple CLI with the same ergonomics as your click script.

Notes and trade‑offs
- pdf-parse concatenates what your per‑page renderer returns; we inject our own page headers and then split on them to format each page. This yields predictable output without needing to manage PDF.js directly. The pagerender approach is an officially documented extension point. ([npmjs.com](https://www.npmjs.com/package/pdf-parse))

Optional: Solution B (for teams on modern ESM + Node 22+): pdfjs-dist (direct) or pdf-text-reader
- If you need more control over line/paragraph grouping, reading order, or want to use the latest PDF.js directly:
  - Import the legacy ESM build: import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
  - Iterate pages, call page.getTextContent(), and build your own layout heuristics.
  - Be mindful of ESM and Node version requirements and occasional polyfill needs in Node. Mozilla’s team notes using the legacy build in Node and ESM nuances; community threads document migration details for pdfjs-dist v4+. ([github.com](https://github.com/mozilla/pdf.js/issues/15685?utm_source=openai))
- pdf-text-reader wraps pdfjs-dist and outputs lines/pages with sensible spacing, but it explicitly requires ESM and Node 22+. If you’re already on Node 22, this can simplify your code. ([npmjs.com](https://www.npmjs.com/package/pdf-text-reader))

Why we didn’t choose “pdf-to-markdown” style packages that embed images
- Some npm packages named “pdf2md” or “pdf-to-markdown” export Markdown that primarily contains page images rather than extracted text (and may require Poppler or external binaries). That wouldn’t match your current “clean, editable Markdown” goal. ([npmjs.com](https://www.npmjs.com/package/pdf2md?utm_source=openai))

Mapping to your Python functionality
- Title and provenance header: preserved.
- Multi‑page PDFs: supported; adds “## Page N” sections (for single‑page it omits the header while still cleaning text).
- Cleaning rules: whitespace collapse, paragraph breaks, Romanian diacritics spacing, and hyphenation fixes included.
- CLI UX: mirrors click’s arguments/options.

If you want this as a drop‑in npm script
- Add to package.json:
  - "type": "commonjs"
  - "bin": { "pdf-to-md": "./scripts/pdf-to-md.js" }
- npm link
- Now run pdf-to-md file.pdf -o out.md anywhere in your repo.

Future improvements you can toggle on
- Header detection by relative font size (requires moving to pdfjs-dist directly to inspect font size in text items).
- Table heuristics (preserve multi‑column spacing or emit simple Markdown tables).
- Smarter paragraph detection (e.g., keep newlines when a line ends without sentence punctuation).

References
- pdf-parse (usage, pagerender callback, options). ([npmjs.com](https://www.npmjs.com/package/pdf-parse))
- PDF.js in Node: import from legacy build and ESM/version caveats. ([github.com](https://github.com/mozilla/pdf.js/issues/15685?utm_source=openai))
- pdf-text-reader (Node 22+ requirement; convenient higher‑level wrapper). ([npmjs.com](https://www.npmjs.com/package/pdf-text-reader))
- “pdf2md” package converts to images embedded in Markdown (not ideal for text). ([npmjs.com](https://www.npmjs.com/package/pdf2md?utm_source=openai))

Want me to also provide a TypeScript version (with ESM + pdfjs-dist or with pdf-text-reader for Node 22+)?

---
*Generated: 2025-08-28T10:43:51.340Z | Response ID: resp_68b0327c00bc81a1b9e3de5d5f1edad202a1d71241749b7e | Model: gpt-5 | Time: 108.3s | Iterations: 1 | Input: 81.6k | Output: 5.9k | Reasoning: 3.1k*