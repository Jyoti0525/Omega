# MERN Chat Application - Frontend

A modern, responsive React frontend for the MERN Chat Application with real-time messaging capabilities.

## 🚀 Features

- **Modern UI/UX**: Clean and intuitive design with Tailwind CSS
- **Real-time Messaging**: Socket.io integration for instant communication
- **File Sharing**: Upload and share images, videos, and documents
- **Responsive Design**: Mobile-first design that works on all devices
- **User Authentication**: Secure login and registration
- **Online Status**: Real-time user online/offline indicators
- **Typing Indicators**: See when someone is typing
- **Message Status**: Read receipts and delivery confirmations
- **Search Functionality**: Find users to start conversations
- **Dark/Light Theme Ready**: Prepared for theme switching

## 🛠️ Technology Stack

- **React 18**: Latest React with hooks and context
- **React Router**: Client-side routing
- **Socket.io Client**: Real-time communication
- **Axios**: HTTP client for API requests
- **Tailwind CSS**: Utility-first CSS framework
- **React Hot Toast**: Beautiful notifications
- **React Icons**: Icon library
- **Moment.js**: Date/time formatting
- **React Dropzone**: File upload handling

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Backend server running (see backend README)

### Step 1: Clone and Install
```bash
cd frontend
npm install
```

### Step 2: Environment Setup
```bash
# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Step 3: Environment Variables
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SERVER_URL=http://localhost:5000
```

### Step 4: Install Tailwind CSS
```bash
npm install -D tailwindcss postcss autoprefixer @tailwindcss/forms
npx tailwindcss init -p
```

### Step 5: Start Development Server
```bash
npm start
```

The application will open at `http://localhost:3000`

## 📁 Project Structure

```
frontend/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── Login.js
│   │   │   └── Signup.js
│   │   ├── chat/
│   │   │   └── ChatPage.js
│   │   └── Dashboard.js
│   ├── context/
│   │   ├── AuthContext.js
│   │   └── SocketContext.js
│   ├── utils/
│   │   └── api.js
│   ├── App.js
│   ├── App.css
│   ├── index.js
│   └── index.css
├── tailwind.config.js
├── package.json
└── README.md
```

## 🎨 Component Overview

### Authentication Components
- **Login.js**: User login form with validation
- **Signup.js**: User registration with password requirements

### Chat Components
- **Dashboard.js**: Main dashboard with chat list and user search
- **ChatPage.js**: Individual chat interface with messaging

### Context Providers
- **AuthContext**: Manages user authentication state
- **SocketContext**: Handles real-time communication

### Utilities
- **api.js**: HTTP client configuration and API helpers

## 🔌 API Integration

### Authentication APIs
```javascript
// Login
const result = await login(emailOrMobile, password);

// Signup
const result = await signup(userData);

// Get Profile
const profile = await getCurrentUser();
```

### Chat APIs
```javascript
// Get user chats
const chats = await apiHelpers.getUserChats();

// Send message
const response = await apiHelpers.sendMessage(messageData);

// Upload file
const upload = await uploadFileWithProgress(file, type, onProgress);
```

### Socket Events
```javascript
// Join chat
socket.emit('joinChat', { chatId });

// Send message
socket.emit('sendMessage', messageData);

// Typing indicator
socket.emit('typing', { chatId, receiverId });
```

## 🎯 Key Features Implementation

### Real-time Messaging
- Socket.io connection with authentication
- Automatic reconnection on network issues
- Message delivery and read receipts
- Typing indicators

### File Upload
- Drag and drop file upload
- Progress tracking
- File type and size validation
- Cloud storage integration (Cloudinary)

### Responsive Design
- Mobile-first approach
- Flexible layouts
- Touch-friendly interfaces
- Optimized for all screen sizes

### User Experience
- Loading states and skeletons
- Error handling with user feedback
- Smooth animations and transitions
- Accessibility features

## 🔧 Configuration

### Environment Variables

#### Development
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SERVER_URL=http://localhost:5000
```

#### Production
```env
REACT_APP_API_URL=https://your-backend-domain.com/api
REACT_APP_SERVER_URL=https://your-backend-domain.com
```

### Tailwind Configuration
The app uses custom Tailwind configuration with:
- Extended color palette
- Custom animations
- Responsive breakpoints
- Form styling plugin

## 🚀 Build and Deployment

### Development Build
```bash
npm start
```

### Production Build
```bash
npm run build
```

### Deploy to Netlify/Vercel
```bash
# Build the project
npm run build

# Deploy build folder to your hosting platform
```

### Environment Variables for Production
Set these in your hosting platform:
- `REACT_APP_API_URL`
- `REACT_APP_SERVER_URL`

## 📱 Mobile Responsiveness

The application is fully responsive with:
- **Mobile-first design**: Optimized for mobile devices
- **Touch interactions**: Swipe gestures and touch-friendly buttons
- **Responsive layouts**: Adapts to different screen sizes
- **Mobile navigation**: Simplified navigation for small screens

## 🎨 Theming and Customization

### Color Scheme
- Primary: Blue (#3b82f6)
- Secondary: Gray variations
- Success: Green (#10b981)
- Error: Red (#ef4444)
- Warning: Yellow (#f59e0b)

### Custom CSS Classes
```css
.btn-primary          /* Primary button style */
.input-field          /* Standard input field */
.message-bubble       /* Chat message bubble */
.online-pulse         /* Online status indicator */
.typing-indicator     /* Typing animation */
```

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Test Coverage
```bash
npm run test:coverage
```

### E2E Testing (if configured)
```bash
npm run test:e2e
```

## 🔍 Performance Optimization

- **Code Splitting**: Lazy loading of components
- **Image Optimization**: Responsive images and lazy loading
- **Bundle Optimization**: Tree shaking and minification
- **Caching**: API response caching
- **Memoization**: React.memo for performance

## 📋 Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🐛 Common Issues

### Socket Connection Issues
```javascript
// Check connection status
if (!connected) {
  // Handle reconnection
}
```

### File Upload Problems
```javascript
// Validate file before upload
const validation = utils.validateFile(file);
if (!validation.valid) {
  toast.error(validation.error);
  return;
}
```

### API Errors
```javascript
// API error handling
try {
  const response = await api.get('/endpoint');
} catch (error) {
  console.error('API Error:', error.response?.data?.message);
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support and questions:
- Check the backend README for API documentation
- Review the socket events documentation
- Open an issue in the repository