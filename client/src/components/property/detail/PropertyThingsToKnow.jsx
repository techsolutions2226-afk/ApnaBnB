import { FaShieldAlt, FaDoorOpen, FaBan, FaRegClock } from "react-icons/fa";

export default function PropertyThingsToKnow({ houseRules, cancellationPolicy }) {
  return (
    <>
      <hr className="pd-divider" />
      <div className="pd-things-to-know">
        <h3 className="pd-section-heading">Things to know</h3>
        <div className="pd-ttk-grid">
          {houseRules && (
            <div className="pd-ttk-col">
              <h4 className="pd-ttk-col-title">Viewing rules</h4>
              <div className="pd-ttk-item">
                <FaRegClock size={16} />
                <span>Viewing: {houseRules.checkIn}</span>
              </div>
              <div className="pd-ttk-item">
                <FaDoorOpen size={16} />
                <span>Closing: {houseRules.checkOut}</span>
              </div>
              <div className="pd-ttk-item">
                <span className="pd-ttk-item-icon-text">i</span>
                <span>Buyer visits by appointment only</span>
              </div>
              {houseRules.rules.slice(0, 3).map((rule, i) => (
                <div key={i} className="pd-ttk-item">
                  <FaBan size={14} />
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          )}

          {houseRules?.safetyItems && (
            <div className="pd-ttk-col">
              <h4 className="pd-ttk-col-title">Safety & property</h4>
              {houseRules.safetyItems.map((item, i) => (
                <div key={i} className="pd-ttk-item">
                  <FaShieldAlt size={14} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}

          {cancellationPolicy && (
            <div className="pd-ttk-col">
              <h4 className="pd-ttk-col-title">Cancellation policy</h4>
              <p className="pd-ttk-policy-type">{cancellationPolicy.type}</p>
              <p className="pd-ttk-policy-desc">{cancellationPolicy.description}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
