import { useState } from "react";

const tone = (r) => (r >= 8 ? "green" : r >= 6 ? "amber" : "red");

const scoreLabel = (avg) =>
  avg >= 9 ? "Exceptional"
  : avg >= 8 ? "Very Good"
  : avg >= 7 ? "Good"
  : avg >= 6 ? "Pleasant"
  : avg >= 5 ? "Average"
  : "Poor";

const fmtRating = (r) => (Number.isInteger(r) ? String(r) : r.toFixed(1));

const SentimentBlock = ({ sentiment, reviewCount }) => {
  const [showDetails, setShowDetails] = useState(false);

  const categories = sentiment?.categories || [];
  const pros = sentiment?.pros || [];
  const cons = sentiment?.cons || [];

  if (!categories.length) return null;

  const avg =
    categories.reduce((sum, c) => sum + (Number(c.rating) || 0), 0) / categories.length;
  const score = avg.toFixed(1);
  const badgeTone = tone(avg);
  const label = scoreLabel(avg);

  return (
    <section className="sent-block">
      <div className="sent-head">
        <h2>Review highlights</h2>
      </div>

      <div className="sent-score">
        <span className={`sent-badge sent-badge--${badgeTone}`}>{Math.round(avg)}</span>
        <div className="sent-score-info">
          <strong>{label}</strong>
          {reviewCount ? <span>Based on {Number(reviewCount).toLocaleString("en-US")} reviews</span> : null}
        </div>
        <span className="sent-score-value">{score}</span>
      </div>

      {pros.length > 0 && (
        <div className="sent-group">
          <h3>What did guests like the most</h3>
          <div className="sent-chips">
            {pros.map((p, i) => (
              <span className="sent-chip sent-chip--pro" key={`pro-${i}`}>"{p}"</span>
            ))}
          </div>
        </div>
      )}

      {cons.length > 0 && (
        <div className="sent-group">
          <h3>What guests didn't like</h3>
          <div className="sent-chips">
            {cons.map((c, i) => (
              <span className="sent-chip sent-chip--con" key={`con-${i}`}>"{c}"</span>
            ))}
          </div>
        </div>
      )}

      <div className="sent-cat-head">
        <h3>Categories</h3>
        <button type="button" className="sent-details-link" onClick={() => setShowDetails((v) => !v)}>
          {showDetails ? "Hide details" : "Show details"}
        </button>
      </div>

      <div className="sent-grid">
        {categories.map((c) => {
          const r = Number(c.rating) || 0;
          return (
            <div className="sent-cat" key={c.name}>
              <div className="sent-cat-top">
                <span className="sent-cat-name">{c.name}</span>
                <span className="sent-cat-rating">{fmtRating(r)}</span>
              </div>
              <div className="sent-bar">
                <div
                  className={`sent-bar-fill sent-bar-fill--${tone(r)}`}
                  style={{ width: `${Math.max(0, Math.min(100, r * 10))}%` }}
                />
              </div>
              {showDetails && c.description && (
                <p className="sent-cat-desc">{c.description}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default SentimentBlock;
