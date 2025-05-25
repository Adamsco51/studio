
import type { ReactNode } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { SidebarNav } from './sidebar-nav';
import { Button } from '@/components/ui/button';
import { LogOut, User as UserIcon, Settings } from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MOCK_USERS } from '@/lib/mock-data'; 
import type { User } from '@/lib/types';
import { ThemeToggleButton } from '@/components/shared/theme-toggle-button';

export function AppLayout({ children }: { children: ReactNode }) {
  const loggedInUser: User | undefined = MOCK_USERS.find(u => u.role === 'admin') || MOCK_USERS[0];

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar collapsible="icon" variant="sidebar" side="left">
        <SidebarHeader className="p-4">
          <Link href="/dashboard" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-primary">
              <path d="M12.378 1.602a.75.75 0 00-.756 0L3.366 6.027a.75.75 0 00-.366.648v10.65a.75.75 0 00.366.648l8.256 4.425a.75.75 0 00.756 0l8.256-4.425a.75.75 0 00.366-.648V6.675a.75.75 0 00-.366-.648L12.378 1.602zM12 15.93a.75.75 0 00.622-.355l3.256-4.652a.75.75 0 00-.088-1.038.75.75 0 00-1.038-.088l-2.664 3.806-3.928-3.226a.75.75 0 00-.952.042.75.75 0 00.042.952l4.5 3.75a.75.75 0 00.248.11z" />
            </svg>
            <span className="text-xl font-semibold text-foreground group-data-[collapsible=icon]:hidden">TransitFlow</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav />
        </SidebarContent>
        <SidebarFooter className="p-2 border-t border-sidebar-border">
          {loggedInUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:justify-center h-auto py-2 px-2 text-left">
                  <UserIcon className="h-5 w-5 shrink-0" />
                  <span className="group-data-[collapsible=icon]:hidden ml-2 flex flex-col">
                    <span className="font-medium text-sm">{loggedInUser.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{loggedInUser.role}</span>
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 mb-1 ml-1" side="top" align="start">
                <DropdownMenuLabel>Mon Compte</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Déconnexion</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background/80 px-4 sm:px-6 backdrop-blur-lg">
          {/* Left Side */}
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden h-8 w-8" /> {/* Mobile Menu Button */}
            <Link href="/dashboard" className="hidden md:flex items-center gap-2"> {/* Desktop App Name/Logo */}
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7 text-primary">
                <path d="M12.378 1.602a.75.75 0 00-.756 0L3.366 6.027a.75.75 0 00-.366.648v10.65a.75.75 0 00.366.648l8.256 4.425a.75.75 0 00.756 0l8.256-4.425a.75.75 0 00.366-.648V6.675a.75.75 0 00-.366-.648L12.378 1.602zM12 15.93a.75.75 0 00.622-.355l3.256-4.652a.75.75 0 00-.088-1.038.75.75 0 00-1.038-.088l-2.664 3.806-3.928-3.226a.75.75 0 00-.952.042.75.75 0 00.042.952l4.5 3.75a.75.75 0 00.248.11z" />
              </svg>
              <span className="text-lg font-semibold text-foreground">TransitFlow</span>
            </Link>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggleButton />
            {loggedInUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full w-8 h-8">
                    <UserIcon className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{loggedInUser.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {loggedInUser.role}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Mon Profil</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Déconnexion</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
