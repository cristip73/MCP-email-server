import { gmail_v1, google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { encodeEmailSubject } from './utils.js';
import { timeZoneOffset, formatTimestampWithOffset } from './timezone-utils.js';

export interface PaginationOptions {
  pageSize?: number;
  pageToken?: string;
  labelIds?: string[];
  includeSpamTrash?: boolean;
  query?: string;
  category?: 'primary' | 'social' | 'promotions' | 'updates' | 'forums';
  autoFetchAll?: boolean;
  maxAutoFetchResults?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export interface EmailData {
  threadId?: string;
  messageId: string;
  headers: gmail_v1.Schema$MessagePartHeader[];
  subject: string;
  from: string;
  to: string[];
  cc?: string[];
  content: string;
  labels?: string[];
  isUnread: boolean;
  category?: 'primary' | 'social' | 'promotions' | 'updates' | 'forums';
  isInInbox: boolean;
  timestamp?: string;
  attachments?: Array<{
    filename: string;
    mimeType: string;
    data: string;
  }>;
}

export interface DraftData {
  id: string;
  message: {
    id?: string;
    threadId?: string;
    labelIds?: string[];
    snippet?: string;
    subject?: string;
    to?: string[];
    cc?: string[];
    bcc?: string[];
    from?: string;
    content?: string;
  };
}

export interface DraftOptions {
  maxResults?: number;
  pageToken?: string;
  query?: string;
}

export interface DraftResponse {
  drafts: DraftData[];
  nextPageToken?: string;
  totalResults: number;
}

export interface AttachmentData {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  data: string;
}

export class GmailClientWrapper {
  private gmail: gmail_v1.Gmail;
  private userId: string = 'me';

  constructor(auth: OAuth2Client) {
    this.gmail = google.gmail({ version: 'v1', auth });
  }

  async listMessages(options: PaginationOptions = {}): Promise<PaginatedResponse<EmailData>> {
    try {
      let query = options.query || '';
      
      // Handle category search
      if (options.category) {
        switch (options.category) {
          case 'primary':
            // For Primary: in inbox but not in other categories
            query = query ? `${query} in:inbox -category:{social promotions updates forums}` 
                        : 'in:inbox -category:{social promotions updates forums}';
            break;
          case 'social':
            query = query ? `${query} category:social` : 'category:social';
            break;
          case 'promotions':
            query = query ? `${query} category:promotions` : 'category:promotions';
            break;
          case 'updates':
            query = query ? `${query} category:updates` : 'category:updates';
            break;
          case 'forums':
            query = query ? `${query} category:forums` : 'category:forums';
            break;
        }
      }

      // Add label filters if specified
      if (options.labelIds?.length) {
        const labelQuery = options.labelIds.map(label => `label:${label}`).join(' ');
        query = query ? `${query} ${labelQuery}` : labelQuery;
      }

      // Ensure query is properly formatted
      query = query.trim();
      
      // Handle special search operators
      if (query.includes('is:unread')) {
        query = query.replace(/is:unread/g, 'label:unread');
      }

      console.error('Final query:', query); // Debug log

      // Initialize the final response for the automatic pagination case
      let allItems: EmailData[] = [];
      let finalNextPageToken: string | undefined = undefined;
      let totalResultSizeEstimate = 0;
      let currentPageToken = options.pageToken;
      
      // Set the page size and maximum limit for automatic pagination
      const pageSize = options.pageSize || 25; // Default fetch 25 results
      const maxAutoFetchResults = options.maxAutoFetchResults || 100; // Maximum limit of 100 emails
      
      // The loop for automatic pagination
      do {
        const response = await this.gmail.users.messages.list({
          userId: this.userId,
          maxResults: pageSize,
          pageToken: currentPageToken,
          includeSpamTrash: options.includeSpamTrash,
          q: query
        });
        
        const messages = response.data.messages || [];
        
        // Use getMessage which has implemented timezone adjustment
        const messageDetails = await Promise.all(
          messages.map(msg => this.getMessage(msg.id!))
        );
        
        // Add the results to the complete list
        allItems = [...allItems, ...messageDetails];
        
        // Update the token for the next page
        currentPageToken = response.data.nextPageToken || undefined;
        finalNextPageToken = currentPageToken;
        
        // Update the total result size estimate
        totalResultSizeEstimate = response.data.resultSizeEstimate || allItems.length;
        
        // Check the stopping conditions for automatic pagination
        if (!options.autoFetchAll || allItems.length >= maxAutoFetchResults || !currentPageToken) {
          break;
        }
        
      } while (true);
      
      return {
        items: allItems,
        nextPageToken: finalNextPageToken,
        resultSizeEstimate: totalResultSizeEstimate
      };
    } catch (error) {
      throw new Error(`Failed to list messages: ${error}`);
    }
  }

  async getMessage(messageId: string): Promise<EmailData> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: this.userId,
        id: messageId,
        format: 'full',
      });

      const message = response.data;
      const headers = message.payload?.headers || [];
      const labels = message.labelIds || [];
      
      // Determine email state from labels
      const isUnread = labels.includes('UNREAD');
      const isInInbox = labels.includes('INBOX');
      
      // Determine category based on Gmail's category system
      let category: EmailData['category'] = undefined;
      
      // Check for category based on Gmail's actual categorization
      if (isInInbox) {
        if (labels.some(l => l.startsWith('CATEGORY_'))) {
          if (labels.includes('CATEGORY_SOCIAL')) category = 'social';
          else if (labels.includes('CATEGORY_PROMOTIONS')) category = 'promotions';
          else if (labels.includes('CATEGORY_UPDATES')) category = 'updates';
          else if (labels.includes('CATEGORY_FORUMS')) category = 'forums';
        } else {
          // If in inbox but no category, it's primary
          category = 'primary';
        }
      }
      
      // Extract date information from headers
      const dateHeader = headers.find(h => h.name?.toLowerCase() === 'date')?.value;
      let timestamp: string | undefined = undefined;
      
      if (dateHeader) {
        try {
          // Parse the date header and apply timezone offset
          const dateObj = new Date(dateHeader);
          // Use the formatTimestampWithOffset function to apply the offset
          timestamp = formatTimestampWithOffset(dateHeader);
        } catch (e) {
          console.error('Error parsing date header:', e);
          // If parsing fails, use the original header value
          timestamp = dateHeader;
        }
      }
      
      // Extract To and CC fields
      const to = (headers.find(h => h.name?.toLowerCase() === 'to')?.value || '').split(',').map(e => e.trim());
      const cc = headers.find(h => h.name?.toLowerCase() === 'cc')?.value?.split(',').map(e => e.trim()) || [];
      
      return {
        threadId: message.threadId || undefined,
        messageId: message.id || messageId,
        headers: headers,
        subject: headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '',
        from: headers.find(h => h.name?.toLowerCase() === 'from')?.value || '',
        to: to,
        cc: cc,
        content: this.extractContent(message),
        labels: labels,
        isUnread,
        category,
        isInInbox,
        timestamp,
        attachments: this.extractAttachments(message),
      };
    } catch (error) {
      throw new Error(`Failed to get message: ${error}`);
    }
  }

  async getSendAsAliases(): Promise<gmail_v1.Schema$SendAs[]> {
    try {
      const response = await this.gmail.users.settings.sendAs.list({
        userId: this.userId,
      });
      return response.data.sendAs || [];
    } catch (error) {
      throw new Error(`Failed to get send-as aliases: ${error}`);
    }
  }

  /**
   * Get the default send-as alias (default) configured in Gmail
   */
  async getDefaultSendAsAlias(): Promise<gmail_v1.Schema$SendAs | undefined> {
    try {
      const aliases = await this.getSendAsAliases();
      return aliases.find(alias => alias.isDefault === true);
    } catch (error) {
      throw new Error(`Failed to get default send-as alias: ${error}`);
    }
  }

  /**
   * Determine the correct reply address based on the addresses in the original email
   * @param originalEmail - The email to which we are replying
   * @param fromAddressOverride - The manually specified address (has priority)
   */
  async determineReplyFromAddress(
    originalEmail: EmailData,
    fromAddressOverride?: string
  ): Promise<string | undefined> {
    // If a manually specified address is provided, use it
    if (fromAddressOverride) {
      return fromAddressOverride;
    }

    try {
      // Get all available send-as aliases
      const aliases = await this.getSendAsAliases();
      let fromAddress: string | undefined;
      
      // First check if any of our addresses match the original email's recipients (To or CC)
      if (originalEmail.to && originalEmail.to.length > 0) {
        for (const toAddress of originalEmail.to) {
          const toEmail = this.extractEmailAddress(toAddress);
          
          const matchedAlias = aliases.find(alias => 
            alias.sendAsEmail?.toLowerCase() === toEmail.toLowerCase()
          );
          
          if (matchedAlias && matchedAlias.sendAsEmail) {
            fromAddress = matchedAlias.displayName ? 
              `${matchedAlias.displayName} <${matchedAlias.sendAsEmail}>` : 
              matchedAlias.sendAsEmail;
            break;
          }
        }
      }
      
      // Check also in the CC addresses if we didn't find a match in To
      if (!fromAddress && originalEmail.cc && originalEmail.cc.length > 0) {
        for (const ccAddress of originalEmail.cc) {
          const ccEmail = this.extractEmailAddress(ccAddress);
          
          const matchedAlias = aliases.find(alias => 
            alias.sendAsEmail?.toLowerCase() === ccEmail.toLowerCase()
          );
          
          if (matchedAlias && matchedAlias.sendAsEmail) {
            fromAddress = matchedAlias.displayName ? 
              `${matchedAlias.displayName} <${matchedAlias.sendAsEmail}>` : 
              matchedAlias.sendAsEmail;
            break;
          }
        }
      }
      
      // If we didn't find a suitable address, use the default address
      if (!fromAddress) {
        const defaultAlias = aliases.find(alias => alias.isDefault === true);
        if (defaultAlias && defaultAlias.sendAsEmail) {
          fromAddress = defaultAlias.displayName ? 
            `${defaultAlias.displayName} <${defaultAlias.sendAsEmail}>` : 
            defaultAlias.sendAsEmail;
        }
      }
      
      return fromAddress;
    } catch (error) {
      console.error('Error determining reply from address:', error);
      return undefined;
    }
  }
  
  /**
   * Extract the email address from the format "Name <email@example.com>"
   */
  extractEmailAddress(address: string): string {
    const match = address.match(/<([^>]+)>/);
    return match ? match[1] : address;
  }
  
  /**
   * Exclude own addresses from the recipient list
   * @param recipients - The recipient list
   */
  async filterOutOwnAddresses(recipients: string[]): Promise<string[]> {
    try {
      const aliases = await this.getSendAsAliases();
      const myEmails = aliases
        .filter(alias => alias.sendAsEmail)
        .map(alias => alias.sendAsEmail!.toLowerCase());
      
      return recipients.filter(recipient => {
        const email = this.extractEmailAddress(recipient).toLowerCase();
        return !myEmails.includes(email);
      });
    } catch (error) {
      console.error('Error filtering out own addresses:', error);
      return recipients;
    }
  }

  async sendMessage(options: {
    to: string[];
    subject: string;
    content: string;
    threadId?: string;
    from?: string;
    cc?: string[];
    inReplyTo?: string;
    references?: string[];
  }): Promise<{ messageId: string; threadId?: string }> {
    try {
      const raw = await this.createEmailRaw(options);
      
      const response = await this.gmail.users.messages.send({
        userId: this.userId,
        requestBody: {
          raw,
          threadId: options.threadId,
        },
      });

      return {
        messageId: response.data.id || '',
        threadId: response.data.threadId || undefined,
      };
    } catch (error) {
      throw new Error(`Failed to send message: ${error}`);
    }
  }

  /**
   * Send a multipart email message with both HTML and plain text versions
   */
  async sendMultipartMessage(options: {
    to: string[];
    subject: string;
    textContent: string;
    htmlContent: string;
    threadId?: string;
    from?: string;
    cc?: string[];
    inReplyTo?: string;
    references?: string[];
  }): Promise<{ messageId: string; threadId?: string }> {
    try {
      const encodedSubject = encodeEmailSubject(options.subject);
      
      const headers = [
        `To: ${options.to.join(', ')}`,
        `Subject: ${encodedSubject}`,
        options.from ? `From: ${options.from}` : '',
        options.cc?.length ? `Cc: ${options.cc.join(', ')}` : '',
        options.inReplyTo ? `In-Reply-To: ${options.inReplyTo}` : '',
        options.references?.length ? `References: ${options.references.join(' ')}` : '',
        'MIME-Version: 1.0',
      ].filter(Boolean);
      
      // Create boundary for multipart message
      const boundary = `000000000000${Math.random().toString(16).substr(2, 8)}`;
      headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
      
      // Construct the multipart email
      let email = headers.join('\r\n') + '\r\n\r\n';
      
      // Add plain text part
      email += `--${boundary}\r\n`;
      email += 'Content-Type: text/plain; charset=UTF-8\r\n';
      email += 'Content-Transfer-Encoding: quoted-printable\r\n\r\n';
      email += options.textContent + '\r\n\r\n';
      
      // Add HTML part
      email += `--${boundary}\r\n`;
      email += 'Content-Type: text/html; charset=UTF-8\r\n';
      email += 'Content-Transfer-Encoding: quoted-printable\r\n\r\n';
      email += `<!DOCTYPE html>
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
</head>
<body>
${options.htmlContent}
</body>
</html>\r\n\r\n`;
      
      // Close the multipart message
      email += `--${boundary}--`;
      
      // Encode the entire email as base64url
      const raw = Buffer.from(email).toString('base64url');
      
      const response = await this.gmail.users.messages.send({
        userId: this.userId,
        requestBody: {
          raw,
          threadId: options.threadId,
        },
      });

      return {
        messageId: response.data.id || '',
        threadId: response.data.threadId || undefined,
      };
    } catch (error) {
      throw new Error(`Failed to send multipart message: ${error}`);
    }
  }

  private extractContent(message: gmail_v1.Schema$Message): string {
    let textContent = '';
    let htmlContent = '';

    // Recursive function to search through all nested MIME parts
    const extractFromParts = (part: gmail_v1.Schema$MessagePart | undefined): void => {
      if (!part) return;

      // If this part has body data, extract it based on MIME type
      if (part.body?.data) {
        const content = Buffer.from(part.body.data, 'base64').toString('utf8');
        if (part.mimeType === 'text/plain' && !textContent) {
          textContent = content;
        } else if (part.mimeType === 'text/html' && !htmlContent) {
          htmlContent = content;
        }
      }

      // Recursively process nested parts
      if (part.parts && part.parts.length > 0) {
        for (const subpart of part.parts) {
          extractFromParts(subpart);
        }
      }
    };

    // Start extraction from the payload
    extractFromParts(message.payload);

    // Prefer plain text, fall back to HTML
    return textContent || htmlContent || '';
  }

  private extractAttachments(message: gmail_v1.Schema$Message): Array<{
    filename: string;
    mimeType: string;
    data: string;
  }> {
    const attachments: Array<{
      filename: string;
      mimeType: string;
      data: string;
    }> = [];

    const parts = message.payload?.parts || [];
    for (const part of parts) {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType || 'application/octet-stream',
          data: part.body.attachmentId || '',
        });
      }
    }

    return attachments;
  }

  /**
   * Encode the email content to handle UTF-8 characters correctly
   * @param content The original email content
   * @returns The encoded content in UTF-8 format
   */
  private encodeEmailContent(content: string): string {
    // Check if the content has non-ASCII characters
    if (!/^[\x00-\x7F]*$/.test(content)) {
      // Ensure Content-Transfer-Encoding is set correctly
      // and all UTF-8 characters are kept intact
      return content;
    }
    return content;
  }

  private async createEmailRaw(options: {
    to: string[];
    subject: string;
    content: string;
    from?: string;
    cc?: string[];
    inReplyTo?: string;
    references?: string[];
  }): Promise<string> {
    const encodedSubject = encodeEmailSubject(options.subject);
    const encodedContent = this.encodeEmailContent(options.content);
    
    const headers = [
      `To: ${options.to.join(', ')}`,
      `Subject: ${encodedSubject}`,
      options.from ? `From: ${options.from}` : '',
      options.cc?.length ? `Cc: ${options.cc.join(', ')}` : '',
      options.inReplyTo ? `In-Reply-To: ${options.inReplyTo}` : '',
      options.references?.length ? `References: ${options.references.join(' ')}` : '',
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      'MIME-Version: 1.0',
    ].filter(Boolean).join('\r\n');

    // Encode the entire email content with Base64 to handle UTF-8 characters correctly
    const encodedEmailContent = Buffer.from(encodedContent).toString('base64');
    const email = `${headers}\r\n\r\n${encodedEmailContent}`;
    
    return Buffer.from(email).toString('base64url');
  }
  
  // Label management methods
  
  async listLabels(): Promise<gmail_v1.Schema$Label[]> {
    try {
      const response = await this.gmail.users.labels.list({
        userId: this.userId
      });
      return response.data.labels || [];
    } catch (error) {
      throw new Error(`Failed to list labels: ${error}`);
    }
  }
  
  async getLabel(labelId: string): Promise<gmail_v1.Schema$Label> {
    try {
      const response = await this.gmail.users.labels.get({
        userId: this.userId,
        id: labelId
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get label ${labelId}: ${error}`);
    }
  }
  
  async createLabel(name: string, options?: { 
    messageListVisibility?: 'show' | 'hide',
    labelListVisibility?: 'labelShow' | 'labelShowIfUnread' | 'labelHide',
    color?: { 
      textColor?: string, 
      backgroundColor?: string 
    }
  }): Promise<gmail_v1.Schema$Label> {
    try {
      const response = await this.gmail.users.labels.create({
        userId: this.userId,
        requestBody: {
          name,
          messageListVisibility: options?.messageListVisibility,
          labelListVisibility: options?.labelListVisibility,
          color: options?.color
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create label "${name}": ${error}`);
    }
  }
  
  async updateLabel(labelId: string, updates: {
    name?: string,
    messageListVisibility?: 'show' | 'hide',
    labelListVisibility?: 'labelShow' | 'labelShowIfUnread' | 'labelHide',
    color?: { 
      textColor?: string, 
      backgroundColor?: string 
    }
  }): Promise<gmail_v1.Schema$Label> {
    try {
      const response = await this.gmail.users.labels.update({
        userId: this.userId,
        id: labelId,
        requestBody: updates
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update label ${labelId}: ${error}`);
    }
  }
  
  async deleteLabel(labelId: string): Promise<void> {
    try {
      await this.gmail.users.labels.delete({
        userId: this.userId,
        id: labelId
      });
    } catch (error) {
      throw new Error(`Failed to delete label ${labelId}: ${error}`);
    }
  }
  
  async modifyMessageLabels(messageId: string, addLabelIds?: string[], removeLabelIds?: string[]): Promise<gmail_v1.Schema$Message> {
    try {
      const response = await this.gmail.users.messages.modify({
        userId: this.userId,
        id: messageId,
        requestBody: {
          addLabelIds,
          removeLabelIds
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to modify labels for message ${messageId}: ${error}`);
    }
  }
  
  // Convenience methods for common label operations
  
  async markAsRead(messageId: string): Promise<gmail_v1.Schema$Message> {
    return this.modifyMessageLabels(messageId, [], ['UNREAD']);
  }
  
  async markAsUnread(messageId: string): Promise<gmail_v1.Schema$Message> {
    return this.modifyMessageLabels(messageId, ['UNREAD'], []);
  }
  
  async archiveMessage(messageId: string): Promise<gmail_v1.Schema$Message> {
    return this.modifyMessageLabels(messageId, [], ['INBOX']);
  }
  
  async unarchiveMessage(messageId: string): Promise<gmail_v1.Schema$Message> {
    return this.modifyMessageLabels(messageId, ['INBOX'], []);
  }
  
  async trashMessage(messageId: string): Promise<gmail_v1.Schema$Message> {
    return this.modifyMessageLabels(messageId, ['TRASH'], ['INBOX']);
  }

  // Draft management methods

  /**
   * Create a new draft email
   */
  async createDraft(options: {
    to: string[];
    subject: string;
    content: string;
    from?: string;
    cc?: string[];
    bcc?: string[];
  }): Promise<DraftData> {
    try {
      const encodedEmail = await this.createEmailRaw(options);

      const response = await this.gmail.users.drafts.create({
        userId: this.userId,
        requestBody: {
          message: {
            raw: encodedEmail,
          },
        },
      });

      // Return draft data with message details
      const draft: DraftData = {
        id: response.data.id || '',
        message: {
          id: response.data.message?.id === null ? undefined : response.data.message?.id,
          threadId: response.data.message?.threadId === null ? undefined : response.data.message?.threadId,
          subject: options.subject,
          to: options.to,
          cc: options.cc,
          from: options.from,
          content: options.content
        }
      };
      
      return draft;
    } catch (error) {
      throw new Error(`Failed to create draft: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get a specific draft by ID
   */
  async getDraft(draftId: string): Promise<DraftData> {
    try {
      const response = await this.gmail.users.drafts.get({
        userId: this.userId,
        id: draftId,
        format: 'full',
      });

      if (!response.data || !response.data.message) {
        throw new Error('Draft not found or has no message data');
      }

      const messageData = response.data.message;
      const headers = messageData.payload?.headers || [];
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const toHeader = headers.find(h => h.name === 'To')?.value || '';
      const ccHeader = headers.find(h => h.name === 'Cc')?.value || '';
      const fromHeader = headers.find(h => h.name === 'From')?.value || '';
      
      const to = toHeader ? toHeader.split(',').map(e => e.trim()) : [];
      const cc = ccHeader ? ccHeader.split(',').map(e => e.trim()) : [];
      
      const content = this.extractContent(messageData);

      const draft: DraftData = {
        id: response.data.id || '',
        message: {
          id: messageData.id ?? undefined,
          threadId: messageData.threadId ?? undefined,
          labelIds: messageData.labelIds ?? undefined,
          snippet: messageData.snippet ?? undefined,
          subject,
          to,
          cc,
          from: fromHeader,
          content
        }
      };

      return draft;
    } catch (error) {
      throw new Error(`Failed to get draft: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List drafts in the user's account
   */
  async listDrafts(options?: DraftOptions): Promise<DraftResponse> {
    try {
      const response = await this.gmail.users.drafts.list({
        userId: this.userId,
        maxResults: options?.maxResults,
        pageToken: options?.pageToken,
        q: options?.query,
      });

      if (!response.data.drafts) {
        return {
          drafts: [],
          nextPageToken: undefined,
          totalResults: 0,
        };
      }

      const drafts: DraftData[] = await Promise.all(
        response.data.drafts.map(async (draft) => {
          try {
            return await this.getDraft(draft.id || '');
          } catch (error) {
            // If we can't get the full draft data, return minimal data
            return {
              id: draft.id || '',
              message: {
                id: draft.message?.id ?? undefined,
                threadId: draft.message?.threadId ?? undefined,
              }
            };
          }
        })
      );

      return {
        drafts,
        nextPageToken: response.data.nextPageToken ?? undefined,
        totalResults: response.data.resultSizeEstimate || 0,
      };
    } catch (error) {
      throw new Error(`Failed to list drafts: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update an existing draft
   */
  async updateDraft(draftId: string, options: {
    to: string[];
    subject: string;
    content: string;
    cc?: string[];
    bcc?: string[];
    from?: string;
  }): Promise<DraftData> {
    try {
      const raw = await this.createEmailRaw(options);
      
      const response = await this.gmail.users.drafts.update({
        userId: this.userId,
        id: draftId,
        requestBody: {
          message: {
            raw
          }
        }
      });
      
      // Return updated draft data
      return {
        id: response.data.id || draftId,
        message: {
          id: response.data.message?.id === null ? undefined : response.data.message?.id,
          threadId: response.data.message?.threadId === null ? undefined : response.data.message?.threadId,
          subject: options.subject,
          to: options.to,
          cc: options.cc,
          from: options.from,
          content: options.content
        }
      };
    } catch (error) {
      throw new Error(`Failed to update draft ${draftId}: ${error}`);
    }
  }

  /**
   * Delete a draft
   */
  async deleteDraft(draftId: string): Promise<void> {
    try {
      await this.gmail.users.drafts.delete({
        userId: this.userId,
        id: draftId
      });
    } catch (error) {
      throw new Error(`Failed to delete draft ${draftId}: ${error}`);
    }
  }

  /**
   * Send an existing draft
   */
  async sendDraft(draftId: string): Promise<{ messageId?: string; threadId?: string }> {
    try {
      const response = await this.gmail.users.drafts.send({
        userId: 'me',
        requestBody: {
          id: draftId,
        },
      });

      // Folosim type assertion pentru a gestiona tipurile din răspuns
      const messageId: string | undefined = response.data.id as string | undefined;
      const threadId: string | undefined = response.data.threadId as string | undefined;

      return {
        messageId,
        threadId,
      };
    } catch (error) {
      throw new Error(`Failed to send draft: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Attachment management methods

  /**
   * Get a specific attachment from a message
   */
  async getAttachment(messageId: string, attachmentId: string): Promise<AttachmentData> {
    try {
      console.error(`Attempting to get attachment: messageId=${messageId}, attachmentId=${attachmentId}`);
      
      // First check if the attachment exists in the message
      const message = await this.gmail.users.messages.get({
        userId: this.userId,
        id: messageId,
        format: 'full',
      });

      if (!message.data || !message.data.payload) {
        throw new Error('Message not found or has no payload');
      }

      // Track all found attachments to help with debugging and search by filename
      const foundAttachments: Array<{id: string, filename: string, part: gmail_v1.Schema$MessagePart}> = [];

      // Recursive function to find the attachment part and track all attachments
      const findAttachmentPartsRecursive = (parts: gmail_v1.Schema$MessagePart[] | undefined): void => {
        if (!parts) return;
        
        for (const part of parts) {
          // Add all attachments to the tracking array
          if (part.filename && part.filename.trim() !== '' && part.body?.attachmentId) {
            foundAttachments.push({
              id: part.body.attachmentId,
              filename: part.filename,
              part: part
            });
            console.error(`Found attachment: "${part.filename}" with ID "${part.body.attachmentId}"`);
          }
          
          // Recursively search in subparts
          if (part.parts) {
            findAttachmentPartsRecursive(part.parts);
          }
        }
      };

      // First, collect all attachments from the message
      findAttachmentPartsRecursive(message.data.payload.parts);
      
      // If no attachments were found at all
      if (foundAttachments.length === 0) {
        throw new Error('No attachments found in this message');
      }

      console.error(`Found ${foundAttachments.length} total attachments in the message`);
      
      // Create a detailed log of all found attachments for debugging
      let attachmentDebugInfo = foundAttachments.map(att => 
        `"${att.filename}" (${att.id}) (alt-ids: ${att.part.partId || 'none'}, ${att.part.body?.attachmentId || 'none'})`
      ).join(', ');
      console.error(`Available attachments: ${attachmentDebugInfo}`);

      // Try to find the specific attachment requested
      let targetAttachment: {id: string, filename: string, part: gmail_v1.Schema$MessagePart} | undefined;
      
      // 1. First try exact ID match
      targetAttachment = foundAttachments.find(att => att.id === attachmentId);
      
      // 2. If no match by ID, try exact filename match
      if (!targetAttachment) {
        targetAttachment = foundAttachments.find(att => att.filename === attachmentId);
        if (targetAttachment) {
          console.error(`Found attachment by exact filename match: "${targetAttachment.filename}" with ID "${targetAttachment.id}"`);
        }
      }
      
      // 3. If still no match, try case-insensitive filename match
      if (!targetAttachment) {
        targetAttachment = foundAttachments.find(att => 
          att.filename.toLowerCase() === attachmentId.toLowerCase()
        );
        if (targetAttachment) {
          console.error(`Found attachment by case-insensitive filename match: "${targetAttachment.filename}" with ID "${targetAttachment.id}"`);
        }
      }
      
      // 4. If still no match, try partial filename match (file contains search term or search term contains file)
      if (!targetAttachment) {
        targetAttachment = foundAttachments.find(att => 
          att.filename.toLowerCase().includes(attachmentId.toLowerCase()) || 
          attachmentId.toLowerCase().includes(att.filename.toLowerCase())
        );
        if (targetAttachment) {
          console.error(`Found attachment by partial filename match: "${targetAttachment.filename}" with ID "${targetAttachment.id}"`);
        }
      }
      
      // 5. If still no match, just use the first attachment
      if (!targetAttachment && foundAttachments.length > 0) {
        targetAttachment = foundAttachments[0];
        console.error(`No match found. Using first available attachment: "${targetAttachment.filename}" with ID "${targetAttachment.id}"`);
      }
      
      if (!targetAttachment) {
        throw new Error(`Attachment not found. Available attachments: ${attachmentDebugInfo}`);
      }
      
      // Use the found attachment ID for the actual API request
      const actualAttachmentId = targetAttachment.id;
      console.error(`Using attachment ID for API request: ${actualAttachmentId} (from file "${targetAttachment.filename}")`);

      // Now make the request to get the attachment content using the correct ID
      const response = await this.gmail.users.messages.attachments.get({
        userId: this.userId,
        messageId,
        id: actualAttachmentId,
      });

      if (!response.data) {
        throw new Error('Attachment data not found in API response');
      }

      console.error(`Successfully retrieved attachment data for "${targetAttachment.filename}"`);
      
      return {
        id: actualAttachmentId,
        filename: targetAttachment.filename,
        mimeType: targetAttachment.part.mimeType ?? 'application/octet-stream',
        size: parseInt(String(targetAttachment.part.body?.size || '0'), 10),
        data: response.data.data ?? '',
      };
    } catch (error) {
      console.error(`Error details in getAttachment: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Failed to get attachment: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List all attachments in a message
   */
  async listAttachments(messageId: string): Promise<AttachmentData[]> {
    try {
      // Get the full message to extract attachment information
      const response = await this.gmail.users.messages.get({
        userId: this.userId,
        id: messageId,
        format: 'full',
      });
      
      const message = response.data;
      const attachments: AttachmentData[] = [];
      
      // Function to recursively find parts with attachments
      const findAttachments = (parts: gmail_v1.Schema$MessagePart[] | undefined): void => {
        if (!parts) return;
        
        for (const part of parts) {
          if (part.filename && part.filename.trim() !== '' && part.body?.attachmentId) {
            attachments.push({
              id: part.body.attachmentId,
              filename: part.filename,
              mimeType: part.mimeType || 'application/octet-stream',
              size: parseInt(String(part.body.size || '0'), 10),
              data: '' // We don't fetch the actual data here
            });
          }
          
          // Recursively check for attachments in nested parts
          if (part.parts) {
            findAttachments(part.parts);
          }
        }
      };
      
      // Process all parts of the message
      findAttachments(message.payload?.parts);
      
      return attachments;
    } catch (error) {
      throw new Error(`Failed to list attachments for message ${messageId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} 