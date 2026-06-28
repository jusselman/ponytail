import { usePlayer } from '../context/PlayerContext';
import { useState, useEffect, useRef, memo } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

// ─── Queue Track Row content (drag wiring is applied by SortableRow) ──
const QueueTrackRow = ({ track, isActive, onTap, isBeingDragged }) => (
  <div
    onClick={onTap}
    style={{
      display: "flex", alignItems: "center", gap: "12px",
      padding: "10px 0", cursor: "pointer",
      backgroundColor: isBeingDragged ? colors.bgCardHover : colors.bg,
      borderRadius: isBeingDragged ? "10px" : "0",
      boxShadow: isBeingDragged ? "0 8px 24px rgba(0,0,0,0.5)" : "none",
      userSelect: "none",
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
    <DragHandle />
  </div>
);

// ─── Sortable row wrapper — provides drag behavior via dnd-kit's useSortable ──
const SortableRow = ({ id, track, onTap }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: "relative",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <QueueTrackRow track={track} isActive={false} onTap={onTap} isBeingDragged={isDragging} />
    </div>
  );
};

// ─── Queue Panel ──────────────────────────────────────────────────────────────
function QueuePanel({ isOpen, onClose }) {
  const { queue, queueIndex, currentTrack, isPlaying, jumpToQueueIndex, reorderQueue } = usePlayer();

  const upcoming = queue.slice(queueIndex + 1);
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

  const justDraggedRef = useRef(false);

  const handleTrackTap = (absoluteIndex) => {
    if (justDraggedRef.current) return;
    jumpToQueueIndex(absoluteIndex);
  };

  // ── dnd-kit sensors — unified mouse and touch support out of the box ──
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 200, tolerance: 8 }, // press-and-hold before drag activates
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    })
  );

  const getRowId = (track) => `${track.title}|${track.artist}`;

  // ── Build a single ordered array of sortable IDs spanning both sections ──
  const allUpcomingIds = upcomingWithIndices.map(t => getRowId(t.track));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const fromIdx = allUpcomingIds.indexOf(active.id);
    const toIdx = allUpcomingIds.indexOf(over.id);
    if (fromIdx === -1 || toIdx === -1) return;

    // ── Convert local sortable-list indices back into absolute queue indices ──
    const fromAbsolute = queueIndex + 1 + fromIdx;
    const toAbsolute = queueIndex + 1 + toIdx;

    reorderQueue(fromAbsolute, toAbsolute);

    justDraggedRef.current = true;
    setTimeout(() => { justDraggedRef.current = false; }, 150);
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
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 0" }}>

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

          {/* ── Single DndContext spanning the entire upcoming list (both sections) ── */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={allUpcomingIds} strategy={verticalListSortingStrategy}>

              {/* ── Manually queued / from album ── */}
              {manualUpcoming.length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: colors.muted, fontFamily: "'Kanit', sans-serif", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "8px" }}>
                    Next Up
                  </div>
                  {manualUpcoming.map(({ track, absoluteIndex }) => (
                    <SortableRow
                      key={getRowId(track)}
                      id={getRowId(track)}
                      track={track}
                      onTap={() => handleTrackTap(absoluteIndex)}
                    />
                  ))}
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
                    {autoUpcoming.map(({ track, absoluteIndex }) => (
                      <SortableRow
                        key={getRowId(track)}
                        id={getRowId(track)}
                        track={track}
                        onTap={() => handleTrackTap(absoluteIndex)}
                      />
                    ))}
                  </div>
                </>
              )}

            </SortableContext>
          </DndContext>

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

export default memo(QueuePanel);