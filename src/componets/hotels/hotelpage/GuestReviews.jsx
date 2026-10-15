import { useState, useEffect, useMemo, useCallback } from "react";
import PageLoader from "../../loaders/PageLoader";
import { reviewsService } from "../../../services/SupebaseReviewsService";
import {
  Person,
  FavoriteBorder,
  FamilyRestroom,
  Groups,
  BusinessCenter,
} from "@mui/icons-material";

const PAGE_STEP = 5;
const FETCH_LIMIT = 200;

const tone = (r) => (r >= 8 ? "green" : r >= 6 ? "amber" : "red");

const scoreLabel = (avg) =>
  avg >= 9 ? "Exceptional"
  : avg >= 8 ? "Very Good"
  : avg >= 7 ? "Good"
  : avg >= 6 ? "Pleasant"
  : avg >= 5 ? "Average"
  : "Poor";

const fmtScore = (r) => (Number.isInteger(r) ? String(r) : Number(r).toFixed(1));

const fmtDate = (ts) => {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
};

const parseTs = (dateStr) => Date.parse((dateStr || "").replace(" ", "T")) || 0;

const TRAVELLER_TYPES = [
  { key: "solo", title: "Solo", icon: Person, keywords: ["solo", "individual"] },
  { key: "couple", title: "Couple", icon: FavoriteBorder, keywords: ["couple"] },
  { key: "family", title: "Family", icon: FamilyRestroom, keywords: ["family", "children", "kids"] },
  { key: "friends", title: "Friends/Group", icon: Groups, keywords: ["friend", "group"] },
  { key: "business", title: "Business", icon: BusinessCenter, keywords: ["business", "work"] },
];

const GuestReviews = ({ sentiment, reviewCount, hotelId }) => {
  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("newest");
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await reviewsService.fetchReviews({ id: hotelId, limit: FETCH_LIMIT });
        if (isMounted) {
          const items = (res?.data || []).map((r) => ({ ...r, ts: parseTs(r.date) }));
          setReviews(items);
          setTotal(res?.total || items.length);
        }
      } catch {
        if (isMounted) {
          setReviews([]);
          setTotal(0);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    if (hotelId) load();
    return () => { isMounted = false; };
  }, [hotelId]);

  const handleSort = useCallback((e) => {
    setSort(e.target.value);
    setVisibleCount(PAGE_STEP);
  }, []);

  const handleMore = useCallback(() => {
    setVisibleCount((c) => c + PAGE_STEP);
  }, []);

  const sorted = useMemo(() => {
    const arr = [...reviews];
    if (sort === "oldest") arr.sort((a, b) => a.ts - b.ts);
    else if (sort === "score") arr.sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0));
    else arr.sort((a, b) => b.ts - a.ts);
    return arr;
  }, [reviews, sort]);

  const categories = useMemo(
    () => sentiment?.categories || [],
    [sentiment],
  );

  const avg = useMemo(() => {
    if (categories.length) {
      return categories.reduce((s, c) => s + (Number(c.rating) || 0), 0) / categories.length;
    }
    if (reviews.length) {
      return reviews.reduce((s, r) => s + (Number(r.averageScore) || 0), 0) / reviews.length;
    }
    return null;
  }, [categories, reviews]);

  const travellerStats = useMemo(() => {
    const counts = {};
    let totalTyped = 0;
    reviews.forEach((r) => {
      const t = (r.type || "").toLowerCase();
      const match = TRAVELLER_TYPES.find((x) => x.keywords.some((k) => t.includes(k)));
      if (match) {
        counts[match.key] = (counts[match.key] || 0) + 1;
        totalTyped += 1;
      }
    });
    if (!totalTyped) return [];
    return TRAVELLER_TYPES.filter((x) => counts[x.key])
      .map((x) => ({ ...x, pct: Math.round((counts[x.key] / totalTyped) * 100) }))
      .sort((a, b) => b.pct - a.pct);
  }, [reviews]);

  if (loading) {
    return (
      <section className="gr-block">
        <h2>Guest reviews</h2>
        <PageLoader embedded />
      </section>
    );
  }

  if (!reviews.length || avg === null) return null;

  const totalReviews = Number(reviewCount ?? total) || total;
  const shown = Math.min(visibleCount, sorted.length);
  const hasMore = shown < sorted.length;

  return (
    <section className="gr-block">
      <h2>Guest reviews</h2>

      <div className="gr-grid">
        <div className="gr-left">
          <div className="gr-score">
            <span className={`gr-badge gr-badge--${tone(avg)}`}>{Math.round(avg)}</span>
            <div className="gr-score-info">
              <strong>{scoreLabel(avg)}</strong>
              <span>Based on {totalReviews.toLocaleString("en-US")} reviews</span>
            </div>
          </div>

          {categories.length > 0 && (
            <div className="gr-group">
              <h3>Top comments from travellers</h3>
              <div className="gr-chips">
                {categories.map((c) => (
                  <span className="gr-chip" key={c.name}>
                    {c.name} ({fmtScore(Number(c.rating) || 0)})
                  </span>
                ))}
              </div>
            </div>
          )}

          {travellerStats.length > 0 && (
            <div className="gr-group">
              <h3>Who stays here</h3>
              <div className="gr-who">
                {travellerStats.map((t) => {
                  const Icon = t.icon;
                  return (
                    <div className="gr-who-item" key={t.key}>
                      <span className="gr-who-icon">
                        <Icon />
                      </span>
                      <span className="gr-who-label">{t.title}</span>
                      <strong className="gr-who-pct">{t.pct}%</strong>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="gr-right">
          <div className="gr-sort">
            <select value={sort} onChange={handleSort} aria-label="Sort reviews">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="score">Highest score</option>
            </select>
          </div>

          <div className="gr-list-box">
            <div className="gr-list">
              {sorted.slice(0, visibleCount).map((r, idx) => {
                const text = r.pros || r.headline || "";
                return (
                  <article className="gr-item" key={r.reviewId ?? `r-${idx}`}>
                    <div className="gr-item-main">
                      <div className="gr-item-who">
                        <strong>{r.name}</strong>
                        {r.type ? <span>&bull; {(r.type || "").replace(/_/g, " ")}</span> : null}
                      </div>
                      <time className="gr-item-date">{fmtDate(r.ts)}</time>
                      {text ? <p className="gr-item-text">{text}</p> : null}
                    </div>
                    <span className={`gr-item-score gr-item-score--${tone(r.averageScore || 0)}`}>
                      {fmtScore(r.averageScore || 0)}
                    </span>
                  </article>
                );
              })}
            </div>

            <div className="gr-list-foot">
              {hasMore && (
                <button type="button" className="gr-load" onClick={handleMore}>
                  Load more reviews
                </button>
              )}
              <span className="gr-showing">
                Showing {shown} of {totalReviews.toLocaleString("en-US")} reviews
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GuestReviews;
