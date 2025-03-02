import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Newspaper, User, LogOut } from "lucide-react";

export function NavigationBar({
  hideAuthButtons = false,
}: {
  hideAuthButtons?: boolean;
}) {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Newspaper className="h-6 w-6" />
          <span className="font-bold text-lg">NewsPlatform</span>
        </button>

        <nav>
          {!hideAuthButtons &&
            (user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 bg-background"
                  >
                    {user.username}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuItem asChild>
                    <Link href="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/auth">
                <Button size="sm">Login</Button>
              </Link>
            ))}
        </nav>
      </div>
    </header>
  );
}
