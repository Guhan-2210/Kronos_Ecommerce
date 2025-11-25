import { CartModel } from '../models/cart.model.js';
import { generateId, callService } from '../utils/helpers.js';

/**
 * Cart service with price and stock validation
 */

export const CartService = {
  /**
   * Verify cart ownership - throws error if user doesn't own cart
   */
  async verifyCartOwnership(env, cartId, userId) {
    const cart = await CartModel.getById(env.DB, cartId);

    if (!cart) {
      throw new Error('Cart not found');
    }

    if (cart.user_id !== userId) {
      throw new Error('Unauthorized access to cart');
    }

    return cart;
  },

  /**
   * Add product to cart (or create new cart)
   * NOTE: Warehouse assignment happens LATER when shipping address is provided
   */
  async addToCart(env, userId, userData, productInfo) {
    const { product_id, sku, name, brand, image, quantity } = productInfo;

    console.log(`[CART] 🛒 User ${userId} adding ${quantity}x ${product_id} to cart`);

    // Step 1: Get current price
    const priceData = await this.getCurrentPrice(env, product_id);
    if (!priceData) {
      throw new Error('Product price not found');
    }

    console.log(`[CART] ✅ Price: ${priceData.currency} ${priceData.price}`);

    // Step 2: Check if stock exists in ANY warehouse (without mapping)
    const stockCheck = await this.checkGeneralStock(env, product_id, quantity);
    if (!stockCheck.available) {
      throw new Error(stockCheck.message || 'Product is currently out of stock');
    }
    console.log(
      `[CART] ✅ Stock available: ${stockCheck.total_quantity} units across ${stockCheck.warehouse_count} warehouses`
    );

    // Step 3: Get or create cart
    let cart = await CartModel.getActiveCartByUser(env.DB, userId);

    const cartProduct = {
      product_id,
      sku,
      name,
      brand,
      image,
      quantity,
      price: priceData.price,
      currency: priceData.currency,
      added_at: Date.now(),
      // NOTE: warehouse_id will be assigned when shipping address is provided
    };

    if (cart) {
      // Add to existing cart
      const products = cart.product_data;
      const existingIndex = products.findIndex(p => p.product_id === product_id);

      if (existingIndex >= 0) {
        // Update quantity
        console.log(
          `[CART] 🔄 Updating quantity: ${products[existingIndex].quantity} → ${products[existingIndex].quantity + quantity}`
        );
        products[existingIndex].quantity += quantity;
        products[existingIndex].price = priceData.price; // Update to current price
      } else {
        console.log('[CART] ➕ Adding new product to cart');
        products.push(cartProduct);
      }

      cart = await CartModel.updateProducts(env.DB, cart.id, products);
    } else {
      // Create new cart
      const cartId = `cart-${generateId()}`;
      console.log(`[CART] 🆕 Creating new cart ${cartId}`);
      cart = await CartModel.create(env.DB, cartId, userId, userData, [cartProduct]);
    }

    console.log(`[CART] ✅ Cart ${cart.id} now has ${cart.product_data.length} product(s)`);
    return cart;
  },

  /**
   * Get cart with refreshed prices and stock validation
   * Stock is ALWAYS checked across all warehouses (general availability)
   * Specific warehouse mapping happens only when shipping address is added
   */
  async getCartWithValidation(env, cartId, userId) {
    // Verify ownership
    const cart = await this.verifyCartOwnership(env, cartId, userId);

    // Refresh prices and check stock for all items
    const validatedProducts = [];
    const issues = [];

    for (const product of cart.product_data) {
      // Check current price
      const currentPrice = await this.getCurrentPrice(env, product.product_id);

      if (!currentPrice) {
        issues.push({
          product_id: product.product_id,
          issue: 'price_unavailable',
          message: `Price information not available for ${product.name}`,
        });
        continue;
      }

      // Check if price changed
      const priceChanged = currentPrice.price !== product.price;

      // ALWAYS check if stock exists in ANY warehouse
      const generalStockCheck = await this.checkGeneralStock(
        env,
        product.product_id,
        product.quantity
      );

      if (!generalStockCheck.available) {
        issues.push({
          product_id: product.product_id,
          issue: 'out_of_stock',
          message: `${product.name} is currently out of stock`,
        });
      }

      // If shipping address exists, also check location-specific availability
      let locationStockCheck = null;
      if (cart.shipping_address?.zipcode) {
        locationStockCheck = await this.checkStockAvailability(
          env,
          product.product_id,
          cart.shipping_address.zipcode,
          product.quantity
        );

        if (!locationStockCheck.available) {
          issues.push({
            product_id: product.product_id,
            issue: 'out_of_stock_at_location',
            message: `${product.name} is not available for delivery to ${cart.shipping_address.zipcode}`,
          });
        }
      }

      validatedProducts.push({
        ...product,
        current_price: currentPrice.price,
        price_changed: priceChanged,
        old_price: priceChanged ? product.price : null,
        stock_available: generalStockCheck.available,
        stock_quantity: generalStockCheck.total_quantity,
        warehouse_count: generalStockCheck.warehouse_count,
        location_verified: !!locationStockCheck, // true if checked for specific location
        warehouse_id: product.warehouse_id || null, // Assigned only after shipping address
      });
    }

    return {
      ...cart,
      product_data: validatedProducts,
      validation_issues: issues,
      has_issues: issues.length > 0,
      shipping_address_required: !cart.shipping_address,
    };
  },

  /**
   * Update product quantity in cart
   * ALWAYS validates stock availability across all warehouses
   */
  async updateQuantity(env, cartId, userId, productId, quantity) {
    // Verify ownership
    const cart = await this.verifyCartOwnership(env, cartId, userId);

    if (quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    // ALWAYS check if stock exists in ANY warehouse
    const generalStockCheck = await this.checkGeneralStock(env, productId, quantity);
    if (!generalStockCheck.available) {
      throw new Error(
        `Insufficient stock for requested quantity. Available: ${generalStockCheck.total_quantity}, Requested: ${quantity}`
      );
    }

    // Additionally check location-specific stock if shipping address exists
    if (cart.shipping_address?.zipcode) {
      const locationStockCheck = await this.checkStockAvailability(
        env,
        productId,
        cart.shipping_address.zipcode,
        quantity
      );

      if (!locationStockCheck.available) {
        throw new Error(
          `Product is not available in the requested quantity for delivery to ${cart.shipping_address.zipcode}`
        );
      }
    }

    const products = cart.product_data.map(p => {
      if (p.product_id === productId) {
        return { ...p, quantity };
      }
      return p;
    });

    return await CartModel.updateProducts(env.DB, cartId, products);
  },

  /**
   * Remove product from cart
   */
  async removeProduct(env, cartId, userId, productId) {
    // Verify ownership
    const cart = await this.verifyCartOwnership(env, cartId, userId);

    const products = cart.product_data.filter(p => p.product_id !== productId);

    return await CartModel.updateProducts(env.DB, cartId, products);
  },

  /**
   * Add shipping address and assign optimal warehouses for each product
   * This is the CRITICAL step where warehouse_id gets assigned based on shipping zipcode
   */
  async addShippingAddress(env, cartId, userId, address) {
    const { street: _street, city: _city, state: _state, zipcode, country: _country } = address;

    if (!zipcode) {
      throw new Error('Zipcode is required');
    }

    console.log(`[CART] 📦 Adding shipping address for cart ${cartId}, zipcode: ${zipcode}`);

    // Verify ownership
    await this.verifyCartOwnership(env, cartId, userId);

    // Update shipping address first
    const updatedCart = await CartModel.updateShippingAddress(env.DB, cartId, address);

    // CRITICAL: Re-evaluate and assign optimal warehouse for each product based on shipping zipcode
    console.log(`[CART] 🏭 Assigning optimal warehouses based on zipcode ${zipcode}...`);
    const updatedProducts = [];

    for (const product of updatedCart.product_data) {
      console.log(
        `[CART] Checking stock for ${product.name} (${product.product_id}) at ${zipcode}`
      );

      const stockCheck = await this.checkStockAvailability(
        env,
        product.product_id,
        zipcode,
        product.quantity
      );

      if (!stockCheck.available) {
        throw new Error(
          `Product "${product.name}" is not available for delivery to ${zipcode}. ` +
            'Please remove it from cart or try a different address.'
        );
      }

      console.log(
        `[CART] ✅ ${product.name} -> Warehouse ${stockCheck.warehouse.id} (${stockCheck.warehouse.city})`
      );

      updatedProducts.push({
        ...product,
        warehouse_id: stockCheck.warehouse.id, // ASSIGN WAREHOUSE HERE
      });
    }

    // Update cart with warehouse assignments
    const finalCart = await CartModel.updateProducts(env.DB, cartId, updatedProducts);

    console.log('[CART] ✅ All products assigned to optimal warehouses');

    // Get delivery options for this zipcode
    // IMPORTANT: Include warehouse_id for delivery mode filtering (EXPRESS only for Chennai)
    const items = finalCart.product_data.map(p => ({
      product_id: p.product_id,
      quantity: p.quantity,
      warehouse_id: p.warehouse_id, // Required for delivery mode filtering
    }));

    let deliveryOptions;

    if (env.FULFILMENT_SERVICE) {
      // Production: Use service binding
      const serviceResponse = await env.FULFILMENT_SERVICE.fetch(
        new Request('http://internal/api/delivery/options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ zipcode, items }),
        })
      );
      deliveryOptions = await serviceResponse.json();
    } else {
      // Local dev: Use HTTP
      deliveryOptions = await callService(
        'http://localhost:8791',
        '/api/delivery/options',
        'POST',
        { zipcode, items }
      );
    }

    return {
      ...finalCart,
      delivery_options: deliveryOptions.data,
    };
  },

  /**
   * Add billing address
   */
  async addBillingAddress(env, cartId, userId, address, sameAsShipping = false) {
    // Verify ownership
    const cart = await this.verifyCartOwnership(env, cartId, userId);

    const billingAddress = sameAsShipping ? cart.shipping_address : address;

    if (!billingAddress) {
      throw new Error('Billing address or shipping address required');
    }

    return await CartModel.updateBillingAddress(env.DB, cartId, billingAddress);
  },

  /**
   * Get order summary (final step before payment)
   * Validates everything one more time
   */
  async getOrderSummary(env, cartId, userId) {
    const cart = await this.getCartWithValidation(env, cartId, userId);

    if (cart.has_issues) {
      throw new Error('Cart has validation issues. Please review your cart.');
    }

    if (!cart.shipping_address) {
      throw new Error('Shipping address is required');
    }

    if (!cart.billing_address) {
      throw new Error('Billing address is required');
    }

    // Calculate totals
    const subtotal = cart.product_data.reduce((sum, p) => sum + p.current_price * p.quantity, 0);

    // Get delivery options
    // IMPORTANT: Include warehouse_id for delivery mode filtering (EXPRESS only for Chennai)
    const items = cart.product_data.map(p => ({
      product_id: p.product_id,
      quantity: p.quantity,
      warehouse_id: p.warehouse_id, // Required for EXPRESS filtering
    }));

    let deliveryOptions;

    if (env.FULFILMENT_SERVICE) {
      // Production: Use service binding
      const serviceResponse = await env.FULFILMENT_SERVICE.fetch(
        new Request('http://internal/api/delivery/options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ zipcode: cart.shipping_address.zipcode, items }),
        })
      );
      deliveryOptions = await serviceResponse.json();
    } else {
      // Local dev: Use HTTP
      deliveryOptions = await callService(
        'http://localhost:8791',
        '/api/delivery/options',
        'POST',
        { zipcode: cart.shipping_address.zipcode, items }
      );
    }

    return {
      cart_id: cart.id,
      items: cart.product_data.map(p => ({
        product_id: p.product_id,
        name: p.name,
        brand: p.brand,
        sku: p.sku,
        quantity: p.quantity,
        price: p.current_price,
        total: p.current_price * p.quantity,
      })),
      subtotal,
      delivery_options: deliveryOptions.data,
      shipping_address: cart.shipping_address,
      billing_address: cart.billing_address,
      summary: {
        item_count: cart.product_data.reduce((sum, p) => sum + p.quantity, 0),
        subtotal,
        currency: cart.product_data[0]?.currency || 'INR',
      },
    };
  },

  /**
   * Helper: Get current price from price service
   * Uses service binding in production, HTTP in local dev
   */
  async getCurrentPrice(env, productId) {
    try {
      let response;

      if (env.PRICE_SERVICE) {
        // Production: Use service binding
        const serviceResponse = await env.PRICE_SERVICE.fetch(
          new Request(`http://internal/api/prices/product/${productId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          })
        );
        response = await serviceResponse.json();
      } else {
        // Local dev: Use HTTP
        response = await callService(
          'http://localhost:8790',
          `/api/prices/product/${productId}`,
          'GET'
        );
      }

      return response.data;
    } catch (error) {
      console.error(`Failed to get price for ${productId}:`, error);
      return null;
    }
  },

  /**
   * Helper: Check if stock exists in ANY warehouse (general availability)
   * Used before shipping address is known
   * Uses service binding in production, HTTP in local dev
   */
  async checkGeneralStock(env, productId, quantity) {
    try {
      let response;

      if (env.FULFILMENT_SERVICE) {
        // Production: Use service binding
        const serviceResponse = await env.FULFILMENT_SERVICE.fetch(
          new Request('http://internal/api/stock/check-general', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: productId, quantity }),
          })
        );
        response = await serviceResponse.json();
      } else {
        // Local dev: Use HTTP
        response = await callService('http://localhost:8791', '/api/stock/check-general', 'POST', {
          product_id: productId,
          quantity,
        });
      }

      return response.data;
    } catch (error) {
      console.error(`Failed to check general stock for ${productId}:`, error);
      return { available: false, message: 'Unable to check stock availability' };
    }
  },

  /**
   * Helper: Check stock availability at specific location (with warehouse assignment)
   * Uses service binding in production, HTTP in local dev
   */
  async checkStockAvailability(env, productId, zipcode, quantity) {
    try {
      let response;

      if (env.FULFILMENT_SERVICE) {
        // Production: Use service binding
        const serviceResponse = await env.FULFILMENT_SERVICE.fetch(
          new Request('http://internal/api/stock/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: productId, zipcode, quantity }),
          })
        );
        response = await serviceResponse.json();
      } else {
        // Local dev: Use HTTP
        response = await callService('http://localhost:8791', '/api/stock/check', 'POST', {
          product_id: productId,
          zipcode,
          quantity,
        });
      }

      return response.data;
    } catch (error) {
      console.error(`Failed to check stock for ${productId}:`, error);
      return { available: false, message: 'Unable to check stock availability' };
    }
  },

  /**
   * Update cart status
   */
  async updateStatus(env, cartId, userId, status) {
    // Verify ownership
    await this.verifyCartOwnership(env, cartId, userId);

    return await CartModel.updateStatus(env.DB, cartId, status);
  },

  /**
   * Delete cart
   */
  async deleteCart(env, cartId, userId) {
    // Verify ownership
    await this.verifyCartOwnership(env, cartId, userId);

    return await CartModel.delete(env.DB, cartId);
  },

  /**
   * Place order - Orchestrates the entire order placement flow
   * 1. Validate cart
   * 2. Final warehouse verification
   * 3. Create order via order-worker
   * 4. Initiate payment via payment-worker
   * 5. Return payment approval URL
   */
  async placeOrder(env, cartId, userId, deliveryMode) {
    try {
      console.log(`[Order Placement] User ${userId} placing order from cart ${cartId}`);

      // Step 1: Verify cart ownership and get validated cart
      const cart = await this.getCartWithValidation(env, cartId, userId);

      if (!cart) {
        throw new Error('Cart not found');
      }

      if (cart.has_issues) {
        throw new Error('Cart has validation issues. Please review your cart.');
      }

      if (!cart.product_data || cart.product_data.length === 0) {
        throw new Error('Cart is empty');
      }

      if (!cart.shipping_address) {
        throw new Error('Shipping address is required');
      }

      if (!cart.billing_address) {
        throw new Error('Billing address is required');
      }

      // Step 2: Final verification - ensure all products have correct warehouse mapping
      console.log(
        `[Order Placement] Verifying warehouse assignments for zipcode: ${cart.shipping_address.zipcode}`
      );
      console.log(
        '[Order Placement DEBUG] Cart products:',
        JSON.stringify(
          cart.product_data.map(p => ({
            product_id: p.product_id,
            name: p.name,
            warehouse_id: p.warehouse_id,
          }))
        )
      );

      // Check if any products are missing warehouse assignments
      const productsWithoutWarehouse = cart.product_data.filter(p => !p.warehouse_id);

      if (productsWithoutWarehouse.length > 0) {
        console.error(
          '[Order Placement] Products missing warehouse_id:',
          productsWithoutWarehouse.map(p => p.name)
        );

        // Try to reassign warehouses
        console.log('[Order Placement] Attempting to reassign warehouses...');
        try {
          const updatedProducts = [];
          for (const product of cart.product_data) {
            if (!product.warehouse_id) {
              const stockCheck = await this.checkStockAvailability(
                env,
                product.product_id,
                cart.shipping_address.zipcode,
                product.quantity
              );

              if (!stockCheck.available) {
                throw new Error(
                  `Product "${product.name}" is not available at your delivery address.`
                );
              }

              updatedProducts.push({
                ...product,
                warehouse_id: stockCheck.warehouse.id,
              });
            } else {
              updatedProducts.push(product);
            }
          }

          // Update cart with warehouse assignments
          await CartModel.updateProducts(env.DB, cartId, updatedProducts);
          cart.product_data = updatedProducts;

          console.log('[Order Placement] ✅ Warehouses reassigned successfully');
        } catch (assignError) {
          throw new Error(`Unable to assign warehouses for products. ${assignError.message}`);
        }
      }

      for (const product of cart.product_data) {
        console.log(
          `[Order Placement] ✅ ${product.name} assigned to warehouse: ${product.warehouse_id}`
        );
      }

      // Step 3: Calculate costs with delivery mode
      const costs = this.calculateCosts(cart.product_data, deliveryMode);

      // Step 4: Prepare order data with warehouse assignments
      const orderData = {
        products: cart.product_data.map(p => ({
          ...p,
          product_id: p.product_id || p.id, // Handle both field name formats
          warehouse_id: p.warehouse_id, // Ensure warehouse_id is included
        })),
        shipping_address: cart.shipping_address,
        billing_address: cart.billing_address,
        delivery_mode: deliveryMode,
        costs,
      };

      // Debug: Log what we're sending to order-worker
      console.log(
        '[Order Placement] Sending to order-worker:',
        JSON.stringify(
          orderData.products.map(p => ({
            product_id: p.product_id,
            id: p.id,
            warehouse_id: p.warehouse_id,
            quantity: p.quantity,
          }))
        )
      );

      // Step 5: Create order via order-worker
      const createOrderRequest = new Request('http://internal/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          cart_id: cartId,
          cart_data: orderData,
          user_data: cart.user_data,
        }),
      });

      const createOrderResponse = await env.ORDER_SERVICE.fetch(createOrderRequest);
      const createOrderResult = await createOrderResponse.json();

      if (!createOrderResult.success) {
        throw new Error(`Order creation failed: ${createOrderResult.error}`);
      }

      const order = createOrderResult.data;
      console.log(`[Order Placement] Order ${order.id} created with warehouse mappings`);

      // Step 6: Initiate payment
      const initiatePaymentRequest = new Request(
        `http://internal/api/orders/${order.id}/initiate-payment`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const initiatePaymentResponse = await env.ORDER_SERVICE.fetch(initiatePaymentRequest);
      const initiatePaymentResult = await initiatePaymentResponse.json();

      if (!initiatePaymentResult.success) {
        throw new Error(`Payment initiation failed: ${initiatePaymentResult.error}`);
      }

      console.log(`[Order Placement] Payment initiated for order ${order.id}`);

      return {
        order_id: order.id,
        payment_id: initiatePaymentResult.data.payment_id,
        paypal_order_id: initiatePaymentResult.data.paypal_order_id,
        approval_url: initiatePaymentResult.data.approval_url,
        total_amount: order.total_amount,
        currency: order.currency,
      };
    } catch (error) {
      console.error('[Order Placement] Error:', error);
      throw error;
    }
  },

  /**
   * Complete order after payment approval
   * 1. Complete payment capture
   * 2. Confirm order (reduce stock)
   * 3. Soft delete cart
   */
  async completeOrder(env, orderId, paypalOrderId, userId) {
    try {
      console.log(`[Order Completion] Completing order ${orderId} with PayPal ${paypalOrderId}`);

      // Step 1: Complete payment via payment-worker (through order-worker)
      // We need to call the payment service through order worker's service binding
      // For now, let's create a direct endpoint on order-worker

      // Step 2: Confirm order (this will reduce stock)
      const confirmOrderRequest = new Request(`http://internal/api/orders/${orderId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paypal_order_id: paypalOrderId,
        }),
      });

      const confirmOrderResponse = await env.ORDER_SERVICE.fetch(confirmOrderRequest);
      const confirmOrderResult = await confirmOrderResponse.json();

      if (!confirmOrderResult.success) {
        throw new Error(`Order confirmation failed: ${confirmOrderResult.error}`);
      }

      console.log(`[Order Completion] Order ${orderId} confirmed`);

      // Step 3: Get the order to find the cart ID
      const getOrderRequest = new Request(
        `http://internal/api/orders/${orderId}?userId=${userId}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const getOrderResponse = await env.ORDER_SERVICE.fetch(getOrderRequest);
      const getOrderResult = await getOrderResponse.json();

      if (getOrderResult.success && getOrderResult.data.cart_id) {
        // Soft delete the cart
        await CartModel.softDelete(env.DB, getOrderResult.data.cart_id);
        console.log(`[Order Completion] Cart ${getOrderResult.data.cart_id} soft deleted`);
      }

      // Return full order details instead of just order_id
      return {
        order_id: orderId,
        status: 'confirmed',
        message: 'Order placed successfully',
        order_data: getOrderResult.data, // ✅ Include full order object
      };
    } catch (error) {
      console.error('[Order Completion] Error:', error);
      throw error;
    }
  },

  /**
   * Calculate order costs
   */
  calculateCosts(products, deliveryMode) {
    const INR_TO_USD = 83.0;
    const EUR_TO_USD = 1.18;
    const GBP_TO_USD = 1.27;

    // Convert each product to USD and sum
    let convertedSubtotal = 0;
    for (const product of products) {
      const productTotal = product.price * product.quantity;
      const currency = product.currency || 'USD';

      if (currency === 'INR') {
        convertedSubtotal += productTotal / INR_TO_USD;
      } else if (currency === 'EUR') {
        convertedSubtotal += productTotal * EUR_TO_USD;
      } else if (currency === 'GBP') {
        convertedSubtotal += productTotal * GBP_TO_USD;
      } else {
        // USD or unknown currency (treat as USD)
        convertedSubtotal += productTotal;
      }
    }

    // Delivery costs (in USD)
    const deliveryCosts = {
      standard: 0,
      express: 15,
    };

    const deliveryCost = deliveryCosts[deliveryMode] || 0;
    const tax = convertedSubtotal * 0.08; // 8% tax
    const total = convertedSubtotal + deliveryCost + tax;

    return {
      subtotal: Math.round(convertedSubtotal * 100) / 100,
      delivery_cost: deliveryCost,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100,
      currency: 'USD',
    };
  },

  /**
   * Convert currency
   */
  convertCurrency(amount, currency) {
    const INR_TO_USD = 83.0;
    const EUR_TO_USD = 1.18;
    const GBP_TO_USD = 1.27;

    let amountUsd = amount;
    let exchangeRate = null;

    if (currency === 'INR') {
      amountUsd = amount / INR_TO_USD;
      exchangeRate = INR_TO_USD;
    } else if (currency === 'EUR') {
      amountUsd = amount * EUR_TO_USD;
      exchangeRate = 1 / EUR_TO_USD;
    } else if (currency === 'GBP') {
      amountUsd = amount * GBP_TO_USD;
      exchangeRate = 1 / GBP_TO_USD;
    }

    return {
      amount_usd: amountUsd,
      original_amount: amount,
      original_currency: currency,
      exchange_rate: exchangeRate,
    };
  },

  /**
   * Clear all products from cart
   */
  async clearCart(env, cartId, userId) {
    await this.verifyCartOwnership(env, cartId, userId);
    return await CartModel.updateProducts(env.DB, cartId, []);
  },

  /**
   * Get active cart for user
   */
  async getActiveCart(env, userId) {
    return await CartModel.getActiveCartByUser(env.DB, userId);
  },

  /**
   * Update shipping address
   */
  async updateShippingAddress(env, cartId, userId, address) {
    const cart = await this.verifyCartOwnership(env, cartId, userId);

    if (!cart.product_data || cart.product_data.length === 0) {
      throw new Error('Cart is empty - cannot set shipping address');
    }

    // Simple address update - warehouse assignment happens via addShippingAddress if needed
    const updatedCart = await CartModel.updateShippingAddress(env.DB, cartId, address);
    return updatedCart;
  },

  /**
   * Set delivery mode
   */
  async setDeliveryMode(env, cartId, userId, deliveryMode) {
    if (!['standard', 'express'].includes(deliveryMode)) {
      throw new Error('Invalid delivery mode - must be standard or express');
    }

    await this.verifyCartOwnership(env, cartId, userId);

    const updatedCart = await CartModel.update(env.DB, cartId, {
      delivery_mode: deliveryMode,
      updated_at: Date.now(),
    });

    return updatedCart;
  },

  /**
   * Validate cart is ready for checkout
   */
  validateCartForCheckout(cart) {
    if (!cart.product_data || cart.product_data.length === 0) {
      return false;
    }
    if (!cart.shipping_address) {
      return false;
    }
    if (!cart.delivery_mode) {
      return false;
    }
    return true;
  },

  /**
   * Format cart response
   */
  formatCartResponse(cart) {
    const costs = this.calculateCosts(cart.product_data, cart.delivery_mode || 'standard');

    return {
      id: cart.id,
      user_id: cart.user_id,
      products: cart.product_data,
      shipping_address: cart.shipping_address,
      billing_address: cart.billing_address,
      delivery_mode: cart.delivery_mode,
      costs,
      status: cart.status,
      created_at: cart.created_at,
      updated_at: cart.updated_at,
    };
  },

  /**
   * Assign warehouses and validate stock
   */
  async assignWarehousesAndValidateStock(env, products, zipcode) {
    const updatedProducts = [];

    for (const product of products) {
      try {
        const stockCheck = await this.checkStockAvailability(
          env,
          product.product_id,
          zipcode,
          product.quantity
        );

        updatedProducts.push({
          ...product,
          warehouse_id: stockCheck.available ? stockCheck.warehouse_id : null,
          available: stockCheck.available,
        });
      } catch (error) {
        console.error(`Failed to check stock for ${product.product_id}:`, error);
        updatedProducts.push({
          ...product,
          warehouse_id: null,
          available: false,
        });
      }
    }

    return updatedProducts;
  },

  /**
   * Checkout cart and create order
   */
  async checkout(env, cartId, userId) {
    const cart = await this.verifyCartOwnership(env, cartId, userId);

    if (!this.validateCartForCheckout(cart)) {
      throw new Error('Cart is not ready for checkout - missing shipping address or delivery mode');
    }

    // Create order via order service
    try {
      const orderData = {
        cart_id: cartId,
        user_id: userId,
        products: cart.product_data,
        shipping_address: cart.shipping_address,
        billing_address: cart.billing_address,
        delivery_mode: cart.delivery_mode,
      };

      const orderResponse = await callService(
        env,
        env.ORDER_SERVICE || 'http://localhost:8791',
        'POST',
        '/orders',
        orderData
      );

      // Update cart status
      await this.updateStatus(env, cartId, userId, 'checked_out');

      return orderResponse.data;
    } catch (error) {
      throw new Error(`Order creation failed: ${error.message}`);
    }
  },

  /**
   * Refresh prices in cart
   */
  async refreshPricesInCart(env, products) {
    const updatedProducts = [];

    for (const product of products) {
      try {
        const priceData = await this.getCurrentPrice(env, product.product_id);
        updatedProducts.push({
          ...product,
          price: priceData ? priceData.price : product.price,
          currency: priceData ? priceData.currency : product.currency,
        });
      } catch {
        // Keep old price if fetch fails
        updatedProducts.push(product);
      }
    }

    return updatedProducts;
  },

  /**
   * Validate stock for products
   */
  async validateStockForProducts(env, products) {
    const validatedProducts = [];

    for (const product of products) {
      try {
        const stockCheck = await this.checkGeneralStock(env, product.product_id, product.quantity);
        validatedProducts.push({
          ...product,
          stock_available: stockCheck.available,
        });
      } catch {
        validatedProducts.push({
          ...product,
          stock_available: false,
        });
      }
    }

    return validatedProducts;
  },
};
