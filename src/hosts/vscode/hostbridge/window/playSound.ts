import { exec } from "child_process"
import { PlaySoundRequest, PlaySoundResponse } from "@/shared/proto/index.host"
import { Logger } from "@/shared/services/Logger"

/**
 * Plays a sound notification using system commands.
 * Cross-platform support for Windows, macOS, and Linux.
 *
 * @param request - The play sound request containing the sound name
 * @returns Empty response on success
 */
export async function playSound(request: PlaySoundRequest): Promise<PlaySoundResponse> {
	const { soundName } = request

	if (soundName && soundName.trim()) {
		try {
			await playSystemSound(soundName)
		} catch (error) {
			Logger.error(`[playSound] Failed to play sound: ${soundName}`, error)
		}
	}

	return PlaySoundResponse.create({})
}

/**
 * Play a system sound based on the platform.
 * Uses native system sounds for best user experience.
 */
function playSystemSound(soundName: string): Promise<void> {
	return new Promise((resolve) => {
		let command: string
		const platform = process.platform

		switch (soundName) {
			case "success":
				if (platform === "win32") {
					// Windows: Use PowerShell to play system sound
					command = `powershell -c "[System.Media.SystemSounds]::Hand.Play()"`
				} else if (platform === "darwin") {
					// macOS: Use AppleScript to play beep
					command = `osascript -e 'tell app "System Events" to beep'`
				} else {
					// Linux: Try paplay or fallback to beep
					command = `paplay /usr/share/sounds/gnome/default/stereo/dialog-information.ogg 2>/dev/null || echo -e 'a'`
				}
				break

			case "error":
				if (platform === "win32") {
					command = `powershell -c "[System.Media.SystemSounds]::Hand.Play()"`
				} else if (platform === "darwin") {
					command = `osascript -e 'tell app "System Events" to beep'`
				} else {
					command = `paplay /usr/share/sounds/gnome/default/stereo/dialog-error.ogg 2>/dev/null || echo -e 'a'`
				}
				break

			case "warning":
				if (platform === "win32") {
					command = `powershell -c "[System.Media.SystemSounds]::Exclamation.Play()"`
				} else if (platform === "darwin") {
					command = `osascript -e 'tell app "System Events" to beep'`
				} else {
					command = `paplay /usr/share/sounds/gnome/default/stereo/dialog-warning.ogg 2>/dev/null || echo -e 'a'`
				}
				break

			default:
				// Default system beep
				if (platform === "win32") {
					command = `powershell -c "[Console]::Beep(500,300)"`
				} else if (platform === "darwin") {
					command = `osascript -e 'tell app "System Events" to beep'`
				} else {
					command = `echo -e 'a'`
				}
		}

		exec(command, (error) => {
			if (error) {
				// Fallback to basic beep if system sound fails
				Logger.debug(`[playSound] Playing sound: ${soundName}`)
				resolve() // Don't fail, just log
			} else {
				resolve()
			}
		})
	})
}
