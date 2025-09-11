import React, { createContext, useContext, useReducer, ReactNode } from "react";
import { Course, Assignment, Attendance, Notification } from "../types";

interface AppState {
  courses: Course[];
  assignments: Assignment[];
  attendanceRecords: Attendance[];
  notifications: Notification[];
  unreadNotifications: number;
  loading: {
    courses: boolean;
    assignments: boolean;
    attendance: boolean;
    notifications: boolean;
  };
}

type AppAction =
  | { type: "SET_COURSES"; payload: Course[] }
  | { type: "SET_ASSIGNMENTS"; payload: Assignment[] }
  | { type: "SET_ATTENDANCE"; payload: Attendance[] }
  | { type: "SET_NOTIFICATIONS"; payload: Notification[] }
  | { type: "ADD_NOTIFICATION"; payload: Notification }
  | { type: "MARK_NOTIFICATION_READ"; payload: string }
  | {
      type: "SET_LOADING";
      payload: { key: keyof AppState["loading"]; value: boolean };
    }
  | { type: "UPDATE_COURSE"; payload: Course }
  | { type: "ADD_ATTENDANCE"; payload: Attendance }
  | { type: "UPDATE_ASSIGNMENT"; payload: Assignment };

const initialState: AppState = {
  courses: [],
  assignments: [],
  attendanceRecords: [],
  notifications: [],
  unreadNotifications: 0,
  loading: {
    courses: false,
    assignments: false,
    attendance: false,
    notifications: false,
  },
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case "SET_COURSES":
      return {
        ...state,
        courses: action.payload,
      };

    case "SET_ASSIGNMENTS":
      return {
        ...state,
        assignments: action.payload,
      };

    case "SET_ATTENDANCE":
      return {
        ...state,
        attendanceRecords: action.payload,
      };

    case "SET_NOTIFICATIONS":
      const unreadCount = action.payload.filter((n) => !n.isRead).length;
      return {
        ...state,
        notifications: action.payload,
        unreadNotifications: unreadCount,
      };

    case "ADD_NOTIFICATION":
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        unreadNotifications: action.payload.isRead
          ? state.unreadNotifications
          : state.unreadNotifications + 1,
      };

    case "MARK_NOTIFICATION_READ":
      const updatedNotifications = state.notifications.map((n) =>
        n.id === action.payload ? { ...n, isRead: true } : n,
      );
      const newUnreadCount = updatedNotifications.filter(
        (n) => !n.isRead,
      ).length;
      return {
        ...state,
        notifications: updatedNotifications,
        unreadNotifications: newUnreadCount,
      };

    case "SET_LOADING":
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: action.payload.value,
        },
      };

    case "UPDATE_COURSE":
      return {
        ...state,
        courses: state.courses.map((course) =>
          course.id === action.payload.id ? action.payload : course,
        ),
      };

    case "ADD_ATTENDANCE":
      return {
        ...state,
        attendanceRecords: [action.payload, ...state.attendanceRecords],
      };

    case "UPDATE_ASSIGNMENT":
      return {
        ...state,
        assignments: state.assignments.map((assignment) =>
          assignment.id === action.payload.id ? action.payload : assignment,
        ),
      };

    default:
      return state;
  }
};

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // Helper functions
  setCourses: (courses: Course[]) => void;
  setAssignments: (assignments: Assignment[]) => void;
  setAttendance: (attendance: Attendance[]) => void;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markNotificationRead: (notificationId: string) => void;
  setLoading: (key: keyof AppState["loading"], value: boolean) => void;
  updateCourse: (course: Course) => void;
  addAttendance: (attendance: Attendance) => void;
  updateAssignment: (assignment: Assignment) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Helper functions
  const setCourses = (courses: Course[]) => {
    dispatch({ type: "SET_COURSES", payload: courses });
  };

  const setAssignments = (assignments: Assignment[]) => {
    dispatch({ type: "SET_ASSIGNMENTS", payload: assignments });
  };

  const setAttendance = (attendance: Attendance[]) => {
    dispatch({ type: "SET_ATTENDANCE", payload: attendance });
  };

  const setNotifications = (notifications: Notification[]) => {
    dispatch({ type: "SET_NOTIFICATIONS", payload: notifications });
  };

  const addNotification = (notification: Notification) => {
    dispatch({ type: "ADD_NOTIFICATION", payload: notification });
  };

  const markNotificationRead = (notificationId: string) => {
    dispatch({ type: "MARK_NOTIFICATION_READ", payload: notificationId });
  };

  const setLoading = (key: keyof AppState["loading"], value: boolean) => {
    dispatch({ type: "SET_LOADING", payload: { key, value } });
  };

  const updateCourse = (course: Course) => {
    dispatch({ type: "UPDATE_COURSE", payload: course });
  };

  const addAttendance = (attendance: Attendance) => {
    dispatch({ type: "ADD_ATTENDANCE", payload: attendance });
  };

  const updateAssignment = (assignment: Assignment) => {
    dispatch({ type: "UPDATE_ASSIGNMENT", payload: assignment });
  };

  const contextValue: AppContextType = {
    state,
    dispatch,
    setCourses,
    setAssignments,
    setAttendance,
    setNotifications,
    addNotification,
    markNotificationRead,
    setLoading,
    updateCourse,
    addAttendance,
    updateAssignment,
  };

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
