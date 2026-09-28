// Mock Data & Domain Engine for Lyans Woman Inventory Hub

export const INITIAL_KPIS = {
  totalProducts: 1246,
  stockValue: 128760,
  lowStockItems: 28,
  locationsCount: 4,
  inflowToday: 142,
  outflowToday: 98,
  posConnected: true,
};

// Stock Status Categories matching the reference screenshot
export const INITIAL_STOCK_STATUS = [
  {
    id: 'cat-1',
    name: 'Electronics / Apparel',
    subtitle: 'Women\'s Dresses, Silks & Outerwear',
    itemsCount: 320,
    capacityPercentage: 85,
    color: '#10B981', // green
    badgeColor: '#ECFDF5',
    status: 'Optimal'
  },
  {
    id: 'cat-2',
    name: 'Groceries / Bags & Leather',
    subtitle: 'Luxury Handbags & Clutches',
    itemsCount: 450,
    capacityPercentage: 70,
    color: '#10B981', // green
    badgeColor: '#ECFDF5',
    status: 'Optimal'
  },
  {
    id: 'cat-3',
    name: 'Household / Footwear',
    subtitle: 'Designer Heels, Flats & Boots',
    itemsCount: 210,
    capacityPercentage: 45,
    color: '#F59E0B', // amber/yellow
    badgeColor: '#FFFBEB',
    status: 'Moderate'
  },
  {
    id: 'cat-4',
    name: 'Accessories / Jewelry',
    subtitle: 'Fine Gems, Watches & Fragrances',
    itemsCount: 180,
    capacityPercentage: 20,
    color: '#EF4444', // red
    badgeColor: '#FEF2F2',
    status: 'Low Stock'
  }
];

// Recent Purchases & Real-Time Stock Flow Transactions
export const INITIAL_TRANSACTIONS = [
  {
    id: 'SUP-001',
    entity: 'Metro Supplies',
    channel: 'Inflow · Restocking',
    type: 'inflow',
    flowSubType: 'Restocking',
    amount: 2450,
    itemsQty: 48,
    status: 'Completed',
    statusColor: '#10B981',
    statusBg: '#ECFDF5',
    timestamp: '2026-09-22 15:42'
  },
  {
    id: 'SUP-002',
    entity: 'Daily Goods Co.',
    channel: 'Inflow · Restocking',
    type: 'inflow',
    flowSubType: 'Restocking',
    amount: 1870,
    itemsQty: 35,
    status: 'Completed',
    statusColor: '#10B981',
    statusBg: '#ECFDF5',
    timestamp: '2026-09-22 14:15'
  },
  {
    id: 'SUP-003',
    entity: 'Prime Distributors',
    channel: 'Inflow · Restocking',
    type: 'inflow',
    flowSubType: 'Restocking',
    amount: 3120,
    itemsQty: 60,
    status: 'Pending',
    statusColor: '#F59E0B',
    statusBg: '#FFFBEB',
    timestamp: '2026-09-22 13:00'
  },
  {
    id: 'SUP-004',
    entity: 'Home Essentials',
    channel: 'Inflow · Restocking',
    type: 'inflow',
    flowSubType: 'Restocking',
    amount: 980,
    itemsQty: 22,
    status: 'Completed',
    statusColor: '#10B981',
    statusBg: '#ECFDF5',
    timestamp: '2026-09-22 11:20'
  },
  {
    id: 'POS-8921',
    entity: 'Lyans POS Online Store',
    channel: 'Outflow · POS Website',
    type: 'outflow',
    flowSubType: 'POS Website',
    amount: 540,
    itemsQty: 4,
    status: 'Completed',
    statusColor: '#10B981',
    statusBg: '#ECFDF5',
    timestamp: '2026-09-22 10:45'
  },
  {
    id: 'RET-044',
    entity: 'Customer Return #440',
    channel: 'Inflow · Customer Return',
    type: 'inflow',
    flowSubType: 'Returning',
    amount: 210,
    itemsQty: 2,
    status: 'Completed',
    statusColor: '#10B981',
    statusBg: '#ECFDF5',
    timestamp: '2026-09-22 09:30'
  },
  {
    id: 'DAM-019',
    entity: 'Boutique Shelf Audit',
    channel: 'Outflow · Damaged Goods',
    type: 'outflow',
    flowSubType: 'Damaged',
    amount: 145,
    itemsQty: 1,
    status: 'Written-Off',
    statusColor: '#EF4444',
    statusBg: '#FEF2F2',
    timestamp: '2026-09-22 08:50'
  },
  {
    id: 'RTV-008',
    entity: 'Atelier Supplier Return',
    channel: 'Outflow · Return to Supplier',
    type: 'outflow',
    flowSubType: 'Returned to Supplier',
    amount: 720,
    itemsQty: 6,
    status: 'Completed',
    statusColor: '#10B981',
    statusBg: '#ECFDF5',
    timestamp: '2026-09-21 17:10'
  }
];

