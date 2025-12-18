'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  GitBranch,
  Bell,
  Plus,
  Search,
  Menu,
  BookOpen,
  Star,
  GitPullRequest,
  CircleDot,
  Settings,
  LogOut,
  User as UserIcon,
  X,
  Compass,
  Home,
  FileCode,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { signOut } from '@/app/actions/auth';
import type { User } from '@/types';

interface HeaderProps {
  user: User | null;
}

export function Header({ user }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim().length >= 2) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-semibold shrink-0">
          <GitBranch className="h-6 w-6" />
          <span className="hidden sm:inline">GitForge</span>
        </Link>

        {/* Search - Hidden on mobile */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md hidden sm:block">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search repositories..."
              className="pl-8 h-9 bg-muted/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>

        {/* Spacer for mobile */}
        <div className="flex-1 sm:hidden" />

        {/* Navigation - Hidden on mobile */}
        <nav className="hidden md:flex items-center gap-1">
          <Link href="/explore">
            <Button variant="ghost" size="sm">
              Explore
            </Button>
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {/* Search button for mobile */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 sm:hidden">
                    <Search className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="top" className="h-auto">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Search</SheetTitle>
                  </SheetHeader>
                  <form onSubmit={handleSearch} className="pt-4">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Search repositories..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </form>
                </SheetContent>
              </Sheet>

              {/* Notifications */}
              <Link href="/notifications">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Bell className="h-4 w-4" />
                </Button>
              </Link>

              {/* Create New - Desktop only */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 hidden sm:flex">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/new" className="flex items-center">
                      <BookOpen className="mr-2 h-4 w-4" />
                      New repository
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/gist/new" className="flex items-center">
                      <FileCode className="mr-2 h-4 w-4" />
                      New gist
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/orgs/new" className="flex items-center">
                      <UserIcon className="mr-2 h-4 w-4" />
                      New organization
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Menu - Desktop */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hidden sm:flex">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url || undefined} alt={user.username} />
                      <AvatarFallback>
                        {user.username?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.display_name || user.username}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        @{user.username}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/${user.username}`} className="flex items-center">
                      <UserIcon className="mr-2 h-4 w-4" />
                      Your profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/${user.username}?tab=repositories`} className="flex items-center">
                      <BookOpen className="mr-2 h-4 w-4" />
                      Your repositories
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/${user.username}?tab=stars`} className="flex items-center">
                      <Star className="mr-2 h-4 w-4" />
                      Your stars
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/${user.username}/gists`} className="flex items-center">
                      <FileCode className="mr-2 h-4 w-4" />
                      Your gists
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/pulls" className="flex items-center">
                      <GitPullRequest className="mr-2 h-4 w-4" />
                      Pull requests
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/issues" className="flex items-center">
                      <CircleDot className="mr-2 h-4 w-4" />
                      Issues
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <form action={signOut}>
                      <button type="submit" className="flex items-center w-full">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign out
                      </button>
                    </form>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="sm:hidden h-9 w-9">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px]">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || undefined} alt={user.username} />
                        <AvatarFallback>
                          {user.username?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {user.display_name || user.username}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          @{user.username}
                        </span>
                      </div>
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col gap-1 mt-6">
                    <Link href="/" onClick={closeMobileMenu}>
                      <Button variant="ghost" className="w-full justify-start">
                        <Home className="mr-2 h-4 w-4" />
                        Home
                      </Button>
                    </Link>
                    <Link href="/explore" onClick={closeMobileMenu}>
                      <Button variant="ghost" className="w-full justify-start">
                        <Compass className="mr-2 h-4 w-4" />
                        Explore
                      </Button>
                    </Link>
                    <Link href="/new" onClick={closeMobileMenu}>
                      <Button variant="ghost" className="w-full justify-start">
                        <Plus className="mr-2 h-4 w-4" />
                        New repository
                      </Button>
                    </Link>
                    <Link href="/gist/new" onClick={closeMobileMenu}>
                      <Button variant="ghost" className="w-full justify-start">
                        <FileCode className="mr-2 h-4 w-4" />
                        New gist
                      </Button>
                    </Link>
                    <div className="my-2 border-t" />
                    <Link href={`/${user.username}`} onClick={closeMobileMenu}>
                      <Button variant="ghost" className="w-full justify-start">
                        <UserIcon className="mr-2 h-4 w-4" />
                        Your profile
                      </Button>
                    </Link>
                    <Link href={`/${user.username}?tab=repositories`} onClick={closeMobileMenu}>
                      <Button variant="ghost" className="w-full justify-start">
                        <BookOpen className="mr-2 h-4 w-4" />
                        Your repositories
                      </Button>
                    </Link>
                    <Link href={`/${user.username}?tab=stars`} onClick={closeMobileMenu}>
                      <Button variant="ghost" className="w-full justify-start">
                        <Star className="mr-2 h-4 w-4" />
                        Your stars
                      </Button>
                    </Link>
                    <Link href={`/${user.username}/gists`} onClick={closeMobileMenu}>
                      <Button variant="ghost" className="w-full justify-start">
                        <FileCode className="mr-2 h-4 w-4" />
                        Your gists
                      </Button>
                    </Link>
                    <div className="my-2 border-t" />
                    <Link href="/pulls" onClick={closeMobileMenu}>
                      <Button variant="ghost" className="w-full justify-start">
                        <GitPullRequest className="mr-2 h-4 w-4" />
                        Pull requests
                      </Button>
                    </Link>
                    <Link href="/issues" onClick={closeMobileMenu}>
                      <Button variant="ghost" className="w-full justify-start">
                        <CircleDot className="mr-2 h-4 w-4" />
                        Issues
                      </Button>
                    </Link>
                    <div className="my-2 border-t" />
                    <Link href="/settings" onClick={closeMobileMenu}>
                      <Button variant="ghost" className="w-full justify-start">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Button>
                    </Link>
                    <form action={signOut}>
                      <Button variant="ghost" type="submit" className="w-full justify-start text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign out
                      </Button>
                    </form>
                  </nav>
                </SheetContent>
              </Sheet>
            </>
          ) : (
            <>
              {/* Search button for mobile (logged out) */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 sm:hidden">
                    <Search className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="top" className="h-auto">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Search</SheetTitle>
                  </SheetHeader>
                  <form onSubmit={handleSearch} className="pt-4">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Search repositories..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </form>
                </SheetContent>
              </Sheet>

              <Link href="/login" className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/signup" className="hidden sm:block">
                <Button size="sm">Sign up</Button>
              </Link>

              {/* Mobile menu for logged out users */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="sm:hidden h-9 w-9">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px]">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <GitBranch className="h-6 w-6" />
                      GitForge
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col gap-1 mt-6">
                    <Link href="/">
                      <Button variant="ghost" className="w-full justify-start">
                        <Home className="mr-2 h-4 w-4" />
                        Home
                      </Button>
                    </Link>
                    <Link href="/explore">
                      <Button variant="ghost" className="w-full justify-start">
                        <Compass className="mr-2 h-4 w-4" />
                        Explore
                      </Button>
                    </Link>
                    <div className="my-4 border-t" />
                    <Link href="/login">
                      <Button variant="outline" className="w-full">
                        Sign in
                      </Button>
                    </Link>
                    <Link href="/signup">
                      <Button className="w-full">
                        Sign up
                      </Button>
                    </Link>
                  </nav>
                </SheetContent>
              </Sheet>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
