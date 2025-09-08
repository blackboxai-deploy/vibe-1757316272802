import { createClient, type SupabaseClient, type PostgrestError } from '@supabase/supabase-js';
import type { Database } from '../database.types.ts';

// --- Constants & Supabase Client ---
const SUPABASE_URL = 'https://rxwcwwyjgfehldjaxxfj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4d2N3d3lqZ2ZlaGxkamF4eGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4ODc0OTUsImV4cCI6MjA2NzQ2MzQ5NX0.aOXYEiWgPqEevXSAZqvmQie_leV1M4Jlt4QStv5k4e0';

// Create and export the Supabase client
export const supabaseClient: SupabaseClient<Database> = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- API Response Types ---
export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

// --- Error Handling Utilities ---
export const handleApiError = (error: unknown): ApiError => {
  if (error && typeof error === 'object' && 'message' in error) {
    return {
      message: String((error as { message: string }).message),
      code: 'code' in error ? String((error as { code: string }).code) : undefined,
      details: error,
    };
  }
  
  if (error instanceof Error) {
    return {
      message: error.message,
      details: error,
    };
  }
  
  return {
    message: 'An unknown error occurred',
    details: error,
  };
};

export const createApiResponse = <T>(data: T | null, error: unknown = null): ApiResponse<T> => {
  if (error) {
    const apiError = handleApiError(error);
    return {
      data: null as T | null,
      error: apiError.message,
      success: false,
    };
  }
  
  return {
    data,
    error: null,
    success: true,
  };
};

// --- Generic API Helpers ---
export class ApiService {
  protected client = supabaseClient;

  protected async handleRequest<T>(
    requestFn: () => Promise<{ data: T | null; error: PostgrestError | null }>
  ): Promise<ApiResponse<T>> {
    try {
      const { data, error } = await requestFn();
      
      if (error) {
        console.error('API Request Error:', error);
        return createApiResponse(null, error);
      }
      
      return createApiResponse(data);
    } catch (error) {
      console.error('API Request Exception:', error);
      return createApiResponse(null, error);
    }
  }

  protected async handleRpcRequest<T>(
    requestFn: () => Promise<{ data: T | null; error: PostgrestError | null }>
  ): Promise<ApiResponse<T>> {
    return this.handleRequest(requestFn);
  }
}

// --- Authentication Service ---
export class AuthService extends ApiService {
  async signInWithPassword(email: string, password: string): Promise<ApiResponse<{ user: any; session: any } | null>> {
    try {
      const { data, error } = await this.client.auth.signInWithPassword({ email, password });
      
      if (error) {
        return createApiResponse<{ user: any; session: any } | null>(null, error);
      }
      
      return createApiResponse(data);
    } catch (error) {
      return createApiResponse<{ user: any; session: any } | null>(null, error);
    }
  }

  async signUp(email: string, password: string, metadata?: Record<string, unknown>): Promise<ApiResponse<{ user: any; session: any } | null>> {
    try {
      const { data, error } = await this.client.auth.signUp({
        email,
        password,
        options: { data: metadata },
      });
      
      if (error) {
        return createApiResponse<{ user: any; session: any } | null>(null, error);
      }
      
      return createApiResponse(data);
    } catch (error) {
      return createApiResponse<{ user: any; session: any } | null>(null, error);
    }
  }

