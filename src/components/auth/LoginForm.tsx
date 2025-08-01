import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { loginUser, signInWithGoogle } from '@/utils/authUtils';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff, Mail, AlertTriangle, CheckCircle, Zap, Heart, Sparkles, Lock, User } from 'lucide-react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [shakeError, setShakeError] = useState(false);
  const [successAnimation, setSuccessAnimation] = useState(false);
  const [funMessage, setFunMessage] = useState('');
  const [showFunMessage, setShowFunMessage] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Fun error messages for wrong passwords
  const funErrorMessages = [
    "🤔 Hmm, that password seems to be playing hide and seek!",
    "🔐 Your password is being a bit shy today...",
    "🎭 Plot twist: That's not the right password!",
    "🕵️ Password detective says: 'Not quite right!'",
    "🎪 Oops! Your password went to the circus without you!",
    "🚀 Houston, we have a password problem!",
    "🎨 Your password is more creative than that!",
    "🎵 That password doesn't match our tune!",
    "🍕 Close, but no pizza... I mean password!",
    "🎯 Almost there! Try again, you've got this!"
  ];

  // Trigger shake animation for errors
  const triggerShakeAnimation = () => {
    setShakeError(true);
    setTimeout(() => setShakeError(false), 600);
  };

  // Show fun error message
  const showRandomFunMessage = () => {
    const randomMessage = funErrorMessages[Math.floor(Math.random() * funErrorMessages.length)];
    setFunMessage(randomMessage);
    setShowFunMessage(true);
    setTimeout(() => setShowFunMessage(false), 4000);
  };
  // Check for auth state changes to handle Google redirect
  useEffect(() => {
    const checkAuthState = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // User is logged in, redirect to dashboard
        navigate('/dashboard');
      }
    };
    
    checkAuthState();
    
    // Listen for auth state changes (for Google OAuth redirect)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        toast({
          title: 'Welcome back!',
          description: 'You have been successfully logged in.',
        });
        navigate('/dashboard');
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      await loginUser(email.trim(), password);
      
      toast({
        title: 'Welcome back!',
        description: 'You have been successfully logged in.',
      });
      
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Trigger fun animations for errors
      triggerShakeAnimation();
      
      // Provide specific error messages
      if (error.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please check your credentials and try again.');
        showRandomFunMessage();
      } else if (error.message?.includes('Email not confirmed')) {
        setError('Please check your email and click the confirmation link before logging in.');
      } else if (error.message?.includes('Too many requests')) {
        setError('Too many login attempts. Please wait a few minutes and try again.');
      } else if (error.message?.includes('User not found')) {
        setError('No account found with this email address. Please sign up first.');
      } else {
        setError('Login failed. Please check your email and password and try again.');
        showRandomFunMessage();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setError('');
      setSuccessAnimation(true);

      // Use the improved Google sign-in function
      await signInWithGoogle();
      
      // Note: The redirect happens automatically, so we don't need to navigate
    } catch (error: any) {
      console.error('Google login error:', error);
      setError('Google login failed. Please try again or use email/password login.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!forgotPasswordEmail.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter your email address'
      });
      return;
    }

    if (!forgotPasswordEmail.includes('@')) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a valid email address'
      });
      return;
    }

    try {
      setForgotPasswordLoading(true);
      
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      toast({
        title: 'Password reset email sent!',
        description: 'Please check your email for further instructions. If you don\'t receive an email, contact support@socialchat.site'
      });
      
      setShowForgotPassword(false);
      setForgotPasswordEmail('');
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        variant: 'destructive',
        title: 'Password reset failed',
        description: 'Unable to send password reset email. For security reasons, password changing is disabled. Please contact support@socialchat.site for assistance.'
      });
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  return (
    <Card className={`w-full max-w-md mx-auto transition-all duration-500 ${
      shakeError ? 'animate-shake' : ''
    } ${successAnimation ? 'animate-success-glow' : ''}`}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center font-pixelated social-gradient bg-clip-text text-transparent animate-fade-in">
          <div className="flex items-center justify-center gap-2">
            <Heart className="h-6 w-6 text-social-magenta animate-pulse" />
            Welcome Back
            <Sparkles className="h-6 w-6 text-social-purple animate-bounce" />
          </div>
        </CardTitle>
        <p className="text-center text-muted-foreground font-pixelated text-sm animate-slide-in-up">
          Sign in to your SocialChat account
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fun Message Display */}
        {showFunMessage && (
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-3 animate-bounce-in">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-500 animate-spin" />
              <p className="font-pixelated text-sm text-orange-700">{funMessage}</p>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="animate-shake-gentle border-l-4 border-l-red-500">
            <AlertTriangle className="h-4 w-4 animate-pulse" />
            <AlertDescription className="font-pixelated text-sm">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Google Login Button */}
        <Button
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
          variant="outline"
          className="w-full font-pixelated text-sm h-10 border-2 hover:bg-gray-50 transition-all duration-300 hover:scale-105 hover:shadow-lg"
        >
          {googleLoading ? (
            <div className="flex items-center gap-2 animate-pulse">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin-fast" />
              Signing in with Google...
            </div>
          ) : (
            <div className="flex items-center gap-2 hover:gap-3 transition-all duration-200">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </div>
          )}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground font-pixelated">
              Or continue with email
            </span>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="font-pixelated flex items-center gap-2">
              <Mail className="h-3 w-3" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="font-pixelated transition-all duration-200 focus:scale-105 focus:shadow-md"
              disabled={loading || googleLoading}
              autoComplete="email"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="font-pixelated flex items-center gap-2">
              <Lock className="h-3 w-3" />
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="font-pixelated pr-10 transition-all duration-200 focus:scale-105 focus:shadow-md"
                disabled={loading || googleLoading}
                autoComplete="current-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent hover:scale-110 transition-transform"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading || googleLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground animate-pulse" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
              <DialogTrigger asChild>
                <Button variant="link" className="px-0 font-pixelated text-sm text-primary">
                  Forgot password?
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-pixelated text-lg">Reset Password</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email" className="font-pixelated">Email Address</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="Enter your email"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      className="font-pixelated"
                      disabled={forgotPasswordLoading}
                    />
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm font-pixelated text-muted-foreground">
                      For security reasons, password changing is disabled. If you need assistance, please contact{' '}
                      <a href="mailto:support@socialchat.site" className="text-primary underline">
                        support@socialchat.site
                      </a>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForgotPassword(false)}
                      disabled={forgotPasswordLoading}
                      className="flex-1 font-pixelated"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={forgotPasswordLoading || !forgotPasswordEmail.trim()}
                      className="flex-1 font-pixelated"
                    >
                      {forgotPasswordLoading ? 'Sending...' : 'Send Reset Email'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          <Button 
            type="submit" 
            className="w-full btn-gradient font-pixelated transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95"
            disabled={loading || googleLoading}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="animate-pulse">Signing in...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <User className="h-4 w-4" />
                Sign In
              </div>
            )}
          </Button>
        </form>
        
        <div className="text-center">
          <p className="text-sm text-muted-foreground font-pixelated animate-fade-in">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:underline font-medium hover:text-social-green transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}