import express from "express";
import { UserRouter } from "../modules/users/users.router";

const router = express.Router();

const routes = [
  {
    path: "/users",
    route: UserRouter,
  },

  // {
  //   path: "/admin",
  //   route: AdminRouter,
  // },
];

routes.map(r => router.use(r.path, r.route));

export const Routers = router;
