// 用户相关类型
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  DEPARTMENT_ADMIN = 'department_admin',
  TEACHER = 'teacher',
  STUDENT = 'student',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  studentId?: string;
  role: UserRole;
  status: UserStatus;
  department?: string;
  major?: string;
  grade?: string;
  jobTitle?: string;
  bio?: string;
  avatar?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// 课程相关类型
export enum CourseStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export enum Semester {
  SPRING = 'spring',
  FALL = 'fall',
  SUMMER = 'summer',
  WINTER = 'winter',
}

export interface Course {
  id: string;
  courseCode: string;
  name: string;
  description?: string;
  credits: number;
  semester: Semester;
  academicYear: string;
  status: CourseStatus;
  teacherId: string;
  location?: string;
  schedule?: string;
  maxStudents?: number;
  coverImage?: string;
  color?: string;
  attendanceEnabled: boolean;
  assignmentEnabled: boolean;
  startDate?: Date;
  endDate?: Date;
  teacher?: User;
  enrollmentCount?: number;
  classroomBookings?: Array<{
    id: string;
    classroomId: string;
    courseId: string;
    startTime: Date;
    endTime: Date;
    dayOfWeek?: number; // 1-7 (Monday-Sunday)
    recurring?: boolean;
    classroom: {
      id: string;
      name: string;
      location?: string;
      capacity: number;
    };
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// 签到相关类型
export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  EXCUSED = 'excused',
  LEAVE_EARLY = 'leave_early',
}

export enum AttendanceMethod {
  MANUAL = 'manual',
  CODE = 'code',
  QR_CODE = 'qr_code',
  SEAT_MAP = 'seat_map',
  GEOFENCE = 'geofence',
  FACIAL_RECOGNITION = 'facial_recognition',
}

export interface Attendance {
  id: string;
  studentId: string;
  courseId: string;
  classroomId?: string;
  sessionDate: Date;
  timeSlot: string;
  status: AttendanceStatus;
  method: AttendanceMethod;
  checkInTime?: Date;
  checkOutTime?: Date;
  seatId?: string;
  lateMinutes?: number;
  excuseReason?: string;
  notes?: string;
  student?: User;
  course?: Course;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceSession {
  id: string;
  courseId: string;
  sessionDate: string;
  timeSlot: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  method: AttendanceMethod;
  allowLateCheckin: boolean;
  lateThresholdMinutes: number;
  autoCloseMinutes: number;
  attendanceCode?: string;
  qrCode?: string;
  geofence?: {
    latitude: number;
    longitude: number;
    radius: number;
  };
  totalStudents: number;
  checkedInStudents: number;
  attendanceRate?: number;
  course?: Course;
  attendances: Attendance[];
  createdAt: Date;
  updatedAt: Date;
}

// 教室和座位图类型
export enum ClassroomType {
  LECTURE_HALL = 'lecture_hall',
  REGULAR = 'regular',
  LAB = 'lab',
  SEMINAR = 'seminar',
}

export interface Classroom {
  id: string;
  courseId?: string;
  name: string;
  location?: string;
  type: ClassroomType;
  capacity: number;
  rows: number;
  seatsPerRow: number;
  layoutConfig?: {
    aisles?: number[];
    unavailableSeats?: string[];
    specialSeats?: {
      wheelchair?: string[];
      reserved?: string[];
    };
  };
  backgroundImage?: string;
  seatMapEnabled: boolean;
  freeSeatingEnabled: boolean;
  description?: string;
  course?: Course;
  createdAt: Date;
  updatedAt: Date;
}

export enum SeatStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  UNAVAILABLE = 'unavailable',
}

export interface SeatMap {
  id: string;
  classroomId: string;
  seatId: string;
  studentId?: string;
  sessionDate: Date;
  timeSlot?: string;
  status: SeatStatus;
  selectedAt?: Date;
  releasedAt?: Date;
  attendanceConfirmed: boolean;
  student?: User;
  classroom?: Classroom;
}

// 作业相关类型
export enum AssignmentType {
  HOMEWORK = 'homework',
  EXAM = 'exam',
  PROJECT = 'project',
  QUIZ = 'quiz',
  ESSAY = 'essay',
  LAB_REPORT = 'lab_report',
}

export enum AssignmentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
  GRADED = 'graded',
}

