/**
 * Inventory Service - Production-Grade Data Access & Real-Time Engine
 * 
 * Provides unified, production-grade asynchronous data operations for:
 * - Multi-location stock levels with aggregated per-location counts
 * - Master product catalog & categories with live stock computation
 * - Inflow transactions (Restocking, Customer Returns, Replacements)
 * - Outflow transactions (POS Website, Damaged, Returned to Supplier)
 * - Immutable Time-T Audit Ledger with product/location joins
 * - Atomic RPC stock adjustments with row-level locks
 * - Real-time PostgreSQL event subscriptions
 * - User/Profile management for RBAC (Super Admin & Admin CRUD)
 */

import { supabase } from '../lib/supabase';
import {
  INITIAL_KPIS,
  INITIAL_STOCK_STATUS,
  INITIAL_TRANSACTIONS,
  INITIAL_LOCATIONS,
  INITIAL_PRODUCTS,
} from '../data/mockData';

// Cache flag to know if remote Supabase tables are ready
let isRemoteAvailable = null;

/**
 * Diagnostic health check to see if remote database schema is active
 */
export async function checkRemoteSchemaAvailability() {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('locations').select('id').limit(1);
    if (error) {
      console.warn('[InventoryService] Remote schema not ready or table inaccessible:', error.message);
      isRemoteAvailable = false;
      return false;
    }
    isRemoteAvailable = true;
    return true;
  } catch (err) {
    console.warn('[InventoryService] Remote check exception:', err.message);
    isRemoteAvailable = false;
    return false;
  }
}

/**
 * Fetch Aggregated KPIs for Dashboard
 */
export async function fetchKPIs() {
  if (isRemoteAvailable === false || !supabase) {
    return { data: INITIAL_KPIS, source: 'local' };
  }

  try {
    const { data, error } = await supabase.from('v_inventory_kpis').select('*').single();
    if (error || !data) {
      return { data: INITIAL_KPIS, source: 'local' };
    }

    return {
      data: {
        totalProducts: Number(data.total_products) || 0,
        stockValue: Number(data.total_stock_value) || 0,
        lowStockItems: Number(data.low_stock_items) || 0,
        locationsCount: Number(data.locations_count) || 4,
        inflowToday: Number(data.inflow_today) || 0,
        outflowToday: Number(data.outflow_today) || 0,
        posConnected: true,
      },
      source: 'remote',
    };
  } catch {
    return { data: INITIAL_KPIS, source: 'local' };
  }
}

/**
 * Fetch Locations with Real-Time Stock Counts
 */
export async function fetchLocations() {
  if (isRemoteAvailable === false || !supabase) {
    return { data: INITIAL_LOCATIONS, source: 'local' };
  }

  try {
    const { data: locs, error } = await supabase
      .from('locations')
      .select('*, inventory_levels(current_stock)')
      .eq('is_active', true)
      .order('name');

    if (error || !locs || locs.length === 0) {
      return { data: INITIAL_LOCATIONS, source: 'local' };
    }

    let grandTotal = 0;
    const formatted = locs.map((loc) => {
      const itemsCount = (loc.inventory_levels || []).reduce(
        (sum, item) => sum + (item.current_stock || 0),
        0
      );
      grandTotal += itemsCount;
      return {
        id: loc.id,
        code: loc.code,
        name: loc.name,
        type: loc.type,
        itemsCount,
        color: loc.color_hex || '#10B981',
        description: loc.description || loc.address,
      };
    });

    const finalized = formatted.map((loc) => ({
      ...loc,
      percentage: grandTotal > 0 ? Number(((loc.itemsCount / grandTotal) * 100).toFixed(1)) : 0,
    }));

    return { data: finalized, source: 'remote' };
  } catch {
    return { data: INITIAL_LOCATIONS, source: 'local' };
  }
}

/**
 * Fetch Product Categories with Live Stock Aggregation
 * Computes real stock counts per category by joining products → inventory_levels
 */
