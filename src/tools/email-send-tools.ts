import { z } from "zod";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { GmailClientWrapper } from "../client-wrapper.js";
import { 
  createEmailMessage, 
  formatQuotedContent, 
  formatQuotedContentHtml 
} from "../utils.js";

// Schema definition
const SendEmailSchema = z.object({
  to: z.array(z.string()).describe("List of recipient email addresses"),
  subject: z.string().describe("Email subject"),
  body: z.string().describe("Email body content"),
  cc: z.array(z.string()).optional().describe("List of CC recipients"),
  bcc: z.array(z.string()).optional().describe("List of BCC recipients"),
  inReplyTo: z.string().optional().describe("Message ID to reply to"),
  threadId: z.string().optional().describe("Thread ID to add the message to"),
  from: z.string().optional().describe("Specific send-as email address to use as sender"),
});

export const sendEmailTool: Tool = {
  name: "send_email",
  description: "Send a new email message",
  inputSchema: {
    type: "object",
    properties: {
      to: {
        type: "array",
        items: { type: "string" },
        description: "List of recipient email addresses"
      },
      subject: {
        type: "string",
        description: "Email subject"
      },
      body: {
        type: "string",
        description: "Email body content"
      },
      cc: {
        type: "array",
        items: { type: "string" },
        description: "List of CC recipients"
      },
      bcc: {
        type: "array",
        items: { type: "string" },
        description: "List of BCC recipients"
      },
      inReplyTo: {
        type: "string",
        description: "Message ID to reply to"
      },
      threadId: {
        type: "string",
        description: "Thread ID to add the message to"
      },
      from: {
        type: "string",
        description: "Specific send-as email address to use as sender"
      }
    },
    required: ["to", "subject", "body"]
  },
  handler: async (client: GmailClientWrapper, params: {
    to: string[];
    subject: string;
    body: string;
    cc?: string[];
    bcc?: string[];
    inReplyTo?: string;
    threadId?: string;
    from?: string;
  }) => {
    // Variabile pentru referințe și adresa expeditorului
    let references: string[] = [];
    let fromAddress: string | undefined = params.from;
    let textContent = params.body;
    let htmlContent = params.body.replace(/\n/g, '<br>');
    
    // If this is a reply to an existing email, get the details of it
    if (params.inReplyTo) {
      // Get the details of the original email
      const originalEmail = await client.getMessage(params.inReplyTo);
      
      // Extract existing references for correct threading
      if (originalEmail.headers) {
        const existingRefs = originalEmail.headers.find(h => h.name?.toLowerCase() === 'references')?.value;
        const messageId = originalEmail.headers.find(h => h.name?.toLowerCase() === 'message-id')?.value;
        
        if (existingRefs) {
          references = existingRefs.split(/\s+/);
        }
        if (messageId) {
          references.push(messageId.replace(/[<>]/g, ''));
        }
      }
      
      // Determine the correct sender address for the reply
      if (!fromAddress) {
        fromAddress = await client.determineReplyFromAddress(originalEmail);
      }
      
      // Format the original email content with elegant quoting for both text and HTML
      const fromName = originalEmail.headers?.find(h => h.name?.toLowerCase() === 'from')?.value || undefined;
      const date = originalEmail.timestamp;
      
      // Create the quoted content for plain text version
      const quotedTextContent = formatQuotedContent(originalEmail.content, fromName, date);
      textContent = params.body + quotedTextContent;
      
      // Create the quoted content for HTML version with Gmail-style formatting
      const quotedHtmlContent = formatQuotedContentHtml(originalEmail.content, fromName, date);
      htmlContent = params.body.replace(/\n/g, '<br>') + quotedHtmlContent;
    } else if (!fromAddress) {
      // For new emails (not replies), use the default address if none was specified
      const defaultAlias = await client.getDefaultSendAsAlias();
      if (defaultAlias && defaultAlias.sendAsEmail) {
        fromAddress = defaultAlias.displayName ? 
          `${defaultAlias.displayName} <${defaultAlias.sendAsEmail}>` : 
          defaultAlias.sendAsEmail;
      }
    }
    
    // Filter out own addresses from recipients
    const filteredTo = await client.filterOutOwnAddresses(params.to);
    const filteredCc = params.cc ? await client.filterOutOwnAddresses(params.cc) : undefined;
    
    // Send the message with the updated parameters using multipart format
    const result = await client.sendMultipartMessage({
      to: filteredTo,
      subject: params.subject,
      textContent: textContent,
      htmlContent: htmlContent,
      cc: filteredCc,
      threadId: params.threadId,
      from: fromAddress,
      inReplyTo: params.inReplyTo,
      references: references.length > 0 ? references : undefined
    });
    
    return {
      messageId: result.messageId,
      threadId: result.threadId,
      to: filteredTo,
      cc: filteredCc,
      subject: params.subject,
      from: fromAddress
    };
  }
};

