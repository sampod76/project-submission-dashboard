import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthTokens, AuthState, AuthSessionUser } from "@/types/auth.types";
const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  expiresIn: null,
  sessionVersion: 0,
};
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (state, { payload }: PayloadAction<AuthTokens>) => ({
      ...payload,
      user: { ...payload.user, userId: payload.user.id },
      sessionVersion: state.sessionVersion + 1,
    }),
    setUser: (state, action: PayloadAction<AuthSessionUser>) => {
      state.user = action.payload;
    },
    logout: (state) => ({ ...initialState, sessionVersion: state.sessionVersion + 1 }),
  },
});
export const { login, logout, setUser } = authSlice.actions;
export default authSlice.reducer;
