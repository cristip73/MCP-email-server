# Gmail MCP Server

A Model Context Protocol (MCP) server that enables Claude Desktop App (or any other app that supports MCP) to interact with Gmail, providing capabilities for reading, searching, and sending emails through a standardized interface, and much more.

## What's different from other MCP for email servers?

Besides the standard send, read, search, etc. it also supports replying to all, CC, BCC, quote the original message, forward emails, create, update, list and delete drafts, manage labels, mark emails as read, unread, archived; attachment saving to your files.

I spent a lot of time to make it resemble Gmail behavior as much as possible. Adding quotes to replies, reply and forward in the same thread, category mangement (primary, social, promotions, updates, forums).

I also spent a lot of time to adjust the date and time to the user's timezone. Default is GMT+0. So when you ask for emails from yesterday, it will be adjusted to the user's timezone.

BEST PRACTICE: When you ask Claude to send an email, ask it write the email/reply/forward and save it as a draft. You can review it and send confirm manually. At least for important emails.

## Installation

### Option 1: Using NPX (Recommended)

You can run the MCP Email Server directly using npx without installing it globally:

```bash
npx @cristip73/email-mcp
```

For authentication (first-time setup):

```bash
npx @cristip73/email-mcp auth
```

### Option 2: Clone and Install Locally

1. **Clone and Install**:
   ```bash
   git clone https://github.com/cristip73/MCP-email-server.git
   cd MCP-email-server
   npm install
   ```

2. **Build the Server**:
   ```bash
   npm run build
   ```

3. **Authenticate with Gmail**:
   ```bash
   npm run auth
   ```
   This will open a browser window to authenticate with your Google account.

4. **Make Package available to Claude**:
   ```bash
   npm link
   ```

## Setting up Google Cloud OAuth Credentials

Before using this application, you need to set up OAuth credentials in Google Cloud:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Library"
4. Search for and enable the "Gmail API"
5. Go to "APIs & Services" > "Credentials"
6. Click "Create Credentials" > "OAuth client ID"
7. Select "Desktop application" as the application type
8. Name your OAuth client (e.g., "MCP Email Client")
9. Download the credentials JSON file

Once downloaded:
- Rename the file to `gcp-oauth.keys.json`
- Place it in either:
  - Your current working directory (it will be copied automatically)
  - The global config directory at `~/.email-mcp/gcp-oauth.keys.json`

## Usage with Claude

### Claude Desktop

How to add the MCP server to Claude Desktop:

Open Claude Desktop > Click on "Claude" in the top menu > Click on "Settings" > Click on "Developer Mode" > Choose "Edit Config" > Edit the claude_desktop_config.json file with Cursor or any other text editor.

#### Example of claude_desktop_config.json file with NPX:

```json
{
  "mcpServers": {
    "email-server": {
      "command": "npx",
      "args": [
        "-y",
        "@cristip73/email-mcp"
      ],
      "env": {
          "TIME_ZONE": "GMT+2",
          "DEFAULT_ATTACHMENTS_FOLDER": "/Users/username/CLAUDE/Attachments"
      }     
    }
  }
}
```

Save the file and restart Claude Desktop. That's it! Enjoy not having to write an email message by hand anymore. Just ask Claude to do it for you.

If you have done all the steps correctly, you should see the email-server in the list of MCP servers in Claude Desktop > Settings > Developer Mode. If you didn't you will get an error message. Ask AI for help if you are unsure.


IMPORTANT: Set the DEFAULT_ATTACHMENTS_FOLDER to a valid path on your system.

IMPORTANT: Set the TIME_ZONE to your local timezone in GMT format. Eg: GMT+2, GMT-5, etc. Otherwise the date and time of the emails will be off, it is set to GMT+0 by default by Gmail.

The server will work also without any TIME_ZONE or DEFAULT_ATTACHMENTS_FOLDER, but your timezone will be off and you will not be able to save attachments.


