import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 开始初始化 SmartTeacher Pro 数据库...')
  const startTime = Date.now()

  try {
    // 1. 创建基础权限系统（注释形式，实际由角色控制）
    console.log('1️⃣  创建基础权限系统...')
    const permissions = [
      '查看数据面板', '实时监控', '查看用户', '创建用户', '编辑用户', '删除用户',
      '查看课程', '创建课程', '编辑课程', '删除课程', '管理课程状态',
      '查看学生', '管理学生', '查看学生成绩', '管理选课', '导出学生数据',
      '查看教师', '管理教师', '分配课程权限',
      '查看考勤', '管理考勤', '发起签到', '导出考勤数据', '考勤统计分析',
      '查看作业', '创建作业', '编辑作业', '删除作业', '管理作业提交',
      '批改作业', '发布成绩', '作业统计分析',
      '查看教室', '管理教室', '座位图管理', '教室预约',
      '查看通知', '发送通知', '管理通知', '系统公告',
      '查看数据面板', '教学数据分析', '学生表现分析', '课程效果分析',
      '系统配置', '用户权限管理', '数据备份', '日志查看', '系统监控',
      '超级管理员权限'
    ]
    
    console.log(`   ✅ 定义了 ${permissions.length} 个权限类别`)

    // 2. 创建管理员账号
    console.log('2️⃣  创建管理员账号...')
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@smartteacher.com' },
      update: {},
      create: {
        email: 'admin@smartteacher.com',
        firstName: '系统',
        lastName: '管理员',
        password: await bcrypt.hash('admin123456', 10),
        role: 'super_admin',
        isActive: true,
        phone: '18800000000',
        profile: {
          department: '信息技术部',
          title: '系统管理员',
          bio: '负责SmartTeacher Pro系统的整体管理和维护'
        }
      }
    })
    
    console.log(`   ✅ 创建超级管理员: ${adminUser.email}`)

    // 3. 创建教师用户
    console.log('3️⃣  创建教师用户...')
    const teachers = []
    const teacherData = [
      { name: '张小明', email: 'teacher@example.com', dept: '计算机科学与技术学院', title: '教授' },
      { name: '王副教授', email: 'teacher2@university.edu', dept: '数学与统计学院', title: '副教授' },
      { name: '赵讲师', email: 'teacher3@university.edu', dept: '物理与电子工程学院', title: '讲师' },
      { name: '陈博士', email: 'teacher4@university.edu', dept: '计算机科学与技术学院', title: '助理教授' },
      { name: '李教授', email: 'teacher5@university.edu', dept: '数学与统计学院', title: '教授' },
    ]

    for (const [index, data] of teacherData.entries()) {
      const teacher = await prisma.user.upsert({
        where: { email: data.email },
        update: {},
        create: {
          email: data.email,
          firstName: data.name.substring(0, 1),
          lastName: data.name.substring(1),
          password: await bcrypt.hash('teacher123456', 10),
          role: 'teacher',
          isActive: true,
          phone: `138${(index + 1).toString().padStart(8, '0')}`,
          profile: {
            department: data.dept,
            title: data.title,
            bio: `${data.title}，专注于相关领域的教学与研究`
          }
        }
      })
      
      teachers.push(teacher)
      logProgress('创建教师', index + 1, teacherData.length)
    }

    // 4. 创建学生用户
    console.log('4️⃣  创建学生用户...')
    const students = []
    const gradeDistribution = [
      { grade: '2021级', weight: 0.2 }, // 大四
      { grade: '2022级', weight: 0.25 }, // 大三
      { grade: '2023级', weight: 0.3 }, // 大二
      { grade: '2024级', weight: 0.25 }  // 大一
    ]
    
    const totalStudents = 150
    let studentId = 1

    for (const gradeInfo of gradeDistribution) {
      const count = Math.floor(totalStudents * gradeInfo.weight)
      
      for (let i = 0; i < count; i++) {
        const { firstName, lastName } = generateChineseName()
        const studentCode = generateStudentId(gradeInfo.grade, studentId)
        
        const student = await prisma.user.upsert({
          where: { email: `student${studentId}@university.edu` },
          update: {},
          create: {
            email: `student${studentId}@university.edu`,
            firstName,
            lastName,
            studentId: studentCode,
            password: await bcrypt.hash('student123456', 10),
            role: 'student',
            isActive: true,
            phone: generatePhone(),
            profile: {
              grade: gradeInfo.grade,
              major: randomChoice(['计算机科学与技术', '软件工程', '数据科学与大数据技术'])
            }
          }
        })

        students.push(student)
        logProgress('创建学生', studentId, totalStudents)
        studentId++
        
        // 批量处理，减少延迟
        if (studentId % 20 === 0) {
          await delay(10)
        }
      }
    }

    // 5. 创建课程体系
    console.log('5️⃣  创建课程体系...')
    const courses = []
    const courseData = [
      { name: '程序设计基础', code: 'CS101', credits: 3, description: 'C/C++程序设计入门课程' },
      { name: '数据结构与算法', code: 'CS201', credits: 4, description: '核心数据结构和算法设计' },
      { name: '人工智能导论', code: 'CS301', credits: 3, description: 'AI基础理论与应用' },
      { name: '软件工程', code: 'SE201', credits: 3, description: '软件开发生命周期管理' },
      { name: '数据库系统', code: 'CS202', credits: 4, description: '关系数据库设计与管理' },
      { name: 'Web应用开发', code: 'CS302', credits: 3, description: '现代Web应用开发技术' },
      { name: '高等数学', code: 'MATH101', credits: 4, description: '微积分基础' },
      { name: '线性代数', code: 'MATH102', credits: 3, description: '矩阵运算与向量空间' },
      { name: '机器学习', code: 'CS401', credits: 4, description: '机器学习算法与应用' }
    ]

    for (const [index, data] of courseData.entries()) {
      // 为张小明教师(teacher@example.com)分配前3门课程，其他课程随机分配
      let teacher
      if (index < 3) {
        teacher = teachers.find(t => t.email === 'teacher@example.com') || randomChoice(teachers)
      } else {
        teacher = randomChoice(teachers)
      }
      
      const currentSemester = `2024-${randomChoice(['春', '秋'])}`
      
      const course = await prisma.course.upsert({
        where: { courseCode: data.code },
        update: {},
        create: {
          name: data.name,
          courseCode: data.code,
          credits: data.credits,
          description: data.description,
          semester: currentSemester,
          teacherId: teacher.id,
          capacity: randomInt(30, 60),
          schedule: `周${randomChoice(['一', '二', '三', '四', '五'])} 第${randomInt(1, 4)}-${randomInt(5, 8)}节`,
          status: 'active'
        }
      })

      courses.push(course)
      logProgress('创建课程', index + 1, courseData.length)
    }

    // 6. 创建教室和座位系统
    console.log('6️⃣  创建教室和座位系统...')
    const classrooms = []

    // 定义各种类型的教室模板
    const classroomTemplates = [
      // 阶梯教室 - 大容量讲座型
      {
        type: 'LECTURE_HALL',
        name: '阶梯教室A101',
        location: '教学楼A栋1楼',
        capacity: 150,
        rows: 15,
        seatsPerRow: 10,
        description: '大型阶梯教室，适合举办讲座和大班授课',
        seatMapEnabled: true,
        freeSeatingEnabled: false,
        layoutConfig: {
          unavailableSeats: ['A1', 'A10', 'O1', 'O10'] // 角落位置不可用
        }
      },
      {
        type: 'LECTURE_HALL', 
        name: '阶梯教室B201',
        location: '教学楼B栋2楼',
        capacity: 200,
        rows: 20,
        seatsPerRow: 10,
        description: '超大型阶梯教室，学校最大的讲堂',
        seatMapEnabled: true,
        freeSeatingEnabled: false,
        layoutConfig: {
          unavailableSeats: ['A1', 'A2', 'A9', 'A10', 'T1', 'T2', 'T9', 'T10']
        }
      },
      // 普通教室 - 标准班级授课
      {
        type: 'REGULAR',
        name: '普通教室C301',
        location: '教学楼C栋3楼',
        capacity: 60,
        rows: 10,
        seatsPerRow: 6,
        description: '标准教室，适合日常班级授课',
        seatMapEnabled: true,
        freeSeatingEnabled: true,
        layoutConfig: {
          unavailableSeats: ['E3', 'E4'] // 中间过道位置
        }
      },
      {
        type: 'REGULAR',
        name: '普通教室A202',
        location: '教学楼A栋2楼',
        capacity: 45,
        rows: 9,
        seatsPerRow: 5,
        description: '中型普通教室，环境舒适',
        seatMapEnabled: true,
        freeSeatingEnabled: true,
        layoutConfig: {
          unavailableSeats: []
        }
      },
      {
        type: 'REGULAR',
        name: '普通教室B305',
        location: '教学楼B栋3楼', 
        capacity: 50,
        rows: 10,
        seatsPerRow: 5,
        description: '标准50座教室，采光良好',
        seatMapEnabled: true,
        freeSeatingEnabled: true,
        layoutConfig: {
          unavailableSeats: ['A1', 'J5'] // 门口和窗边特定位置
        }
      },
      // 实验室 - 小班实践教学
      {
        type: 'LAB',
        name: '计算机实验室D401',
        location: '实验楼D栋4楼',
        capacity: 30,
        rows: 6,
        seatsPerRow: 5,
        description: '计算机实验室，每位配置高性能工作站',
        seatMapEnabled: true,
        freeSeatingEnabled: false,
        layoutConfig: {
          unavailableSeats: ['C3'] // 教师演示台位置
        }
      },
      {
        type: 'LAB',
        name: '物理实验室E301',
        location: '实验楼E栋3楼',
        capacity: 24,
        rows: 6,
        seatsPerRow: 4,
        description: '物理实验室，配备先进实验设备',
        seatMapEnabled: true,
        freeSeatingEnabled: false,
        layoutConfig: {
          unavailableSeats: ['A1', 'A4', 'F1', 'F4'] // 安全通道位置
        }
      },
      {
        type: 'LAB',
        name: '化学实验室E302',
        location: '实验楼E栋3楼',
        capacity: 36,
        rows: 9,
        seatsPerRow: 4,
        description: '化学实验室，通风良好，安全设施完善',
        seatMapEnabled: true,
        freeSeatingEnabled: false,
        layoutConfig: {
          unavailableSeats: ['E2', 'E3'] // 通风口位置
        }
      },
      // 研讨室 - 小组讨论
      {
        type: 'SEMINAR',
        name: '研讨室F501',
        location: '图书馆F栋5楼',
        capacity: 20,
        rows: 4,
        seatsPerRow: 5,
        description: '小型研讨室，适合小组讨论和学术交流',
        seatMapEnabled: true,
        freeSeatingEnabled: true,
        layoutConfig: {
          unavailableSeats: []
        }
      },
      {
        type: 'SEMINAR',
        name: '研讨室G201',
        location: '行政楼G栋2楼',
        capacity: 15,
        rows: 3,
        seatsPerRow: 5,
        description: '高级研讨室，配备智能白板和视频会议设备',
        seatMapEnabled: true,
        freeSeatingEnabled: true,
        layoutConfig: {
          unavailableSeats: ['B3'] // 中央圆桌位置
        }
      },
      {
        type: 'SEMINAR',
        name: '研讨室A505',
        location: '教学楼A栋5楼',
        capacity: 25,
        rows: 5,
        seatsPerRow: 5,
        description: '中型研讨室，圆桌布局，促进互动交流',
        seatMapEnabled: true,
        freeSeatingEnabled: true,
        layoutConfig: {
          unavailableSeats: []
        }
      }
    ]

    // 首先创建教室模板
    console.log('   创建教室模板...')
    const templates = []
    const templateData = [
      {
        name: '阶梯教室模板',
        type: 'lecture_hall',
        capacity: 200,
        rows: 20,
        seatsPerRow: 10,
        description: '标准阶梯教室布局，适合大班授课'
      },
      {
        name: '普通教室模板', 
        type: 'regular',
        capacity: 60,
        rows: 10,
        seatsPerRow: 6,
        description: '标准普通教室布局，适合中小班教学'
      },
      {
        name: '实验室模板',
        type: 'lab', 
        capacity: 30,
        rows: 6,
        seatsPerRow: 5,
        description: '实验室布局，配备实验设备和操作台'
      },
      {
        name: '研讨室模板',
        type: 'seminar',
        capacity: 20,
        rows: 4,
        seatsPerRow: 5,
        description: '小型研讨室布局，适合讨论式教学'
      }
    ]

    for (const templateInfo of templateData) {
      const template = await prisma.classroomTemplate.upsert({
        where: { id: `template-${templateInfo.type}` },
        update: {},
        create: {
          id: `template-${templateInfo.type}`,
          name: templateInfo.name,
          type: templateInfo.type as any,
          description: templateInfo.description,
          capacity: templateInfo.capacity,
          rows: templateInfo.rows,
          seatsPerRow: templateInfo.seatsPerRow,
          layoutConfig: {
            seatWidth: templateInfo.type === 'lab' ? 120 : 50,
            seatHeight: templateInfo.type === 'lab' ? 80 : 40,
            rowSpacing: templateInfo.type === 'lecture_hall' ? 60 : 80,
            columnSpacing: templateInfo.type === 'lecture_hall' ? 55 : 60,
            aisleWidth: templateInfo.type === 'lecture_hall' ? 120 : 100
          },
          equipment: templateInfo.type === 'lab' 
            ? ['实验设备', '通风系统', '安全设施'] 
            : templateInfo.type === 'lecture_hall' 
            ? ['投影仪', '音响系统', '麦克风', '黑板']
            : ['投影仪', '白板', '电脑'],
          facilities: ['空调', '照明系统', '网络接入'],
          isDefault: true,
          isActive: true
        }
      })
      templates.push(template)
    }

    // 创建各种类型的教室（使用模板）
    for (const [index, template] of classroomTemplates.entries()) {
      const correspondingTemplate = templates.find(t => 
        t.type.toLowerCase() === template.type.toLowerCase()
      )
      
      const classroom = await prisma.classroom.upsert({
        where: { id: `classroom-${index + 1}` },
        update: {},
        create: {
          id: `classroom-${index + 1}`,
          name: template.name,
          location: template.location || '',
          building: template.location?.split(' ')[0] || '',
          floor: template.location?.split(' ')[1] || '',
          room: template.name.match(/[A-Z]\d+/) ? template.name.match(/[A-Z]\d+/)[0] : '',
          capacity: template.capacity,
          rows: template.rows,
          seatsPerRow: template.seatsPerRow,
          type: template.type.toLowerCase() as any,
          layout: `${template.type}_${template.rows}x${template.seatsPerRow}`,
          templateId: correspondingTemplate?.id,
          layoutConfig: template.layoutConfig || {
            seatWidth: template.type === 'LAB' ? 120 : 50,
            seatHeight: template.type === 'LAB' ? 80 : 40,
            rowSpacing: template.type === 'LECTURE_HALL' ? 60 : 80,
            columnSpacing: template.type === 'LECTURE_HALL' ? 55 : 60,
            aisleWidth: template.type === 'LECTURE_HALL' ? 120 : 100
          },
          equipment: template.type === 'LAB' 
            ? ['计算机', '投影仪', '实验设备', '网络'] 
            : template.type === 'LECTURE_HALL' 
            ? ['大屏幕', '音响系统', '讲台', '无线麦克风']
            : ['投影仪', '音响', '黑板', '网络'],
          facilities: ['空调', '照明系统', '网络接入'],
          seatMapEnabled: template.seatMapEnabled || true,
          freeSeatingEnabled: template.freeSeatingEnabled !== false,
          isActive: true
        }
      })

      classrooms.push(classroom)
      logProgress('创建独立教室', index + 1, classroomTemplates.length)
    }

    // 7. 创建教室预订（实现课程与教室的时间独占性绑定）
    console.log('7️⃣  创建教室预订和课程绑定...')
    const bookings = []
    
    // 为每个课程分配教室，确保时间独占性
    for (const [index, course] of courses.entries()) {
      // 根据课程类型选择合适的教室
      let suitableClassrooms = classrooms
      if (course.name.includes('实验') || course.name.includes('计算机')) {
        suitableClassrooms = classrooms.filter(c => c.type === 'lab')
      } else if (course.name.includes('高等数学') || course.name.includes('线性代数')) {
        suitableClassrooms = classrooms.filter(c => c.type === 'lecture_hall')
      } else {
        suitableClassrooms = classrooms.filter(c => c.type === 'regular')
      }
      
      // 如果没有合适类型的教室，使用任意教室
      if (suitableClassrooms.length === 0) {
        suitableClassrooms = classrooms
      }
      
      // 选择一个教室
      const selectedClassroom = suitableClassrooms[index % suitableClassrooms.length]
      
      // 生成课程时间安排
      const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      const dayOfWeek = (index % 5) + 1 // 1-5 对应周一到周五
      const startHour = 8 + (index % 4) * 2 // 8:00, 10:00, 12:00, 14:00 开始
      const endHour = startHour + 2
      
      const startTime = new Date('2024-09-01T00:00:00Z')
      startTime.setHours(startHour, 0, 0, 0)
      
      const endTime = new Date('2024-12-31T00:00:00Z') 
      endTime.setHours(endHour, 0, 0, 0)
      
      const booking = await prisma.classroomBooking.upsert({
        where: {
          id: `booking-${course.courseCode}-${selectedClassroom.name.replace(/\s+/g, '-')}`
        },
        update: {},
        create: {
          classroomId: selectedClassroom.id,
          courseId: course.id,
          teacherId: course.teacherId,
          startTime,
          endTime,
          dayOfWeek: dayOfWeek,
          recurring: true,
          status: 'active',
          purpose: '上课',
          notes: `${course.name} 课程教室预订`
        }
      })
      
      bookings.push(booking)
      logProgress('创建教室预订', index + 1, courses.length)
    }
    
    console.log(`   ✅ 创建了 ${bookings.length} 个教室预订，确保时间独占性`)

    // 8. 创建选课关系
    console.log('8️⃣  建立选课关系...')
    const enrollments = []
    let enrollmentCount = 0

    for (const student of students) {
      const selectedCourses = randomChoices(courses, randomInt(2, 5))
      
      for (const course of selectedCourses) {
        await prisma.enrollment.upsert({
          where: {
            studentId_courseId: {
              studentId: student.id,
              courseId: course.id
            }
          },
          update: {},
          create: {
            studentId: student.id,
            courseId: course.id,
            enrolledAt: randomDate(
              new Date('2024-08-01'),
              new Date('2024-09-15')
            ),
            status: 'active'
          }
        })

        enrollmentCount++
        logProgress('建立选课关系', enrollmentCount, students.length * 3)
        
        if (enrollmentCount % 50 === 0) {
          await delay(10)
        }
      }
    }

    // 9. 创建作业体系
    console.log('9️⃣  创建作业体系...')
    const assignments = []
    let assignmentCount = 0

    for (const course of courses) {
      const assignmentNumber = randomInt(3, 6)
      
      for (let i = 1; i <= assignmentNumber; i++) {
        const assignmentTypes = ['homework', 'project', 'quiz', 'exam']
        const assignmentType = randomChoice(assignmentTypes)
        
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + randomInt(7, 30))

        const assignment = await prisma.assignment.upsert({
          where: { 
            id: `${course.id}-${assignmentType}-${i}` // 临时唯一标识
          },
          update: {},
          create: {
            title: `${course.name} - ${getAssignmentTypeName(assignmentType)} ${i}`,
            description: `这是${course.name}课程的第${i}次${assignmentType === 'homework' ? '作业' : '任务'}，请按时完成并提交。`,
            courseId: course.id,
            teacherId: course.teacherId,
            type: assignmentType as any,
            totalPoints: assignmentType === 'exam' ? 100 : assignmentType === 'project' ? 50 : 20,
            dueDate,
            allowLateSubmission: randomBoolean(0.7),
            maxAttempts: assignmentType === 'quiz' ? 2 : 1,
            instructions: '请认真阅读题目要求，按照规范完成作业。',
            status: 'published'
          }
        })

        assignments.push(assignment)
        logProgress('创建作业', ++assignmentCount, courses.length * 4)
      }
    }

    // 🔟 生成考勤数据
    console.log('🔟 生成考勤数据...')
    const allEnrollments = await prisma.enrollment.findMany()
    let attendanceCount = 0

    for (const enrollment of allEnrollments) {
      const sessionsCount = randomInt(8, 15)
      
      for (let session = 1; session <= sessionsCount; session++) {
        const sessionDate = new Date()
        sessionDate.setDate(sessionDate.getDate() - randomInt(1, 30))
        
        const isPresent = randomBoolean(0.9)
        const status = isPresent ? (randomBoolean(0.8) ? 'present' : 'late') : 
                      (randomBoolean(0.7) ? 'absent' : 'excused')

        await prisma.attendance.upsert({
          where: {
            studentId_courseId_sessionNumber: {
              studentId: enrollment.studentId,
              courseId: enrollment.courseId,
              sessionNumber: session
            }
          },
          update: {},
          create: {
            studentId: enrollment.studentId,
            courseId: enrollment.courseId,
            sessionDate,
            sessionNumber: session,
            checkInTime: isPresent ? new Date(sessionDate.getTime() + randomInt(-300000, 600000)) : null,
            checkInMethod: isPresent ? randomChoice(['seat_selection', 'qr_code', 'manual']) : null,
            seatNumber: isPresent ? randomInt(1, 30) : null,
            status: status as any,
            notes: status === 'excused' ? '请假' : status === 'late' ? '迟到' : null,
            ipAddress: isPresent ? `192.168.1.${randomInt(1, 254)}` : null,
            deviceInfo: isPresent ? `Student Phone ${randomInt(1, 100)}` : null
          }
        })

        attendanceCount++
        logProgress('生成考勤记录', attendanceCount, allEnrollments.length * 10)
        
        if (attendanceCount % 100 === 0) {
          await delay(10)
        }
      }
    }

    // 1️⃣1️⃣ 创建作业提交和成绩
    console.log('1️⃣1️⃣ 创建作业提交和成绩...')
    let submissionCount = 0

    for (const assignment of assignments) {
      const courseEnrollments = allEnrollments.filter(e => e.courseId === assignment.courseId)
      
      for (const enrollment of courseEnrollments) {
        // 85% 的学生会提交作业
        if (!randomBoolean(0.85)) continue

        const submittedAt = new Date(assignment.dueDate)
        submittedAt.setDate(submittedAt.getDate() - randomInt(0, 7))

        const submission = await prisma.submission.upsert({
          where: {
            studentId_assignmentId_attemptNumber: {
              studentId: enrollment.studentId,
              assignmentId: assignment.id,
              attemptNumber: 1
            }
          },
          update: {},
          create: {
            studentId: enrollment.studentId,
            assignmentId: assignment.id,
            content: `这是学生对"${assignment.title}"的提交内容。学生认真完成了所有要求的任务。`,
            submittedAt,
            status: 'submitted',
            fileUrls: [`/uploads/submissions/assignment_${assignment.id}_student_${enrollment.studentId}.pdf`],
            attemptNumber: 1,
            plagiarismScore: randomInt(0, 15),
            wordCount: randomInt(500, 2000)
          }
        })

        // 创建成绩 (80% 的作业已被批改)
        if (randomBoolean(0.8)) {
          const baseScore = randomInt(60, 95)
          const finalScore = Math.min(100, baseScore + randomInt(-5, 10))

          await prisma.grade.upsert({
            where: {
              studentId_assignmentId: {
                studentId: enrollment.studentId,
                assignmentId: assignment.id
              }
            },
            update: {},
            create: {
              studentId: enrollment.studentId,
              assignmentId: assignment.id,
              submissionId: submission.id,
              score: finalScore,
              maxScore: assignment.totalPoints,
              percentage: Math.round((finalScore / assignment.totalPoints) * 100),
              feedback: finalScore >= 85 ? '优秀，继续保持！' : 
                       finalScore >= 75 ? '良好，还有提升空间。' : 
                       '需要加强相关知识点的学习。',
              gradedAt: new Date(submittedAt.getTime() + randomInt(86400000, 604800000)),
              gradedBy: assignment.teacherId
            }
          })
        }

        submissionCount++
        logProgress('创建提交和成绩', submissionCount, assignments.length * 15)
        
        if (submissionCount % 50 === 0) {
          await delay(10)
        }
      }
    }

    // 1️⃣2️⃣ 创建通知系统
    console.log('1️⃣2️⃣ 创建通知系统...')
    const allUsers = [...teachers, ...students, adminUser]
    const notificationTypes = [
      { type: 'assignment', title: '新作业发布', content: '您有新的作业需要完成，请及时查看。' },
      { type: 'grade', title: '成绩已发布', content: '您的作业成绩已经公布，请查看详情。' },
      { type: 'attendance', title: '考勤提醒', content: '请不要忘记课堂签到。' },
      { type: 'system', title: '系统维护通知', content: '系统将在今晚进行维护，请提前保存工作。' },
      { type: 'course', title: '课程安排变更', content: '下周的课程时间有所调整，请注意查看。' }
    ]

    let notificationCount = 0
    for (const user of allUsers) {
      const userNotificationCount = randomInt(2, 5)
      
      for (let i = 0; i < userNotificationCount; i++) {
        const notificationTemplate = randomChoice(notificationTypes)
        const createdAt = randomDate(
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          new Date()
        )

        await prisma.notification.create({
          data: {
            userId: user.id,
            type: notificationTemplate.type as any,
            title: notificationTemplate.title,
            content: notificationTemplate.content,
            isRead: randomBoolean(0.6),
            readAt: randomBoolean(0.6) ? 
              new Date(createdAt.getTime() + randomInt(3600000, 86400000)) : null,
            priority: randomChoice(['low', 'medium', 'high']) as any,
            data: { 
              relatedId: randomInt(1, 100),
              action: 'view_details' 
            },
            createdAt
          }
        })

        notificationCount++
        logProgress('创建通知', notificationCount, allUsers.length * 3)
        
        if (notificationCount % 30 === 0) {
          await delay(5)
        }
      }
    }

    const duration = (Date.now() - startTime) / 1000
    console.log('\\n🎉 SmartTeacher Pro 数据初始化完成!')
    console.log(`⏱️  耗时: ${duration}秒`)
    console.log('\\n📊 数据统计摘要:')
    await printDataSummary()
    console.log('\\n🔑 默认登录账户:')
    console.log('   📧 超级管理员: admin@smartteacher.com / admin123456')
    console.log('   👨‍🏫 教师示例: teacher1@university.edu / teacher123456')
    console.log('   👨‍🎓 学生示例: student1@university.edu / student123456')
    console.log('\\n✨ 系统已准备就绪，可以开始使用!')

  } catch (error) {
    console.error('\\n❌ 数据初始化失败:')
    console.error('错误详情:', error.message)
    throw error
  }
}

