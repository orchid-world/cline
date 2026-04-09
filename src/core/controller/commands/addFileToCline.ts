import fs from "fs/promises"
import * as path from "path"
import { getFileMentionFromPath } from "@/core/mentions"
import { showWebview } from "@/hosts/vscode/commandUtils"
import { telemetryService } from "@/services/telemetry"
import { Logger } from "@/shared/services/Logger"
import { sendAddToInputEvent } from "../ui/subscribeToAddToInput"

/**
 * Add a file or folder reference to the chat input from the explorer context menu.
 * Uses @/path references - AI will automatically read the file contents.
 * Supports both files and directories.
 */
export async function addFileOrFolderToCline(filePath: string, isFolder: boolean): Promise<void> {
	Logger.log("addFileOrFolderToCline", filePath, isFolder)

	try {
		// Ensure the sidebar view is visible but preserve editor focus
		await showWebview(true)

		let input: string

		if (isFolder) {
			// For folders, add folder reference and list structure
			// AI will read files as needed
			input = await buildFolderReference(filePath)
		} else {
			// For files, just add the file reference - AI will read it
			input = await getFileMentionFromPath(filePath)
		}

		// Send the content to the chat input
		await sendAddToInputEvent(input)

		// Track telemetry
		telemetryService.captureButtonClick("explorer_addToChat")
	} catch (error) {
		Logger.error("Error adding file/folder to chat:", error)
		throw error
	}
}

/**
 * Build the chat input for a folder - add folder reference and list structure
 * AI will be able to read individual files as needed
 */
async function buildFolderReference(folderPath: string): Promise<string> {
	const folderMention = await getFileMentionFromPath(folderPath)

	try {
		// Get folder structure
		const structure = await getFolderStructure(folderPath)

		// Add folder reference with structure overview
		// AI will read files as needed using @/path references
		return `${folderMention}\n\n**Folder structure:**\n\`\`\`\n${structure}\n\`\`\``
	} catch (error) {
		Logger.error(`Error reading folder ${folderPath}:`, error)
		return `${folderMention}\n(Error reading folder: ${error.message})`
	}
}

/**
 * Get a tree view of the folder structure (limited depth)
 * Used for user reference, AI will read actual files as needed
 */
async function getFolderStructure(folderPath: string, maxDepth = 3, currentDepth = 0): Promise<string> {
	const entries = await fs.readdir(folderPath, { withFileTypes: true })
	const lines: string[] = []
	const maxItemsPerLevel = 30 // Limit items per directory level

	let itemCount = 0

	for (const entry of entries) {
		if (itemCount >= maxItemsPerLevel) {
			lines.push(`... (${entries.length - itemCount} more items)`)
			break
		}

		const entryPath = path.join(folderPath, entry.name)
		const indent = "  ".repeat(currentDepth)
		const connector = currentDepth === 0 ? "└── " : "├── "

		if (entry.isDirectory()) {
			// Skip hidden directories and common ignored directories
			if (
				entry.name.startsWith(".") ||
				entry.name === "node_modules" ||
				entry.name === "__pycache__" ||
				entry.name === "dist" ||
				entry.name === "build" ||
				entry.name === ".git" ||
				entry.name === "coverage" ||
				entry.name === ".next" ||
				entry.name === ".cache"
			) {
				continue
			}

			lines.push(`${indent}${connector}${entry.name}/`)

			// Recursively get subdirectory structure (limited depth)
			if (currentDepth < maxDepth) {
				const subStructure = await getFolderStructure(entryPath, maxDepth, currentDepth + 1)
				if (subStructure.trim()) {
					lines.push(subStructure)
				}
			}
		} else {
			lines.push(`${indent}${connector}${entry.name}`)
		}

		itemCount++
	}

	return lines.join("\n")
}
