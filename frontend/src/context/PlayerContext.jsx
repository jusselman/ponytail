import { createContext, useContext, useState, useRef, useCallback } from "react";

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const audioRef = useRef(null);

  // ── Play a single track, optionally with a queue ──
  const playTrack = useCallback((track, trackQueue = [], startIndex = 0) => {
    setCurrentTrack(track);
    setQueue(trackQueue.length > 0 ? trackQueue : [track]);
    setQueueIndex(startIndex);
    setIsPlaying(true);
  }, []);

  // ── Toggle play/pause ──
  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  // ── Next track ──
  const nextTrack = useCallback(() => {
    if (queue.length === 0) return;
    const nextIndex = (queueIndex + 1) % queue.length;
    setQueueIndex(nextIndex);
    setCurrentTrack(queue[nextIndex]);
    setIsPlaying(true);
  }, [queue, queueIndex]);

  // ── Previous track ──
  const prevTrack = useCallback(() => {
    if (queue.length === 0) return;
    const prevIndex = (queueIndex - 1 + queue.length) % queue.length;
    setQueueIndex(prevIndex);
    setCurrentTrack(queue[prevIndex]);
    setIsPlaying(true);
  }, [queue, queueIndex]);

  // ── Open / close full player ──
  const openPlayer = useCallback(() => setIsPlayerOpen(true), []);
  const closePlayer = useCallback(() => setIsPlayerOpen(false), []);

  return (
    <PlayerContext.Provider value={{
      currentTrack,
      isPlaying,
      queue,
      queueIndex,
      isPlayerOpen,
      audioRef,
      playTrack,
      togglePlay,
      nextTrack,
      prevTrack,
      openPlayer,
      closePlayer,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within a PlayerProvider");
  return ctx;
}