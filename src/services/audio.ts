import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { getJson, setJson, storageKeys } from './storage';

let currentPlayer: AudioPlayer | null = null;
let audioReady = false;

export async function initAudio() {
  if (audioReady) return;
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    interruptionMode: 'duckOthers',
  });
  audioReady = true;
}

export async function stopAudio() {
  if (!currentPlayer) return;
  currentPlayer.pause();
  currentPlayer.remove();
  currentPlayer = null;
}

async function playUri(uri: string, onFinish?: () => void): Promise<boolean> {
  try {
    await initAudio();
    await stopAudio();
    const player = createAudioPlayer({ uri });
    currentPlayer = player;
    if (onFinish) {
      player.addListener('playbackStatusUpdate', (status) => {
        // Ignore events from a player that has since been replaced
        if (status.didJustFinish && currentPlayer === player) onFinish();
      });
    }
    player.play();
    return true;
  } catch {
    return false;
  }
}

/** `onFinish` fires once the clip plays to the end (not when stopped or replaced). */
export async function playRemoteAudio(url: string, onFinish?: () => void): Promise<boolean> {
  return playUri(url, onFinish);
}

export async function getOfflineAudioPath(duaId: string): Promise<string | null> {
  const map = await getJson<Record<string, string>>(storageKeys.offlineAudio, {});
  return map[duaId] ?? null;
}

export async function downloadAudioForOffline(duaId: string, url: string): Promise<string | null> {
  const dir = `${FileSystem.documentDirectory}dua-audio/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const dest = `${dir}${duaId}.mp3`;
  const download = await FileSystem.downloadAsync(url, dest);
  const map = await getJson<Record<string, string>>(storageKeys.offlineAudio, {});
  map[duaId] = download.uri;
  await setJson(storageKeys.offlineAudio, map);
  return download.uri;
}

export async function playDuaAudio(duaId: string, remoteUrl?: string, onFinish?: () => void): Promise<boolean> {
  const local = await getOfflineAudioPath(duaId);
  if (local) {
    try {
      const info = await FileSystem.getInfoAsync(local);
      if (info.exists) return await playUri(local, onFinish);
    } catch {
      /* try remote */
    }
  }
  if (remoteUrl) return playRemoteAudio(remoteUrl, onFinish);
  return false;
}

export async function isAudioDownloaded(duaId: string): Promise<boolean> {
  const path = await getOfflineAudioPath(duaId);
  if (!path) return false;
  try {
    const info = await FileSystem.getInfoAsync(path);
    return info.exists;
  } catch {
    return false;
  }
}

export function isAudioAvailable(): boolean {
  return true;
}
