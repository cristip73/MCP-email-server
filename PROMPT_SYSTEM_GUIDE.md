# Gmail MCP Server - Prompt System Guide

This document provides a comprehensive overview of the 14 prompt templates included in the Gmail MCP server. These prompts serve as intelligent guides that help users understand how to effectively use the server's tools and capabilities.

## Overview

The prompt system in this Gmail MCP server is designed to provide detailed, contextual guidance for complex email operations. Each prompt acts as an interactive assistant that explains not just what to do, but how to do it correctly, including common patterns, important distinctions, and best practices.

## Prompt Categories

### 📧 Email Operations (4 prompts)
- Email reading and analysis
- New email composition  
- Reply operations (single and reply-all)
- Email forwarding

### 🔍 Search & Discovery (2 prompts)
- Recent email retrieval
- Advanced email search

### 🏷️ Organization & Management (4 prompts)
- Label management operations
- Message state modifications
- Send-as account management
- Timezone configuration

### 📎 Content Management (4 prompts)
- Draft lifecycle management
- Attachment operations
- File saving and security

---

## Detailed Prompt Reference

### 1. `read_email` - Email Analysis & Context Extraction

**Purpose**: Comprehensive email analysis with complete metadata extraction and context understanding.

**Key Features**:
- **Complete Email Parsing**: Extracts all email components including headers, content, and state information
- **Thread Context**: Identifies thread position and participant information  
- **Category Detection**: Determines Gmail categories (Primary, Social, Promotions, Updates, Forums)
- **Timezone Awareness**: All timestamps adjusted to user's configured timezone
- **Attachment Analysis**: Lists all attachments with metadata

**Parameters**: `messageId`

**What It Returns**:
- Basic information (subject, from, to, date, message ID, thread ID)
- Email state (read/unread status, location, category, labels)
- Thread context (position, message count, participants)
- Content (full message, format type, quote levels)
- Attachment details (filenames, types, sizes)

**Special Instructions**:
- Provides structured output format for consistent parsing
- Handles both HTML and plain text content
- Identifies quote levels in reply chains
- Shows all Gmail labels and categories

---

### 2. `send_email` - New Email Composition

**Purpose**: Simple, straightforward guidance for sending new emails.

**Key Features**:
- **Multi-Account Support**: Automatic sender address selection
- **Thread Integration**: Can be linked to existing threads
- **CC/BCC Support**: Full recipient management

**Parameters**: `to`, `subject`, `content`, `from`

**What It Does**:
- Sends new emails with proper headers
- Uses specified or default sender address
- Maintains thread context when linked to existing conversations

**Best For**:
- Creating new conversations
- Sending standalone messages
- Initial outreach emails

---

### 3. `send_reply` - Thread Reply Operations

**Purpose**: Proper email threading with correct headers and sender address selection.

**Key Features**:
- **Thread Preservation**: Maintains conversation context with proper headers
- **Smart Addressing**: Uses the address that received the original email
- **Reference Tracking**: Builds proper References header chain

**Parameters**: `threadId`, `fromAddress`, `subject`, `content`, `inReplyTo`

**What It Ensures**:
- Replies appear in correct thread
- From address matches original recipient
- Subject has "Re:" prefix
- References header maintains thread integrity

**Technical Details**:
- Automatically builds References chain from original message
- Selects appropriate send-as address based on original recipient
- Preserves thread ID for proper Gmail threading

---

### 4. `send_reply_all` - Group Reply Operations

**Purpose**: Reply to all participants while maintaining proper etiquette and avoiding self-sends.

**Key Features**:
- **Automatic Recipient Management**: Includes all original recipients (To + CC)
- **Self-Exclusion**: Automatically removes your own addresses from recipients
- **Smart From Selection**: Uses the address that received the original email
- **Thread Continuity**: Maintains conversation threading

**Parameters**: `messageId`, `body`, `additionalRecipients`, `excludeRecipients`

**Automatic Behaviors**:
- Extracts all original recipients from To and CC fields
- Filters out sender's own email addresses
- Formats subject with "Re:" prefix
- Sets proper threading headers
- Uses correct From address based on original recipient

**Use Cases**:
- Group work discussions
- Team communication
- Meeting coordination
- Continuing multi-person conversations

---

### 5. `get_recent_emails` - Time-Based Email Retrieval

