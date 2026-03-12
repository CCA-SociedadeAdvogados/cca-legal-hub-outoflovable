import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/contexts/SidebarContext";
import { useSidebarBadges } from "@/hooks/useSidebarBadges";
import { useUserTheme } from "@/hooks/useUserTheme";
import { usePermissions } from "@/hooks/usePermissions";
import ccaLogo from "@/assets/cca-logo.png";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  FileCheck,
  AlertTriangle,
  Settings,
  LogOut,
  BookOpen,
  FolderOpen,
  Building2,
  Library,
  Crown,
  ChevronDown,
  ChevronRight,
  Upload,
  List,
  Newspaper,
  Receipt,
  Home,
  ChevronsLeft,
  Moon,
  Sun,
  Bell,
  Calculator,
  Briefcase,
  UserCog,
  BarChart3,
  Lock,
} from "lucide-react";

interface SidebarProps {
  clientName?: string;
}

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  isCollapsed: boolean;
  badge?: number;
  isSubmenu?: boolean;
}

function NavItem({
  to,
  icon: Icon,
  label,
  isActive,
  isCollapsed,
  badge,
  isSubmenu = false,
}: NavItemProps) {
  const content = (
    <Link
      to={to}
      className={cn(
        "relative flex min-w-0 items-center gap-3 rounded-lg transition-all duration-200",
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
        <Icon className={cn(isSubmenu ? "h-4 w-4" : "h-5 w-5")} />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-medium text-primary">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </div>

      {!isCollapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          <span>{label}</span>
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
  const { isCollapsed, toggle } = useSidebar();
  const { resolvedTheme, toggleTheme } = useUserTheme();
  const badges = useSidebarBadges();
  const { can, isAppAdmin, isCCAUser, isOrgManager, isOrgUser } = usePermissions();

  const [contractsExpanded, setContractsExpanded] = useState(
    location.pathname.startsWith("/contratos") || location.pathname === "/"
  );

  const [accountingExpanded, setAccountingExpanded] = useState(
    location.pathname.startsWith("/documentos")
  );

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const isContractsActive =
    location.pathname.startsWith("/contratos") || location.pathname === "/";

  const isAccountingActive = location.pathname.startsWith("/documentos");

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col bg-sidebar text-sidebar-foreground transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
      style={{ background: "var(--gradient-sidebar)" }}
    >
      <Link
        to="/home"
        className={cn(
          "flex h-16 items-center gap-3 border-b border-sidebar-border transition-colors duration-200 hover:bg-sidebar-accent/30",
          isCollapsed ? "justify-center px-2" : "px-6"
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
          <img src={ccaLogo} alt="CCA" className="h-7 w-7 object-contain" />
        </div>

        {!isCollapsed && (
          <span className="truncate font-sans text-lg font-semibold">
            Legal Hub
          </span>
        )}
      </Link>

      {clientName && !isCollapsed && (
        <div className="border-b border-sidebar-border px-6 py-3">
          <p className="text-xs text-sidebar-foreground/60">
            {t("common.reservedArea")}
          </p>
          <p className="truncate text-sm font-medium">{clientName}</p>
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-hide">
        <NavItem
          to="/home"
          icon={Home}
          label={t("nav.home")}
          isActive={location.pathname === "/home"}
          isCollapsed={isCollapsed}
        />

        <NavItem
          to="/notificacoes"
          icon={Bell}
          label={t("common.notifications")}
          isActive={location.pathname === "/notificacoes"}
          isCollapsed={isCollapsed}
          badge={badges.notifications}
        />

        <NavItem
          to="/financeiro"
          icon={Receipt}
          label={t("nav.financial")}
          isActive={location.pathname === "/financeiro"}
          isCollapsed={isCollapsed}
        />

        <NavItem
          to="/legalbi"
          icon={BarChart3}
          label={t("nav.legalbi")}
          isActive={location.pathname === "/legalbi"}
          isCollapsed={isCollapsed}
        />

        <div>
          {isCollapsed ? (
            <NavItem
              to="/contratos"
              icon={FileCheck}
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
                  "flex w-full min-w-0 items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isContractsActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative shrink-0">
                    <FileCheck className="h-5 w-5" />
                    {badges.contracts > 0 && (
                      <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-medium text-primary">
                        {badges.contracts > 9 ? "9+" : badges.contracts}
                      </span>
                    )}
                  </div>
                  <span className="truncate">{t("nav.contracts")}</span>
                </div>

                {contractsExpanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0" />
                )}
              </button>

              {contractsExpanded && (
                <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-3">
                  <NavItem
                    to="/contratos/visao-geral"
                    icon={LayoutDashboard}
                    label={t("nav.contractsOverview")}
                    isActive={
                      location.pathname === "/" ||
                      location.pathname === "/contratos/visao-geral"
                    }
                    isCollapsed={false}
                    isSubmenu
                  />
                  <NavItem
                    to="/contratos"
                    icon={List}
                    label={t("nav.contractsList")}
                    isActive={location.pathname === "/contratos"}
                    isCollapsed={false}
                    isSubmenu
                  />
                  {can("contracts:bulk_upload") && (
                    <NavItem
                      to="/contratos/upload-massa"
                      icon={Upload}
                      label={t("nav.contractsUpload")}
                      isActive={location.pathname === "/contratos/upload-massa"}
                      isCollapsed={false}
                      isSubmenu
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div>
          {isCollapsed ? (
            <NavItem
              to="/documentos"
              icon={Calculator}
              label={t("nav.accounting")}
              isActive={isAccountingActive}
              isCollapsed={isCollapsed}
            />
          ) : (
            <>
              <button
                onClick={() => setAccountingExpanded(!accountingExpanded)}
                className={cn(
                  "flex w-full min-w-0 items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isAccountingActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Calculator className="h-5 w-5 shrink-0" />
                  <span className="truncate">{t("nav.accounting")}</span>
                </div>

                {accountingExpanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0" />
                )}
              </button>

              {accountingExpanded && (
                <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-3">
                  <NavItem
                    to="/documentos"
                    icon={FolderOpen}
                    label={t("nav.accountingDocuments")}
                    isActive={
                      location.pathname === "/documentos" ||
                      location.pathname.startsWith("/documentos/")
                    }
                    isCollapsed={false}
                    isSubmenu
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="my-2 border-t border-sidebar-border" />

        <NavItem
          to="/eventos"
          icon={Building2}
          label={t("nav.events")}
          isActive={location.pathname === "/eventos"}
          isCollapsed={isCollapsed}
        />

        <NavItem
          to="/novidades-cca"
          icon={Newspaper}
          label={t("nav.ccaNews")}
          isActive={location.pathname === "/novidades-cca"}
          isCollapsed={isCollapsed}
          badge={badges.news}
        />

        <NavItem
          to="/politicas"
          icon={BookOpen}
          label={t("nav.policies")}
          isActive={location.pathname === "/politicas"}
          isCollapsed={isCollapsed}
        />

        <div
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 opacity-60 pointer-events-none",
            isCollapsed && "justify-center px-2"
          )}
        >
          <AlertTriangle className="h-5 w-5 shrink-0" />
          {!isCollapsed && (
            <>
              <span className="flex-1 truncate">{t("nav.impacts")}</span>
              <Lock className="h-4 w-4 shrink-0" />
            </>
          )}
        </div>

        <div
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 opacity-60 pointer-events-none",
            isCollapsed && "justify-center px-2"
          )}
        >
          <Library className="h-5 w-5 shrink-0" />
          {!isCollapsed && (
            <>
              <span className="flex-1 truncate">{t("nav.normativos")}</span>
              <Lock className="h-4 w-4 shrink-0" />
            </>
          )}
        </div>

        {(isCCAUser || isOrgManager) && (
          <NavItem
            to="/meu-departamento"
            icon={Briefcase}
            label="O Meu Departamento"
            isActive={location.pathname === "/meu-departamento"}
            isCollapsed={isCollapsed}
          />
        )}

        {(isCCAUser || isOrgManager || isOrgUser) && (
          <NavItem
            to="/minha-organizacao"
            icon={Building2}
            label="A Minha Organização"
            isActive={location.pathname === "/minha-organizacao"}
            isCollapsed={isCollapsed}
          />
        )}

        {can("users:view_own_org") && (
          <NavItem
            to="/utilizadores-org"
            icon={UserCog}
            label="Utilizadores"
            isActive={location.pathname === "/utilizadores-org"}
            isCollapsed={isCollapsed}
          />
        )}

        {(isAppAdmin || can("org:view_all")) && (
          <NavItem
            to="/organizacao"
            icon={Building2}
            label={t("nav.organization")}
            isActive={location.pathname === "/organizacao"}
            isCollapsed={isCollapsed}
          />
        )}
      </nav>

      <div className="space-y-1 border-t border-sidebar-border p-3">
        {isCollapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={toggleTheme}
                className="flex w-full items-center justify-center rounded-lg px-2 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-all duration-200 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {resolvedTheme === "dark"
                ? t("common.lightMode")
                : t("common.darkMode")}
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={toggleTheme}
            className="flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-all duration-200 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            {resolvedTheme === "dark" ? (
              <Sun className="h-5 w-5 shrink-0" />
            ) : (
              <Moon className="h-5 w-5 shrink-0" />
            )}
            <span className="truncate">
              {resolvedTheme === "dark"
                ? t("common.lightMode")
                : t("common.darkMode")}
            </span>
          </button>
        )}

        {isAppAdmin && (
          <NavItem
            to="/admin"
            icon={Crown}
            label={t("nav.admin")}
            isActive={location.pathname === "/admin"}
            isCollapsed={isCollapsed}
          />
        )}

        <NavItem
          to="/definicoes"
          icon={Settings}
          label={t("nav.settings")}
          isActive={location.pathname === "/definicoes"}
          isCollapsed={isCollapsed}
        />

        {isCollapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center justify-center rounded-lg px-2 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-all duration-200 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {t("common.logout")}
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={handleSignOut}
            className="flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-all duration-200 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="truncate">{t("common.logout")}</span>
          </button>
        )}

        {isCollapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={toggle}
                className="flex w-full items-center justify-center rounded-lg px-2 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-all duration-200 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              >
                <ChevronsLeft className="h-5 w-5 rotate-180 transition-transform" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {t("common.expand")}
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={toggle}
            className="flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-all duration-200 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <ChevronsLeft className="h-5 w-5 shrink-0 transition-transform" />
            <span className="truncate">{t("common.collapse")}</span>
          </button>
        )}
      </div>
    </aside>
  );
}
