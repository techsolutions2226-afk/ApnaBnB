/* EmojiPicker — lightweight emoji grid (no external library). Used by the
   composer and the message reaction bar. */
import { useEffect, useRef } from "react";

const EMOJIS = [
  "😀","😁","😂","🤣","😊","😍","🤩","😘","😎","🤗",
  "🤔","😐","😴","🥳","😅","😭","😢","😮","😲","😱",
  "😡","😤","👍","👎","👏","🙏","🙌","🤝","💪","🖐️",
  "❤️","💔","💯","⭐","🔥","✨","🎉","🎂","💰","🏠",
  "🏠","🔑","📷","📞","✅","❌","📍","🚗","🏢","🌳",
];

const EmojiPicker = ({ onPick, onClose, className = "" }) => {
  const ref = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose?.();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onClose]);

  return (
    <div ref={ref} className={`emoji-picker ${className}`}>
      <div className="emoji-picker-grid">
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            className="emoji-picker-cell"
            onClick={() => onPick(e)}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
};

export default EmojiPicker;