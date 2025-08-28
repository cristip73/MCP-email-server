import { z } from "zod";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { GmailClientWrapper } from "../client-wrapper.js";
import * as fs from 'fs';
import * as path from 'path';

// Get default attachments folder from environment variable
const DEFAULT_ATTACHMENTS_FOLDER = process.env.DEFAULT_ATTACHMENTS_FOLDER;

// Validate the default attachments folder
if (!DEFAULT_ATTACHMENTS_FOLDER) {
  console.error(`ERROR: DEFAULT_ATTACHMENTS_FOLDER environment variable is not defined.`);
  console.error(`Please define it in your MCP Config JSON with a path to an existing folder.`);
  console.error(`Example: "/Users/username/CLAUDE/attachments"`);
} else if (!fs.existsSync(DEFAULT_ATTACHMENTS_FOLDER)) {
  console.error(`ERROR: DEFAULT_ATTACHMENTS_FOLDER path "${DEFAULT_ATTACHMENTS_FOLDER}" does not exist.`);
  console.error(`Please create this directory or specify a different path in your MCP Config JSON.`);
} else {
  console.error(`Using DEFAULT_ATTACHMENTS_FOLDER: ${DEFAULT_ATTACHMENTS_FOLDER}`);
}

/**
 * Schema for listing attachments from an email
 */
const ListAttachmentsSchema = z.object({
  messageId: z.string().describe("ID of the message for which attachments are listed"),
});

/**
 * Schema for saving an attachment to the file system
 */
const SaveAttachmentSchema = z.object({
  messageId: z.string().describe("ID of the message containing the attachment"),
  attachmentId: z.string().describe("ID of the attachment or the filename (e.g., 'f_mamj3yyo1' or 'document.pdf'). Optional if the message has only one attachment."),
  targetPath: z.string().describe("Filename or path where the attachment will be saved. Can be absolute path or relative to DEFAULT_ATTACHMENTS_FOLDER"),
});

/**
 * Validates and normalizes path with flexible security allowing access to any accessible folder
 */
function validateAndNormalizePath(targetPath: string): string {
  // Normalize the paths to handle any '..' or '.' segments
  const normalizedTargetPath = path.normalize(targetPath);
  
  // If it's an absolute path, validate it's accessible and secure
  if (path.isAbsolute(normalizedTargetPath)) {
    // Prevent obvious malicious patterns but allow legitimate absolute paths
    if (normalizedTargetPath.includes('..') && normalizedTargetPath.match(/\.\.[\/\\]/) !== null) {
      throw new Error("Path contains potentially unsafe traversal patterns");
    }
    
    // Check if the directory exists or can be created
    const directory = path.dirname(normalizedTargetPath);
    try {
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }
    } catch (error) {
      throw new Error(`Cannot create or access directory: ${directory}`);
    }
    
    return normalizedTargetPath;
  }
  
  // For relative paths, use DEFAULT_ATTACHMENTS_FOLDER if available, otherwise current directory
  if (DEFAULT_ATTACHMENTS_FOLDER) {
    return path.join(DEFAULT_ATTACHMENTS_FOLDER, normalizedTargetPath);
  } else {
    // Fallback to current directory if no default folder is set
    const currentDir = process.cwd();
    const attachmentsDir = path.join(currentDir, 'attachments');
    
    // Ensure attachments directory exists
    if (!fs.existsSync(attachmentsDir)) {
      fs.mkdirSync(attachmentsDir, { recursive: true });
    }
    
    return path.join(attachmentsDir, normalizedTargetPath);
  }
}

/**
 * Funcție pentru a scrie un fișier pe disc
 */
