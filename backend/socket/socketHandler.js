const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Message = require('../models/Message');

// Store active users and their socket IDs
const activeUsers = new Map();

// Socket authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists and is active
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return next(new Error('Authentication error: Invalid user'));
    }

    // Add user info to socket
    socket.userId = user._id.toString();
    socket.userInfo = {
      _id: user._id,
      name: user.name,
      email: user.email,
      profilePicture: user.profilePicture
    };

    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication error: Invalid token'));
  }
};

// Main socket handler
const socketHandler = (io) => {
  // Apply authentication middleware
  io.use(authenticateSocket);

  io.on('connection', async (socket) => {
    console.log(`✅ User ${socket.userInfo.name} connected: ${socket.id}`);

    try {
      // Update user online status
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: true,
        lastSeen: new Date()
      });

      // Store user in active users map
      activeUsers.set(socket.userId, {
        socketId: socket.id,
        userInfo: socket.userInfo
      });

      // Join user to their personal room
      socket.join(socket.userId);

      // Emit user online status to contacts
      socket.broadcast.emit('userOnline', {
        userId: socket.userId,
        userInfo: socket.userInfo
      });

      // Send active users list to the connected user
      const activeUsersList = Array.from(activeUsers.values()).map(user => ({
        userId: user.userInfo._id,
        userInfo: user.userInfo
      }));
      
      socket.emit('activeUsers', activeUsersList);

    } catch (error) {
      console.error('Error during socket connection setup:', error);
    }

    // Handle joining a chat room
    socket.on('joinChat', async (data) => {
      try {
        const { chatId } = data;
        
        if (!chatId) {
          socket.emit('error', { message: 'Chat ID is required' });
          return;
        }
        
        // Verify user is participant in the chat
        const chat = await Chat.findOne({
          _id: chatId,
          participants: socket.userId
        });

        if (chat) {
          socket.join(chatId);
          console.log(`📱 User ${socket.userInfo.name} joined chat: ${chatId}`);
          
          // Notify other participants
          socket.to(chatId).emit('userJoinedChat', {
            userId: socket.userId,
            userInfo: socket.userInfo,
            chatId
          });
        } else {
          socket.emit('error', { message: 'Chat not found or access denied' });
        }
      } catch (error) {
        console.error('Error joining chat:', error);
        socket.emit('error', { message: 'Failed to join chat' });
      }
    });

    // Handle leaving a chat room
    socket.on('leaveChat', (data) => {
      try {
        const { chatId } = data;
        socket.leave(chatId);
        console.log(`📱 User ${socket.userInfo.name} left chat: ${chatId}`);
        
        // Notify other participants
        socket.to(chatId).emit('userLeftChat', {
          userId: socket.userId,
          userInfo: socket.userInfo,
          chatId
        });
      } catch (error) {
        console.error('Error leaving chat:', error);
      }
    });

    // Handle sending messages
    socket.on('sendMessage', async (data) => {
      try {
        const { chatId, receiverId, content, messageType = 'text', fileUrl, fileName, fileSize } = data;

        // Verify chat exists and user is participant
        const chat = await Chat.findOne({
          _id: chatId,
          participants: { $all: [socket.userId, receiverId] }
        });

        if (!chat) {
          return socket.emit('error', { message: 'Chat not found or unauthorized' });
        }

        // Create message
        const messageData = {
          sender: socket.userId,
          receiver: receiverId,
          chatId,
          content,
          messageType,
          isDelivered: true,
          deliveredAt: new Date()
        };

        // Add file data if present
        if (messageType !== 'text' && fileUrl) {
          messageData.fileUrl = fileUrl;
          messageData.fileName = fileName;
          messageData.fileSize = fileSize;
        }

        const message = await Message.create(messageData);
        
        // Populate sender info
        await message.populate('sender', 'name email profilePicture');

        // Update chat's last message
        await chat.updateLastMessage(message._id);

        // Emit message to all participants in the chat
        io.to(chatId).emit('newMessage', {
          message,
          chatId
        });

        // Send notification to receiver if online
        if (activeUsers.has(receiverId)) {
          io.to(receiverId).emit('messageNotification', {
            message,
            chatId,
            sender: socket.userInfo
          });
        }

        console.log(`💬 Message sent from ${socket.userInfo.name} in chat: ${chatId}`);

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      try {
        const { chatId, receiverId } = data;
        socket.to(chatId).emit('userTyping', {
          userId: socket.userId,
          userInfo: socket.userInfo,
          chatId
        });
      } catch (error) {
        console.error('Error handling typing:', error);
      }
    });

    // Handle stop typing indicator
    socket.on('stopTyping', (data) => {
      try {
        const { chatId } = data;
        socket.to(chatId).emit('userStoppedTyping', {
          userId: socket.userId,
          chatId
        });
      } catch (error) {
        console.error('Error handling stop typing:', error);
      }
    });

    // Handle marking messages as read
    socket.on('markAsRead', async (data) => {
      try {
        const { chatId, messageIds } = data;

        // Mark messages as read
        await Message.updateMany({
          _id: { $in: messageIds },
          receiver: socket.userId,
          chatId
        }, {
          isRead: true,
          readAt: new Date()
        });

        // Notify sender about read status
        socket.to(chatId).emit('messagesRead', {
          messageIds,
          readBy: socket.userId,
          chatId
        });

      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      try {
        console.log(`❌ User ${socket.userInfo.name} disconnected: ${socket.id}`);

        // Update user offline status
        await User.findByIdAndUpdate(socket.userId, {
          isOnline: false,
          lastSeen: new Date()
        });

        // Remove from active users
        activeUsers.delete(socket.userId);

        // Emit user offline status to contacts
        socket.broadcast.emit('userOffline', {
          userId: socket.userId,
          userInfo: socket.userInfo,
          lastSeen: new Date()
        });

      } catch (error) {
        console.error('Error during socket disconnect:', error);
      }
    });

    // Handle connection errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });
};

module.exports = socketHandler;