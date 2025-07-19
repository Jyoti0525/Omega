import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaSearch, 
  FaPlus, 
  FaSignOutAlt, 
  FaUser, 
  FaComments, 
  FaUsers, 
  FaCog, 
  FaBell,
  FaCircle,
  FaStar,
  FaArchive,
  FaMoon,
  FaSun
} from 'react-icons/fa';
import { 
  HiOutlineChat,
  HiOutlineUserGroup,
  HiOutlineCog,
  HiOutlineBell,
  HiOutlineLogout,
  HiOutlinePlus
} from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { apiHelpers } from '../utils/api';
import { toast } from 'react-hot-toast';
import moment from 'moment';

const Dashboard = () => {
  const [chats, setChats] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [activeTab, setActiveTab] = useState('chats');
  const [darkMode, setDarkMode] = useState(true);
  
  const { user, logout } = useAuth();
  const { connected, onlineUsers, isUserOnline } = useSocket();
  const navigate = useNavigate();

  // Load user chats on component mount
  useEffect(() => {
    loadChats();
  }, []);

  // Search users when query changes
  useEffect(() => {
    if (searchQuery.trim().length >= 2 && activeTab === 'users') {
      const debounceTimer = setTimeout(() => {
        searchUsers();
      }, 300); // Add debouncing to prevent too many API calls
      
      return () => clearTimeout(debounceTimer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, activeTab]);

  const loadChats = async () => {
    try {
      const response = await apiHelpers.getUserChats();
      if (response.data.success) {
        setChats(response.data.data.chats);
      }
    } catch (error) {
      console.error('Load chats error:', error);
      toast.error('Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (searchQuery.trim().length < 2) {
      toast.error('Search query must be at least 2 characters long');
      return;
    }
    
    if (searchQuery.trim().length > 100) {
      toast.error('Search query must be less than 100 characters');
      return;
    }

    try {
      setSearchLoading(true);
      const response = await apiHelpers.searchUsers(searchQuery.trim());
      if (response.data.success) {
        setSearchResults(response.data.data.users);
      }
    } catch (error) {
      console.error('Search users error:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to search users');
      }
    } finally {
      setSearchLoading(false);
    }
  };

  const startChat = async (userId) => {
    try {
      console.log('Starting chat with user:', userId);
      const response = await apiHelpers.createPrivateChat(userId);
      if (response.data.success) {
        const chatId = response.data.data.chat._id;
        console.log('Chat created/found:', chatId);
        navigate(`/chat/${chatId}`);
      }
    } catch (error) {
      console.error('Start chat error:', error);
      toast.error('Failed to start chat. Please try again.');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const messageTime = moment(timestamp);
    const now = moment();
    
    if (now.diff(messageTime, 'minutes') < 1) {
      return 'now';
    } else if (now.diff(messageTime, 'hours') < 1) {
      return `${now.diff(messageTime, 'minutes')}m`;
    } else if (now.diff(messageTime, 'days') < 1) {
      return `${now.diff(messageTime, 'hours')}h`;
    } else if (now.diff(messageTime, 'days') < 7) {
      return `${now.diff(messageTime, 'days')}d`;
    } else {
      return messageTime.format('MMM DD');
    }
  };

  const truncateMessage = (message, maxLength = 45) => {
    if (!message) return '';
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-600 border-t-violet-500 mx-auto mb-6"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-t-cyan-500 animate-spin mx-auto" style={{ animationDelay: '0.1s', animationDirection: 'reverse' }}></div>
          </div>
          <p className="text-slate-300 text-lg font-medium">Loading your workspace...</p>
          <p className="text-slate-500 text-sm mt-2">Preparing your conversations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: '20px 20px'
        }}></div>
      </div>
      
      <div className="flex h-screen relative">
        {/* Left Sidebar - Enhanced Navigation */}
        <div className="w-20 bg-slate-800/90 backdrop-blur-xl border-r border-slate-700/50 flex flex-col items-center py-6 relative">
          {/* Glass effect overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-700/20 to-transparent"></div>
          
          {/* Logo */}
          <div className="w-12 h-12 bg-gradient-to-tr from-violet-500 via-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-8 relative shadow-2xl shadow-violet-500/25">
            <div className="absolute inset-0 bg-gradient-to-tr from-violet-400 to-indigo-500 rounded-2xl blur opacity-75"></div>
            <HiOutlineChat className="h-6 w-6 text-white relative z-10" />
          </div>
          
          {/* Navigation Buttons */}
          <div className="space-y-3 relative z-10">
            <button
              onClick={() => setActiveTab('chats')}
              className={`group w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 relative overflow-hidden ${
                activeTab === 'chats' 
                  ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-2xl shadow-violet-500/25' 
                  : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/70 hover:text-slate-200'
              }`}
              title="Messages"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <HiOutlineChat className="h-6 w-6 relative z-10" />
              {activeTab === 'chats' && (
                <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-full"></div>
              )}
            </button>
            
            <button
              onClick={() => setActiveTab('users')}
              className={`group w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 relative overflow-hidden ${
                activeTab === 'users' 
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-2xl shadow-cyan-500/25' 
                  : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/70 hover:text-slate-200'
              }`}
              title="Find People"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <HiOutlineUserGroup className="h-6 w-6 relative z-10" />
              {activeTab === 'users' && (
                <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-full"></div>
              )}
            </button>
          </div>
          
          {/* Bottom Section */}
          <div className="flex-1"></div>
          
          <div className="space-y-3 relative z-10">
            <button className="w-14 h-14 bg-slate-700/50 rounded-2xl flex items-center justify-center hover:bg-slate-600/70 transition-all duration-300 relative group">
              <HiOutlineBell className="h-6 w-6 text-slate-400 group-hover:text-slate-200" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
            </button>
            
            <button className="w-14 h-14 bg-slate-700/50 rounded-2xl flex items-center justify-center hover:bg-slate-600/70 transition-all duration-300 group">
              <HiOutlineCog className="h-6 w-6 text-slate-400 group-hover:text-slate-200" />
            </button>
            
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 relative shadow-xl shadow-emerald-500/25"
              title="Profile"
            >
              <span className="text-white font-bold text-lg">
                {user?.name?.charAt(0)?.toUpperCase()}
              </span>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-slate-800 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Chat List Panel */}
          <div className="w-96 bg-slate-800/60 backdrop-blur-xl border-r border-slate-700/50 relative">
            {/* Glass effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-700/10 to-transparent pointer-events-none"></div>
            
            {/* Header */}
            <div className="p-6 border-b border-slate-700/50 relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-slate-100 mb-1">
                    {activeTab === 'chats' ? 'Messages' : 'Discover People'}
                  </h1>
                  <p className="text-slate-400 text-sm">
                    {activeTab === 'chats' ? `${chats.length} conversations` : 'Find new connections'}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('users')}
                  className="w-12 h-12 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl flex items-center justify-center hover:from-violet-600 hover:to-purple-700 transition-all duration-300 shadow-lg shadow-violet-500/25 group"
                  title="New Chat"
                >
                  <HiOutlinePlus className="h-5 w-5 text-white group-hover:scale-110 transition-transform" />
                </button>
              </div>

              {/* Enhanced Search Bar */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-slate-700 to-slate-600 rounded-xl opacity-50"></div>
                <div className="relative bg-slate-700/80 backdrop-blur-sm border border-slate-600/50 rounded-xl overflow-hidden">
                  <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder={activeTab === 'chats' ? "Search conversations..." : "Search users (min 2 chars)..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-transparent text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all duration-300"
                    minLength={activeTab === 'users' ? 2 : 0}
                    maxLength={100}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="overflow-y-auto h-full pb-20 relative z-10">
              {activeTab === 'chats' ? (
                /* Enhanced Chat List */
                <div className="p-3">
                  {chats.length > 0 ? (
                    chats
                      .filter(chat => {
                        if (!searchQuery) return true;
                        const otherParticipant = chat.otherParticipants[0];
                        return otherParticipant?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                               chat.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase());
                      })
                      .map((chat) => {
                        const otherParticipant = chat.otherParticipants[0];
                        const isOnline = otherParticipant && isUserOnline(otherParticipant._id);
                        
                        return (
                          <div
                            key={chat._id}
                            className="group p-4 hover:bg-slate-700/40 cursor-pointer transition-all duration-300 rounded-2xl mb-2 relative overflow-hidden border border-transparent hover:border-slate-600/30"
                            onClick={() => navigate(`/chat/${chat._id}`)}
                          >
                            {/* Hover gradient */}
                            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            
                            <div className="flex items-center space-x-4 relative z-10">
                              <div className="relative">
                                <div className={`w-14 h-14 bg-gradient-to-r ${getAvatarColor(otherParticipant?.name)} rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                                  {otherParticipant?.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                {isOnline && (
                                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-slate-800 flex items-center justify-center">
                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <h3 className="text-base font-semibold text-slate-100 truncate group-hover:text-violet-200 transition-colors">
                                    {chat.chatName || otherParticipant?.name || 'Unknown User'}
                                  </h3>
                                  <span className="text-xs text-slate-400 font-medium">
                                    {formatLastMessageTime(chat.lastMessageTime)}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-400 truncate group-hover:text-slate-300 transition-colors">
                                  {chat.lastMessage ? 
                                    chat.lastMessage.messageType === 'text' ? 
                                      truncateMessage(chat.lastMessage.content) :
                                      `📎 ${chat.lastMessage.messageType}` :
                                    'No messages yet'
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    /* Enhanced Empty State */
                    <div className="p-12 text-center">
                      <div className="w-20 h-20 bg-gradient-to-r from-slate-700 to-slate-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                        <HiOutlineChat className="h-10 w-10 text-slate-400" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-200 mb-3">No conversations yet</h3>
                      <p className="text-slate-400 mb-6 leading-relaxed">Start your first conversation by connecting with people</p>
                      <button
                        onClick={() => setActiveTab('users')}
                        className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-violet-600 hover:to-purple-700 transition-all duration-300 shadow-lg shadow-violet-500/25 font-medium"
                      >
                        Discover People
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Enhanced User Search Results */
                <div className="p-3">
                  {searchQuery && searchQuery.trim().length < 2 && activeTab === 'users' ? (
                    <div className="p-8 text-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FaSearch className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-slate-300 text-sm">Type at least 2 characters to search for users</p>
                    </div>
                  ) : searchQuery && searchResults.length > 0 ? (
                    searchResults.map((searchUser) => (
                      <div
                        key={searchUser._id}
                        className="group p-4 hover:bg-slate-700/40 cursor-pointer transition-all duration-300 rounded-2xl mb-2 relative overflow-hidden border border-transparent hover:border-slate-600/30"
                        onClick={() => startChat(searchUser._id)}
                      >
                        {/* Hover gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        
                        <div className="flex items-center space-x-4 relative z-10">
                          <div className="relative">
                            <div className={`w-14 h-14 bg-gradient-to-r ${getAvatarColor(searchUser.name)} rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                              {searchUser.name.charAt(0).toUpperCase()}
                            </div>
                            {isUserOnline(searchUser._id) && (
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-slate-800 flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-slate-100 group-hover:text-cyan-200 transition-colors">{searchUser.name}</h3>
                            <p className="text-sm text-slate-400 truncate">{searchUser.email}</p>
                          </div>
                          <button className="opacity-0 group-hover:opacity-100 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 shadow-lg shadow-cyan-500/25 font-medium">
                            Start Chat
                          </button>
                        </div>
                      </div>
                    ))
                  ) : searchQuery && searchQuery.trim().length >= 2 && !searchLoading ? (
                    <div className="p-12 text-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-slate-600 to-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FaUsers className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-slate-400">No users found for "<span className="text-slate-200">{searchQuery}</span>"</p>
                      <p className="text-slate-500 text-sm mt-2">Try a different search term</p>
                    </div>
                  ) : !searchQuery ? (
                    <div className="p-12 text-center">
                      <div className="w-20 h-20 bg-gradient-to-r from-slate-700 to-slate-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                        <HiOutlineUserGroup className="h-10 w-10 text-slate-400" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-200 mb-3">Discover People</h3>
                      <p className="text-slate-400 leading-relaxed">Search for users to start new conversations</p>
                    </div>
                  ) : null}
                  
                  {searchLoading && (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-600 border-t-cyan-500 mx-auto"></div>
                      <p className="text-slate-400 mt-3 text-sm">Searching...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Right Panel - Welcome/Status */}
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-800/30 to-slate-900/50 backdrop-blur-sm relative">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, rgba(139, 92, 246, 0.3) 2px, transparent 0)`,
                backgroundSize: '40px 40px'
              }}></div>
            </div>
            
            <div className="text-center max-w-lg relative z-10">
              {/* Animated Logo */}
              <div className="relative mb-8">
                <div className="w-32 h-32 bg-gradient-to-tr from-violet-500 via-purple-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-violet-500/25 relative">
                  <div className="absolute inset-0 bg-gradient-to-tr from-violet-400 to-indigo-500 rounded-3xl blur-xl opacity-75 animate-pulse"></div>
                  <HiOutlineChat className="h-16 w-16 text-white relative z-10" />
                </div>
                <div className="absolute -inset-4 bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-full blur-2xl animate-pulse"></div>
              </div>
              
              <h2 className="text-4xl font-bold text-slate-100 mb-3 bg-gradient-to-r from-violet-200 to-purple-200 bg-clip-text text-transparent">
                Welcome to ChatSpace
              </h2>
              <p className="text-slate-300 mb-8 text-lg leading-relaxed">
                Connect, communicate, and collaborate with your team in real-time
              </p>
              
              {/* Enhanced Status Card */}
              <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl p-6 mb-8 border border-slate-700/50 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-purple-500/5"></div>
                
                <div className="flex items-center justify-center space-x-3 mb-4 relative z-10">
                  <div className={`w-4 h-4 rounded-full ${connected ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-red-400 shadow-lg shadow-red-400/50'} animate-pulse`}></div>
                  <span className="text-lg font-semibold text-slate-200">
                    {connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 relative z-10">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-violet-400">{onlineUsers.length}</p>
                    <p className="text-slate-400 text-sm">Online Now</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-cyan-400">{chats.length}</p>
                    <p className="text-slate-400 text-sm">Conversations</p>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={() => setActiveTab('users')}
                className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-violet-600 hover:to-purple-700 transition-all duration-300 inline-flex items-center space-x-3 shadow-2xl shadow-violet-500/25 font-semibold text-lg group"
              >
                <HiOutlinePlus className="h-5 w-5 group-hover:scale-110 transition-transform" />
                <span>Start New Conversation</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Profile Dropdown */}
      {showProfile && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" 
            onClick={() => setShowProfile(false)}
          ></div>
          
          {/* Profile Menu */}
          <div className="fixed bottom-28 left-6 w-80 bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-700/20 to-transparent"></div>
            
            <div className="p-6 border-b border-slate-700/50 relative z-10">
              <div className="flex items-center space-x-4">
                <div className={`w-16 h-16 bg-gradient-to-r ${getAvatarColor(user?.name)} rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                  {user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-100">{user?.name}</p>
                  <p className="text-slate-400">{user?.email}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-xs text-green-400 font-medium">Online</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-3 relative z-10">
              <button className="w-full text-left px-4 py-3 text-slate-300 hover:bg-slate-700/50 rounded-xl transition-all duration-300 flex items-center space-x-3 group">
                <HiOutlineCog className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
                <span className="font-medium">Settings & Privacy</span>
              </button>
              
              <button className="w-full text-left px-4 py-3 text-slate-300 hover:bg-slate-700/50 rounded-xl transition-all duration-300 flex items-center space-x-3 group">
                <HiOutlineBell className="h-5 w-5" />
                <span className="font-medium">Notifications</span>
                <div className="ml-auto w-2 h-2 bg-red-500 rounded-full"></div>
              </button>
              
              <div className="border-t border-slate-700/50 my-3"></div>
              
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-300 flex items-center space-x-3 group"
              >
                <HiOutlineLogout className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;