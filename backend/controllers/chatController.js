const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');

// @desc    Create or get private chat
// @route   POST /api/chat/private
// @access  Private
const createOrGetPrivateChat = async (req, res) => {
  try {
    const { receiverId } = req.body;
    // Fix: Use the correct field from req.user
    const senderId = req.user.userId || req.user._id;

    console.log('🔍 Create chat request:', {
      senderId,
      receiverId,
      userObject: req.user,
      userIdField: req.user.userId,
      userIdFromObject: req.user._id
    });

    // Validate receiver
    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: 'Receiver ID is required'
      });
    }

    // Validate senderId exists
    if (!senderId) {
      console.error('❌ No senderId found in req.user:', req.user);
      return res.status(401).json({
        success: false,
        message: 'User not authenticated properly'
      });
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver || !receiver.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found'
      });
    }

    // Cannot chat with yourself
    if (senderId === receiverId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create chat with yourself'
      });
    }

    console.log('✅ Validation passed, creating chat...');

    // Create or find existing chat
    const chat = await Chat.findOrCreatePrivateChat(senderId, receiverId);

    console.log('✅ Chat created/found:', chat._id);

    res.json({
      success: true,
      message: 'Chat created/retrieved successfully',
      data: { chat }
    });

  } catch (error) {
    console.error('❌ Create/Get private chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating/getting chat'
    });
  }
};

// @desc    Send message
// @route   POST /api/chat/message
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const { chatId, receiverId, content, messageType = 'text' } = req.body;
    const senderId = req.user.userId || req.user._id;

    console.log('🔍 Send message request:', {
      chatId,
      receiverId,
      senderId,
      content: content ? content.substring(0, 50) + '...' : 'No content',
      messageType
    });

    // Validate required fields
    if (!chatId || !receiverId) {
      return res.status(400).json({
        success: false,
        message: 'Chat ID and receiver ID are required'
      });
    }

    if (messageType === 'text' && !content) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required for text messages'
      });
    }

    if (!senderId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Check if chat exists and user is participant
    const chat = await Chat.findOne({
      _id: chatId,
      participants: { $all: [senderId, receiverId] },
      isActive: true
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found or you are not a participant'
      });
    }

    console.log('✅ Chat validation passed, creating message...');

    // Create message
    const messageData = {
      sender: senderId,
      receiver: receiverId,
      chatId,
      content,
      messageType,
      isDelivered: true,
      deliveredAt: new Date()
    };

    // Add file data if it's a file message
    if (messageType !== 'text' && req.body.fileUrl) {
      messageData.fileUrl = req.body.fileUrl;
      messageData.fileName = req.body.fileName;
      messageData.fileSize = req.body.fileSize;
    }

    const message = await Message.create(messageData);
    console.log('✅ Message created:', message._id);

    // Update chat's last message
    await chat.updateLastMessage(message._id);

    // Populate sender info
    await message.populate('sender', 'name email profilePicture');

    console.log('✅ Message sent successfully');

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message }
    });

  } catch (error) {
    console.error('❌ Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending message'
    });
  }
};

// @desc    Get chat messages
// @route   GET /api/chat/:chatId/messages
// @access  Private
const getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const currentUserId = req.user.userId;

    // Check if chat exists and user is participant
    const chat = await Chat.findOne({
      _id: chatId,
      participants: currentUserId,
      isActive: true
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found or you are not a participant'
      });
    }

    // Get messages with pagination
    const messages = await Message.find({
      chatId,
      isDeleted: false
    })
    .populate('sender', 'name email profilePicture')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    // Get total count
    const totalMessages = await Message.countDocuments({
      chatId,
      isDeleted: false
    });

    // Mark messages as read for current user
    await Message.updateMany({
      chatId,
      receiver: currentUserId,
      isRead: false
    }, {
      isRead: true,
      readAt: new Date()
    });

    res.json({
      success: true,
      data: {
        messages: messages.reverse(), // Reverse to get chronological order
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalMessages / limit),
          totalMessages,
          hasNext: page < Math.ceil(totalMessages / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get chat messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching messages'
    });
  }
};

// @desc    Delete message
// @route   DELETE /api/chat/message/:messageId
// @access  Private
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user.userId;

    // Find message
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is the sender
    if (message.sender.toString() !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages'
      });
    }

    // Soft delete message
    await message.softDelete();

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting message'
    });
  }
};

// @desc    Get user's chats
// @route   GET /api/chat/user-chats
// @access  Private
const getUserChats = async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    // Get all chats where current user is a participant
    const chats = await Chat.find({
      participants: currentUserId,
      isActive: true
    })
    .populate('participants', 'name email profilePicture isOnline lastSeen')
    .populate({
      path: 'lastMessage',
      populate: {
        path: 'sender',
        select: 'name email'
      }
    })
    .sort({ lastMessageTime: -1 });

    // Format chats data
    const formattedChats = chats.map(chat => {
      const otherParticipants = chat.getOtherParticipants(currentUserId);
      
      return {
        _id: chat._id,
        chatType: chat.chatType,
        participants: chat.participants,
        lastMessage: chat.lastMessage,
        lastMessageTime: chat.lastMessageTime,
        // For private chats, show the other person's info as chat name
        chatName: chat.chatType === 'private' 
          ? otherParticipants[0]?.name 
          : chat.chatName,
        otherParticipants,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      };
    });

    res.json({
      success: true,
      data: { chats: formattedChats }
    });

  } catch (error) {
    console.error('Get user chats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching chats'
    });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/chat/:chatId/mark-read
// @access  Private
const markMessagesAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const currentUserId = req.user.userId;

    // Check if chat exists and user is participant
    const chat = await Chat.findOne({
      _id: chatId,
      participants: currentUserId,
      isActive: true
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found or you are not a participant'
      });
    }

    // Mark all unread messages as read
    const result = await Message.updateMany({
      chatId,
      receiver: currentUserId,
      isRead: false
    }, {
      isRead: true,
      readAt: new Date()
    });

    res.json({
      success: true,
      message: 'Messages marked as read',
      data: { modifiedCount: result.modifiedCount }
    });

  } catch (error) {
    console.error('Mark messages as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking messages as read'
    });
  }
};

module.exports = {
  createOrGetPrivateChat,
  sendMessage,
  getChatMessages,
  deleteMessage,
  getUserChats,
  markMessagesAsRead
};