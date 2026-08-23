import { useState } from "react";
import { toast } from "react-toastify";
import { FiCopy, FiDownload, FiAlertTriangle } from "react-icons/fi";

/* ─── RecoveryCodesPanel ───
   Shows the recovery codes exactly once, right after they are generated.
   The server only ever stores bcrypt hashes, so this really is the only
   chance to save them — the panel says so plainly and makes the user tick
   an acknowledgement before it will close.
*/
export default function RecoveryCodesPanel({ codes, onDone }) {
  const [acknowledged, setAcknowledged] = useState(false);

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      toast.success("Codes copied");
    } catch {
      toast.error("Could not copy — select and copy them manually");
    }
  };

  const download = () => {
    const body = [
      "ApnaBnB recovery codes",
      "",
      "Each code works once. Keep them somewhere safe and private.",
      "",
      ...codes,
      "",
      `Generated ${new Date().toLocaleString()}`,
    ].join("\n");

    const blob = new Blob([body], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "apnabnb-recovery-codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ac-setup">
      <div className="ac-recovery-warning">
        <FiAlertTriangle size={16} />
        <span>
          This is the only time these codes are shown. Save them now — we
          can&apos;t show them again.
        </span>
      </div>

      <ul className="ac-recovery-grid">
        {codes.map((code) => (
          <li key={code} className="ac-recovery-code">
            {code}
          </li>
        ))}
      </ul>

      <div className="ac-sec-form-actions">
        <button type="button" className="ac-btn-outline" onClick={copyAll}>
          <FiCopy size={14} /> Copy all
        </button>
        <button type="button" className="ac-btn-outline" onClick={download}>
          <FiDownload size={14} /> Download
        </button>
      </div>

      <label className="ac-check" style={{ marginTop: 18 }}>
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
        />
        I&apos;ve saved these codes somewhere safe
      </label>

      <div className="ac-sec-form-actions" style={{ marginTop: 16 }}>
        <button
          type="button"
          className="ac-field-save-btn"
          onClick={onDone}
          disabled={!acknowledged}
        >
          Done
        </button>
      </div>
    </div>
  );
}
