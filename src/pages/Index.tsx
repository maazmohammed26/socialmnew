import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { MessageCircle, User, Users, Heart, Linkedin, Info, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Footer } from '@/components/ui/footer';
import { GradientText } from '@/components/ui/crimson-effects';

export function Index() {
  const [showAboutDialog, setShowAboutDialog] = useState(false);
  
  // Check if we're in crimson theme
  const isCrimson = document.documentElement.classList.contains('crimson');
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b py-2 px-3 sm:py-4 sm:px-6 bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png" alt="SocialChat Logo" className="h-6 sm:h-8 w-auto" />
            {isCrimson ? (
              <GradientText 
                gradientColors={['#dc2626', '#b91c1c']} 
                className="text-lg sm:text-xl font-bold font-pixelated"
                animated
              >
                SocialChat
              </GradientText>
            ) : (
              <span className="text-lg sm:text-xl font-bold font-pixelated social-gradient bg-clip-text text-transparent">SocialChat</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" className="font-pixelated text-xs sm:text-sm">Log in</Button>
            </Link>
            <Link to="/register">
              <Button className="btn-gradient font-pixelated text-xs sm:text-sm">Sign up</Button>
            </Link>
          </div>
        </div>
      </header>
      
      <div className="dev-banner">
        This project is still under development by Mohammed Maaz A. Please share your feedback!
      </div>
      
      {/* Hero Section */}
      <section className="flex-1 py-10 sm:py-20 px-3 sm:px-6 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-6 sm:gap-10 items-center">
            <div className="space-y-4 sm:space-y-6 animate-fade-in">
              <div className="mb-4">
                <img src="/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png" alt="SocialChat Logo" className="h-12 sm:h-16 w-auto" />
              </div>
              {isCrimson ? (
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold leading-tight font-pixelated">
                  Connect. Share. <GradientText gradientColors={['#dc2626', '#b91c1c']} animated>Engage.</GradientText>
                </h1>
              ) : (
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold leading-tight font-pixelated">
                  Connect. Share. <span className="social-gradient bg-clip-text text-transparent">Engage.</span>
                </h1>
              )}
              <p className="font-pixelated text-base sm:text-xl text-muted-foreground">
                Join our vibrant social community where you can connect with friends, 
                share your thoughts, and engage in meaningful conversations.
              </p>
              <div className="mobile-buttons-container">
                <Link to="/register" className="w-full sm:w-auto">
                  <Button size="default" className="btn-gradient hover-scale font-pixelated w-full sm:w-auto">
                    Get Started
                  </Button>
                </Link>
                <Link to="/login" className="w-full sm:w-auto">
                  <Button size="default" variant="outline" className="hover-scale font-pixelated w-full sm:w-auto">
                    I already have an account
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="relative mt-8 sm:mt-0">
              <div className="absolute -z-10 inset-0 bg-social-green/20 blur-3xl rounded-full"></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-4 pt-0 sm:pt-10">
                  <div className="rounded-lg bg-white shadow-lg p-4 sm:p-6 glass-card animate-fade-in pixel-border pixel-shadow">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageCircle className="text-social-green h-4 w-4 sm:h-5 sm:w-5" />
                      <h3 className="font-semibold font-pixelated text-xs sm:text-sm">Instant Messaging</h3>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground font-pixelated">
                      Chat with friends in real-time.
                    </p>
                  </div>
                  <div className="rounded-lg bg-white shadow-lg p-4 sm:p-6 glass-card animate-fade-in pixel-border pixel-shadow" style={{animationDelay: '0.2s'}}>
                    <div className="flex items-center gap-2 mb-3">
                      <User className="text-social-purple h-4 w-4 sm:h-5 sm:w-5" />
                      <h3 className="font-semibold font-pixelated text-xs sm:text-sm">Personal Profiles</h3>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground font-pixelated">
                      Create your unique identity.
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="rounded-lg bg-white shadow-lg p-4 sm:p-6 glass-card animate-fade-in pixel-border pixel-shadow" style={{animationDelay: '0.1s'}}>
                    <div className="flex items-center gap-2 mb-3">
                      <Heart className="text-social-magenta h-4 w-4 sm:h-5 sm:w-5" />
                      <h3 className="font-semibold font-pixelated text-xs sm:text-sm">Community Posts</h3>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground font-pixelated">
                      Share thoughts and engage.
                    </p>
                  </div>
                  <div className="rounded-lg bg-white shadow-lg p-4 sm:p-6 glass-card animate-fade-in pixel-border pixel-shadow" style={{animationDelay: '0.3s'}}>
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="text-social-green h-4 w-4 sm:h-5 sm:w-5" />
                      <h3 className="font-semibold font-pixelated text-xs sm:text-sm">Friend Networks</h3>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground font-pixelated">
                      Build your personal network.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <Footer />

      {/* About Us Dialog */}
      <Dialog open={showAboutDialog} onOpenChange={setShowAboutDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-pixelated text-xl">
              <img src="/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png" alt="SocialChat Logo" className="h-8 w-auto" />
              {isCrimson ? (
                <GradientText gradientColors={['#dc2626', '#b91c1c']} animated>
                  About SocialChat
                </GradientText>
              ) : (
                <span className="social-gradient bg-clip-text text-transparent">About SocialChat</span>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[calc(80vh-120px)] pr-4">
            <div className="space-y-4 font-pixelated">
              <div>
                <h3 className="text-lg font-medium mb-2">Our Story</h3>
                <p className="text-sm text-muted-foreground">
                  SocialChat (also known as SocialChat Site) was created in 2025 by Mohammed Maaz A as a personal project to build a modern, user-friendly social messaging platform. Developed entirely by a single developer, SocialChat aims to provide a seamless experience for connecting with friends, sharing moments, and engaging in meaningful conversations.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Features</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageCircle className="h-4 w-4 text-social-green" />
                      <h4 className="font-medium text-sm">Real-time Messaging</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Connect with friends through instant messaging with real-time updates.
                    </p>
                  </div>
                  
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Heart className="h-4 w-4 text-social-magenta" />
                      <h4 className="font-medium text-sm">Social Feed</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Share posts, photos, and updates with your network.
                    </p>
                  </div>
                  
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-social-blue" />
                      <h4 className="font-medium text-sm">Friend Networks</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Build your personal network and connect with friends.
                    </p>
                  </div>
                  
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="h-4 w-4 text-social-purple" />
                      <h4 className="font-medium text-sm">Group Chats</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Create private groups to chat with multiple friends (coming soon).
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Technology</h3>
                <p className="text-sm text-muted-foreground">
                  SocialChat is built using modern web technologies to ensure a fast, responsive, and reliable experience:
                </p>
                <ul className="list-disc list-inside text-xs text-muted-foreground mt-2 space-y-1">
                  <li>React for the frontend user interface</li>
                  <li>TypeScript for type-safe code</li>
                  <li>Supabase for backend database and authentication</li>
                  <li>Tailwind CSS and shadcn/ui for styling</li>
                  <li>Real-time updates using WebSockets</li>
                </ul>
              </div>
              
              <div className="bg-muted/30 p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-2">Contact</h3>
                <p className="text-sm text-muted-foreground">
                  For support, feedback, or inquiries, please contact:
                </p>
                <p className="text-sm font-medium mt-2">
                  Email: <a href="mailto:support@socialchat.site" className="text-social-green hover:underline">support@socialchat.site</a>
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <a 
                    href="https://www.linkedin.com/company/socialchatmz" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-social-blue hover:text-social-light-green transition-colors"
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
                  <a 
                    href="https://www.facebook.com/people/SocialChat/61577763366327/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"></path>
                    </svg>
                  </a>
                </div>
              </div>
              
              <div className="text-center text-xs text-muted-foreground mt-4 pt-4 border-t">
                <p>© 2025 SocialChat. All rights reserved.</p>
                <p>Developed by Mohammed Maaz A</p>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Index;