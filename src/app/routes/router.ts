import express from "express";
import { AdminRouter } from "../modules/admin/admin.router";
import { AnnouncementRouter } from "../modules/announcements/announcements.router";
import { LeasesRoutes } from "../modules/leases/leases.router";
import { ServiceRequestRouter } from "../modules/service-requests/service-requests.router";
import { stripeRoutes } from "../modules/stripe/stripe.router";
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
    path: "/leases",
    route: LeasesRoutes,
  },
  {
    path: "/service-requests",
    route: ServiceRequestRouter,
  },
  {
    path: "/stripe",
    route: stripeRoutes,
  },
];

routes.map(r => router.use(r.path, r.route));

export default router;
