import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  FiSearch,
  FiArrowRight,
  FiChevronDown,
  FiMapPin,
  FiHome,
  FiGrid,
  FiMap,
  FiBriefcase,
} from "react-icons/fi";
import { useProperties } from "../hooks/useProperties";
import PropertyCard from "../components/property/PropertyCard";
import {
  CITIES,
  PROPERTY_TABS,
  AREA_UNITS,
  CURRENCIES,
} from "../config/searchOptions";
import SearchableList from "../components/search/dropdowns/SearchableList";
import TabbedGrid from "../components/search/dropdowns/TabbedGrid";
import RangeInputWithUnit from "../components/search/dropdowns/RangeInputWithUnit";
import BedCountPanel from "../components/search/dropdowns/BedCountPanel";
import { SkeletonCard } from "../components/ui/Skeleton";
import "../styles/SearchFields.css";
import "../styles/SearchDropdowns.css";

const HERO_IMG =
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1800&q=80&auto=format&fit=crop";

const CATEGORY_PILLS = [
  { label: "Villas", value: "house", icon: FiHome },
  { label: "Apartments", value: "flat", icon: FiGrid },
  { label: "Plots", value: "plot", icon: FiMap },
  { label: "Commercial", value: "commercial", icon: FiBriefcase },
];

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

const CITY_OPTIONS = CITIES.map((c) => ({ value: c, label: c }));
const AREA_UNIT_OPTIONS = AREA_UNITS.map((u) => ({ value: u, label: u }));
const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c, label: c }));

const TABS = [
  { id: "buy", label: "BUY" },
  { id: "rent", label: "RENT" },
];

const EASE = [0.22, 1, 0.36, 1];

const heroStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.08 } },
};

