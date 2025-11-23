/**
 * Script to check Durable Object reservation status
 * Usage: node test-reservation-status.js <productId> <warehouseId>
 *
 * Example: node test-reservation-status.js PROD001 WH001
 */

const FULFILMENT_API = 'https://fulfilment-worker.guhan2210.workers.dev';

async function checkReservationStatus(productId, warehouseId) {
  console.log(`\n🔍 Checking reservations for Product: ${productId}, Warehouse: ${warehouseId}\n`);

  try {
    const response = await fetch(`${FULFILMENT_API}/api/stock/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        warehouse_id: warehouseId,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Error:', result.error?.message || 'Failed to check stock');
      return;
    }

    const data = result.data;

    console.log('📊 Stock Information:');
    console.log('─'.repeat(60));
    console.log(`DO ID:            ${data.doId}`);
    console.log(`Total Stock:      ${data.stock?.quantity || 'N/A'}`);
    console.log(`Available:        ${data.available || 'N/A'}`);
    console.log(`Reserved Count:   ${data.reservations?.length || 0}`);
    console.log(
      `Last Synced:      ${data.lastSync ? new Date(data.lastSync).toLocaleString() : 'Never'}`
    );
    console.log('─'.repeat(60));

    if (data.reservations && data.reservations.length > 0) {
      console.log('\n🔒 Active Reservations:');
      data.reservations.forEach((res, index) => {
        const minutesLeft = Math.floor(res.expiresIn / 1000 / 60);
        const secondsLeft = Math.floor((res.expiresIn / 1000) % 60);

        console.log(`\n  ${index + 1}. Order ID: ${res.orderId}`);
        console.log(`     Quantity:  ${res.quantity} units`);
        console.log(`     User ID:   ${res.userId}`);
        console.log(`     Created:   ${new Date(res.createdAt).toLocaleString()}`);
        console.log(`     Expires:   ${new Date(res.expiresAt).toLocaleString()}`);
        console.log(`     Time Left: ${minutesLeft}m ${secondsLeft}s`);
      });

      console.log(
        '\n💡 These reservations will be automatically released after expiry or when the order is cancelled/confirmed.'
      );
    } else {
      console.log('\n✅ No active reservations - all stock is available!');
    }

    console.log('\n');
  } catch (error) {
    console.error('❌ Failed to check status:', error.message);
  }
}

// Get command line arguments
const [, , productId, warehouseId] = process.argv;

if (!productId || !warehouseId) {
  console.log('Usage: node test-reservation-status.js <productId> <warehouseId>');
  console.log('Example: node test-reservation-status.js PROD001 WH001');
  process.exit(1);
}

checkReservationStatus(productId, warehouseId);
