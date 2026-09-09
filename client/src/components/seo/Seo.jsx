import { useEffect } from "react";
import {
  absoluteUrl,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  pageTitle,
  SITE_NAME,
  TWITTER_HANDLE,
} from "../../config/seo";

const MANAGED = "data-apnabnb-seo";

function upsertMeta({ name, property, content }) {
  if (!content) return;
  const attr = name ? "name" : "property";
  const key = name || property;
  let el = document.head.querySelector(`meta[${attr}="${key}"][${MANAGED}]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    el.setAttribute(MANAGED, "1");
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel, href) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"][${MANAGED}]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    el.setAttribute(MANAGED, "1");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function upsertJsonLd(id, data) {
  const scriptId = `apnabnb-jsonld-${id}`;
  let el = document.getElementById(scriptId);
  if (!data) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = scriptId;
    el.setAttribute(MANAGED, "1");
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/**
 * Declarative per-route SEO. Renders nothing — updates <head> on mount/change.
 *
 * @param {object} props
 * @param {string} [props.title]
 * @param {string} [props.description]
 * @param {string} [props.path] pathname for canonical (e.g. /about)
 * @param {string} [props.image] absolute or site-relative OG image
 * @param {string} [props.type] og:type — website | article | product
 * @param {boolean} [props.noindex]
 * @param {object|object[]|null} [props.jsonLd] JSON-LD object(s)
 */
export default function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  image = DEFAULT_OG_IMAGE,
  type = "website",
  noindex = false,
  jsonLd = null,
}) {
  const jsonLdKey = jsonLd == null ? "" : JSON.stringify(jsonLd);

  useEffect(() => {
    const fullTitle = pageTitle(title);
    document.title = fullTitle;

    const canonical = absoluteUrl(path || window.location.pathname);
    const imageUrl = absoluteUrl(image);
    const parsedJsonLd = jsonLdKey ? JSON.parse(jsonLdKey) : null;

    upsertMeta({ name: "description", content: description });
    upsertMeta({
      name: "robots",
      content: noindex ? "noindex, nofollow" : "index, follow",
    });

    upsertMeta({ property: "og:site_name", content: SITE_NAME });
    upsertMeta({ property: "og:title", content: fullTitle });
    upsertMeta({ property: "og:description", content: description });
    upsertMeta({ property: "og:type", content: type });
    upsertMeta({ property: "og:url", content: canonical });
    upsertMeta({ property: "og:image", content: imageUrl });
    upsertMeta({ property: "og:locale", content: "en_PK" });

    upsertMeta({ name: "twitter:card", content: "summary_large_image" });
    upsertMeta({ name: "twitter:site", content: TWITTER_HANDLE });
    upsertMeta({ name: "twitter:title", content: fullTitle });
    upsertMeta({ name: "twitter:description", content: description });
    upsertMeta({ name: "twitter:image", content: imageUrl });

    upsertLink("canonical", canonical);

    if (Array.isArray(parsedJsonLd)) {
      parsedJsonLd.forEach((block, i) => upsertJsonLd(String(i), block));
    } else {
      upsertJsonLd("0", parsedJsonLd);
    }

    return () => {
      /* Leave tags in place for the next route — they get overwritten.
         Clear multi-slot JSON-LD beyond 0 when leaving detail pages. */
      for (let i = 1; i < 6; i += 1) {
        document.getElementById(`apnabnb-jsonld-${i}`)?.remove();
      }
    };
  }, [title, description, path, image, type, noindex, jsonLdKey]);

  return null;
}

/** Organization + WebSite schema for the homepage. */
export function buildOrganizationJsonLd() {
  const url = absoluteUrl("/");
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url,
      logo: absoluteUrl(DEFAULT_OG_IMAGE),
      description: DEFAULT_DESCRIPTION,
      areaServed: "PK",
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url,
      potentialAction: {
        "@type": "SearchAction",
        target: `${absoluteUrl("/search")}?dest={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ];
}

/** RealEstateListing / Product-style schema for a property page. */
export function buildPropertyJsonLd(property, path) {
  if (!property) return null;
  const loc = property.location;
  const locStr =
    typeof loc === "object" && loc
      ? [loc.area, loc.city].filter(Boolean).join(", ")
      : loc || "";
  const images = [
    ...(property.gallery || []),
    ...(property.photos || []),
  ].filter(Boolean);
  const purpose = property.purpose === "rent" ? "RentAction" : "BuyAction";

  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.title,
    description:
      (property.description || "").slice(0, 300) ||
      `${property.title} in ${locStr || "Pakistan"}`,
    url: absoluteUrl(path),
    image: images.length ? images.map((src) => absoluteUrl(src)) : undefined,
    datePosted: property.createdAt || undefined,
    offers: property.price
      ? {
          "@type": "Offer",
          price: property.price,
          priceCurrency: "PKR",
          availability: "https://schema.org/InStock",
          businessFunction: `https://schema.org/${purpose}`,
        }
      : undefined,
    address: locStr
      ? {
          "@type": "PostalAddress",
          addressLocality:
            typeof loc === "object" ? loc.city || locStr : locStr,
          addressRegion: typeof loc === "object" ? loc.area : undefined,
          addressCountry: "PK",
        }
      : undefined,
    numberOfRooms: property.bedrooms || undefined,
    floorSize:
      property.size != null
        ? {
            "@type": "QuantitativeValue",
            value: property.size,
            unitText: property.sizeUnit || "Marla",
          }
        : undefined,
  };
}
