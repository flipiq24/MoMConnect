import { Link, useLocation } from "wouter";
import {
  LayoutList,
  Search,
  Users,
  Send,
  BarChart3,
  TableProperties,
  Plus,
  Home,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AppSidebarProps {
  userName: string;
  userEmail: string;
  onAddProperty: () => void;
}

interface NavItem {
  title: string;
  icon: typeof Home;
  href?: string;
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Today's Plan",
    items: [{ title: "My Deals", icon: LayoutList, href: "/my-deals" }],
  },
  {
    label: "Find Deals",
    items: [
      { title: "MLS Search", icon: Search },
      { title: "Agent Search", icon: Users },
    ],
  },
  {
    label: "Tools",
    items: [
      { title: "DispoPro", icon: Send },
      { title: "My Stats", icon: BarChart3 },
      { title: "Revenue Pipeline", icon: TableProperties, href: "/pipeline" },
    ],
  },
];

export function AppSidebar({ userName, userEmail, onAddProperty }: AppSidebarProps) {
  const [location] = useLocation();

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === "/my-deals") {
      return location === "/" || location.startsWith("/my-deals");
    }
    return location.startsWith(href);
  };

  const initials = userName
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1">
          <div className="p-1.5 bg-primary/10 rounded-md">
            <Home className="w-5 h-5 text-primary" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-foreground">MoM Wholesale</p>
            <p className="text-xs text-muted-foreground">Together, We Flip Smarter</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {item.href ? (
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.href)}
                        data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton
                        className="cursor-not-allowed opacity-70"
                        data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          ))}
        </SidebarContent>

      <SidebarFooter>
        <Button
          className="w-full justify-start gap-2"
          onClick={onAddProperty}
          data-testid="button-add-property"
        >
          <Plus className="w-4 h-4" />
          Add a Property
        </Button>
        <div className="flex items-center gap-2 px-1 py-1">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials || "U"}</AvatarFallback>
          </Avatar>
          <div className="leading-tight min-w-0">
            <p className="text-sm font-medium text-foreground truncate" data-testid="text-sidebar-user-name">
              {userName}
            </p>
            <p className="text-xs text-muted-foreground truncate" data-testid="text-sidebar-user-email">
              {userEmail}
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
