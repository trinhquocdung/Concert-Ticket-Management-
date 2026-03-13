import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import Order from '../models/Order.js';
import OrderDetail from '../models/OrderDetail.js';
import Ticket from '../models/Ticket.js';
import User from '../models/User.js';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || (SMTP_USER || 'no-reply@quickshow.local');

function createTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('SMTP not fully configured. Emails will not be sent.');
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT, 10),
    secure: parseInt(SMTP_PORT, 10) === 465, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
}

async function generateTicketPdfBuffer(orderId) {
  const order = await Order.findById(orderId)
    .populate({ path: 'concert', populate: { path: 'venue' } })
    .populate('customer');
  const orderDetails = await OrderDetail.find({ order: orderId }).populate({ path: 'ticket', populate: { path: 'showSeat', populate: { path: 'seat' } } });

  const doc = new PDFDocument({ size: 'A4', margin: 36 });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const endPromise = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  // Header
  doc.fontSize(18).text('QuickShow - E-Ticket', { align: 'center' });
  doc.moveDown();

  doc.fontSize(12).text(`Order: ${order.code}`);
  doc.text(`Customer: ${order.customer?.fullName || order.customer_info?.fullName || 'N/A'}`);
  doc.text(`Email: ${order.customer?.email || order.customer_info?.email || 'N/A'}`);
  doc.text(`Total: ${order.total_amount} VND`);
  doc.moveDown();

  for (const detail of orderDetails) {
    const ticket = await Ticket.findById(detail.ticket._id).populate({ path: 'showSeat', populate: [{ path: 'seat' }, { path: 'ticketClass' }] });
    // Determine concert date/time for this ticket.
    // Prefer the ticket-level `performance` (if present), then fall back to order.performance,
    // and finally to concert.start_time. This ensures tickets created after payment
    // (e.g. via IPN) still use the specific performance the ticket references.
    let concertDate = null;
    try {
      // 1) Prefer ticket.performance when available
      if (ticket && ticket.performance && order.concert && Array.isArray(order.concert.performances)) {
        const perf = order.concert.performances.find(p => String(p._id) === String(ticket.performance));
        if (perf) {
          concertDate = new Date(perf.date);
          if (perf.startTime) {
            const parts = String(perf.startTime).split(':').map(Number);
            concertDate.setHours(parts[0] || 0, parts[1] || 0, 0, 0);
          }
        }
      }

      // 2) Fallback to order.performance
      if (!concertDate && order.performance && order.concert && Array.isArray(order.concert.performances)) {
        const perf2 = order.concert.performances.find(p => String(p._id) === String(order.performance));
        if (perf2) {
          concertDate = new Date(perf2.date);
          if (perf2.startTime) {
            const parts = String(perf2.startTime).split(':').map(Number);
            concertDate.setHours(parts[0] || 0, parts[1] || 0, 0, 0);
          }
        }
      }
    } catch (e) {
      concertDate = null;
    }
    // 3) Final fallback: concert start_time
    if (!concertDate) concertDate = order.concert?.start_time ? new Date(order.concert.start_time) : null;

    doc.fontSize(16).text(`${order.concert?.title || 'Concert'}`, { align: 'left', underline: true });
    doc.moveDown(0.25);
    doc.fontSize(12).text(`Order: ${order.code}`);
    doc.text(`Ticket: ${ticket.ticket_code}`);
    doc.moveDown(0.5);

    // Concert details
    doc.fontSize(11).text(`Date: ${concertDate ? concertDate.toLocaleDateString('vi-VN') : 'TBA'} ${concertDate ? concertDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}`);
    doc.text(`Venue: ${order.concert?.venue?.name || order.concert?.venue || 'TBA'}`);
    doc.moveDown(0.3);

    // Ticket specifics
    const seatLabel = ticket.showSeat?.seat?.label || detail.ticket_info?.seat_label || '';
    const ticketClass = (ticket.showSeat && ticket.showSeat.ticketClass && ticket.showSeat.ticketClass.name) || detail.ticket_info?.ticket_class || 'General';
    const section = ticket.showSeat?.ticketClass?.zone?.name || detail.ticket_info?.zone_name || '';

    doc.text(`Ticket Type: ${ticketClass}`);
    doc.text(`Section: ${section || 'General'}`);
    doc.text(`Seat: ${seatLabel || 'General Admission'}`);
    doc.text(`Customer: ${order.customer?.fullName || order.customer_info?.fullName || 'N/A'}`);
    doc.text(`Price: ${detail.price_snapshot || detail.price || order.total_amount} VND`);

    // Generate QR code as data URL then embed
    try {
      const qrData = ticket.generateQR().qr_data;
      const dataUrl = await QRCode.toDataURL(qrData);
      const base64 = dataUrl.split(',')[1];
      const imgBuffer = Buffer.from(base64, 'base64');
      // Right side: QR
      const startX = doc.x;
      const currentY = doc.y;
      doc.image(imgBuffer, doc.page.width - 160 - doc.page.margins.right, currentY, { fit: [160, 160] });
      doc.moveDown(6);
    } catch (e) {
      console.error('Failed to generate QR for ticket', ticket._id, e);
    }

    doc.moveDown();
    doc.addPage();
  }

  // Terms & Conditions page
  doc.fontSize(12).text('Terms & Conditions', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10).text('1. This ticket is valid only for the event and seat printed on the ticket.');
  doc.moveDown(0.2);
  doc.text('2. Please bring a valid photo ID along with this ticket for verification at the entrance.');
  doc.moveDown(0.2);
  doc.text('3. Tickets are non-transferable and non-refundable unless stated otherwise.');
  doc.moveDown(0.2);
  doc.text('4. Organizer reserves the right to refuse entry for security or safety reasons.');
  doc.moveDown(0.2);
  doc.text('5. By entering the venue you consent to being photographed or filmed for promotional use.');

  doc.end();
  return endPromise;
}

async function sendOrderConfirmation(orderId) {
  try {
    const order = await Order.findById(orderId).populate('customer');
    if (!order) return;

    const to = order.customer_info?.email || order.customer?.email;
    if (!to) {
      console.warn('Order has no email to send to:', orderId);
      return;
    }

    const transporter = createTransporter();
    const pdfBuffer = await generateTicketPdfBuffer(orderId);

    const mailOptions = {
      from: FROM_EMAIL,
      to,
      subject: `Your QuickShow Tickets — Order ${order.code}`,
      text: `Thank you for your purchase. Attached are your e-tickets for order ${order.code}.`,
      html: `<p>Thank you for your purchase. Attached are your e-tickets for order <strong>${order.code}</strong>.</p>`,
      attachments: [
        {
          filename: `${order.code}-tickets.pdf`,
          content: pdfBuffer
        }
      ]
    };

    if (!transporter) {
      console.info('SMTP not configured — skipping send. PDF generated for order', orderId);
      return;
    }

    await transporter.sendMail(mailOptions);
    console.info('Sent ticket email for order', orderId);
  } catch (error) {
    console.error('Failed to send order confirmation', error);
  }
}

export default {
  sendOrderConfirmation,
  generateTicketPdfBuffer
};
