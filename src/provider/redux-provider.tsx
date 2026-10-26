"use client";
import { store, persistor } from "@/redux/store";
import { ReactNode } from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import Loader from "@/components/shared/loader";
import SessionBoundary from "@/components/shared/session-boundary";
export default function ReduxProvider({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      {persistor ? (
        <PersistGate loading={<Loader />} persistor={persistor}>
          <SessionBoundary>{children}</SessionBoundary>
        </PersistGate>
      ) : (
        <SessionBoundary>{children}</SessionBoundary>
      )}
    </Provider>
  );
}
