import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-hot-toast';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [connected, setConnected] = useState(false);
  const { user, token } = useAuth();

  // Initialize socket connection
  useEffect(() => {
    if (user && token) {
      const newSocket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:8000', {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling']
      });

      setSocket(newSocket);

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('✅ Socket connected:', newSocket.id);
        setConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('❌ Socket disconnected');
        setConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setConnected(false);
        toast.error('Connection failed. Please check your internet connection.');
      });

      // User status event handlers
      newSocket.on('activeUsers', (users) => {
        setOnlineUsers(users);
      });

      newSocket.on('userOnline', (data) => {
        setOnlineUsers(prev => {
          const filtered = prev.filter(u => u.userId !== data.userId);
          return [...filtered, data];
        });
        toast.success(`${data.userInfo.name} is now online`, {
          duration: 2000,
          icon: '🟢'
        });
      });

      newSocket.on('userOffline', (data) => {
        setOnlineUsers(prev => prev.filter(u => u.userId !== data.userId));
        toast(`${data.userInfo.name} went offline`, {
          duration: 2000,
          icon: '🔴'
        });
      });

      // Message event handlers
      newSocket.on('newMessage', (data) => {
        setMessages(prev => [...prev, data.message]);
        
        // Show notification if message is not from current user
        if (data.message.sender._id !== user._id) {
          toast.success(`New message from ${data.message.sender.name}`, {
            duration: 3000,
            onClick: () => {
              // Navigate to chat if needed
              window.location.href = `/chat/${data.chatId}`;
            }
          });
        }
      });

      newSocket.on('messageNotification', (data) => {
        if (data.sender._id !== user._id) {
          toast.success(`📩 ${data.sender.name}: ${data.message.content || 'Sent a file'}`, {
            duration: 4000,
            onClick: () => {
              window.location.href = `/chat/${data.chatId}`;
            }
          });
        }
      });

      // Typing event handlers
      newSocket.on('userTyping', (data) => {
        if (data.userId !== user._id) {
          setTypingUsers(prev => {
            const filtered = prev.filter(u => u.userId !== data.userId);
            return [...filtered, data];
          });
        }
      });

      newSocket.on('userStoppedTyping', (data) => {
        setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
      });

      // Message read event handlers
      newSocket.on('messagesRead', (data) => {
        setMessages(prev => prev.map(msg => {
          if (data.messageIds.includes(msg._id)) {
            return { ...msg, isRead: true, readAt: new Date() };
          }
          return msg;
        }));
      });

      // Error handlers
      newSocket.on('error', (data) => {
        console.error('Socket error:', data);
        if (data.message && !data.message.includes('Authentication')) {
          toast.error(data.message || 'Socket connection error');
        }
      });

      return () => {
        newSocket.close();
      };
    }
  }, [user, token]);

  // Join a chat room
  const joinChat = (chatId) => {
    if (socket && connected) {
      socket.emit('joinChat', { chatId });
    }
  };

  // Leave a chat room
  const leaveChat = (chatId) => {
    if (socket && connected) {
      socket.emit('leaveChat', { chatId });
    }
  };

  // Send a message
  const sendMessage = (messageData) => {
    if (socket && connected) {
      socket.emit('sendMessage', messageData);
      return true;
    }
    toast.error('Not connected. Please check your internet connection.');
    return false;
  };

  // Send typing indicator
  const sendTyping = (chatId, receiverId) => {
    if (socket && connected) {
      socket.emit('typing', { chatId, receiverId });
    }
  };

  // Send stop typing indicator
  const sendStopTyping = (chatId, receiverId) => {
    if (socket && connected) {
      socket.emit('stopTyping', { chatId, receiverId });
    }
  };

  // Mark messages as read
  const markMessagesAsRead = (chatId, messageIds) => {
    if (socket && connected) {
      socket.emit('markAsRead', { chatId, messageIds });
    }
  };

  // Get online status of a user
  const isUserOnline = (userId) => {
    return onlineUsers.some(user => user.userId === userId);
  };

  // Get typing users for a chat
  const getTypingUsers = (chatId) => {
    return typingUsers.filter(user => user.chatId === chatId);
  };

  // Clear messages (when switching chats)
  const clearMessages = () => {
    setMessages([]);
  };

  // Add message to local state (for optimistic updates)
  const addMessage = (message) => {
    setMessages(prev => [...prev, message]);
  };

  // Update message in local state
  const updateMessage = (messageId, updates) => {
    setMessages(prev => prev.map(msg => 
      msg._id === messageId ? { ...msg, ...updates } : msg
    ));
  };

  // Remove message from local state
  const removeMessage = (messageId) => {
    setMessages(prev => prev.filter(msg => msg._id !== messageId));
  };

  const contextValue = {
    socket,
    connected,
    onlineUsers,
    messages,
    typingUsers,
    joinChat,
    leaveChat,
    sendMessage,
    sendTyping,
    sendStopTyping,
    markMessagesAsRead,
    isUserOnline,
    getTypingUsers,
    clearMessages,
    addMessage,
    updateMessage,
    removeMessage
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};