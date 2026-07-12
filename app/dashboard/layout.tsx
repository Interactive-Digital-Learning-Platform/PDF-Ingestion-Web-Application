"use client";

import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import React from "react";

export default function Page({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const paths = pathname.split("/").filter((path) => path);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                {paths.map((path, index) => {
                  const href = `/${paths.slice(0, index + 1).join("/")}`;
                  return (
                    <React.Fragment key={index}>
                      <BreadcrumbItem className="hidden md:block max-w-[100px] text-ellipsis">
                        <BreadcrumbLink
                          className="block max-w-[100px] capitalize text-ellipsis whitespace-nowrap overflow-hidden"
                          href={href}
                        >
                          {path}
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      {paths.length !== index + 1 && (
                        <BreadcrumbSeparator className="hidden md:block" />
                      )}
                    </React.Fragment>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="p-4 py-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
