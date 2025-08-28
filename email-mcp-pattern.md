# Email MCP: Save to File & Show in Chat Pattern

## Overview
Pattern pentru implementarea unei funcționalități de email MCP cu opțiuni de output flexibile, similar cu GPT-5 agent tools.

## Core Concept

### Input Parameters
```typescript
interface EmailRequestParams {
  // Email content
  to: string;
  subject: string;
  body: string;
  
  // Output control - mutual exclusive
  save_to_file?: boolean;     // Default: false
  display_in_chat?: boolean;  // Default: true (when save_to_file is false)
}
```

### Behavior Logic
1. **Default**: `display_in_chat: true` - Afișează email-ul în chat cu metadata
2. **File save**: `save_to_file: true` - Salvează email-ul în fișier, returnează doar metadata în chat
3. **Metadata always**: Indiferent de opțiune, returnează mereu metadata importantă

## Implementation Pattern

### Tool Response Structure
```typescript
interface EmailResponse {
  // Metadata - always returned
  metadata: {
    sent_at: string;
    to: string;
    subject: string;
    message_id?: string;
    status: 'sent' | 'pending' | 'failed';
    file_path?: string;  // Only when saved to file
  };
  
  // Content - conditional based on display_in_chat
  content?: {
    body: string;
    html?: string;
    attachments?: Array<any>;
  };
  
  // Status info
  success: boolean;
  message: string;
}
```

### Flow Control

#### Case 1: Default (show in chat)
- Process email sending
- Return full content + metadata în chat
- No file creation

#### Case 2: Save to file
- Process email sending  
- Generate unique filename (timestamp-based)
- Save complete email details to file (JSON/MD format)
- Return only metadata + file path în chat
- User gets notification of file location

#### Case 3: Both options provided
- Priority: `save_to_file` overrides `display_in_chat`
- Fallback la save to file behavior

## File Management

### File Structure
```
emails_output/
├── YYYY-MM-DD/
│   ├── email-HH-MM-SS-{hash}.json
│   └── email-HH-MM-SS-{hash}.md
```

### File Content Format
- **JSON**: Machine-readable cu toate detaliile
- **Markdown**: Human-readable pentru preview
- Include metadata, content, send status, timestamps

## Benefits

1. **Flexibility**: User controlează output-ul
2. **Performance**: File save reduce token usage în chat
3. **History**: File save creează log persistent
4. **Metadata**: Mereu disponibilă pentru tracking
5. **Integration**: File poate fi procesată de alte tools

## Implementation Tips

- Validate mutual exclusivity în parameters
- Handle file creation errors gracefully  
- Ensure metadata consistency across modes
- Use descriptive filenames cu timestamps
- Consider file cleanup strategies pentru old emails
- Implement proper error handling pentru send failures