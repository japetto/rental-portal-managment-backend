import { SortOrder } from "mongoose";

export type IPaginationOptions = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type IGenericPaginationResponse<T> = {
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
  data: T;
};

export type ICalculationOptions = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
};

export type IPaginationResponse = {
  page: number;
  limit: number;
  skip: number;
  sortBy: string;
  sortOrder: SortOrder;
};
