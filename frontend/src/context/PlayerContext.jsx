import { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';

const PlayerContext = createContext(null);
const PlaybackProgressContext = createContext(null);

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
      // ── Filter out incomplete rows then tag as auto ──
      const taggedTracks = data.tracks
        .filter(t => t.title && t.artist)
        .map(t => ({ ...t, source: 'auto' }));

      if (mode === 'append') {
        setQueue(prev => {
          const existingKeys = new Set(prev.map(t => `${t.title}|${t.artist}`));
          const newTracks = taggedTracks.filter(t => !existingKeys.has(`${t.title}|${t.artist}`));
          return [...prev, ...newTracks];
        });
        return;
      }

      setQueue(prev => {
        const existingKeys = new Set(prev.map(t => `${t.title}|${t.artist}`));
        const newTracks = taggedTracks.filter(t => !existingKeys.has(`${t.title}|${t.artist}`));
        const newQueue = [...prev, ...newTracks];
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
    setCurrentTrack(prevTrack => {
      if (prevTrack && `${prevTrack.title}|${prevTrack.artist}` === `${track.title}|${track.artist}`) {
        setIsPlaying(p => !p);
        return prevTrack;
      }

      const taggedQueue = (trackQueue.length > 0 ? trackQueue : [track]).map(t => ({ ...t, source: 'manual' }));
      setQueue(taggedQueue);
      setQueueIndex(startIndex);
      setIsPlaying(true);
      setProgress(0);
      setCurrentTime(0);
      setPlayHistory(prev => {
        const filtered = prev.filter(t => `${t.title}|${t.artist}` !== `${track.title}|${track.artist}`);
        return [track, ...filtered].slice(0, 20);
      });
      return { ...track, source: 'manual' };
    });
  }, []);

  // ── Play a single standalone track (search result, loved track, etc.) — no meaningful surrounding queue.
  //     Plays just this track, then silently builds a real queue behind it based on similar tracks. ──
  const playStandaloneTrack = useCallback((track) => {
  setCurrentTrack(prevTrack => {
    if (prevTrack && `${prevTrack.title}|${prevTrack.artist}` === `${track.title}|${track.artist}`) {
      setIsPlaying(p => !p);
      return prevTrack;
    }

    const taggedTrack = { ...track, source: 'manual' };
    setQueue([taggedTrack]);
    setQueueIndex(0);
    setIsPlaying(true);
    setProgress(0);
    setCurrentTime(0);
    setPlayHistory(prev => {
      const filtered = prev.filter(t => `${t.title}|${t.artist}` !== `${track.title}|${track.artist}`);
      return [track, ...filtered].slice(0, 20);
    });

    recordPlayHistory(track); // ← new
    recordSearchSelection(track); // ← new, specific to standalone/search taps

    extendQueue(taggedTrack, 'append');
    return taggedTrack;
  });
}, [extendQueue]);

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
    setQueue(currentQueue => {
      setQueueIndex(currentIndex => {
        if (currentQueue.length === 0) return currentIndex;
        const nextIndex = currentIndex + 1;

        if (nextIndex >= currentQueue.length) {
          extendQueue(currentQueue[currentIndex], 'advance');
          return currentIndex;
        }

        setCurrentTrack(currentQueue[nextIndex]);
        setIsPlaying(true);
        setProgress(0);
        setCurrentTime(0);
        ensureQueueDepth(currentQueue, nextIndex);
        return nextIndex;
      });
      return currentQueue;
    });
  }, [extendQueue, ensureQueueDepth]);

  // ── Reorder the upcoming portion of the queue — fromIndex and toIndex are absolute indices into the full queue array ──
  const reorderQueue = useCallback((fromIndex, toIndex) => {
    setQueueIndex(currentIndex => {
      setQueue(prev => {
        if (fromIndex === toIndex) return prev;
        if (fromIndex <= currentIndex || toIndex <= currentIndex) return prev;
        const newQueue = [...prev];
        const [moved] = newQueue.splice(fromIndex, 1);
        newQueue.splice(toIndex, 0, moved);
        return newQueue;
      });
      return currentIndex;
    });
  }, []);

  // ── Jump to a specific index within the existing queue, replenishing if needed ──
  const jumpToQueueIndex = useCallback((index) => {
    setQueue(currentQueue => {
      if (index < 0 || index >= currentQueue.length) return currentQueue;
      setQueueIndex(index);
      setCurrentTrack(currentQueue[index]);
      setIsPlaying(true);
      setProgress(0);
      setCurrentTime(0);
      ensureQueueDepth(currentQueue, index);
      return currentQueue;
    });
  }, [ensureQueueDepth]);

  const prevTrack = useCallback(() => {
    setQueue(currentQueue => {
      setQueueIndex(currentIndex => {
        if (currentQueue.length === 0) return currentIndex;
        const prevIndex = (currentIndex - 1 + currentQueue.length) % currentQueue.length;
        setCurrentTrack(currentQueue[prevIndex]);
        setIsPlaying(true);
        setProgress(0);
        setCurrentTime(0);
        return prevIndex;
      });
      return currentQueue;
    });
  }, []);

  const openPlayer = useCallback(() => setIsPlayerOpen(true), []);
  const closePlayer = useCallback(() => setIsPlayerOpen(false), []);

 // ── Stable context: only changes when something meaningful changes, never on progress ticks ──
