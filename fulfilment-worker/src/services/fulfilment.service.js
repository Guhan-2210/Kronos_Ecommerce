import { InventoryModel } from '../models/inventory.model.js';
import { WarehouseModel } from '../models/warehouse.model.js';
import { DeliveryModel } from '../models/delivery.model.js';
import { getCoordinatesFromZipcode, calculateDistance } from '../utils/helpers.js';
import { InventoryReservationDOService } from './inventory-reservation-do.service.js';

/**
 * Fulfilment service for stock and delivery management
 */

export const FulfilmentService = {
  /**
   * Check if product has sufficient stock across ANY warehouse
   * Used during add-to-cart and cart operations before shipping address is known
   * Returns total available stock without warehouse assignment
   */
  async checkGeneralStockAvailability(env, productId, quantity = 1) {
    const allStock = await InventoryModel.checkStock(env.DB, productId);

    if (allStock.length === 0) {
      return {
        available: false,
        reason: 'product_not_found',
        message: 'Product not found in inventory',
      };
    }

    // Calculate total available stock across all warehouses
    const totalAvailable = allStock.reduce((sum, stock) => {
      return sum + stock.quantity;
    }, 0);

    if (totalAvailable >= quantity) {
      return {
        available: true,
        total_quantity: totalAvailable,
        warehouse_count: allStock.length,
        message: `Available across ${allStock.length} warehouse${allStock.length > 1 ? 's' : ''}`,
      };
    }

    return {
      available: false,
      reason: 'insufficient_stock',
      total_quantity: totalAvailable,
      requested_quantity: quantity,
      message: `Insufficient stock. Available: ${totalAvailable}, Requested: ${quantity}`,
    };
  },

  /**
   * Check stock availability for a product from nearest warehouse
   * Returns warehouse with stock or null if out of stock everywhere
   */
  async checkStockAvailability(env, productId, zipcode, quantity = 1) {
    // Get customer coordinates from zipcode
    const customerCoords = getCoordinatesFromZipcode(zipcode);

    // Get all warehouses sorted by proximity
    const warehouses = await WarehouseModel.getByProximity(
      env.DB,
      customerCoords.lat,
      customerCoords.lon
    );

    // Check stock in each warehouse starting from nearest
    for (const warehouse of warehouses) {
      const stock = await InventoryModel.getStockAtWarehouse(env.DB, productId, warehouse.id);

      if (stock && stock.quantity >= quantity) {
        return {
          available: true,
          warehouse: {
            id: warehouse.id,
            name: warehouse.name,
            distance: warehouse.distance,
          },
          quantity: stock.quantity,
          estimatedDays: this.calculateEstimatedDays(warehouse.distance),
        };
      }
    }

    // Check if product exists but out of stock
    const allStock = await InventoryModel.checkStock(env.DB, productId);

    return {
      available: false,
      reason: allStock.length > 0 ? 'out_of_stock' : 'product_not_found',
      message:
        allStock.length > 0
          ? 'Product is currently out of stock at all warehouses'
          : 'Product not found in inventory',
    };
  },

  /**
   * Check stock for multiple products
   */
  async checkBatchStockAvailability(env, items, zipcode) {
    const results = [];

    for (const item of items) {
      const stockInfo = await this.checkStockAvailability(
        env,
        item.product_id,
        zipcode,
        item.quantity || 1
      );

      results.push({
        product_id: item.product_id,
        ...stockInfo,
      });
    }

    return {
      items: results,
      allAvailable: results.every(item => item.available),
    };
  },

  /**
   * Get delivery options for a zipcode with simplified flat-rate pricing
   */
  async getDeliveryOptions(env, zipcode, items = [], distance = null) {
    const deliveryModes = await DeliveryModel.getDeliveryModesForZipcode(env.DB, zipcode);

    return deliveryModes.map(mode => {
      const conditions = mode.conditions;
      const cost = conditions.base_cost || 0;

      return {
        mode: mode.mode_name,
        estimatedDays: {
          min: conditions.min_days,
          max: conditions.max_days,
        },
        cost,
        cutoffTime: conditions.cutoff_time,
        description: this.getDeliveryDescription(mode.mode_name, conditions),
      };
    });
  },

  /**
   * Reserve stock for cart items using Durable Objects
   * Includes user context for audit trail and debugging
   * Uses DO-based reservations with automatic TTL expiry
   */
  async reserveStockForCart(env, items, zipcode, userId, orderId) {
    const reservations = [];
    const customerCoords = getCoordinatesFromZipcode(zipcode);

    console.log(
      `[Reservation DO] User ${userId} reserving stock for order ${orderId}, ${items.length} items`
    );

    for (const item of items) {
      // Get warehouses sorted by proximity
      const warehouses = await WarehouseModel.getByProximity(
        env.DB,
        customerCoords.lat,
        customerCoords.lon
      );

      let reserved = false;
      let reservationResult = null;

      // Try to reserve from nearest warehouse with stock
      for (const warehouse of warehouses) {
        try {
          // Use DO for reservation with TTL
          reservationResult = await InventoryReservationDOService.reserveStock(
            env,
            item.product_id,
            warehouse.id,
            orderId,
            item.quantity,
            userId
          );

          if (reservationResult.success) {
            reservations.push({
              product_id: item.product_id,
              warehouse_id: warehouse.id,
              quantity: item.quantity,
              reserved: true,
              reserved_by: userId,
              reserved_at: Date.now(),
              expires_at: reservationResult.expires_at,
              expires_in_ms: reservationResult.expires_in_ms,
              order_id: orderId,
            });
            console.log(
              `[Reservation DO] User ${userId} reserved ${item.quantity}x ${item.product_id} from ${warehouse.id}, expires at ${new Date(reservationResult.expires_at).toISOString()}`
            );
            reserved = true;
            break;
          }
        } catch (error) {
          console.error(`[Reservation DO] Error reserving from ${warehouse.id}:`, error);
          // Continue to next warehouse
        }
      }

      if (!reserved) {
        // Rollback previous reservations
        console.log(`[Reservation DO] Failed to reserve ${item.product_id}, rolling back...`);
        for (const res of reservations) {
          try {
            await InventoryReservationDOService.releaseReservation(
              env,
              res.product_id,
              res.warehouse_id,
              orderId
            );
          } catch (error) {
            console.error(`[Reservation DO] Error rolling back ${res.product_id}:`, error);
          }
        }

        return {
          success: false,
          reason: reservationResult?.reason || 'insufficient_stock',
          product_id: item.product_id,
          message:
            reservationResult?.message || `Unable to reserve stock for product ${item.product_id}`,
        };
      }
    }

    console.log(
      `[Reservation DO] User ${userId} successfully reserved ${reservations.length} items for order ${orderId}`
    );

    return {
      success: true,
      reservations,
      reserved_by: userId,
      reserved_at: Date.now(),
      order_id: orderId,
    };
  },

  /**
   * Release stock reservations using Durable Objects
   * Includes user context for audit trail
   */
  async releaseReservations(env, reservations, userId, orderId) {
    console.log(
      `[Release DO] User ${userId} releasing ${reservations.length} reservations for order ${orderId}`
    );

    for (const res of reservations) {
      try {
        await InventoryReservationDOService.releaseReservation(
          env,
          res.product_id,
          res.warehouse_id,
          orderId || res.order_id
        );
        console.log(
          `[Release DO] User ${userId} released ${res.quantity}x ${res.product_id} from ${res.warehouse_id}`
        );
      } catch (error) {
        console.error(`[Release DO] Error releasing ${res.product_id}:`, error);
        // Continue with other releases
      }
    }

    return {
      success: true,
      released_by: userId,
      released_at: Date.now(),
      order_id: orderId,
    };
  },

  /**
   * Calculate estimated delivery days based on distance
   */
  calculateEstimatedDays(distanceKm) {
    if (distanceKm < 100) return { min: 1, max: 2 };
    if (distanceKm < 500) return { min: 2, max: 3 };
    if (distanceKm < 1000) return { min: 3, max: 5 };
    return { min: 5, max: 7 };
  },

  /**
   * Get human-readable delivery description
   */
  getDeliveryDescription(modeName, conditions) {
    const { min_days, max_days } = conditions;

    if (modeName === 'express') {
      return `Express delivery in ${min_days}-${max_days} business days`;
    } else {
      return `Standard delivery in ${min_days}-${max_days} business days - FREE`;
    }
  },

  /**
   * Reduce stock after order confirmation (called by order-worker)
   * This confirms the DO reservation and commits the actual inventory reduction
   */
  async reduceStock(env, productId, warehouseId, quantity, orderId) {
    console.log(
      `[Stock Reduction DO] Order ${orderId} reducing ${quantity}x ${productId} from ${warehouseId}`
    );

    try {
      // Confirm reservation in DO - this will also update the database
      const result = await InventoryReservationDOService.confirmReservation(
        env,
        productId,
        warehouseId,
        orderId
      );

      if (!result.success) {
        throw new Error(result.message || 'Failed to confirm reservation');
      }

      console.log(
        `[Stock Reduction DO] Successfully confirmed and reduced stock for order ${orderId}`
      );

      return {
        success: true,
        product_id: productId,
        warehouse_id: warehouseId,
        quantity_reduced: result.quantity_committed,
        order_id: orderId,
        remaining_stock: result.remaining_stock,
      };
    } catch (error) {
      console.error(`[Stock Reduction DO] Error for order ${orderId}:`, error);
      throw error;
    }
  },

  /**
   * Restore stock (rollback) if order confirmation fails
   * This releases the DO reservation and restores database stock if needed
   */
  async restoreStock(env, productId, warehouseId, quantity, orderId) {
    console.log(
      `[Stock Restore DO] Order ${orderId} restoring ${quantity}x ${productId} to ${warehouseId}`
    );

    try {
      // Try to release the reservation in DO first
      try {
        await InventoryReservationDOService.releaseReservation(
          env,
          productId,
          warehouseId,
          orderId
        );
        console.log(`[Stock Restore DO] Released DO reservation for order ${orderId}`);
      } catch (doError) {
        console.warn(
          '[Stock Restore DO] Could not release DO reservation (may have expired):',
          doError
        );
        // Continue with DB restoration
      }

      // Also restore in database in case it was already committed
      const query = `
        UPDATE inventory 
        SET quantity = quantity + ?
        WHERE product_id = ? AND warehouse_id = ?
      `;

      const result = await env.DB.prepare(query).bind(quantity, productId, warehouseId).run();

      console.log(`[Stock Restore DO] Successfully restored stock for order ${orderId}`);

      return {
        success: true,
        product_id: productId,
        warehouse_id: warehouseId,
        quantity_restored: quantity,
        order_id: orderId,
      };
    } catch (error) {
      console.error(`[Stock Restore DO] Error for order ${orderId}:`, error);
      throw error;
    }
  },

  /**
   * Reserve stock for order (called by order-worker during order creation)
   * Reserves stock with TTL via Durable Objects
   */
  async reserveStockForOrder(env, orderId, userId, items) {
    console.log(`[Reserve Order] Reserving stock for order ${orderId}, ${items.length} items`);
    console.log('[Reserve Order] Items:', JSON.stringify(items));

    // Check if DO binding exists
    if (!env.INVENTORY_RESERVATIONS) {
      console.error('[Reserve Order] INVENTORY_RESERVATIONS binding not found!');
      throw new Error('Durable Object binding not available. Please redeploy fulfilment-worker.');
    }

    const reservations = [];

    try {
      for (const item of items) {
        console.log(
          `[Reserve Order] Processing item: product_id=${item.product_id}, warehouse_id=${item.warehouse_id}, quantity=${item.quantity}`
        );

        const result = await InventoryReservationDOService.reserveStock(
          env,
          item.product_id,
          item.warehouse_id,
          orderId,
          item.quantity,
          userId
        );

        if (!result.success) {
          // Rollback previous reservations
          console.log(`[Reserve Order] Failed to reserve ${item.product_id}, rolling back...`);
          for (const res of reservations) {
            try {
              await InventoryReservationDOService.releaseReservation(
                env,
                res.product_id,
                res.warehouse_id,
                orderId
              );
            } catch (error) {
              console.error(`[Reserve Order] Error rolling back ${res.product_id}:`, error);
            }
          }

          return {
            success: false,
            reason: result.reason || 'insufficient_stock',
            product_id: item.product_id,
            message: result.message || `Unable to reserve stock for product ${item.product_id}`,
          };
        }

        reservations.push({
          product_id: item.product_id,
          warehouse_id: item.warehouse_id,
          quantity: item.quantity,
          expires_at: result.expires_at,
        });
      }

      console.log(
        `[Reserve Order] Successfully reserved ${reservations.length} items for order ${orderId}`
      );

      return {
        success: true,
        order_id: orderId,
        reservations,
        expires_at:
          reservations.length > 0 ? Math.min(...reservations.map(r => r.expires_at)) : null,
      };
    } catch (error) {
      console.error(`[Reserve Order] Error for order ${orderId}:`, error);
      throw error;
    }
  },

  /**
   * Release stock reservations for order (called on order failure/cancellation)
   */
  async releaseStockForOrder(env, orderId) {
    console.log(`[Release Order] Releasing reservations for order ${orderId}`);

    // Note: We don't have a central registry of which products were reserved for an order
    // The DO will handle automatic expiry via TTL
    // This is just a best-effort early release if we know the order failed

    return {
      success: true,
      message:
        'Reservations will be automatically released by TTL or can be manually released via order data',
    };
  },
};
