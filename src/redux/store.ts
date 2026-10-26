import { configureStore, createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import { baseApi } from "./api/baseApi";
import authReducer, { login, logout } from "./features/auth/authSlice";
import { setupListeners } from "@reduxjs/toolkit/query";
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  persistReducer,
  persistStore,
} from "redux-persist";
import createWebStorage from "redux-persist/lib/storage/createWebStorage";

const storage =
  typeof window !== "undefined"
    ? createWebStorage("local")
    : {
        getItem: () => Promise.resolve(null),
        setItem: () => Promise.resolve(),
        removeItem: () => Promise.resolve(),
      };

const persistedAuthReducer = persistReducer(
  {
    key: "project-submission-dashboard:auth",
    version: 2,
    storage,
    // Tokens stay in memory; the HttpOnly backend cookie restores sessions.
    whitelist: [],
    migrate: async () => undefined,
  },
  authReducer,
);

const authListener = createListenerMiddleware();
export const store = configureStore({
  reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: persistedAuthReducer },
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
if (typeof window !== "undefined") setupListeners(store.dispatch);
const startAppListening = authListener.startListening.withTypes<RootState, AppDispatch>();
startAppListening({
  matcher: isAnyOf(login, logout),
  effect: (action, api) => {
    const before = api.getOriginalState().auth.user;
    const after = api.getState().auth.user;
    if (logout.match(action) || before?.id !== after?.id || before?.role !== after?.role)
      api.dispatch(baseApi.util.resetApiState());
  },
});
