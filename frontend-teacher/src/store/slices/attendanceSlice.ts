import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { request } from '../../services/api';
import { Attendance, AttendanceSession } from '../../types';

interface AttendanceState {
  sessions: AttendanceSession[];
  records: Attendance[];
  loading: boolean;
  error: string | null;
}

const initialState: AttendanceState = {
  sessions: [],
  records: [],
  loading: false,
  error: null,
};

export const fetchAttendanceSessions = createAsyncThunk(
  'attendance/fetchSessions',
  async (courseId: string) => {
    const response = await request.get(`/attendance/courses/${courseId}`);
    return response;
  }
);

export const startAttendanceSession = createAsyncThunk(
  'attendance/startSession',
  async ({ courseId, sessionData }: { courseId: string; sessionData: any }) => {
    const response = await request.post(`/attendance/sessions/${courseId}/start`, sessionData);
    return response;
  }
);

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    clearAttendanceData: (state) => {
      state.sessions = [];
      state.records = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAttendanceSessions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAttendanceSessions.fulfilled, (state, action) => {
        state.loading = false;
        state.sessions = action.payload;
      })
      .addCase(fetchAttendanceSessions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取考勤记录失败';
      });
  },
});

export const { clearAttendanceData } = attendanceSlice.actions;
export default attendanceSlice.reducer;