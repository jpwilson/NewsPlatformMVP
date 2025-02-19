import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Newspaper, User, LogOut } from "lucide-react";

export function NavigationBar({ hideAuthButtons = false }: { hideAuthButtons?: boolean }) {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

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
          {!hideAuthButtons && (
            user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    {user.username}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/auth">
                <Button size="sm">Login</Button>
              </Link>
            )
          )}
        </nav>
      </div>
    </header>
  );
}