  /**
   * Send Magic Link for passwordless authentication
   */
  async signInWithMagicLink(email: string, options?: {
    redirectTo?: string;
    shouldCreateUser?: boolean;
    data?: Record<string, unknown>;
  }): Promise<ApiResponse<null>> {
    try {
      const { error } = await this.client.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: options?.redirectTo || `${window.location.origin}/auth/callback`,
          shouldCreateUser: options?.shouldCreateUser ?? true,
          data: options?.data,
        },
      });
      
      if (error) {
        return createApiResponse<null>(null, error);
      }
      
      return createApiResponse(null);
    } catch (error) {
      return createApiResponse<null>(null, error);
    }
  }

  /**
   * Verify Magic Link OTP token
   */
  async verifyOtp(email: string, token: string, type: 'signup' | 'magiclink' = 'magiclink'): Promise<ApiResponse<{ user: any; session: any } | null>> {
    try {
      const { data, error } = await this.client.auth.verifyOtp({
        email,
        token,
        type,
      });
      
      if (error) {
        return createApiResponse<{ user: any; session: any } | null>(null, error);
      }
      
      return createApiResponse(data);
    } catch (error) {
      return createApiResponse<{ user: any; session: any } | null>(null, error);
    }
  }

  /**
   * Handle OAuth callback and extract session
   */
  async handleAuthCallback(): Promise<ApiResponse<{ user: any; session: any } | null>> {
    try {
      const { data, error } = await this.client.auth.getSession();
      
      if (error) {
        return createApiResponse<{ user: any; session: any } | null>(null, error);
      }
      
      return createApiResponse(data);
    } catch (error) {
      return createApiResponse<{ user: any; session: any } | null>(null, error);
    }
  }

  /**
   * Check if Magic Link authentication is available
   */
  isMagicLinkSupported(): boolean {
    // Check if we're in a browser environment and have the necessary APIs
    return typeof window !== 'undefined' && 
           typeof window.location !== 'undefined' &&
           typeof URLSearchParams !== 'undefined';
  }

  async signOut(): Promise<ApiResponse<null>> {
    try {
      const { error } = await this.client.auth.signOut();
      
      if (error) {
        return createApiResponse(null, error);
      }
      
      return createApiResponse(null);
    } catch (error) {
      return createApiResponse(null, error);
    }
  }

  async getCurrentUser(): Promise<ApiResponse<any | null>> {
    try {
      const { data: { user }, error } = await this.client.auth.getUser();
      
      if (error) {
        return createApiResponse<any | null>(null, error);
      }
      
      return createApiResponse(user);
    } catch (error) {
      return createApiResponse<any | null>(null, error);
    }
  }
}

// --- File Upload Service ---
export class FileService extends ApiService {
  async uploadFile(
    bucket: string,
    file: File,
    userId: string,
    oldFileUrl?: string | null
  ): Promise<ApiResponse<string | null>> {
    try {
      // Remove old file if exists
      if (oldFileUrl) {
        try {
          const oldFilePath = new URL(oldFileUrl).pathname.split(`/${bucket}/`)[1];
          if (oldFilePath) {
            await this.client.storage.from(bucket).remove([oldFilePath]);
          }
        } catch (e) {
          console.warn('Could not parse or remove old file:', e);
        }
      }

      // Upload new file
      const filePath = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
      const { error: uploadError } = await this.client.storage.from(bucket).upload(filePath, file);
      
      if (uploadError) {
        return createApiResponse<string | null>(null, uploadError);
      }

      // Get public URL
      const { data: { publicUrl } } = this.client.storage.from(bucket).getPublicUrl(filePath);
      
      if (!publicUrl) {
        return createApiResponse<string | null>(null, new Error('Could not get public URL for uploaded file'));
      }

      return createApiResponse(publicUrl);
    } catch (error) {
      return createApiResponse<string | null>(null, error);
    }
  }

  async deleteFile(bucket: string, fileUrl: string): Promise<ApiResponse<null>> {
    try {
      const filePath = new URL(fileUrl).pathname.split(`/${bucket}/`)[1];
      if (filePath) {
        const { error } = await this.client.storage.from(bucket).remove([filePath]);
        if (error) {
          return createApiResponse(null, error);
        }
      }
      return createApiResponse(null);
    } catch (error) {
      return createApiResponse(null, error);
    }
  }

  async createSignedUrl(bucket: string, path: string, expiresIn = 60): Promise<ApiResponse<string | null>> {
    try {
      const { data, error } = await this.client.storage.from(bucket).createSignedUrl(path, expiresIn);
      
      if (error || !data) {
        return createApiResponse<string | null>(null, error || new Error('Could not create signed URL'));
      }
      
      return createApiResponse(data.signedUrl);
    } catch (error) {
      return createApiResponse<string | null>(null, error);
    }
  }
}

// --- Export service instances ---
export const authService = new AuthService();
export const fileService = new FileService();