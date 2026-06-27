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

  // ── Fetch similar tracks and append to queue.
  //     mode 'advance' (default) jumps playback to the first new track immediately.
  //     mode 'append' just adds tracks to the queue silently, keeping current playback untouched. ──
  const extendQueue = useCallback(async (lastTrack, mode = 'advance') => {
    if (!lastTrack) return;
    try {
      const params = new URLSearchParams();
      if (lastTrack.artist) params.set('artist', lastTrack.artist);
      if (lastTrack.genre) params.set('genre', lastTrack.genre);
      params.set('limit', '15');

      const res = await fetch(`http://localhost:5000/api/auth/tracks/similar?${params.toString()}`);
      const data = await res.json();

      if (data.tracks && data.tracks.length > 0) {
        const taggedTracks = data.tracks.map(t => ({ ...t, source: 'auto' }));

        if (mode === 'append') {
          setQueue(prev => [...prev, ...taggedTracks]);
          return;
        }

        setQueue(prev => {
          const newQueue = [...prev, ...taggedTracks];
          const newIndex = prev.length;
          setQueueIndex(newIndex);
          setCurrentTrack(newQueue[newIndex]);
          setIsPlaying(true);
          setProgress(0);
          setCurrentTime(0);
          return newQueue;
        });
      } else if (mode === 'advance') {
        setIsPlaying(false);
      }
    } catch (err) {
      console.log('Failed to extend queue:', err);
      if (mode === 'advance') setIsPlaying(false);
    }
  }, []);

  // ── Play a track as part of a real, meaningful queue (e.g. an album) ──
  const playTrack = useCallback((track, trackQueue = [], startIndex = 0) => {
    if (currentTrack && `${currentTrack.title}|${currentTrack.artist}` === `${track.title}|${track.artist}`) {
      setIsPlaying(prev => !prev);
      return;
    }

    const taggedQueue = (trackQueue.length > 0 ? trackQueue : [track]).map(t => ({ ...t, source: 'manual' }));

    setCurrentTrack({ ...track, source: 'manual' });
    setQueue(taggedQueue);
    setQueueIndex(startIndex);
    setIsPlaying(true);
    setProgress(0);
    setCurrentTime(0);
    setPlayHistory(prev => {
      const filtered = prev.filter(t => `${t.title}|${t.artist}` !== `${track.title}|${track.artist}`);
      return [track, ...filtered].slice(0, 20);
    });
  }, [currentTrack]);

  // ── Play a single standalone track (search result, loved track, etc.) — no meaningful surrounding queue.
  //     Plays just this track, then silently builds a real queue behind it based on similar tracks. ──
  const playStandaloneTrack = useCallback((track) => {
    if (currentTrack && `${currentTrack.title}|${currentTrack.artist}` === `${track.title}|${track.artist}`) {
      setIsPlaying(prev => !prev);
      return;
    }

    const taggedTrack = { ...track, source: 'manual' };
    setCurrentTrack(taggedTrack);
    setQueue([taggedTrack]);
    setQueueIndex(0);
    setIsPlaying(true);
    setProgress(0);
    setCurrentTime(0);
    setPlayHistory(prev => {
      const filtered = prev.filter(t => `${t.title}|${t.artist}` !== `${track.title}|${track.artist}`);
      return [track, ...filtered].slice(0, 20);
    });

    // ── Silently build a real queue behind this track, without skipping ahead ──
    extendQueue(taggedTrack, 'append');
  }, [currentTrack, extendQueue]);

  const togglePlay = useCallback(() => setIsPlaying(prev => !prev), []);

  // ── Ensure at least `minUpcoming` tracks remain ahead in the queue, replenishing via extendQueue if not ──
const ensureQueueDepth = useCallback((latestQueue, latestIndex, minUpcoming = 15) => {
  const upcomingCount = latestQueue.length - (latestIndex + 1);
  if (upcomingCount < minUpcoming) {
    const lastTrack = latestQueue[latestQueue.length - 1];
    extendQueue(lastTrack, 'append');
  }
}, [extendQueue]);

  // ── Next track, with auto-extend when queue runs out ──
 const nextTrack = useCallback(() => {
  if (queue.length === 0) return;
  const nextIndex = queueIndex + 1;

  if (nextIndex >= queue.length) {
    extendQueue(queue[queueIndex], 'advance');
    return;
  }

  setQueueIndex(nextIndex);
  setCurrentTrack(queue[nextIndex]);
  setIsPlaying(true);
  setProgress(0);
  setCurrentTime(0);
  ensureQueueDepth(queue, nextIndex);
}, [queue, queueIndex, extendQueue, ensureQueueDepth]);

// ── Reorder the upcoming portion of the queue — fromIndex and toIndex are absolute indices into the full queue array ──
const reorderQueue = useCallback((fromIndex, toIndex) => {
  setQueue(prev => {
    if (fromIndex === toIndex) return prev;
    if (fromIndex <= queueIndex || toIndex <= queueIndex) return prev; // protect current and past tracks
    const newQueue = [...prev];
    const [moved] = newQueue.splice(fromIndex, 1);
    newQueue.splice(toIndex, 0, moved);
    return newQueue;
  });
}, [queueIndex]);

// ── Jump to a specific index within the existing queue, replenishing if needed ──
const jumpToQueueIndex = useCallback((index) => {
  if (index < 0 || index >= queue.length) return;
  setQueueIndex(index);
  setCurrentTrack(queue[index]);
  setIsPlaying(true);
  setProgress(0);
  setCurrentTime(0);
  ensureQueueDepth(queue, index);
}, [queue, ensureQueueDepth]);

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
      audioRef, playTrack, playStandaloneTrack, togglePlay, nextTrack,
      prevTrack, openPlayer, closePlayer, seekTo, jumpToQueueIndex, reorderQueue,
    }}>
      {/* ── Single shared audio element ── */}
      <audio
        ref={audioRef}
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
          nextTrack();
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