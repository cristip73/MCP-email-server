# MCP Email Server - Branch Analysis

## Overview
This analysis examines the current state and differences between the three main branches in the MCP-email-server repository: `main`, `develop`, and `refactor`.

## Branch Summary

| Branch | Version | Package Name | Status | Lines of Code | Key Focus |
|--------|---------|--------------|--------|---------------|-----------|
| `main` | 0.8.0 | @cristip73/email-mcp | Production/Published | 4,775 | Enhanced features, comprehensive docs |
| `develop` | 0.8.0 | email-server | Development | ~4,500 | Core functionality, simpler implementation |
| `refactor` | 0.1.0 | email-server | Archive/Legacy | ~3,500 | Basic architecture, missing advanced features |

---

## 🚀 **MAIN Branch** (Production Ready)

### State: **STABLE - PUBLISHED PACKAGE**
- **Package**: `@cristip73/email-mcp` version 0.8.0
- **NPM Published**: Ready for production use
- **Documentation**: Comprehensive (CLAUDE.md, PROMPT_SYSTEM_GUIDE.md, etc.)

### Key Features:
✅ **Advanced Email Composition**:
- Multi-part email support (HTML + plain text)
- Gmail-style quoted content formatting in replies/forwards
- Rich HTML email composition with proper MIME structure

✅ **Enhanced Attachment System**:
- Multi-stage filename matching (exact ID → exact filename → case-insensitive → partial)
- Secure path validation with directory traversal prevention
- Comprehensive error handling and validation

✅ **Production-Ready Infrastructure**:
- Automated publishing script (`publish.sh`)
- Complete NPM packaging with proper `.npmignore`
- Comprehensive installation guide (`INSTALL.md`)

✅ **Advanced Documentation System**:
- 14 comprehensive prompt templates
- Detailed architectural documentation
- User-friendly README with usage examples

✅ **Enhanced Email Features**:
- Proper quoted content formatting for replies
- HTML email support with Gmail-style formatting  
- Attribution lines with sender and date information

### Recent Changes (vs develop):
```diff
+ Multi-part email composition (HTML + text)
+ Enhanced attachment filename search
+ Comprehensive quoted content formatting
+ Production packaging and publishing
+ Advanced prompt system documentation
+ Enhanced utils with formatting functions
```

---

## 🔧 **DEVELOP Branch** (Active Development)

### State: **ACTIVE DEVELOPMENT**
- **Package**: `email-server` version 0.8.0
- **Focus**: Core functionality development and testing
- **Documentation**: Basic development docs

### Key Features:
✅ **Core Email Operations**:
- Basic send/reply/forward functionality
- Simple plain-text email composition
- Essential attachment handling

✅ **Gmail Integration**:
- Complete Gmail API integration
- Label management system
- Draft operations
- Search functionality

✅ **Development Tools**:
- Full TypeScript setup
- Modular tool architecture
- Basic timezone support

### Limitations (vs main):
```diff
- No multi-part email support
- Simpler attachment search (ID-only)
- Basic quoted content formatting
- No production packaging
- Limited documentation
```

### Code Differences:
- **Email Sending**: Uses `sendMessage()` instead of `sendMultipartMessage()`
- **Attachments**: Simple ID-based search, no filename fallback
- **Content**: Plain text composition without HTML alternative
- **Packaging**: Development-focused, not production-ready

---

## 🏗️ **REFACTOR Branch** (Legacy/Archive)

### State: **LEGACY - INCOMPLETE**
- **Package**: `email-server` version 0.1.0  
- **Status**: Historical architectural refactor, incomplete implementation
- **Last Activity**: Older refactoring experiment

### Architecture:
- Basic MCP server structure
- Limited tool set
- Missing advanced features like timezone utilities
- Incomplete implementation of modern features

### Missing Components:
- No `timezone-utils.ts`
- Limited tool organization
- Basic functionality only
- Outdated version numbering

---

## 🔍 **Detailed Code Analysis**

### File Structure Comparison

