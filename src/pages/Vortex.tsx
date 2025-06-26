import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Zap, Sparkles, Star, Shield } from 'lucide-react';

export function Vortex() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-4 animate-fade-in">
        {/* Coming Soon Banner */}
        <Card className="mb-6 overflow-hidden border-0 shadow-xl crimson:shadow-red-200/30">
          <div className="bg-gradient-to-r from-social-dark-green via-social-green to-social-light-green p-8 text-white crimson:from-red-800 crimson:via-red-600 crimson:to-red-500">
            <div className="flex flex-col items-center text-center">
              <div className="bg-white/20 p-4 rounded-full mb-4 animate-pulse">
                <Zap className="h-12 w-12" />
              </div>
              <h1 className="text-2xl font-bold font-pixelated mb-3">Vortex Groups</h1>
              <p className="font-pixelated text-sm max-w-lg">
                Our advanced group chat system is coming soon! Create private groups, share media, and collaborate with friends in real-time.
              </p>
            </div>
          </div>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-all duration-300 hover-scale crimson:border-red-100 crimson:hover:shadow-red-100/20 h-full">
            <CardContent className="p-6 flex flex-col items-center text-center h-full">
              <div className="w-16 h-16 rounded-full bg-social-green/10 flex items-center justify-center mb-4 crimson:bg-red-50">
                <MessageSquare className="h-8 w-8 text-social-green crimson:text-red-500" />
              </div>
              <h3 className="font-pixelated text-base font-medium mb-3">Group Messaging</h3>
              <p className="font-pixelated text-sm text-muted-foreground mb-4 flex-grow">
                Connect with multiple friends in organized group conversations. Share ideas, plan events, and stay connected with your social circles.
              </p>
              <div className="w-full h-1 bg-gradient-to-r from-social-green/20 to-social-light-green/20 rounded-full crimson:from-red-100 crimson:to-red-200"></div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 hover-scale crimson:border-red-100 crimson:hover:shadow-red-100/20 h-full">
            <CardContent className="p-6 flex flex-col items-center text-center h-full">
              <div className="w-16 h-16 rounded-full bg-social-purple/10 flex items-center justify-center mb-4 crimson:bg-red-50">
                <Sparkles className="h-8 w-8 text-social-purple crimson:text-red-500" />
              </div>
              <h3 className="font-pixelated text-base font-medium mb-3">Coming Soon</h3>
              <p className="font-pixelated text-sm text-muted-foreground mb-4 flex-grow">
                We're working hard to bring you an amazing group chat experience. The Vortex feature will revolutionize how you connect with friends and communities.
              </p>
              <div className="w-full h-1 bg-gradient-to-r from-social-purple/20 to-social-blue/20 rounded-full crimson:from-red-100 crimson:to-red-200"></div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Highlights */}
        <Card className="mb-8 crimson:border-red-100 crimson:bg-gradient-to-b crimson:from-white crimson:to-red-50/30">
          <CardContent className="p-6">
            <h3 className="font-pixelated text-base font-medium mb-4 text-center">Feature Highlights</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-social-green/10 flex-shrink-0 flex items-center justify-center crimson:bg-red-50">
                  <Shield className="h-4 w-4 text-social-green crimson:text-red-500" />
                </div>
                <div>
                  <h4 className="font-pixelated text-sm font-medium mb-1">Private Groups</h4>
                  <p className="font-pixelated text-xs text-muted-foreground">
                    Create invite-only spaces for your closest friends and family
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-social-blue/10 flex-shrink-0 flex items-center justify-center crimson:bg-red-50">
                  <Star className="h-4 w-4 text-social-blue crimson:text-red-500" />
                </div>
                <div>
                  <h4 className="font-pixelated text-sm font-medium mb-1">Rich Media Sharing</h4>
                  <p className="font-pixelated text-xs text-muted-foreground">
                    Share photos, videos, and files with your group members
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coming Soon Message */}
        <Card className="border-2 border-dashed border-social-green/30 crimson:border-red-200/50 bg-social-green/5 crimson:bg-red-50/30">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="font-pixelated text-lg font-medium mb-3 social-gradient bg-clip-text text-transparent crimson:bg-gradient-to-r crimson:from-red-700 crimson:to-red-500">
                Coming Soon
              </h3>
              <p className="font-pixelated text-sm text-muted-foreground mb-4">
                We're working hard to bring you the best group chat experience. Stay tuned for updates!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Development Note */}
        <div className="mt-6 text-center">
          <p className="font-pixelated text-xs text-muted-foreground">
            Vortex Groups is currently in development by Mohammed Maaz A.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Vortex;