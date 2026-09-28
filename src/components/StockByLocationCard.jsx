import React, { useState } from 'react';

export default function StockByLocationCard({ locations, totalStock = 1246 }) {
  const [hoveredLocationId, setHoveredLocationId] = useState(null);

  // SVG Donut Chart Geometry
  const size = 180;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2; // radius ~ 76
  const circumference = 2 * Math.PI * radius;

  // Compute dynamic offsets for each slice
  let accumulatedPercent = 0;
  const slices = locations.map((loc) => {
    const percent = totalStock > 0 ? loc.itemsCount / totalStock : 0;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    // SVG stroke-dashoffset starts from 12 o'clock (-90 deg rotation)
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += percent;

    return {
      ...loc,
      percent: (percent * 100).toFixed(1),
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeLoc = locations.find((l) => l.id === hoveredLocationId);

  return (
    <div className="card stock-by-location-card">
      <div className="card-header">
        <h3 className="card-title">Stock by Location</h3>
        <span className="card-badge-info">4 Active Nodes</span>
      </div>

      <div className="location-content-layout">
        {/* Left: Location Bars List */}
        <div className="location-list">
          {locations.map((loc) => {
            const isHovered = hoveredLocationId === loc.id;
            return (
              <div
                key={loc.id}
                className={`location-item-row ${isHovered ? 'highlighted' : ''}`}
                onMouseEnter={() => setHoveredLocationId(loc.id)}
                onMouseLeave={() => setHoveredLocationId(null)}
              >
                <div className="location-name-col">
                  <span
                    className="location-dot"
                    style={{ backgroundColor: loc.color }}
                  />
                  <span className="location-title">{loc.name}</span>
                </div>

                <div className="location-count-col">
                  <span className="location-items-text">{loc.itemsCount} items</span>
                </div>

                <div className="location-bar-col">
                  <div className="location-bar-track">
                    <div
                      className="location-bar-fill"
                      style={{
                        width: `${Math.min(100, (loc.itemsCount / 650) * 100)}%`,
                        backgroundColor: loc.color
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Modern SVG Donut Chart */}
        <div className="donut-chart-wrapper">
          <div className="donut-svg-container">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="donut-svg"
            >
              {/* Subtle background track */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke="#F1F5F9"
                strokeWidth={strokeWidth}
              />
              {/* Slices rotated -90 deg so slice starts at top */}
              <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
                {slices.map((slice) => {
                  const isHovered = hoveredLocationId === slice.id;
                  return (
                    <circle
                      key={slice.id}
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      fill="transparent"
                      stroke={slice.color}
                      strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                      strokeDasharray={slice.strokeDasharray}
                      strokeDashoffset={slice.strokeDashoffset}
                      strokeLinecap="butt"
                      className="donut-slice"
                      onMouseEnter={() => setHoveredLocationId(slice.id)}
                      onMouseLeave={() => setHoveredLocationId(null)}
                      style={{
                        cursor: 'pointer',
                        transition: 'stroke-width 0.2s ease, opacity 0.2s ease',
                        opacity: hoveredLocationId && !isHovered ? 0.6 : 1
                      }}
                    />
                  );
                })}
              </g>
            </svg>

            {/* Donut Center Text */}
            <div className="donut-center-info" aria-live="polite">
              <span className="donut-total-number">
                {activeLoc ? activeLoc.itemsCount.toLocaleString() : totalStock.toLocaleString()}
              </span>
              <span className="donut-total-label">
                {activeLoc ? activeLoc.name : 'Total'}
              </span>
              {activeLoc && (
                <span className="donut-hover-pct" style={{ color: activeLoc.color }}>
                  {activeLoc.percent || ((activeLoc.itemsCount / totalStock) * 100).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
