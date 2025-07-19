# MERN Chat Application - Backend

A production-ready real-time chat application backend built with Node.js, Express, MongoDB, and Socket.io.

## 🚀 Features

- **Authentication & Authorization**: JWT-based secure authentication
- **Real-time Messaging**: Socket.io for instant messaging
- **File Sharing**: Upload images, videos, and documents
- **User Management**: Complete CRUD operations
- **Online Status**: Real-time user online/offline tracking
- **Message Status**: Read/delivered/sent status tracking
- **Rate Limiting**: API rate limiting for security
- **File Upload**: Cloudinary integration for cloud storage
- **Production Ready**: Comprehensive error handling and logging

## 🛠️ Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Real-time**: Socket.io
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: Cloudinary
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: Express Validator

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Cloudinary account (for file uploads)

### Step 1: Clone and Install
```bash
git clone <repository-url>
cd mern-chat-backend
npm install
```

### Step 2: Environment Setup
```bash
# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Step 3: Required Environment Variables
```env
# Server
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/mern-chat-app

# JWT
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRES_IN=30d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

### Step 4: Start the Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 📚 API Endpoints

### Authentication Routes
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### User Routes
- `GET /api/users` - Get all users (paginated)
- `GET /api/users/contacts` - Get user contacts
- `GET /api/users/search` - Search users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Chat Routes
- `POST /api/chat/private` - Create/get private chat
- `POST /api/chat/message` - Send message
- `GET /api/chat/user-chats` - Get user's chats
- `GET /api/chat/:chatId/messages` - Get chat messages
- `PUT /api/chat/:chatId/mark-read` - Mark messages as read
- `DELETE /api/chat/message/:messageId` - Delete message

### Upload Routes
- `POST /api/upload/image` - Upload image
- `POST /api/upload/video` - Upload video
- `POST /api/upload/document` - Upload document
- `DELETE /api/upload/:cloudinaryId` - Delete file

### Health Check
- `GET /health` - Server health status

## 🔌 Socket.io Events

### Client to Server Events
- `joinChat` - Join a chat room
- `leaveChat` - Leave a chat room
- `sendMessage` - Send a message
- `typing` - Show typing indicator
- `stopTyping` - Hide typing indicator
- `markAsRead` - Mark messages as read

### Server to Client Events
- `newMessage` - New message received
- `userOnline` - User came online
- `userOffline` - User went offline
- `userTyping` - User is typing
- `userStoppedTyping` - User stopped typing
- `messagesRead` - Messages were read
- `messageNotification` - Message notification
- `activeUsers` - Online users list

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Prevent brute force attacks
- **Input Validation**: Comprehensive input validation
- **CORS Protection**: Configured cross-origin resource sharing
- **Helmet**: Security headers
- **File Upload Security**: File type and size validation

## 🚀 Production Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=5000
CLIENT_URL=https://your-frontend-domain.com
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mern-chat-app
```

### Recommended Production Setup
1. **Process Manager**: Use PM2 for process management
2. **Reverse Proxy**: Nginx for load balancing
3. **SSL/TLS**: HTTPS certificates
4. **Database**: MongoDB Atlas or dedicated server
5. **File Storage**: Cloudinary for cloud storage
6. **Monitoring**: Application monitoring and logging

### PM2 Configuration
```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start server.js --name "chat-backend"

# Save PM2 configuration
pm2 save
pm2 startup
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

## 📁 Project Structure

```
backend/
├── config/
│   └── db.js                 # Database configuration
├── controllers/
│   ├── authController.js     # Authentication logic
│   ├── userController.js     # User management
│   └── chatController.js     # Chat functionality
├── middleware/
│   ├── auth.js              # JWT authentication
│   └── upload.js            # File upload handling
├── models/
│   ├── User.js              # User schema
│   ├── Chat.js              # Chat schema
│   └── Message.js           # Message schema
├── routes/
│   ├── auth.js              # Auth routes
│   ├── users.js             # User routes
│   ├── chat.js              # Chat routes
│   └── upload.js            # Upload routes
├── socket/
│   └── socketHandler.js     # Socket.io logic
├── uploads/                 # Local file storage
├── .env.example             # Environment variables template
├── package.json             # Dependencies
└── server.js               # Main server file
```

## 🔧 Configuration

### Database Indexes
The application automatically creates indexes for:
- User email and mobile (unique)
- Chat participants and last message time
- Message chat ID and creation time

### File Upload Limits
- **Images**: 5MB maximum
- **Videos**: 50MB maximum
- **Documents**: 10MB maximum

### Rate Limiting
- **General API**: 100 requests per 15 minutes
- **Authentication**: 10 requests per 15 minutes

## 🐛 Troubleshooting

### Common Issues
1. **MongoDB Connection**: Ensure MongoDB is running and connection string is correct
2. **Cloudinary Setup**: Verify Cloudinary credentials in .env
3. **CORS Issues**: Check CLIENT_URL in .env matches frontend URL
4. **File Upload**: Ensure uploads directory exists and has write permissions

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run dev
```

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

For support and questions, please open an issue in the repository.