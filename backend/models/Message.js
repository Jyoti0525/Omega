const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  content: {
    type: String,
    required: function() {
      return this.messageType === 'text';
    }
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'video', 'document', 'audio'],
    default: 'text'
  },
  fileUrl: {
    type: String,
    required: function() {
      return this.messageType !== 'text';
    }
  },
  fileName: {
    type: String
  },
  fileSize: {
    type: Number
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  isDelivered: {
    type: Boolean,
    default: false
  },
  deliveredAt: {
    type: Date
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better performance
messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, receiver: 1 });
messageSchema.index({ createdAt: -1 });

// Mark message as delivered
messageSchema.methods.markDelivered = function() {
  this.isDelivered = true;
  this.deliveredAt = new Date();
  return this.save();
};

// Mark message as read
messageSchema.methods.markRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Soft delete message
messageSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Message', messageSchema);