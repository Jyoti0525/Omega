const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const chatController = require('../controllers/chatController');
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

// Chat ID validation
const chatIdValidation = [
  param('chatId')
    .isMongoId()
    .withMessage('Invalid chat ID format')
];

// Message ID validation
const messageIdValidation = [
  param('messageId')
    .isMongoId()
    .withMessage('Invalid message ID format')
];

// Private chat creation validation
const privateChatValidation = [
  body('receiverId')
    .notEmpty()
    .withMessage('Receiver ID is required')
    .isMongoId()
    .withMessage('Invalid receiver ID format')
];

// Send message validation
const sendMessageValidation = [
  body('chatId')
    .notEmpty()
    .withMessage('Chat ID is required')
    .isMongoId()
    .withMessage('Invalid chat ID format'),
  
  body('receiverId')
    .notEmpty()
    .withMessage('Receiver ID is required')
    .isMongoId()
    .withMessage('Invalid receiver ID format'),
  
  body('messageType')
    .optional()
    .isIn(['text', 'image', 'video', 'document', 'audio'])
    .withMessage('Invalid message type'),
  
  body('content')
    .if(body('messageType').equals('text'))
    .notEmpty()
    .withMessage('Message content is required for text messages')
    .isLength({ max: 2000 })
    .withMessage('Message content cannot exceed 2000 characters'),
  
  body('fileUrl')
    .if(body('messageType').not().equals('text'))
    .notEmpty()
    .withMessage('File URL is required for file messages')
    .isURL()
    .withMessage('Invalid file URL format'),
  
  body('fileName')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('File name cannot exceed 255 characters'),
  
  body('fileSize')
    .optional()
    .isInt({ min: 1 })
    .withMessage('File size must be a positive integer')
];

// Pagination validation for messages
const messagesPaginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// Apply auth middleware to all routes
router.use(authMiddleware);

// @route   POST /api/chat/private
// @desc    Create or get private chat
// @access  Private
router.post('/private', privateChatValidation, handleValidationErrors, chatController.createOrGetPrivateChat);

// @route   POST /api/chat/message
// @desc    Send message
// @access  Private
router.post('/message', sendMessageValidation, handleValidationErrors, chatController.sendMessage);

// @route   GET /api/chat/user-chats
// @desc    Get user's chats
// @access  Private
router.get('/user-chats', chatController.getUserChats);

// @route   GET /api/chat/:chatId/messages
// @desc    Get chat messages with pagination
// @access  Private
router.get('/:chatId/messages', 
  chatIdValidation, 
  messagesPaginationValidation, 
  handleValidationErrors, 
  chatController.getChatMessages
);

// @route   PUT /api/chat/:chatId/mark-read
// @desc    Mark messages as read
// @access  Private
router.put('/:chatId/mark-read', chatIdValidation, handleValidationErrors, chatController.markMessagesAsRead);

// @route   DELETE /api/chat/message/:messageId
// @desc    Delete message
// @access  Private
router.delete('/message/:messageId', messageIdValidation, handleValidationErrors, chatController.deleteMessage);

module.exports = router;