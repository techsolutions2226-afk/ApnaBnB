import { FiZap, FiRefreshCw } from "react-icons/fi";
import "../../styles/AiDescription.css";

/* ─── AiDescriptionBadge ───
   The status strip that sits above a description textarea:
     • while generating — a "writing…" pill
     • after generating — an "AI-written" badge plus a rewrite button, so the
       user can see the text isn't theirs and can ask for another version
     • on failure — a plain message; the field still works, they just type it

   Purely presentational; all state lives in useAiDescription.
*/
const AiDescriptionBadge = ({ loading, isAi, error, onRegenerate, canRegenerate = true }) => {
  if (loading) {
    return (
      <span className="ai-desc-pill ai-desc-pill--busy">
        <FiZap size={13} className="ai-desc-spark" />
        Writing your description…
      </span>
    );
  }

  if (error) {
    return (
      <span className={`ai-desc-note ${error.soft ? "" : "ai-desc-note--warn"}`}>
        {error.message}
        {canRegenerate && !error.soft && (
          <button type="button" className="ai-desc-link" onClick={onRegenerate}>
            Try again
          </button>
        )}
      </span>
    );
  }

  if (isAi) {
    return (
      <span className="ai-desc-row">
        <span className="ai-desc-pill">
          <FiZap size={13} />
          Written by AI — edit it freely
        </span>
        {canRegenerate && (
          <button
            type="button"
            className="ai-desc-link"
            onClick={onRegenerate}
            title="Generate a different version"
          >
            <FiRefreshCw size={12} /> Rewrite
          </button>
        )}
      </span>
    );
  }

  return null;
};

export default AiDescriptionBadge;
