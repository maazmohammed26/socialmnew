
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-social-purple/20 blur-3xl animate-float"></div>
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-social-blue/20 blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-60 w-60 rounded-full bg-social-green/10 blur-2xl animate-pulse"></div>
        
        {/* Floating particles */}
        <div className="absolute top-20 left-20 w-2 h-2 bg-social-magenta rounded-full animate-bounce" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute top-40 right-32 w-1 h-1 bg-social-blue rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
        <div className="absolute bottom-32 left-1/3 w-1.5 h-1.5 bg-social-purple rounded-full animate-bounce" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-20 right-20 w-1 h-1 bg-social-green rounded-full animate-pulse" style={{animationDelay: '0.8s'}}></div>
      </div>
      
      <div className="w-full max-w-md z-10 animate-scale-in">
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img 
              src="/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png" 
              alt="SocialChat Logo" 
              className="h-12 w-auto animate-bounce-gentle"
            />
          </div>
          <h1 className="text-4xl font-bold mb-2 font-pixelated social-gradient bg-clip-text text-transparent animate-slide-in-up">
            SocialChat
          </h1>
          <p className="text-muted-foreground font-pixelated animate-slide-in-up" style={{animationDelay: '0.2s'}}>
            Connect, Share, Chat
          </p>
        </div>
        
        <Card className="border-0 shadow-lg glass-card hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6 sm:p-8">
            {children}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AuthLayout;
