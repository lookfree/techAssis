import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { request } from '../../services/api';
import { Assignment } from '../../types';

interface AssignmentsState {
  assignments: Assignment[];
  currentAssignment: Assignment | null;
  loading: boolean;
  error: string | null;
}

const initialState: AssignmentsState = {
  assignments: [],
  currentAssignment: null,
  loading: false,
  error: null,
};

export const fetchAssignments = createAsyncThunk(
  'assignments/fetchAll',
  async (courseId?: string) => {
    const params = courseId ? { courseId } : {};
    const response = await request.get('/assignments', { params });
    return response;
  }
);

export const createAssignment = createAsyncThunk(
  'assignments/create',
  async (assignmentData: Partial<Assignment>) => {
    const response = await request.post('/assignments', assignmentData);
    return response;
  }
);

export const updateAssignment = createAsyncThunk(
  'assignments/update',
  async ({ id, data }: { id: string; data: Partial<Assignment> }) => {
    const response = await request.put(`/assignments/${id}`, data);
    return response;
  }
);

export const deleteAssignment = createAsyncThunk(
  'assignments/delete',
  async (id: string) => {
    await request.delete(`/assignments/${id}`);
    return id;
  }
);

const assignmentsSlice = createSlice({
  name: 'assignments',
  initialState,
  reducers: {
    setCurrentAssignment: (state, action: PayloadAction<Assignment | null>) => {
      state.currentAssignment = action.payload;
    },
    clearAssignments: (state) => {
      state.assignments = [];
      state.currentAssignment = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch assignments
      .addCase(fetchAssignments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAssignments.fulfilled, (state, action) => {
        state.loading = false;
        state.assignments = action.payload;
      })
      .addCase(fetchAssignments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取作业列表失败';
      })
      // Create assignment
      .addCase(createAssignment.fulfilled, (state, action) => {
        state.assignments.push(action.payload);
      })
      // Delete assignment
      .addCase(deleteAssignment.fulfilled, (state, action) => {
        state.assignments = state.assignments.filter(a => a.id !== action.payload);
      });
  },
});

export const { setCurrentAssignment, clearAssignments } = assignmentsSlice.actions;
export default assignmentsSlice.reducer;