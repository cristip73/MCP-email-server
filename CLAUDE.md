# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Build and Development
- `npm run build` - Compiles TypeScript to JavaScript in `build/` directory and makes main file executable
- `npm run start` - Runs the compiled server from `build/index.js`  
- `npm run dev` - Builds and runs the server in one command
- `npm run auth` - Runs authentication setup for Gmail OAuth

### Testing Commands
No specific test scripts are defined. Check if tests exist and determine the correct command.

## Project Overview

This is a comprehensive Gmail MCP (Model Context Protocol) server that provides Claude Desktop and other MCP clients with complete Gmail integration. It implements 28 specialized tools organized by domain functionality and includes a sophisticated prompt template system to guide usage.

## Architecture

### Core Components

- **index.ts** - Entry point handling OAuth authentication, server initialization, and transport setup
- **server.ts** - MCP server implementation with tool and prompt handler registration  
- **client-wrapper.ts** - Gmail API client wrapper with multi-account support, category filtering, and timezone handling
- **tool-handler.ts** - Central registry for all 28 tools with request routing and response formatting
- **prompt-handler.ts** - Template system with 14 comprehensive prompt guides for complex operations

### Utility Systems

- **utils.ts** - Email content processing, quoted content formatting, UTF-8 encoding (RFC 2047), and shared utilities
- **timezone-utils.ts** - Sophisticated timezone handling with GMT+X format support and UTC-to-local conversions

### Tool Organization

Tools are organized by Gmail functionality domains in `src/tools/`:

- **email-read-tools.ts** (1 tool) - Email content extraction with timezone adjustment
- **email-send-tools.ts** (4 tools) - Send, reply, reply-all, forward operations  
- **email-search-tools.ts** (2 tools) - Advanced search with category and date filtering
- **email-label-tools.ts** (11 tools) - Label management and message state operations
- **email-draft-tools.ts** (6 tools) - Complete draft lifecycle management
- **email-attachment-tools.ts** (2 tools) - Secure attachment listing and saving
- **timezone-tool.ts** (1 tool) - Timezone configuration verification

## Tools Reference (28 Total)

### Email Reading Tools (1 Tool)

#### `read_email` ⭐ CORE TOOL
**Purpose**: Extract complete email content with full context and metadata

**Key Features**:
- Automatic timezone adjustment for received timestamps
- Category detection (Primary, Social, Promotions, Updates, Forums)
- Thread context extraction (threadId, messageId)
- Unread/read status tracking
- Label information extraction
- Attachment metadata listing
- HTML and plain text content processing

**Implementation Details**:
- Uses `client.getMessage()` which applies timezone offset via `formatTimestampWithOffset()`
- Recursively processes message parts for content extraction
- Determines category based on Gmail's `CATEGORY_*` labels
- Returns structured data including headers, content, and state information

**Returns**: Complete email data with subject, from, to, cc, content, labels, category, timestamps, and attachment metadata

### Email Sending Tools (4 Tools)

#### `send_email`
- Send new emails with CC/BCC support
- Thread support via `threadId` and `inReplyTo`
- Multi-account sending with automatic "from" address selection

#### `reply_all_email` 
- Smart reply-all functionality
- Automatically excludes sender's own addresses
- Maintains thread context with proper headers
- Determines correct "from" address based on original recipient

#### `forward_email`
- Forward emails with original headers preserved
- Automatic "Fwd:" prefix handling
- Original message quoting with proper formatting

#### `list_send_as_accounts`
- List all available send-as aliases
- Default account identification
- Verification status information

### Email Search Tools (2 Tools)

#### `get_recent_emails`
- Time-based email retrieval with timezone awareness
- Support for `timeFilter` (today/yesterday/last24h) vs `hours` parameter
- Category filtering (primary, social, promotions, updates, forums)
- Pagination with `autoFetchAll` option (up to 100 results)

#### `search_emails` 
- Advanced Gmail query syntax support
- Date-based operators transformed to Unix timestamps for precision
- Category and time filter combinations
- Proper unread syntax enforcement (`label:unread` not `is:unread`)

### Label Management Tools (11 Tools)

- `list_labels` - List all Gmail labels
- `get_label` - Get specific label details
- `create_label` - Create custom labels with visibility and color options
- `update_label` - Modify existing labels
- `delete_label` - Remove custom labels  
- `modify_labels` - Add/remove labels from messages
- `mark_as_read/mark_as_unread` - Message read state management
- `archive_message/unarchive_message` - Inbox management
- `trash_message` - Move messages to trash

### Draft Management Tools (6 Tools)

Complete draft lifecycle:
- `create_draft` - Create new email drafts
- `get_draft` - Retrieve draft content
- `list_drafts` - List all drafts with pagination
- `update_draft` - Modify existing drafts
- `delete_draft` - Remove drafts
- `send_draft` - Convert drafts to sent emails

### Attachment Tools (2 Tools)

#### `list_attachments`
- Extract attachment metadata from emails
- Recursive message part processing

