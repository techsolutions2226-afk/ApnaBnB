/* MessageReactions — reaction pills under a bubble + a compact quick-pick.
   `reactions` is { userId: emoji }. mine is the current user's emoji (if any). */
import { FiSmile } from "react-icons/fi";

const QUICK = ["❤️", "👍", "😂", "😮", "😢", "🙏"];

const MessageReactions = ({ reactions, mine, onReact, onOpenPicker, disabled }) => {
  const entries = Object.entries(reactions || {});
  if (entries.length === 0 && !onOpenPicker) return null;

  // group by emoji, sorted by count desc
  const grouped = {};
  entries.forEach(([, emoji]) => {
    grouped[emoji] = (grouped[emoji] || 0) + 1;
  });
  const order = Object.keys(grouped).sort((a, b) => grouped[b] - grouped[a]);

  return (
    <div className={`msg-reactions${disabled ? "" : " msg-reactions--interactive"}`}>
      {order.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className={`msg-reaction ${mine === emoji ? "msg-reaction--mine" : ""}`}
          disabled={disabled}
          onClick={() => {
            if (mine === emoji) onReact?.("");
            else onReact?.(emoji);
          }}
          title={mine === emoji ? "Remove reaction" : `React ${emoji}`}
        >
          <span className="msg-reaction-emoji">{emoji}</span>
          <span className="msg-reaction-count">{grouped[emoji]}</span>
        </button>
      ))}
      {onOpenPicker && (
        <button
          type="button"
          className="msg-reaction msg-reaction--more"
          disabled={disabled}
          onClick={onOpenPicker}
          title="Add reaction"
          aria-label="Add reaction"
        >
          <FiSmile size={14} />
        </button>
      )}
    </div>
  );
};

export { QUICK };
export default MessageReactions;