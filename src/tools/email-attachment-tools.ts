import { z } from "zod";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { GmailClientWrapper } from "../client-wrapper.js";
import { pdfToMarkdown } from "../utils/pdf-converter.js";
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
  pdfSaveOption: z.enum(["pdf_only", "md_only", "both_pdf_and_md"]).optional().default("pdf_only").describe("For PDF files: save as PDF only (default), Markdown only, or both formats"),
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
  
  // For relative paths, use DEFAULT_ATTACHMENTS_FOLDER if available, otherwise CODING folder
  if (DEFAULT_ATTACHMENTS_FOLDER) {
    return path.join(DEFAULT_ATTACHMENTS_FOLDER, normalizedTargetPath);
  } else {
    // Default to CODING folder for easy access
    const codingDir = "/Users/cristi/Downloads/CODING";
    const attachmentsDir = path.join(codingDir, 'attachments');
    
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
      },
      pdfSaveOption: {
        type: "string",
        enum: ["pdf_only", "md_only", "both_pdf_and_md"],
        description: "For PDF files: save as PDF only (default), Markdown only, or both formats"
      }
    },
    required: ["messageId", "targetPath"]
  },
  handler: async (client: GmailClientWrapper, params: {
    messageId: string;
    attachmentId?: string;
    targetPath: string;
    pdfSaveOption?: "pdf_only" | "md_only" | "both_pdf_and_md";
  }) => {
    try {
      // Note: DEFAULT_ATTACHMENTS_FOLDER is optional now - we can save anywhere accessible
      
      // Validate and normalize the target path
      let normalizedPath = validateAndNormalizePath(params.targetPath);
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
      
      // Handle PDF conversion based on pdfSaveOption
      const isPDF = attachment.mimeType === 'application/pdf';
      const pdfOption = params.pdfSaveOption || 'pdf_only';
      
      let savedFiles: Array<{ path: string; type: 'pdf' | 'md'; size: number }> = [];
      
      if (isPDF && pdfOption !== 'pdf_only') {
        // For PDF files with conversion options
        const pdfBuffer = Buffer.from(attachment.data, 'base64');
        
        // Prepare file paths
        const basePath = normalizedPath.replace(/\.pdf$/i, '');
        const pdfPath = `${basePath}.pdf`;
        const mdPath = `${basePath}.md`;
        
        // Save PDF file if needed
        if (pdfOption === 'both_pdf_and_md') {
          const pdfWriteSuccess = await writeFileToDisk(pdfPath, attachment.data, attachment.mimeType);
          if (!pdfWriteSuccess) {
            throw new Error(`Failed to write PDF file to disk at ${pdfPath}`);
          }
          
          const pdfStats = fs.statSync(pdfPath);
          savedFiles.push({ path: pdfPath, type: 'pdf', size: pdfStats.size });
        }
        
        // Convert to Markdown
        try {
          const markdownContent = await pdfToMarkdown(pdfBuffer, attachment.filename, { verbose: true });
          fs.writeFileSync(mdPath, markdownContent, 'utf8');
          
          const mdStats = fs.statSync(mdPath);
          savedFiles.push({ path: mdPath, type: 'md', size: mdStats.size });
          
          // Update normalizedPath to point to the main output (MD for md_only, PDF for both)
          normalizedPath = pdfOption === 'md_only' ? mdPath : pdfPath;
          
        } catch (conversionError: any) {
          throw new Error(`PDF to Markdown conversion failed: ${conversionError.message}`);
        }
        
      } else {
        // Standard file saving (non-PDF or pdf_only option)
        const writeSuccess = await writeFileToDisk(
          normalizedPath, 
          attachment.data, 
          attachment.mimeType
        );
        
        if (!writeSuccess) {
          throw new Error(`Failed to write file to disk at ${normalizedPath}`);
        }
        
        const stats = fs.statSync(normalizedPath);
        savedFiles.push({ path: normalizedPath, type: isPDF ? 'pdf' : 'other' as any, size: stats.size });
      }
      
      // Verify all files exist and have content
      for (const file of savedFiles) {
        if (!fs.existsSync(file.path)) {
          throw new Error(`File was not created at ${file.path}`);
        }
        if (file.size === 0) {
          throw new Error(`File was created but has zero bytes: ${file.path}`);
        }
      }
      
      const mainFile = savedFiles[savedFiles.length - 1] || savedFiles[0];
      console.error(`Files saved: ${savedFiles.map(f => `${f.type.toUpperCase()} (${f.size} bytes)`).join(', ')}`);
      
      const stats = { size: mainFile.size };
      
      // Return the operation result
      const message = savedFiles.length > 1 
        ? `Attachment "${attachment.filename}" was processed and saved as: ${savedFiles.map(f => `${f.type.toUpperCase()} (${f.size} bytes)`).join(', ')}`
        : `Attachment "${attachment.filename}" (${stats.size} bytes) was successfully saved to "${normalizedPath}".`;
      
      return {
        messageId: params.messageId,
        attachmentId: attachment.id, // Return actual ID used
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        size: attachment.size,
        targetPath: normalizedPath,
        relativePath: DEFAULT_ATTACHMENTS_FOLDER ? path.relative(DEFAULT_ATTACHMENTS_FOLDER, normalizedPath) : path.basename(normalizedPath),
        actualFileSize: stats.size,
        pdfSaveOption: params.pdfSaveOption,
        savedFiles: savedFiles.map(f => ({
          path: f.path,
          type: f.type,
          size: f.size,
          relativePath: DEFAULT_ATTACHMENTS_FOLDER ? path.relative(DEFAULT_ATTACHMENTS_FOLDER, f.path) : path.basename(f.path)
        })),
        success: true,
        message
      };
    } catch (error) {
      console.error(`Save attachment error details: ${error instanceof Error ? error.message : String(error)}`);
      // Create a more detailed error message
      throw new Error(`Failed to save attachment: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}; 