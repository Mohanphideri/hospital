import Medicine from '../models/Medicine.js';

const MAX_STOCK_RETRY_ATTEMPTS = 5;

export async function compensateStock(claims) {
  for (const claim of claims) {
    await Medicine.updateOne(
      { _id: claim.medicineId, 'batches._id': claim.batchId },
      { $inc: { 'batches.$.quantity': claim.taken } }
    ).catch((err) =>
      console.error(
        'CRITICAL: stock compensation failed after a partial claim - manual inventory review needed:',
        claim,
        err.message
      )
    );
  }
}

export async function atomicallyDecrementStock(medicineId, neededQuantity) {
  for (let attempt = 0; attempt < MAX_STOCK_RETRY_ATTEMPTS; attempt++) {
    const medicine = await Medicine.findById(medicineId);
    if (!medicine) {
      return { error: 'Linked medicine not found in inventory', status: 404 };
    }

    const now = new Date();
    const usableBatches = medicine.batches
      .filter((b) => b.expiryDate >= now && b.quantity > 0)
      .sort((a, b) => a.expiryDate - b.expiryDate);
    const totalAvailable = usableBatches.reduce((sum, b) => sum + b.quantity, 0);

    if (totalAvailable < neededQuantity) {
      return {
        error: `Not enough stock: need ${neededQuantity}, only ${totalAvailable} available across unexpired batches`,
        status: 400,
      };
    }

    let remaining = neededQuantity;
    const claims = [];
    let lostRace = false;

    for (const batch of usableBatches) {
      if (remaining <= 0) break;
      const take = Math.min(batch.quantity, remaining);

      const result = await Medicine.updateOne(
        { _id: medicineId, 'batches._id': batch._id, 'batches.quantity': { $gte: take } },
        { $inc: { 'batches.$.quantity': -take } }
      );

      if (result.modifiedCount !== 1) {
        
        
        
        lostRace = true;
        break;
      }

      claims.push({ medicineId, batchId: batch._id, taken: take, price: batch.price });
      remaining -= take;
    }

    if (!lostRace && remaining === 0) {
      return { claims };
    }

    if (claims.length) {
      await compensateStock(claims);
    }
    
  }

  return {
    error: 'Stock levels changed too many times while processing this request - please try again.',
    status: 409,
  };
}
