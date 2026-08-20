import PharmacyOrder from '../models/PharmacyOrder.js';
import Prescription from '../models/Prescription.js';
import Medicine from '../models/Medicine.js';
import { atomicallyDecrementStock, compensateStock } from '../utils/medicineStock.js';
import { calculateDeliveryFee } from '../utils/deliveryFee.js';
import { generateOrderNumber } from '../utils/crypto.js';
import { isValidTransition, TERMINAL_STATUSES } from '../utils/pharmacyOrderStatus.js';
import { logAudit } from '../utils/auditLog.js';

function notify(req, room, event, payload) {
  try {
    req.app.get('io')?.to(room).emit(event, payload);
  } catch (err) {
    console.error('Pharmacy order socket notify failed:', err.message);
  }
}

const toNotificationPayload = (order) => ({
  orderId: order._id,
  orderNumber: order.orderNumber,
  status: order.status,
  deliveryMethod: order.deliveryMethod,
});

async function findCatalogMatch(name) {
  if (!name) return null;
  return Medicine.findOne({ name: new RegExp(`^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
}

export const getPrescriptionAvailability = async (req, res) => {
  try {
    const prescription = await Prescription.findOne({
      _id: req.params.prescriptionId,
      patientId: req.user._id,
    });
    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    const lines = await Promise.all(
      prescription.medicines.map(async (med, index) => {
        if (med.dispenseStatus === 'dispensed' || med.dispenseStatus === 'ready') {
          return {
            index,
            name: med.name,
            dosage: med.dosage,
            requestedQuantity: med.quantity,
            available: false,
            reason: 'Already being fulfilled',
          };
        }
        const match = await findCatalogMatch(med.name);
        const inStock = Number(match?.totalQuantity || 0);
        const requested = Number(med.quantity) || 0;
        const available = Boolean(match) && inStock >= requested && requested > 0;
        return {
          index,
          medicineId: match?._id || null,
          name: med.name,
          dosage: med.dosage,
          requestedQuantity: requested,
          unitPrice: match?.nextBatch?.price ?? null,
          inStock,
          available,
          reason: available ? null : !match ? 'Not carried by hospital pharmacy' : inStock < requested ? 'Not enough stock' : 'Invalid quantity',
        };
      })
    );

    res.json({
      prescriptionId: prescription._id,
      fulfillmentChoice: prescription.fulfillmentChoice,
      lines,
    });
  } catch (error) {
    console.error('Get Prescription Availability Error:', error);
    res.status(500).json({ error: 'Failed to check medicine availability' });
  }
};

export const createOrder = async (req, res) => {
  const claimedByMedicine = []; 
  try {
    const { prescriptionId, items, deliveryMethod, deliveryAddress, paymentMethod } = req.body;

    if (!prescriptionId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'A prescription and at least one medicine are required' });
    }
    if (!['pickup', 'delivery'].includes(deliveryMethod)) {
      return res.status(400).json({ error: "deliveryMethod must be 'pickup' or 'delivery'" });
    }

    
    
    const prescription = await Prescription.findOne({ _id: prescriptionId, patientId: req.user._id });
    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }
    if (prescription.fulfillmentChoice === 'outside') {
      return res.status(400).json({ error: 'You chose to get these medicines from an outside pharmacy. Change your preference first if you want to order from the hospital pharmacy.' });
    }

    
    
    const existingActive = await PharmacyOrder.findOne({
      prescriptionId,
      status: { $ne: 'cancelled' },
    });
    if (existingActive) {
      return res.status(409).json({ error: 'An order already exists for this prescription.', orderId: existingActive._id });
    }

    if (deliveryMethod === 'delivery') {
      const required = ['fullName', 'phone', 'addressLine1', 'city', 'state', 'postalCode'];
      const missing = required.filter((f) => !deliveryAddress?.[f]?.toString().trim());
      if (missing.length) {
        return res.status(400).json({ error: `Delivery address is incomplete: missing ${missing.join(', ')}` });
      }
    }

    const requestedByIndex = new Map(items.map((it) => [Number(it.medicineIndex), Number(it.quantity)]));

    const orderItems = [];
    const unavailableItems = [];
    let medicineSubtotal = 0;

    for (const [index, med] of prescription.medicines.entries()) {
      if (!requestedByIndex.has(index)) continue; 
      const requestedQty = requestedByIndex.get(index);

      if (med.dispenseStatus !== 'pending') {
        unavailableItems.push({ prescriptionMedicineIndex: index, name: med.name, dosage: med.dosage, requestedQuantity: requestedQty, reason: 'Already being fulfilled' });
        continue;
      }
      if (!Number.isFinite(requestedQty) || requestedQty <= 0 || requestedQty > med.quantity) {
        unavailableItems.push({ prescriptionMedicineIndex: index, name: med.name, dosage: med.dosage, requestedQuantity: requestedQty, reason: 'Invalid quantity requested' });
        continue;
      }

      const match = await findCatalogMatch(med.name);
      if (!match) {
        unavailableItems.push({ prescriptionMedicineIndex: index, name: med.name, dosage: med.dosage, requestedQuantity: requestedQty, reason: 'Not carried by hospital pharmacy' });
        continue;
      }

      
      
      const result = await atomicallyDecrementStock(match._id, requestedQty);
      if (result.error) {
        unavailableItems.push({ prescriptionMedicineIndex: index, name: med.name, dosage: med.dosage, requestedQuantity: requestedQty, reason: result.error });
        continue;
      }

      claimedByMedicine.push(...result.claims);
      const totalTaken = result.claims.reduce((s, c) => s + c.taken, 0);
      const amount = result.claims.reduce((s, c) => s + c.taken * c.price, 0);
      const unitPrice = totalTaken > 0 ? amount / totalTaken : 0;

      orderItems.push({
        prescriptionMedicineIndex: index,
        medicineId: match._id,
        name: med.name,
        dosage: med.dosage,
        quantity: totalTaken,
        unitPrice,
        amount,
        stockClaims: result.claims.map((c) => ({ batchId: c.batchId, taken: c.taken })),
      });
      medicineSubtotal += amount;
    }

    if (orderItems.length === 0) {
      return res.status(400).json({ error: 'None of the requested medicines could be fulfilled right now.', unavailableItems });
    }

    const deliveryFee = calculateDeliveryFee(deliveryMethod, medicineSubtotal);
    const finalTotal = medicineSubtotal + deliveryFee;

    let orderNumber = generateOrderNumber();
    while (await PharmacyOrder.findOne({ orderNumber })) {
      orderNumber = generateOrderNumber();
    }

    const order = await PharmacyOrder.create({
      orderNumber,
      prescriptionId: prescription._id,
      appointmentId: prescription.appointmentId,
      patientId: req.user._id,
      items: orderItems,
      unavailableItems,
      medicineSubtotal,
      deliveryMethod,
      deliveryFee,
      finalTotal,
      deliveryAddress: deliveryMethod === 'delivery' ? deliveryAddress : null,
      paymentMethod: paymentMethod || 'cash',
      status: 'pending',
      statusHistory: [{ status: 'pending', at: new Date(), by: null }],
    });

    
    
    
    
    
    
    for (const item of orderItems) {
      prescription.medicines[item.prescriptionMedicineIndex].dispenseStatus = 'ready';
      prescription.medicines[item.prescriptionMedicineIndex].dispensedQuantity = item.quantity;
      prescription.medicines[item.prescriptionMedicineIndex].dispensedPrice = item.unitPrice;
    }
    if (prescription.fulfillmentChoice !== 'hospital') {
      prescription.fulfillmentChoice = 'hospital';
      prescription.fulfillmentChosenAt = new Date();
    }
    await prescription.save();

    logAudit(req, 'PHARMACY_ORDER_CREATED', 'PharmacyOrder', order._id, {
      prescriptionId,
      deliveryMethod,
      itemCount: orderItems.length,
      unavailableCount: unavailableItems.length,
    });

    notify(req, 'pharmacy', 'pharmacy-order-created', toNotificationPayload(order));
    notify(req, `patient-${req.user._id}`, 'pharmacy-order-status', toNotificationPayload(order));

    res.status(201).json({ message: 'Order placed', order });
  } catch (error) {
    
    
    if (claimedByMedicine.length) {
      await compensateStock(claimedByMedicine);
    }
    console.error('Create Pharmacy Order Error:', error);
    res.status(500).json({ error: 'Failed to place order' });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const orders = await PharmacyOrder.find({ patientId: req.user._id })
      .populate('prescriptionId', 'notes')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Get My Pharmacy Orders Error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    
    
    if (req.user.role === 'patient') filter.patientId = req.user._id;

    const order = await PharmacyOrder.findOne(filter)
      .populate('prescriptionId')
      .populate('patientId', 'name phone')
      .populate('appointmentId', 'appointmentCode');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (error) {
    console.error('Get Pharmacy Order Error:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

export const updateOrderAddress = async (req, res) => {
  try {
    const order = await PharmacyOrder.findOne({ _id: req.params.id, patientId: req.user._id });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.deliveryMethod !== 'delivery') {
      return res.status(400).json({ error: 'This order is for pickup and has no delivery address' });
    }
    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'This order has already been confirmed and its address can no longer be changed' });
    }

    const { deliveryAddress } = req.body;
    const required = ['fullName', 'phone', 'addressLine1', 'city', 'state', 'postalCode'];
    const missing = required.filter((f) => !deliveryAddress?.[f]?.toString().trim());
    if (missing.length) {
      return res.status(400).json({ error: `Delivery address is incomplete: missing ${missing.join(', ')}` });
    }

    order.deliveryAddress = deliveryAddress;
    await order.save();

    logAudit(req, 'PHARMACY_ORDER_ADDRESS_UPDATED', 'PharmacyOrder', order._id);

    res.json({ message: 'Delivery address updated', order });
  } catch (error) {
    console.error('Update Pharmacy Order Address Error:', error);
    res.status(500).json({ error: 'Failed to update delivery address' });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const order = await PharmacyOrder.findOne({ _id: req.params.id, patientId: req.user._id });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (!isValidTransition(order.deliveryMethod, order.status, 'cancelled')) {
      return res.status(400).json({ error: `Order cannot be cancelled from its current status (${order.status}).` });
    }

    await releaseOrderStock(order);
    order.status = 'cancelled';
    order.cancelReason = req.body?.reason || 'Cancelled by patient';
    order.statusHistory.push({ status: 'cancelled', at: new Date(), by: null });
    await order.save();

    logAudit(req, 'PHARMACY_ORDER_CANCELLED', 'PharmacyOrder', order._id, { by: 'patient' });
    notify(req, 'pharmacy', 'pharmacy-order-status', toNotificationPayload(order));

    res.json({ message: 'Order cancelled', order });
  } catch (error) {
    console.error('Cancel Pharmacy Order Error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
};

async function releaseOrderStock(order) {
  const claims = order.items.flatMap((item) =>
    item.stockClaims.map((c) => ({ medicineId: item.medicineId, batchId: c.batchId, taken: c.taken }))
  );
  if (claims.length) await compensateStock(claims);

  
  
  
  const prescription = await Prescription.findById(order.prescriptionId);
  if (prescription) {
    for (const item of order.items) {
      const line = prescription.medicines[item.prescriptionMedicineIndex];
      if (line && line.dispenseStatus === 'ready') {
        line.dispenseStatus = 'pending';
        line.dispensedQuantity = 0;
        line.dispensedPrice = 0;
      }
    }
    await prescription.save();
  }
}

export const getAllOrders = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.deliveryMethod) filter.deliveryMethod = req.query.deliveryMethod;

    const orders = await PharmacyOrder.find(filter)
      .populate('patientId', 'name phone')
      .populate('appointmentId', 'appointmentCode')
      .sort({ createdAt: -1 })
      .limit(200);
    res.json(orders);
  } catch (error) {
    console.error('Get All Pharmacy Orders Error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { status: nextStatus } = req.body;
    const order = await PharmacyOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (!isValidTransition(order.deliveryMethod, order.status, nextStatus)) {
      return res.status(400).json({
        error: `Cannot move a ${order.deliveryMethod} order from '${order.status}' to '${nextStatus}'.`,
      });
    }

    if (nextStatus === 'cancelled' || nextStatus === 'failed-delivery') {
      if (nextStatus === 'cancelled') {
        await releaseOrderStock(order);
      }
      if (nextStatus === 'failed-delivery') {
        order.cancelReason = req.body?.reason || '';
      } else {
        order.cancelReason = req.body?.reason || 'Cancelled by pharmacy';
      }
    }

    
    
    
    
    if (nextStatus === 'dispensed' || nextStatus === 'delivered') {
      const prescription = await Prescription.findById(order.prescriptionId);
      if (prescription) {
        for (const item of order.items) {
          const line = prescription.medicines[item.prescriptionMedicineIndex];
          if (line) {
            line.dispenseStatus = 'dispensed';
            line.dispensedAt = new Date();
          }
        }
        await prescription.save();
      }
    }

    order.status = nextStatus;
    order.statusHistory.push({ status: nextStatus, at: new Date(), by: req.user._id });
    if (TERMINAL_STATUSES.has(nextStatus) && nextStatus !== 'cancelled') {
      
      if (order.paymentMethod === 'cash' && order.paymentStatus === 'unpaid') {
        order.paymentStatus = 'paid';
        order.paidAt = new Date();
      }
    }
    await order.save();

    logAudit(req, 'PHARMACY_ORDER_STATUS_CHANGED', 'PharmacyOrder', order._id, { status: nextStatus });
    notify(req, `patient-${order.patientId}`, 'pharmacy-order-status', toNotificationPayload(order));
    notify(req, 'pharmacy', 'pharmacy-order-status', toNotificationPayload(order));

    res.json({ message: 'Order updated', order });
  } catch (error) {
    console.error('Update Pharmacy Order Status Error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

export const markOrderPaid = async (req, res) => {
  try {
    const order = await PharmacyOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ error: 'This order is already marked as paid' });
    }
    order.paymentStatus = 'paid';
    order.paidAt = new Date();
    await order.save();

    logAudit(req, 'PHARMACY_ORDER_MARKED_PAID', 'PharmacyOrder', order._id);
    res.json({ message: 'Order marked as paid', order });
  } catch (error) {
    console.error('Mark Pharmacy Order Paid Error:', error);
    res.status(500).json({ error: 'Failed to update payment status' });
  }
};
