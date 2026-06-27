import { usePlayer } from '../context/PlayerContext';
import { useState, useEffect, useRef } from 'react';

const colors = {
  bg: "#222222",
  bgCard: "#2a2a2a",
  bgCardHover: "#303030",
  teal: "#5DEBD7",
  tealGlow: "rgba(93,235,215,0.15)",
  text: "#ffffff",
  textSecondary: "#aaaaaa",
  muted: "#666666",
  border: "rgba(255,255,255,0.07)",
};

const ROW_HEIGHT = 64; // approximate height of each QueueTrackRow, used for drag math
const HOLD_DELAY = 400; // ms before drag activates

// ─── Icons ────────────────────────────────────────────────────────────────────
const ChevronLeft = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M15 18l-6-6 6-6" stroke={colors.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MusicNoteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M9 18V6l12-2v12" stroke={colors.teal} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="6" cy="18" r="3" stroke={colors.teal} strokeWidth="1.6" />
    <circle cx="18" cy="16" r="3" stroke={colors.teal} strokeWidth="1.6" />
  </svg>
);

const PlayingBars = () => (
  <div style={{ display: "flex", gap: "2px", alignItems: "flex-end", height: "14px" }}>
    {[0.4, 1, 0.6].map((h, i) => (
      <div key={i} style={{
        width: 2.5, height: `${h * 14}px`, backgroundColor: colors.teal, borderRadius: 1,
      }} />
    ))}
  </div>
);

const DragHandle = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <circle cx="8" cy="6" r="1.5" fill={colors.muted} />
    <circle cx="8" cy="12" r="1.5" fill={colors.muted} />
    <circle cx="8" cy="18" r="1.5" fill={colors.muted} />
    <circle cx="16" cy="6" r="1.5" fill={colors.muted} />
    <circle cx="16" cy="12" r="1.5" fill={colors.muted} />
    <circle cx="16" cy="18" r="1.5" fill={colors.muted} />
  </svg>
);