For Claude Code Editor, you can add the server by running the following command:
```bash
claude mcp add email-server -- /path/to/email-server/build/index.js
```

## Purpose

This server bridges Claude AI with Gmail API, allowing Claude to:
- Send emails and replies (including replies to all, CC and BCC, quote the original message, forward emails, etc.)
- Search and retrieve emails with advanced filters
- Read email content and attachments
- Work with Gmail categories and labels
- Save attachments to a specific folder on your system
- Create, update, list and delete drafts
- Manage labels
- Mark emails as read, unread, archived, etc.
- List attachments in an email
- Save attachments from an email to a specific folder on your system

Unfortunatelly Gmail does not support scheduled emails. It would have been great if it did.



By implementing the Model Context Protocol, it gives Claude the ability to perform authenticated Gmail operations while maintaining security and privacy.

## Project Structure

```
src/
├── index.ts                 # Entry point and server initialization
├── server.ts                # MCP server implementation
├── client-wrapper.ts        # Gmail API client wrapper with multi-account support
├── tool-handler.ts          # Tool registration and request routing
├── prompt-handler.ts        # Prompt management and template system
├── version.ts               # Version information
├── utils.ts                 # Shared utilities for dates, emails, etc.
├── timezone-utils.ts        # Timezone handling and configuration
└── tools/                   # Tool implementations by domain
    ├── email-read-tools.ts  # Tools for reading emails
    ├── email-send-tools.ts  # Tools for sending, replying and forwarding emails
    ├── email-search-tools.ts # Tools for searching and filtering emails
    ├── email-label-tools.ts # Tools for managing labels and message states
    ├── email-attachment-tools.ts # Tools for listing and saving attachments
    ├── email-draft-tools.ts # Tools for managing email drafts
    └── timezone-tool.ts     # Tool for verifying timezone configuration
```

### Core Components

