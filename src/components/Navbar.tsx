import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Bot, Activity, Menu, X, Sun, Moon, Users, Stethoscope, LogOut, Bell, Settings } from "lucide-react";
import PartnerIcon from "@/components/icons/PartnerIcon";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import HospitalMapIcon from "@/components/HospitalMapIcon";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, isDoctor, isAsha, isPartner, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isHome = location.pathname === "/";

  const navLinks = [
    { name: "Home", href: "/" },
    ...(isDoctor ? [{ name: "My Patients", href: "/doctor-patients", icon: Users }] : []),
    ...(isAsha ? [{ name: "Patient details", href: "/patient-details", icon: Users }] : []),
    ...(user?.role === "mother" ? [{ name: "My Profile", href: "/mother-dashboard", icon: Users }] : []),
    ...(isPartner ? [{ name: "Partner Dashboard", href: "/partner-dashboard", icon: PartnerIcon }] : []),
    { name: "AI Bots", href: "/ai-bots", icon: Bot },
    ...(user?.role === "mother" ? [{ name: "Live Vitals", href: "/live-vitals", icon: Activity }] : []),
    ...(isDoctor || isAsha ? [{ name: "Notifications", href: "/notification-history", icon: Bell }] : []),
    { name: "Features", href: isHome ? "#features" : "/#features" },
    { name: "Contact", href: isHome ? "#contact" : "/#contact" },
  ];

  const handleNavClick = (href: string) => {
    setMobileMenuOpen(false);
    const hash = href.startsWith("/#") ? href.slice(1) : href;
    if (hash.startsWith("#")) {
      if (location.pathname !== "/") {
        navigate("/");
        setTimeout(() => document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" }), 150);
      } else {
        document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/50"
    >
      <div className="w-full px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo - SafeMOM with oval logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2"
            >
              <div className="h-10 w-8 overflow-hidden rounded-[50%] bg-card flex-shrink-0 flex items-center justify-center p-0.5">
                <img
                  src="/safemom-logo.png"
                  alt="SafeMOM"
                  className="w-full h-full object-contain object-center"
                />
              </div>
              <span className="text-xl font-semibold text-foreground hidden sm:inline">
                Safe<span className="text-primary">MOM</span>
              </span>
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center justify-center flex-1 gap-6 px-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                onClick={(e) => {
                  if (link.href.startsWith("#") || link.href.startsWith("/#")) {
                    e.preventDefault();
                    handleNavClick(link.href);
                  }
                }}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors text-sm font-medium whitespace-nowrap"
              >
                {link.icon && <link.icon className="w-4 h-4" />}
                {link.name}
              </Link>
            ))}
          </div>

          {/* Right side: theme toggle + logged-in profile or Login/Sign Up */}
          <div className="hidden md:flex items-center gap-4">
            {user?.role === "mother" && (
              <Link
                to="/nearby-hospitals"
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors flex items-center justify-center"
                aria-label="Nearby Hospitals Finder"
                title="Nearby Hospitals Finder"
              >
                <HospitalMapIcon className="w-5 h-5" />
              </Link>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3 pl-3 border-l border-border">
                <Avatar className="h-9 w-9">
                  {user.avatar && <AvatarImage src={user.avatar} alt={user.name} className="object-cover" />}
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {isDoctor ? <Stethoscope className="w-4 h-4" /> : null}
                    {!isDoctor && user.name ? (
                      <span className="text-xs font-medium">{user.name.slice(0, 2).toUpperCase()}</span>
                    ) : null}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-medium text-foreground leading-tight">{user.name}</p>
                  <p className="text-xs text-muted-foreground leading-tight truncate max-w-[140px]">
                    {user.email}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => navigate("/account-settings")}
                  aria-label="Account settings"
                  title="Account settings"
                >
                  <Settings className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => {
                    logout();
                    navigate("/");
                  }}
                  aria-label="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => navigate("/role-select")}
                  className="rounded-full px-6 border-border hover:bg-secondary transition-all duration-300"
                >
                  Login
                </Button>
                <Button
                  onClick={() => navigate("/signup")}
                  className="rounded-full px-6 shadow-soft hover:shadow-card transition-all duration-300"
                >
                  Sign Up
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            {user?.role === "mother" && (
              <Link
                to="/nearby-hospitals"
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors flex items-center justify-center"
                aria-label="Nearby Hospitals Finder"
              >
                <HospitalMapIcon className="w-5 h-5" />
              </Link>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-full text-muted-foreground hover:text-foreground"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              className="text-foreground p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden mt-4 pb-4 border-t border-border/50 pt-4"
          >
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  onClick={() => {
                    if (link.href.startsWith("#") || link.href.startsWith("/#")) {
                      handleNavClick(link.href);
                    }
                  }}
                  className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-medium"
                >
                  {link.icon && <link.icon className="w-4 h-4" />}
                  {link.name}
                </Link>
              ))}
              <div className="flex gap-3 mt-2">
                {isAuthenticated && user ? (
                  <div className="flex items-center gap-2 w-full py-2 px-3 rounded-lg bg-muted/50">
                    <Avatar className="h-9 w-9">
                      {user.avatar && <AvatarImage src={user.avatar} alt={user.name} className="object-cover" />}
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        {isDoctor ? <Stethoscope className="w-4 h-4" /> : user.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full shrink-0"
                      onClick={() => {
                        navigate("/account-settings");
                        setMobileMenuOpen(false);
                      }}
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Settings
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full shrink-0"
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                        navigate("/");
                      }}
                    >
                      <LogOut className="w-4 h-4 mr-1" />
                      Log out
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigate("/role-select");
                        setMobileMenuOpen(false);
                      }}
                      className="flex-1 rounded-full"
                    >
                      Login
                    </Button>
                    <Button
                      onClick={() => {
                        navigate("/signup");
                        setMobileMenuOpen(false);
                      }}
                      className="flex-1 rounded-full"
                    >
                      Sign Up
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
};

export default Navbar;
