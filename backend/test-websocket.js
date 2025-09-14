const io = require('socket.io-client');

const socket = io('http://localhost:3000/classrooms', {
  transports: ['websocket', 'polling'],
  query: {
    userId: 'test-user',
    userType: 'teacher'
  }
});

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server');
  console.log('Socket ID:', socket.id);

  // 3秒后断开
  setTimeout(() => {
    socket.disconnect();
    process.exit(0);
  }, 3000);
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

console.log('🚀 Attempting to connect to WebSocket server...');