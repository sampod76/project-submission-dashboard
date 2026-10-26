import { configureStore, createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import { baseApi } from "./api/baseApi";
import authReducer from "./features/auth/authSlice";
import { login, logout } from "./features/auth/authSlice";

import {
  FLUSH,
  PAUSE,
  PERSIST,
  persistReducer,
  persistStore,
  PURGE,
  REGISTER,
  REHYDRATE,
} from "redux-persist";

import createWebStorage from "redux-persist/lib/storage/createWebStorage";

const createNoopStorage = () => {
  return {
    getItem(_key: string) {
      void _key;
      return Promise.resolve(null);
    },
    setItem(_key: string, value: string) {
      return Promise.resolve(value);
    },
    removeItem(_key: string) {
      void _key;
      return Promise.resolve();
    },
  };
};

const storage = typeof window !== "undefined" ? createWebStorage("local") : createNoopStorage();

const authPersistConfig = {
  key: "project-submission-dashboard:auth",
  version: 1,

  migrate: async (state: import("redux-persist").PersistedState) =>
    state?._persist.version === 1 ? state : undefined,
  storage,
  whitelist: ["user", "accessToken", "refreshToken", "expiresIn"],
};

const persistedUserReducer = persistReducer(authPersistConfig, authReducer);
const authListener = createListenerMiddleware();

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: persistedUserReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    })
      .prepend(authListener.middleware)
      .concat(baseApi.middleware),
});

export const persistor = typeof window !== "undefined" ? persistStore(store) : null;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

const startAppListening = authListener.startListening.withTypes<RootState, AppDispatch>();
startAppListening({
  matcher: isAnyOf(login, logout),
  effect: (action, api) => {
    const before = api.getOriginalState().auth.user;
    const after = api.getState().auth.user;
    if (logout.match(action) || before?.id !== after?.id || before?.role !== after?.role) {
      api.dispatch(baseApi.util.resetApiState());
    }
  },
});