// Schema definition for Reply All
const ReplyAllEmailSchema = z.object({
  messageId: z.string().describe("ID of the message to reply to"),
  body: z.string().describe("Email body content"),
  additionalRecipients: z.array(z.string()).optional().describe("Additional recipients to include in the reply"),
  excludeRecipients: z.array(z.string()).optional().describe("Recipients to exclude from the reply"),
});

// Helper function to extract email from address format like "Name <email@example.com>"
function extractEmail(address: string): string {
  const match = address.match(/<([^>]+)>/);
  return match ? match[1].toLowerCase() : address.toLowerCase();
}

// Helper function to normalize all email addresses (convert to lowercase and extract email part only)
function normalizeEmailAddresses(addresses: string[]): string[] {
  return addresses.map(addr => extractEmail(addr));
}

export const replyAllEmailTool: Tool = {
  name: "reply_all_email",
  description: "Reply to an email and include all original recipients",
  inputSchema: {
    type: "object",
    properties: {
      messageId: {
        type: "string",
        description: "ID of the message to reply to"
      },
      body: {
        type: "string",
        description: "Email body content"
      },
      additionalRecipients: {
        type: "array",
        items: { type: "string" },
        description: "Additional recipients to include in the reply"
      },
      excludeRecipients: {
        type: "array",
        items: { type: "string" },
        description: "Recipients to exclude from the reply"
      },
      from: {
        type: "string",
        description: "Specific send-as email address to use as sender (optional)"
      }
    },
    required: ["messageId", "body"]
  },
  handler: async (client: GmailClientWrapper, params: {
    messageId: string;
    body: string;
    additionalRecipients?: string[];
    excludeRecipients?: string[];
    from?: string;
  }) => {
    try {
      // Get the details of the original email
      const originalEmail = await client.getMessage(params.messageId);
      
      // If there is no threadId, we cannot make a correct reply
      if (!originalEmail.threadId) {
        throw new Error("Cannot reply to message: no thread ID available");
      }
      
      // The original sender becomes the primary recipient
      const originalSender = originalEmail.from;
      
      // Combine all recipients (To + CC from the original email)
      let allRecipients = [
        ...originalEmail.to, 
        ...(originalEmail.cc || [])
      ];
      
      // Add any additional recipients
      if (params.additionalRecipients && params.additionalRecipients.length > 0) {
        allRecipients = [...allRecipients, ...params.additionalRecipients];
      }
      
      // Determine the correct sender address (from) for the reply
      let fromAddress = params.from;
      if (!fromAddress) {
        fromAddress = await client.determineReplyFromAddress(originalEmail);
      }
      
      // Filter out own addresses and any manually specified exclusions
      // using the filterOutOwnAddresses method provided by the client
      let filteredRecipients = await client.filterOutOwnAddresses(allRecipients);
      
      // Apply any explicit exclusions specified by the user
      if (params.excludeRecipients && params.excludeRecipients.length > 0) {
        const excludeEmails = params.excludeRecipients.map(
          addr => client.extractEmailAddress(addr).toLowerCase()
        );
        
        filteredRecipients = filteredRecipients.filter(recipient => {
          const email = client.extractEmailAddress(recipient).toLowerCase();
          return !excludeEmails.includes(email);
        });
      }
      
      // The original sender goes in To, the rest in CC
      const to = [originalSender];
      const cc = filteredRecipients.filter(r => {
        const recipientEmail = client.extractEmailAddress(r).toLowerCase();
        const senderEmail = client.extractEmailAddress(originalSender).toLowerCase();
        return recipientEmail !== senderEmail;
      });
      
      // Filter out own addresses from the To list
      const filteredTo = await client.filterOutOwnAddresses(to);
      
      // Extract existing references for correct threading
      let references: string[] = [];
      if (originalEmail.headers) {
        const existingRefs = originalEmail.headers.find(h => h.name?.toLowerCase() === 'references')?.value;
        const messageId = originalEmail.headers.find(h => h.name?.toLowerCase() === 'message-id')?.value;
        
        if (existingRefs) {
          references = existingRefs.split(/\s+/);
        }
        if (messageId) {
          references.push(messageId.replace(/[<>]/g, ''));
        }
      }
      
      // Prepare the subject with the "Re:" prefix if it doesn't already exist
      let subject = originalEmail.subject;
      if (!subject.toLowerCase().startsWith('re:')) {
        subject = `Re: ${subject}`;
      }
      
      // Format the original email content with elegant quoting for both text and HTML
      const fromName = originalEmail.from || undefined;
      const date = originalEmail.timestamp;
      
      // Create the quoted content for plain text version
      const quotedTextContent = formatQuotedContent(originalEmail.content, fromName, date);
      const textContent = params.body + quotedTextContent;
      
      // Create the quoted content for HTML version with Gmail-style formatting
      const quotedHtmlContent = formatQuotedContentHtml(originalEmail.content, fromName, date);
      const htmlContent = params.body.replace(/\n/g, '<br>') + quotedHtmlContent;
      
      // Send the reply to all using multipart format
      const result = await client.sendMultipartMessage({
        to: filteredTo,
        cc,
        subject,
        textContent: textContent,
        htmlContent: htmlContent,
        threadId: originalEmail.threadId,
        from: fromAddress,
        inReplyTo: params.messageId,
        references: references.length > 0 ? references : undefined
      });
      
      return {
        messageId: result.messageId,
        threadId: result.threadId,
        to: filteredTo,
        cc,
        subject,
        from: fromAddress
      };
    } catch (error) {
      throw new Error(`Failed to reply to all: ${error}`);
    }
  }
};

