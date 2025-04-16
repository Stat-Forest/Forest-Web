import { JSX } from "react";

export interface routeTypes {
  path: string;
  element: React.LazyExoticComponent<() => JSX.Element>;
  id: any;
  children: any;
}