const heroItem = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } },
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

  const reduce = useReducedMotion();
  const anim = reduce
    ? { initial: false, animate: "show" }
    : { initial: "hidden", animate: "show" };
  const inView = reduce
    ? { initial: false, animate: "show" }
    : {
        initial: "hidden",
        whileInView: "show",
        viewport: { once: true, amount: 0.2 },
      };

  const { properties: allProps = [], isLoading: propsLoading } = useProperties();
  const featuredProps = useMemo(
    () => (Array.isArray(allProps) ? allProps : []),
    [allProps]
  );

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

  const preventFormSubmit = (e) => e.preventDefault();

  return (
    <div className="min-h-screen">
      {/* ══ HERO ══ */}
      <section className="relative min-h-[520px] sm:min-h-[580px] lg:min-h-[640px] flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_IMG})` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/50 to-slate-900/80" aria-hidden="true" />

        {/* Content */}
        <motion.div
          className="relative z-10 w-full max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center"
          variants={heroStagger}
          {...anim}
        >
          <motion.h1
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white font-heading tracking-tight leading-tight mb-4"
            variants={heroItem}
          >
            Discover Your Next
            <span className="block text-primary-400">Chapter</span>
          </motion.h1>

          <motion.p
            className="text-base sm:text-lg text-slate-300 mb-8 max-w-xl mx-auto"
            variants={heroItem}
          >
            Find your perfect property across Pakistan's most trusted platform
          </motion.p>

          {/* BUY / RENT Toggle */}
          <motion.div
            className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full p-1 mb-6"
            variants={heroItem}
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`relative px-6 py-2 text-sm font-semibold rounded-full transition-colors duration-200 ${
                  tab === t.id
                    ? "text-slate-900"
                    : "text-white/70 hover:text-white"
                }`}
                aria-pressed={tab === t.id}
                onClick={() => setTab(t.id)}
              >
                {tab === t.id && (
                  <motion.span
                    layoutId="home-toggle"
                    className="absolute inset-0 bg-white rounded-full"
                    aria-hidden="true"
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 420, damping: 34 }
                    }
                  />
                )}
                <span className="relative z-10">{t.label}</span>
              </button>
            ))}
          </motion.div>

          {/* Search Panel — white card centered in the hero */}
          <motion.form
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-auto"
            onSubmit={preventFormSubmit}
            variants={heroItem}
            layout={!reduce}
            transition={{ duration: 0.4, ease: EASE }}
          >
            {/* ── Collapsed row: City + Location + Search ── */}
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5 sm:gap-3 p-3 sm:p-4">
              <div className="flex-1 min-w-0">
                <SearchableList
                  options={CITY_OPTIONS}
                  value={city}
                  onChange={setCity}
                  placeholder="City"
                  icon={FiMapPin}
                  open={openField === "city"}
                  onOpenChange={(o) => setOpenField(o ? "city" : null)}
                />
              </div>

              {searchExpanded ? (
                <div className="flex-1 min-w-0">
                  <div className="relative h-full">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                      <FiSearch className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      className="abn-s2-field w-full !h-full !rounded-xl pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400"
                      placeholder="Search by Location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    className="abn-s2-field w-full !rounded-xl flex items-center gap-2 px-3.5 text-sm text-slate-500 text-left"
                    onClick={() => setSearchExpanded(true)}
                  >
                    <FiSearch className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="flex-1 truncate">{location || "Search by Location"}</span>
                    <FiChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                  </button>
                </div>
              )}

              {!searchExpanded && (
                <button
                  type="button"
                  onClick={() => submitSearch()}
                  className="h-12 px-7 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 active:bg-primary-800 transition-colors shadow-sm shrink-0 whitespace-nowrap"
                >
                  Search
                </button>
              )}
            </div>

            {/* ── Advanced row: Property Type | Area | Beds | Price | Search ── */}
            <AnimatePresence initial={false}>
              {searchExpanded && (
                <motion.div
                  key="advanced"
                  initial={reduce ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduce ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.34, ease: EASE }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3 sm:px-4 sm:pb-4 pt-0">
                    <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3 items-end">
                      <div className="lg:col-span-1">
                        <TabbedGrid
                          tabs={PROPERTY_TABS}
                          value={propertyType}
                          activeTab={propertyTab}
                          onTabChange={setPropertyTab}
                          onChange={(val, tabId) => {
                            setPropertyType(val);
                            setPropertyTab(tabId);
                          }}
                          open={openField === "propertyType"}
                          onOpenChange={(o) => setOpenField(o ? "propertyType" : null)}
                        />
                      </div>

                      <div className="lg:col-span-1">
                        <RangeInputWithUnit
                          title="Area"
                          unit={areaUnit}
                          changeLabel="Area Unit"
                          modalTitle="Change Area"
                          unitOptions={AREA_UNIT_OPTIONS}
                          min={area}
                          max={maxArea}
                          onChange={({ min, max }) => {
                            setArea(min);
                            setMaxArea(max);
                          }}
                          onUnitChange={setAreaUnit}
                          open={openField === "area"}
                          onOpenChange={(o) => setOpenField(o ? "area" : null)}
                        />
                      </div>

                      <div className="lg:col-span-1">
                        <BedCountPanel
                          value={beds}
                          onChange={setBeds}
                          open={openField === "beds"}
                          onOpenChange={(o) => setOpenField(o ? "beds" : null)}
                        />
                      </div>

                      <div className="lg:col-span-1">
                        <RangeInputWithUnit
                          title="Price"
                          unit={currency}
                          changeLabel="Currency"
                          modalTitle="Change Currency"
                          unitOptions={CURRENCY_OPTIONS}
                          min={minPrice}
                          max={maxPrice}
                          onChange={({ min, max }) => {
                            setMinPrice(min);
                            setMaxPrice(max);
                          }}
                          onUnitChange={setCurrency}
                          open={openField === "price"}
                          onOpenChange={(o) => setOpenField(o ? "price" : null)}
                        />
                      </div>

                      <div className="lg:col-span-1">
                        <button
                          type="button"
                          onClick={() => submitSearch()}
                          className="w-full h-12 px-6 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 active:bg-primary-800 transition-colors shadow-sm"
                        >
                          Search
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.form>

          {/* Category Pills */}
          <motion.div className="flex flex-wrap justify-center gap-2 mt-6" variants={heroItem}>
            {CATEGORY_PILLS.map((c) => {
              const Icon = c.icon;
              return (
                <motion.button
                  key={c.label}
                  type="button"
                  className="inline-flex items-center gap-1.5 h-10 px-4 text-sm font-medium text-white/90 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full hover:bg-white/20 hover:border-white/30 transition-all duration-200"
                  onClick={() => submitSearch({ propertyType: c.value })}
                  whileHover={reduce ? undefined : { y: -2 }}
                  whileTap={reduce ? undefined : { scale: 0.97 }}
                  transition={{ duration: 0.2, ease: EASE }}
                >
                  <Icon size={14} />
                  <span>{c.label}</span>
                </motion.button>
              );
            })}
          </motion.div>
        </motion.div>
      </section>

      {/* ══ BUY / RENT CTA CARDS — normal flow below hero ══ */}
      <motion.section
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10"
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
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16"
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
        )}
      </motion.section>
    </div>
  );
}
