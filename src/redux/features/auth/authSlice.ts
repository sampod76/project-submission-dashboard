import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AuthData, AuthState, AuthUser } from "@/types/auth";
const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  expiresIn: null,
};
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (_state, action: PayloadAction<AuthData>) => action.payload,
    setUser: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
    },
    logout: () => initialState,
  },
});
export const { login, logout, setUser } = authSlice.actions;
export default authSlice.reducer;
