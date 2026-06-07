"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSession, signOut } from "next-auth/react"
import { Home, Trophy, Users, PlusSquare, Search, Bell, MessageSquare, MonitorSmartphone } from "lucide-react"
import { cn } from "@/lib/utils"

export function MainNav() {
    const pathname = usePathname()
    const { data: session } = useSession()

    const navItems = [
        { href: "/home", label: "Home", icon: Home },
        { href: "/rankings", label: "Rankings", icon: Trophy },
        { href: "/teams", label: "Teams", icon: Users },
        { href: "/monitor", label: "Monitor", icon: MonitorSmartphone },
    ]

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center">
                <div className="mr-4 hidden md:flex">
                    <Link href="/" className="mr-6 flex items-center space-x-2">
                        <span className="hidden font-bold sm:inline-block text-brand-blue text-xl">EverGo</span>
                    </Link>
                    <nav className="flex items-center space-x-6 text-sm font-medium">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "transition-colors hover:text-foreground/80 flex items-center gap-2",
                                    pathname?.startsWith(item.href) ? "text-foreground" : "text-foreground/60"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>

                <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
                    <div className="w-full flex-1 md:w-auto md:flex-none">
                        <Button variant="outline" className="w-full justify-start text-muted-foreground md:w-[200px] lg:w-[300px]" asChild>
                            <Link href="/search">
                                <Search className="mr-2 h-4 w-4" />
                                Search...
                            </Link>
                        </Button>
                    </div>

                    {session ? (
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" asChild>
                                <Link href="/activity/create">
                                    <PlusSquare className="h-5 w-5" />
                                    <span className="sr-only">New Activity</span>
                                </Link>
                            </Button>
                            <Button variant="ghost" size="icon">
                                <Bell className="h-5 w-5" />
                                <span className="sr-only">Notifications</span>
                            </Button>
                            <Button variant="ghost" size="icon">
                                <MessageSquare className="h-5 w-5" />
                                <span className="sr-only">Messages</span>
                            </Button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={session.user?.image || ""} alt={session.user?.name || ""} />
                                            <AvatarFallback>{session.user?.name?.[0] || "U"}</AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56" align="end" forceMount>
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">{session.user?.name}</p>
                                            <p className="text-xs leading-none text-muted-foreground">
                                                {session.user?.email}
                                            </p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href="/profile">Profile</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href="/settings">Settings</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => signOut()}>
                                        Log out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" asChild>
                                <Link href="/login">Login</Link>
                            </Button>
                            <Button asChild className="bg-brand-blue hover:bg-brand-blue-dark">
                                <Link href="/register">Sign Up</Link>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
