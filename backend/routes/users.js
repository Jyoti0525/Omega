const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array()
    });
  }
  next();
};

// User ID validation
const userIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID format')
];

// User update validation
const userUpdateValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('mobile')
    .optional()
    .isMobilePhone('en-IN')
    .withMessage('Please provide a valid 10-digit mobile number')
    .isLength({ min: 10, max: 10 })
    .withMessage('Mobile number must be exactly 10 digits')
];

// Pagination validation
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query cannot exceed 100 characters')
];

// Search validation
const searchValidation = [
  query('query')
    .notEmpty()
    .withMessage('Search query is required')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters')
];

// Apply auth middleware to all routes
router.use(authMiddleware);

// @route   GET /api/users
// @desc    Get all users with pagination and search
// @access  Private
router.get('/', paginationValidation, handleValidationErrors, userController.getAllUsers);

// @route   GET /api/users/contacts
// @desc    Get user's chat contacts
// @access  Private
router.get('/contacts', userController.getUserContacts);

// @route   GET /api/users/search
// @desc    Search users for starting new chat
// @access  Private
router.get('/search', searchValidation, handleValidationErrors, userController.searchUsers);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', userIdValidation, handleValidationErrors, userController.getUserById);

// @route   PUT /api/users/:id
// @desc    Update user (Admin functionality)
// @access  Private
router.put('/:id', 
  userIdValidation, 
  userUpdateValidation, 
  handleValidationErrors, 
  userController.updateUser
);

// @route   DELETE /api/users/:id
// @desc    Delete user (Soft delete)
// @access  Private
router.delete('/:id', userIdValidation, handleValidationErrors, userController.deleteUser);

module.exports = router;