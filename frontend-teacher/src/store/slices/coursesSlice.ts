import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Course, PaginatedResponse } from '../../types';
import { request } from '../../services/api';

interface CoursesState {
  courses: Course[];
  currentCourse: Course | null;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const initialState: CoursesState = {
  courses: [],
  currentCourse: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
};

// 异步thunks
export const fetchCourses = createAsyncThunk(
  'courses/fetchCourses',
  async (params?: { page?: number; limit?: number; search?: string }) => {
    const response = await request.get<PaginatedResponse<Course>>('/courses', {
      params,
    });
    return response;
  }
);

export const fetchCourseById = createAsyncThunk(
  'courses/fetchCourseById',
  async (courseId: string) => {
    const response = await request.get<Course>(`/courses/${courseId}`);
    return response;
  }
);

export const createCourse = createAsyncThunk(
  'courses/createCourse',
  async (courseData: Partial<Course>) => {
    const response = await request.post<Course>('/courses', courseData);
    return response;
  }
);

export const updateCourse = createAsyncThunk(
  'courses/updateCourse',
  async ({ id, ...courseData }: Partial<Course> & { id: string }) => {
    const response = await request.put<Course>(`/courses/${id}`, courseData);
    return response;
  }
);

export const deleteCourse = createAsyncThunk(
  'courses/deleteCourse',
  async (courseId: string) => {
    await request.delete(`/courses/${courseId}`);
    return courseId;
  }
);

const coursesSlice = createSlice({
  name: 'courses',
  initialState,
  reducers: {
    setCurrentCourse: (state, action: PayloadAction<Course | null>) => {
      state.currentCourse = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateCourseInList: (state, action: PayloadAction<Course>) => {
      const index = state.courses.findIndex((course) => course.id === action.payload.id);
      if (index !== -1) {
        state.courses[index] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    // fetchCourses
    builder
      .addCase(fetchCourses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCourses.fulfilled, (state, action) => {
        state.loading = false;
        state.courses = action.payload.data;
        state.pagination = action.payload.meta;
      })
      .addCase(fetchCourses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取课程列表失败';
      });

    // fetchCourseById
    builder
      .addCase(fetchCourseById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCourseById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCourse = action.payload;
      })
      .addCase(fetchCourseById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取课程详情失败';
      });

    // createCourse
    builder
      .addCase(createCourse.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCourse.fulfilled, (state, action) => {
        state.loading = false;
        state.courses.unshift(action.payload);
        state.pagination.total += 1;
      })
      .addCase(createCourse.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '创建课程失败';
      });

    // updateCourse
    builder
      .addCase(updateCourse.fulfilled, (state, action) => {
        const index = state.courses.findIndex((course) => course.id === action.payload.id);
        if (index !== -1) {
          state.courses[index] = action.payload;
        }
        if (state.currentCourse?.id === action.payload.id) {
          state.currentCourse = action.payload;
        }
      });

    // deleteCourse
    builder
      .addCase(deleteCourse.fulfilled, (state, action) => {
        state.courses = state.courses.filter((course) => course.id !== action.payload);
        if (state.currentCourse?.id === action.payload) {
          state.currentCourse = null;
        }
        state.pagination.total -= 1;
      });
  },
});

export const { setCurrentCourse, clearError, updateCourseInList } = coursesSlice.actions;
export default coursesSlice.reducer;