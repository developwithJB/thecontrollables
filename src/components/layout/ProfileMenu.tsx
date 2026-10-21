import { LogOut, Settings, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
export function ProfileMenu({ onSettings, onSignOut }: { onSettings:()=>void; onSignOut:()=>void }) {
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-xl" aria-label="Profile menu"><UserRound className="h-4 w-4" /></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onSelect={onSettings}><Settings className="mr-2 h-4 w-4" />Profile Settings</DropdownMenuItem>
      <DropdownMenuItem onSelect={onSignOut}><LogOut className="mr-2 h-4 w-4" />Sign Out</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
