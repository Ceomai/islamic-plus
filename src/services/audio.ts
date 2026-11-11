import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { getJson, setJson, storageKeys } from './storage';

let currentPlayer: AudioPlayer | null = null;
let audioReady = false;
/**
 * Bumped by every play request and every stop. A request that finds it changed while it was
 * awaiting something has been replaced, and must not start a player (two quick taps used to leave
 * the first player playing with nothing able to stop it).
 */
let generation = 0;
const claimGeneration = () => ++generation;
const isCurrent = (gen: number) => gen === generation;

export async function initAudio() {
  if (audioReady) return;
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    interruptionMode: 'duckOthers',
  });
  audioReady = true;
}

function releasePlayer() {
  if (!currentPlayer) return;
  currentPlayer.pause();
  currentPlayer.remove();
  currentPlayer = null;
}

/** Stops what is playing, and any play request still on its way. */
export async function stopAudio() {
  claimGeneration();
  releasePlayer();
}

/**
 * A remote/local URI, or a bundled asset (require(...) module id). False only when playback failed;
 * a request replaced by a newer one (or by a stop) resolves true without playing.
 */
async function playUri(source: string | number, onFinish?: () => void, gen: number = claimGeneration()): Promise<boolean> {
  try {
    await initAudio();
    if (!isCurrent(gen)) return true;
    releasePlayer();
    const player = createAudioPlayer(typeof source === 'number' ? source : { uri: source });
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

/** Full adhan (CC0 recording from Wikimedia Commons, see docs/CONTENT-SOURCES.md) */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ADHAN_FULL: number = require('../../assets/sounds/adhan_full.m4a');

export async function playAdhan(onFinish?: () => void): Promise<boolean> {
  return playUri(ADHAN_FULL, onFinish);
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
  // downloadAsync also "succeeds" on 404/500 and saves the error page as the mp3, which then played
  // as silence; keep only real audio
  const saved = await FileSystem.getInfoAsync(dest);
  if (download.status !== 200 || !saved.exists || (saved.size ?? 0) < 1024) {
    await FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => undefined);
    throw new Error(`audio download failed (HTTP ${download.status})`);
  }
  const map = await getJson<Record<string, string>>(storageKeys.offlineAudio, {});
  map[duaId] = download.uri;
  await setJson(storageKeys.offlineAudio, map);
  return download.uri;
}

export async function playDuaAudio(duaId: string, remoteUrl?: string, onFinish?: () => void): Promise<boolean> {
  // Claimed before the file lookups, so a stop or another tap during them cancels this request
  const gen = claimGeneration();
  const local = await getOfflineAudioPath(duaId);
  if (local) {
    try {
      const info = await FileSystem.getInfoAsync(local);
      if (info.exists) return await playUri(local, onFinish, gen);
    } catch {
      /* try remote */
    }
  }
  if (remoteUrl) return playUri(remoteUrl, onFinish, gen);
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
