import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck, Trash2, Info, X } from 'lucide-react';
import { useNotifications } from '@/hooks/use-notifications';
import { NotificationItem } from './NotificationItem';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function NotificationCenter() {
  const [showInfo, setShowInfo] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    clearAllNotifications 
  } = useNotifications();

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1">
                  <div className="h-4 w-3/4 bg-muted rounded mb-2" />
                  <div className="h-3 w-1/2 bg-muted rounded" />
                </div>
                <div className="h-6 w-6 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="h-6 w-6 text-primary" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </div>
          <div>
            <h1 className="font-pixelated text-lg font-medium">Notifications</h1>
            <p className="font-pixelated text-xs text-muted-foreground">
              {notifications.length} total • {unreadCount} unread
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowInfo(true)}
            size="icon"
            variant="outline"
            className="h-8 w-8 rounded-full"
          >
            <Info className="h-4 w-4" />
          </Button>
          
          {notifications.length > 0 && (
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button
                  onClick={markAllAsRead}
                  size="icon"
                  className="bg-social-green hover:bg-social-light-green text-white h-8 w-8"
                  title="Mark All Read"
                >
                  <CheckCheck className="h-4 w-4" />
                </Button>
              )}
              <Button
                onClick={() => setShowClearDialog(true)}
                size="icon"
                variant="destructive"
                className="h-8 w-8"
                title="Clear All"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-180px)] p-4 scroll-container scroll-smooth">
        {notifications.length > 0 ? (
          <div className="space-y-3 pb-4">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onDelete={deleteNotification}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="relative mb-6">
              <Bell className="h-20 w-20 text-muted-foreground opacity-50" />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-social-green rounded-full flex items-center justify-center">
                <Check className="h-3 w-3 text-white" />
              </div>
            </div>
            <h2 className="font-pixelated text-lg font-medium mb-2">All caught up!</h2>
            <p className="font-pixelated text-sm text-muted-foreground max-w-sm leading-relaxed">
              You don't have any notifications right now. When you receive friend requests, messages, likes, or comments, they'll appear here.
            </p>
          </div>
        )}
      </ScrollArea>

      {/* Info Dialog */}
      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="font-pixelated text-lg social-gradient bg-clip-text text-transparent flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-social-green/10 rounded-lg">
                <MessageCircle className="h-4 w-4 text-social-green" />
                <div>
                  <p className="font-pixelated text-xs font-medium">Messages</p>
                  <p className="font-pixelated text-xs text-muted-foreground">New direct messages from friends</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-social-blue/10 rounded-lg">
                <UserPlus className="h-4 w-4 text-social-blue" />
                <div>
                  <p className="font-pixelated text-xs font-medium">Friend Requests</p>
                  <p className="font-pixelated text-xs text-muted-foreground">New friend requests and responses</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-social-magenta/10 rounded-lg">
                <Heart className="h-4 w-4 text-social-magenta" />
                <div>
                  <p className="font-pixelated text-xs font-medium">Likes & Comments</p>
                  <p className="font-pixelated text-xs text-muted-foreground">Interactions on your posts</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <Info className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="font-pixelated text-xs font-medium">System Notifications</p>
                  <p className="font-pixelated text-xs text-muted-foreground">Important updates about your account</p>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={() => setShowInfo(false)}
              className="w-full bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs"
            >
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear All Confirmation Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent className="max-w-md mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-pixelated text-sm flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-destructive" />
              Clear All Notifications
            </AlertDialogTitle>
            <AlertDialogDescription className="font-pixelated text-xs">
              Are you sure you want to clear all notifications? This action cannot be undone and will remove all {notifications.length} notifications from your list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-pixelated text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={clearAllNotifications}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-pixelated text-xs"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function Badge({ variant, className, children }: { variant: string, className: string, children: React.ReactNode }) {
  return (
    <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80 ${className}`}>
      {children}
    </div>
  );
}