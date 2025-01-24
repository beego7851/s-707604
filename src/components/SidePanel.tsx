import { useCallback, useMemo, memo, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useAuthSession } from "@/hooks/useAuthSession";
import NavItem from "./navigation/NavItem";

interface SidePanelProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

const SidePanel = memo(({ currentTab, onTabChange }: SidePanelProps) => {
  const { session, handleSignOut } = useAuthSession();
  const { userRole, userRoles, roleLoading, hasRole, canAccessTab } = useRoleAccess();
  const { toast } = useToast();

  const prevUserRoleRef = useRef(userRole);
  const prevUserRolesRef = useRef(userRoles);
  const prevTabRef = useRef(currentTab);

  const hasSession = !!session;

  useEffect(() => {
    if (!hasSession) {
      console.log('No active session, access will be restricted');
      return;
    }

    if (prevUserRoleRef.current !== userRole) {
      console.log('SidePanel rerender: userRole changed', { old: prevUserRoleRef.current, new: userRole });
      prevUserRoleRef.current = userRole;
    }
    if (prevUserRolesRef.current !== userRoles) {
      console.log('SidePanel rerender: userRoles changed', { old: prevUserRolesRef.current, new: userRoles });
      prevUserRolesRef.current = userRoles;
    }
    if (prevTabRef.current !== currentTab) {
      console.log('SidePanel rerender: currentTab changed', { old: prevTabRef.current, new: currentTab });
      prevTabRef.current = currentTab;
    }
  }, [userRole, userRoles, hasSession, currentTab]);

  const navigationItems = useMemo(() => [
    {
      name: 'Overview',
      tab: 'dashboard',
      alwaysShow: true
    },
    {
      name: 'Users',
      tab: 'users',
      requiresRole: ['admin', 'collector'] as const
    },
    {
      name: 'Financials',
      tab: 'financials',
      requiresRole: ['admin', 'collector'] as const
    },
    {
      name: 'System',
      tab: 'system',
      requiresRole: ['admin'] as const
    }
  ], []);

  const visibleNavigationItems = useMemo(() => {
    console.log('Calculating visible navigation items', {
      hasSession,
      roleLoading,
      userRoles,
      timestamp: new Date().toISOString()
    });

    if (!hasSession) return navigationItems.filter(item => item.alwaysShow);
    
    return navigationItems.filter(item => {
      if (item.alwaysShow) return true;
      if (roleLoading) return false;
      if (!item.requiresRole) return true;
      return item.requiresRole.some(role => userRoles?.includes(role));
    });
  }, [navigationItems, roleLoading, userRoles, hasSession]);

  const handleTabChange = useCallback((tab: string) => {
    console.log('Tab change requested:', {
      tab,
      canAccess: canAccessTab(tab),
      userRoles,
      timestamp: new Date().toISOString()
    });

    if (!canAccessTab(tab)) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this section.",
        variant: "destructive"
      });
      return;
    }

    onTabChange(tab);
  }, [onTabChange, canAccessTab, userRoles, toast]);

  const handleLogoutClick = useCallback(async () => {
    console.log('Logout initiated');
    try {
      await handleSignOut(false);
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive"
      });
    }
  }, [handleSignOut, toast]);

  const roleStatusText = useMemo(() => {
    console.log('Calculating role status text');
    if (!hasSession) return 'Not authenticated';
    if (roleLoading) return 'Loading access...';
    return userRole ? `Role: ${userRole}` : 'Access restricted';
  }, [roleLoading, userRole, hasSession]);

  console.log('SidePanel render', { 
    userRole, 
    roleLoading, 
    hasSession,
    visibleTabs: visibleNavigationItems.map(item => item.tab),
    currentTab,
    timestamp: new Date().toISOString()
  });

  return (
    <div className="flex flex-col h-full bg-dashboard-card border-r border-dashboard-cardBorder">
      <ScrollArea className="flex-1">
        <div className="space-y-4 py-4">
          <div className="px-3 py-2">
            <h2 className="mb-2 px-4 text-lg font-semibold text-dashboard-highlight">
              Navigation
            </h2>
            <div className="space-y-1">
              {visibleNavigationItems.map((item) => (
                <NavItem
                  key={item.tab}
                  name={item.name}
                  tab={item.tab}
                  isActive={currentTab === item.tab}
                  onClick={() => handleTabChange(item.tab)}
                />
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
      <div className="p-4 border-t border-dashboard-cardBorder space-y-4">
        <Button
          variant="outline"
          className="w-full justify-start bg-[#9b87f5] hover:bg-[#7E69AB] text-white"
          onClick={handleLogoutClick}
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
});

SidePanel.displayName = "SidePanel";

export default SidePanel;