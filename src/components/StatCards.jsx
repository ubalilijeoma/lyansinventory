import React from 'react';
import {
  CubeIcon,
  BanknoteIcon,
  AlertTriangleIcon,
  MapPinIcon
} from './Icons';

export default function StatCards({ kpis }) {
  const cards = [
    {
      id: 'total-products',
      label: 'Total Products',
      value: kpis.totalProducts.toLocaleString(),
      icon: CubeIcon,
      iconColor: '#64748B',
      iconBg: '#F1F5F9',
      subtext: `+${kpis.inflowToday} in / -${kpis.outflowToday} out today`,
      subtextColor: '#10B981'
    },
    {
      id: 'stock-value',
      label: 'Stock Value',
      value: `$${kpis.stockValue.toLocaleString()}`,
      icon: BanknoteIcon,
      iconColor: '#10B981',
      iconBg: '#ECFDF5',
      subtext: 'Real-time retail asset valuation',
      subtextColor: '#64748B'
    },
    {
      id: 'low-stock-items',
      label: 'Low Stock Items',
      value: kpis.lowStockItems,
      icon: AlertTriangleIcon,
      iconColor: '#F59E0B',
      iconBg: '#FEF3C7',
      subtext: 'Items below threshold limit',
      subtextColor: '#D97706'
    },
    {
      id: 'locations',
      label: 'Locations',
      value: kpis.locationsCount,
      icon: MapPinIcon,
      iconColor: '#2563EB',
      iconBg: '#EFF6FF',
      subtext: 'Boutiques & Warehouse nodes',
      subtextColor: '#2563EB'
    },
  ];

  return (
    <section className="stats-grid" aria-label="Key Performance Indicators">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.id} className="stat-card">
            <div className="stat-content">
              <span className="stat-label">{card.label}</span>
              <h3 className="stat-value">{card.value}</h3>
              <p className="stat-subtext" style={{ color: card.subtextColor }}>
                {card.subtext}
              </p>
            </div>
            <div
              className="stat-icon-wrapper"
              style={{ backgroundColor: card.iconBg, color: card.iconColor }}
            >
              <Icon size={26} />
            </div>
          </div>
        );
      })}
    </section>
  );
}
