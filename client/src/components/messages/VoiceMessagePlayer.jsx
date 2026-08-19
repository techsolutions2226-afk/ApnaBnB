/* VoiceMessagePlayer — WhatsApp-style audio bubble: play/pause + progress bar.
   Mirrors the seek + duration behaviour of a native <audio> control. */
import { useEffect, useRef, useState } from "react";
import { FiPlay, FiPause } from "react-icons/fi";

const fmt = (sec) => {
  if (!isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

const VoiceMessagePlayer = ({ src }) => {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setProgress(a.currentTime || 0);
    const onLoaded = () => setDuration(a.duration || 0);
    const onEnded = () => setProgress(a.duration || 0);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("ended", onEnded);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("ended", onEnded);
    };
  }, [src]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      // only one voice at a time is fine — just play
      a.play().catch(() => {});
    } else {
      a.pause();
    }
  };

  const seek = (e) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    a.currentTime = ratio * duration;
    setProgress(a.currentTime);
  };

  return (
    <div className="voice-msg">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button type="button" className="voice-msg-play" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
        {playing ? <FiPause size={16} /> : <FiPlay size={16} />}
      </button>
      <div className="voice-msg-track" onClick={seek}>
        <div
          className="voice-msg-fill"
          style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
        />
      </div>
      <span className="voice-msg-dur">{fmt(playing ? duration - progress : progress)}</span>
    </div>
  );
};

export default VoiceMessagePlayer;