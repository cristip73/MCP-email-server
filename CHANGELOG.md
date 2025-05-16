# Changelog

## [0.8.1] - 2024-05-20

### Fixed
- Enhanced attachment search algorithm:
  - Completely redesigned the attachment finding logic to work with both attachment IDs and filenames
  - Implemented a multi-stage matching strategy (exact ID match, exact filename match, case-insensitive match, partial match)
  - Added comprehensive logging of all available attachments with their IDs for debugging
  - Fixed issues with finding attachments by filename instead of ID
  - Improved error reporting with detailed information about available attachments
  - Made attachment search more robust and user-friendly

## [0.8.0] - 2024-04-18

### Added
- Security improvements for email attachments:
  - Added `DEFAULT_ATTACHMENTS_FOLDER` environment variable to restrict where attachments can be saved
  - Implemented path validation and normalization to prevent path traversal attacks
  - Enhanced attachment handling with automatic directory creation and file integrity verification
  - Improved error reporting for attachment operations with detailed debug messages
- Streamlined attachment management:
  - Simplified attachment workflow by removing `get_attachment` tool
  - Made `save_attachment` the only approved method for handling attachments
  - Improved automatic attachment selection when no specific ID is provided
  - Added relative path information in attachment save results

### Changed
- Enhanced attachment saving process:
  - Improved Base64 decoding and file writing functionality
  - Added comprehensive file validation after save operations
  - Updated prompts to reflect security improvements and simplified workflow
  - Made attachment ID optional when message has only one attachment

### Fixed
- Fixed issue with zero-byte attachment files by implementing direct file writing
- Fixed attachment retrieval problems by improving error handling and adding fallback mechanisms
- Addressed "Invalid attachment token" errors with better token management
- Fixed security issues by restricting file operations to a designated directory

## [0.7.0] - 2024-03-18

### Added
- Enhanced multi-account email management:
  - Implemented the `list_send_as_accounts` tool to show all available send-as accounts
  - Added automatic email address selection based on the recipient of the original email
  - Added support for manually specifying sending address with the `from` parameter
- New forwarding functionality:
  - Implemented the `forward_email` tool for forwarding emails to other recipients
  - Added support for adding custom content before the forwarded message
  - Preserved original message headers (From, Date, Subject, To, Cc)
  - Maintained thread context with original email using threadId

### Improved
- Better reply functionality:
  - Improved filtering of own email addresses from recipients in reply-all operations
  - Enhanced reply-all to maintain threading correctly
- Enhanced email content handling:
  - Improved UTF-8 encoding for email body content
  - Added base64 content encoding for proper handling of non-ASCII characters
  - Fixed character encoding issues in message bodies
  - Implemented Content-Transfer-Encoding for reliable delivery of international characters

## [0.6.1] - 2024-03-17

### Fixed
- Fixed character encoding issue in email subject lines:
  - Implemented RFC 2047 compliant encoding for non-ASCII characters in subject headers
  - Added proper UTF-8 handling for international characters (like é, ü, etc.)
  - Fixed issue where "é" in "Montréal" was displayed as "ÃƒÂ©"
  - Added support for emoji and other Unicode characters in email subjects
  - Implemented automatic detection of non-ASCII characters requiring encoding

## [0.6.0] - 2024-03-17

### Added
- Complete label management functionality:
  - Added tools for listing, creating, updating, and deleting labels
  - Implemented tools for modifying labels on messages
  - Added capabilities for marking messages as read/unread
  - Implemented tools for archiving/unarchiving messages
  - Added support for moving messages to trash
- New Gmail label management tools:
  - `list_labels`: Lists all labels in the user's mailbox
  - `get_label`: Gets details of a specific label
  - `create_label`: Creates a new label with customizable visibility and colors
  - `update_label`: Updates an existing label's properties
  - `delete_label`: Deletes a label from the mailbox
  - `modify_labels`: Adds/removes labels from a message
- Message state management tools:
  - `mark_as_read`: Removes the UNREAD label from a message
  - `mark_as_unread`: Adds the UNREAD label to a message
  - `archive_message`: Removes the INBOX label from a message
  - `unarchive_message`: Adds the INBOX label to a message
  - `trash_message`: Moves a message to trash

### Changed
- Extended GmailClientWrapper with comprehensive label management methods
- Added detailed prompt templates for label operations
- Updated documentation with examples for label management tools

## [0.5.0] - 2024-03-17

### Added
- Automatic pagination with new `autoFetchAll` parameter for email search tools:
  - Added capability to automatically retrieve up to 100 emails in a single request
  - Implemented progressive loading logic with configurable limits
  - Enhanced search experience for larger result sets

### Changed
- Increased default result limit from 10 to 25 emails across all search tools
- Added timestamp information to all email results:
  - Implemented standardized timestamp format: `Received: YYYY-MM-DD HH:MM:SS`
  - Added timestamp extraction from email headers
  - Included receive time in all email search and listing results
- Improved pagination messaging:
  - Added clear instructions for retrieving additional results
  - Enhanced error messages for pagination scenarios
  - Added estimated remaining results information
- Enhanced documentation on category vs label distinctions:
  - Added clear explanations in prompt templates
  - Included examples demonstrating proper usage
  - Added informative notes in search results

