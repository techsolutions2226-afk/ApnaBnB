import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  FiMail,
  FiPhone,
  FiMapPin,
  FiClock,
  FiSend,
  FiMessageCircle,
  FiChevronDown,
} from "react-icons/fi";
import Breadcrumb from "../components/common/Breadcrumb";
import contactService from "../services/contactService";
import { useAuth } from "../context/AuthContext";
import "../styles/Contact.css";

/* ─── Contact Us ───
   Content is admin-editable: everything below the form comes from
   GET /api/contact, which admins manage at /admin/contact. The page renders
   whatever is filled in and quietly skips whatever isn't. */

const EMPTY_FORM = { name: "", email: "", subject: "", message: "" };

const Contact = () => {
  const { currentUser } = useAuth();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    let cancelled = false;
    contactService
      .get()
      .then((data) => {
        if (!cancelled) setPage(data);
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load contact details.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* Prefill from the signed-in account so members don't retype it. */
  useEffect(() => {
    if (!currentUser) return;
    setForm((prev) => ({
      ...prev,
      name: prev.name || currentUser.name || "",
      email: prev.email || currentUser.email || "",
    }));
  }, [currentUser]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Please tell us your name";
    if (!form.email.trim()) next.email = "We need an email to reply to";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      next.email = "That email doesn't look right";
    if (!form.message.trim()) next.message = "Please write your message";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSending(true);
    try {
      await contactService.sendMessage({
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
      });
      setSent(true);
      setForm(EMPTY_FORM);
      toast.success("Message sent — we'll be in touch.");
    } catch (err) {
      toast.error(err?.message || "Could not send your message.");
    } finally {
      setSending(false);
    }
  };

  const hours = Array.isArray(page?.officeHours) ? page.officeHours : [];
  const socials = (Array.isArray(page?.socials) ? page.socials : []).filter(
    (s) => s?.url,
  );
  const faqs = Array.isArray(page?.faqs) ? page.faqs : [];

  if (loading) {
    return (
      <div className="cnt-page">
        <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "Contact Us" }]} />
        <div className="cnt-loading">
          <div className="auth-spinner" />
          <p>Loading contact details…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cnt-page">
      <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "Contact Us" }]} />

      {/* ── Hero ── */}
      <section className="cnt-hero">
        <h1 className="cnt-hero-title">{page?.heading || "Get in touch"}</h1>
        {page?.subheading && <p className="cnt-hero-sub">{page.subheading}</p>}
      </section>

      <div className="cnt-layout">
        {/* ── Details column ── */}
        <aside className="cnt-details">
          {page?.email && (
            <a href={`mailto:${page.email}`} className="cnt-card cnt-card--link">
              <span className="cnt-card-icon"><FiMail size={18} /></span>
              <div>
                <div className="cnt-card-label">Email us</div>
                <div className="cnt-card-value">{page.email}</div>
              </div>
            </a>
          )}

          {page?.phone && (
            <a href={`tel:${page.phone.replace(/\s+/g, "")}`} className="cnt-card cnt-card--link">
              <span className="cnt-card-icon"><FiPhone size={18} /></span>
              <div>
                <div className="cnt-card-label">Call us</div>
                <div className="cnt-card-value">{page.phone}</div>
              </div>
            </a>
          )}

          {page?.whatsapp && (
            <a
              href={`https://wa.me/${page.whatsapp.replace(/[^\d]/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="cnt-card cnt-card--link"
            >
              <span className="cnt-card-icon"><FiMessageCircle size={18} /></span>
              <div>
                <div className="cnt-card-label">WhatsApp</div>
                <div className="cnt-card-value">{page.whatsapp}</div>
              </div>
            </a>
          )}

          {(page?.address || page?.city) && (
            <div className="cnt-card">
              <span className="cnt-card-icon"><FiMapPin size={18} /></span>
              <div>
                <div className="cnt-card-label">Visit us</div>
                <div className="cnt-card-value">
                  {page.address}
                  {page.address && page.city ? <br /> : null}
                  {page.city}
                </div>
              </div>
            </div>
          )}

          {hours.length > 0 && (
            <div className="cnt-card cnt-card--block">
              <div className="cnt-card-head">
                <span className="cnt-card-icon"><FiClock size={18} /></span>
                <div className="cnt-card-label">Office hours</div>
              </div>
              <ul className="cnt-hours">
                {hours.map((h, i) => (
                  <li key={i}>
                    <span>{h.day}</span>
                    <strong>{h.time}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {socials.length > 0 && (
            <div className="cnt-socials">
              {socials.map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noreferrer" className="cnt-social">
                  {s.label}
                </a>
              ))}
            </div>
          )}
        </aside>

        {/* ── Form column ── */}
        <section className="cnt-form-wrap">
          {page?.formEnabled === false ? (
            <div className="cnt-form-off">
              <h2 className="cnt-form-title">Send us a message</h2>
              <p className="cnt-form-note">
                Our message form is temporarily unavailable. Please reach us on
                the email or phone number listed here and we'll get right back
                to you.
              </p>
            </div>
          ) : sent ? (
            <div className="cnt-sent">
              <div className="cnt-sent-tick">✓</div>
              <h2 className="cnt-form-title">Message sent</h2>
              <p className="cnt-form-note">
                Thanks for reaching out — {page?.responseNote || "we'll reply as soon as we can."}
              </p>
              <button
                type="button"
                className="cnt-btn cnt-btn--ghost"
                onClick={() => setSent(false)}
              >
                Send another message
              </button>
            </div>
          ) : (
            <form className="cnt-form" onSubmit={handleSubmit} noValidate>
              <h2 className="cnt-form-title">Send us a message</h2>
              {page?.responseNote && (
                <p className="cnt-form-note">{page.responseNote}</p>
              )}

              <div className="cnt-row">
                <div className="cnt-field">
                  <label className="cnt-label" htmlFor="cnt-name">Your name</label>
                  <input
                    id="cnt-name"
                    className={`cnt-input${errors.name ? " cnt-input--error" : ""}`}
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="e.g. Ayesha Khan"
                  />
                  {errors.name && <div className="cnt-error">{errors.name}</div>}
                </div>

                <div className="cnt-field">
                  <label className="cnt-label" htmlFor="cnt-email">Email address</label>
                  <input
                    id="cnt-email"
                    type="email"
                    className={`cnt-input${errors.email ? " cnt-input--error" : ""}`}
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="you@example.com"
                  />
                  {errors.email && <div className="cnt-error">{errors.email}</div>}
                </div>
              </div>

              <div className="cnt-field">
                <label className="cnt-label" htmlFor="cnt-subject">Subject</label>
                <input
                  id="cnt-subject"
                  className="cnt-input"
                  value={form.subject}
                  onChange={(e) => handleChange("subject", e.target.value)}
                  placeholder="What is this about?"
                />
              </div>

              <div className="cnt-field">
                <label className="cnt-label" htmlFor="cnt-message">Message</label>
                <textarea
                  id="cnt-message"
                  rows={7}
                  className={`cnt-textarea${errors.message ? " cnt-input--error" : ""}`}
                  value={form.message}
                  onChange={(e) => handleChange("message", e.target.value)}
                  placeholder="Tell us how we can help…"
                />
                {errors.message && <div className="cnt-error">{errors.message}</div>}
              </div>

              <button type="submit" className="cnt-btn cnt-btn--primary" disabled={sending}>
                <FiSend size={16} />
                {sending ? "Sending…" : "Send message"}
              </button>
            </form>
          )}
        </section>
      </div>

      {/* ── Map ── */}
      {page?.mapEmbedUrl && (
        <section className="cnt-map">
          <iframe
            title="Our location"
            src={page.mapEmbedUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </section>
      )}

      {/* ── FAQs ── */}
      {faqs.length > 0 && (
        <section className="cnt-faq-section">
          <h2 className="cnt-faq-heading">Frequently asked</h2>
          <div className="cnt-faqs">
            {faqs.map((f, i) => (
              <div key={i} className={`cnt-faq${openFaq === i ? " cnt-faq--open" : ""}`}>
                <button
                  type="button"
                  className="cnt-faq-q"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  <span>{f.question}</span>
                  <FiChevronDown size={18} className="cnt-faq-chev" />
                </button>
                {openFaq === i && <div className="cnt-faq-a">{f.answer}</div>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Contact;
