# MCP Gmail Integration Setup Guide

This guide will walk you through setting up the MCP Gmail integration for use with Claude or other MCP-compatible AI assistants.

## Prerequisites

- Node.js 16 or higher
- An active Gmail account
- Google Cloud Platform account (free tier is sufficient)

## Installation Options

### Option 1: Using NPX (Recommended)

The easiest way to use this tool is with npx, which runs the package without needing to install it globally:

```bash
npx @cristip73/email-mcp
```

For first-time setup and authentication:

```bash
npx @cristip73/email-mcp auth
```

### Option 2: Global Installation

If you prefer having the tool installed globally:

```bash
npm install -g @cristip73/email-mcp
email-mcp
```

## Setting up Google Cloud OAuth Credentials

Before using this application, you need to create OAuth credentials in Google Cloud:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Navigate to "APIs & Services" > "Library"
4. Search for "Gmail API" and select it
5. Click "Enable" to activate the Gmail API for your project
6. Go to "APIs & Services" > "Credentials"
7. Click "Create Credentials" > "OAuth client ID"
8. Select "Desktop application" as the application type
9. Name your OAuth client (e.g., "MCP Email Client")
10. Click "Create" and download the credentials JSON file

After downloading:
- Rename the file to `gcp-oauth.keys.json`
- Place it in one of these locations:
  - Your current working directory (when running the auth command)
  - The global config directory at `~/.email-mcp/gcp-oauth.keys.json`

### File Paths Explained

The notation `~/.email-mcp/gcp-oauth.keys.json` refers to a file in your home directory:

- **macOS**: `/Users/[your-username]/.email-mcp/gcp-oauth.keys.json`
- **Linux**: `/home/[your-username]/.email-mcp/gcp-oauth.keys.json`
- **Windows**: `C:\Users\[your-username]\.email-mcp\gcp-oauth.keys.json`

Similarly, the credentials file will be stored at:

- **macOS**: `/Users/[your-username]/.email-mcp/credentials.json`
- **Linux**: `/home/[your-username]/.email-mcp/credentials.json`
- **Windows**: `C:\Users\[your-username]\.email-mcp\credentials.json`

The `.email-mcp` directory is hidden by default but will be automatically created during setup.

## Authentication

Run the authentication process:

```bash
npx @cristip73/email-mcp auth
```

This will:
1. Open a browser window
2. Ask you to select your Google account
3. Request permission to access your Gmail
4. Save the authentication token in `~/.email-mcp/credentials.json`

## Configuring Claude Desktop

To add the MCP server to Claude Desktop:

1. Open Claude Desktop
2. Click on "Claude" in the top menu
3. Go to "Settings" > "Developer Mode"
4. Choose "Edit Config"
5. Add the following to your config file:

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

Replace:
- `GMT+2` with your actual timezone (e.g., `GMT-5` for US Eastern Time)
- The attachments folder path with a valid directory on your system

6. Save the file and restart Claude Desktop

## Verifying Setup

To verify the integration is working:
1. Open Claude Desktop
2. In a new conversation, type: "Get my recent emails from today"
3. Claude should respond with a list of your recent emails

## Troubleshooting

If you encounter issues:

- **Authentication errors**: Run `npx @cristip73/email-mcp auth` again to refresh your credentials
- **Path errors**: Make sure your attachments folder exists and is writable
- **Timezone issues**: Verify your timezone format is correct (e.g., GMT+2, GMT-5)
- **Permission denied**: Ensure you granted all requested permissions during OAuth setup

## Environment Variables

The following environment variables can be configured:

- `TIME_ZONE`: Your timezone in GMT format (e.g., GMT+2, GMT-5)
- `DEFAULT_ATTACHMENTS_FOLDER`: Path where email attachments will be saved
- `GMAIL_OAUTH_PATH`: Custom path to your OAuth credentials file
- `GMAIL_CREDENTIALS_PATH`: Custom path to your tokens file 