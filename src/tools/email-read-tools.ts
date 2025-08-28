import { z } from "zod";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { GmailClientWrapper } from "../client-wrapper.js";
import { extractEmailContent, getAttachments, GmailMessagePart } from "../utils.js";
import * as fs from 'fs';
import * as path from 'path';

// File saving function
async function saveEmailToFile(email: any, noLinks: boolean = false): Promise<string> {
  try {
    // Extract date from email timestamp for directory structure
    let dateStr = new Date().toISOString().split('T')[0]; // fallback to today
    if (email.timestamp && typeof email.timestamp === 'string') {
      const match = email.timestamp.match(/(\d{4}-\d{2}-\d{2})/);
      if (match) {
        dateStr = match[1];
      }
    }
    
    const outputDir = path.join(process.cwd(), 'emails_output', dateStr);
    
    // Ensure directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Create new filename format: [email]-Subject Date.md
    const filename = createSafeFilename(email);
    const filePath = path.join(outputDir, filename);
    
    // Format email content as Markdown
    const markdownContent = formatEmailAsMarkdown(email, noLinks);
    
    // Write file
    fs.writeFileSync(filePath, markdownContent, 'utf-8');
    
    return filePath;
  } catch (error) {
    console.error('Error saving email to file:', error);
    throw new Error(`Failed to save email to file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Convert HTML to Markdown
function htmlToMarkdown(html: string): string {
  if (!html || typeof html !== 'string') return '';
  
  let markdown = html;
  
  // Convert links: <a href="url">text</a> → [text](url)
  markdown = markdown.replace(/<a[^>]*href=['"]([^'"]*)['"][^>]*>([^<]*)<\/a>/gi, '[$2]($1)');
  
  // Convert headers: <h1-6> → # Header
  markdown = markdown.replace(/<h([1-6])[^>]*>([^<]*)<\/h[1-6]>/gi, (match, level, text) => {
    return '\n' + '#'.repeat(parseInt(level)) + ' ' + text.trim() + '\n\n';
  });
  
  // Convert paragraphs: <p> → double newlines
  markdown = markdown.replace(/<p[^>]*>([^<]*)<\/p>/gi, '\n\n$1\n\n');
  
  // Convert line breaks: <br> → single newline
  markdown = markdown.replace(/<br[^>]*\/?>/gi, '\n');
  
  // Convert bold: <strong> or <b> → **text**
  markdown = markdown.replace(/<(strong|b)[^>]*>([^<]*)<\/(strong|b)>/gi, '**$2**');
  
  // Convert italic: <em> or <i> → *text*
  markdown = markdown.replace(/<(em|i)[^>]*>([^<]*)<\/(em|i)>/gi, '*$2*');
  
  // Remove remaining HTML tags
  markdown = markdown.replace(/<[^>]*>/g, '');
  
  // Decode common HTML entities
  markdown = markdown.replace(/&amp;/g, '&')
                   .replace(/&lt;/g, '<')
                   .replace(/&gt;/g, '>')
                   .replace(/&quot;/g, '"')
                   .replace(/&#39;/g, "'")
                   .replace(/&nbsp;/g, ' ');
  
  // Clean up excessive whitespace and newlines
  markdown = markdown.replace(/\n{3,}/g, '\n\n')  // Max 2 consecutive newlines
                   .replace(/[ \t]+\n/g, '\n')    // Remove trailing spaces
                   .trim();                       // Remove leading/trailing whitespace
  
  // Apply additional whitespace cleaning
  markdown = cleanWhitespace(markdown);
  
  return markdown;
}

// Clean excessive whitespace - conservative approach
function cleanWhitespace(text: string): string {
  return text
    .split('\n')
    .map(line => {
      // Only remove excessive leading spaces (20+ spaces) but preserve normal indentation
      if (line.match(/^\s{20,}/)) {
        return line.replace(/^\s+/, '');
      }
      
      // For lines with moderate leading spaces, keep them as they might be intentional formatting
      // Only clean up excessive internal spaces (10+ consecutive spaces)
      return line.replace(/\s{10,}/g, ' ');
    })
    .join('\n')
    // Remove lines that are only whitespace (but keep normal empty lines)
    .replace(/^\s+$/gm, '')
    // Limit consecutive empty lines to maximum 2
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

// Check if content is HTML
function isHtmlContent(content: string): boolean {
  if (!content) return false;
  // Simple check for HTML tags
  return /<[^>]+>/.test(content);
}

// Extract email address from "Name <email@domain.com>" format
function extractEmailAddress(fromField: string): string {
  if (!fromField) return 'unknown';
  
  // Match email in angle brackets: Name <email@domain.com>
  const match = fromField.match(/<([^>]+@[^>]+)>/);
  if (match) {
    return match[1];
  }
  
  // If no brackets, check if the whole string is an email
  if (fromField.includes('@')) {
    return fromField.trim();
  }
  
  return 'unknown';
}

// Create safe filename from subject and email
function createSafeFilename(email: any): string {
  const emailAddress = extractEmailAddress(email.from || '');
  const subject = (email.subject || 'No Subject')
    .replace(/[<>:"/\\|?*\[\]]/g, '') // Remove invalid filename characters
    .replace(/\s+/g, ' ')             // Normalize spaces
    .trim()
    .substring(0, 100);               // Limit length
  
  // Extract date from timestamp: "2025-08-28 10:00:24 GMT+02:00" → "2025-08-28"
  let dateStr = 'unknown-date';
  if (email.timestamp && typeof email.timestamp === 'string') {
    const match = email.timestamp.match(/(\d{4}-\d{2}-\d{2})/);
    if (match) {
      dateStr = match[1];
    }
  }
  
  return `[${emailAddress}]-${subject} ${dateStr}.md`;
}

// Convert HTML to plain text without links
function htmlToPlainText(html: string): string {
  if (!html || typeof html !== 'string') return '';
  
  let text = html;
  
  // Extract text from Markdown links: [text](url) → text
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  
  // Extract link text only (remove URLs): <a href="url">text</a> → text
  text = text.replace(/<a[^>]*href=['"]([^'"]*)['"][^>]*>([^<]*)<\/a>/gi, '$2');
  
  // Convert headers to plain text
  text = text.replace(/<h([1-6])[^>]*>([^<]*)<\/h[1-6]>/gi, '\n\n$2\n\n');
  
  // Convert paragraphs: <p> → double newlines
  text = text.replace(/<p[^>]*>([^<]*)<\/p>/gi, '\n\n$1\n\n');
  
  // Convert line breaks: <br> → single newline
  text = text.replace(/<br[^>]*\/?>/gi, '\n');
  
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]*>/g, '');
  
  // Decode common HTML entities
  text = text.replace(/&amp;/g, '&')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&quot;/g, '"')
             .replace(/&#39;/g, "'")
             .replace(/&nbsp;/g, ' ');
  
  // Clean up excessive whitespace and newlines
  text = text.replace(/\n{3,}/g, '\n\n')  // Max 2 consecutive newlines
             .replace(/[ \t]+\n/g, '\n')    // Remove trailing spaces
             .trim();                       // Remove leading/trailing whitespace
  
  // Apply additional whitespace cleaning
  text = cleanWhitespace(text);
  
  return text;
}

// Format email as Markdown
function formatEmailAsMarkdown(email: any, noLinks: boolean = false): string {
  const attachmentsList = email.attachments && email.attachments.length > 0 
    ? '\n\n## Attachments\n\n' + email.attachments.map((att: any) => `- **${att.filename}** (${att.mimeType})`).join('\n')
    : '';
    
  const ccField = email.cc && email.cc.length > 0 ? `**CC:** ${Array.isArray(email.cc) ? email.cc.join(', ') : email.cc}\n` : '';
  
  // Convert HTML content based on noLinks flag
  let content = email.content || 'No content available';
  if (isHtmlContent(content)) {
    content = noLinks ? htmlToPlainText(content) : htmlToMarkdown(content);
  }
  
  // Apply no_links processing to all content (HTML and plain text)
  if (noLinks) {
    // Remove Markdown links: [text](url) → text
    content = content.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  }
  
  return `# Email

**Subject:** ${email.subject || 'No Subject'}
**From:** ${email.from || 'Unknown'}
${ccField}
---

${content}${attachmentsList}
`;
}

// Schema definition
const ReadEmailSchema = z.object({
  messageId: z.string().describe("ID of the email message to retrieve"),
  save_to_file: z.boolean().optional().default(false).describe("Save email content to file instead of displaying in chat"),
  display_in_chat: z.boolean().optional().default(true).describe("Display email content in chat (overridden by save_to_file)"),
  no_links: z.boolean().optional().default(false).describe("Save email content as plain text without links (only when save_to_file=true)"),
});

export const readEmailTool: Tool = {
  name: "read_email",
  description: "Read a specific email by ID and extract its content",
  inputSchema: {
    type: "object",
    properties: {
      messageId: {
        type: "string",
        description: "ID of the email message to retrieve"
      },
      save_to_file: {
        type: "boolean",
        description: "Save email content to file instead of displaying in chat"
      },
      display_in_chat: {
        type: "boolean", 
        description: "Display email content in chat (overridden by save_to_file)"
      },
      no_links: {
        type: "boolean",
        description: "Save email content as plain text without links (only when save_to_file=true)"
      }
    },
    required: ["messageId"]
  },
  handler: async (client: GmailClientWrapper, params: { 
    messageId: string; 
    save_to_file?: boolean; 
    display_in_chat?: boolean;
    no_links?: boolean; 
  }) => {
    const email = await client.getMessage(params.messageId);
    
    // Determine behavior based on parameters
    const shouldSaveToFile = params.save_to_file || false;
    const shouldDisplayInChat = shouldSaveToFile ? false : (params.display_in_chat !== false);
    const noLinks = params.no_links || false;
    
    // Base metadata that's always returned
    const baseResponse = {
      messageId: email.messageId,
      threadId: email.threadId,
      subject: email.subject,
      from: email.from,
      to: email.to,
      cc: email.cc,
      isUnread: email.labels?.includes('UNREAD') || false,
      isInInbox: email.labels?.includes('INBOX') || false,
      category: email.category,
      labels: email.labels,
      success: true
    };
    
    if (shouldSaveToFile) {
      // Save to file mode - return metadata + file path
      try {
        const filePath = await saveEmailToFile(email, noLinks);
        return {
          ...baseResponse,
          file_path: filePath,
          saved_to_file: true,
          message: `Email saved to file: ${filePath}`,
          attachments: email.attachments?.map((a: any) => ({
            filename: a.filename,
            mimeType: a.mimeType
          }))
        };
      } catch (error) {
        // Fallback to normal display if save fails
        console.error('Failed to save email to file:', error);
        return {
          ...baseResponse,
          content: email.content,
          saved_to_file: false,
          message: `Failed to save to file, displaying content instead: ${error instanceof Error ? error.message : String(error)}`,
          attachments: email.attachments?.map((a: any) => ({
            filename: a.filename,
            mimeType: a.mimeType
          }))
        };
      }
    } else {
      // Normal display mode - return full content
      return {
        ...baseResponse,
        content: email.content,
        saved_to_file: false,
        message: "Email content displayed in chat",
        attachments: email.attachments?.map((a: any) => ({
          filename: a.filename,
          mimeType: a.mimeType
        }))
      };
    }
  }
}; 