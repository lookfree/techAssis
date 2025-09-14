const io = require('socket.io-client');

// 测试带 token 的连接
const socket = io('http://localhost:3000/classrooms', {
  transports: ['polling', 'websocket'],
  query: {
    userId: 'test-user-with-token',
    userType: 'teacher'
  },
  auth: {
    token: 'test-token-123456'
  }
});

socket.on('connect', () => {
  console.log('✅ Connected with token to WebSocket server');
  console.log('Socket ID:', socket.id);

  setTimeout(() => {
    socket.disconnect();
    process.exit(0);
  }, 2000);
});

socket.on('connected', (data) => {
  console.log('📨 Received connected event:', data);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
  process.exit(1);
});

socket.on('disconnect', () => {
  console.log('🔌 Disconnected from server');
});

console.log('🚀 Attempting to connect to WebSocket server with auth token...');