import Category from '../models/Category.js';
import Concert from '../models/Concert.js';
import { ApiError } from '../middleware/errorHandler.js';

/**
 * Category Controller
 * CRUD operations for event categories
 */

/**
 * @desc    Get all categories
 * @route   GET /api/categories
 * @access  Public
 */
export const getCategories = async (req, res, next) => {
  try {
    const { active, page = 1, limit = 50 } = req.query;
    
    const query = {};
    if (active === 'true') {
      query.isActive = true;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [categories, total] = await Promise.all([
      Category.find(query)
        .sort({ order: 1, name: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Category.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        categories,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get category by ID or slug
 * @route   GET /api/categories/:idOrSlug
 * @access  Public
 */
export const getCategoryById = async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    
    let category;
    // Check if it's an ObjectId or slug
    if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
      category = await Category.findById(idOrSlug);
    } else {
      category = await Category.findOne({ slug: idOrSlug });
    }

    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    // Get concert count for this category
    const concertCount = await Concert.countDocuments({ category: category._id });

    res.json({
      success: true,
      data: {
        category,
        concertCount
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create category
 * @route   POST /api/categories
 * @access  Private (Admin)
 */
export const createCategory = async (req, res, next) => {
  try {
    const { name, slug, isActive, order } = req.body;

    // Check if name already exists
    const existing = await Category.findOne({ 
      $or: [
        { name: { $regex: new RegExp(`^${name}$`, 'i') } },
        { slug: slug || name.toLowerCase().replace(/\s+/g, '-') }
      ]
    });
    
    if (existing) {
      throw new ApiError(400, 'Category with this name or slug already exists');
    }

    const category = await Category.create({
      name,
      slug: slug || name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-'),
      isActive: isActive !== false,
      order: order || 0
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update category
 * @route   PUT /api/categories/:id
 * @access  Private (Admin)
 */
export const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    const { name, slug, isActive, order } = req.body;

    // Check for duplicate name/slug (excluding current)
    if (name || slug) {
      const existing = await Category.findOne({
        _id: { $ne: req.params.id },
        $or: [
          name ? { name: { $regex: new RegExp(`^${name}$`, 'i') } } : null,
          slug ? { slug } : null
        ].filter(Boolean)
      });

      if (existing) {
        throw new ApiError(400, 'Category with this name or slug already exists');
      }
    }

    const updated = await Category.findByIdAndUpdate(
      req.params.id,
      { name, slug, isActive, order },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete category
 * @route   DELETE /api/categories/:id
 * @access  Private (Admin)
 */
export const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    // Check if category has concerts
    const concertCount = await Concert.countDocuments({ category: category._id });
    if (concertCount > 0) {
      throw new ApiError(400, `Cannot delete category. ${concertCount} event(s) are using this category.`);
    }

    await category.deleteOne();

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reorder categories
 * @route   PUT /api/categories/reorder
 * @access  Private (Admin)
 */
export const reorderCategories = async (req, res, next) => {
  try {
    const { orders } = req.body; // [{ id: '...', order: 0 }, { id: '...', order: 1 }]

    if (!Array.isArray(orders)) {
      throw new ApiError(400, 'Orders must be an array');
    }

    const updates = orders.map(item => 
      Category.findByIdAndUpdate(item.id, { order: item.order })
    );

    await Promise.all(updates);

    res.json({
      success: true,
      message: 'Categories reordered successfully'
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories
};
