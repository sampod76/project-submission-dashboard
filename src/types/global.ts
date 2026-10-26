import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { PaginationMeta } from "./common.types";

export type TMeta = PaginationMeta;

export type TResponse<T> = {
  data?: T;
  error?: FetchBaseQueryError;
  meta?: TMeta;
  success: boolean;
  message: string;
  statusCode?: number;
};

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
