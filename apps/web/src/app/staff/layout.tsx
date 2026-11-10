"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { StaffShell } from "../../components/staff-shell";

export default function StaffLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/staff/login") return children;
  return <StaffShell>{children}</StaffShell>;
}
