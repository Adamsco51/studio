
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    LayoutDashboard, Users as UsersIconLucide, FileText, Settings as SettingsIcon, 
    Package, DollarSign, Briefcase, MessageSquare, ShieldAlert, ListOrdered, Users, 
    History, Truck as TruckIcon, UserCog, Route, Box as ContainerIcon, BookOpen, FileArchive,
    BookUser, FilePlus2, FileDigit
} from 'lucide-react';
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
import type { ApprovalRequest, UserProfile } from '@/lib/types';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badgeKey?: string;
  requiredJobTitle?: UserProfile['jobTitle'][]; // For job-specific sections
}

const mainOpsNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: UsersIconLucide },
  { href: '/bls', label: 'Connaissements', icon: FileText },
  { href: '/transports', label: 'Transports', icon: Route },
  { href: '/containers', label: 'Conteneurs', icon: ContainerIcon },
  { href: '/expenses', label: 'Dépenses', icon: DollarSign },
];

const configNavItems: NavItem[] = [
  { href: '/work-types', label: 'Types de Travail', icon: Briefcase },
  { href: '/trucks', label: 'Camions', icon: TruckIcon },
  { href: '/drivers', label: 'Chauffeurs', icon: UserCog },
];

const communicationNavItems: NavItem[] = [
    { href: '/chat', label: 'Messagerie', icon: MessageSquare },
];

const secretaryNavItems: NavItem[] = [
    { href: '/secretary/documents', label: 'Gestion Documents', icon: FileArchive, requiredJobTitle: ['Secrétaire', 'Manager'] },
    // Add more secretary-specific links here
];

const accountingNavItems: NavItem[] = [
    { href: '/accounting/invoices', label: 'Facturation', icon: FileDigit, requiredJobTitle: ['Comptable', 'Manager'] },
    // Add more accounting-specific links here
];

const userSpecificNavItems: NavItem[] = [
    { href: '/my-requests', label: 'Mes Demandes', icon: ListOrdered },
];

const toolsNavItems: NavItem[] = [
    { href: '/reports', label: 'Rapports', icon: Package },
];

const adminNavItems: NavItem[] = [
    { href: '/admin/approvals', label: 'Approbations', icon: ShieldAlert, badgeKey: 'pendingApprovals' },
    { href: '/admin/users', label: 'Utilisateurs', icon: Users },
    { href: '/admin/audit-log/sessions', label: "Journal d'Audit", icon: History },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { user, isAdmin } = useAuth();
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

  const renderNavItems = (items: NavItem[], isPartOfAdmin?: boolean) => {
    if (!user) return null;
    if (isPartOfAdmin && !isAdmin) return null;

    return items.map((item) => {
      if (item.href === '/my-requests' && isAdmin) return null; // Hide 'Mes Demandes' for admins

      // Check job title requirement
      if (item.requiredJobTitle && !isAdmin) { // Admins see all job-specific sections
        if (!user.jobTitle || !item.requiredJobTitle.includes(user.jobTitle)) {
          return null; // Hide if user doesn't have the required job title
        }
      }

      const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
      const badgeCount = item.badgeKey === 'pendingApprovals' ? pendingApprovalsCount : 0;

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
      
      {(user?.jobTitle === 'Secrétaire' || user?.jobTitle === 'Manager' || isAdmin) && (
        <>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarGroupLabel className={cn( (isAdmin || user?.jobTitle === 'Manager') ? "text-sidebar-foreground/70" : "text-accent")}>Secrétariat</SidebarGroupLabel>
            {renderNavItems(secretaryNavItems)}
          </SidebarGroup>
        </>
      )}

      {(user?.jobTitle === 'Comptable' || user?.jobTitle === 'Manager' || isAdmin) && (
        <>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarGroupLabel className={cn( (isAdmin || user?.jobTitle === 'Manager') ? "text-sidebar-foreground/70" : "text-accent")}>Comptabilité</SidebarGroupLabel>
            {renderNavItems(accountingNavItems)}
          </SidebarGroup>
        </>
      )}
      
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
