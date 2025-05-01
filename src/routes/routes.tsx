import { nanoid } from "@reduxjs/toolkit";
import { lazy } from "react";
import { routeTypes } from "./routesTypes";

// Main

const Main = lazy(() => import("@/views/Dashboard/Main"));
const MainDetail = lazy(
  () => import("@/views/Dashboard/Main/Children/SendReport")
);
const ReturnedReport = lazy(
  () => import("@/views/Dashboard/Main/Children/ReturnedReport")
);
const ReceivedReport = lazy(
  () => import("@/views/Dashboard/Main/Children/ReceivedReport")
);
const ResponsibleRepresentatives = lazy(
  () => import("@/views/Dashboard/Main/Children/ResponsibleRepresentatives")
);
const Draft = lazy(() => import("@/views/Dashboard/Main/Children/Draft"));
const Newsletters = lazy(
  () => import("@/views/Dashboard/Main/Children/Newsletters")
);

// resource management

const ResourceManagement = lazy(
  () => import("@/views/Dashboard/ResourceManagement")
);

export const routes: routeTypes[] = [
  {
    path: "main",
    element: Main,
    id: nanoid(5),
    children: [
      {
        path: "send-report",
        element: MainDetail,
        id: nanoid(5),
      },
      {
        path: "returned-report",
        element: ReturnedReport,
        id: nanoid(5),
      },
      {
        path: "received-report",
        element: ReceivedReport,
        id: nanoid(5),
      },
      {
        path: "responsible-representative",
        element: ResponsibleRepresentatives,
        id: nanoid(5),
      },
      {
        path: "draft",
        element: Draft,
        id: nanoid(5),
      },
      {
        path: "newsletter",
        element: Newsletters,
        id: nanoid(5),
      },
    ],
  },
  {
    path: "resource-management/:id",
    element: ResourceManagement,
    id: nanoid(5),
    children: [],
  },
];
