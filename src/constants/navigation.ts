export type NavItem = {
  label: string;
  href: string;
};

export const NAV_LINKS: NavItem[] = [
  { label: "Inicio", href: "/" },
  { label: "Nosotros", href: "/empresa" },
  { label: "Servicios", href: "/servicios" },
  { label: "Soporte", href: "/soporte" },
];
