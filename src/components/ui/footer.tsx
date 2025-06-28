import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Linkedin, Info, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

export function Footer() {
  const [showAboutDialog, setShowAboutDialog] = useState(false);
  
  return (
    <footer className="border-t py-4 sm:py-6 bg-background mt-auto">
      <div className="container mx-auto px-3 sm:px-6 text-sm text-muted-foreground">
        <div className="flex flex-col items-center justify-center space-y-3">
          <img src="/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png" alt="SocialChat Logo" className="h-6 sm:h-8 w-auto" />
          
          <div className="flex items-center justify-center gap-4">
            <a 
              href="https://www.linkedin.com/company/socialchatmz" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-social-blue hover:text-social-light-green transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-5 w-5" />
            </a>
            <a 
              href="https://www.facebook.com/people/SocialChat/61577763366327/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 transition-colors"
              aria-label="Facebook"
            >
              <Facebook className="h-5 w-5" />
            </a>
            <Button
              onClick={() => setShowAboutDialog(true)}
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-social-green transition-colors flex items-center gap-1 px-2 py-1"
              aria-label="About Us"
            >
              <Info className="h-5 w-5" />
              <span className="font-pixelated text-xs">About Us</span>
            </Button>
          </div>
          
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs font-pixelated">
            <Link to="/about" className="hover:text-social-green transition-colors">About</Link>
            <Link to="/privacy" className="hover:text-social-green transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-social-green transition-colors">Terms of Service</Link>
            <Link to="/contact" className="hover:text-social-green transition-colors">Contact</Link>
            <a 
              href="mailto:support@socialchat.site" 
              className="hover:text-social-green transition-colors"
            >
              Support
            </a>
          </div>
          
          <p className="font-pixelated text-xs sm:text-sm flex items-center justify-center gap-1">
            © 2025 SocialChat. All rights reserved. Made with <Heart className="h-3 w-3 text-red-500" fill="currentColor" /> by Mohammed Maaz A
          </p>
        </div>
      </div>
      
      {/* About Us Dialog */}
      <Dialog open={showAboutDialog} onOpenChange={setShowAboutDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-pixelated text-xl social-gradient bg-clip-text text-transparent">
              <img src="/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png" alt="SocialChat Logo" className="h-8 w-auto" />
              About SocialChat
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
                    <Facebook className="h-5 w-5" />
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
    </footer>
  );
}