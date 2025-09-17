const { PrismaClient } = require('@prisma/client');

async function main() {
  // 从环境变量读取数据库连接
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/database'
      }
    }
  });

  try {
    console.log('=== 查询ClassroomBooking记录 ===');
    const bookings = await prisma.classroomBooking.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        course: { select: { name: true, courseCode: true } },
        classroom: { select: { name: true, room: true } }
      }
    });

    console.log('找到', bookings.length, '条记录:');
    bookings.forEach((booking, index) => {
      console.log(`\n${index + 1}. ID: ${booking.id}`);
      console.log(`   课程: ${booking.course?.name} (${booking.course?.courseCode})`);
      console.log(`   教室: ${booking.classroom?.name} (${booking.classroom?.roomNumber})`);
      console.log(`   开始时间: ${booking.startTime}`);
      console.log(`   结束时间: ${booking.endTime}`);
      console.log(`   状态: ${booking.status}`);
      console.log(`   创建时间: ${booking.createdAt}`);
    });

    console.log('\n=== 查询今天的记录 ===');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayBookings = await prisma.classroomBooking.findMany({
      where: {
        startTime: { gte: today },
        endTime: { lte: tomorrow },
        status: 'active'
      },
      include: {
        course: { select: { name: true, courseCode: true } },
        classroom: { select: { name: true, room: true } }
      }
    });

    console.log('今天的活跃预订:', todayBookings.length, '条');
    todayBookings.forEach((booking, index) => {
      console.log(`${index + 1}. ${booking.course?.name} -> ${booking.classroom?.name}`);
      console.log(`   时间: ${booking.startTime} - ${booking.endTime}`);
    });

    // 查询人工智能导论课程
    console.log('\n=== 查询"人工智能导论"课程的预订 ===');
    const aiCourseBookings = await prisma.classroomBooking.findMany({
      where: {
        course: {
          name: { contains: '人工智能导论' }
        }
      },
      include: {
        course: { select: { name: true, courseCode: true, id: true } },
        classroom: { select: { name: true, roomNumber: true, id: true } }
      }
    });

    console.log('人工智能导论课程预订:', aiCourseBookings.length, '条');
    aiCourseBookings.forEach((booking, index) => {
      console.log(`${index + 1}. 课程ID: ${booking.courseId}`);
      console.log(`   课程名: ${booking.course?.name}`);
      console.log(`   教室ID: ${booking.classroomId}`);
      console.log(`   教室名: ${booking.classroom?.name}`);
      console.log(`   时间: ${booking.startTime} - ${booking.endTime}`);
      console.log(`   状态: ${booking.status}`);
    });

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();