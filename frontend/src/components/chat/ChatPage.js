import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaArrowLeft, 
  FaPaperPlane, 
  FaPaperclip, 
  FaUser, 
  FaCircle, 
  FaDownload, 
  FaTrash,
  FaPhone,
  FaVideo,
  FaEllipsisV,
  FaSmile,
  FaImage,
  FaFile,
  FaPlay,
  FaPause
} from 'react-icons/fa';
import { 
  HiOutlineArrowLeft,
  HiOutlinePaperAirplane,
  HiOutlinePaperClip,
  HiOutlinePhone,
  HiOutlineVideoCamera,
  HiOutlineDotsVertical,
  HiOutlineEmojiHappy,
  HiOutlinePhotograph,
  HiOutlineDocument,
  HiOutlineTrash,
  HiOutlineDownload
} from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { apiHelpers, uploadFileWithProgress, utils } from '../../utils/api';
import { toast } from 'react-hot-toast';
import moment from 'moment';

const ChatPage = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    socket, 
    connected, 
    messages, 
    joinChat, 
    leaveChat, 
    sendMessage, 
    sendTyping, 
    sendStopTyping, 
    markMessagesAsRead,
    isUserOnline,
    getTypingUsers,
    clearMessages
  } = useSocket();

  const [chatData, setChatData] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Get other participant info
  const otherParticipant = chatData?.otherParticipants?.[0];
  const isOtherUserOnline = otherParticipant && isUserOnline(otherParticipant._id);
  const typingUsers = getTypingUsers(chatId);

  // Get avatar color for consistency
  const getAvatarColor = (name) => {
    const colors = [
      'from-violet-500 to-purple-600',
      'from-blue-500 to-indigo-600',
      'from-emerald-500 to-teal-600',
      'from-amber-500 to-orange-600',
      'from-rose-500 to-pink-600',
      'from-cyan-500 to-blue-600',
      'from-lime-500 to-green-600',
      'from-red-500 to-rose-600'
    ];
    const index = name ? name.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  useEffect(() => {
    if (chatId) {
      loadChatData();
      loadMessages();
      joinChat(chatId);
      clearMessages(); // Clear previous chat messages
    }

    return () => {
      if (chatId) {
        leaveChat(chatId);
        clearMessages();
      }
    };
  }, [chatId]);

  // Update local messages when socket messages change
  useEffect(() => {
    setChatMessages(messages);
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Mark messages as read when they come into view
  useEffect(() => {
    if (chatMessages.length > 0) {
      const unreadMessages = chatMessages
        .filter(msg => msg.receiver === user._id && !msg.isRead)
        .map(msg => msg._id);
      
      if (unreadMessages.length > 0) {
        markMessagesAsRead(chatId, unreadMessages);
      }
    }
  }, [chatMessages, user._id, chatId]);

  const loadChatData = async () => {
    try {
      // Get chat details including participants
      const response = await apiHelpers.getUserChats();
      if (response.data.success) {
        const currentChat = response.data.data.chats.find(chat => chat._id === chatId);
        if (currentChat) {
          setChatData(currentChat);
          console.log('✅ Chat data loaded:', currentChat);
        }
      }
    } catch (error) {
      console.error('Load chat data error:', error);
      toast.error('Failed to load chat data');
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await apiHelpers.getChatMessages(chatId);
      if (response.data.success) {
        const messages = response.data.data.messages;
        setChatMessages(messages);
        
        // If no chat data yet, extract it from messages
        if (!chatData && messages.length > 0) {
          const firstMessage = messages[0];
          const participants = [];
          
          // Get unique participants from messages
          const senderIds = [...new Set(messages.map(m => m.sender._id))];
          const receiverIds = [...new Set(messages.map(m => m.receiver))];
          const allParticipantIds = [...new Set([...senderIds, ...receiverIds])];
          
          // Find the other participant (not current user)
          const otherParticipantId = allParticipantIds.find(id => id !== user._id);
          const otherParticipant = messages.find(m => m.sender._id === otherParticipantId)?.sender;
          
          if (otherParticipant) {
            participants.push(otherParticipant);
          }
          
          setChatData({
            _id: chatId,
            participants: [otherParticipant].filter(Boolean),
            otherParticipants: [otherParticipant].filter(Boolean),
            chatType: 'private'
          });
          
          console.log('✅ Chat data extracted from messages:', {
            otherParticipant,
            participants
          });
        }
      }
    } catch (error) {
      console.error('Load messages error:', error);
      toast.error('Failed to load messages');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!messageInput.trim() || !connected) {
      console.log('Cannot send message:', {
        hasInput: !!messageInput.trim(),
        connected,
        chatId
      });
      return;
    }

    // Get receiver ID from chat data or messages
    let receiverId = null;
    if (otherParticipant) {
      receiverId = otherParticipant._id;
    } else if (chatMessages.length > 0) {
      // Get receiver from existing messages
      const lastMessage = chatMessages[chatMessages.length - 1];
      receiverId = lastMessage.sender._id === user._id ? lastMessage.receiver : lastMessage.sender._id;
    }

    if (!receiverId) {
      toast.error('Cannot identify message recipient');
      return;
    }

    try {
      setSending(true);
      
      const messageData = {
        chatId,
        receiverId,
        content: messageInput.trim(),
        messageType: 'text'
      };

      console.log('🔍 Sending message:', messageData);

      // Send via API
      const response = await apiHelpers.sendMessage(messageData);
      console.log('✅ Message sent via API:', response.data);

      if (response.data.success) {
        // Add message to local state immediately
        const newMessage = response.data.data.message;
        setChatMessages(prev => [...prev, newMessage]);
        
        // Also send via socket for real-time delivery to other user
        sendMessage(messageData);
        
        setMessageInput('');
        stopTyping();
      }
    } catch (error) {
      console.error('Send message error:', error);
      toast.error('Failed to send message: ' + (error.response?.data?.message || error.message));
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file || (!chatMessages.length && !otherParticipant)) {
      toast.error('Cannot upload file: No active chat found');
      return;
    }

    // Enhanced file validation
    const validation = utils.validateFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    // Additional file size check (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 50MB');
      return;
    }

    try {
      setFileUploading(true);
      setUploadProgress(0);
      setShowFileMenu(false);

      console.log('🔍 Uploading file:', {
        name: file.name,
        type: file.type,
        size: file.size,
        chatId: chatId
      });

      // Determine file type for correct endpoint
      const fileType = utils.getFileType(file.type);
      console.log('📁 File type determined:', fileType);

      // Use the existing uploadFileWithProgress function with correct type
      const response = await uploadFileWithProgress(file, fileType, setUploadProgress);

      console.log('✅ File uploaded successfully:', response.data);

      if (response.data.success) {
        const { fileUrl, fileName, fileSize, messageType } = response.data.data;
        
        // Get receiver ID
        let receiverId = null;
        if (otherParticipant) {
          receiverId = otherParticipant._id;
        } else if (chatMessages.length > 0) {
          const lastMessage = chatMessages[chatMessages.length - 1];
          receiverId = lastMessage.sender._id === user._id ? lastMessage.receiver : lastMessage.sender._id;
        }

        if (!receiverId) {
          throw new Error('Cannot identify message recipient');
        }

        const messageData = {
          chatId,
          receiverId,
          messageType: messageType || fileType,
          fileUrl,
          fileName: fileName || file.name,
          fileSize: fileSize || file.size
        };

        console.log('📨 Sending file message:', messageData);

        // Send file message via API
        const messageResponse = await apiHelpers.sendMessage(messageData);
        
        if (messageResponse.data.success) {
          const newMessage = messageResponse.data.data.message;
          
          // Add message to local state immediately
          setChatMessages(prev => [...prev, newMessage]);
          
          // Also send via socket for real-time delivery to other user
          sendMessage(messageData);
          
          const fileTypeName = messageType || fileType;
          toast.success(`${fileTypeName.charAt(0).toUpperCase() + fileTypeName.slice(1)} sent successfully!`);
          
          // Scroll to bottom to show the new message
          setTimeout(() => scrollToBottom(), 100);
        } else {
          throw new Error(messageResponse.data.message || 'Failed to send file message');
        }
      } else {
        throw new Error(response.data.message || 'File upload failed');
      }
    } catch (error) {
      console.error('💥 File upload error:', error);
      
      // Show user-friendly error message
      let errorMessage = 'Failed to upload file';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 400) {
        errorMessage = 'Invalid file or request. Please check the file and try again.';
      } else if (error.response?.status === 413) {
        errorMessage = 'File too large. Please choose a smaller file.';
      } else if (error.response?.status === 415) {
        errorMessage = 'File type not supported.';
      }
      
      toast.error(errorMessage);
    } finally {
      setFileUploading(false);
      setUploadProgress(0);
    }
  };

  const handleInputChange = (e) => {
    setMessageInput(e.target.value);
    
    if (!typing && otherParticipant) {
      setTyping(true);
      sendTyping(chatId, otherParticipant._id);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(stopTyping, 2000);
  };

  const stopTyping = () => {
    if (typing && otherParticipant) {
      setTyping(false);
      sendStopTyping(chatId, otherParticipant._id);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await apiHelpers.deleteMessage(messageId);
      setChatMessages(prev => prev.filter(msg => msg._id !== messageId));
      toast.success('Message deleted');
    } catch (error) {
      console.error('Delete message error:', error);
      toast.error('Failed to delete message');
    }
  };

  const formatMessageTime = (timestamp) => {
    return moment(timestamp).format('HH:mm');
  };

  const formatFileSize = (bytes) => {
    return utils.formatFileSize(bytes);
  };

  const renderMessage = (message) => {
    const isOwnMessage = message.sender._id === user._id;
    const showSender = !isOwnMessage;

    return (
      <div
        key={message._id}
        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-6`}
      >
        <div className={`max-w-sm lg:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'}`}>
          {showSender && (
            <div className="text-xs text-slate-400 mb-2 ml-4 font-medium">
              {message.sender.name}
            </div>
          )}
          
          <div
            className={`relative px-4 py-3 rounded-2xl shadow-lg ${
              isOwnMessage
                ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-br-md'
                : 'bg-white text-slate-800 rounded-bl-md border border-slate-200'
            }`}
          >
            {/* Message content */}
            {message.messageType === 'text' ? (
              <p className="text-sm leading-relaxed">{message.content}</p>
            ) : message.messageType === 'image' ? (
              <div className="space-y-3">
                <div className="relative overflow-hidden rounded-xl">
                  <img
                    src={message.fileUrl}
                    alt={message.fileName || 'Image'}
                    className="max-w-full h-auto cursor-pointer hover:scale-105 transition-transform duration-300 block"
                    style={{ maxHeight: '300px', maxWidth: '250px' }}
                    onClick={() => window.open(message.fileUrl, '_blank')}
                    onLoad={() => scrollToBottom()}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  {/* Error fallback */}
                  <div 
                    className="hidden items-center justify-center p-6 bg-slate-100 rounded-xl text-center"
                    style={{ maxWidth: '250px' }}
                  >
                    <div>
                      <HiOutlinePhotograph className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                      <p className="text-xs text-slate-500 mb-2">Image failed to load</p>
                      <a
                        href={message.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-violet-600 hover:text-violet-700 underline"
                      >
                        View Original
                      </a>
                    </div>
                  </div>
                </div>
                {message.fileName && (
                  <p className="text-xs opacity-75">{message.fileName}</p>
                )}
              </div>
            ) : message.messageType === 'video' ? (
              <div className="space-y-3">
                <div className="relative overflow-hidden rounded-xl">
                  <video
                    controls
                    className="max-w-full h-auto rounded-xl"
                    style={{ maxHeight: '300px', maxWidth: '250px' }}
                    onLoadedData={() => scrollToBottom()}
                  >
                    <source src={message.fileUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
                {message.fileName && (
                  <p className="text-xs opacity-75">{message.fileName}</p>
                )}
              </div>
            ) : (
              /* Document or other file types */
              <div className="space-y-2">
                <div className={`flex items-center space-x-3 p-3 rounded-xl ${
                  isOwnMessage ? 'bg-white/20 backdrop-blur-sm' : 'bg-slate-50'
                }`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isOwnMessage ? 'bg-white/30' : 'bg-slate-200'
                  }`}>
                    <HiOutlineDocument className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{message.fileName}</p>
                    <p className="text-xs opacity-75">
                      {formatFileSize(message.fileSize)} • {message.messageType}
                    </p>
                  </div>
                  <a
                    href={message.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-2 rounded-lg transition-colors ${
                      isOwnMessage 
                        ? 'hover:bg-white/30 text-white' 
                        : 'hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    <HiOutlineDownload className="h-4 w-4" />
                  </a>
                </div>
              </div>
            )}
            
            {/* Message footer */}
            <div className="flex items-center justify-between mt-3 pt-2">
              <span className="text-xs opacity-75">
                {formatMessageTime(message.createdAt)}
              </span>
              
              {isOwnMessage && (
                <div className="flex items-center space-x-3">
                  {message.isRead && (
                    <span className="text-xs opacity-75 flex items-center space-x-1">
                      <div className="w-2 h-2 bg-current rounded-full"></div>
                      <span>Read</span>
                    </span>
                  )}
                  <button
                    onClick={() => handleDeleteMessage(message._id)}
                    className="text-xs opacity-75 hover:opacity-100 transition-opacity p-1 rounded"
                  >
                    <HiOutlineTrash className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Message tail */}
            <div className={`absolute top-0 w-4 h-4 transform ${
              isOwnMessage 
                ? '-right-2 bg-gradient-to-r from-violet-500 to-purple-600' 
                : '-left-2 bg-white border-l border-b border-slate-200'
            }`} style={{
              clipPath: isOwnMessage 
                ? 'polygon(0 0, 100% 0, 0 100%)' 
                : 'polygon(100% 0, 100% 100%, 0 0)'
            }}></div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-600 border-t-violet-500 mx-auto"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-t-cyan-500 animate-spin mx-auto" style={{ animationDelay: '0.1s', animationDirection: 'reverse' }}></div>
          </div>
          <p className="text-slate-300 text-lg font-medium">Loading conversation...</p>
          <p className="text-slate-500 text-sm mt-2">Preparing your chat</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 flex flex-col">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: '20px 20px'
        }}></div>
      </div>

      {/* Enhanced Header */}
      <header className="bg-slate-800/90 backdrop-blur-xl border-b border-slate-700/50 px-6 py-4 relative z-10">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-700/20 to-transparent"></div>
        
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-10 h-10 rounded-xl bg-slate-700/50 hover:bg-slate-600/70 transition-all duration-300 flex items-center justify-center group"
            >
              <HiOutlineArrowLeft className="h-5 w-5 text-slate-300 group-hover:text-white group-hover:-translate-x-0.5 transition-all" />
            </button>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className={`w-12 h-12 bg-gradient-to-r ${getAvatarColor(otherParticipant?.name)} rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                  {otherParticipant?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                {isOtherUserOnline && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-800 flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-slate-100">
                  {otherParticipant?.name || 'Unknown User'}
                </h3>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isOtherUserOnline ? 'bg-green-400' : 'bg-slate-500'
                  }`}></div>
                  <span className="text-sm text-slate-400">
                    {isOtherUserOnline ? 'Online' : 'Offline'}
                  </span>
                  {typingUsers.length > 0 && (
                    <span className="text-sm text-cyan-400 animate-pulse">• typing...</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Action buttons */}
            <button className="w-10 h-10 rounded-xl bg-slate-700/50 hover:bg-slate-600/70 transition-all duration-300 flex items-center justify-center group">
              <HiOutlinePhone className="h-5 w-5 text-slate-400 group-hover:text-slate-200" />
            </button>
            
            <button className="w-10 h-10 rounded-xl bg-slate-700/50 hover:bg-slate-600/70 transition-all duration-300 flex items-center justify-center group">
              <HiOutlineVideoCamera className="h-5 w-5 text-slate-400 group-hover:text-slate-200" />
            </button>
            
            <button 
              onClick={() => setShowChatMenu(!showChatMenu)}
              className="w-10 h-10 rounded-xl bg-slate-700/50 hover:bg-slate-600/70 transition-all duration-300 flex items-center justify-center group relative"
            >
              <HiOutlineDotsVertical className="h-5 w-5 text-slate-400 group-hover:text-slate-200" />
            </button>

            {/* Connection status */}
            <div className="flex items-center space-x-2 px-3 py-1 rounded-lg bg-slate-700/50">
              <div className={`w-2 h-2 rounded-full ${
                connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
              }`}></div>
              <span className="text-xs text-slate-300 font-medium">
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          {chatMessages.length > 0 ? (
            <>
              {chatMessages.map(renderMessage)}
              
              {/* Enhanced Typing Indicator */}
              {typingUsers.length > 0 && (
                <div className="flex justify-start mb-6">
                  <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-lg border border-slate-200 relative">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-xs text-slate-500">typing...</span>
                    </div>
                    
                    {/* Typing indicator tail */}
                    <div className="absolute top-0 -left-2 w-4 h-4 bg-white border-l border-b border-slate-200" style={{
                      clipPath: 'polygon(100% 0, 100% 100%, 0 0)'
                    }}></div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Enhanced Empty State */
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-r from-slate-700 to-slate-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <HiOutlinePhotograph className="h-12 w-12 text-slate-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-200 mb-3">Start the conversation</h3>
              <p className="text-slate-400 text-lg leading-relaxed mb-6">
                Send a message to {otherParticipant?.name || 'this user'} to get started
              </p>
              <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl p-6 max-w-md mx-auto border border-slate-700/50">
                <p className="text-slate-300 text-sm">
                  💡 You can send text messages, images, videos, and documents
                </p>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Enhanced File Upload Progress */}
      {fileUploading && (
        <div className="px-6 py-4 bg-slate-800/60 backdrop-blur-xl border-t border-slate-700/50 relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                <HiOutlineDocument className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-slate-200 mb-2 font-medium">Uploading file...</div>
                <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-violet-500 to-purple-600 h-2 rounded-full transition-all duration-300 shadow-lg shadow-violet-500/25"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
              <span className="text-sm text-slate-300 font-mono">{uploadProgress}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Message Input */}
      <div className="bg-slate-800/60 backdrop-blur-xl border-t border-slate-700/50 px-6 py-4 relative z-10">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-700/10 to-transparent"></div>
        
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative z-10">
          <div className="flex items-end space-x-4">
            {/* File Upload Button with Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFileMenu(!showFileMenu)}
                disabled={fileUploading}
                className="w-12 h-12 bg-slate-700/50 hover:bg-slate-600/70 rounded-xl transition-all duration-300 flex items-center justify-center group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <HiOutlinePaperClip className="h-5 w-5 text-slate-400 group-hover:text-slate-200 group-hover:rotate-45 transition-all" />
              </button>

              {/* File Menu */}
              {showFileMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowFileMenu(false)}
                  ></div>
                  <div className="absolute bottom-16 left-0 bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-3 min-w-48 z-20">
                    <button
                      onClick={() => {
                        imageInputRef.current?.click();
                        setShowFileMenu(false);
                      }}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-slate-300 hover:bg-slate-700/50 rounded-xl transition-colors"
                    >
                      <HiOutlinePhotograph className="h-5 w-5 text-cyan-400" />
                      <span>Photo or Video</span>
                    </button>
                    <button
                      onClick={() => {
                        fileInputRef.current?.click();
                        setShowFileMenu(false);
                      }}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-slate-300 hover:bg-slate-700/50 rounded-xl transition-colors"
                    >
                      <HiOutlineDocument className="h-5 w-5 text-emerald-400" />
                      <span>Document</span>
                    </button>
                  </div>
                </>
              )}
            </div>
            
            {/* Message Input Container */}
            <div className="flex-1 relative">
              <div className="bg-slate-700/50 backdrop-blur-sm border border-slate-600/50 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-violet-500/50 transition-all duration-300">
                <input
                  type="text"
                  value={messageInput}
                  onChange={handleInputChange}
                  onBlur={stopTyping}
                  placeholder={connected ? "Type a message..." : "Connecting..."}
                  className="w-full px-6 py-4 bg-transparent text-slate-100 placeholder-slate-400 focus:outline-none resize-none"
                  disabled={!connected || sending}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />
              </div>
            </div>
            
            {/* Send Button */}
            <button
              type="submit"
              disabled={!messageInput.trim() || !connected || sending}
              className="w-12 h-12 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 rounded-xl transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25 group"
              title={
                !connected ? "Not connected" :
                !messageInput.trim() ? "Type a message" :
                sending ? "Sending..." : "Send message"
              }
            >
              {sending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : (
                <HiOutlinePaperAirplane className="h-5 w-5 text-white group-hover:translate-x-0.5 transition-transform" />
              )}
            </button>
          </div>
        </form>
        
        {/* Hidden File Inputs */}
        <input
          ref={imageInputRef}
          type="file"
          className="hidden"
          accept="image/*,video/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            console.log('📸 Image/Video file selected:', file);
            if (file) {
              // Validate file before uploading
              console.log('File details:', {
                name: file.name,
                type: file.type,
                size: file.size,
                lastModified: file.lastModified
              });
              handleFileUpload(file);
              e.target.value = ''; // Reset input
            }
          }}
        />
        
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx"
          onChange={(e) => {
            const file = e.target.files?.[0];
            console.log('📄 Document file selected:', file);
            if (file) {
              // Validate file before uploading
              console.log('File details:', {
                name: file.name,
                type: file.type,
                size: file.size,
                lastModified: file.lastModified
              });
              handleFileUpload(file);
              e.target.value = ''; // Reset input
            }
          }}
        />
      </div>

      {/* Chat Menu */}
      {showChatMenu && (
        <>
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" 
            onClick={() => setShowChatMenu(false)}
          ></div>
          
          <div className="fixed top-20 right-6 w-64 bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-700/20 to-transparent"></div>
            
            <div className="p-3 relative z-10">
              <button className="w-full text-left px-4 py-3 text-slate-300 hover:bg-slate-700/50 rounded-xl transition-all duration-300 flex items-center space-x-3 group">
                <HiOutlinePhone className="h-5 w-5" />
                <span className="font-medium">Voice Call</span>
              </button>
              
              <button className="w-full text-left px-4 py-3 text-slate-300 hover:bg-slate-700/50 rounded-xl transition-all duration-300 flex items-center space-x-3 group">
                <HiOutlineVideoCamera className="h-5 w-5" />
                <span className="font-medium">Video Call</span>
              </button>
              
              <div className="border-t border-slate-700/50 my-3"></div>
              
              <button className="w-full text-left px-4 py-3 text-slate-300 hover:bg-slate-700/50 rounded-xl transition-all duration-300 flex items-center space-x-3 group">
                <HiOutlinePhotograph className="h-5 w-5" />
                <span className="font-medium">View Media</span>
              </button>
              
              <button className="w-full text-left px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-300 flex items-center space-x-3 group">
                <HiOutlineTrash className="h-5 w-5" />
                <span className="font-medium">Clear Chat</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatPage;