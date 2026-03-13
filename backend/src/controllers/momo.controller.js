import crypto from 'crypto';
import https from 'https';
import Payment from '../models/Payment.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import OrderDetail from '../models/OrderDetail.js';
import Ticket from '../models/Ticket.js';
import ShowSeat from '../models/ShowSeat.js';
import Concert from '../models/Concert.js';
import mailer from '../utils/mailer.js';

const config = {
    accessKey: 'F8BBA842ECF85',
    secretKey: 'K951B6PE1waDMi640xX08PD3vg6EkVlz',
    partnerCode: 'MOMO',
    redirectUrl: 'http://localhost:5173/payment/success',
    ipnUrl: 'https://webhook.site/b3088a6a-2d17-4f8d-a383-71389a6c600b',
    requestType: 'payWithMethod',
    hostname: 'test-payment.momo.vn',
    path: '/v2/gateway/api/create'
};

/**
 * @desc MoMo IPN (callback) handler
 * MoMo will POST JSON to this endpoint when transaction status changes.
 * This handler tries to find the Payment by MoMo orderId and mark it success/failed.
 */
export const momoIPN = async (req, res) => {
    try {
        const payload = req.body || {};
        console.log('MoMo IPN received:', payload);

        // Common fields MoMo may send: orderId, requestId, resultCode, transId, transStatus
        const momoOrderId = payload.orderId || payload.requestId || payload.transId || payload.data?.orderId;
        const resultCode = (payload.resultCode !== undefined) ? payload.resultCode : (payload.result || {}).resultCode;
        const transStatus = payload.transStatus || payload.status || (payload.result || {}).transStatus;

        if (!momoOrderId) {
            console.warn('MoMo IPN: no orderId in payload');
            return res.status(400).json({ success: false, message: 'orderId missing' });
        }

        const payment = await Payment.findOne({ trans_id: momoOrderId }).populate('order');
        if (!payment) {
            console.warn('MoMo IPN: payment record not found for', momoOrderId);
            return res.status(200).json({ success: false, message: 'payment not found' });
        }

        // Treat resultCode === 0 or transStatus === 'SUCCESS' as success
        const isSuccess = (String(resultCode) === '0') || (String(transStatus).toUpperCase() === 'SUCCESS');
        if (isSuccess) {
            try {
                await payment.markSuccess(payload);

                // Generate tickets and mark show seats as SOLD (pass req so we can emit socket events)
                try {
                    await generateTicketsForOrder(payment.order._id, req);
                } catch (e) {
                    console.error('Failed generating tickets after MoMo IPN:', e);
                }

                // Persist phone to user profile if provided in order snapshot
                try {
                    await persistPhoneFromOrder(payment.order._id);
                } catch (e) {
                    console.error('Failed persisting phone after MoMo IPN:', e);
                }

                // Send confirmation email (best-effort)
                try {
                    await mailer.sendOrderConfirmation(payment.order._id);
                } catch (e) {
                    console.error('Failed to send confirmation email after MoMo IPN:', e);
                }
            } catch (e) {
                console.error('Failed to mark payment success:', e);
            }
            return res.json({ success: true, message: 'OK' });
        }

        // Non-success: mark failed
        try {
            await payment.markFailed(payload);
        } catch (e) {
            console.error('Failed to mark payment failed:', e);
        }
        return res.json({ success: true, message: 'Processed' });
    } catch (err) {
        console.error('momoIPN error', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Query path for MoMo order status (test gateway)
config.queryPath = '/v2/gateway/api/query';

// Internal helper: send request to MoMo gateway
const sendMoMoRequest = (amount, orderInfo, clientRef = null, redirectUrlOverride = null) => {
    return new Promise((resolve, reject) => {
        const orderId = clientRef ? `${config.partnerCode}_${clientRef}` : config.partnerCode + Date.now();
        const requestId = orderId;
        const extraData = '';
        const orderGroupId = '';
        const autoCapture = true;
        const lang = 'vi';

        const redirectUrlToUse = redirectUrlOverride || config.redirectUrl;
        const rawSignature = `accessKey=${config.accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${config.ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${config.partnerCode}&redirectUrl=${redirectUrlToUse}&requestId=${requestId}&requestType=${config.requestType}`;

        const signature = crypto.createHmac('sha256', config.secretKey).update(rawSignature).digest('hex');

        const requestBody = JSON.stringify({
            partnerCode: config.partnerCode,
            partnerName: 'Test Store',
            storeId: 'MomoTestStore',
            requestId: requestId,
            amount: amount,
            orderId: orderId,
            orderInfo: orderInfo,
            redirectUrl: redirectUrlToUse,
            ipnUrl: config.ipnUrl,
            lang: lang,
            requestType: config.requestType,
            autoCapture: autoCapture,
            extraData: extraData,
            orderGroupId: orderGroupId,
            signature: signature
        });

        const options = {
            hostname: config.hostname,
            port: 443,
            path: config.path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestBody)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(requestBody);
        req.end();
    });
};

// Query MoMo for an orderId status
const queryMoMoOrder = (orderId) => {
    return new Promise((resolve, reject) => {
        const requestId = orderId;
        const rawSignature = `accessKey=${config.accessKey}&orderId=${orderId}&partnerCode=${config.partnerCode}&requestId=${requestId}`;
        const signature = crypto.createHmac('sha256', config.secretKey).update(rawSignature).digest('hex');

        const requestBody = JSON.stringify({
            partnerCode: config.partnerCode,
            requestId,
            orderId,
            signature
        });

        const options = {
            hostname: config.hostname,
            port: 443,
            path: config.queryPath,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestBody)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(requestBody);
        req.end();
    });
};

// Express handler: accepts POST /api/payment
export const createPayment = async (req, res, next) => {
    try {
        const body = req.body || {};
        // If client provided an existing orderId, use it. Otherwise create a new Order.
        const {
            orderId,
            amount,
            orderInfo,
            customer,
            concertId,
            subtotal,
            service_fee,
            discount_amount,
            total_amount,
            customer_info,
            performanceId
        } = body;

        let order = null;

        if (orderId) {
            order = await Order.findById(orderId);
            if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        } else {
            if (!concertId || (total_amount === undefined || total_amount === null)) {
                return res.status(400).json({ success: false, message: 'concertId and total_amount are required to create an order' });
            }

            // Resolve customer reference: accept string id, object with _id, or lookup by email
            let customerRef = null;
            if (customer) {
                if (typeof customer === 'string') customerRef = customer;
                else if (customer._id) customerRef = customer._id;
                else if (customer.id) customerRef = customer.id;
                else if (customer.email) {
                    const existing = await User.findOne({ email: customer.email.toLowerCase() });
                    if (existing) customerRef = existing._id;
                }
            }

            // If request is authenticated (protect middleware), prefer req.user
            if (!customerRef && req.user && req.user._id) {
                customerRef = req.user._id;
            }

            if (!customerRef) {
                return res.status(400).json({ success: false, message: 'Customer must be a valid existing user or you must be signed in' });
            }

            // If concert has multiple performances, require and validate performanceId
            if (concertId) {
                const concertDocForValidate = await Concert.findById(concertId);
                if (concertDocForValidate && Array.isArray(concertDocForValidate.performances) && concertDocForValidate.performances.length > 0) {
                    if (!performanceId) {
                        return res.status(400).json({ success: false, message: 'performanceId is required for this event' });
                    }
                    const perf = concertDocForValidate.performances.id ? concertDocForValidate.performances.id(performanceId) : (concertDocForValidate.performances.find(p => String(p._id) === String(performanceId)));
                    if (!perf) return res.status(404).json({ success: false, message: 'Performance not found for this concert' });
                    // compute end datetime
                    const buildDt = (dStr, timeStr) => { const d = new Date(dStr); if (!timeStr) return d; const parts = String(timeStr).split(':').map(Number); d.setHours(parts[0]||0, parts[1]||0, 0, 0); return d; };
                    const endDt = buildDt(perf.date, perf.endTime || perf.startTime);
                    if (endDt < new Date()) return res.status(400).json({ success: false, message: 'Selected performance has already passed' });
                }
            }

            // generate order code to satisfy schema 'required' validation
            const genCode = 'ORD' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(3).toString('hex').toUpperCase();
            order = new Order({
                customer: customerRef,
                concert: concertId,
                performance: performanceId,
                code: genCode,
                subtotal: subtotal || 0,
                service_fee: service_fee || 0,
                discount_amount: discount_amount || 0,
                total_amount: total_amount,
                customer_info: customer_info || {},
                payment_method: 'MOMO'
            });

            await order.save();

            // If seatIds were provided (client included selected seats), create tickets and order details now
            const seatIds = body.seatIds || body.showSeatIds || body.selectedSeats || null;
            if (seatIds && Array.isArray(seatIds) && seatIds.length > 0) {
                // Fetch showSeats and attempt to ensure they are locked for this customer
                // load seats
                let showSeats = await ShowSeat.find({ _id: { $in: seatIds }, concert: concertId }).populate('seat ticketClass');
                if (showSeats.length !== seatIds.length) {
                    // Some seats invalid — fail fast
                    return res.status(400).json({ success: false, message: 'Some selected seats are not valid for this concert. Please reselect.' });
                }

                // Attempt to lock any AVAILABLE seats atomically
                const seatsToLock = showSeats.filter(ss => ss.status === 'AVAILABLE');
                const failedToLock = [];
                for (const ss of seatsToLock) {
                    const updated = await ShowSeat.findOneAndUpdate(
                        { _id: ss._id, status: 'AVAILABLE' },
                        { status: 'LOCKED', locked_by: customerRef, lock_expire_time: new Date(Date.now() + 10 * 60 * 1000) },
                        { new: true }
                    ).populate('seat ticketClass');
                    if (!updated) failedToLock.push(ss._id.toString());
                }

                // Refresh showSeats
                showSeats = await ShowSeat.find({ _id: { $in: seatIds }, concert: concertId }).populate('seat ticketClass');

                // Ensure seats are locked by this customer
                const lockedByCustomer = showSeats.filter(ss => ss.status === 'LOCKED' && ss.locked_by && ss.locked_by.toString() === customerRef.toString());
                if (lockedByCustomer.length !== seatIds.length) {
                    const notLocked = seatIds.filter(id => !lockedByCustomer.find(s => s._id.toString() === id.toString()));
                    return res.status(400).json({ success: false, message: 'Some seats are no longer available for reservation', data: { notLocked } });
                }

                // Read concert title for ticket snapshots
                const concertDoc = await Concert.findById(concertId);
                const concertTitle = concertDoc?.title || '';

                // Create tickets and order details for each seat (reservation)
                for (const showSeat of showSeats) {
                    // create ticket
                    const ticket = await Ticket.create({
                        showSeat: showSeat._id,
                        ticketClass: showSeat.ticketClass?._id,
                        concert: concertId,
                        performance: performanceId,
                        customer: customerRef,
                        ticket_code: 'TKT' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(4).toString('hex').toUpperCase(),
                        qr_hash: crypto.createHash('sha256').update(Date.now().toString() + showSeat._id.toString()).digest('hex'),
                        status: 'VALID'
                    });
                    await OrderDetail.create({
                        order: order._id,
                        ticket: ticket._id,
                        price_snapshot: showSeat.price || 0,
                        ticket_info: {
                            concert_title: concertTitle,
                            ticket_class: showSeat.ticketClass?.name,
                            seat_label: showSeat.seat?.label,
                            zone_name: showSeat.ticketClass?.zone?.name
                        }
                    });
                }
            }
        }

        // Use order._id as clientRef so MoMo orderId can be mapped back
        // If a MoMo Payment record already exists for this order and is pending,
        // return its payUrl to avoid creating duplicate MoMo orderId which the gateway will reject.
        const existingPayment = await Payment.findOne({ order: order._id, method: 'MOMO' });
        if (existingPayment) {
            // If already completed, refuse to create a new one
            if (existingPayment.status === 'COMPLETED' || existingPayment.status === 'SUCCESS') {
                return res.status(400).json({ success: false, message: 'Order already paid' });
            }
            // If pending, try to return stored payUrl/trans id
            const existingPayUrl = existingPayment.gateway_response && (existingPayment.gateway_response.payUrl || existingPayment.gateway_response.payurl || existingPayment.gateway_response.pay_url);
            return res.json({ success: true, data: { payUrl: existingPayUrl || null, momoOrderId: existingPayment.trans_id, localOrderId: order._id } });
        }
        const moMoAmount = amount || total_amount || order.total_amount;
        if (!moMoAmount) return res.status(400).json({ success: false, message: 'amount is required' });

        let result;
        try {
            // Build a redirect URL that points back to the frontend success page and includes localOrderId
            const redirectUrlForThisOrder = `${config.redirectUrl}${config.redirectUrl.includes('?') ? '&' : '?'}localOrderId=${order._id}`;
            result = await sendMoMoRequest(moMoAmount, orderInfo || `Order ${order.code}`, order._id.toString(), redirectUrlForThisOrder);
        } catch (err) {
            console.error('sendMoMoRequest error:', err);
            return res.status(502).json({ success: false, message: 'MoMo request failed', error: err.message || err });
        }

        // Determine MoMo order id
        const momoOrderId = result && (result.orderId || result.requestId || (result.result && result.result.orderId)) || `${config.partnerCode}_${order._id}`;

        // If gateway returned non-success, surface it
        if (result && typeof result.resultCode !== 'undefined' && result.resultCode !== 0) {
            console.error('MoMo gateway returned error:', result);
            return res.status(502).json({ success: false, message: result.message || 'MoMo gateway error', data: result });
        }

        // Create payment record linked to order
        const payment = new Payment({
            order: order._id,
            amount: moMoAmount,
            method: 'MOMO',
            status: 'PENDING',
            trans_id: momoOrderId,
            gateway_response: result
        });
        await payment.save();

        return res.json({ success: true, data: { payUrl: result.payUrl || result.payurl || null, momoOrderId, localOrderId: order._id } });
    } catch (err) {
        console.error('MoMo createPayment error', err);
        return res.status(500).json({ success: false, message: 'MoMo request failed', error: err.message });
    }
};

// Remove old module.exports line

/**
 * @desc Check MoMo payment status for an orderId
 * @route POST /api/payment/momo/check-status
 * @access Public (used by frontend polling)
 */
export const checkMoMoStatus = async (req, res) => {
    try {
        const { orderId, localOrderId } = req.body || {};
        if (!orderId && !localOrderId) return res.status(400).json({ success: false, message: 'orderId or localOrderId required' });

        // Try to find payment by trans_id first (if orderId provided), otherwise by local order reference
        let payment = null;
        if (orderId) payment = await Payment.findOne({ trans_id: orderId }).populate('order');
        if (!payment && localOrderId) payment = await Payment.findOne({ order: localOrderId }).populate('order');
        // If we don't have a DB record, or the record isn't successful, query MoMo directly
        if (!payment) {
            // No payment record in DB. If we have a localOrderId, construct the expected MoMo orderId.
            let mangoQueryId = orderId;
            if (!mangoQueryId && localOrderId) mangoQueryId = `${config.partnerCode}_${localOrderId}`;
            if (!mangoQueryId) return res.status(404).json({ success: false, message: 'Payment not found' });

            // Try querying MoMo gateway
            try {
                const momoResp = await queryMoMoOrder(mangoQueryId);
                const isPaid = momoResp && (momoResp.resultCode === 0 || momoResp.transStatus === 'SUCCESS');
                // If MoMo reports paid and we have a localOrderId, create Payment record and finalize order
                if (isPaid && localOrderId) {
                    try {
                        // Create a Payment record linked to the order
                        const payment = new Payment({
                            order: localOrderId,
                            amount: momoResp.amount || 0,
                            method: 'MOMO',
                            status: 'PENDING',
                            trans_id: mangoQueryId,
                            gateway_response: momoResp
                        });
                        await payment.save();

                        // Mark success (updates order status) and generate tickets
                        await payment.markSuccess(momoResp || {});
                        try {
                            await generateTicketsForOrder(payment.order, req);
                        } catch (e) {
                            console.error('Failed generating tickets after MoMo query (no prior payment):', e);
                        }
                        try {
                            await persistPhoneFromOrder(payment.order);
                        } catch (e) {
                            console.error('Failed persisting phone after MoMo query (no prior payment):', e);
                        }
                    } catch (e) {
                        console.error('Error creating payment after MoMo query:', e);
                    }
                }
                return res.json({ success: isPaid, message: isPaid ? 'Success.' : 'Pending', data: { momo: momoResp || null } });
            } catch (err) {
                console.error('MoMo query error (no payment record)', err);
                return res.status(500).json({ success: false, message: 'Error querying MoMo' });
            }
        }

        // If payment exists but isn't marked success, consult MoMo as a fallback
        const status = payment.status || 'PENDING';
        const alreadyPaid = (status === 'SUCCESS' || status === 'COMPLETED');
        if (!alreadyPaid) {
            try {
                const momoQueryId = payment.trans_id || (localOrderId ? `${config.partnerCode}_${localOrderId}` : orderId);
                const momoResp = await queryMoMoOrder(momoQueryId);
                const isPaid = momoResp && (momoResp.resultCode === 0 || momoResp.transStatus === 'SUCCESS');
                if (isPaid) {
                    // Update existing payment record and order status
                    try {
                        await payment.markSuccess(momoResp || {});
                    } catch (e) {
                        console.warn('Failed to mark payment success in DB', e);
                    }

                    // Generate tickets and persist phone after marking payment success
                    try {
                        await generateTicketsForOrder(payment.order._id, req);
                    } catch (e) {
                        console.error('Failed generating tickets after MoMo query:', e);
                    }
                    try {
                        await persistPhoneFromOrder(payment.order._id);
                    } catch (e) {
                        console.error('Failed persisting phone after MoMo query:', e);
                    }

                    // refetch populated payment
                    const updated = await Payment.findById(payment._id).populate('order');
                    return res.json({ success: true, message: 'Success.', data: { payment: {
                        id: updated._id,
                        status: updated.status,
                        amount: updated.amount,
                        paidAt: updated.pay_time || null,
                        trans_id: updated.trans_id
                    }, order: updated.order ? { id: updated.order._id, status: updated.order.status, code: updated.order.code } : null } });
                }

                return res.json({ success: false, message: 'Pending', data: { momo: momoResp || null } });
            } catch (err) {
                console.error('MoMo query error (existing payment)', err);
                return res.status(500).json({ success: false, message: 'Error querying MoMo' });
            }
        }

        // Already paid in DB
        return res.json({
            success: true,
            message: 'Success.',
            data: {
                payment: {
                    id: payment._id,
                    status: payment.status,
                    amount: payment.amount,
                    paidAt: payment.pay_time || null,
                    trans_id: payment.trans_id
                },
                order: payment.order ? { id: payment.order._id, status: payment.order.status, code: payment.order.code } : null
            }
        });
    } catch (err) {
        console.error('checkMoMoStatus error', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

// Helper: generate tickets for an order (mark show seats sold if tickets exist)
async function generateTicketsForOrder(orderId, req = null) {
    try {
        const details = await OrderDetail.find({ order: orderId }).populate({ path: 'ticket', populate: { path: 'showSeat' } });
        const seatIdsByConcert = {};
        for (const d of details) {
            if (d.ticket && d.ticket.showSeat) {
                const showSeat = d.ticket.showSeat;
                const showSeatId = showSeat._id ? showSeat._id : showSeat;
                await ShowSeat.findByIdAndUpdate(showSeatId, { status: 'SOLD', lock_expire_time: null, locked_by: null });

                const concertId = showSeat.concert ? (showSeat.concert._id || showSeat.concert) : null;
                if (concertId) {
                    seatIdsByConcert[concertId] = seatIdsByConcert[concertId] || [];
                    seatIdsByConcert[concertId].push(showSeatId.toString());
                }
            }
        }

        // Emit socket updates per concert so connected clients update seat chart
        if (req && req.app && typeof req.app.get === 'function') {
            const io = req.app.get('io');
            if (io) {
                for (const [concertId, seatIds] of Object.entries(seatIdsByConcert)) {
                    io.to(`concert:${concertId}`).emit('seats-status-changed', { seatIds, status: 'SOLD' });
                }
            }
        }
    } catch (e) {
        console.error('generateTicketsForOrder error:', e);
        throw e;
    }
}

// Helper: persist phone from order.customer_info -> user.phone
async function persistPhoneFromOrder(orderId) {
    try {
        const fullOrder = await Order.findById(orderId).populate('customer');
        const phoneFromOrder = fullOrder?.customer_info && fullOrder.customer_info.phone;
        if (phoneFromOrder && fullOrder && fullOrder.customer && fullOrder.customer._id) {
            const existingPhone = fullOrder.customer.phone || '';
            if (!existingPhone || existingPhone !== phoneFromOrder) {
                await User.findByIdAndUpdate(fullOrder.customer._id, { phone: phoneFromOrder });
            }
        }
    } catch (e) {
        console.error('persistPhoneFromOrder error:', e);
        throw e;
    }
}