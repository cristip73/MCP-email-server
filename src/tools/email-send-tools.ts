import { z } from "zod";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { GmailClientWrapper } from "../client-wrapper.js";
import { 
  createEmailMessage, 
  formatQuotedContent, 
  formatPlainTextToHtml 
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
    let content = params.body;
    let isHtml = false;
    
    // If this is a reply to an existing email, get the details of it
    if (params.inReplyTo) {
      // Get the details of the original email
      const originalEmail = await client.getMessage(params.inReplyTo);
      
      // Get the raw message to determine if it's HTML
      const originalMessage = await client.getRawMessage(params.inReplyTo);
      
      // Check if the original content is HTML
      isHtml = client.isHtmlContent(originalMessage);
      
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
      
      // Format the original email content as a quote and add it to the reply
      const fromName = originalEmail.headers?.find(h => h.name?.toLowerCase() === 'from')?.value || undefined;
      const date = originalEmail.timestamp;
      
      // Format the user's reply body if needed for HTML
      let formattedBody = params.body;
      if (isHtml) {
        formattedBody = formatPlainTextToHtml(params.body);
      }
      
      // Add the quoted content to the reply body
      const quotedContent = formatQuotedContent(originalEmail.content, fromName, date, isHtml);
      content = formattedBody + quotedContent;
    } else {
      // For new emails (not replies)
      
      // Verificăm dacă conținutul pare să conțină HTML
      isHtml = /<html|<body|<div|<p|<span|<table|<a|<img|<br|<h[1-6]|<ul|<ol|<li/i.test(params.body);
      
      // If it contains HTML, ensure we're using proper HTML formatting
      if (isHtml) {
        // Keep the content as is, it's already HTML
        content = params.body;
      } else {
        // It's plain text, no special formatting needed here
        // The line breaks will be normalized in encodeEmailContent
        content = params.body;
      }
      
      if (!fromAddress) {
        // For new emails, use the default address if none was specified
        const defaultAlias = await client.getDefaultSendAsAlias();
        if (defaultAlias && defaultAlias.sendAsEmail) {
          fromAddress = defaultAlias.displayName ? 
            `${defaultAlias.displayName} <${defaultAlias.sendAsEmail}>` : 
            defaultAlias.sendAsEmail;
        }
      }
    }
    
    // Filter out own addresses from recipients
    const filteredTo = await client.filterOutOwnAddresses(params.to);
    const filteredCc = params.cc ? await client.filterOutOwnAddresses(params.cc) : undefined;
    
    // Send the message with the updated parameters
    const result = await client.sendMessage({
      to: filteredTo,
      subject: params.subject,
      content: content,
      cc: filteredCc,
      threadId: params.threadId,
      from: fromAddress,
      inReplyTo: params.inReplyTo,
      references: references.length > 0 ? references : undefined,
      isHtml: isHtml
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
      
      // Get the raw message to determine if it's HTML
      const originalMessage = await client.getRawMessage(params.messageId);
      
      // Check if the original content is HTML
      const isHtml = client.isHtmlContent(originalMessage);
      
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
      
      // Format the original email content as a quote and add it to the reply
      const fromName = originalEmail.from || undefined;
      const date = originalEmail.timestamp;
      
      // Format the user's reply body if needed for HTML
      let formattedBody = params.body;
      if (isHtml) {
        formattedBody = formatPlainTextToHtml(params.body);
      }
      
      // Add the quoted content to the reply body
      const quotedContent = formatQuotedContent(originalEmail.content, fromName, date, isHtml);
      const content = formattedBody + quotedContent;
      
      // Send the reply to all
      const result = await client.sendMessage({
        to: filteredTo,
        cc,
        subject,
        content: content,
        threadId: originalEmail.threadId,
        from: fromAddress,
        inReplyTo: params.messageId,
        references: references.length > 0 ? references : undefined,
        isHtml: isHtml
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
      
      // Get the raw message to determine if it's HTML
      const originalMessage = await client.getRawMessage(params.messageId);
      
      // Check if the original content is HTML
      const isHtml = client.isHtmlContent(originalMessage);
      
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
      
      // Prepare the content of the forwarded email
      let content = '';
      
      // Add additional content if it exists
      if (params.additionalContent) {
        if (isHtml) {
          content += formatPlainTextToHtml(params.additionalContent) + '<br><br>';
        } else {
          content += params.additionalContent + '\n\n';
        }
      }
      
      if (isHtml) {
        // HTML format for forwarded email
        content += '<div class="gmail_forwarded">';
        content += '<div>---------- Forwarded message ---------</div>';
        content += `<div><b>From:</b> ${originalEmail.from}</div>`;
        content += `<div><b>Date:</b> ${originalEmail.timestamp || 'Unknown'}</div>`;
        content += `<div><b>Subject:</b> ${originalEmail.subject}</div>`;
        content += `<div><b>To:</b> ${originalEmail.to.join(', ')}</div>`;
        
        // Add the CC header if it exists
        if (originalEmail.cc && originalEmail.cc.length > 0) {
          content += `<div><b>Cc:</b> ${originalEmail.cc.join(', ')}</div>`;
        }
        
        content += '<br>';
        
        // Add the original email content with proper formatting
        // Use the content as-is since it's already HTML
        content += originalEmail.content || '';
        content += '</div>';
      } else {
        // Plain text format for forwarded email
        content += '---------- Forwarded message ---------\n';
        content += `From: ${originalEmail.from}\n`;
        content += `Date: ${originalEmail.timestamp || 'Unknown'}\n`;
        content += `Subject: ${originalEmail.subject}\n`;
        content += `To: ${originalEmail.to.join(', ')}\n`;
        
        // Add the CC header if it exists
        if (originalEmail.cc && originalEmail.cc.length > 0) {
          content += `Cc: ${originalEmail.cc.join(', ')}\n`;
        }
        
        content += '\n';
        
        // Add the original email content with proper formatting
        const originalContent = originalEmail.content || '';
        content += originalContent;
      }
      
      // Filter out own addresses from recipients
      const filteredTo = await client.filterOutOwnAddresses(params.to);
      const filteredCc = params.cc ? await client.filterOutOwnAddresses(params.cc) : undefined;
      
      // Send the forwarded email
      const result = await client.sendMessage({
        to: filteredTo,
        cc: filteredCc,
        subject,
        content,
        // Add the original threadId to maintain the conversation
        threadId: originalEmail.threadId,
        from: fromAddress,
        isHtml: isHtml
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