### Fixed
- Fixed issues with timestamp formatting for emails with non-standard date formats
- Corrected behavior to properly paginate through large result sets
- Fixed potential issues with inconsistent date handling

## [0.4.0] - 2024-03-16

### Added
- Complete refactoring of the architecture according to MCP standards
- Implementation of a prompt system for email
- Separation of code into distinct modules for better maintainability
- Added validations and improved error handling
- Extended documentation for developers

### Changed
- Restructured code into specialized directories
- Improved handling for threads and reply addresses
- Updated types and interfaces for better type safety
- Separated business logic into dedicated modules

### Fixed
- Corrected handling for reply addresses in threads
- Improved parameter validation for tools
- Fixed type errors in tool implementations

## [0.3.0] - 2024-03-16

### Added
- Reply from correct email address functionality
  - Added support for determining the original recipient address
  - Added integration with Gmail's Send-As aliases
  - Automatically uses the correct email address when replying
  - Added From header support in email creation

### Changed
- Modified createEmailMessage function to support From header
- Added getReplyToAddress function

## [0.2.0] - 2023-07-14

### Added
- Enhanced date filtering with new `timeFilter` parameter:
  - `today` - Calendar date (00:00 to 23:59)
  - `yesterday` - Previous calendar date
  - `last24h` - Rolling 24-hour window
- Automatic conversion of `is:unread` to `label:unread` for better Gmail API compatibility
- New utility functions for date handling:
  - `getTodayDateQuery()` - Gets current date in YYYY/MM/DD format
  - `getTomorrowDateQuery()` - Gets tomorrow's date
  - `getYesterdayDateQuery()` - Gets yesterday's date
  - `getTodayQuery()` - Generates a query for today's calendar date
  - `getYesterdayQuery()` - Generates a query for yesterday's calendar date
  - `ensureCorrectUnreadSyntax()` - Converts is:unread to label:unread
- Enhanced template prompts with clear examples for:
  - Retrieving unread emails from specific categories
  - Filtering emails by calendar date vs time window
  - Finding emails that need replies
  - Using common Gmail search operators

### Improved
- Clearer distinction between calendar dates ("today") vs time windows ("last 24h") 
- More informative response messages that include:
  - Date ranges being searched
  - Unread status in the results
  - Category information
- Better handling of default cases (defaults to today's calendar date if no filter specified)
- More comprehensive templates with common search patterns
- Automatic detection of date filters in queries

### Fixed
- Fixed issue with "today" being incorrectly interpreted as the last 24 hours
- Fixed date formatting in Gmail queries to use YYYY/MM/DD format
- Fixed improper usage of 'is:unread' which was causing search misses
- Fixed support for combining time filters with category filters

## [0.1.0] - 2024-03-16

### Added
- Initial implementation of MCP server for email
- Integration with Gmail API
- Basic functionality for sending and reading emails
- OAuth authentication with Gmail

## v0.2.0 (2024-03-17)

### Added
- Support for results pagination in email listing functions:
  - Added `pageToken` parameter to `get_recent_emails` and `search_emails` tools
  - Implemented handling for `nextPageToken` in responses
  - Added information about total estimated results
  - Limited to maximum 500 results per page as per Gmail API restrictions

- Gmail Category System Support:
  - Added `category` parameter to `get_recent_emails` and `search_emails` tools
  - Implemented filtering by Gmail categories: Primary, Social, Promotions, Updates, Forums
  - Improved search queries for category filtering
  - Fixed implementation to use proper Gmail API syntax for categories

- Time Filter Enhancements:
  - Added `timeFilter` parameter with support for "today", "yesterday", and "last24h"
  - Improved date query construction for better search results
  - Enhanced response messages to include clear time descriptions with actual dates

- Code Organization and Modularity:
  - Refactored code to use a modular directory structure
  - Created specialized tool modules for email operations: reading, sending, searching
  - Improved server initialization and configuration
  - Separated utility functions into dedicated modules

### Fixed
- Corrected category search handling for Gmail's Primary category
- Fixed issues with "unread" search queries by automatically converting `is:unread` to `label:unread`
- Enhanced error handling in Gmail API interactions

### Improved
- Enhanced response formatting with more context about search parameters
- Better query construction for complex search operations
- Improved documentation in code comments
- Updated tool descriptions with more accurate usage information

## [0.7.0] - 2024-04-05

### Added
- Timezone support for all date and time operations:
  - Added configuration variable TIME_ZONE in format like 'GMT+2'
  - Implemented timezone adjustment for all timestamp displays
  - Added proper date calculation adjustments for search filters
  - All email timestamps now display in the configured timezone
  - Configurable through environment variables or JSON configuration
- New timezone verification tool:
  - Added `get_timezone_info` tool to check current timezone configuration
  - Display configured timezone offset and compare local vs UTC times
  - Provides runtime verification of timezone settings
  - Assists in debugging timezone-related display issues

### Fixed
- Fixed timestamp display in search results to respect timezone settings
- Corrected date calculations in time filters (today, yesterday) to use configured timezone
- Ensured consistent timestamp formatting across all email operations

## [Unreleased]

### Added
- Timezone support based on environment variable (TIME_ZONE), can be configured in format like 'GMT+2'
- All date and time operations now properly reflect the configured timezone
- Proper RFC 2047 encoding for email subjects to handle non-ASCII characters correctly
- Label management in Gmail: create, delete, update, and modify labels on messages