// ─── Queue Track Row ──────────────────────────────────────────────────────────
const QueueTrackRow = ({ track, isActive, onTap, isDragHandleVisible, isBeingDragged, dragHandlers }) => (
  <div
    onClick={isBeingDragged ? undefined : onTap}
    {...(dragHandlers || {})}
    style={{
      display: "flex", alignItems: "center", gap: "12px",
      padding: "10px 0", cursor: isDragHandleVisible ? "default" : "pointer",
      backgroundColor: isBeingDragged ? colors.bgCardHover : colors.bg,
      borderRadius: isBeingDragged ? "10px" : "0",
      boxShadow: isBeingDragged ? "0 8px 24px rgba(0,0,0,0.5)" : "none",
      userSelect: "none",
      touchAction: isDragHandleVisible ? "none" : "auto",
    }}
  >
    <div style={{
      width: 44, height: 44, borderRadius: "8px", flexShrink: 0,
      backgroundColor: colors.bgCard, overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {track.coverUrl ? (
        <img src={track.coverUrl} alt={track.album} style={{ width: "100%", height: "100%", objectFit: "cover" }} draggable={false} />
      ) : (
        <MusicNoteIcon />
      )}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontSize: "13px", fontWeight: "600",
        color: isActive ? colors.teal : colors.text,
        fontFamily: "'Kanit', sans-serif",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {track.title}
      </div>
      <div style={{
        fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "2px",
      }}>
        {track.artist}
      </div>
    </div>
    {isActive && <PlayingBars />}
    {isDragHandleVisible && <DragHandle />}
  </div>
);

// ─── Queue Panel ──────────────────────────────────────────────────────────────
export default function QueuePanel({ isOpen, onClose }) {
  const { queue, queueIndex, currentTrack, isPlaying, jumpToQueueIndex, reorderQueue } = usePlayer();

  const upcoming = queue.slice(queueIndex + 1);
  // ── Combined list of absolute indices, in display order, spanning both sections ──
  const upcomingWithIndices = upcoming.map((track, i) => ({ track, absoluteIndex: queueIndex + 1 + i }));
  const manualUpcoming = upcomingWithIndices.filter(t => t.track.source !== 'auto');
  const autoUpcoming = upcomingWithIndices.filter(t => t.track.source === 'auto');

  // ── Now Playing slide animation ──
  const [outgoingTrack, setOutgoingTrack] = useState(null);
  const prevTrackRef = useRef(currentTrack);

  useEffect(() => {
    if (!currentTrack) return;
    const prev = prevTrackRef.current;
    const isSameTrack = prev && `${prev.title}|${prev.artist}` === `${currentTrack.title}|${currentTrack.artist}`;
    if (!isSameTrack && prev) {
      setOutgoingTrack(prev);
    }
    prevTrackRef.current = currentTrack;
  }, [currentTrack]);

  // ── Drag-to-reorder state ──
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [dragY, setDragY] = useState(0);
  const holdTimerRef = useRef(null);
  const startYRef = useRef(null);
  const isDraggingRef = useRef(false);
  const justDraggedRef = useRef(false);

  const clearHoldTimer = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  // ── Now safe to reference justDraggedRef since it's already declared above ──
  const handleTrackTap = (track, absoluteIndex) => {
    if (justDraggedRef.current) return;
    jumpToQueueIndex(absoluteIndex);
  };

  const handlePressStart = (absoluteIndex, clientY) => {
  console.log('mousedown fired', absoluteIndex);
  isDraggingRef.current = false;
  setDraggingIndex(null);
  setDragOverIndex(null);
  setDragY(0);

  startYRef.current = clientY;
  clearHoldTimer();
  holdTimerRef.current = setTimeout(() => {
    console.log('HOLD FIRED', absoluteIndex);
    isDraggingRef.current = true;
    setDraggingIndex(absoluteIndex);
    setDragOverIndex(absoluteIndex);
    setDragY(0);
  }, HOLD_DELAY);
};

const dragOverIndexRef = useRef(null);

const handlePressMove = (clientY) => {
  if (!isDraggingRef.current) {
    if (Math.abs(clientY - startYRef.current) > 8) {
      clearHoldTimer();
    }
    return;
  }
  const offset = clientY - startYRef.current;
  setDragY(offset);

  const rowsMoved = Math.round(offset / ROW_HEIGHT);
  const newIndex = Math.max(
    queueIndex + 1,
    Math.min(queue.length - 1, draggingIndex + rowsMoved)
  );
  dragOverIndexRef.current = newIndex; // ← always current, ref reads are never stale
  setDragOverIndex(newIndex); // still update state too, for the visual preview rendering
};

const handlePressEnd = () => {
  clearHoldTimer();
  if (isDraggingRef.current && draggingIndex !== null && dragOverIndexRef.current !== null) {
    if (draggingIndex !== dragOverIndexRef.current) {
      reorderQueue(draggingIndex, dragOverIndexRef.current);
    }
    justDraggedRef.current = true;
    setTimeout(() => { justDraggedRef.current = false; }, 50);
  }
  isDraggingRef.current = false;
  setDraggingIndex(null);
  setDragOverIndex(null);
  dragOverIndexRef.current = null;
  setDragY(0);
};

  // ── Global window listeners while dragging, attached only once a drag is active ──
  useEffect(() => {
    if (draggingIndex === null) return;

    const handleWindowMouseMove = (e) => handlePressMove(e.clientY);
    const handleWindowMouseUp = () => handlePressEnd();
    const handleWindowTouchMove = (e) => handlePressMove(e.touches[0].clientY);
    const handleWindowTouchEnd = () => handlePressEnd();

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    window.addEventListener('touchmove', handleWindowTouchMove);
    window.addEventListener('touchend', handleWindowTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
    };
  }, [draggingIndex]);

  // ── Build the drag event handlers for a given row ──
  const getDragHandlers = (absoluteIndex) => ({
    onMouseDown: (e) => handlePressStart(absoluteIndex, e.clientY),
    onMouseLeave: () => { if (draggingIndex === null) clearHoldTimer(); },
    onTouchStart: (e) => handlePressStart(absoluteIndex, e.touches[0].clientY),
  });

  // ── Render a single section's rows with drag offset preview applied ──
  const renderRow = ({ track, absoluteIndex }) => {
    const isBeingDragged = draggingIndex === absoluteIndex;

    // ── Compute visual shift for rows displaced by the drag preview ──
    let visualShift = 0;
    if (draggingIndex !== null && dragOverIndex !== null && !isBeingDragged) {
      if (draggingIndex < dragOverIndex && absoluteIndex > draggingIndex && absoluteIndex <= dragOverIndex) {
        visualShift = -ROW_HEIGHT;
      } else if (draggingIndex > dragOverIndex && absoluteIndex < draggingIndex && absoluteIndex >= dragOverIndex) {
        visualShift = ROW_HEIGHT;
      }
    }

    return (
      <div
        key={absoluteIndex}
        style={{
          position: "relative",
          transform: isBeingDragged
            ? `translateY(${dragY}px)`
            : `translateY(${visualShift}px)`,
          transition: isBeingDragged ? "none" : "transform 0.2s ease",
          zIndex: isBeingDragged ? 10 : 1,
        }}
      >
        <QueueTrackRow
          track={track}
          isActive={false}
          onTap={() => handleTrackTap(track, absoluteIndex)}
          isDragHandleVisible={true}
          isBeingDragged={isBeingDragged}
          dragHandlers={getDragHandlers(absoluteIndex)}
        />
      </div>
    );
  };

  return (
    <div style={{
      position: "absolute",
      inset: 0,
      zIndex: 1200,
      pointerEvents: isOpen ? "all" : "none",
    }}>
      <style>{`
        @keyframes slideUpIn {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes slideUpOut {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(-100%); opacity: 0; }
        }
      `}</style>

      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.5)" }}
        />
      )}

      {/* Panel — slides in from right */}
      <div style={{
        position: "absolute",
        top: 0, right: 0, bottom: 0,
        width: "88%",
        backgroundColor: colors.bg,
        transform: isOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{
          padding: "48px 20px 16px",
          borderBottom: `1px solid ${colors.border}`,
          display: "flex", alignItems: "center", gap: "12px",
          flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex" }}
          >
            <ChevronLeft />
          </button>
          <div style={{ fontSize: "18px", fontWeight: "700", color: colors.text, fontFamily: "'Kanit', sans-serif", letterSpacing: "-0.3px" }}>
            Queue
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: draggingIndex !== null ? "hidden" : "auto", padding: "16px 20px 0" }}>

          {/* ── Now Playing ── */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", fontWeight: "600", color: colors.muted, fontFamily: "'Kanit', sans-serif", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "8px" }}>
              Now Playing
            </div>
            <div style={{ position: "relative", height: "64px", overflow: "hidden" }}>
              {outgoingTrack && (
                <div
                  key={`out-${outgoingTrack.title}-${outgoingTrack.artist}`}
                  onAnimationEnd={() => setOutgoingTrack(null)}
                  style={{
                    position: "absolute", top: 0, left: 0, right: 0,
                    animation: "slideUpOut 0.35s cubic-bezier(0.32, 0.72, 0, 1) forwards",
                  }}
                >
                  <QueueTrackRow track={outgoingTrack} isActive={false} onTap={() => {}} />
                </div>
              )}
              {currentTrack && (
                <div
                  key={`in-${currentTrack.title}-${currentTrack.artist}`}
                  style={{
                    position: "absolute", top: 0, left: 0, right: 0,
                    animation: outgoingTrack ? "slideUpIn 0.35s cubic-bezier(0.32, 0.72, 0, 1)" : "none",
                  }}
                >
                  <QueueTrackRow track={currentTrack} isActive={true} onTap={() => {}} />
                </div>
              )}
            </div>
          </div>

          {/* ── Manually queued / from album ── */}
          {manualUpcoming.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "11px", fontWeight: "600", color: colors.muted, fontFamily: "'Kanit', sans-serif", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "8px" }}>
                Next Up
              </div>
              {manualUpcoming.map(renderRow)}
            </div>
          )}

          {/* ── Divider before auto-recommended tracks ── */}
          {autoUpcoming.length > 0 && (
            <>
              <div style={{
                display: "flex", alignItems: "center", gap: "8px",
                margin: "8px 0 16px",
              }}>
                <div style={{ flex: 1, height: "1px", backgroundColor: colors.border }} />
                <div style={{ fontSize: "10px", color: colors.teal, fontFamily: "'Kanit', sans-serif", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                  Based on what's playing
                </div>
                <div style={{ flex: 1, height: "1px", backgroundColor: colors.border }} />
              </div>

              <div style={{ marginBottom: "20px" }}>
                {autoUpcoming.map(renderRow)}
              </div>
            </>
          )}

          {upcoming.length === 0 && (
            <div style={{
              textAlign: "center", color: colors.muted, fontFamily: "'Kanit', sans-serif",
              fontSize: "13px", paddingTop: "40px",
            }}>
              Nothing queued yet. Keep listening and we'll find more for you.
            </div>
          )}

          <div style={{ height: "20px" }} />
        </div>
      </div>
    </div>
  );
}