import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

/**
 * Checks if a user is authenticated based on the supabase session
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const { data } = await supabase.auth.getSession();
  return data.session !== null;
};

/**
 * Retrieves the current user from supabase
 */
export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getUser();
  return data.user;
};

/**
 * Log out the current user and redirect to login
 */
export const logoutUser = async () => {
  try {
    await supabase.auth.signOut();
    // Clear any local storage or cached data
    localStorage.clear();
    sessionStorage.clear();
    
    // Force redirect to login page
    window.location.href = '/login';
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    // Even if logout fails, redirect to login
    window.location.href = '/login';
    throw error;
  }
};

/**
 * Register a new user with enhanced error handling
 */
export const registerUser = async (email: string, password: string, name: string, username: string) => {
  // Validate inputs
  if (!email || !password || !name || !username) {
    throw new Error('All fields are required');
  }

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }

  if (username.length < 3) {
    throw new Error('Username must be at least 3 characters long');
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    throw new Error('Username can only contain letters, numbers, and underscores');
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: {
        data: {
          name: name.trim(),
          username: username.toLowerCase().trim()
        }
      }
    });

    if (error) {
      console.error('Registration error:', error);
      
      // Handle specific error cases
      if (error.message.includes('already registered')) {
        throw new Error('An account with this email already exists. Please try logging in instead.');
      } else if (error.message.includes('password')) {
        throw new Error('Password must be at least 6 characters long');
      } else if (error.message.includes('email')) {
        throw new Error('Please enter a valid email address');
      } else {
        throw new Error(error.message || 'Registration failed. Please try again.');
      }
    }

    return data;
  } catch (error: any) {
    console.error('Registration error:', error);
    throw error;
  }
};

/**
 * Login a user with enhanced error handling
 */
export const loginUser = async (email: string, password: string) => {
  // Validate inputs
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  if (!email.includes('@')) {
    throw new Error('Please enter a valid email address');
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password
    });

    if (error) {
      console.error('Login error:', error);
      
      // Handle specific error cases
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      } else if (error.message.includes('Email not confirmed')) {
        throw new Error('Please check your email and click the confirmation link before logging in.');
      } else if (error.message.includes('Too many requests')) {
        throw new Error('Too many login attempts. Please wait a few minutes and try again.');
      } else if (error.message.includes('User not found')) {
        throw new Error('No account found with this email address. Please sign up first.');
      } else {
        throw new Error(error.message || 'Login failed. Please try again.');
      }
    }

    return data;
  } catch (error: any) {
    console.error('Login error:', error);
    throw error;
  }
};

/**
 * Sign in with Google - Improved implementation with redirect to dashboard
 */
export const signInWithGoogle = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    });

    if (error) {
      console.error('Google sign in error:', error);
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error('Google sign in error:', error);
    throw error;
  }
};

/**
 * Get user profile data with error handling
 */
export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Profile fetch error:', error);
      throw new Error('Failed to fetch user profile');
    }
    
    return data;
  } catch (error: any) {
    console.error('Profile fetch error:', error);
    throw error;
  }
};

/**
 * Update user profile with error handling
 */
export const updateUserProfile = async (userId: string, updates: any) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select();

    if (error) {
      console.error('Profile update error:', error);
      throw new Error('Failed to update user profile');
    }
    
    return data;
  } catch (error: any) {
    console.error('Profile update error:', error);
    throw error;
  }
};

/**
 * Reset password with error handling
 */
export const resetPassword = async (email: string) => {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) {
      console.error('Password reset error:', error);
      throw new Error('Failed to send password reset email. Please contact support@socialchat.site for assistance.');
    }

    return data;
  } catch (error: any) {
    console.error('Password reset error:', error);
    throw error;
  }
};