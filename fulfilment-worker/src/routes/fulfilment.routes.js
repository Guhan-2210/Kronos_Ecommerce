import { Hono } from 'hono';
import { FulfilmentController } from '../controllers/fulfilment.controller.js';

const fulfilment = new Hono();

// Stock checking
fulfilment.post('/stock/check', FulfilmentController.checkStock);
fulfilment.post('/stock/check-batch', FulfilmentController.checkBatchStock);

// Stock reservation
fulfilment.post('/stock/reserve', FulfilmentController.reserveStock);
fulfilment.post('/stock/release', FulfilmentController.releaseStock);

// Delivery options
fulfilment.post('/delivery/options', FulfilmentController.getDeliveryOptions);

// Debug endpoint to check reservation status
fulfilment.post('/stock/reservations', FulfilmentController.getReservations);

export default fulfilment;
