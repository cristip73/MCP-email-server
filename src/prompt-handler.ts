import { GetPromptRequest, GetPromptResult, ListPromptsResult } from "@modelcontextprotocol/sdk/types.js";

export interface EmailPrompt {
  name: string;
  description: string;
  template: string;
  parameters: string[];
  required_output: string[];
}

export const emailPrompts: Record<string, EmailPrompt> = {
  read_email: {
    name: "read_email",
    description: "Read an email and extract all necessary context including state, category and thread information",
    template: `
Given an email message, please analyze and provide:

1. Basic Information:
   - Subject
   - From address
   - To address(es)
   - Date received
   - Message ID
   - Thread ID (if part of a thread)

2. Email State:
   - Read/Unread status
   - Location (Inbox, Archive, Trash, etc.)
   - Category (Primary, Social, Promotions, etc.)
   - Labels attached

3. Thread Context (if applicable):
   - Position in thread (first message, reply, etc.)
   - Number of messages in thread
   - Other participants in thread

4. Content:
   - Full message content
   - Format (plain text/HTML)
   - Quote level (if it's a reply)

5. Attachments (if any):
   - File names
   - Types
   - Sizes

Please format the output as follows:
----------------------------------------
BASIC INFORMATION
Subject: [subject]
From: [from_address]
To: [to_addresses]
Date: [date]
Message ID: [message_id]
Thread ID: [thread_id]

EMAIL STATE
Read Status: [read/unread]
Location: [inbox/archive/trash]
Category: [primary/social/promotions/updates/forums]
Labels: [list of labels]

THREAD CONTEXT
Thread Position: [position]
Messages in Thread: [count]
Participants: [list of participants]

CONTENT
Format: [text/html]
[content]

ATTACHMENTS
[list of attachments with details]
    `,
    parameters: ["messageId"],
    required_output: [
      "messageId", 
      "threadId", 
      "subject", 
      "from", 
      "to", 
      "date", 
      "isUnread", 
      "category", 
      "isInInbox", 
      "labels", 
      "content"
    ]
  },
  
  send_email: {
    name: "send_email",
    description: "Send a new email",
    template: `
Send a new email with recipient(s), subject, and content. Optional 'from' parameter allows multi-account sending.
    `,
    parameters: ["to", "subject", "content", "from"],
    required_output: ["messageId"]
  },

  send_reply_all: {
    name: "send_reply_all",
    description: "Reply to an email and include all original recipients",
    template: `
When you need to Reply All to an email, keeping all original recipients in the loop, you need:

1. Original Message ID (required)
   This identifies the specific email you're replying to

2. Reply Content (required) 
   The body text of your reply message

3. Additional Recipients (optional)
   Any new recipients you want to add to the conversation

4. Exclude Recipients (optional)
   Any original recipients you want to remove from this reply

WHAT REPLY ALL DOES:
- Sends a reply to the original sender AND all other recipients (To + CC)
- Maintains the email thread (keeps subject with Re: prefix)
- Sets proper email headers to show as part of the same conversation
- Excludes your own email address to prevent sending to yourself
- Uses the correct "From" address (the one that received the original email)

Example usage:
- Reply to a work email including everyone in the original thread
- Continue a group conversation
- Respond to a message where multiple people need to see your response

Note: You only need to provide the messageId and your reply content.
The tool will automatically:
1. Extract all original recipients
2. Filter out your own email address
3. Format the subject line correctly
4. Set all required email headers for threading
    `,
    parameters: ["messageId", "body", "additionalRecipients", "excludeRecipients"],
    required_output: ["messageId", "threadId", "to", "cc"]
  },

  get_recent_emails: {
    name: "get_recent_emails",
    description: "Get recent emails with support for Gmail categories, read state, and date filtering",
    template: `
To get recent emails, please CHOOSE ONE time filtering method:

OPTION 1: Use the timeFilter parameter (RECOMMENDED FOR CALENDAR DATES)
- timeFilter: "today" - Gets emails from today's calendar date (00:00 to 23:59)
- timeFilter: "yesterday" - Gets emails from yesterday's calendar date
- timeFilter: "last24h" - Gets emails from the last 24 hours (rolling window)

OPTION 2: Use the hours parameter (FOR TIME WINDOWS)
- hours: 24 - Gets emails from the last 24 hours (rolling window)
- hours: 48 - Gets emails from the last 48 hours

OPTION 3: Use date filters in query parameter (FOR CUSTOM DATE RANGES)
- query: "after:YYYY/MM/DD before:YYYY/MM/DD" - Gets emails between specific dates

IMPORTANT DISTINCTIONS:
- For "today" (a calendar date), use timeFilter:"today" not hours:24
- For "last 24 hours" (a time window), use timeFilter:"last24h" or hours:24
- For unread emails, ALWAYS use "label:unread" not "is:unread"

You can also specify:
- category (optional): "primary", "social", "promotions", "updates", "forums"
- maxResults (optional): maximum number of results to return (default: 25)
- query (optional): additional Gmail search criteria
- autoFetchAll (optional): set to true to automatically fetch all results (up to 100) without manual pagination

CATEGORIES VS LABELS:
- CATEGORIES are Gmail's inbox sections (primary, social, promotions, updates, forums)
  * To filter by category: use the "category" parameter
  * Example: category: "forums" (NOT "label:forums" or "category:forums" in query)
  
- LABELS are custom tags in Gmail (like "unread", "important", "work", etc.)
  * To filter by label: include "label:X" in the query parameter
  * Example: query: "label:unread label:important" (NOT category: "unread")

Common search patterns:
1. Today's unread emails from Primary:
   timeFilter: "today", category: "primary", query: "label:unread"

2. Last 3 unread emails from Updates category:
   timeFilter: "last24h", category: "updates", query: "label:unread", maxResults: 3

3. Unread emails from yesterday needing reply:
   timeFilter: "yesterday", query: "label:unread -has:muted -in:sent"

4. Today's important notifications:
   timeFilter: "today", category: "updates", query: "label:important"

5. All unread forum emails (up to 100) from March 16, 2025:
   query: "after:2025/03/16 before:2025/03/17 label:unread", category: "forums", autoFetchAll: true

PAGINATION:
- By default, only 25 results are returned even if more matching emails exist
- If there are more results, a nextPageToken will be provided
- To view all results at once (up to 100), use autoFetchAll: true
- To get specific pages, use the pageToken parameter with the token from previous results

The search will return:
- Email subject, sender, and recipients
- Email category and read state
- Whether the email is in inbox
- Timestamp when email was received
- Preview of content
- Next page token if more results are available
    `,
    parameters: ["hours", "category", "maxResults", "query", "pageToken", "timeFilter", "autoFetchAll"],
    required_output: ["messageId", "subject", "from", "to", "category", "isUnread", "isInInbox", "received"]
  },

  search_emails: {
    name: "search_emails",
    description: "Search for emails with support for Gmail categories, read state, and precise date filtering",
    template: `
To search for emails, please provide:
1. Search query (required)
2. Time filter (optional but RECOMMENDED):
   - timeFilter: "today" - Search within today's calendar date (00:00 to 23:59)
   - timeFilter: "yesterday" - Search within yesterday's calendar date
   - timeFilter: "last24h" - Search within last 24 hours (rolling window)

You can also specify:
- category (optional): "primary", "social", "promotions", "updates", "forums"
- maxResults (optional): maximum number of results to return (default: 25)
- autoFetchAll (optional): set to true to automatically fetch all results (up to 100) without manual pagination

IMPORTANT DISTINCTIONS:
- For "today" (a calendar date), use timeFilter:"today" not date in query
- For "yesterday", use timeFilter:"yesterday"
- For unread emails, ALWAYS use "label:unread" not "is:unread"

CATEGORIES VS LABELS:
- CATEGORIES are Gmail's inbox sections (primary, social, promotions, updates, forums)
  * To filter by category: use the "category" parameter
  * Example: category: "forums" (NOT "label:forums" or "category:forums" in query)
  
- LABELS are custom tags in Gmail (like "unread", "important", "work", etc.)
  * To filter by label: include "label:X" in the query parameter
  * Example: query: "label:unread label:important" (NOT category: "unread")

Common search patterns:
1. Today's unread emails in Primary:
   query: "label:unread", timeFilter: "today", category: "primary"

2. Unread emails from last week in Updates:
   query: "label:unread newer_than:7d", category: "updates"

3. Unanswered emails in Primary from today:
   query: "label:unread -in:sent", timeFilter: "today", category: "primary"

4. Important unread notifications from today:
   query: "label:unread label:important", timeFilter: "today", category: "updates"

5. Emails needing follow-up received yesterday:
   query: "label:unread -has:muted -in:sent", timeFilter: "yesterday"

6. All forum emails (up to 100) from March 16, 2025:
   query: "after:2025/03/16 before:2025/03/17", category: "forums", autoFetchAll: true

PAGINATION:
- By default, only 25 results are returned even if more matching emails exist
- If there are more results, a nextPageToken will be provided
- To view all results at once (up to 100), use autoFetchAll: true
- To get specific pages, use the pageToken parameter with the token from previous results

Search operators to remember:
- "label:unread" for unread emails (NOT "is:unread")
- "after:YYYY/MM/DD" for emails after specific date
- "before:YYYY/MM/DD" for emails before specific date
- "newer_than:Nd" for emails from last N days
- "-in:sent" to exclude sent emails
- "has:attachment" for emails with attachments
- "label:important" for important emails
- "-has:muted" to exclude muted conversations

The search will return:
- Email subject, sender, and recipients
- Email category and read state
- Whether the email is in inbox
- Timestamp when email was received
- Preview of content
- Next page token if more results are available
    `,
    parameters: ["query", "category", "maxResults", "pageToken", "timeFilter", "autoFetchAll"],
    required_output: ["messageId", "subject", "from", "to", "category", "isUnread", "isInbox", "received"]
  },

  label_management: {
    name: "label_management",
    description: "Manage Gmail labels including listing, creating, updating, and deleting labels",
    template: `
To manage Gmail labels, you can use the following operations:

1. LIST LABELS
   - Lists all labels in your mailbox
   - Shows system labels (like INBOX, SENT, TRASH) and your custom labels
   - Provides label IDs needed for other operations
   - No parameters needed

2. GET LABEL DETAILS
   - Shows full details about a specific label including:
     * Name, ID, and type (system or user)
     * Visibility settings
     * Color information
     * Message and thread counts
   - Required parameter: labelId

3. CREATE LABEL
   - Creates a new custom label in your mailbox
   - Required parameter: name
   - Optional parameters:
     * messageListVisibility: "show" or "hide" (controls visibility in message list)
     * labelListVisibility: "labelShow", "labelShowIfUnread", or "labelHide" (controls visibility in label list)
     * textColor: hex color code (e.g., "#000000")
     * backgroundColor: hex color code (e.g., "#ffffff")

4. UPDATE LABEL
   - Modifies an existing label's properties
   - Required parameter: labelId
   - Optional parameters (only specify what you want to change):
     * name: new name for the label
     * messageListVisibility: "show" or "hide"
     * labelListVisibility: "labelShow", "labelShowIfUnread", or "labelHide"
     * textColor: hex color code
     * backgroundColor: hex color code

5. DELETE LABEL
   - Permanently removes a label from your mailbox
   - The label will also be removed from any messages it was applied to
   - Required parameter: labelId
   - IMPORTANT: Cannot delete system labels (INBOX, SENT, etc.)

6. MODIFY MESSAGE LABELS
   - Add and/or remove labels from a specific message
   - Required parameter: messageId
   - Optional parameters (at least one required):
     * addLabelIds: array of label IDs to add
     * removeLabelIds: array of label IDs to remove

COMMON OPERATIONS:

1. Mark message as read:
   - Removes the UNREAD label
   - Required parameter: messageId

2. Mark message as unread:
   - Adds the UNREAD label
   - Required parameter: messageId

3. Archive message:
   - Removes the INBOX label
   - Required parameter: messageId

4. Move message to inbox:
   - Adds the INBOX label
   - Required parameter: messageId

5. Move message to trash:
   - Adds the TRASH label and removes from INBOX
   - Required parameter: messageId

IMPORTANT NOTES:
- System labels have uppercase names (INBOX, UNREAD, TRASH, etc.)
- User labels generally use regular casing
- You cannot modify system label properties
- Gmail has a limit of 10,000 labels per mailbox
    `,
    parameters: [],
    required_output: ["operation", "parameters"]
  },
  
  modify_labels: {
    name: "modify_labels",
    description: "Add or remove labels from a message",
    template: `
Add or remove labels from a message. Requires messageId and at least one of: addLabelIds or removeLabelIds.

SYSTEM LABELS:
- INBOX - Message appears in inbox
- UNREAD - Message is marked as unread
- STARRED - Message is starred
- IMPORTANT - Message is marked as important
- SENT - Message was sent by the user
- DRAFT - Message is a draft
- TRASH - Message is in trash
- SPAM - Message is in spam
    `,
    parameters: ["messageId", "addLabelIds", "removeLabelIds"],
    required_output: ["messageId", "labels"]
  },

  timezone_info: {
    name: "timezone_info",
    description: "Check the system's time zone configuration",
    template: `
Returns timezone configuration, offset in hours, current local time, and UTC time for comparison.
    `,
    parameters: [],
    required_output: ["timeZoneConfig", "offsetHours", "currentTimeLocal", "currentTimeUTC"]
  },

  forward_email: {
    name: "forward_email",
    description: "Forward an email to other recipients",
    template: `
To forward an email to other recipients, use the forward_email tool.

Required parameters:
1. messageId - The ID of the message to be forwarded
2. to - The list of recipients who will receive the forwarded email

Optional parameters:
- additionalContent - Additional content that you want to add before the forwarded message
- cc - List of CC recipients
- from - The specific address from which you want to send (from your send-as accounts)

Behavior:
- The subject will be automatically prefixed with "Fwd:" if it does not already have that prefix
- The content will include the original message headers (From, Date, Subject, To, Cc)
- Your own addresses are automatically removed from the lists to avoid self-sending
- If you do not specify a "from" address, the default address from your accounts will be used

Example usage:
"I want to forward the email with ID <message_id> to john@example.com and add a comment beforehand."

Note: The forwarded email will contain all the original content, including headers and attachments.
    `,
    parameters: ["messageId", "to", "additionalContent", "cc", "from"],
    required_output: ["messageId", "threadId", "to", "subject", "from"]
  },

  draft_management: {
    name: "draft_management",
    description: "Manage drafts in the email account",
    template: `
To manage email drafts, you have the following tools available:

1. CREATE_DRAFT
   Creates a new draft for an email.
   Required parameters:
   - to: List of recipients
   - subject: The email's subject
   - body: The email's content
   Optional parameters:
   - cc: CC recipients
   - bcc: BCC recipients
   - from: The address from which you send

2. GET_DRAFT
   Retrieves the details of an existing draft.
   Required parameter:
   - draftId: The draft's ID

3. LIST_DRAFTS
   Lists all drafts in the account.
   Optional parameters:
   - maxResults: Maximum number of drafts (default 20)
   - pageToken: Token for the next page
   - query: Search filter

4. UPDATE_DRAFT
   Updates an existing draft.
   Required parameters:
   - draftId: The draft's ID
   - to: The new list of recipients
   - subject: The new subject
   - body: The new content
   Optional parameters:
   - cc, bcc, from: Same as in create_draft

5. DELETE_DRAFT
   Permanently deletes a draft.
   Required parameter:
   - draftId: The draft's ID

6. SEND_DRAFT
   Sends an existing draft.
   Required parameter:
   - draftId: The draft's ID

TYPICAL WORKFLOW:
1. Create a draft with create_draft
2. Check the draft with get_draft or list_drafts
3. Update the draft with update_draft if necessary
4. Send the draft with send_draft or delete it with delete_draft

Drafts are useful when:
- You want to prepare an important email before sending it
- You need to come back to an email later to finish it
- You need to save an email template for frequent use
- You want to review the content before sending
    `,
    parameters: [],
    required_output: ["operation", "draftId"]
  },

  attachment_management: {
    name: "attachment_management",
    description: "Manage email attachments",
    template: `
To manage email attachments, you can use the following tools:

1. LIST_ATTACHMENTS
   Lists all attachments in an email.
   Required parameter:
   - messageId: ID of the message for which to list attachments
   Result:
   - List of all attachments with their details (name, type, size)

2. SAVE_ATTACHMENT
   Saves an attachment from an email directly to disk in the configured DEFAULT_ATTACHMENTS_FOLDER.
   Required parameters:
   - messageId: ID of the message containing the attachment
   - targetPath: Filename or relative path where the attachment will be saved (inside DEFAULT_ATTACHMENTS_FOLDER)
   Optional parameters:
   - attachmentId: ID of the attachment (if not specified, will automatically use the first attachment)
   Result:
   - Information about the saved attachment and confirmation that the file was written to disk

TYPICAL WORKFLOW:
1. Get an email using read_email or search_emails
2. List its attachments using list_attachments
3. Save a specific attachment using save_attachment

IMPORTANT NOTE:
Save_attachment is the only approved method for handling attachments. It automatically manages:
- Downloading the attachment
- Base64 conversion
- Writing the file to disk
- Verifying proper file saving
- Security: All files are saved within the configured DEFAULT_ATTACHMENTS_FOLDER

Example:
1. Identify an email with attachments
2. List the attachments to see what the email contains
3. Save the desired attachment using save_attachment with messageId and targetPath

Note: Attachments can be of different types: documents, images, archives, etc. The MIME type of the attachment indicates its format.
`,
    parameters: ["messageId", "attachmentId"],
    required_output: ["operation", "messageId", "attachments"]
  },

  save_attachment: {
    name: "save_attachment",
    description: "Save an email attachment to the configured default attachments folder",
    template: `
To save an email attachment to the configured DEFAULT_ATTACHMENTS_FOLDER, follow these steps:

1. Identify the email with the attachment
   - Use search_emails or get_recent_emails to find the email
   - Note the message ID (messageId)

2. List available attachments
   - Use list_attachments with the messageId
   - You'll receive a list of all available attachments
   - Optional: Note the attachment ID (attachmentId) you want to save
   - If there's only one attachment or you want the first one, you can omit attachmentId

3. Specify the target path
   - This can be just a filename or a relative path within the DEFAULT_ATTACHMENTS_FOLDER
   - The file will always be saved within the configured DEFAULT_ATTACHMENTS_FOLDER
   - Absolute paths outside this folder will automatically be redirected to DEFAULT_ATTACHMENTS_FOLDER

4. Save the attachment
   - Use save_attachment with messageId and targetPath
   - Optional: Add attachmentId if you want a specific attachment
   - The attachment will be saved directly to disk at the specified location within DEFAULT_ATTACHMENTS_FOLDER

KEY FEATURES OF SAVE_ATTACHMENT:
- Automatically manages the entire process from retrieving data to writing to disk
- Verifies file integrity after saving
- Creates necessary directories if they don't exist
- Automatically selects the first attachment if no ID is specified
- Security: Only allows saving files within the configured DEFAULT_ATTACHMENTS_FOLDER

Example workflow:
1. Find the email with search_emails
2. Identify available attachments with list_attachments
3. Execute save_attachment with messageId and targetPath to save the file

Notes: 
- For large files, the saving process may take longer
- Always verify the file type to ensure it's safe to save
- If targetPath only specifies a directory, the original filename will be used
- If targetPath includes a filename, that will be used instead of the original name
- All files are saved within the DEFAULT_ATTACHMENTS_FOLDER for security reasons
`,
    parameters: ["messageId", "attachmentId", "targetPath"],
    required_output: ["success", "targetPath", "filename", "mimeType", "size"]
  }
};

