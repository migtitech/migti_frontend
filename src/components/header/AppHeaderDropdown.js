import React from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, User } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui";
import { useAuth, ROLE_LABELS } from "../../context/AuthContext";

const AppHeaderDropdown = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Generate initials from user name
  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <li className="nav-item">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="border-0 bg-transparent p-0"
            aria-label="Account menu"
          >
            <Avatar className="h-9 w-9">
              <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{user?.name}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled className="text-muted-foreground">
            <User className="mr-2 h-4 w-4" />
            {ROLE_LABELS[user?.role] || user?.role}
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="text-muted-foreground text-sm">
            {user?.email}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
};

export default AppHeaderDropdown;
