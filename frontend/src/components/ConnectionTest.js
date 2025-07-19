// import React, { useState, useEffect } from 'react';
// import { apiHelpers } from '../utils/api';

// const ConnectionTest = () => {
//   const [connectionStatus, setConnectionStatus] = useState('testing');
//   const [backendInfo, setBackendInfo] = useState(null);
//   const [error, setError] = useState(null);

//   const testConnection = async () => {
//     try {
//       setConnectionStatus('testing');
//       setError(null);
      
//       console.log('Testing connection to backend...');
      
//       // Test basic connection
//       const response = await apiHelpers.testConnection();
//       console.log('Backend response:', response.data);
      
//       setBackendInfo(response.data);
//       setConnectionStatus('connected');
      
//     } catch (error) {
//       console.error('Connection test failed:', error);
//       setError(error.message);
//       setConnectionStatus('failed');
//     }
//   };

//   useEffect(() => {
//     testConnection();
//   }, []);

//   const testSignup = async () => {
//     try {
//       const testData = {
//         name: 'Test User',
//         email: `test${Date.now()}@example.com`,
//         mobile: `98765${Math.floor(Math.random() * 10000)}`,
//         password: 'Test123'
//       };
      
//       console.log('Testing signup with:', testData);
//       const response = await apiHelpers.signup(testData);
//       console.log('Signup test result:', response.data);
//       alert('Signup test successful!');
      
//     } catch (error) {
//       console.error('Signup test failed:', error);
//       alert(`Signup test failed: ${error.response?.data?.message || error.message}`);
//     }
//   };

//   return (
//     <div className="fixed top-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg z-50 max-w-sm">
//       <h3 className="font-bold text-lg mb-3">Connection Test</h3>
      
//       <div className="space-y-2">
//         <div className="flex items-center space-x-2">
//           <span>Status:</span>
//           <span className={`px-2 py-1 rounded text-sm ${
//             connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
//             connectionStatus === 'failed' ? 'bg-red-100 text-red-800' :
//             'bg-yellow-100 text-yellow-800'
//           }`}>
//             {connectionStatus}
//           </span>
//         </div>

//         {backendInfo && (
//           <div className="text-xs text-gray-600">
//             <div>Port: {backendInfo.port}</div>
//             <div>Env: {backendInfo.environment}</div>
//             <div>Time: {new Date(backendInfo.timestamp).toLocaleTimeString()}</div>
//           </div>
//         )}

//         {error && (
//           <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
//             {error}
//           </div>
//         )}

//         <div className="flex space-x-2 pt-2">
//           <button
//             onClick={testConnection}
//             className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
//           >
//             Retry
//           </button>
          
//           {connectionStatus === 'connected' && (
//             <button
//               onClick={testSignup}
//               className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
//             >
//               Test Signup
//             </button>
//           )}
//         </div>

//         <div className="text-xs text-gray-500 mt-2">
//           Expected: http://localhost:8000
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ConnectionTest;