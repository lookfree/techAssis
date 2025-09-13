// 测试教室座位图获取的修复效果
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testClassroomFix() {
  console.log('=== 测试教室座位图获取修复效果 ===\n');

  // 从数据库查询结果中我们知道人工智能导论的课程ID
  const testData = {
    courseId: 'cs301-course-id', // 这个需要从数据库获取实际的ID
    classroomId: 'cmfgj1ha60000themz3gqsrkw', // 这是兜底的教室ID
    sessionDate: '2025-09-12', // 今天的日期
    timeSlot: '1'
  };

  try {
    // 1. 测试老师端的API调用（直接指定教室）
    console.log('1. 测试老师端API: /classrooms/{classroomId}/seat-map');
    console.log(`   调用: GET /classrooms/${testData.classroomId}/seat-map?courseId=${testData.courseId}&sessionDate=${testData.sessionDate}&timeSlot=${testData.timeSlot}`);
    
    const teacherResponse = await axios.get(`${BASE_URL}/classrooms/${testData.classroomId}/seat-map`, {
      params: {
        courseId: testData.courseId,
        sessionDate: testData.sessionDate,
        timeSlot: testData.timeSlot
      }
    });
    
    console.log(`   老师端教室: ${teacherResponse.data.classroom?.name} (${teacherResponse.data.classroom?.id})`);

    // 2. 测试学生端的API调用（通过session）
    console.log('\n2. 测试学生端API: /classrooms/sessions/{sessionId}/seat-map');
    
    // 首先创建一个session或查找现有session
    let sessionId = 'test-session-id'; // 这个需要从实际的AttendanceSession获取
    console.log(`   调用: GET /classrooms/sessions/${sessionId}/seat-map?courseId=${testData.courseId}&sessionDate=${testData.sessionDate}&timeSlot=${testData.timeSlot}`);
    
    const studentResponse = await axios.get(`${BASE_URL}/classrooms/sessions/${sessionId}/seat-map`, {
      params: {
        courseId: testData.courseId,
        sessionDate: testData.sessionDate,
        timeSlot: testData.timeSlot
      }
    });
    
    console.log(`   学生端教室: ${studentResponse.data.classroom?.name} (${studentResponse.data.classroom?.id})`);

    // 3. 比较结果
    console.log('\n=== 比较结果 ===');
    const teacherClassroomId = teacherResponse.data.classroom?.id;
    const studentClassroomId = studentResponse.data.classroom?.id;
    
    if (teacherClassroomId === studentClassroomId) {
      console.log('✅ 成功！老师端和学生端看到相同的教室');
      console.log(`   教室: ${teacherResponse.data.classroom?.name} (${teacherClassroomId})`);
    } else {
      console.log('❌ 失败！老师端和学生端看到不同的教室');
      console.log(`   老师端: ${teacherResponse.data.classroom?.name} (${teacherClassroomId})`);
      console.log(`   学生端: ${studentResponse.data.classroom?.name} (${studentClassroomId})`);
    }

  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.log('\n提示: 可能需要先创建AttendanceSession或使用正确的courseId');
    }
  }
}

testClassroomFix();