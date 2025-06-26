import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Zap, Clock, Bell, Star, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function Vortex() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-4 animate-fade-in">
        {/* Coming Soon Banner */}
        <Card className="mb-6 overflow-hidden border-0 shadow-xl crimson:shadow-red-200/20">
          <div className="bg-gradient-to-r from-social-dark-green to-social-light-green p-6 text-white crimson:from-red-700 crimson:to-red-500">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="bg-white/20 p-4 rounded-full">
                <Zap className="h-12 w-12" />
              </div>
              <div className="text-center md:text-left">
                <h1 className="text-2xl font-bold font-pixelated mb-2">Vortex Groups</h1>
                <p className="font-pixelated text-sm max-w-lg">
                  Our advanced group chat system is coming soon! Create private groups, share media, and collaborate with friends in real-time.
                </p>
              </div>
            </div>
          </div>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-social-green crimson:text-red-500" />
                <span className="font-pixelated text-sm">Launching July 2025</span>
              </div>
              <Button disabled className="bg-social-green hover:bg-social-light-green text-white font-pixelated crimson:bg-red-600 crimson:hover:bg-red-500">
                <Bell className="h-4 w-4 mr-2" />
                Get Notified
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Features Preview */}
        <h2 className="font-pixelated text-lg mb-4 text-center">Upcoming Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="hover:shadow-md transition-all duration-300 hover-scale crimson:border-red-100">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-social-green/10 flex items-center justify-center mb-3 crimson:bg-red-50">
                <MessageSquare className="h-6 w-6 text-social-green crimson:text-red-500" />
              </div>
              <h3 className="font-pixelated text-sm font-medium mb-2">Real-time Group Chat</h3>
              <p className="font-pixelated text-xs text-muted-foreground">
                Chat with multiple friends in organized group conversations
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all duration-300 hover-scale crimson:border-red-100">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-social-purple/10 flex items-center justify-center mb-3 crimson:bg-red-50">
                <Users className="h-6 w-6 text-social-purple crimson:text-red-500" />
              </div>
              <h3 className="font-pixelated text-sm font-medium mb-2">Private & Public Groups</h3>
              <p className="font-pixelated text-xs text-muted-foreground">
                Create invite-only groups or discover public communities
              </p>
              <Badge className="mt-2 bg-social-green text-white crimson:bg-red-500">Premium Feature</Badge>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all duration-300 hover-scale crimson:border-red-100">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-social-blue/10 flex items-center justify-center mb-3 crimson:bg-red-50">
                <Star className="h-6 w-6 text-social-blue crimson:text-red-500" />
              </div>
              <h3 className="font-pixelated text-sm font-medium mb-2">Rich Media Sharing</h3>
              <p className="font-pixelated text-xs text-muted-foreground">
                Share photos, videos, and files with your group members
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Early Access Section */}
        <Card className="border-2 border-dashed border-social-green/50 crimson:border-red-200">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="font-pixelated text-base font-medium mb-3">Join the Waitlist</h3>
              <p className="font-pixelated text-sm text-muted-foreground mb-4">
                Be among the first to experience Vortex Groups when we launch. Early access members will receive exclusive features and benefits.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button disabled className="bg-muted text-muted-foreground font-pixelated">
                  <Users className="h-4 w-4 mr-2" />
                  Join Waitlist
                </Button>
                <Button disabled variant="outline" className="font-pixelated">
                  <Zap className="h-4 w-4 mr-2" />
                  Learn More
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Development Note */}
        <div className="mt-6 text-center">
          <p className="font-pixelated text-xs text-muted-foreground">
            Vortex Groups is currently in development by Mohammed Maaz A. Stay tuned for updates!
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Vortex;