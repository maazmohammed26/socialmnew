import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, CheckCircle, XCircle, User, Mail, Lock, Sparkles, Heart, Zap, Shield, Star } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { signInWithGoogle, registerUser } from '@/utils/authUtils';

export function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'checking' | 'available' | 'taken' | 'invalid' | 'idle'>('idle');
  const [emailStatus, setEmailStatus] = useState<'checking' | 'available' | 'taken' | 'idle'>('idle');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [shakeError, setShakeError] = useState(false);
  const [successAnimation, setSuccessAnimation] = useState(false);
  const [funMessage, setFunMessage] = useState('');
  const [showFunMessage, setShowFunMessage] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fun messages for different scenarios
  const funMessages = {
    weakPassword: [
      "🔐 Your password needs more muscle! Add some characters!",
      "💪 Make your password stronger than a superhero!",
      "🎯 Aim for at least 6 characters - you can do it!",
      "🚀 Power up your password for maximum security!"
    ],
    usernameTaken: [
      "🎭 That username is already starring in someone else's show!",
      "🏃‍♂️ Someone beat you to that username! Try another one!",
      "🎪 That username is already performing in our circus!",
      "⭐ That username is taken, but you're still a star!"
    ],
    emailTaken: [
      "📧 That email is already part of our family!",
      "🎉 Good news: You already have an account! Try logging in!",
      "🔄 That email is already registered - welcome back!",
      "💌 Your email is already in our hearts (and database)!"
    ],
    success: [
      "🎉 Welcome to the SocialChat family!",
      "🚀 Account created! You're ready to blast off!",
      "⭐ You're now officially awesome!",
      "🎊 Success! Time to make some friends!"
    ]
  };

  // Trigger animations
  const triggerShakeAnimation = () => {
    setShakeError(true);
    setTimeout(() => setShakeError(false), 600);
  };

  const showRandomFunMessage = (type: keyof typeof funMessages) => {
    const messages = funMessages[type];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
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
          title: 'Welcome to SocialChat!',
          description: 'Your account has been created successfully.',
        });
        navigate('/dashboard');
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

  // Check username availability and format
  useEffect(() => {
    if (username.length < 3) {
      setUsernameStatus('idle');
      return;
    }

    // Check username format first
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameStatus('invalid');
      return;
    }

    const timeoutId = setTimeout(async () => {
      setUsernameStatus('checking');
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', username.toLowerCase())
          .single();

        if (error && error.code === 'PGRST116') {
          // No rows returned - username is available
          setUsernameStatus('available');
        } else if (data) {
          // Username exists
          setUsernameStatus('taken');
        }
      } catch (error) {
        setUsernameStatus('idle');
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username]);

  // Check email availability
  useEffect(() => {
    if (!email.includes('@')) {
      setEmailStatus('idle');
      return;
    }

    const timeoutId = setTimeout(async () => {
      setEmailStatus('checking');
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: 'dummy_password_for_check'
        });

        if (error?.message?.includes('Invalid login credentials')) {
          // Email not found - available
          setEmailStatus('available');
        } else if (error?.message?.includes('Email not confirmed')) {
          // Email exists but not confirmed
          setEmailStatus('taken');
        } else {
          // Other error or success means email exists
          setEmailStatus('taken');
        }
      } catch (error) {
        setEmailStatus('idle');
      }
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Final validation
      if (!email || !password || !name || !username) {
        throw new Error('Please fill in all fields');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      if (usernameStatus === 'taken') {
        throw new Error('Username is already taken');
        showRandomFunMessage('usernameTaken');
      }

      if (usernameStatus === 'invalid') {
        throw new Error('Username can only contain letters, numbers, and underscores');
      }

      if (emailStatus === 'taken') {
        throw new Error('An account with this email already exists. Please try logging in instead.');
        showRandomFunMessage('emailTaken');
      }

      if (!acceptedTerms) {
        throw new Error('Please accept the terms and conditions');
      }

      // Use the improved registration function
      const { user } = await registerUser(email, password, name, username);

      if (user) {
        setSuccessAnimation(true);
        showRandomFunMessage('success');
        setRegistrationSuccess(true);
        toast({
          title: 'Registration successful!',
          description: 'Please check your email to confirm your account before logging in.',
        });
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      triggerShakeAnimation();
      
      if (error.message?.includes('Password must be at least 6 characters')) {
        showRandomFunMessage('weakPassword');
      }
      
      toast({
        variant: 'destructive',
        title: 'Registration failed',
        description: error.message || 'An error occurred during registration',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      setGoogleLoading(true);
      
      // Use the improved Google sign-in function
      await signInWithGoogle();
      
      // Note: The redirect happens automatically, so we don't need to navigate
    } catch (error: any) {
      console.error('Google signup error:', error);
      toast({
        variant: 'destructive',
        title: 'Google signup failed',
        description: 'Please try again or use email/password registration.',
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  if (registrationSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto animate-success-bounce">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-pixelated social-gradient bg-clip-text text-transparent animate-fade-in">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-500 animate-bounce" />
              Check Your Email
              <Mail className="h-6 w-6 text-social-blue animate-pulse" />
            </div>
          </CardTitle>
          <CardDescription className="font-pixelated animate-slide-in-up">
            We've sent you a confirmation email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 animate-fade-in">
          <div className="text-center space-y-2">
            <p className="font-pixelated text-sm text-muted-foreground">
              Please check your email inbox (and spam folder) for a confirmation link.
            </p>
            <p className="font-pixelated text-sm text-muted-foreground">
              After confirming your email, you can log in to your account.
            </p>
          </div>
          <Button 
            onClick={() => navigate('/login')} 
            className="w-full font-pixelated transition-all duration-300 hover:scale-105 hover:shadow-lg"
          >
            Go to Login
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full max-w-md mx-auto transition-all duration-500 ${
      shakeError ? 'animate-shake' : ''
    } ${successAnimation ? 'animate-success-glow' : ''}`}>
      <CardHeader className="text-center">
        <div className="bg-yellow-100 text-yellow-800 p-2 rounded-md mb-4 animate-bounce-gentle">
          <p className="font-pixelated text-xs">
            <Zap className="inline h-3 w-3 mr-1 animate-pulse" />
            🚧 This project is under development. Some features may be limited or unavailable.
          </p>
        </div>
        <CardTitle className="text-2xl font-pixelated social-gradient bg-clip-text text-transparent animate-fade-in">
          <div className="flex items-center justify-center gap-2">
            <Star className="h-6 w-6 text-social-purple animate-spin-slow" />
            Create Account
            <Sparkles className="h-6 w-6 text-social-magenta animate-bounce" />
          </div>
        </CardTitle>
        <CardDescription className="font-pixelated animate-slide-in-up">
          Join our social community
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Fun Message Display */}
        {showFunMessage && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-3 mb-4 animate-bounce-in">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-purple-500 animate-pulse" />
              <p className="font-pixelated text-sm text-purple-700">{funMessage}</p>
            </div>
          </div>
        )}

        {/* Google Signup Button */}
        <Button
          onClick={handleGoogleSignup}
          disabled={googleLoading || loading}
          variant="outline"
          className="w-full font-pixelated text-sm h-10 border-2 hover:bg-gray-50 transition-all duration-300 hover:scale-105 hover:shadow-lg mb-4"
        >
          {googleLoading ? (
            <div className="flex items-center gap-2 animate-pulse">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin-fast" />
              Signing up with Google...
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

        <div className="relative mb-4">
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
            <Label htmlFor="name" className="font-pixelated flex items-center gap-2">
              <User className="h-3 w-3" />
              Full Name
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="font-pixelated transition-all duration-200 focus:scale-105 focus:shadow-md"
              disabled={loading || googleLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="username" className="font-pixelated flex items-center gap-2">
              <Shield className="h-3 w-3" />
              Username
            </Label>
            <div className="relative">
              <Input
                id="username"
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                required
                className={`font-pixelated pr-10 ${
                  usernameStatus === 'invalid' || usernameStatus === 'taken' 
                    ? 'border-red-500 focus:ring-red-500' 
                    : usernameStatus === 'available'
                    ? 'border-green-500 focus:ring-green-500'
                    : ''
                }`}
                disabled={loading || googleLoading}
              />
              {username.length >= 3 && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 transition-all duration-200">
                  {usernameStatus === 'checking' && (
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin-fast" />
                  )}
                  {usernameStatus === 'available' && (
                    <CheckCircle className="w-4 h-4 text-green-500 animate-bounce" />
                  )}
                  {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                    <XCircle className="w-4 h-4 text-red-500 animate-pulse" />
                  )}
                </div>
              )}
            </div>
            {username.length >= 3 && (
              <p className={`font-pixelated text-xs ${
                usernameStatus === 'available' ? 'text-green-600' :
                usernameStatus === 'taken' ? 'text-red-600' :
                usernameStatus === 'invalid' ? 'text-red-600' :
                'text-gray-500'
              }`}>
                {usernameStatus === 'checking' && 'Checking availability...'}
                {usernameStatus === 'available' && 'Username is available'}
                {usernameStatus === 'taken' && 'Username is already taken'}
                {usernameStatus === 'invalid' && 'Username can only contain letters, numbers, and underscores'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="font-pixelated flex items-center gap-2">
              <Mail className="h-3 w-3" />
              Email
            </Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`font-pixelated pr-10 ${
                  emailStatus === 'taken' 
                    ? 'border-red-500 focus:ring-red-500' 
                    : emailStatus === 'available'
                    ? 'border-green-500 focus:ring-green-500'
                    : ''
                }`}
                disabled={loading || googleLoading}
              />
              {email.includes('@') && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 transition-all duration-200">
                  {emailStatus === 'checking' && (
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin-fast" />
                  )}
                  {emailStatus === 'available' && (
                    <CheckCircle className="w-4 h-4 text-green-500 animate-bounce" />
                  )}
                  {emailStatus === 'taken' && (
                    <XCircle className="w-4 h-4 text-red-500 animate-pulse" />
                  )}
                </div>
              )}
            </div>
            {email.includes('@') && (
              <p className={`font-pixelated text-xs ${
                emailStatus === 'available' ? 'text-green-600' :
                emailStatus === 'taken' ? 'text-red-600' : 'text-gray-500'
              }`}>
                {emailStatus === 'checking' && 'Checking availability...'}
                {emailStatus === 'available' && 'Email is available'}
                {emailStatus === 'taken' && 'Email is already registered. Please try logging in instead.'}
              </p>
            )}
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
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="font-pixelated pr-10 transition-all duration-200 focus:scale-105 focus:shadow-md"
                disabled={loading || googleLoading}
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
            {password.length > 0 && (
              <p className={`font-pixelated text-xs transition-all duration-200 ${
                password.length >= 6 ? 'text-green-600 animate-success-glow' : 'text-red-600 animate-pulse'
              }`}>
                {password.length >= 6 ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Password strength: Good!
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    Password must be at least 6 characters
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="terms" 
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
              className="data-[state=checked]:bg-social-green data-[state=checked]:border-social-green"
              disabled={loading || googleLoading}
            />
            <label
              htmlFor="terms"
              className="text-sm font-pixelated leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I accept the{' '}
              <a 
                href="https://socialchatprivacypolicy.vercel.app/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-social-green hover:underline"
              >
                terms and conditions
              </a>
            </label>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-social-green hover:bg-social-light-green text-white font-pixelated transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95" 
            disabled={loading || googleLoading || usernameStatus === 'taken' || emailStatus === 'taken' || usernameStatus === 'checking' || emailStatus === 'checking' || usernameStatus === 'invalid' || !acceptedTerms}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="animate-pulse">Creating Account...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Star className="h-4 w-4" />
                Create Account
              </div>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="font-pixelated text-sm text-muted-foreground animate-fade-in">
            Already have an account?{' '}
            <Link to="/login" className="text-social-green hover:underline hover:text-social-light-green transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}