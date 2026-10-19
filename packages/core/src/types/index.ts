// Core types and interfaces
// Place all shared TypeScript types here

// Example: Branded types for type safety
export type UserId = string & { readonly __brand: 'UserId' };
export type ArticleId = string & { readonly __brand: 'ArticleId' };

export interface User {
  id: UserId;
  name: string;
  email: string;
  createdAt: Date;
}

export interface ApiResponse<T> {
  data: T;
  status: 'success' | 'error';
  message?: string;
}
