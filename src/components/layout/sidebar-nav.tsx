
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users as UsersIconLucide, FileText, Settings as SettingsIcon, Package, DollarSign, Briefcase, MessageSquare, ShieldAlert, ListOrdered, Users, History, Truck as TruckIcon, UserCog, Route, Box as ContainerIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/auth-context';
import { useEffect, useState } from 'react';
import { getApprovalRequestsFromFirestore } from '@/lib/mock-data';
import type { ApprovalRequest } from '@/lib/types';

const mainOpsNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: UsersIconLucide },
  { href: '/bls', label: 'Connaissements', icon: FileText },
  { href: '/transports', label: 'Transports', icon: Route },
  { href: '/containers', label: 'Conteneurs', icon: ContainerIcon },
  { href: '/expenses', label: 'Dépenses', icon: DollarSign },
];

const configNavItems = [
  { href: '/work-types', label: 'Types de Travail', icon: Briefcase },
  { href: '/trucks', label: 'Camions', icon: TruckIcon },
  { href: '/drivers', label: 'Chauffeurs', icon: UserCog },
];

const communicationNavItems = [
    { href: '/chat', label: 'Messagerie', icon: MessageSquare },
];

const userSpecificNavItems = [
    { href: '/my-requests', label: 'Mes Demandes', icon: ListOrdered },
];

const toolsNavItems = [
    { href: '/reports', label: 'Rapports', icon: Package },
];

const adminNavItems = [
    { href: '/admin/approvals', label: 'Approbations', icon: ShieldAlert, badgeKey: 'pendingApprovals' },
    { href: '/admin/users', label: 'Utilisateurs', icon: Users },
    { href: '/admin/audit-log/sessions', label: "Journal d'Audit", icon: History },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { isAdmin, user } = useAuth();
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  useEffect(() => {
    if (isAdmin && user) {
      const fetchPendingApprovals = async () => {
        try {
          const requests = await getApprovalRequestsFromFirestore('pending');
          setPendingApprovalsCount(requests.length);
        } catch (error) {
          console.error("Failed to fetch pending approvals for badge:", error);
          setPendingApprovalsCount(0);
        }
      };
      fetchPendingApprovals();
      const interval = setInterval(fetchPendingApprovals, 60000); // Refresh every minute
      return () => clearInterval(interval);
    } else {
      setPendingApprovalsCount(0);
    }
  }, [isAdmin, user]);

  const renderNavItems = (items: typeof mainOpsNavItems, isPartOfAdmin?: boolean) => {
    if (!user) return null;
    if (isPartOfAdmin && !isAdmin) return null;

    return items.map((item) => {
      if (item.href === '/my-requests' && isAdmin) return null; // Hide 'Mes Demandes' for admins

      const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
      const badgeCount = (item as any).badgeKey === 'pendingApprovals' ? pendingApprovalsCount : 0;

      return (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} passHref legacyBehavior>
            <SidebarMenuButton
              variant="default"
              size="default"
              isActive={isActive}
              tooltip={{ children: item.label, side: "right", align: "center" }}
              className="justify-start"
            >
              <item.icon className="h-5 w-5" />
              <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
              {badgeCount > 0 && (
                <SidebarMenuBadge>{badgeCount}</SidebarMenuBadge>
              )}
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      );
    });
  };

  return (
    <SidebarMenu>
      <SidebarGroup>
        <SidebarGroupLabel>Opérations</SidebarGroupLabel>
        {renderNavItems(mainOpsNavItems)}
      </SidebarGroup>
      
      <SidebarSeparator />
      
      <SidebarGroup>
        <SidebarGroupLabel>Configuration</SidebarGroupLabel>
        {renderNavItems(configNavItems)}
      </SidebarGroup>

      <SidebarSeparator />

      <SidebarGroup>
        <SidebarGroupLabel>Communication</SidebarGroupLabel>
        {renderNavItems(communicationNavItems)}
      </SidebarGroup>
      
      <SidebarSeparator />

      <SidebarGroup>
        <SidebarGroupLabel>Outils</SidebarGroupLabel>
        {renderNavItems(toolsNavItems)}
      </SidebarGroup>

      {!isAdmin && user && (
        <>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarGroupLabel>Personnel</SidebarGroupLabel>
            {renderNavItems(userSpecificNavItems)}
          </SidebarGroup>
        </>
      )}

      {isAdmin && (
        <>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarGroupLabel className="text-destructive">Administration</SidebarGroupLabel>
            {renderNavItems(adminNavItems, true)}
          </SidebarGroup>
        </>
      )}
    </SidebarMenu>
  );
}