#### Main Branch (Production):
```
src/
├── client-wrapper.ts      (1,098 lines - enhanced with multi-account)
├── index.ts              (309 lines - full feature set)
├── prompt-handler.ts     (736 lines - comprehensive prompts)
├── server.ts             (42 lines - clean server setup)
├── timezone-utils.ts     (122 lines - advanced timezone handling)
├── tool-handler.ts       (95 lines - tool orchestration)
├── utils.ts              (309 lines - rich formatting utilities)
├── version.ts            (1 line - version management)
└── tools/                (7 specialized tool modules)
    ├── email-attachment-tools.ts  (251 lines)
    ├── email-draft-tools.ts       (352 lines)
    ├── email-label-tools.ts       (435 lines)
    ├── email-read-tools.ts        (44 lines)
    ├── email-search-tools.ts      (410 lines)
    ├── email-send-tools.ts        (526 lines)
    └── timezone-tool.ts           (45 lines)
```

#### Develop Branch:
```
src/
├── client-wrapper.ts      (999 lines - core functionality)
├── [same structure but simpler implementations]
└── tools/                (same modules, simpler logic)
```

#### Refactor Branch:
```
src/
├── client-wrapper.ts      (basic implementation)
├── [missing timezone-utils.ts]
└── [limited tool set]
```

### Key Technical Differences

#### 1. Email Composition (main vs develop)

**Main Branch** - Advanced Multi-part:
```typescript
// Uses sendMultipartMessage with HTML + text
const result = await client.sendMultipartMessage({
  textContent: textContent,           // Plain text version
  htmlContent: htmlContent,           // Rich HTML version
  // ... other params
});
```

**Develop Branch** - Simple Text:
```typescript
// Uses basic sendMessage with plain content
const result = await client.sendMessage({
  content: params.body,               // Plain text only
  // ... other params  
});
```

#### 2. Attachment Handling (main vs develop)

**Main Branch** - Multi-stage Search:
```typescript
// Enhanced search with filename fallback
description: "ID of the attachment or the filename (e.g., 'f_mamj3yyo1' or 'document.pdf')"
// Implements: ID → exact filename → case-insensitive → partial match
```

**Develop Branch** - ID Only:
```typescript  
// Simple ID-based search
description: "ID of the attachment (optional if the message has only one attachment)"
// Basic attachment ID validation only
```

#### 3. Content Formatting

**Main Branch**:
- `formatQuotedContent()` - Plain text quoting
- `formatQuotedContentHtml()` - Gmail-style HTML quoting
- Attribution lines with sender/date
- Proper MIME multipart structure

**Develop Branch**:
- Basic content concatenation
- No quoted formatting
- Plain text composition only

---

## 📋 **Recommendations**

### For Production Use:
**✅ Use MAIN branch** - It's production-ready with:
- Published NPM package (`@cristip73/email-mcp`)
- Advanced features and reliability
- Comprehensive documentation
- Rich email composition capabilities

### For Development:
**🔧 Use DEVELOP branch** - For:
- Feature development and testing
- Simpler debugging environment
- Core functionality validation

### For Archive:
**🗄️ REFACTOR branch** - Historical reference only
- Should be considered for archiving/deletion
- Incomplete and outdated implementation

---

## 🚦 **Branch Status Summary**

| Aspect | Main | Develop | Refactor |
|--------|------|---------|----------|
| **Production Ready** | ✅ Yes | ❌ No | ❌ No |
| **Published Package** | ✅ @cristip73/email-mcp | ❌ Dev only | ❌ Legacy |
| **Documentation** | ✅ Comprehensive | ⚠️ Basic | ❌ Minimal |
| **Email Features** | ✅ Advanced | ⚠️ Basic | ❌ Limited |
| **Testing** | ✅ Production tested | ⚠️ Dev testing | ❌ Incomplete |
| **Maintenance** | ✅ Active | ✅ Active | ❌ Archived |

**Current Status**: Main branch is ahead of develop by significant production enhancements and should be considered the authoritative version for all production deployments.