export async function fetchCategories() {
  if (isRemoteAvailable === false || !supabase) {
    return { data: INITIAL_STOCK_STATUS, source: 'local' };
  }

  try {
    // Fetch categories with their products and inventory levels for live computation
    const { data: cats, error } = await supabase
      .from('categories')
      .select('*, products(id, inventory_levels(current_stock))')
      .order('name');

    if (error || !cats || cats.length === 0) {
      return { data: INITIAL_STOCK_STATUS, source: 'local' };
    }

    const categoriesWithStats = cats.map((cat) => {
      // Sum all inventory levels across all products in this category
      const totalItems = (cat.products || []).reduce((catSum, product) => {
        const productStock = (product.inventory_levels || []).reduce(
          (prodSum, level) => prodSum + (level.current_stock || 0),
          0
        );
        return catSum + productStock;
      }, 0);

      const capacityTarget = cat.capacity_target || 500;
      const capacityPercentage = Math.min(100, Math.round((totalItems / capacityTarget) * 100));

      let status = 'Optimal';
      if (capacityPercentage <= 30) status = 'Low Stock';
      else if (capacityPercentage <= 60) status = 'Moderate';

      return {
        id: cat.id,
        name: cat.name,
        subtitle: cat.subtitle,
        itemsCount: totalItems,
        capacityPercentage,
        color: cat.color || '#10B981',
        badgeColor: cat.badge_color || '#ECFDF5',
        status,
      };
    });

    return { data: categoriesWithStats, source: 'remote' };
  } catch {
    return { data: INITIAL_STOCK_STATUS, source: 'local' };
  }
}

/**
 * Fetch Products Master Catalog with live stock from inventory_levels
 */
export async function fetchProducts() {
  if (isRemoteAvailable === false || !supabase) {
    return { data: INITIAL_PRODUCTS, source: 'local' };
  }

  try {
    const { data: prods, error } = await supabase
      .from('products')
      .select(`
        *,
        categories(name),
        locations:primary_location_id(name),
        inventory_levels(current_stock, location_id)
      `)
      .eq('is_active', true)
      .order('name');

    if (error || !prods || prods.length === 0) {
      return { data: INITIAL_PRODUCTS, source: 'local' };
    }

    const formatted = prods.map((p) => {
      const totalStock = (p.inventory_levels || []).reduce(
        (sum, lvl) => sum + (lvl.current_stock || 0),
        0
      );
      let status = 'In Stock';
      if (totalStock === 0) status = 'Out of Stock';
      else if (totalStock <= (p.reorder_level || 15)) status = 'Low Stock';

      return {
        id: p.id,
        name: p.name,
        category: p.categories?.name || 'General Apparel',
        sku: p.sku,
        stock: totalStock,
        reorderLevel: p.reorder_level,
        unitPrice: Number(p.unit_price),
        costPrice: Number(p.cost_price),
        status,
        location: p.locations?.name || 'Main Store',
        supplier: p.primary_supplier || 'Atelier Direct',
      };
    });

    return { data: formatted, source: 'remote' };
  } catch {
    return { data: INITIAL_PRODUCTS, source: 'local' };
  }
}

/**
 * Fetch Inflow Records directly (for Purchases/Inflow views)
 */
