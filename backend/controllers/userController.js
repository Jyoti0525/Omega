const User = require('../models/User');
const Chat = require('../models/Chat');
const Message = require('../models/Message');

// @desc    Get all users (for admin or user management)
// @route   GET /api/users
// @access  Private
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const currentUserId = req.user.userId;

    // Build search query
    const searchQuery = {
      _id: { $ne: currentUserId }, // Exclude current user
      isActive: true,
      ...(search && {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { mobile: { $regex: search, $options: 'i' } }
        ]
      })
    };

    // Get users with pagination
    const users = await User.find(searchQuery)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get total count
    const totalUsers = await User.countDocuments(searchQuery);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalUsers / limit),
          totalUsers,
          hasNext: page < Math.ceil(totalUsers / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user'
    });
  }
};

// @desc    Update user (Admin functionality)
// @route   PUT /api/users/:id
// @access  Private
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, mobile } = req.body;

    // Check if user exists
    const user = await User.findById(id);
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if email or mobile already exists (excluding current user)
    if (email || mobile) {
      const existingUser = await User.findOne({
        _id: { $ne: id },
        $or: [
          ...(email ? [{ email }] : []),
          ...(mobile ? [{ mobile }] : [])
        ]
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: existingUser.email === email 
            ? 'Email already in use' 
            : 'Mobile number already in use'
        });
      }
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        ...(name && { name }),
        ...(email && { email }),
        ...(mobile && { mobile })
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('Update user error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages[0]
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating user'
    });
  }
};

// @desc    Delete user (Soft delete)
// @route   DELETE /api/users/:id
// @access  Private
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await User.findById(id);
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Soft delete user
    user.isActive = false;
    user.isOnline = false;
    await user.save();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting user'
    });
  }
};

// @desc    Get user's chat contacts
// @route   GET /api/users/contacts
// @access  Private
const getUserContacts = async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    // Get all chats where current user is a participant
    const chats = await Chat.find({
      participants: currentUserId,
      isActive: true
    })
    .populate('participants', 'name email profilePicture isOnline lastSeen')
    .populate('lastMessage', 'content messageType createdAt sender')
    .sort({ lastMessageTime: -1 });

    // Format contacts data
    const contacts = chats.map(chat => {
      const otherParticipants = chat.getOtherParticipants(currentUserId);
      
      return {
        chatId: chat._id,
        chatType: chat.chatType,
        participants: otherParticipants,
        lastMessage: chat.lastMessage,
        lastMessageTime: chat.lastMessageTime,
        // For private chats, show the other person's info
        contactInfo: chat.chatType === 'private' ? otherParticipants[0] : {
          name: chat.chatName,
          participants: otherParticipants
        }
      };
    });

    res.json({
      success: true,
      data: { contacts }
    });

  } catch (error) {
    console.error('Get user contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching contacts'
    });
  }
};

// @desc    Search users for starting new chat
// @route   GET /api/users/search
// @access  Private
const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const currentUserId = req.user.userId;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    // Search users
    const users = await User.find({
      _id: { $ne: currentUserId },
      isActive: true,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { mobile: { $regex: query, $options: 'i' } }
      ]
    })
    .select('name email mobile profilePicture isOnline lastSeen')
    .limit(20);

    res.json({
      success: true,
      data: { users }
    });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching users'
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserContacts,
  searchUsers
};