import { Link } from "react-router-dom";
import StatusBadge from "../../common/StatusBadge";
import RefreshButton from "../../common/RefreshButton";
import { FiExternalLink, FiHome, FiFileText } from "react-icons/fi";
import { fmtDate, formatBudget, formatPrice, locationLabel, titleCase } from "./userDetailUtils";

function Empty({ icon: Icon, label }) {
  return (
    <p className="adm-empty aud-empty">
      <Icon size={16} /> {label}
    </p>
  );
}

/** Listings & Requirements tab. */
export default function UserListingsTab({
  listings = [],
  requirements = [],
  onRefresh,
  refreshing,
}) {
  return (
    <div>
      <div className="aud-section-tools">
        <RefreshButton onRefresh={onRefresh} refreshing={refreshing} />
      </div>
      <div className="aud-listings">
      <section className="aud-panel">
        <div className="aud-panel-head">
          <h3 className="aud-panel-title">
            <FiHome size={16} /> Listings ({listings.length})
          </h3>
          <p className="aud-panel-sub">Properties posted for sale or rent.</p>
        </div>

        {listings.length === 0 ? (
          <Empty icon={FiHome} label="No listings yet." />
        ) : (
          <div className="aud-card-grid">
            {listings.map((listing) => {
              const prop = listing.property || {};
              const photo = prop.photos?.[0];
              const lid = listing.id || listing._id;
              const pid = prop.id || prop._id;
              return (
                <article className="aud-entity-card" key={lid}>
                  <div className="aud-entity-media">
                    {photo ? (
                      <img src={photo} alt="" />
                    ) : (
                      <div className="aud-entity-media-fallback">
                        <FiHome size={22} />
                      </div>
                    )}
                  </div>
                  <div className="aud-entity-body">
                    <div className="aud-entity-top">
                      <h4 className="aud-entity-title">{prop.title || "Untitled property"}</h4>
                      <StatusBadge status={listing.status} prefix="adm-badge" />
                    </div>
                    <p className="aud-entity-meta">
                      {titleCase(prop.purpose)} · {formatPrice(prop.price)}
                      {prop.category ? ` · ${titleCase(prop.category)}` : ""}
                    </p>
                    <p className="aud-entity-meta">{locationLabel(prop.location)}</p>
                    <p className="aud-entity-meta">
                      {listing.views ?? 0} views · {listing.inquiries ?? 0} inquiries · Posted{" "}
                      {fmtDate(listing.createdAt)}
                    </p>
                    <div className="aud-entity-links">
                      {pid && (
                        <Link to={`/listing/${pid}`} className="aud-inline-link" target="_blank">
                          View listing <FiExternalLink size={12} />
                        </Link>
                      )}
                      {lid && (
                        <Link to={`/admin/listings`} className="aud-inline-link">
                          Admin listings
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="aud-panel">
        <div className="aud-panel-head">
          <h3 className="aud-panel-title">
            <FiFileText size={16} /> Requirements ({requirements.length})
          </h3>
          <p className="aud-panel-sub">Buyer / dealer demand posts.</p>
        </div>

        {requirements.length === 0 ? (
          <Empty icon={FiFileText} label="No requirements yet." />
        ) : (
          <div className="aud-table-scroll">
            <table className="adm-table aud-mini-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Purpose</th>
                  <th>Type</th>
                  <th>Budget</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Posted</th>
                </tr>
              </thead>
              <tbody>
                {requirements.map((req) => {
                  const rid = req.id || req._id;
                  return (
                    <tr key={rid}>
                      <td>
                        <span className="aud-cell-strong">{req.title || "—"}</span>
                      </td>
                      <td>{titleCase(req.purpose)}</td>
                      <td>{titleCase(req.propertyType)}</td>
                      <td>{formatBudget(req.budget)}</td>
                      <td>{locationLabel(req.location)}</td>
                      <td>
                        <StatusBadge status={req.status} prefix="adm-badge" />
                      </td>
                      <td>{fmtDate(req.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      </div>
    </div>
  );
}