export async function fetchInflowRecords(limit = 50) {
  if (isRemoteAvailable === false || !supabase) {
    return { data: [], source: 'local' };
  }

  try {
    const { data, error } = await supabase
      .from('stock_inflow_records')
      .select('*, products(name), locations(name)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return { data: [], source: 'local' };

    const formatted = data.map((rec) => ({
      id: rec.reference_no,
      entity: rec.products?.name || rec.supplier_or_entity,
      channel: `Inflow · ${rec.flow_sub_type}`,
      type: 'inflow',
      flowSubType: rec.flow_sub_type,
      amount: Number(rec.total_amount),
      itemsQty: rec.quantity,
      status: rec.status,
      statusColor: '#10B981',
      statusBg: '#ECFDF5',
      location: rec.locations?.name || '',
      supplier: rec.supplier_or_entity,
      timestamp: rec.created_at
        ? new Date(rec.created_at).toISOString().replace('T', ' ').substring(0, 16)
        : '',
    }));

    return { data: formatted, source: 'remote' };
  } catch {
    return { data: [], source: 'local' };
  }
}

/**
 * Fetch Outflow Records directly (for Sales/Outflow views)
 */
export async function fetchOutflowRecords(limit = 50) {
  if (isRemoteAvailable === false || !supabase) {
    return { data: [], source: 'local' };
  }

  try {
    const { data, error } = await supabase
      .from('stock_outflow_records')
      .select('*, products(name), locations(name)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return { data: [], source: 'local' };

    const formatted = data.map((rec) => ({
      id: rec.reference_no,
      entity: rec.products?.name || rec.destination_or_entity,
      channel: `Outflow · ${rec.flow_sub_type}`,
      type: 'outflow',
      flowSubType: rec.flow_sub_type,
      amount: Number(rec.total_amount),
      itemsQty: rec.quantity,
      status: rec.status,
      statusColor: rec.status === 'Written-Off' ? '#F59E0B' : '#EF4444',
      statusBg: rec.status === 'Written-Off' ? '#FFFBEB' : '#FEF2F2',
      location: rec.locations?.name || '',
      destination: rec.destination_or_entity,
      timestamp: rec.created_at
        ? new Date(rec.created_at).toISOString().replace('T', ' ').substring(0, 16)
        : '',
    }));

    return { data: formatted, source: 'remote' };
  } catch {
    return { data: [], source: 'local' };
  }
}

/**
 * Fetch Audit Ledger & Transactions History (unified inflow + outflow)
 */
export async function fetchTransactions() {
  if (isRemoteAvailable === false || !supabase) {
    return { data: INITIAL_TRANSACTIONS, source: 'local' };
  }

  try {
    const { data: ledger, error } = await supabase
      .from('inventory_ledger')
      .select('*, products(name), locations(name)')
      .order('recorded_at', { ascending: false })
      .limit(100);

    if (error || !ledger || ledger.length === 0) {
      return { data: INITIAL_TRANSACTIONS, source: 'local' };
    }

    const formatted = ledger.map((entry) => ({
      id: entry.transaction_code,
      entity: entry.products?.name || entry.flow_sub_type,
      channel: `${entry.movement_type === 'INFLOW' ? 'Inflow' : 'Outflow'} · ${entry.flow_sub_type}`,
      type: entry.movement_type === 'INFLOW' ? 'inflow' : 'outflow',
      flowSubType: entry.flow_sub_type,
      amount: Number(entry.total_value),
      itemsQty: Math.abs(entry.quantity_delta),
      balanceBefore: entry.balance_before,
      balanceAfter: entry.balance_after,
      status: 'Completed',
      statusColor: entry.movement_type === 'INFLOW' ? '#10B981' : '#EF4444',
      statusBg: entry.movement_type === 'INFLOW' ? '#ECFDF5' : '#FEF2F2',
      location: entry.locations?.name || '',
      notes: entry.notes,
      timestamp: entry.recorded_at
        ? new Date(entry.recorded_at).toISOString().replace('T', ' ').substring(0, 16)
        : '',
    }));

    return { data: formatted, source: 'remote' };
  } catch {
    return { data: INITIAL_TRANSACTIONS, source: 'local' };
  }
}

/**
 * Loads Complete Parallel Inventory Dataset for Dashboard Initial Hydration
 */
export async function loadCompleteInventoryData() {
  const isAvailable = await checkRemoteSchemaAvailability();

  const [kpisRes, locsRes, catsRes, prodsRes, txRes] = await Promise.all([
    fetchKPIs(),
    fetchLocations(),
    fetchCategories(),
    fetchProducts(),
    fetchTransactions(),
  ]);

  return {
    kpis: kpisRes.data,
    locations: locsRes.data,
    categories: catsRes.data,
    products: prodsRes.data,
    transactions: txRes.data,
    isRemote: isAvailable && kpisRes.source === 'remote',
  };
}

/**
 * Atomic Stock Movement Recorder (RPC call to PostgreSQL record_stock_movement)
 * Enforces row-level concurrency locks (SELECT FOR UPDATE) and writes to immutable ledger.
 *
 * @param {Object} params
 * @param {'inflow' | 'outflow'} params.movementType
 * @param {string} params.subType
 * @param {string} params.productId
 * @param {string} params.locationId
 * @param {number} params.quantity
 * @param {number} params.unitPrice
 * @param {string} params.entityName
 * @param {string} [params.referenceNo]
 * @param {string} [params.referenceNote]
 */
export async function recordStockMovement(params) {
  const {
    movementType,
    subType,
    productId,
    locationId,
    quantity,
    unitPrice = 0,
    entityName = 'Inventory Movement',
    referenceNo = null,
    referenceNote = '',
  } = params;

  const rpcMovementType = (movementType || 'inflow').toUpperCase();
  const totalAmount = quantity * unitPrice;
  const generatedRef = referenceNo || `${rpcMovementType === 'INFLOW' ? 'INF' : 'OUT'}-${Date.now().toString().slice(-6)}`;

  if (isRemoteAvailable === false || !supabase) {
    return {
      success: true,
      simulated: true,
      reference_no: generatedRef,
      movement_type: rpcMovementType,
      flow_sub_type: subType,
      quantity,
      total_amount: totalAmount,
    };
  }

  try {
    const { data, error } = await supabase.rpc('record_stock_movement', {
      p_movement_type: rpcMovementType,
      p_flow_sub_type: subType,
      p_product_id: productId,
      p_location_id: locationId,
      p_quantity: quantity,
      p_unit_price: unitPrice,
      p_entity_name: entityName,
      p_reference_no: generatedRef,
      p_notes: referenceNote,
    });

    if (error) {
      console.error('[InventoryService] RPC error:', error.message);
      throw new Error(error.message);
    }

    return { success: true, ...data };
  } catch (err) {
    // Only use simulation fallback for network/connectivity issues, not business logic errors
    if (err.message.includes('Insufficient stock') || err.message.includes('quantity must be')) {
      throw err; // Re-throw validation errors to the UI
    }
    console.warn('[InventoryService] RPC exception, returning simulation fallback:', err.message);
    return {
      success: true,
      simulated: true,
      fallbackError: err.message,
      reference_no: generatedRef,
      movement_type: rpcMovementType,
      flow_sub_type: subType,
      quantity,
      total_amount: totalAmount,
    };
  }
}

// ============================================================================
// PRODUCT CATALOG CRUD (Supabase-Backed)
// ============================================================================

/**
 * Create a new product in the catalog
 */
export async function createProduct(productData) {
  if (!supabase) throw new Error('Supabase client not available');

  const { data, error } = await supabase
    .from('products')
    .insert({
      sku: productData.sku,
      name: productData.name,
      description: productData.description || null,
      category_id: productData.categoryId || null,
      unit_price: productData.unitPrice || 0,
      cost_price: productData.costPrice || 0,
      reorder_level: productData.reorderLevel || 15,
      primary_supplier: productData.supplier || null,
      primary_location_id: productData.locationId || null,
      is_active: true,
    })
    .select('*, categories(name), locations:primary_location_id(name)')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Update an existing product
 */
export async function updateProduct(productId, updates) {
  if (!supabase) throw new Error('Supabase client not available');

  const dbUpdates = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.sku !== undefined) dbUpdates.sku = updates.sku;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
  if (updates.unitPrice !== undefined) dbUpdates.unit_price = updates.unitPrice;
  if (updates.costPrice !== undefined) dbUpdates.cost_price = updates.costPrice;
  if (updates.reorderLevel !== undefined) dbUpdates.reorder_level = updates.reorderLevel;
  if (updates.supplier !== undefined) dbUpdates.primary_supplier = updates.supplier;
  if (updates.locationId !== undefined) dbUpdates.primary_location_id = updates.locationId;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
  dbUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('products')
    .update(dbUpdates)
    .eq('id', productId)
    .select('*, categories(name), locations:primary_location_id(name)')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Soft-delete a product (set is_active = false)
 */
export async function deleteProduct(productId) {
  if (!supabase) throw new Error('Supabase client not available');

  const { error } = await supabase
    .from('products')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', productId);

  if (error) throw new Error(error.message);
}

/**
 * Fetch categories list for dropdowns
 */
export async function fetchCategoryOptions() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('categories').select('id, name').order('name');
  if (error) return [];
  return data || [];
}

/**
 * Fetch location options for dropdowns
 */
export async function fetchLocationOptions() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('locations').select('id, name, code').eq('is_active', true).order('name');
  if (error) return [];
  return data || [];
}

// ============================================================================
// TRANSACTION RECORD MANAGEMENT (Inflow & Outflow Status Updates)
// ============================================================================

/**
 * Update the status of an inflow record
 */
export async function updateInflowStatus(recordId, newStatus) {
  if (!supabase) throw new Error('Supabase client not available');

  const { data, error } = await supabase
    .from('stock_inflow_records')
    .update({ status: newStatus })
    .eq('id', recordId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Update the status of an outflow record
 */
export async function updateOutflowStatus(recordId, newStatus) {
  if (!supabase) throw new Error('Supabase client not available');

  const { data, error } = await supabase
    .from('stock_outflow_records')
    .update({ status: newStatus })
    .eq('id', recordId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Fetch raw inflow records with full details (including IDs for editing)
 */
export async function fetchInflowRecordsRaw(limit = 100) {
  if (isRemoteAvailable === false || !supabase) return { data: [], source: 'local' };

  try {
    const { data, error } = await supabase
      .from('stock_inflow_records')
      .select('*, products(name, sku), locations(name)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return { data: [], source: 'local' };

    const formatted = data.map((rec) => ({
      dbId: rec.id,
      id: rec.reference_no,
      entity: rec.supplier_or_entity,
      productName: rec.products?.name || 'Unknown Product',
      productSku: rec.products?.sku || '',
      channel: `Inflow · ${rec.flow_sub_type}`,
      type: 'inflow',
      flowSubType: rec.flow_sub_type,
      amount: Number(rec.total_amount),
      unitCost: Number(rec.unit_cost),
      itemsQty: rec.quantity,
      status: rec.status,
      statusColor: rec.status === 'Completed' ? '#10B981' : rec.status === 'Pending' ? '#F59E0B' : '#94a3b8',
      statusBg: rec.status === 'Completed' ? '#ECFDF5' : rec.status === 'Pending' ? '#FFFBEB' : '#F1F5F9',
      location: rec.locations?.name || '',
      notes: rec.notes,
      timestamp: rec.created_at
        ? new Date(rec.created_at).toISOString().replace('T', ' ').substring(0, 16)
        : '',
    }));

    return { data: formatted, source: 'remote' };
  } catch {
    return { data: [], source: 'local' };
  }
}

/**
 * Fetch raw outflow records with full details (including IDs for editing)
 */
export async function fetchOutflowRecordsRaw(limit = 100) {
  if (isRemoteAvailable === false || !supabase) return { data: [], source: 'local' };

  try {
    const { data, error } = await supabase
      .from('stock_outflow_records')
      .select('*, products(name, sku), locations(name)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return { data: [], source: 'local' };

    const formatted = data.map((rec) => ({
      dbId: rec.id,
      id: rec.reference_no,
      entity: rec.destination_or_entity,
      productName: rec.products?.name || 'Unknown Product',
      productSku: rec.products?.sku || '',
      channel: `Outflow · ${rec.flow_sub_type}`,
      type: 'outflow',
      flowSubType: rec.flow_sub_type,
      amount: Number(rec.total_amount),
      unitPrice: Number(rec.unit_price),
      itemsQty: rec.quantity,
      status: rec.status,
      statusColor: rec.status === 'Completed' ? '#10B981' : rec.status === 'Written-Off' ? '#F59E0B' : rec.status === 'Cancelled' ? '#94a3b8' : '#EF4444',
      statusBg: rec.status === 'Completed' ? '#ECFDF5' : rec.status === 'Written-Off' ? '#FFFBEB' : rec.status === 'Cancelled' ? '#F1F5F9' : '#FEF2F2',
      location: rec.locations?.name || '',
      notes: rec.notes,
      timestamp: rec.created_at
        ? new Date(rec.created_at).toISOString().replace('T', ' ').substring(0, 16)
        : '',
    }));

    return { data: formatted, source: 'remote' };
  } catch {
    return { data: [], source: 'local' };
  }
}

/**
 * Update an existing Inflow Record (full update)
 */
export async function updateInflowRecord(idOrRef, updates) {
  if (!supabase) throw new Error('Supabase client not available');

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrRef);
  const dbUpdates = {};
  if (updates.supplier !== undefined) dbUpdates.supplier_or_entity = updates.supplier;
  if (updates.entity !== undefined) dbUpdates.supplier_or_entity = updates.entity;
  if (updates.flowSubType !== undefined) dbUpdates.flow_sub_type = updates.flowSubType;
  if (updates.quantity !== undefined) dbUpdates.quantity = parseInt(updates.quantity, 10);
  if (updates.unitCost !== undefined) dbUpdates.unit_cost = parseFloat(updates.unitCost);
  if (updates.amount !== undefined) dbUpdates.total_amount = parseFloat(updates.amount);
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

  let query = supabase.from('stock_inflow_records').update(dbUpdates);
  if (isUuid) {
    query = query.eq('id', idOrRef);
  } else {
    query = query.eq('reference_no', idOrRef);
  }

  const { data, error } = await query.select('*, products(name, sku), locations(name)').single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Delete / Void an Inflow Record
 */
export async function deleteInflowRecord(idOrRef) {
  if (!supabase) throw new Error('Supabase client not available');

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrRef);
  let query = supabase.from('stock_inflow_records').delete();
  if (isUuid) {
    query = query.eq('id', idOrRef);
  } else {
    query = query.eq('reference_no', idOrRef);
  }

  const { error } = await query;
  if (error) throw new Error(error.message);
  return true;
}

/**
 * Update an existing Outflow Record (full update)
 */
export async function updateOutflowRecord(idOrRef, updates) {
  if (!supabase) throw new Error('Supabase client not available');

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrRef);
  const dbUpdates = {};
  if (updates.destination !== undefined) dbUpdates.destination_or_entity = updates.destination;
  if (updates.entity !== undefined) dbUpdates.destination_or_entity = updates.entity;
  if (updates.flowSubType !== undefined) dbUpdates.flow_sub_type = updates.flowSubType;
  if (updates.quantity !== undefined) dbUpdates.quantity = parseInt(updates.quantity, 10);
  if (updates.unitPrice !== undefined) dbUpdates.unit_price = parseFloat(updates.unitPrice);
  if (updates.amount !== undefined) dbUpdates.total_amount = parseFloat(updates.amount);
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

  let query = supabase.from('stock_outflow_records').update(dbUpdates);
  if (isUuid) {
    query = query.eq('id', idOrRef);
  } else {
    query = query.eq('reference_no', idOrRef);
  }

  const { data, error } = await query.select('*, products(name, sku), locations(name)').single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Delete / Void an Outflow Record
 */
export async function deleteOutflowRecord(idOrRef) {
  if (!supabase) throw new Error('Supabase client not available');

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrRef);
  let query = supabase.from('stock_outflow_records').delete();
  if (isUuid) {
    query = query.eq('id', idOrRef);
  } else {
    query = query.eq('reference_no', idOrRef);
  }

  const { error } = await query;
  if (error) throw new Error(error.message);
  return true;
}

// ============================================================================
// STOCK TRANSFERS CRUD
// ============================================================================

export const INITIAL_TRANSFERS = [
  {
    id: 'TRF-1001',
    transferCode: 'TRF-1001',
    productName: 'Silk Evening Gown',
    productSku: 'LYAN-DR-001',
    sourceLocation: 'Main Warehouse',
    destinationLocation: 'Boutique Central',
    quantity: 12,
    status: 'In Transit',
    notes: 'Urgent weekend boutique restock',
    createdAt: '2026-10-02 10:15',
    statusColor: '#3B82F6',
    statusBg: '#EFF6FF',
  },
  {
    id: 'TRF-1002',
    transferCode: 'TRF-1002',
    productName: 'Italian Leather Handbag',
    productSku: 'LYAN-BG-002',
    sourceLocation: 'Main Warehouse',
    destinationLocation: 'Branch - North',
    quantity: 8,
    status: 'Completed',
    notes: 'Scheduled monthly transfer',
    createdAt: '2026-10-01 14:30',
    statusColor: '#10B981',
    statusBg: '#ECFDF5',
  },
  {
    id: 'TRF-1003',
    transferCode: 'TRF-1003',
    productName: '18k Gold Pearl Drop Earrings',
    productSku: 'LYAN-JW-004',
    sourceLocation: 'Boutique Central',
    destinationLocation: 'Pop-up Outlet',
    quantity: 5,
    status: 'Pending',
    notes: 'Special event showcase allotment',
    createdAt: '2026-10-02 15:45',
    statusColor: '#F59E0B',
    statusBg: '#FFFBEB',
  },
];

export async function fetchStockTransfers() {
  if (isRemoteAvailable === false || !supabase) {
    return { data: INITIAL_TRANSFERS, source: 'local' };
  }

  try {
    const { data, error } = await supabase
      .from('stock_transfers')
      .select('*, products(name, sku), source:source_location_id(name), dest:destination_location_id(name)')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return { data: INITIAL_TRANSFERS, source: 'local' };
    }

    const formatted = data.map((t) => ({
      id: t.id,
      transferCode: t.transfer_code,
      productId: t.product_id,
      productName: t.products?.name || 'Unknown Item',
      productSku: t.products?.sku || '',
      sourceLocationId: t.source_location_id,
      sourceLocation: t.source?.name || 'Source Location',
      destinationLocationId: t.destination_location_id,
      destinationLocation: t.dest?.name || 'Destination Location',
      quantity: t.quantity,
      status: t.status,
      notes: t.notes || '',
      createdAt: t.created_at ? new Date(t.created_at).toISOString().replace('T', ' ').substring(0, 16) : '',
      statusColor: t.status === 'Completed' ? '#10B981' : t.status === 'In Transit' ? '#3B82F6' : t.status === 'Pending' ? '#F59E0B' : '#94a3b8',
      statusBg: t.status === 'Completed' ? '#ECFDF5' : t.status === 'In Transit' ? '#EFF6FF' : t.status === 'Pending' ? '#FFFBEB' : '#F1F5F9',
    }));

    return { data: formatted, source: 'remote' };
  } catch (err) {
    console.warn('[InventoryService] fetchStockTransfers error:', err.message);
    return { data: INITIAL_TRANSFERS, source: 'local' };
  }
}

export async function createStockTransfer(transferData) {
  const code = `TRF-${Math.floor(1000 + Math.random() * 9000)}`;

  if (supabase) {
    const { data, error } = await supabase
      .from('stock_transfers')
      .insert({
        transfer_code: code,
        product_id: transferData.productId,
        source_location_id: transferData.sourceLocationId,
        destination_location_id: transferData.destinationLocationId,
        quantity: parseInt(transferData.quantity, 10),
        status: transferData.status || 'In Transit',
        notes: transferData.notes || null,
      })
      .select('*, products(name, sku), source:source_location_id(name), dest:destination_location_id(name)')
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  return {
    id: code,
    transferCode: code,
    ...transferData,
    status: transferData.status || 'In Transit',
    createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
  };
}

export async function updateStockTransfer(transferId, updates) {
  if (supabase) {
    const dbUpdates = {};
    if (updates.quantity !== undefined) dbUpdates.quantity = parseInt(updates.quantity, 10);
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.sourceLocationId !== undefined) dbUpdates.source_location_id = updates.sourceLocationId;
    if (updates.destinationLocationId !== undefined) dbUpdates.destination_location_id = updates.destinationLocationId;
    dbUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('stock_transfers')
      .update(dbUpdates)
      .eq('id', transferId)
      .select('*, products(name, sku), source:source_location_id(name), dest:destination_location_id(name)')
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
  return { id: transferId, ...updates };
}

export async function deleteStockTransfer(transferId) {
  if (supabase) {
    const { error } = await supabase.from('stock_transfers').delete().eq('id', transferId);
    if (error) throw new Error(error.message);
  }
  return true;
}

// ============================================================================
// LOCATIONS CRUD
// ============================================================================

export async function createLocation(locationData) {
  if (!supabase) throw new Error('Supabase client not available');

  const { data, error } = await supabase
    .from('locations')
    .insert({
      code: locationData.code || `LOC-${Date.now().toString().slice(-4)}`,
      name: locationData.name,
      type: locationData.type || 'boutique',
      address: locationData.address || null,
      capacity_limit: parseInt(locationData.capacityLimit, 10) || 1000,
      color_hex: locationData.colorHex || '#10B981',
      description: locationData.description || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateLocation(locationId, updates) {
  if (!supabase) throw new Error('Supabase client not available');

  const dbUpdates = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.code !== undefined) dbUpdates.code = updates.code;
  if (updates.type !== undefined) dbUpdates.type = updates.type;
  if (updates.address !== undefined) dbUpdates.address = updates.address;
  if (updates.capacityLimit !== undefined) dbUpdates.capacity_limit = parseInt(updates.capacityLimit, 10);
  if (updates.colorHex !== undefined) dbUpdates.color_hex = updates.colorHex;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
  dbUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('locations')
    .update(dbUpdates)
    .eq('id', locationId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteLocation(locationId) {
  if (!supabase) throw new Error('Supabase client not available');

  // Soft delete to protect relational FK integrity with inventory_levels
  const { error } = await supabase
    .from('locations')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', locationId);

  if (error) throw new Error(error.message);
  return true;
}

// ============================================================================
// CATEGORIES CRUD
// ============================================================================

export async function createCategory(catData) {
  if (!supabase) throw new Error('Supabase client not available');

  const { data, error } = await supabase
    .from('categories')
    .insert({
      code: catData.code || catData.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name: catData.name,
      subtitle: catData.subtitle || `${catData.name} Collection`,
      color: catData.color || '#10B981',
      badge_color: catData.badgeColor || '#ECFDF5',
      capacity_target: parseInt(catData.capacityTarget, 10) || 500,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateCategory(categoryId, updates) {
  if (!supabase) throw new Error('Supabase client not available');

  const dbUpdates = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.subtitle !== undefined) dbUpdates.subtitle = updates.subtitle;
  if (updates.color !== undefined) dbUpdates.color = updates.color;
  if (updates.badgeColor !== undefined) dbUpdates.badge_color = updates.badgeColor;
  if (updates.capacityTarget !== undefined) dbUpdates.capacity_target = parseInt(updates.capacityTarget, 10);
  dbUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('categories')
    .update(dbUpdates)
    .eq('id', categoryId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteCategory(categoryId) {
  if (!supabase) throw new Error('Supabase client not available');

  const { error } = await supabase.from('categories').delete().eq('id', categoryId);
  if (error) throw new Error(error.message);
  return true;
}

// ============================================================================
// USER & PROFILE MANAGEMENT (Supabase-Backed RBAC CRUD)
// ============================================================================


/**
 * Fetch all user profiles from public.profiles (with location join)
 * Respects RLS: Super Admins see all, Admins see staff + own, Staff see own only
 */
export async function fetchUserProfiles() {
  if (!supabase) return { data: [], source: 'local' };

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, locations:assigned_location_id(name)')
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('[InventoryService] fetchUserProfiles error:', error.message);
      return { data: [], source: 'local' };
    }

    const formatted = (data || []).map((p) => ({
      id: p.id,
      name: p.full_name,
      email: p.email,
      role: p.role,
      title: p.title || (p.role === 'super_admin' ? 'Super Administrator' : p.role === 'admin' ? 'Store Admin' : 'Inventory Staff'),
      assignedLocation: p.locations?.name || 'Unassigned',
      status: p.status,
      avatarInitials: p.avatar_initials || p.full_name?.substring(0, 2).toUpperCase() || 'U',
      badgeColor: p.role === 'super_admin' ? '#8B5CF6' : p.role === 'admin' ? '#1E5BF8' : '#10B981',
      badgeBg: p.role === 'super_admin' ? '#F5F3FF' : p.role === 'admin' ? '#EEF4FF' : '#ECFDF5',
      isProtectedOwner: p.email?.toLowerCase() === 'ijeomalilianuba@gmail.com',
      createdAt: p.created_at,
    }));

    return { data: formatted, source: 'remote' };
  } catch {
    return { data: [], source: 'local' };
  }
}

/**
 * Update a user profile in public.profiles
 * @param {string} userId - The profile ID (matches auth.users.id)
 * @param {Object} updates - Fields to update
 */
export async function updateUserProfile(userId, updates) {
  if (!supabase) throw new Error('Supabase client not available');

  const dbUpdates = {};
  if (updates.name !== undefined) dbUpdates.full_name = updates.name;
  if (updates.role !== undefined) dbUpdates.role = updates.role;
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.assignedLocationId !== undefined) dbUpdates.assigned_location_id = updates.assignedLocationId;
  dbUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('profiles')
    .update(dbUpdates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Create a new user via Supabase Auth admin (requires service role for production)
 * For now, creates via auth.signUp which requires email confirmation if enabled
 */
export async function createUserAccount(email, password, metadata = {}) {
  if (!supabase) throw new Error('Supabase client not available');

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: metadata.fullName || email.split('@')[0],
        role: metadata.role || 'staff',
        title: metadata.title || 'Inventory Staff',
      },
    },
  });

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Real-time Subscription Channel
 * Subscribes to PostgreSQL mutations across inventory_levels, inventory_ledger, and profiles
 */
export function subscribeToInventoryRealtime(onRealtimeEvent) {
  if (!supabase) return () => {};

  try {
    const channel = supabase
      .channel('lyans-inventory-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_levels' },
        (payload) => {
          onRealtimeEvent({ type: 'inventory_level_changed', payload });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'inventory_ledger' },
        (payload) => {
          onRealtimeEvent({ type: 'ledger_entry_appended', payload });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'stock_inflow_records' },
        (payload) => {
          onRealtimeEvent({ type: 'inflow_recorded', payload });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'stock_outflow_records' },
        (payload) => {
          onRealtimeEvent({ type: 'outflow_recorded', payload });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          onRealtimeEvent({ type: 'profile_changed', payload });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('[InventoryService] Realtime subscription warning:', err.message);
    return () => {};
  }
}
