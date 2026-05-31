import { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playHistory, setPlayHistory] = useState([]);
  const audioRef = useRef(null);

  // ── Sync audio src when track changes ──
  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    audioRef.current.src = currentTrack.audioUrl || "http://localhost:5000/audio/dummy.mp3";
    audioRef.current.load();
    if (isPlaying) {
      audioRef.current.play().catch(() => console.log('Autoplay blocked'));
    }
  }, [currentTrack]);

  // ── Sync play/pause ──
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => console.log('Autoplay blocked'));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  // ── Seek to position (0-1) ──
  const seekTo = useCallback((ratio) => {
    if (!audioRef.current || !audioRef.current.duration) return;
    audioRef.current.currentTime = ratio * audioRef.current.duration;
  }, []);

  // ── Play a track ──
  const playTrack = useCallback((track, trackQueue = [], startIndex = 0) => {
    // If the track is already playing, just toggle play/pause
  if (currentTrack && `${currentTrack.title}|${currentTrack.artist}` === `${track.title}|${track.artist}`) {
    setIsPlaying(prev => !prev);
    return;
  }
    // If not, start playing the new track and set up the queue
  setCurrentTrack(track);
  setQueue(trackQueue.length > 0 ? trackQueue : [track]);
  setQueueIndex(startIndex);
  setIsPlaying(true);
  setProgress(0);
  setCurrentTime(0);
  setPlayHistory(prev => {
    const filtered = prev.filter(t => `${t.title}|${t.artist}` !== `${track.title}|${track.artist}`);
    return [track, ...filtered].slice(0, 20);
  });
}, [currentTrack]);

  const togglePlay = useCallback(() => setIsPlaying(prev => !prev), []);

  const nextTrack = useCallback(() => {
    if (queue.length === 0) return;
    const nextIndex = (queueIndex + 1) % queue.length;
    setQueueIndex(nextIndex);
    setCurrentTrack(queue[nextIndex]);
    setIsPlaying(true);
    setProgress(0);
    setCurrentTime(0);
  }, [queue, queueIndex]);

  const prevTrack = useCallback(() => {
    if (queue.length === 0) return;
    const prevIndex = (queueIndex - 1 + queue.length) % queue.length;
    setQueueIndex(prevIndex);
    setCurrentTrack(queue[prevIndex]);
    setIsPlaying(true);
    setProgress(0);
    setCurrentTime(0);
  }, [queue, queueIndex]);

  const openPlayer = useCallback(() => setIsPlayerOpen(true), []);
  const closePlayer = useCallback(() => setIsPlayerOpen(false), []);

  return (
    <PlayerContext.Provider value={{
      currentTrack, isPlaying, queue, queueIndex,
      isPlayerOpen, progress, duration, currentTime,
      playHistory,
      audioRef, playTrack, togglePlay, nextTrack,
      prevTrack, openPlayer, closePlayer, seekTo,
    }}>
      {/* ── Single shared audio element ── */}
      <audio
        ref={audioRef}
        loop
        onTimeUpdate={(e) => {
          const t = e.target.currentTime;
          const d = e.target.duration || 0;
          setCurrentTime(t);
          setDuration(d);
          setProgress(d > 0 ? t / d : 0);
        }}
        onLoadedMetadata={(e) => {
          setDuration(e.target.duration);
        }}
        onEnded={() => {
          setIsPlaying(false);
          setProgress(0);
          setCurrentTime(0);
        }}
      />
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within a PlayerProvider");
  return ctx;
}