// Schema definition
const ListSendAsSchema = z.object({});

export const listSendAsAccountsTool: Tool = {
  name: "list_send_as_accounts",
  description: "List all accounts that you can send mail as, including their primary email and any additional aliases",
  inputSchema: {
    type: "object",
    properties: {},
    required: []
  },
  handler: async (client: GmailClientWrapper, params: {}) => {
    try {
      // Get all available send-as aliases
      const aliases = await client.getSendAsAliases();
      
      // Identify the default address (default)
      const defaultAlias = aliases.find(alias => alias.isDefault === true);
      const defaultEmail = defaultAlias?.sendAsEmail || '';
      
      // Format the result for display
      const formattedAliases = aliases.map(alias => {
        return {
          email: alias.sendAsEmail || '',
          name: alias.displayName || '',
          isDefault: alias.isDefault || false,
          isPrimary: alias.isPrimary || false,
          replyToAddress: alias.replyToAddress || null,
          verificationStatus: alias.verificationStatus || 'unknown'
        };
      });
      
      return {
        accounts: formattedAliases,
        defaultAccount: defaultEmail,
        count: aliases.length
      };
    } catch (error) {
      throw new Error(`Failed to list send-as accounts: ${error}`);
    }
  }
};

// Schema definition for Forward Email
const ForwardEmailSchema = z.object({
  messageId: z.string().describe("ID of the message to forward"),
  to: z.array(z.string()).describe("Recipients to forward the email to"),
  additionalContent: z.string().optional().describe("Additional content to add before the forwarded message"),
  cc: z.array(z.string()).optional().describe("CC recipients"),
  from: z.string().optional().describe("Specific send-as email address to use as sender")
});