// Stock by Location (Exact values matching donut chart total: 620 + 310 + 210 + 106 = 1,246)
export const INITIAL_LOCATIONS = [
  {
    id: 'loc-1',
    name: 'Main Store',
    itemsCount: 620,
    percentage: 49.8,
    color: '#10B981', // green
    description: 'Flagship Lyans Boutique (Ground Floor)'
  },
  {
    id: 'loc-2',
    name: 'Branch - North',
    itemsCount: 310,
    percentage: 24.9,
    color: '#2563EB', // blue
    description: 'Uptown Galleria Outlet'
  },
  {
    id: 'loc-3',
    name: 'Branch - South',
    itemsCount: 210,
    percentage: 16.8,
    color: '#F59E0B', // yellow/amber
    description: 'Westfield Fashion Mall'
  },
  {
    id: 'loc-4',
    name: 'Warehouse',
    itemsCount: 106,
    percentage: 8.5,
    color: '#EF4444', // red/coral
    description: 'Central Fulfillment & Quarantine Depo'
  }
];

// Product catalog for Lyans Woman
export const INITIAL_PRODUCTS = [
  {
    id: 'LW-DR-01',
    name: 'Silk Slip Evening Gown',
    category: 'Electronics / Apparel',
    sku: 'LYAN-DR-902',
    stock: 45,
    reorderLevel: 15,
    unitPrice: 280,
    status: 'In Stock',
    location: 'Main Store',
    supplier: 'Metro Supplies'
  },
  {
    id: 'LW-BG-02',
    name: 'Croc-Embossed Leather Tote',
    category: 'Groceries / Bags & Leather',
    sku: 'LYAN-BG-411',
    stock: 62,
    reorderLevel: 20,
    unitPrice: 340,
    status: 'In Stock',
    location: 'Main Store',
    supplier: 'Daily Goods Co.'
  },
  {
    id: 'LW-SH-03',
    name: 'Pointed Satin Stiletto Pumps',
    category: 'Household / Footwear',
    sku: 'LYAN-SH-708',
    stock: 18,
    reorderLevel: 25,
    unitPrice: 195,
    status: 'Low Stock',
    location: 'Branch - North',
    supplier: 'Prime Distributors'
  },
  {
    id: 'LW-JW-04',
    name: '18k Gold Pearl Drop Earrings',
    category: 'Accessories / Jewelry',
    sku: 'LYAN-JW-105',
    stock: 9,
    reorderLevel: 15,
    unitPrice: 150,
    status: 'Low Stock',
    location: 'Branch - South',
    supplier: 'Home Essentials'
  },
  {
    id: 'LW-DR-05',
    name: 'Cashmere Knit Wrap Cardigan',
    category: 'Electronics / Apparel',
    sku: 'LYAN-DR-332',
    stock: 84,
    reorderLevel: 20,
    unitPrice: 220,
    status: 'In Stock',
    location: 'Warehouse',
    supplier: 'Metro Supplies'
  },
  {
    id: 'LW-BG-06',
    name: 'Quilted Velvet Mini Shoulder Bag',
    category: 'Groceries / Bags & Leather',
    sku: 'LYAN-BG-880',
    stock: 35,
    reorderLevel: 15,
    unitPrice: 210,
    status: 'In Stock',
    location: 'Main Store',
    supplier: 'Daily Goods Co.'
  },
  {
    id: 'LW-JW-07',
    name: 'Midnight Rose Eau de Parfum (100ml)',
    category: 'Accessories / Jewelry',
    sku: 'LYAN-PF-551',
    stock: 6,
    reorderLevel: 12,
    unitPrice: 135,
    status: 'Critical Stock',
    location: 'Main Store',
    supplier: 'Prime Distributors'
  }
];

// Inflow & Outflow event taxonomy for the interactive movement modal
export const MOVEMENT_TYPES = {
  inflow: [
    { value: 'Restocking', label: 'Restocking (Supplier Batch / PO)', description: 'Receiving new inventory shipments from suppliers' },
    { value: 'Returning', label: 'Customer Return (Verified Undamaged)', description: 'Return merchandise authorized back into stock' },
    { value: 'Replacing', label: 'Item Replacement (Vendor Exchange)', description: 'Replacement unit received for defective item' },
  ],
  outflow: [
    { value: 'POS Website', label: 'POS Website Order (Online/Store Checkout)', description: 'Automatic deduction upon sale via POS platform' },
    { value: 'Damaged', label: 'Damaged / Write-Off', description: 'Defective, spoiled or broken stock removed from inventory' },
    { value: 'Returned to Supplier', label: 'Returned to Supplier (RTV)', description: 'Defective or recalled items shipped back to vendor' },
  ]
};