// 工具函数
function generateChineseName(): { firstName: string; lastName: string } {
  const surnames = [
    '王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴',
    '徐', '孙', '朱', '马', '胡', '郭', '林', '何', '高', '梁',
    '郑', '罗', '宋', '谢', '唐', '韩', '冯', '于', '董', '萧'
  ]
  
  const givenNames = [
    '伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军',
    '洋', '勇', '艳', '杰', '涛', '明', '超', '秀兰', '霞', '平',
    '辉', '华', '婷', '鹏', '飞', '红', '玲', '宇', '晨', '雪',
    '慧', '俊', '凯', '欣', '琳', '浩', '瑶', '晓', '雨', '峰'
  ]
  
  return {
    firstName: randomChoice(surnames),
    lastName: randomChoice(givenNames)
  }
}

function generateStudentId(grade: string, sequence: number): string {
  const year = grade.substring(0, 4)
  return `${year}${sequence.toString().padStart(4, '0')}`
}

function generatePhone(prefix: string = '139'): string {
  const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0')
  return prefix + suffix
}

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function randomChoices<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomBoolean(probability: number = 0.5): boolean {
  return Math.random() < probability
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

function getAssignmentTypeName(type: string): string {
  const typeMap = {
    homework: '作业',
    project: '项目',
    quiz: '小测验',
    exam: '考试'
  }
  return typeMap[type] || type
}

function logProgress(step: string, current: number, total: number) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0
  const filledBars = Math.max(0, Math.min(20, Math.floor(percentage / 5)))
  const emptyBars = Math.max(0, 20 - filledBars)
  const progressBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars)
  console.log(`   ${step}: [${progressBar}] ${percentage}% (${current}/${total})`)
}

function delay(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function printDataSummary() {
  try {
    const userCount = await prisma.user.count()
    const courseCount = await prisma.course.count()
    const enrollmentCount = await prisma.enrollment.count()
    const assignmentCount = await prisma.assignment.count()
    const attendanceCount = await prisma.attendance.count()
    const submissionCount = await prisma.submission.count()
    const gradeCount = await prisma.grade.count()
    const notificationCount = await prisma.notification.count()

    console.log(`   👥 用户总数: ${userCount}`)
    console.log(`   📚 课程总数: ${courseCount}`)
    console.log(`   📝 选课关系: ${enrollmentCount}`)
    console.log(`   📋 作业总数: ${assignmentCount}`)
    console.log(`   ✅ 考勤记录: ${attendanceCount}`)
    console.log(`   📄 作业提交: ${submissionCount}`)
    console.log(`   📊 成绩记录: ${gradeCount}`)
    console.log(`   🔔 通知消息: ${notificationCount}`)
  } catch (error) {
    console.warn('⚠️  获取数据统计时出错:', error.message)
  }
}

main()
  .catch((e) => {
    console.error('数据初始化失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })