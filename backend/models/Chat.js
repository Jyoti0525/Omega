const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  chatType: {
    type: String,
    enum: ['private', 'group'],
    default: 'private'
  },
  chatName: {
    type: String,
    required: function() {
      return this.chatType === 'group';
    }
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastMessageTime: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for better performance
chatSchema.index({ participants: 1 });
chatSchema.index({ lastMessageTime: -1 });
chatSchema.index({ createdBy: 1 });

// Create or find private chat between two users
chatSchema.statics.findOrCreatePrivateChat = async function(user1Id, user2Id) {
  try {
    // Check if chat already exists between these two users
    let chat = await this.findOne({
      chatType: 'private',
      participants: { $all: [user1Id, user2Id] }
    }).populate('participants', 'name email profilePicture isOnline lastSeen');

    if (!chat) {
      // Create new private chat with all required fields
      chat = await this.create({
        participants: [user1Id, user2Id],
        chatType: 'private',
        createdBy: user1Id,
        isActive: true
      });
      
      // Populate the participants after creation
      chat = await this.findById(chat._id).populate('participants', 'name email profilePicture isOnline lastSeen');
    }

    return chat;
  } catch (error) {
    console.error('❌ Error in findOrCreatePrivateChat:', error);
    throw error;
  }
};

// Update last message
chatSchema.methods.updateLastMessage = function(messageId) {
  this.lastMessage = messageId;
  this.lastMessageTime = new Date();
  return this.save();
};

// Get chat participants except current user
chatSchema.methods.getOtherParticipants = function(currentUserId) {
  return this.participants.filter(participant => 
    participant._id.toString() !== currentUserId.toString()
  );
};

module.exports = mongoose.model('Chat', chatSchema);