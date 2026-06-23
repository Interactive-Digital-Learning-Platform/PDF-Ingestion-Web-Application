"use client"

import * as React from "react"
import Link from "next/link"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { FileTextIcon } from "lucide-react"
import { UserButton } from "@clerk/nextjs"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="px-2 py-2">
          <p className="text-sm font-semibold">PDF Ingestion</p>
          <p className="text-xs text-sidebar-foreground/70">Operations dashboard</p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive tooltip="Dashboard">
                <Link href="/dashboard">
                  <FileTextIcon />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-between rounded-md border border-sidebar-border px-2 py-2">
          <span className="text-xs text-sidebar-foreground/70">Account</span>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
