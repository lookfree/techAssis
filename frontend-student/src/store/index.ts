import { configureStore } from "@reduxjs/toolkit";

// 创建一个基础的store，后续可以根据需要添加reducers
export const store = configureStore({
  reducer: {
    // 添加一个基础的app reducer避免Redux错误
    app: (state = {}, action: any) => state,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST"],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
