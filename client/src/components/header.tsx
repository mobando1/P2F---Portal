import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser, logout } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { LogOut, User, Settings, Menu, Sparkles, GraduationCap, MessageCircle, ChevronDown, CreditCard, LifeBuoy, HelpCircle } from "lucide-react";
import LanguageSwitcher from "./language-switcher";
import CurrencySwitcher from "./currency-switcher";
import NotificationBell from "./NotificationBell";
import { Coachmark } from "./onboarding/Coachmark";

export default function Header() {
  const user = getCurrentUser();
  const { t, language } = useLanguage();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread"],
    queryFn: () => apiRequest("GET", "/api/messages/unread").then(r => r.json()),
    enabled: !!user,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });

  const handleLogout = async () => {
    await logout();
    window.location.href = "https://www.passport2fluency.com";
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const isTutor = user?.userType === "tutor" || user?.userType === "admin";
  const isAdmin = user?.userType === "admin";
  const unreadMessages = unreadData?.count || 0;

  // Tutors get their own dedicated menu — not the student menu
  const isTutorOnly = user?.userType === "tutor";

  // Clean, minimal navigation — secondary items go in avatar dropdown
  const primaryLinks = isTutorOnly ? [
    { href: "/tutor-portal", label: language === 'es' ? 'Mi Panel' : 'My Dashboard' },
  ] : [
    { href: "/home", label: language === 'es' ? 'Inicio' : 'Home' },
    { href: "/tutors", label: language === 'es' ? 'Profesores' : 'Tutors' },
    { href: "/dashboard", label: language === 'es' ? 'Mis Clases' : 'My Classes' },
    ...(isAdmin ? [{ href: "/admin", label: 'Admin' }] : []),
  ];

  const navLinks = primaryLinks;

  const moreLinks = isTutorOnly ? [
    { href: "/tutor-portal/assistant", label: language === 'es' ? 'Asistente IA' : 'AI Assistant', icon: Sparkles, iconColor: "text-[#F59E1C]" },
    { href: "/settings", label: language === 'es' ? 'Configuración' : 'Settings', icon: Settings, iconColor: "" },
    { href: "/support", label: language === 'es' ? 'Soporte' : 'Support', icon: LifeBuoy, iconColor: "" },
  ] : [
    { href: "/ai-practice", label: 'Practice Partner', icon: Sparkles, iconColor: "text-[#F59E1C]" },
    { href: "/learning-path", label: language === 'es' ? 'Mi Camino' : 'My Path', icon: GraduationCap, iconColor: "text-[#1C7BB1]" },
    { href: "/packages", label: language === 'es' ? 'Planes' : 'Plans', icon: CreditCard, iconColor: "" },
    { href: "/settings", label: language === 'es' ? 'Configuración' : 'Settings', icon: Settings, iconColor: "" },
    { href: "/support", label: language === 'es' ? 'Soporte' : 'Support', icon: LifeBuoy, iconColor: "" },
  ];

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? "bg-white/80 backdrop-blur-lg border-gray-200/50 shadow-sm"
          : "bg-white border-gray-200 shadow-sm"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex justify-between items-center transition-all duration-300 ${scrolled ? "h-14" : "h-16"}`}>
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/">
              <div className="flex-shrink-0 flex items-center">
                <img
                  src="/attached_assets/a1c5a1_9514ede9e3124d7a9adf78f5dcf07f28~mv2_1752436886046.png"
                  alt="Passport2Fluency"
                  className={`w-auto cursor-pointer transition-all duration-300 ${scrolled ? "h-8" : "h-10"}`}
                />
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-4 lg:space-x-6">
            {primaryLinks.map((link) => {
              const coachmarkProps: Record<string, { id: string; title: string; titleEs: string; desc: string; descEs: string; delay: number }> = {
                "/tutors": {
                  id: "nav-tutors", title: "Find a Tutor", titleEs: "Buscar Tutor",
                  desc: "Browse tutors and book your free trial class here.",
                  descEs: "Aquí puedes ver tutores y reservar tu clase de prueba gratis.",
                  delay: 1200,
                },
                "/dashboard": {
                  id: "nav-dashboard", title: "My Dashboard", titleEs: "Mi Panel",
                  desc: "View your upcoming classes, progress, and stats.",
                  descEs: "Ve tus clases próximas, progreso y estadísticas.",
                  delay: 1800,
                },
                "/learning-path": {
                  id: "nav-path", title: "My Learning Path", titleEs: "Mi Camino",
                  desc: "Complete stations to progress through the levels.",
                  descEs: "Completa estaciones para avanzar por los niveles.",
                  delay: 2400,
                },
              };
              const cm = coachmarkProps[link.href];
              const node = (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-gray-600 hover:text-[#1C7BB1] transition-colors font-medium text-sm"
                >
                  {link.label}
                </Link>
              );
              if (!cm) return node;
              return (
                <Coachmark
                  key={link.href}
                  id={cm.id}
                  title={language === "es" ? cm.titleEs : cm.title}
                  description={language === "es" ? cm.descEs : cm.desc}
                  position="bottom"
                  delay={cm.delay}
                >
                  {node}
                </Coachmark>
              );
            })}
            {/* More dropdown */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 text-gray-600 hover:text-[#1C7BB1] transition-colors font-medium text-sm">
                    {language === 'es' ? 'Más' : 'More'}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-48">
                  {moreLinks.map((link) => (
                    <Link key={link.href} href={link.href}>
                      <DropdownMenuItem className="cursor-pointer flex items-center gap-2">
                        <link.icon className={`w-3.5 h-3.5 ${link.iconColor}`} />
                        {link.label}
                      </DropdownMenuItem>
                    </Link>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>

          {/* Desktop User Profile & Login */}
          <div className="flex items-center space-x-2">
            <LanguageSwitcher />
            <CurrencySwitcher />
            {user && (
              <Link href="/messages">
                <Button variant="ghost" size="sm" className="relative h-8 w-8 p-0" aria-label={unreadMessages > 0 ? `${unreadMessages} unread messages` : "Messages"}>
                  <MessageCircle className="h-4 w-4 text-gray-600" />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-[#1C7BB1] text-white text-[10px] flex items-center justify-center px-1">
                      {unreadMessages}
                    </span>
                  )}
                </Button>
              </Link>
            )}
            {user && <NotificationBell />}
            {user ? (
              <div className="hidden md:flex items-center space-x-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar || ""} alt={user.firstName} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(user.firstName, user.lastName)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium">{user.firstName} {user.lastName}</p>
                        <p className="w-[200px] truncate text-sm text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <Link href="/profile">
                      <DropdownMenuItem className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        {language === 'es' ? 'Mi Perfil' : 'My Profile'}
                      </DropdownMenuItem>
                    </Link>
                    {!isTutorOnly && (
                      <>
                        <Link href="/learning-path">
                          <DropdownMenuItem className="cursor-pointer">
                            <GraduationCap className="mr-2 h-4 w-4 text-[#1C7BB1]" />
                            {language === 'es' ? 'Mi Camino' : 'My Path'}
                          </DropdownMenuItem>
                        </Link>
                        <Link href="/ai-practice">
                          <DropdownMenuItem className="cursor-pointer">
                            <Sparkles className="mr-2 h-4 w-4 text-[#F59E1C]" />
                            Practice Partner
                          </DropdownMenuItem>
                        </Link>
                        <Link href="/packages">
                          <DropdownMenuItem className="cursor-pointer">
                            <CreditCard className="mr-2 h-4 w-4" />
                            {language === 'es' ? 'Planes' : 'Plans'}
                          </DropdownMenuItem>
                        </Link>
                      </>
                    )}
                    {isTutorOnly && (
                      <>
                        <Link href="/tutor-portal/assistant">
                          <DropdownMenuItem className="cursor-pointer">
                            <Sparkles className="mr-2 h-4 w-4 text-[#F59E1C]" />
                            {language === 'es' ? 'Asistente IA' : 'AI Assistant'}
                          </DropdownMenuItem>
                        </Link>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <Link href="/support">
                      <DropdownMenuItem className="cursor-pointer">
                        <LifeBuoy className="mr-2 h-4 w-4" />
                        {language === 'es' ? 'Soporte' : 'Support'}
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/guide">
                      <DropdownMenuItem className="cursor-pointer">
                        <HelpCircle className="mr-2 h-4 w-4" />
                        {language === 'es' ? 'Ayuda' : 'Help'}
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/settings">
                      <DropdownMenuItem className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        {language === 'es' ? 'Configuración' : 'Settings'}
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      {t.logout}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                  <p className="text-gray-500">Level {user.level}</p>
                </div>
              </div>
            ) : (
              <div className="hidden md:flex items-center space-x-4">
                <Link href="/login">
                  <Button variant="outline" className="border-[#1C7BB1] text-[#1C7BB1] hover:bg-[#1C7BB1] hover:text-white transition-all">
                    {t.login}
                  </Button>
                </Link>
                <Link href="/login">
                  <Button className="bg-[#F59E1C] hover:bg-[#F59E1C]/90 text-white shadow-md shadow-[#F59E1C]/20 transition-all">
                    {t.signup}
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <button className="md:hidden p-2">
                  <Menu className="w-6 h-6 text-gray-600" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[350px]">
                <div className="flex flex-col gap-6 mt-6">
                  {user && (
                    <div className="flex items-center gap-3 pb-4 border-b">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar || ""} alt={user.firstName} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(user.firstName, user.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.firstName} {user.lastName}</p>
                        <p className="text-sm text-muted-foreground">Level {user.level}</p>
                      </div>
                    </div>
                  )}

                  <nav className="flex flex-col gap-4">
                    {navLinks.map((link) => (
                      <SheetClose asChild key={link.href}>
                        <Link href={link.href} className="text-gray-700 hover:text-[#1C7BB1] font-medium text-lg flex items-center gap-2">
                          {link.href === "/ai-practice" && <Sparkles className="w-4 h-4 text-[#F59E1C]" />}
                          {link.href === "/tutor-portal" && <GraduationCap className="w-4 h-4 text-[#1C7BB1]" />}
                          {link.label}
                        </Link>
                      </SheetClose>
                    ))}
                    {user && (
                      <SheetClose asChild>
                        <Link href="/messages" className="text-gray-700 hover:text-[#1C7BB1] font-medium text-lg flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-[#1C7BB1]" />
                          {language === 'es' ? 'Mensajes' : 'Messages'}
                          {unreadMessages > 0 && (
                            <span className="text-xs bg-[#1C7BB1] text-white px-1.5 py-0.5 rounded-full">{unreadMessages}</span>
                          )}
                        </Link>
                      </SheetClose>
                    )}
                  </nav>

                  {user && (
                    <nav className="flex flex-col gap-3 pt-3 border-t">
                      {!isTutorOnly && (
                        <>
                          <SheetClose asChild>
                            <Link href="/learning-path" className="text-gray-700 hover:text-[#1C7BB1] font-medium text-base flex items-center gap-2">
                              <GraduationCap className="w-4 h-4 text-[#1C7BB1]" />
                              {language === 'es' ? 'Mi Camino' : 'My Path'}
                            </Link>
                          </SheetClose>
                          <SheetClose asChild>
                            <Link href="/ai-practice" className="text-gray-700 hover:text-[#1C7BB1] font-medium text-base flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-[#F59E1C]" />
                              Practice Partner
                            </Link>
                          </SheetClose>
                          <SheetClose asChild>
                            <Link href="/packages" className="text-gray-700 hover:text-[#1C7BB1] font-medium text-base flex items-center gap-2">
                              <CreditCard className="w-4 h-4" />
                              {language === 'es' ? 'Planes' : 'Plans'}
                            </Link>
                          </SheetClose>
                        </>
                      )}
                      {isTutorOnly && (
                        <SheetClose asChild>
                          <Link href="/tutor-portal/assistant" className="text-gray-700 hover:text-[#1C7BB1] font-medium text-base flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-[#F59E1C]" />
                            {language === 'es' ? 'Asistente IA' : 'AI Assistant'}
                          </Link>
                        </SheetClose>
                      )}
                      <SheetClose asChild>
                        <Link href="/profile" className="text-gray-700 hover:text-[#1C7BB1] font-medium text-base flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {language === 'es' ? 'Mi Perfil' : 'My Profile'}
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link href="/settings" className="text-gray-700 hover:text-[#1C7BB1] font-medium text-base flex items-center gap-2">
                          <Settings className="w-4 h-4" />
                          {language === 'es' ? 'Configuración' : 'Settings'}
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link href="/support" className="text-gray-700 hover:text-[#1C7BB1] font-medium text-base flex items-center gap-2">
                          <LifeBuoy className="w-4 h-4" />
                          {language === 'es' ? 'Soporte' : 'Support'}
                        </Link>
                      </SheetClose>
                    </nav>
                  )}

                  <div className="pt-4 border-t">
                    {user ? (
                      <Button variant="outline" className="w-full text-red-600 border-red-200" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        {t.logout}
                      </Button>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <SheetClose asChild>
                          <Link href="/login">
                            <Button variant="outline" className="w-full border-[#1C7BB1] text-[#1C7BB1]">
                              {t.login}
                            </Button>
                          </Link>
                        </SheetClose>
                        <SheetClose asChild>
                          <Link href="/login">
                            <Button className="w-full bg-[#F59E1C] hover:bg-[#F59E1C]/90 text-white">
                              {t.signup}
                            </Button>
                          </Link>
                        </SheetClose>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
