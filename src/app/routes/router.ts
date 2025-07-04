import express from "express";
import { AdminRouter } from "../modules/admin/admin.router";
import { AnnouncementRouter } from "../modules/announcements/announcements.router";
import { ServiceRequestRoutes } from "../modules/service-requests/service-requests.router";
import { UserRouter } from "../modules/users/users.router";

const router = express.Router();

const routes = [
  {
    path: "/users",
    route: UserRouter,
  },
  {
    path: "/admin",
    route: AdminRouter,
  },
  {
    path: "/announcements",
    route: AnnouncementRouter,
  },
  {
    path: "/service-requests",
    route: ServiceRequestRoutes,
  },
];

routes.map(r => router.use(r.path, r.route));

export const Routers = router;
