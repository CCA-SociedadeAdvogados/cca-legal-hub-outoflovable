import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useSidebar } from "@/contexts/SidebarContext";
import { useSidebarBadges } from "@/hooks/useSidebarBadges";
import { useUserTheme } from "@/hooks/useUserTheme";
import { useLegalHubProfile } from "@/hooks/useLegalHubProfile";
import ccaLogo from "@/assets/cca-logo.png";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  ChevronsLeft,
  Moon,
  Sun,
} from "lucide-react";

interface SidebarProps {
  clientName?: string;
}

interface NavItemProps {
  to: string;
  icon: string;
  label: string;
  isActive: boolean;
  isCollapsed: boolean;
  badge?: number;
  isSubmenu?: boolean;
}

function NavItem({ to, icon, label, isActive, isCollapsed, badge, isSubmenu = false }: NavItemProps) {
  const content = (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 rounded-lg transition-all duration-200 relative",
        isSubmenu ? "px-3 py-2 text-sm" : "px-3 py-2.5 text-sm font-medium",
        isActive
          ? isSubmenu
            ? "bg-sidebar-accent/70 text-sidebar-accent-foreground"
            : "bg-sidebar-accent text-sidebar-accent-foreground"
          : isSubmenu
            ? "text-sidebar-foreground/70 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
        isCollapsed && "justify-center px-2"
      )}
    >
      <div className="relative shrink-0">
        <span className={cn("flex items-center justify-center leading-none", isSubmenu ? "text-sm" : "text-base")}>
          {icon}
        </span>
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-medium text-primary">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </div>
      {!isCollapsed && <span>{label}</span>}
    </Link>
  );

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          {label}
          {badge !== undefined && badge > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {badge > 9 ? "9+" : badge}
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

export function Sidebar({ clientName }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const { isPlatformAdmin } = usePlatformAdmin();
  const { isCollapsed, toggle } = useSidebar();
  const { resolvedTheme, toggleTheme } = useUserTheme();
  const badges = useSidebarBadges();
  const { legalHubProfile, isCCAUser, isOrgManager, isOrgUser } = useLegalHubProfile();

  const [contractsExpanded, setContractsExpanded] = useState(
    location.pathname.startsWith("/contratos") || location.pathname === "/"
  );

  const [accountingExpanded, setAccountingExpanded] = useState(
    location.pathname.startsWith("/documentos")
  );

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isContractsActive = location.pathname.startsWith("/contratos") ||
                            location.pathname === "/";

  const isAccountingActive = location.pathname.startsWith("/documentos");

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
      style={{ background: "var(--gradient-sidebar)" }}
    >
      {/* Logo */}
      <Link
        to="/home"
        className={cn(
          "flex h-16 items-center gap-3 border-b border-sidebar-border cursor-pointer hover:bg-sidebar-accent/30 transition-colors duration-200",
          isCollapsed ? "justify-center px-2" : "px-6"
        )}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shrink-0 overflow-hidden">
          <img
            src={ccaLogo}
            alt="CCA"
            className="h-7 w-7 object-contain"
          />
        </div>
        {!isCollapsed && (
          <span className="font-sans text-lg font-semibold truncate">Legal Hub</span>
        )}
      </Link>

      {/* Client Name */}
      {clientName && !isCollapsed && (
        <div className="border-b border-sidebar-border px-6 py-3">
          <p className="text-xs text-sidebar-foreground/60">{t("common.reservedArea")}</p>
          <p className="font-medium text-sm truncate">{clientName}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-hide px-3 py-4">
        {/* Home */}
        <NavItem
          to="/home"
          icon="🏠"
          label={t("nav.home")}
          isActive={location.pathname === "/home"}
          isCollapsed={isCollapsed}
        />

        {/* Notificações */}
        <NavItem
          to="/notificacoes"
          icon="🔔"
          label={t("common.notifications")}
          isActive={location.pathname === "/notificacoes"}
          isCollapsed={isCollapsed}
          badge={badges.notifications}
        />

        {/* Contratos with submenu */}
        <div>
          {isCollapsed ? (
            <NavItem
              to="/contratos"
              icon="📄"
              label={t("nav.contracts")}
              isActive={isContractsActive}
              isCollapsed={isCollapsed}
              badge={badges.contracts}
            />
          ) : (
            <>
              <button
                onClick={() => setContractsExpanded(!contractsExpanded)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 relative",
                  isContractsActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <span className="text-base leading-none">📄</span>
                    {badges.contracts > 0 && (
                      <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-medium text-primary">
                        {badges.contracts > 9 ? "9+" : badges.contracts}
                      </span>
                    )}
                  </div>
                  {t("nav.contracts")}
                </div>
                {contractsExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>

              {contractsExpanded && (
                <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-3">
                  <NavItem
                    to="/contratos/visao-geral"
                    icon="◼"
                    label={t("nav.contractsOverview")}
                    isActive={location.pathname === "/" || location.pathname === "/contratos/visao-geral"}
                    isCollapsed={false}
                    isSubmenu
                  />
                  <NavItem
                    to="/contratos"
                    icon="📋"
                    label={t("nav.contractsList")}
                    isActive={location.pathname === "/contratos"}
                    isCollapsed={false}
                    isSubmenu
                  />
                  <NavItem
                    to="/contratos/upload-massa"
                    icon="📤"
                    label={t("nav.contractsUpload")}
                    isActive={location.pathname === "/contratos/upload-massa"}
                    isCollapsed={false}
                    isSubmenu
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Contabilidade with submenu */}
        <div>
          {isCollapsed ? (
            <NavItem
              to="/documentos"
              icon="🧾"
              label={t("nav.accounting")}
              isActive={isAccountingActive}
              isCollapsed={isCollapsed}
            />
          ) : (
            <>
              <button
                onClick={() => setAccountingExpanded(!accountingExpanded)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 relative",
                  isAccountingActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-base leading-none">🧾</span>
                  {t("nav.accounting")}
                </div>
                {accountingExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>

              {accountingExpanded && (
                <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-3">
                  <NavItem
                    to="/documentos"
                    icon="📂"
                    label={t("nav.accountingDocuments")}
                    isActive={location.pathname === "/documentos" || location.pathname.startsWith("/documentos/")}
                    isCollapsed={false}
                    isSubmenu
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Legal Insights */}
        <NavItem
          to="/eventos"
          icon="⚖️"
          label={t("nav.events")}
          isActive={location.pathname === "/eventos"}
          isCollapsed={isCollapsed}
        />

        {/* Impactos */}
        <NavItem
          to="/impactos"
          icon="⚠️"
          label={t("nav.impacts")}
          isActive={location.pathname === "/impactos"}
          isCollapsed={isCollapsed}
        />

        {/* Legislação & Jurisprudência */}
        <NavItem
          to="/normativos"
          icon="📚"
          label={t("nav.normativos")}
          isActive={location.pathname.startsWith("/normativos")}
          isCollapsed={isCollapsed}
        />

        {/* Novidades CCA */}
        <NavItem
          to="/novidades-cca"
          icon="📰"
          label={t("nav.ccaNews")}
          isActive={location.pathname === "/novidades-cca"}
          isCollapsed={isCollapsed}
          badge={badges.news}
        />

        {/* Políticas */}
        <NavItem
          to="/politicas"
          icon="📖"
          label={t("nav.policies")}
          isActive={location.pathname === "/politicas"}
          isCollapsed={isCollapsed}
        />

        {/* Financeiro */}
        <NavItem
          to="/financeiro"
          icon="💶"
          label={t("nav.financial")}
          isActive={location.pathname === "/financeiro"}
          isCollapsed={isCollapsed}
        />

        {/* LegalBi */}
        <NavItem
          to="/legalbi"
          icon="📊"
          label="LegalBi"
          isActive={location.pathname === "/legalbi"}
          isCollapsed={isCollapsed}
        />

        {/* O Meu Departamento — CCA users and Org Managers */}
        {(isCCAUser || isOrgManager) && (
          <NavItem
            to="/meu-departamento"
            icon="💼"
            label="O Meu Departamento"
            isActive={location.pathname === "/meu-departamento"}
            isCollapsed={isCollapsed}
          />
        )}

        {/* A Minha Organização — local users */}
        {(isOrgManager || isOrgUser) && (
          <NavItem
            to="/minha-organizacao"
            icon="🏢"
            label="A Minha Organização"
            isActive={location.pathname === "/minha-organizacao"}
            isCollapsed={isCollapsed}
          />
        )}

        {/* Utilizadores (org-scoped) — org_manager only */}
        {isOrgManager && (
          <NavItem
            to="/utilizadores-org"
            icon="👥"
            label="Utilizadores"
            isActive={location.pathname === "/utilizadores-org"}
            isCollapsed={isCollapsed}
          />
        )}

        {/* Organização — only for Admin */}
        {isPlatformAdmin && (
          <NavItem
            to="/organizacao"
            icon="🏢"
            label={t("nav.organization")}
            isActive={location.pathname === "/organizacao"}
            isCollapsed={isCollapsed}
          />
        )}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-sidebar-border p-3 space-y-1">
        {/* Theme Toggle */}
        {isCollapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={toggleTheme}
                className="flex w-full items-center justify-center rounded-lg px-2 py-2.5 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-200"
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {resolvedTheme === "dark" ? t("common.lightMode") : t("common.darkMode")}
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-200"
          >
            {resolvedTheme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
            {resolvedTheme === "dark" ? t("common.lightMode") : t("common.darkMode")}
          </button>
        )}

        {isPlatformAdmin && (
          <NavItem
            to="/admin"
            icon="👑"
            label={t("nav.admin")}
            isActive={location.pathname === "/admin"}
            isCollapsed={isCollapsed}
          />
        )}

        <NavItem
          to="/definicoes"
          icon="⚙️"
          label={t("nav.settings")}
          isActive={location.pathname === "/definicoes"}
          isCollapsed={isCollapsed}
        />

        {/* Logout */}
        {isCollapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center justify-center rounded-lg px-2 py-2.5 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-200"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{t("common.logout")}</TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-200"
          >
            <LogOut className="h-5 w-5" />
            {t("common.logout")}
          </button>
        )}

        {/* Collapse Toggle */}
        {isCollapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={toggle}
                className="flex w-full items-center justify-center rounded-lg px-2 py-2.5 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-200"
              >
                <ChevronsLeft className="h-5 w-5 rotate-180 transition-transform" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{t("common.expand")}</TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={toggle}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-200"
          >
            <ChevronsLeft className="h-5 w-5 transition-transform" />
            {t("common.collapse")}
          </button>
        )}
      </div>
    </aside>
  );
}
