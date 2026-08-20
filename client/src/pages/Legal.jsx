import { useParams, Link } from "react-router-dom";
import { useEffect } from "react";

/* Legal document pages (Terms, Payments, Nondiscrimination, Privacy).
   Linked from the signup terms notice and opened in a new tab. Content is a
   clearly-marked placeholder until the finalised documents are supplied — it
   intentionally does not present fabricated binding legal text. */

const DOCS = {
  terms: {
    title: "Terms of Service",
    intro:
      "These Terms of Service govern your use of ApnaBnB. The full document is being finalised.",
  },
  payments: {
    title: "Payments Terms of Service",
    intro:
      "These Payments Terms cover fees, payouts and refunds on ApnaBnB. The full document is being finalised.",
  },
  nondiscrimination: {
    title: "Nondiscrimination Policy",
    intro:
      "ApnaBnB is committed to a marketplace free of discrimination. The full policy is being finalised.",
  },
  privacy: {
    title: "Privacy Policy",
    intro:
      "This Privacy Policy explains what data ApnaBnB collects and how it is used. The full document is being finalised.",
  },
};

const Legal = () => {
  const { slug } = useParams();
  const doc = DOCS[slug];

  useEffect(() => {
    document.title = doc ? `${doc.title} — ApnaBnB` : "Not found — ApnaBnB";
  }, [doc]);

  if (!doc) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Document not found</h1>
        <p style={{ color: "#666", marginTop: 8 }}>
          The page you're looking for doesn't exist.
        </p>
        <Link to="/" style={{ color: "#134e2c", fontWeight: 700 }}>
          Return home
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>
        {doc.title}
      </h1>
      <p style={{ color: "#444", lineHeight: 1.6 }}>{doc.intro}</p>
      <p style={{ color: "#777", lineHeight: 1.6, marginTop: 16, fontSize: 14 }}>
        For questions in the meantime, contact us at{" "}
        <a href="mailto:support@apnabnb.com" style={{ color: "#134e2c", fontWeight: 600 }}>
          support@apnabnb.com
        </a>
        .
      </p>
      <Link
        to="/"
        style={{ display: "inline-block", marginTop: 24, color: "#134e2c", fontWeight: 700 }}
      >
        ← Back to ApnaBnB
      </Link>
    </div>
  );
};

export default Legal;
