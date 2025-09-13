const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  // Find an active attendance session
  const session = await prisma.attendanceSession.findFirst({
    where: { status: 'active' },
    include: {
      course: true,
      attendances: {
        include: {
          student: true
        }
      }
    }
  });
  
  if (session) {
    console.log('Session ID:', session.id);
    console.log('Course ID:', session.courseId);
    console.log('Status:', session.status);
    console.log('Number of attendance records:', session.attendances.length);
    
    if (session.attendances.length > 0) {
      console.log('\nFirst attendance record:');
      const att = session.attendances[0];
      console.log('  Attendance ID:', att.id);
      console.log('  Student ID:', att.studentId);
      console.log('  Student email:', att.student?.email);
    }
  } else {
    console.log('No active session found');
  }
  
  await prisma.$disconnect();
})();