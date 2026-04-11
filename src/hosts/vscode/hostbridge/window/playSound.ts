import path from "path"
import sound from "sound-play"
import { HostProvider } from "@/hosts/host-provider"
import { PlaySoundRequest, PlaySoundResponse } from "@/shared/proto/index.host"
import { Logger } from "@/shared/services/Logger"

/**
 * Plays a sound notification using sound-play package.
 *
 * @param request - The play sound request containing the sound name
 * @returns Empty response on success
 */
export async function playSound(request: PlaySoundRequest): Promise<PlaySoundResponse> {
	const { soundName } = request

	if (soundName && soundName.trim()) {
		const soundPath = getNotificationSoundPath()
		Logger.debug(`[playSound] Attempting to play: ${soundPath}`)

		try {
			await sound.play(soundPath)
			Logger.debug(`[playSound] Sound played successfully`)
		} catch (error) {
			Logger.error(`[playSound] Failed to play sound: ${soundName}`, error)
		}
	}

	return PlaySoundResponse.create({})
}

/**
 * Get the path to the custom notification sound.
 */
function getNotificationSoundPath(): string {
	try {
		if (HostProvider.isInitialized()) {
			const extensionPath = HostProvider.get().extensionFsPath
			return path.join(extensionPath, "assets", "sounds", "notification.mp3")
		}
	} catch (error) {
		Logger.debug(`[playSound] HostProvider not available: ${error}`)
	}

	// Fallback: try to find the file relative to current working directory
	const fallbackPath = path.join(process.cwd(), "assets", "sounds", "notification.mp3")
	Logger.debug(`[playSound] Using fallback path: ${fallbackPath}`)
	return fallbackPath
}