export interface Assignment {
  id: string;
  courseId: string;
  teacherId: string;
  title: string;
  description: string;
  type: AssignmentType;
  status: AssignmentStatus;
  maxScore: number;
  publishedAt?: Date;
  dueDate: Date;
  allowedFileTypes?: string[];
  maxFileSize?: number;
  allowMultipleSubmissions: boolean;
  aiGradingEnabled: boolean;
  plagiarismCheckEnabled: boolean;
  similarityThreshold: number;
  weight: number;
  attachments?: FileAttachment[];
  templates?: FileAttachment[];
  gradingRubric?: string;
  course?: Course;
  teacher?: User;
  submissionCount?: number;
  averageScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

export enum SubmissionStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  GRADED = 'graded',
  RETURNED = 'returned',
  RESUBMITTED = 'resubmitted',
}

export interface Submission {
  id: string;
  studentId: string;
  assignmentId: string;
  version: number;
  status: SubmissionStatus;
  content?: string;
  files?: FileAttachment[];
  submittedAt?: Date;
  isLate: boolean;
  lateHours?: number;
  wordCount?: number;
  studentNotes?: string;
  student?: User;
  assignment?: Assignment;
  grade?: Grade;
  createdAt: Date;
  updatedAt: Date;
}

export enum GradeStatus {
  PENDING = 'pending',
  GRADED = 'graded',
  REVIEWED = 'reviewed',
  PUBLISHED = 'published',
  APPEALED = 'appealed',
}

export interface Grade {
  id: string;
  studentId: string;
  assignmentId: string;
  submissionId?: string;
  graderId?: string;
  score: number;
  maxScore: number;
  percentage: number;
  letterGrade?: string;
  status: GradeStatus;
  feedback?: string;
  gradedAt?: Date;
  publishedAt?: Date;
  student?: User;
  assignment?: Assignment;
  submission?: Submission;
  finalScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

// 通知类型
export enum NotificationType {
  SYSTEM = 'system',
  COURSE = 'course',
  ASSIGNMENT = 'assignment',
  ATTENDANCE = 'attendance',
  GRADE = 'grade',
  ANNOUNCEMENT = 'announcement',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  content: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: Date;
  channels: string[];
  sentAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// 文件附件类型
export interface FileAttachment {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt?: Date;
}

// API响应类型
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// 认证相关类型
export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Partial<User>;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// 统计数据类型
export interface DashboardStats {
  totalCourses: number;
  totalStudents: number;
  todayAttendance: number;
  pendingAssignments: number;
  recentAttendanceRate: number;
  unreadNotifications: number;
}

export interface AttendanceStats {
  courseId: string;
  courseName: string;
  totalSessions: number;
  totalStudents: number;
  averageAttendanceRate: number;
  todayAttendanceCount: number;
  lateStudents: number;
  excusedStudents: number;
}

export interface AssignmentStats {
  assignmentId: string;
  assignmentTitle: string;
  totalSubmissions: number;
  gradedSubmissions: number;
  averageScore: number;
  onTimeSubmissions: number;
  lateSubmissions: number;
}

// 座位图相关类型
export interface SeatMapData {
  classroom: Classroom;
  seats: SeatMap[];
  attendanceSession: {
    courseId: string;
    sessionDate: string;
    timeSlot: string;
  };
}

// 数据分析相关类型
export interface AnalyticsData {
  attendance: AttendanceData[];
  assignment: AssignmentData[];
  gradeDistribution: GradeDistribution[];
  courseProgress: CourseProgressData[];
}

export interface AttendanceData {
  date: string;
  present: number;
  absent: number;
  late: number;
  total: number;
  rate: number;
}

export interface AssignmentData {
  assignmentId: string;
  assignmentName: string;
  submissions: number;
  averageScore: number;
  completionRate: number;
}

export interface GradeDistribution {
  range: string;
  count: number;
  percentage: number;
}

export interface CourseProgressData {
  courseId: string;
  courseName: string;
  progress: number;
  completedModules: number;
  totalModules: number;
}