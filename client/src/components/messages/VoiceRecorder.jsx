/* VoiceRecorder — MediaRecorder-based voice capture. Call onSend(file, blobUrl).
   Handle mic permission errors gracefully; cancel discards the recording. */
import { useRef, useState } from "react";
import { FiMic, FiSquare, FiX, FiPlay, FiSend, FiTrash } from "react-icons/fi";

const fmt = (sec) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

const VoiceRecorder = ({ onSend, onCancel, uploading = false }) => {
  const [status, setStatus] = useState("idle"); // idle | recording | ready
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  const mediaRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const cleanup = () => {
    clearInterval(timerRef.current);
    setSeconds(0);
    mediaRef.current?.getTracks().forEach((t) => t.stop());
    mediaRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  };

  const startRecording = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Microphone is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        setPreviewUrl(URL.createObjectURL(blob));
        setStatus("ready");
      };
      rec.start();
      setStatus("recording");
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError("Microphone access was denied. Allow it to record voice messages.");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
    mediaRef.current?.getTracks().forEach((t) => t.stop());
    clearInterval(timerRef.current);
  };

  const cancelAll = () => {
    if (status === "recording") stopRecording();
    cleanup();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setStatus("idle");
    onCancel?.();
  };

  const send = () => {
    if (!previewUrl || uploading) return;
    fetch(previewUrl)
      .then((r) => r.blob())
      .then((blob) => {
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });
        onSend?.(file, previewUrl);
      })
      .catch(() => setError("Could not read the recording."));
  };

  return (
    <div className="voice-rec">
      {status === "idle" && (
        <>
          <button type="button" className="voice-rec-btn" title="Record voice message" onClick={startRecording}>
            <FiMic size={20} />
          </button>
          {error && <span className="voice-rec-error">{error}</span>}
        </>
      )}

      {status === "recording" && (
        <div className="voice-rec-active">
          <span className="voice-rec-timer">
            <span className="voice-rec-dot" /> {fmt(seconds)}
          </span>
          <button type="button" className="voice-rec-stop" title="Stop recording" onClick={stopRecording}>
            <FiSquare size={16} />
          </button>
          <button type="button" className="voice-rec-cancel" title="Cancel" onClick={cancelAll}>
            <FiTrash size={16} />
          </button>
        </div>
      )}

      {status === "ready" && (
        <div className="voice-rec-ready">
          <audio controls src={previewUrl} className="voice-rec-preview" />
          <span className="voice-rec-dur">🎙 {fmt(seconds)}</span>
          <button type="button" className="voice-rec-send" disabled={uploading} title="Send" onClick={send}>
            {uploading ? <FiPlay size={16} /> : <FiSend size={16} />}
          </button>
          <button type="button" className="voice-rec-cancel" title="Discard" onClick={cancelAll}>
            <FiX size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;