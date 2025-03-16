// Email message creation utility
export interface EmailOptions {
  to: string[];
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
  inReplyTo?: string;
  references?: string[];
  threadId?: string;
  from?: string;
}

export function createEmailMessage(args: EmailOptions) {
  const fromHeader = args.from ? `From: ${args.from}\r\n` : '';
  const toHeader = `To: ${args.to.join(', ')}\r\n`;
  const ccHeader = args.cc && args.cc.length > 0 ? `Cc: ${args.cc.join(', ')}\r\n` : '';
  const bccHeader = args.bcc && args.bcc.length > 0 ? `Bcc: ${args.bcc.join(', ')}\r\n` : '';
  const subjectHeader = `Subject: ${args.subject}\r\n`;
  const contentType = 'Content-Type: text/plain; charset=utf-8\r\n';
  const inReplyToHeader = args.inReplyTo ? `In-Reply-To: <${args.inReplyTo}>\r\n` : '';
  const referencesHeader = args.references && args.references.length > 0 
    ? `References: ${args.references.map(ref => `<${ref}>`).join(' ')}\r\n` 
    : '';
  
  const message = 
    fromHeader +
    toHeader +
    ccHeader +
    bccHeader +
    subjectHeader +
    contentType +
    inReplyToHeader +
    referencesHeader +
    '\r\n' +
    args.body;
  
  return message;
}

// Gmail message part interface
export interface GmailMessagePart {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: Array<{
    name: string;
    value: string;
  }>;
  body?: {
    attachmentId?: string;
    size?: number;
    data?: string;
  };
  parts?: GmailMessagePart[];
}

// Email content interface
export interface EmailContent {
  text: string;
  html: string;
}

// Email attachment interface
export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

// Extract email content from MIME message parts
export function extractEmailContent(messagePart: GmailMessagePart): EmailContent {
  // Initialize containers for different content types
  let textContent = '';
  let htmlContent = '';

  // If the part has a body with data, process it based on MIME type
  if (messagePart.body && messagePart.body.data) {
    const content = Buffer.from(messagePart.body.data, 'base64').toString('utf8');

    // Store content based on its MIME type
    if (messagePart.mimeType === 'text/plain') {
      textContent = content;
    } else if (messagePart.mimeType === 'text/html') {
      htmlContent = content;
    }
  }

  // If the part has nested parts, recursively process them
  if (messagePart.parts && messagePart.parts.length > 0) {
    for (const part of messagePart.parts) {
      const { text, html } = extractEmailContent(part);
      if (text) textContent += text;
      if (html) htmlContent += html;
    }
  }

  // Return both plain text and HTML content
  return { text: textContent, html: htmlContent };
}

// Get attachment information from message parts
export function getAttachments(messagePart: GmailMessagePart): EmailAttachment[] {
  const attachments: EmailAttachment[] = [];
  
  const processAttachmentParts = (part: GmailMessagePart) => {
    if (part.body && part.body.attachmentId) {
      const filename = part.filename || `attachment-${part.body.attachmentId}`;
      attachments.push({
        id: part.body.attachmentId,
        filename: filename,
        mimeType: part.mimeType || 'application/octet-stream',
        size: part.body.size || 0
      });
    }

    if (part.parts) {
      part.parts.forEach((subpart: GmailMessagePart) => processAttachmentParts(subpart));
    }
  };

  processAttachmentParts(messagePart);
  return attachments;
}

// Format date for Gmail query based on hours ago
export function getDateQuery(hoursAgo: number): string {
  const date = new Date();
  date.setHours(date.getHours() - hoursAgo);
  return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
}

// Get today's date for Gmail query
export function getTodayDateQuery(): string {
  return new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD
}

// Format specific date for Gmail query (accepts YYYY-MM-DD format)
export function formatDateForQuery(date: string): string {
  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Date must be in YYYY-MM-DD format');
  }
  return date;
} 