**Purpose**: Retrieve recent emails with sophisticated time filtering and category support.

**Key Features**:
- **Multiple Time Options**: Choose between calendar dates, rolling windows, or custom ranges
- **Category Filtering**: Filter by Gmail's inbox categories
- **Pagination Support**: Handle large result sets efficiently
- **Timezone Awareness**: All date calculations use configured timezone

**Parameters**: `hours`, `category`, `maxResults`, `query`, `pageToken`, `timeFilter`, `autoFetchAll`

**Time Filter Options**:
1. **Calendar Date Filters** (Recommended):
   - `timeFilter: "today"` - Today's calendar date (00:00 to 23:59)
   - `timeFilter: "yesterday"` - Yesterday's calendar date
   - `timeFilter: "last24h"` - Rolling 24-hour window

2. **Hour-Based Filters**:
   - `hours: 24` - Last 24 hours (rolling window)
   - `hours: 48` - Last 48 hours

3. **Custom Date Ranges**:
   - `query: "after:YYYY/MM/DD before:YYYY/MM/DD"`

**Important Distinctions**:
- **Categories vs Labels**: Categories are Gmail's inbox tabs; labels are custom/system tags
- **Unread Syntax**: Always use `"label:unread"` not `"is:unread"`
- **Date Precision**: Calendar dates vs rolling time windows

**Common Patterns**:
- Today's unread Primary emails: `timeFilter: "today"`, `category: "primary"`, `query: "label:unread"`
- Last 3 Updates: `timeFilter: "last24h"`, `category: "updates"`, `maxResults: 3`
- Yesterday's actionable items: `timeFilter: "yesterday"`, `query: "label:unread -has:muted -in:sent"`

---

### 6. `search_emails` - Advanced Email Search

**Purpose**: Comprehensive email search using Gmail's full query syntax with category and time filtering.

**Key Features**:
- **Full Gmail Query Syntax**: Support for all Gmail search operators
- **Date Transformation**: Converts YYYY/MM/DD dates to Unix timestamps for precision
- **Category Integration**: Combine text search with category filtering
- **Batch Operations**: Auto-fetch up to 100 results

**Parameters**: `query`, `category`, `maxResults`, `pageToken`, `timeFilter`, `autoFetchAll`

**Search Operators Guide**:
- `"label:unread"` - Unread emails (NOT `"is:unread"`)
- `"after:YYYY/MM/DD"` - Emails after specific date
- `"before:YYYY/MM/DD"` - Emails before specific date
- `"newer_than:Nd"` - Emails from last N days
- `"-in:sent"` - Exclude sent emails
- `"has:attachment"` - Emails with attachments
- `"label:important"` - Important emails
- `"-has:muted"` - Exclude muted conversations

**Advanced Patterns**:
- Unanswered Primary emails: `query: "label:unread -in:sent"`, `timeFilter: "today"`, `category: "primary"`
- Important notifications: `query: "label:unread label:important"`, `category: "updates"`
- Forum discussions: `query: "after:2025/03/16 before:2025/03/17"`, `category: "forums"`

**Technical Notes**:
- Date strings automatically converted to Unix timestamps
- Categories and labels are handled separately for optimal performance
- Pagination tokens provided for large result sets

---

### 7. `label_management` - Comprehensive Label Operations

**Purpose**: Complete Gmail label management with creation, modification, and organization capabilities.

**Key Features**:
- **Full CRUD Operations**: Create, read, update, delete labels
- **Visibility Control**: Manage label visibility in different Gmail interfaces
- **Color Management**: Set custom colors for visual organization
- **System Label Handling**: Understand limitations with system labels

**Available Operations**:

1. **LIST LABELS**: Show all labels (system + custom)
2. **GET LABEL DETAILS**: Full label information including counts
3. **CREATE LABEL**: New custom labels with visibility and color options
4. **UPDATE LABEL**: Modify existing label properties
5. **DELETE LABEL**: Remove custom labels (system labels protected)
6. **MODIFY MESSAGE LABELS**: Add/remove labels from specific messages

**Label Properties**:
- `messageListVisibility`: "show" or "hide" (controls message list appearance)
- `labelListVisibility`: "labelShow", "labelShowIfUnread", or "labelHide"
- `textColor`: Hex color code for label text
- `backgroundColor`: Hex color code for label background

