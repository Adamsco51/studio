
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, FileText, Settings as SettingsIcon, Package, DollarSign, Briefcase, MessageSquare, ShieldAlert } from 'lucide-react'; // Added Briefcase for Work Types, MessageSquare for Chat, ShieldAlert for Admin
import { cn } from '@/lib/utils';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/auth-context'; // Import useAuth

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/bls', label: 'Bills of Lading', icon: FileText },
  { href: '/expenses', label: 'Dépenses', icon: DollarSign },
  { href: '/work-types', label: 'Types de Travail', icon: Briefcase },
  { href: '/chat', label: 'Messagerie', icon: MessageSquare },
  { href: '/reports', label: 'Rapports', icon: Package },
];

const adminNavItems = [
    { href: '/admin/approvals', label: 'Approbations', icon: ShieldAlert },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { isAdmin } = useAuth(); // Get isAdmin status

  return (
    <SidebarMenu>
      {navItems.map((item) => (
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
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