export function createPromptHandler() {
  return {
    listPrompts: async (): Promise<ListPromptsResult> => ({
      prompts: Object.values(emailPrompts).map(prompt => ({
        name: prompt.name,
        description: prompt.description,
        parameters: prompt.parameters,
        required_output: prompt.required_output
      }))
    }),
    
    getPrompt: async (request: GetPromptRequest): Promise<GetPromptResult> => {
      const promptName = request.params.name as string;
      const prompt = emailPrompts[promptName];
      
      if (!prompt) {
        throw new Error(`Prompt '${promptName}' not found`);
      }
      
      const parameters = request.params.parameters as Record<string, string>;
      
      // Validate required parameters
      const missingParams = prompt.parameters.filter(
        param => !(param in parameters)
      );
      
      if (missingParams.length > 0) {
        throw new Error(
          `Missing required parameters: ${missingParams.join(", ")}`
        );
      }
      
      // Format the prompt template with provided parameters
      let formattedPrompt = prompt.template;
      for (const [key, value] of Object.entries(parameters)) {
        formattedPrompt = formattedPrompt.replace(
          new RegExp(`{${key}}`, "g"),
          String(value)
        );
      }
      
      return {
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: formattedPrompt
          }
        }],
        _meta: {
          required_output: prompt.required_output
        }
      };
    }
  };
} 