export const forwardEmailTool: Tool = {
  name: "forward_email",
  description: "Forward an email to other recipients",
  inputSchema: {
    type: "object",
    properties: {
      messageId: {
        type: "string",
        description: "ID of the message to forward"
      },
      to: {
        type: "array",
        items: { type: "string" },
        description: "Recipients to forward the email to"
      },
      additionalContent: {
        type: "string",
        description: "Additional content to add before the forwarded message"
      },
      cc: {
        type: "array",
        items: { type: "string" },
        description: "CC recipients"
      },
      from: {
        type: "string",
        description: "Specific send-as email address to use as sender"
      }
    },
    required: ["messageId", "to"]
  },
  handler: async (client: GmailClientWrapper, params: {
    messageId: string;
    to: string[];
    additionalContent?: string;
    cc?: string[];
    from?: string;
  }) => {
    try {
      // Get the details of the original email
      const originalEmail = await client.getMessage(params.messageId);
      
      // Prepare the subject with the "Fwd:" prefix if it doesn't already exist
      let subject = originalEmail.subject;
      if (!subject.toLowerCase().startsWith('fwd:')) {
        subject = `Fwd: ${subject}`;
      }
      
      // Determine the correct sender address
      let fromAddress = params.from;
      if (!fromAddress) {
        // For forwarding, by default we use the default address
        const defaultAlias = await client.getDefaultSendAsAlias();
        if (defaultAlias && defaultAlias.sendAsEmail) {
          fromAddress = defaultAlias.displayName ? 
            `${defaultAlias.displayName} <${defaultAlias.sendAsEmail}>` : 
            defaultAlias.sendAsEmail;
        }
      }
      
      // Prepare the content of the forwarded email for plain text version
      let textContent = '';
      
      // Add additional content if it exists
      if (params.additionalContent) {
        textContent += params.additionalContent + '\n\n';
      }
      
      // Add the original email headers
      textContent += '---------- Forwarded message ---------\n';
      textContent += `From: ${originalEmail.from}\n`;
      textContent += `Date: ${originalEmail.timestamp || 'Unknown'}\n`;
      textContent += `Subject: ${originalEmail.subject}\n`;
      textContent += `To: ${originalEmail.to.join(', ')}\n`;
      
      // Add the CC header if it exists
      if (originalEmail.cc && originalEmail.cc.length > 0) {
        textContent += `Cc: ${originalEmail.cc.join(', ')}\n`;
      }
      
      textContent += '\n';
      
      // Add the original email content
      textContent += originalEmail.content || '';
      
      // Prepare the HTML version with Gmail-style formatting
      let htmlContent = '';
      
      // Add additional content if it exists
      if (params.additionalContent) {
        htmlContent += params.additionalContent.replace(/\n/g, '<br>') + '<br><br>';
      }
      
      // Add the original email headers in Gmail style
      htmlContent += '<div style="padding: 10px 0; border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; color: #777;">';
      htmlContent += '---------- Forwarded message ---------<br>';
      htmlContent += `From: ${originalEmail.from}<br>`;
      htmlContent += `Date: ${originalEmail.timestamp || 'Unknown'}<br>`;
      htmlContent += `Subject: ${originalEmail.subject}<br>`;
      htmlContent += `To: ${originalEmail.to.join(', ')}<br>`;
      
      // Add the CC header if it exists
      if (originalEmail.cc && originalEmail.cc.length > 0) {
        htmlContent += `Cc: ${originalEmail.cc.join(', ')}<br>`;
      }
      
      htmlContent += '</div><br>';
      
      // Check if content is HTML
      const isHtml = originalEmail.content?.includes('<html') || 
                     originalEmail.content?.includes('<body') || 
                     originalEmail.content?.includes('<div') || 
                     originalEmail.content?.includes('<p');
      
      // Add the original email content - preserve HTML or convert plain text to HTML
      if (isHtml) {
        htmlContent += originalEmail.content || '';
      } else {
        htmlContent += (originalEmail.content || '').replace(/\n/g, '<br>');
      }
      
      // Filter out own addresses from recipients
      const filteredTo = await client.filterOutOwnAddresses(params.to);
      const filteredCc = params.cc ? await client.filterOutOwnAddresses(params.cc) : undefined;
      
      // Send the forwarded email using multipart format
      const result = await client.sendMultipartMessage({
        to: filteredTo,
        cc: filteredCc,
        subject,
        textContent,
        htmlContent,
        // Add the original threadId to maintain the conversation
        threadId: originalEmail.threadId,
        from: fromAddress,
      });
      
      return {
        messageId: result.messageId,
        threadId: result.threadId,
        to: filteredTo,
        cc: filteredCc,
        subject,
        from: fromAddress
      };
    } catch (error) {
      throw new Error(`Failed to forward email: ${error}`);
    }
  }
}; 