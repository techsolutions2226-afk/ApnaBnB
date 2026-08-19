/* QuoteBlock — a quoted-reply preview (WhatsApp-style). Shows the author + a
   one-line excerpt. Clicking usually scrolls to the original message. */
const QuoteBlock = ({ senderName, content, attachmentKind, onClick }) => {
  const preview = content
    ? content
    : {
        image: "📷 Photo",
        video: "🎬 Video",
        audio: "🎙 Voice message",
        document: "📎 Document",
        location: "📍 Location",
        property: "🏠 Property",
      }[attachmentKind] || "Attachment";

  return (
    <button
      type="button"
      className="quote-block"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.();
      }}
      title="Go to message"
    >
      <span className="quote-block-author">{senderName || "Message"}</span>
      <span className="quote-block-text">{preview}</span>
    </button>
  );
};

export default QuoteBlock;