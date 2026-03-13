/**
 * Role-Based Access Control Middleware
 * 
 * Roles hierarchy:
 * - ADMIN: Full system access
 * - ORG (Organizer): Manage own concerts, view reports
 * - STAFF: Ticket sales, check-in
 * - CUS (Customer): Book tickets, view orders
 */

/**
 * Check if user has required role(s)
 * @param {...string} allowedRoles - Roles that can access the route
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
};

/**
 * Check if user is Admin
 */
export const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required.',
    });
  }
  next();
};

/**
 * Check if user is Organizer or Admin
 */
export const isOrganizerOrAdmin = (req, res, next) => {
  if (!req.user || !['ADMIN', 'ORG'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Organizer or Admin access required.',
    });
  }
  next();
};

/**
 * Check if user is Staff or higher
 */
export const isStaffOrHigher = (req, res, next) => {
  if (!req.user || !['ADMIN', 'ORG', 'STAFF'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Staff access required.',
    });
  }
  next();
};

/**
 * Check resource ownership
 * Use this to ensure users can only access their own resources
 */
export const isOwner = (resourceUserIdField = 'user') => {
  return (req, res, next) => {
    // Admin can access anything
    if (req.user.role === 'ADMIN') {
      return next();
    }

    const resourceUserId = req.resource?.[resourceUserIdField];
    
    if (!resourceUserId || resourceUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.',
      });
    }

    next();
  };
};

export default { authorize, isAdmin, isOrganizerOrAdmin, isStaffOrHigher, isOwner };