async function writeFileToDisk(filePath: string, content: string, contentType: string): Promise<boolean> {
  try {
    // Asigurăm-ne că directorul există
    const directory = path.dirname(filePath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    
    // Decodificăm conținutul Base64 și îl scriem în fișier
    const buffer = Buffer.from(content, 'base64');
    
    // Scriem fișierul
    fs.writeFileSync(filePath, buffer);
    
    console.error(`Successfully wrote file to ${filePath} (${buffer.length} bytes)`);
    return true;
  } catch (error) {
    console.error(`Error writing file to disk: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Tool for listing attachments from an email
 */
export const listAttachmentsTool: Tool = {
  name: "list_attachments",
  description: "List all attachments from an email",
  inputSchema: {
    type: "object",
    properties: {
      messageId: {
        type: "string",
        description: "ID of the message for which attachments are listed"
      }
    },
    required: ["messageId"]
  },
  handler: async (client: GmailClientWrapper, params: { messageId: string }) => {
    try {
      const attachments = await client.listAttachments(params.messageId);
      
      // Add a debug log to see attachment IDs
      console.error(`Attachments found for message ${params.messageId}: ${attachments.length}`);
      for (const att of attachments) {
        console.error(`Attachment: ${att.filename}, ID: ${att.id}, Size: ${att.size}, Type: ${att.mimeType}`);
      }
      
      return {
        messageId: params.messageId,
        count: attachments.length,
        attachments: attachments.map(attachment => ({
          id: attachment.id,
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          size: attachment.size
        }))
      };
    } catch (error) {
      console.error(`List attachments error details: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Failed to list attachments: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

/**
 * Tool pentru salvarea unui atașament în sistemul de fișiere local
 */
export const saveAttachmentTool: Tool = {
  name: "save_attachment",
  description: "Save an email attachment to the configured default attachments folder",
  inputSchema: {
    type: "object",
    properties: {
      messageId: {
        type: "string",
        description: "ID of the message containing the attachment"
      },
      attachmentId: {
        type: "string",
        description: "ID of the attachment or the filename (e.g., 'f_mamj3yyo1' or 'document.pdf'). Optional if the message has only one attachment."
      },
      targetPath: {
        type: "string",
        description: "Filename or path where the attachment will be saved. Can be absolute path or relative to DEFAULT_ATTACHMENTS_FOLDER"
      }
    },
    required: ["messageId", "targetPath"]
  },
  handler: async (client: GmailClientWrapper, params: {
    messageId: string;
    attachmentId?: string;
    targetPath: string;
  }) => {
    try {
      // Note: DEFAULT_ATTACHMENTS_FOLDER is optional now - we can save anywhere accessible
      
      // Validate and normalize the target path
      const normalizedPath = validateAndNormalizePath(params.targetPath);
      console.error(`Normalized path: ${normalizedPath} (original: ${params.targetPath})`);
      
      // List attachments for debugging
      const allAttachments = await client.listAttachments(params.messageId);
      console.error(`Available attachments for message ${params.messageId}: ${allAttachments.length}`);
      
      let attachmentId = params.attachmentId;
      
      // If no attachment ID is provided and there's only one attachment, use it automatically
      if (!attachmentId && allAttachments.length === 1) {
        attachmentId = allAttachments[0].id;
        console.error(`No attachment ID provided, but only one attachment found. Using ID: ${attachmentId}`);
      } 
      // If no ID and multiple attachments, use the first one
      else if (!attachmentId && allAttachments.length > 1) {
        attachmentId = allAttachments[0].id;
        console.error(`No attachment ID provided, but multiple attachments found. Using first one with ID: ${attachmentId}`);
      }
      // If no ID and no attachments, throw an error
      else if (!attachmentId && allAttachments.length === 0) {
        throw new Error('No attachments found in this message');
      }
      
      console.error(`Target attachment ID or filename: ${attachmentId}`);
      
      // The enhanced getAttachment method will handle search by ID or filename
      const attachment = await client.getAttachment(params.messageId, attachmentId!);
      console.error(`Retrieved attachment: ${attachment.filename}, Size: ${attachment.size} bytes, Type: ${attachment.mimeType}`);
      
      // Check if we have data in the attachment
      if (!attachment.data) {
        throw new Error('Attachment data is empty');
      }
      
      // Write the file to disk
      const writeSuccess = await writeFileToDisk(
        normalizedPath, 
        attachment.data, 
        attachment.mimeType
      );
      
      if (!writeSuccess) {
        throw new Error(`Failed to write file to disk at ${normalizedPath}`);
      }
      
      // Check if the file exists after writing
      if (!fs.existsSync(normalizedPath)) {
        throw new Error(`File was not created at ${normalizedPath}`);
      }
      
      // Check the file size
      const stats = fs.statSync(normalizedPath);
      console.error(`File size on disk: ${stats.size} bytes`);
      
      if (stats.size === 0) {
        throw new Error(`File was created but has zero bytes: ${normalizedPath}`);
      }
      
      // Return the operation result
      return {
        messageId: params.messageId,
        attachmentId: attachment.id, // Return actual ID used
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        size: attachment.size,
        targetPath: normalizedPath,
        relativePath: DEFAULT_ATTACHMENTS_FOLDER ? path.relative(DEFAULT_ATTACHMENTS_FOLDER, normalizedPath) : path.basename(normalizedPath),
        actualFileSize: stats.size,
        success: true,
        message: `Attachment "${attachment.filename}" (${stats.size} bytes) was successfully saved to "${normalizedPath}".`
      };
    } catch (error) {
      console.error(`Save attachment error details: ${error instanceof Error ? error.message : String(error)}`);
      // Create a more detailed error message
      throw new Error(`Failed to save attachment: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}; 