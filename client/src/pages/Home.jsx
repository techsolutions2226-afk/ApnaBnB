import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { FiArrowRight } from "react-icons/fi";
import { useProperties } from "../hooks/useProperties";
import PropertyCard from "../components/property/PropertyCard";
import Pagination from "../components/common/Pagination";
import { SkeletonCard } from "../components/ui/Skeleton";
import SearchPanel from "../components/cinematic/SearchPanel";
import Seo, { buildOrganizationJsonLd } from "../components/seo/Seo";
import { PAGE_SEO } from "../config/seo";
import "../styles/cinematic.css";
import "../styles/SearchFields.css";
import "../styles/SearchDropdowns.css";

const CTA_CARDS = [
  {
    href: "/sale",
    image:
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1000&q=80&auto=format&fit=crop",
    title: "Looking to buy?",
    text: "Find your dream home or next investment opportunity across Pakistan's premium locations.",
    cta: "Explore Properties",
  },
  {
    href: "/rent",
    image:
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1000&q=80&auto=format&fit=crop",
    title: "Looking to rent?",
    text: "Discover meticulously curated rentals, from chic city apartments to expansive family villas.",
    cta: "Find Rentals",
  },
];

const EASE = [0.22, 1, 0.36, 1];

const heroStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.08 } },
};

