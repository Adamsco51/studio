
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users as UsersIconLucide, FileText, Settings as SettingsIcon, Package, DollarSign, Briefcase, MessageSquare, ShieldAlert, ListOrdered, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge, // Import SidebarMenuBadge
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/auth-context';
import { useEffect, useState } from 'react';
import { getApprovalRequestsFromFirestore } from '@/lib/mock-data'; // Firestore function
import type { ApprovalRequest } from '@/lib/types';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: UsersIconLucide },
  { href: '/bls', label: 'Bills of Lading', icon: FileText },
  { href: '/expenses', label: 'Dépenses', icon: DollarSign },
  { href: '/work-types', label: 'Types de Travail', icon: Briefcase },
  { href: '/chat', label: 'Messagerie', icon: MessageSquare },
  { href: '/my-requests', label: 'Mes Demandes', icon: ListOrdered },
  { href: '/reports', label: 'Rapports', icon: Package },
];

const adminNavItems = [
    { href: '/admin/approvals', label: 'Approbations', icon: ShieldAlert, badgeKey: 'pendingApprovals' },
    { href: '/admin/users', label: 'Utilisateurs', icon: Users },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { isAdmin, user } = useAuth();
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  useEffect(() => {
    if (isAdmin && user) {
      const fetchPendingApprovals = async () => {
        try {
          // Fetch only pending requests for efficiency
          const requests = await getApprovalRequestsFromFirestore('pending');
          setPendingApprovalsCount(requests.length);
        } catch (error) {
          console.error("Failed to fetch pending approvals for badge:", error);
          setPendingApprovalsCount(0);
        }
      };
      fetchPendingApprovals();

      // Optional: Set up a listener for real-time updates if desired, though more complex
      // For now, a one-time fetch or periodic refresh might be simpler.
      // const unsubscribe = onSnapshot(query(collection(db, "approvalRequests"), where("status", "==", "pending")), (snapshot) => {
      //   setPendingApprovalsCount(snapshot.size);
      // });
      // return () => unsubscribe();
    } else {
      setPendingApprovalsCount(0); // Reset if not admin or no user
    }
  }, [isAdmin, user]);

  const visibleNavItems = user && isAdmin ? navItems.filter(item => item.href !== '/my-requests') : navItems;

  return (
    <SidebarMenu>
      {visibleNavItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} passHref legacyBehavior>
            <SidebarMenuButton
              variant="default"
              size="default"
              isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
              tooltip={{ children: item.label, side: "right", align: "center" }}
              className="justify-start"
            >
              <item.icon className="h-5 w-5" />
              <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
      {isAdmin && adminNavItems.map((item) => (
         <SidebarMenuItem key={item.href}>
          <Link href={item.href} passHref legacyBehavior>
            <SidebarMenuButton
              variant="default"
              size="default"
              isActive={pathname === item.href || pathname.startsWith(item.href)}
              tooltip={{ children: item.label, side: "right", align: "center" }}
              className="justify-start"
            >
              <item.icon className="h-5 w-5" />
              <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
              {item.badgeKey === 'pendingApprovals' && pendingApprovalsCount > 0 && (
                <SidebarMenuBadge>{pendingApprovalsCount}</SidebarMenuBadge>
              )}
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
