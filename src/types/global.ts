
import { BaseQueryApi } from "@reduxjs/toolkit/query";

export type TError = {
  data: {
    errorSources: never[];
    message: string;
    stack: string;
    errorMessage: {
      path: string;
      message: string;
    };
    success: boolean;
  };
  status: number;
};

export type TMeta = {
  limit: number;
  page: number;
  total: number;
};

export type TResponse<T> = {
  data?: T;
  error?: TError;
  meta?: TMeta;
  success: boolean;
  message: string;
  statusCode?: number;
};

export type TResponseRedux<T> = TResponse<T> & BaseQueryApi;

export type TQueryParam = {
  name: string;
  value: boolean | React.Key;
};

export type TArgsParam = Record<string, any>;

export interface ErrorSource {
  path: string;
  message: string;
}

export interface ErrorResponseData {
  status: boolean;
  message: string;
  errorSources: ErrorSource[];
  stack?: string;
}

export interface ErrorResponse {
  data: ErrorResponseData;
  status: boolean;
}

export interface SidebarData {
  title: string;
  key: string;
  items: SidebarItem[];
}
export interface SidebarItem {
  title: string;
  url?: string;
  key: string;
  icon?: React.ComponentType;
  items?: SidebarItem[];
  allowedRoles?: string[];
  permission?: string;
}