const playerValue = useMemo(() => ({
  currentTrack, isPlaying, queue, queueIndex,
  isPlayerOpen, playHistory,
  audioRef, playTrack, playStandaloneTrack, togglePlay, nextTrack,
  prevTrack, openPlayer, closePlayer, seekTo, jumpToQueueIndex, reorderQueue,
}), [
  currentTrack, isPlaying, queue, queueIndex,
  isPlayerOpen, playHistory, playTrack, playStandaloneTrack, togglePlay, nextTrack,
  prevTrack, openPlayer, closePlayer, seekTo, jumpToQueueIndex, reorderQueue,
]);

  // ── Fast-changing context: progress/currentTime/duration, isolated so only progress-bar consumers re-render on ticks ──
  const progressValue = useMemo(() => ({
    progress, duration, currentTime,
  }), [progress, duration, currentTime]);

  return (
    <PlayerContext.Provider value={playerValue}>
      <PlaybackProgressContext.Provider value={progressValue}>
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
      </PlaybackProgressContext.Provider>
    </PlayerContext.Provider>
  );
}

// ── Record a track play in the user's permanent history ──
const recordPlayHistory = async (track) => {
  try {
    const token = await AsyncStorage.getItem('ponytail_token');
    if (!token) return;

    await fetch('http://localhost:5000/api/auth/history/play', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: track.title,
        artist: track.artist,
        album: track.album,
        genre: track.genre,
      }),
    });
  } catch (err) {
    console.log('Failed to record play history:', err);
  }
};

// ── Record a track tapped specifically from search results ──
const recordSearchSelection = async (track) => {
  try {
    const token = await AsyncStorage.getItem('ponytail_token');
    if (!token) return;

    await fetch('http://localhost:5000/api/auth/history/search-selection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: track.title,
        artist: track.artist,
        album: track.album,
        genre: track.genre,
      }),
    });
  } catch (err) {
    console.log('Failed to record search selection:', err);
  }
};

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within a PlayerProvider");
  return ctx;
}

// ── Use this hook only in components that need live progress (e.g. MiniPlayer, FullPlayer progress bar).
//     Components using only usePlayer() will not re-render on every progress tick. ──
export function usePlaybackProgress() {
  const ctx = useContext(PlaybackProgressContext);
  if (!ctx) throw new Error("usePlaybackProgress must be used within a PlayerProvider");
  return ctx;
}