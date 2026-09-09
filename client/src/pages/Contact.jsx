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
  FiCheck,
  FiArrowUpRight,
} from "react-icons/fi";
import Breadcrumb from "../components/common/Breadcrumb";
import Logo from "../components/common/Logo";
import Seo from "../components/seo/Seo";
import { PAGE_SEO } from "../config/seo";
import contactService from "../services/contactService";
import { useAuth } from "../context/AuthContext";
import "../styles/Contact.css";
import "../styles/Common.css";

/* ─── Contact Us ───
   Content is admin-editable via GET /api/contact. */

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

  const channels = [
    page?.email && {
      key: "email",
      href: `mailto:${page.email}`,
      icon: FiMail,
      label: "Email",
      value: page.email,
      external: false,
    },
    page?.phone && {
      key: "phone",
      href: `tel:${page.phone.replace(/\s+/g, "")}`,
      icon: FiPhone,
      label: "Call",
      value: page.phone,
      external: false,
    },
    page?.whatsapp && {
      key: "whatsapp",
      href: `https://wa.me/${page.whatsapp.replace(/[^\d]/g, "")}`,
      icon: FiMessageCircle,
      label: "WhatsApp",
      value: page.whatsapp,
      external: true,
      accent: true,
    },
  ].filter(Boolean);

  if (loading) {
    return (
      <div className="cnt-page">
        <Seo
          title={PAGE_SEO.contact.title}
          description={PAGE_SEO.contact.description}
          path={PAGE_SEO.contact.path}
        />
        <div className="cnt-crumb">
          <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "Contact Us" }]} />
        </div>
        <div className="cnt-loading">
          <div className="cm-spinner" />
          <p>Loading contact details…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cnt-page">
      <Seo
        title={PAGE_SEO.contact.title}
        description={PAGE_SEO.contact.description}
        path={PAGE_SEO.contact.path}
      />
      <div className="cnt-crumb">
        <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "Contact Us" }]} />
      </div>

      {/* Split desk: dark rail + form canvas */}
      <div className="cnt-desk">
        <aside className="cnt-rail">
          <div className="cnt-brand">
            <Logo size={48} />
          </div>
          <span className="cnt-eyebrow">Contact</span>
          <h1 className="cnt-rail-title">{page?.heading || "Get in touch"}</h1>
          {page?.subheading && <p className="cnt-rail-lead">{page.subheading}</p>}

          <div className="cnt-rail-channels">
            {channels.map((ch) => {
              const Icon = ch.icon;
              return (
                <a
                  key={ch.key}
                  href={ch.href}
                  className={`cnt-channel${ch.accent ? " cnt-channel--accent" : ""}`}
                  {...(ch.external
                    ? { target: "_blank", rel: "noreferrer" }
                    : {})}
                >
                  <span className="cnt-channel-icon" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <span className="cnt-channel-text">
                    <small>{ch.label}</small>
                    <strong>{ch.value}</strong>
                  </span>
                  <FiArrowUpRight className="cnt-channel-arrow" size={16} aria-hidden="true" />
                </a>
              );
            })}
          </div>

          {(page?.address || page?.city) && (
            <div className="cnt-rail-block">
              <div className="cnt-rail-block-label">
                <FiMapPin size={14} aria-hidden="true" /> Visit
              </div>
              <p>
                {page.address}
                {page.address && page.city ? <br /> : null}
                {page.city}
              </p>
            </div>
          )}

          {hours.length > 0 && (
            <div className="cnt-rail-block">
              <div className="cnt-rail-block-label">
                <FiClock size={14} aria-hidden="true" /> Hours
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
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="cnt-social"
                >
                  {s.label}
                </a>
              ))}
            </div>
          )}
        </aside>

        <section className="cnt-canvas" aria-labelledby="cnt-form-title">
          {page?.formEnabled === false ? (
            <div className="cnt-panel cnt-panel--center">
              <h2 id="cnt-form-title">Send us a message</h2>
              <p>
                Our message form is temporarily unavailable. Please reach us on
                the email or phone listed here.
              </p>
            </div>
          ) : sent ? (
            <div className="cnt-panel cnt-panel--center">
              <div className="cnt-sent-mark" aria-hidden="true">
                <FiCheck size={28} strokeWidth={2.5} />
              </div>
              <h2 id="cnt-form-title">Message sent</h2>
              <p>
                Thanks for reaching out —{" "}
                {page?.responseNote || "we'll reply as soon as we can."}
              </p>
              <button
                type="button"
                className="cnt-btn cnt-btn--ghost"
                onClick={() => setSent(false)}
              >
                Send another
              </button>
            </div>
          ) : (
            <form className="cnt-panel" onSubmit={handleSubmit} noValidate>
              <div className="cnt-panel-head">
                <h2 id="cnt-form-title">Write to us</h2>
                {page?.responseNote && <p>{page.responseNote}</p>}
              </div>

              <div className="cnt-fields">
                <div className="cnt-field">
                  <label htmlFor="cnt-name">Your name</label>
                  <input
                    id="cnt-name"
                    className={errors.name ? "cnt-error-field" : undefined}
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="e.g. Ayesha Khan"
                    autoComplete="name"
                  />
                  {errors.name && <span className="cnt-error">{errors.name}</span>}
                </div>

                <div className="cnt-field">
                  <label htmlFor="cnt-email">Email</label>
                  <input
                    id="cnt-email"
                    type="email"
                    className={errors.email ? "cnt-error-field" : undefined}
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                  {errors.email && <span className="cnt-error">{errors.email}</span>}
                </div>

                <div className="cnt-field cnt-field--full">
                  <label htmlFor="cnt-subject">
                    Subject <em>(optional)</em>
                  </label>
                  <input
                    id="cnt-subject"
                    value={form.subject}
                    onChange={(e) => handleChange("subject", e.target.value)}
                    placeholder="What is this about?"
                  />
                </div>

                <div className="cnt-field cnt-field--full">
                  <label htmlFor="cnt-message">Message</label>
                  <textarea
                    id="cnt-message"
                    rows={7}
                    className={errors.message ? "cnt-error-field" : undefined}
                    value={form.message}
                    onChange={(e) => handleChange("message", e.target.value)}
                    placeholder="Tell us how we can help…"
                  />
                  {errors.message && (
                    <span className="cnt-error">{errors.message}</span>
                  )}
                </div>
              </div>

              <button type="submit" className="cnt-btn cnt-btn--primary" disabled={sending}>
                <FiSend size={16} aria-hidden="true" />
                {sending ? "Sending…" : "Send message"}
              </button>
            </form>
          )}
        </section>
      </div>

      {page?.mapEmbedUrl && (
        <section className="cnt-map" aria-label="Our location on the map">
          <iframe
            title="Our location"
            src={page.mapEmbedUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </section>
      )}

      {faqs.length > 0 && (
        <section className="cnt-faq-wrap" aria-labelledby="cnt-faq-heading">
          <div className="cnt-faq-intro">
            <p className="cnt-faq-kicker">FAQ</p>
            <h2 id="cnt-faq-heading">Questions we hear often</h2>
          </div>
          <div className="cnt-faqs">
            {faqs.map((f, i) => (
              <div
                key={i}
                className={`cnt-faq${openFaq === i ? " cnt-faq--open" : ""}`}
              >
                <button
                  type="button"
                  className="cnt-faq-q"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  <span>{f.question}</span>
                  <FiChevronDown size={18} aria-hidden="true" />
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
