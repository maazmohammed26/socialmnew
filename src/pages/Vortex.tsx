import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Zap, Sparkles, Star, Shield, ArrowUp, ChevronDown, ChevronUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function Vortex() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [expandedSections, setExpandedSections] = useState({
    features: true,
    highlights: true,
    comingSoon: true
  });

  // Memoized theme-specific styles
  const themeStyles = useMemo(() => {
    const root = document.documentElement;
    const isCrimson = root.classList.contains('crimson');
    
    return {
      gradientFrom: isCrimson ? 'from-red-800' : 'from-social-dark-green',
      gradientVia: isCrimson ? 'via-red-600' : 'via-social-green',
      gradientTo: isCrimson ? 'to-red-500' : 'to-social-light-green',
      accentColor: isCrimson ? 'text-red-500' : 'text-social-green',
      accentBg: isCrimson ? 'bg-red-50' : 'bg-social-green/10',
      accentBorder: isCrimson ? 'border-red-200/50' : 'border-social-green/30',
      cardHoverShadow: isCrimson ? 'hover:shadow-red-100/20' : 'hover:shadow-lg',
      iconBg1: isCrimson ? 'bg-red-50' : 'bg-social-green/10',
      iconBg2: isCrimson ? 'bg-red-50' : 'bg-social-purple/10',
      iconColor1: isCrimson ? 'text-red-500' : 'text-social-green',
      iconColor2: isCrimson ? 'text-red-500' : 'text-social-purple'
    };
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollTop } = scrollContainerRef.current;
      setShowScrollTop(scrollTop > 300);
    }
  }, []);

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const toggleSection = (section: 'features' | 'highlights' | 'comingSoon') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto h-[calc(100vh-60px)] flex flex-col">
        <ScrollArea className="flex-1 px-4" viewportRef={scrollContainerRef}>
          <div className="py-4 space-y-6 animate-fade-in">
            {/* Coming Soon Banner */}
            <Card className="overflow-hidden border-0 shadow-xl crimson:shadow-red-200/30">
              <div className={`bg-gradient-to-r ${themeStyles.gradientFrom} ${themeStyles.gradientVia} ${themeStyles.gradientTo} p-8 text-white`}>
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

            {/* Features Section */}
            <Card className={`hover:shadow-lg transition-all duration-300 crimson:border-red-100 ${themeStyles.cardHoverShadow}`}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-pixelated text-lg font-medium">Features</h2>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => toggleSection('features')}
                    className="h-8 w-8 p-0"
                  >
                    {expandedSections.features ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
                
                {expandedSections.features && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                    <div className="flex flex-col items-center text-center p-4 bg-background rounded-lg shadow-sm">
                      <div className={`w-16 h-16 rounded-full ${themeStyles.iconBg1} flex items-center justify-center mb-4`}>
                        <MessageSquare className={`h-8 w-8 ${themeStyles.iconColor1}`} />
                      </div>
                      <h3 className="font-pixelated text-base font-medium mb-3">Group Messaging</h3>
                      <p className="font-pixelated text-sm text-muted-foreground mb-4">
                        Connect with multiple friends in organized group conversations. Share ideas, plan events, and stay connected with your social circles.
                      </p>
                    </div>

                    <div className="flex flex-col items-center text-center p-4 bg-background rounded-lg shadow-sm">
                      <div className={`w-16 h-16 rounded-full ${themeStyles.iconBg2} flex items-center justify-center mb-4`}>
                        <Sparkles className={`h-8 w-8 ${themeStyles.iconColor2}`} />
                      </div>
                      <h3 className="font-pixelated text-base font-medium mb-3">Coming Soon</h3>
                      <p className="font-pixelated text-sm text-muted-foreground mb-4">
                        We're working hard to bring you an amazing group chat experience. The Vortex feature will revolutionize how you connect with friends and communities.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Feature Highlights */}
            <Card className={`crimson:border-red-100 crimson:bg-gradient-to-b crimson:from-white crimson:to-red-50/30`}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-pixelated text-lg font-medium">Feature Highlights</h2>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => toggleSection('highlights')}
                    className="h-8 w-8 p-0"
                  >
                    {expandedSections.highlights ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
                
                {expandedSections.highlights && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                    <div className="flex items-start gap-3 bg-background p-4 rounded-lg shadow-sm">
                      <div className={`w-8 h-8 rounded-full ${themeStyles.iconBg1} flex-shrink-0 flex items-center justify-center`}>
                        <Shield className={`h-4 w-4 ${themeStyles.iconColor1}`} />
                      </div>
                      <div>
                        <h4 className="font-pixelated text-sm font-medium mb-1">Private Groups</h4>
                        <p className="font-pixelated text-xs text-muted-foreground">
                          Create invite-only spaces for your closest friends and family
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 bg-background p-4 rounded-lg shadow-sm">
                      <div className={`w-8 h-8 rounded-full ${themeStyles.iconBg2} flex-shrink-0 flex items-center justify-center`}>
                        <Star className={`h-4 w-4 ${themeStyles.accentColor}`} />
                      </div>
                      <div>
                        <h4 className="font-pixelated text-sm font-medium mb-1">Rich Media Sharing</h4>
                        <p className="font-pixelated text-xs text-muted-foreground">
                          Share photos, videos, and files with your group members
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Coming Soon Message */}
            <Card className={`border-2 border-dashed ${themeStyles.accentBorder} ${themeStyles.accentBg}`}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`font-pixelated text-lg font-medium social-gradient bg-clip-text text-transparent crimson:bg-gradient-to-r crimson:from-red-700 crimson:to-red-500`}>
                    Coming Soon
                  </h2>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => toggleSection('comingSoon')}
                    className="h-8 w-8 p-0"
                  >
                    {expandedSections.comingSoon ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
                
                {expandedSections.comingSoon && (
                  <div className="animate-fade-in">
                    <p className="font-pixelated text-sm text-muted-foreground mb-4">
                      We're working hard to bring you the best group chat experience. Stay tuned for updates!
                    </p>
                    
                    <div className="bg-background p-4 rounded-lg shadow-sm">
                      <h3 className="font-pixelated text-sm font-medium mb-2">Planned Features:</h3>
                      <ul className="space-y-2 font-pixelated text-xs text-muted-foreground list-disc list-inside">
                        <li>End-to-end encrypted group chats</li>
                        <li>Voice and video calls</li>
                        <li>File sharing and collaborative documents</li>
                        <li>Group events and calendar integration</li>
                        <li>Custom themes and group personalization</li>
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Development Note */}
            <div className="text-center mb-4">
              <p className="font-pixelated text-xs text-muted-foreground">
                Vortex Groups is currently in development by Mohammed Maaz A.
              </p>
            </div>
          </div>
        </ScrollArea>
        
        {/* Scroll to Top Button */}
        {showScrollTop && (
          <Button
            onClick={scrollToTop}
            size="icon"
            className="fixed bottom-20 right-4 z-50 h-10 w-10 rounded-full bg-social-green hover:bg-social-light-green text-white shadow-lg btn-hover-lift transition-all duration-200 pixel-border pixel-shadow"
            style={{ 
              fontSize: '8px',
              fontFamily: 'Press Start 2P, cursive'
            }}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        )}
      </div>
    </DashboardLayout>
  );
}

export default Vortex;