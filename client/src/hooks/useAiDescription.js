import { useCallback, useRef, useState } from "react";
import aiService from "../services/aiService";

/* ─── useAiDescription ───
   Drives the "AI writes your description" behaviour shared by Create Listing
   and Post Requirement.

   Behaviour: the first time the user focuses the empty description box, and
   they have already filled enough of the form above, the server writes a draft
   for them. The text lands in the normal form state, so it stays fully
   editable — the moment the user types, the AI badge clears and it is simply
   their text.

   Deliberately conservative about overwriting:
     • never generates when the box already has content
     • only auto-generates ONCE per form (autoTried), so clearing the box to
       rewrite it by hand doesn't retrigger the AI
     • an explicit regenerate() is exposed for the "rewrite" button

   Params:
     kind       — 'listing' | 'requirement'
     getFields  — () => flat object of the current form values
     onText     — (text) => void, writes the result into form state
     enabled    — gate auto-generation (e.g. false while editing an existing row)
*/
export const useAiDescription = ({ kind, getFields, onText, enabled = true }) => {
  const [loading, setLoading] = useState(false);
  const [isAi, setIsAi] = useState(false);
  const [error, setError] = useState(null);
  const autoTried = useRef(false);

  const run = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const text = await aiService.writeDescription(kind, getFields());
      onText(text);
      setIsAi(true);
    } catch (err) {
      // 422 just means "not enough detail yet" — that is guidance, not a
      // failure, and the caller decides whether to surface it.
      setError({ message: err?.message || "Could not generate a description", soft: err?.status === 422 });
    } finally {
      setLoading(false);
    }
  }, [kind, getFields, onText, loading]);

  /* Attach to the textarea's onFocus. */
  const handleFocus = useCallback(
    (currentValue) => {
      if (!enabled || autoTried.current) return;
      if (String(currentValue || "").trim()) return; // never clobber typing
      autoTried.current = true;
      run();
    },
    [enabled, run],
  );

  /* Explicit user action — always allowed, even after an auto attempt. */
  const regenerate = useCallback(() => {
    autoTried.current = true;
    run();
  }, [run]);

  /* Call from the textarea's onChange: once the user edits, it is their text. */
  const markEdited = useCallback(() => {
    setIsAi(false);
    setError(null);
  }, []);

  /* For edit forms that load existing content — suppress auto-generation. */
  const suppressAuto = useCallback(() => {
    autoTried.current = true;
  }, []);

  return { loading, isAi, error, handleFocus, regenerate, markEdited, suppressAuto };
};

export default useAiDescription;