#### `save_attachment` 🔒 SECURE
**Multi-Stage Attachment Matching**:
1. Exact attachment ID match
2. Exact filename match
3. Case-insensitive filename match  
4. Partial filename match
5. First attachment fallback

**Security Features**:
- Path traversal prevention with `path.normalize()`
- Forced saving within `DEFAULT_ATTACHMENTS_FOLDER`
- Automatic directory creation
- File integrity verification

### Timezone Tool (1 Tool)

#### `get_timezone_info`
- Display current timezone configuration
- Show UTC vs local time comparison
- Verify timezone offset calculations

## Technical Implementation Details

### Timezone Handling System

**Configuration**: `TIME_ZONE` environment variable in GMT+X format (e.g., "GMT+2", "GMT-5")

**Key Functions**:
- `parseTimeZone()` - Parse GMT+X format to numeric offset
- `adjustDateToTimeZone()` - Convert UTC to local time
- `formatTimestampWithOffset()` - Display timestamps in local timezone
- `transformDateStringToLocalUnix()` - Convert YYYY/MM/DD to Unix timestamps for Gmail queries

**Date Query Transformation**: Converts human-readable dates like "after:2025/03/19" to Unix timestamps for precise Gmail API queries.

### Multi-Account Support

**Send-As System**:
- `getSendAsAliases()` - List all available sending addresses
- `determineReplyFromAddress()` - Smart address selection for replies
- `filterOutOwnAddresses()` - Prevent self-sending in reply-all

### Security Features

**Attachment Security**:
- All files saved within configured `DEFAULT_ATTACHMENTS_FOLDER`
- Path normalization prevents directory traversal attacks
- Filename sanitization for safe file operations

**OAuth Management**:
- Credentials stored in `~/.email-mcp/credentials.json`
- OAuth keys in `~/.email-mcp/gcp-oauth.keys.json`
- Automatic token refresh handling

### Email Content Processing

**Content Extraction**:
- Recursive processing of MIME multipart messages
- Support for both HTML and plain text content
- Proper UTF-8 encoding with RFC 2047 compliance

**Quoted Content Formatting**:
- Gmail-style HTML quoting with proper blockquote structure
- Plain text quoting with ">" prefix
- Attribution lines with sender and date information

## Prompt Template System

The server includes 14 comprehensive prompt templates that provide detailed guidance:

**Email Operations**:
- `read_email` - Complete email analysis guide
- `send_email` - New email composition
- `send_reply_all` - Reply-all workflow with recipient management
- `forward_email` - Email forwarding with context preservation

**Search Operations**:
- `get_recent_emails` - Time-based retrieval with category filtering
- `search_emails` - Advanced search with Gmail query syntax

**Management Operations**:
- `label_management` - Complete label lifecycle operations
- `draft_management` - Draft workflow guidance
- `attachment_management` - Secure attachment handling
- `timezone_info` - Timezone configuration verification

Each prompt includes:
- Parameter descriptions and examples
- Common usage patterns
- Important distinctions (categories vs labels, date formats)
- Security considerations
- Expected outputs

## Development Guidelines

### Code Architecture
- **ES Modules**: Uses `"type": "module"` with NodeNext resolution
- **TypeScript Target**: ES2020 with strict mode enabled
- **Validation**: Zod schemas for all tool inputs with comprehensive error handling
- **Error Management**: Structured error responses with detailed context

### Tool Development Pattern
Each tool follows consistent structure:
1. Zod schema definition for input validation
2. Tool metadata (name, description, inputSchema)
3. Handler function with typed parameters
4. Comprehensive error handling
5. Structured JSON response formatting

### Best Practices
- **Timezone Awareness**: All date operations use timezone utilities
- **Security First**: Path validation, credential protection, input sanitization  
- **User Experience**: Detailed error messages, fallback behaviors
- **Performance**: Efficient pagination, batch operations where possible

## Environment Configuration

### Required Variables
- `TIME_ZONE` - Timezone in GMT+X format (default: "GMT+0")
- `DEFAULT_ATTACHMENTS_FOLDER` - Absolute path for attachment storage

### Optional Variables
- `GMAIL_OAUTH_PATH` - Custom OAuth keys location
- `GMAIL_CREDENTIALS_PATH` - Custom credentials location

### Authentication Files
- `~/.email-mcp/gcp-oauth.keys.json` - Google Cloud OAuth credentials
- `~/.email-mcp/credentials.json` - Gmail API access tokens

## Key Implementation Notes

1. **Date Handling**: All user-facing dates are timezone-adjusted; Gmail API queries use Unix timestamps for precision
2. **Category vs Labels**: Categories are Gmail's inbox tabs; labels are user/system tags
3. **Attachment Search**: Multi-stage matching algorithm handles various identification methods
4. **Thread Preservation**: Proper email headers maintain conversation threading
5. **Multi-Account**: Automatic sender address selection based on original recipient
6. **Security**: Comprehensive path validation prevents directory traversal attacks
7. **UTF-8 Support**: Full international character support with proper encoding
8. **Pagination**: Smart pagination with auto-fetch options for large result sets