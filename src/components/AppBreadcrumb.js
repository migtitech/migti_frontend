import React from "react";
import { useLocation, NavLink } from "react-router-dom";
import classNames from "classnames";

import routes from "../routes";

const AppBreadcrumb = () => {
  const currentLocation = useLocation().pathname;

  const getRouteName = (pathname, routes) => {
    const currentRoute = routes.find((route) => route.path === pathname);
    return currentRoute ? currentRoute.name : false;
  };

  const getBreadcrumbs = (location) => {
    const breadcrumbs = [];
    location.split("/").reduce((prev, curr, index, array) => {
      const currentPathname = `${prev}/${curr}`;
      const routeName = getRouteName(currentPathname, routes);
      routeName &&
        breadcrumbs.push({
          pathname: currentPathname,
          name: routeName,
          active: index + 1 === array.length ? true : false,
        });
      return currentPathname;
    });
    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs(currentLocation);

  return (
    <nav aria-label="breadcrumb">
      <ol className="breadcrumb my-0">
        <li className="breadcrumb-item">
          <NavLink to="/">Home</NavLink>
        </li>
        {breadcrumbs.map((breadcrumb, index) => {
          return (
            <li
              className={classNames("breadcrumb-item", {
                active: breadcrumb.active,
              })}
              {...(breadcrumb.active ? { "aria-current": "page" } : {})}
              key={index}
            >
              {breadcrumb.active ? (
                breadcrumb.name
              ) : (
                <NavLink to={breadcrumb.pathname}>{breadcrumb.name}</NavLink>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default React.memo(AppBreadcrumb);