**Common Operations**:
- Mark as read: Remove UNREAD label
- Mark as unread: Add UNREAD label  
- Archive: Remove INBOX label
- Move to inbox: Add INBOX label
- Trash: Add TRASH label, remove INBOX

**System Label Notes**:
- System labels use UPPERCASE names (INBOX, UNREAD, TRASH)
- Cannot modify system label properties
- Gmail limit: 10,000 labels per mailbox

---

### 8. `modify_labels` - Message Label Modifications

**Purpose**: Add or remove labels from specific messages with clear guidance on system labels.

**Key Features**:
- **Flexible Operations**: Add and/or remove multiple labels in one operation
- **System Label Guide**: Clear explanation of all system labels
- **Common Operations**: Pre-defined patterns for frequent tasks

**Parameters**: `messageId`, `addLabelIds`, `removeLabelIds`

**System Labels Explained**:
- `INBOX` - Message appears in inbox
- `UNREAD` - Message is marked as unread
- `STARRED` - Message is starred
- `IMPORTANT` - Message is marked as important
- `SENT` - Message was sent by the user
- `DRAFT` - Message is a draft
- `TRASH` - Message is in trash
- `SPAM` - Message is in spam

**Quick Operations Guide**:
- Mark as read: Remove `UNREAD` label
- Archive: Remove `INBOX` label
- Star: Add `STARRED` label
- Trash: Add `TRASH` and remove `INBOX`

---

### 9. `timezone_info` - Timezone Configuration

**Purpose**: Understand and verify the system's timezone configuration for accurate email timestamp handling.

**Key Features**:
- **Configuration Display**: Shows current TIME_ZONE setting
- **Offset Calculation**: Displays numeric hour offset
- **Time Comparison**: Shows current time in both local and UTC
- **Impact Explanation**: Explains how timezone affects email operations

**What It Returns**:
- Configured timezone (from TIME_ZONE environment variable)
- Calculated offset in hours
- Current date/time adjusted to timezone
- Current date/time in UTC for comparison

**Usage Context**:
- Verify correct timezone setup
- Understand email timestamp adjustments
- Debug date-related query issues
- Confirm local vs UTC time differences

---

### 10. `send_as_accounts` - Multi-Account Management

**Purpose**: Manage multiple sending addresses and understand account capabilities.

**Key Features**:
- **Account Discovery**: List all available send-as addresses
- **Default Identification**: Shows which account is default
- **Verification Status**: Displays account verification information
- **Usage Guidelines**: Explains proper address selection

**Account Information Returned**:
- Email address
- Display name
- Default status indicator
- Primary account indicator
- Verification status

**Integration Points**:
- Used by send_email tool for "from" parameter selection
- Automatic address selection in reply operations
- Self-filtering in reply-all operations

**Best Practices**:
- Always send from contextually appropriate address
- Reply using the address that received the original email
- Verify account status before sending

---

### 11. `forward_email` - Email Forwarding

**Purpose**: Forward emails to new recipients with proper formatting and header preservation.

**Key Features**:
- **Automatic Formatting**: Adds "Fwd:" prefix if not present
- **Header Preservation**: Includes original message headers
- **Self-Protection**: Removes your addresses from recipient lists
- **Custom Content**: Add additional commentary before forwarded content

**Parameters**: `messageId`, `to`, `additionalContent`, `cc`, `from`

**Automatic Behaviors**:
- Subject prefixed with "Fwd:" if needed
- Original headers included (From, Date, Subject, To, Cc)
- Your addresses filtered from recipient lists
- Default send-as address used if not specified

**Content Structure**:
- Your additional content (if provided)
- Original message headers
- Original message content
- Attachments preserved

---

### 12. `draft_management` - Draft Lifecycle

**Purpose**: Complete workflow for managing email drafts from creation to sending.

**Key Features**:
- **Full Lifecycle Support**: Create, read, update, delete, send drafts
- **Workflow Guidance**: Step-by-step draft management process
- **Use Case Examples**: When and why to use drafts

**Available Operations**:

1. **CREATE_DRAFT**: New draft creation
2. **GET_DRAFT**: Retrieve draft details
3. **LIST_DRAFTS**: Browse all drafts with pagination
4. **UPDATE_DRAFT**: Modify existing draft content
5. **DELETE_DRAFT**: Remove unwanted drafts
6. **SEND_DRAFT**: Convert draft to sent email

