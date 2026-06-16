export const APP_ROUTES = {
  landing: "/",
  auth: "/auth",
  quickStart: "/quick-start",
  home: "/home",
  myControllables: "/my-controllables",
  train: "/train",
  proof: "/proof",
  wellness: "/wellness",
  planner: "/planner",
  growth: "/growth",
  reflect: "/reflect",
  wealth: "/wealth",
  money: "/money",
  dashboard: "/dashboard",
  reset: "/reset",
  billing: "/billing",
  admin: "/admin",
  integrations: "/integrations",
} as const;

export const LIFE_OS_ROUTE_PATHS = [
  APP_ROUTES.home,
  APP_ROUTES.myControllables,
  APP_ROUTES.train,
  APP_ROUTES.proof,
  APP_ROUTES.wellness,
  APP_ROUTES.planner,
  APP_ROUTES.growth,
  APP_ROUTES.reflect,
  APP_ROUTES.wealth,
] as const;

export const PRIMARY_ENTRY_ROUTE_PATHS = [
  APP_ROUTES.home,
  APP_ROUTES.train,
  APP_ROUTES.proof,
] as const;
