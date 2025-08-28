import { z } from "zod";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { GmailClientWrapper } from "../client-wrapper.js";
import { extractEmailContent, getAttachments, GmailMessagePart } from "../utils.js";
import * as fs from 'fs';
import * as path from 'path';

// File saving function
async function saveEmailToFile(email: any): Promise<string> {
  try {
    // Create output directory structure: emails_output/YYYY-MM-DD/
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timestamp = now.toISOString().replace(/[:]/g, '-').split('.')[0]; // YYYY-MM-DDTHH-MM-SS
    
    const outputDir = path.join(process.cwd(), 'emails_output', dateStr);
    
    // Ensure directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Create filename: email-{messageId}-{timestamp}.md
    const filename = `email-${email.messageId}-${timestamp}.md`;
    const filePath = path.join(outputDir, filename);
    
    // Format email content as Markdown
    const markdownContent = formatEmailAsMarkdown(email);
    
    // Write file
    fs.writeFileSync(filePath, markdownContent, 'utf-8');
    
    return filePath;
  } catch (error) {
    console.error('Error saving email to file:', error);
    throw new Error(`Failed to save email to file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Format email as Markdown
function formatEmailAsMarkdown(email: any): string {
  const attachmentsList = email.attachments && email.attachments.length > 0 
    ? '\n\n## Attachments\n\n' + email.attachments.map((att: any) => `- **${att.filename}** (${att.mimeType})`).join('\n')
    : '';
    
  const ccField = email.cc && email.cc.length > 0 ? `**CC:** ${Array.isArray(email.cc) ? email.cc.join(', ') : email.cc}\n` : '';
  
  return `# Email: ${email.subject || 'No Subject'}

**From:** ${email.from || 'Unknown'}
**To:** ${Array.isArray(email.to) ? email.to.join(', ') : email.to || 'Unknown'}
${ccField}**Message ID:** ${email.messageId}
**Thread ID:** ${email.threadId || 'N/A'}
**Category:** ${email.category || 'N/A'}
**Labels:** ${Array.isArray(email.labels) ? email.labels.join(', ') : email.labels || 'None'}
**Status:** ${email.isUnread ? 'Unread' : 'Read'} | ${email.isInInbox ? 'Inbox' : 'Archived'}

---

${email.content || 'No content available'}${attachmentsList}
`;
}

// Schema definition
const ReadEmailSchema = z.object({
  messageId: z.string().describe("ID of the email message to retrieve"),
  save_to_file: z.boolean().optional().default(false).describe("Save email content to file instead of displaying in chat"),
  display_in_chat: z.boolean().optional().default(true).describe("Display email content in chat (overridden by save_to_file)"),
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
      }
    },
    required: ["messageId"]
  },
  handler: async (client: GmailClientWrapper, params: { 
    messageId: string; 
    save_to_file?: boolean; 
    display_in_chat?: boolean; 
  }) => {
    const email = await client.getMessage(params.messageId);
    
    // Determine behavior based on parameters
    const shouldSaveToFile = params.save_to_file || false;
    const shouldDisplayInChat = shouldSaveToFile ? false : (params.display_in_chat !== false);
    
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
        const filePath = await saveEmailToFile(email);
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