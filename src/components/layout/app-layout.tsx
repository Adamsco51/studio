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
import { LogOut } from 'lucide-react';
import Link from 'next/link';

export function AppLayout({ children }: { children: ReactNode }) {
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
        <SidebarFooter className="p-2">
           <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:justify-center">
            <LogOut className="h-5 w-5" />
            <span className="group-data-[collapsible=icon]:hidden ml-2">Déconnexion</span>
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-end gap-4 border-b bg-background/80 px-6 backdrop-blur-sm md:justify-between">
            <div className="md:hidden">
                {/* Mobile sidebar trigger can be placed here if needed, or keep it simple */}
            </div>
            <div className="flex items-center gap-2">
                 <span className="text-sm text-muted-foreground hidden md:inline">Bob Admin (Admin)</span>
                {/* Placeholder for User Menu/Avatar */}
            </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