const revealUp = {
  hidden: { opacity: 0, y: 34 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export default function Home() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("buy");
  const [city, setCity] = useState("");
  const [location, setLocation] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [propertyTab, setPropertyTab] = useState("home");
  const [area, setArea] = useState("");
  const [maxArea, setMaxArea] = useState("");
  const [areaUnit, setAreaUnit] = useState("Marla");
  const [beds, setBeds] = useState(0);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [currency, setCurrency] = useState("PKR");
  const [openField, setOpenField] = useState(null);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const popularSectionRef = useRef(null);
  const ctaSectionRef = useRef(null);
  const prevPageRef = useRef(page);

  const reduce = useReducedMotion();
  const inView = reduce
    ? { initial: false, animate: "show" }
    : {
        initial: "hidden",
        whileInView: "show",
        viewport: { once: true, amount: 0.2 },
      };

  const { properties: allProps = [], isLoading: propsLoading, pagination } =
    useProperties({ page, limit: pageSize });
  const featuredProps = useMemo(
    () => (Array.isArray(allProps) ? allProps : []),
    [allProps],
  );

  /* Scroll the listing into view when the visitor jumps pages, so the lifted
     grid doesn't leave them staring at the banner. Only fires on an actual
     page change — comparing to the previous page means React StrictMode's
     double-invoked mount effects can never scroll on a fresh load, so the page
     always opens at the top. */
  useEffect(() => {
    if (prevPageRef.current === page) return;
    prevPageRef.current = page;
    popularSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page]);

  const submitSearch = (overrides = {}) => {
    const params = new URLSearchParams();
    const loc = location.trim();
    const dest =
      overrides.dest ??
      (loc && city ? `${loc}, ${city}` : loc || city || "");
    const type = overrides.propertyType ?? propertyType;
    const price = overrides.maxPrice ?? maxPrice;

    if (dest) params.set("dest", dest);
    if (type) params.set("propertyType", type);
    if (price) params.set("maxPrice", price);
    if (beds) params.set("bedrooms", beds);
    if (area) params.set("minArea", area);
    if (maxArea) params.set("maxArea", maxArea);
    if (minPrice) params.set("minPrice", minPrice);

    const base = (overrides.tab ?? tab) === "rent" ? "/rent" : "/sale";
    const q = params.toString();
    navigate(`${base}${q ? `?${q}` : ""}`);
  };

  const searchProps = {
    tab,
    setTab,
    city,
    setCity,
    location,
    setLocation,
    propertyType,
    setPropertyType,
    propertyTab,
    setPropertyTab,
    area,
    setArea,
    maxArea,
    setMaxArea,
    areaUnit,
    setAreaUnit,
    beds,
    setBeds,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    currency,
    setCurrency,
    openField,
    setOpenField,
    searchExpanded,
    setSearchExpanded,
    submitSearch,
  };

  return (
    <div className="min-h-screen">
      <Seo
        title={PAGE_SEO.home.title}
        description={PAGE_SEO.home.description}
        path={PAGE_SEO.home.path}
        jsonLd={buildOrganizationJsonLd()}
      />
      {/* ══ HERO BANNER (static image) — simple full-width banner with
          headline over an image. No scroll-driven behavior. ══ */}
      <section className="relative w-full min-h-[420px] sm:min-h-[520px] lg:min-h-[620px] overflow-x-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=2000&q=80&auto=format&fit=crop')",
          }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/30 to-transparent"
          aria-hidden="true"
        />
        <div className="relative z-[1] flex flex-col items-center justify-center text-center px-4 sm:px-6 py-12 min-h-[420px] sm:min-h-[520px] lg:min-h-[620px]">
          <motion.h1
            className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white font-heading text-wrap-balance"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            Discover Your Next <em className="not-italic text-indigo-300">Chapter</em>
          </motion.h1>
          <motion.p
            className="mt-4 max-w-xl text-white/90 text-base sm:text-lg"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
          >
            Find the property that fits your life — buy, rent or sell across
            Pakistan.
          </motion.p>
          <motion.div
            className="mt-6 w-full max-w-3xl px-1 sm:px-2"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
          >
            <SearchPanel {...searchProps} variant="card" />
          </motion.div>
        </div>
      </section>

      {/* ══ BUY / RENT CARDS ══ */}
      <motion.section
        ref={ctaSectionRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-2 sm:pt-14"
        variants={heroStagger}
        {...inView}
      >
        <div className="grid grid-cols-2 gap-3">
          {CTA_CARDS.map((card) => (
            <motion.button
              key={card.href}
              type="button"
              className="group relative aspect-[3/4] sm:aspect-[4/3] lg:aspect-[16/9] rounded-xl sm:rounded-2xl overflow-hidden text-left min-w-0"
              onClick={() => navigate(card.href)}
              variants={revealUp}
              whileHover={reduce ? undefined : { y: -4 }}
              transition={{ duration: 0.28, ease: EASE }}
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                style={{ backgroundImage: `url(${card.image})` }}
                aria-hidden="true"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-slate-900/10" aria-hidden="true" />
              <div className="relative h-full flex flex-col justify-end p-3 sm:p-6">
                <h3 className="text-sm sm:text-2xl font-bold text-white font-heading leading-tight mb-1 sm:mb-1.5">
                  {card.title}
                </h3>
                <p className="hidden sm:block text-sm text-slate-300 mb-3 line-clamp-2 max-w-xs">
                  {card.text}
                </p>
                <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-primary-400 group-hover:text-primary-300 transition-colors">
                  {card.cta}
                  <FiArrowRight className="h-3 w-3 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.section>

      {/* ══ POPULAR HOMES ══ */}
      <motion.section
        id="popular-homes"
        ref={popularSectionRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 scroll-mt-16"
        variants={revealUp}
        {...inView}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">
            Popular Homes
          </h2>
          <button
            onClick={() => navigate("/search")}
            className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
          >
            View all
          </button>
        </div>

        {propsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : featuredProps.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">No properties yet — be the first to list one.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {featuredProps.map((p) => (
                <PropertyCard
                  key={p._id || p.id}
                  _id={p._id}
                  id={p.id}
                  title={p.title}
                  photos={p.photos}
                  location={p.location}
                  price={p.price}
                  rating={p.rating || 4.5}
                  propertyType={p.propertyType}
                  size={p.size}
                  sizeUnit={p.sizeUnit}
                  listedBy={p.listedBy}
                  status={p.status}
                  purpose={p.purpose}
                />
              ))}
            </div>

            {pagination && pagination.pages > 1 && (
              <Pagination
                className="mt-8"
                currentPage={page}
                totalPages={pagination.pages}
                onPageChange={setPage}
                total={pagination.total}
                pageSize={pageSize}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
                pageSizeOptions={[8, 12, 16, 24]}
              />
            )}
          </>
        )}
      </motion.section>
    </div>
  );
}