- **index.ts**: Entry point for the application, handles authentication and server initialization
- **server.ts**: Implements the MCP server functionality, registers handlers for tools and prompts
- **client-wrapper.ts**: Wraps Gmail API functionality, implements category support, message transformation, and multi-account handling
- **tool-handler.ts**: Routes tool requests to appropriate handlers and formats responses
- **prompt-handler.ts**: Manages templates and examples for common Gmail operations
- **utils.ts**: Provides utility functions for date formatting, email creation, content extraction, and proper UTF-8 encoding
- **timezone-utils.ts**: Handles timezone parsing, conversion, and formatting for consistent date handling
- **tools/**: Contains domain-specific implementations for email operations
  - **email-read-tools.ts**: Tools for reading emails and extracting content
  - **email-send-tools.ts**: Tools for sending emails, replying and forwarding
  - **email-search-tools.ts**: Tools for searching and filtering emails
  - **email-label-tools.ts**: Tools for managing labels and message states (read/unread, archive/unarchive)
  - **email-attachment-tools.ts**: Tools for listing attachments and saving them securely to disk
  - **email-draft-tools.ts**: Tools for creating, updating, listing, and sending email drafts
  - **timezone-tool.ts**: Tool for verifying timezone configuration and comparing time formats

## Configuration

The server supports the following configuration:

- `TIME_ZONE`: Timezone configuration in format like 'GMT+2' or 'GMT-5' (default: 'GMT+0')
- `DEFAULT_ATTACHMENTS_FOLDER`: Path to the directory where email attachments can be saved (e.g., '/Users/username/CLAUDE/attachments')

### Important Path Information

When you see `~/.email-mcp/credentials.json` in the documentation, this refers to:

- **macOS**: `/Users/[your-username]/.email-mcp/credentials.json`
- **Linux**: `/home/[your-username]/.email-mcp/credentials.json`
- **Windows**: `C:\Users\[your-username]\.email-mcp\credentials.json`

The same applies to `~/.email-mcp/gcp-oauth.keys.json`.

These files are stored in a hidden directory in your user home folder. The application automatically creates this directory during the authentication process.

## Features

### Email Operations

- **Send Email**: Send new emails with support for CC, BCC, and attachments
- **Reply**: Reply to existing emails while maintaining thread context
- **Reply All**: Reply to all recipients in a thread while filtering out your own addresses
- **Forward**: Forward emails to other recipients with original headers and formatting
- **Read Email**: Retrieve and display email content, headers, and attachments
- **Search Emails**: Search emails using Gmail's query syntax with enhanced features

### Draft Management

- **Create Drafts**: Save email drafts for later editing or sending
- **List Drafts**: View all saved drafts with pagination support
- **Update Drafts**: Edit existing drafts with full content modification
- **Send Drafts**: Convert saved drafts to sent emails
- **Delete Drafts**: Remove drafts that are no longer needed

### Advanced Functionality

- **Pagination**: Navigate through large result sets with `pageToken` support
- **Gmail Categories**: Filter by Gmail's categories (Primary, Social, Promotions, etc.)
- **Time Filtering**: Search by predefined time periods (today, yesterday, last 24h)
- **Unread Status**: Automatic handling of unread email filtering
- **HTML Content**: Process and display both HTML and plain text email content
- **Thread Context**: Maintain email threading for proper conversation context
- **Multi-Account Support**: Automatic handling of multiple sending addresses and aliases
- **Smart Reply Addressing**: Selection of correct sending address based on original recipient
- **UTF-8 Encoding**: Proper encoding of international characters in subject and body content
- **Secure Attachment Handling**: Restricted attachment saving to designated folder with path validation

### Label Management

- **Custom Labels**: Create, update, and delete custom labels
- **Label Visibility**: Control visibility of labels in message list and label list
- **Label Colors**: Configure text and background colors for visual organization
- **Message States**: Mark messages as read/unread, archive/unarchive messages
- **Trash Management**: Move messages to trash

### Time Zone Support

- **Display and Query Emails**: Display and query emails in the user's local time zone
- **Time Zone Verification**: Check the configured time zone and see current time adjustments
- **Configurable Offset**: Support for custom GMT offsets (GMT+2, GMT-5, etc.)
- **Consistent Formatting**: All timestamps displayed with the configured timezone
- **Date Calculations**: Search filters like "today" and "yesterday" properly adjusted for timezone

### Attachment Management

- **List Attachments**: View all attachments in an email with full metadata (name, size, type)
- **Save Attachments**: Securely save attachments to the configured DEFAULT_ATTACHMENTS_FOLDER
- **Path Security**: Validation and normalization to prevent path traversal attacks
- **File Integrity**: Verification of saved files with size validation and error reporting
- **Automatic Selection**: Intelligent handling when no specific attachment ID is provided
- **Multiple Attachments**: Support for emails with multiple attachments
- **Folder Creation**: Automatic creation of necessary directories when saving attachments
- **Error Handling**: Comprehensive error handling for failed attachment operations

## Available Tools

### Send Email
```
send_email
```
Send a new email message.

Parameters:
- `to`: Array of recipient email addresses (required)
- `subject`: Email subject (required)
- `body`: Email body content (required)
- `cc`: Array of CC recipients
- `bcc`: Array of BCC recipients
- `inReplyTo`: Message ID to reply to
- `threadId`: Thread ID to add the message to

### Reply All Email
```
reply_all_email
```
Reply to an email and include all original recipients (TO and CC).

Parameters:
- `messageId`: ID of the message to reply to (required)
- `body`: Email body content (required)
- `additionalRecipients`: Additional recipients to include in the reply
- `excludeRecipients`: Recipients to exclude from the reply
- `from`: Specific send-as email address to use as sender (optional)

The tool automatically handles:
- Including all original recipients (TO and CC)
- Excluding your own email address to prevent self-replies
- Setting proper email headers for threading
- Using the correct FROM address based on the original recipient

### Forward Email
```
forward_email
```
Forward an email to other recipients.

Parameters:
- `messageId`: ID of the message to forward (required)
- `to`: List of recipients to forward the email to (required)
- `additionalContent`: Additional content to add before the forwarded message
- `cc`: List of CC recipients
- `from`: Specific send-as email address to use as sender (optional)

The tool automatically handles:
- Formatting the forwarded message with proper headers
- Adding "Fwd:" prefix to subject if not already present
- Including original email headers (From, Date, Subject, To, Cc)
- Maintaining thread context with original email
- Excluding your own email addresses from recipients lists

### List Send-As Accounts
```
list_send_as_accounts
```
List all accounts and email addresses that can be used for sending emails.

Parameters: None

Returns:
- List of all send-as accounts with their properties
- Default account information
- Information about verification status and display names

### Get Recent Emails
```
get_recent_emails
```
Get recent emails with support for time filters, categories, and read status.

Parameters:
- `hours`: Number of hours to look back
- `maxResults`: Maximum number of results to return (default: 25)
- `query`: Additional Gmail search query
- `pageToken`: Token for the next page of results
- `category`: Filter by Gmail category (primary, social, promotions, updates, forums)
- `timeFilter`: Predefined time filter (today, yesterday, last24h)
- `autoFetchAll`: Automatically fetch all results (up to 100) without requiring pagination

### Read Email
```
read_email
```
Read a specific email by ID and extract its content.

Parameters:
- `messageId`: ID of the email message to retrieve (required)

### Search Emails
```
search_emails
```
Search for emails using Gmail query syntax with support for categories and time filters.

Parameters:
- `query`: Gmail search query (required)
- `maxResults`: Maximum number of results to return (default: 25)
- `pageToken`: Token for the next page of results
- `category`: Filter by Gmail category (primary, social, promotions, updates, forums)
- `timeFilter`: Predefined time filter (today, yesterday, last24h)
- `autoFetchAll`: Automatically fetch all results (up to 100) without requiring pagination

### Label Management Tools

#### List Labels
```
list_labels
```
List all labels in the user's mailbox.

Parameters: None

#### Get Label
```
get_label
```
Get details about a specific label.

Parameters:
- `labelId`: ID of the label to retrieve (required)

#### Create Label
```
create_label
```
Create a new label in the user's mailbox.

Parameters:
- `name`: Name of the label to create (required)
- `messageListVisibility`: Controls the label's visibility in the message list (`show` or `hide`)
- `labelListVisibility`: Controls the label's visibility in the label list (`labelShow`, `labelShowIfUnread`, or `labelHide`)
- `textColor`: Text color in hex format (e.g., #000000)
- `backgroundColor`: Background color in hex format (e.g., #ffffff)

#### Update Label
```
update_label
```
Update an existing label.

Parameters:
- `labelId`: ID of the label to update (required)
- `name`: New name for the label
- `messageListVisibility`: Controls the label's visibility in the message list (`show` or `hide`)
- `labelListVisibility`: Controls the label's visibility in the label list (`labelShow`, `labelShowIfUnread`, or `labelHide`)
- `textColor`: Text color in hex format (e.g., #000000)
- `backgroundColor`: Background color in hex format (e.g., #ffffff)

#### Delete Label
```
delete_label
```
Delete a label from the user's mailbox.

Parameters:
- `labelId`: ID of the label to delete (required)

#### Modify Labels
```
modify_labels
```
Add or remove labels from a message.

Parameters:
- `messageId`: ID of the message to modify (required)
- `addLabelIds`: Array of label IDs to add to the message
- `removeLabelIds`: Array of label IDs to remove from the message

### Message Management Tools

#### Mark as Read
```
mark_as_read
```
Mark a message as read.

Parameters:
- `messageId`: ID of the message to mark as read (required)

#### Mark as Unread
```
mark_as_unread
```
Mark a message as unread.

Parameters:
- `messageId`: ID of the message to mark as unread (required)

#### Archive Message
```
archive_message
```
Archive a message (remove from inbox).

Parameters:
- `messageId`: ID of the message to archive (required)

#### Unarchive Message
```
unarchive_message
```
Move a message back to inbox.

Parameters:
- `messageId`: ID of the message to move to inbox (required)

#### Trash Message
```
trash_message
```
Move a message to trash.

Parameters:
- `messageId`: ID of the message to move to trash (required)

### Draft Management Tools

#### Create Draft
```
create_draft
```
Create a new draft email without sending it.

Parameters:
- `to`: Array of recipient email addresses (required)
- `subject`: Email subject (required)
- `body`: Email body content (required)
- `cc`: Array of CC recipients
- `bcc`: Array of BCC recipients
- `from`: Specific send-as email address to use as sender

#### Get Draft
```
get_draft
```
Retrieve the contents of a specific draft.

Parameters:
- `draftId`: ID of the draft to retrieve (required)

#### List Drafts
```
list_drafts
```
List all drafts in the email account.

Parameters:
- `maxResults`: Maximum number of drafts to return (default: 20)
- `pageToken`: Token for the next page of results
- `query`: Search filter for drafts

#### Update Draft
```
update_draft
```
Update the content of an existing draft.

Parameters:
- `draftId`: ID of the draft to update (required)
- `to`: New list of recipient email addresses (required)
- `subject`: New email subject (required)
- `body`: New email body content (required)
- `cc`: New list of CC recipients
- `bcc`: New list of BCC recipients
- `from`: New specific send-as email address to use as sender

#### Delete Draft
```
delete_draft
```
Permanently delete a draft.

Parameters:
- `draftId`: ID of the draft to delete (required)

#### Send Draft
```
send_draft
```
Send an existing draft.

Parameters:
- `draftId`: ID of the draft to send (required)

### Time Zone Tool

#### Get Timezone Info
```
get_timezone_info
```
Display information about the configured timezone in the system.

Parameters: None

Returns:
- Configured timezone (from the TIME_ZONE variable)
- Calculated offset in hours
- Current date and time adjusted to the timezone
- Current date and time in UTC for comparison

### Attachment Management Tools

#### List Attachments
```
list_attachments
```
List all attachments in an email.

Parameters:
- `messageId`: ID of the message for which to list attachments (required)

Returns:
- List of all attachments with their details (name, type, size)
- Count of attachments in the email

#### Save Attachment
```
save_attachment
```
Save an attachment from an email to the configured DEFAULT_ATTACHMENTS_FOLDER.

Parameters:
- `messageId`: ID of the message containing the attachment (required)
- `attachmentId`: ID of the attachment (optional if the message has only one attachment)
- `targetPath`: Filename or relative path where the attachment will be saved (will be saved inside the DEFAULT_ATTACHMENTS_FOLDER)

The tool automatically:
- Downloads the attachment
- Saves it to the specified path within DEFAULT_ATTACHMENTS_FOLDER
- Validates file integrity
- Creates necessary directories if they don't exist
- Prevents path traversal attacks (all files are saved within DEFAULT_ATTACHMENTS_FOLDER)

## Example Prompts

- "Send an email to john@example.com with subject 'Meeting Tomorrow'"
- "Get my emails from the last 24 hours"
- "Search for emails from jane@example.com"
- "Find unread emails in my Primary category from yesterday"
- "Show me promotional emails containing 'discount' received today"
- "Create a new label called 'Project X' with blue background"
- "Show all my Gmail labels"
- "Mark this email as unread"
- "Archive all emails from this newsletter"
- "Move this email to my 'Important' label"
- "Create a draft to the team about the upcoming meeting"
- "Show me all my saved drafts"
- "Update my draft to include new information"
- "Send the draft I created earlier"
- "Delete the draft that I no longer need"
- "What's my current timezone configuration?"
- "Save the attachment from this email to my documents folder"
- "Forward this report to the management team"

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