**Typical Workflow**:
1. Create draft with initial content
2. Review draft using get_draft or list_drafts
3. Update draft if needed
4. Send draft or delete if no longer needed

**Draft Use Cases**:
- Important email preparation and review
- Save work-in-progress emails
- Email templates for frequent use
- Collaborative email composition

---

### 13. `attachment_management` - Attachment Operations

**Purpose**: Comprehensive attachment handling with security-focused file operations.

**Key Features**:
- **Complete Workflow**: From discovery to secure file saving
- **Security Focus**: All operations within configured safe folder
- **Metadata Extraction**: Detailed attachment information
- **Type Support**: Handles all attachment types (documents, images, archives)

**Operations Available**:

1. **LIST_ATTACHMENTS**: 
   - Shows all attachments in an email
   - Provides metadata (name, type, size)
   - No file download required

2. **SAVE_ATTACHMENT**:
   - Downloads and saves to disk
   - Security-controlled location (DEFAULT_ATTACHMENTS_FOLDER)
   - Automatic file validation

**Typical Workflow**:
1. Find email using search tools
2. List attachments to see what's available
3. Save specific attachments using secure save operation

**Security Features**:
- All files saved within DEFAULT_ATTACHMENTS_FOLDER
- Base64 conversion handled automatically
- File integrity verification
- Disk write confirmation

---

### 14. `save_attachment` - Secure File Saving

**Purpose**: Detailed guidance for securely saving email attachments to disk.

**Key Features**:
- **Multi-Stage Matching**: Find attachments by ID or filename
- **Security Enforcement**: Path validation and containment
- **Automatic Management**: Directory creation, file validation
- **Flexible Identification**: Multiple ways to specify attachments

**Parameters**: `messageId`, `attachmentId`, `targetPath`

**Attachment Identification Methods**:
1. Specific attachment ID (like 'f_mamj3yyo1')
2. Filename (like 'document.pdf')
3. First attachment (if attachmentId omitted)

**Security Features**:
- Path normalization prevents directory traversal
- All files contained within DEFAULT_ATTACHMENTS_FOLDER
- Absolute paths automatically redirected to safe location
- Directory creation when needed

**Process Steps**:
1. Identify email with attachment
2. List available attachments (optional)
3. Specify target path within safe folder
4. Execute save with automatic validation

**Key Capabilities**:
- Handles large files efficiently
- Preserves original filenames or uses custom names
- Creates subdirectories as needed
- Verifies file integrity after saving

---

## How the Prompt System Works

### 1. **Interactive Guidance**
Each prompt provides step-by-step instructions, not just parameter lists. Users get contextual help that explains the "why" behind each operation.

### 2. **Common Patterns**
Prompts include real-world examples and common usage patterns, making complex operations more approachable.

### 3. **Error Prevention**
Important distinctions and potential pitfalls are clearly explained (e.g., "label:unread" vs "is:unread", categories vs labels).

### 4. **Security Awareness**
Security considerations are built into prompts, especially for file operations and multi-account scenarios.

### 5. **Integration Guidance**
Prompts explain how different tools work together, creating comprehensive workflows.

## Best Practices for Using Prompts

### 1. **Read the Full Template**
Each prompt contains valuable context beyond just parameter requirements.

### 2. **Use Examples as Guides**
The provided examples demonstrate proper syntax and common patterns.

### 3. **Pay Attention to Distinctions**
Important differences (like calendar dates vs rolling windows) are highlighted for accuracy.

### 4. **Follow Security Guidelines**
Especially important for attachment operations and multi-account usage.

### 5. **Understand Automation**
Know what the system handles automatically (like timezone conversion, address filtering).

## Technical Implementation

The prompt system is implemented in `src/prompt-handler.ts` with:

- **Template Engine**: Parameter substitution with validation
- **Structured Format**: Consistent prompt structure across all operations
- **Validation**: Required parameter checking before prompt generation
- **Metadata**: Each prompt includes parameter lists and expected outputs
- **Integration**: Direct integration with MCP protocol for seamless usage

This comprehensive prompt system transforms the Gmail MCP server from a simple tool collection into an intelligent assistant that guides users through complex email operations with confidence and accuracy.