/**
 * QuickShow Ticket - Models Index (ES Modules)
 * 
 * Based on ERD with 13 entities
 * 
 * ENTITY RELATIONSHIPS (UPDATED):
 * ================================
 * 
 * User (base for all roles)
 *   └── customer, staff, organizer, admin (embedded fields)
 * 
 * Venue
 *   ├── Zone (1:N) - Physical zone areas with shapes/bounds
 *   └── Seat (1:N) - Physical seat layout template (seats belong to zones)
 * 
 * Zone (Venue physical areas)
 *   ├── Venue (N:1)
 *   ├── Seat (1:N) - Seats within this zone
 *   └── EventZone (1:N) - Event-specific configurations
 * 
 * EventZone (Event-specific zone configuration) *** NEW ***
 *   ├── Concert (N:1) - Which event
 *   ├── Zone (N:1) - Which physical zone
 *   ├── TicketClass (N:1) - Pricing tier for this zone in this event
 *   ├── color - Background color for zone painting
 *   └── rowLabelMapping - Custom row labels (1→"AT", 2→"BT", etc.)
 * 
 * Concert (Event)
 *   ├── Venue (N:1)
 *   ├── Organizer/User (N:1)
 *   ├── Artist (N:M)
 *   ├── TicketClass (1:N) - Pricing tiers with colors
 *   ├── EventZone (1:N) - Zone configurations for this event
 *   └── ShowSeat (1:N) - Seat assignments for this event
 * 
 * TicketClass
 *   ├── Concert (N:1)
 *   ├── color - For visual "painting" of zone backgrounds
 *   └── Ticket (1:N)
 * 
 * ShowSeat ("Painted" seat assignment)
 *   ├── Concert (N:1)
 *   ├── Seat (N:1) - From venue's seat layout
 *   ├── EventZone (N:1) - Zone config for display labels
 *   ├── TicketClass (N:1) - Which pricing tier
 *   └── Ticket (1:1)
 * 
 * Order
 *   ├── Customer/User (N:1)
 *   ├── Concert (N:1)
 *   ├── Voucher (N:1, optional)
 *   ├── OrderDetail (1:N)
 *   └── Payment (1:1)
 * 
 * OrderDetail
 *   ├── Order (N:1)
 *   └── Ticket (N:1)
 */

import User from './User.js';
import Artist from './Artist.js';
import Venue from './Venue.js';
import Zone from './Zone.js';
import EventZone from './EventZone.js';
import Seat from './Seat.js';
import Concert from './Concert.js';
import Category from './Category.js';
import TicketClass from './TicketClass.js';
import ShowSeat from './ShowSeat.js';
import Ticket from './Ticket.js';
import Voucher from './Voucher.js';
import Order from './Order.js';
import OrderDetail from './OrderDetail.js';
import Payment from './Payment.js';

export {
  User,
  Artist,
  Venue,
  Zone,
  EventZone,
  Seat,
  Concert,
  Category,
  TicketClass,
  ShowSeat,
  Ticket,
  Voucher,
  Order,
  OrderDetail,
  Payment
};

export default {
  User,
  Artist,
  Venue,
  Zone,
  EventZone,
  Seat,
  Concert,
  Category,
  TicketClass,
  ShowSeat,
  Ticket,
  Voucher,
  Order,
  OrderDetail,
  Payment
};
