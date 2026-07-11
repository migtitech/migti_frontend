import React, { useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import classNames from "classnames";

import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";

import { CBadge, CNavLink, CSidebarNav } from "@coreui/react";

const NAV_META_KEYS = new Set([
  "roles",
  "module",
  "rolePrefix",
  "excludeRolePrefix",
]);

const stripNavMeta = (item = {}) => {
  const next = { ...item };
  for (const key of NAV_META_KEYS) {
    delete next[key];
  }
  return next;
};

const normalizePath = (path) => {
  const value = String(path || "").replace(/\/+$/, "");
  return value || "/";
};

export const isNavPathActive = (navTo, pathname) => {
  const target = normalizePath(navTo);
  const current = normalizePath(pathname);
  if (!target || target === "#") return false;
  if (target === current) return true;
  return current.startsWith(`${target}/`);
};

const groupContainsActivePath = (item, pathname) => {
  if (item.to && isNavPathActive(item.to, pathname)) return true;
  if (!item.items?.length) return false;
  return item.items.some((child) => groupContainsActivePath(child, pathname));
};

export const AppSidebarNav = ({ items }) => {
  const { pathname } = useLocation();

  const navLink = (name, icon, badge, indent = false) => (
    <>
      {icon
        ? icon
        : indent && (
            <span className="nav-icon">
              <span className="nav-icon-bullet"></span>
            </span>
          )}
      {name && name}
      {badge && (
        <CBadge
          {...(badge.style
            ? { style: badge.style }
            : { color: badge.color })}
          className="ms-auto"
          size="sm"
        >
          {badge.text}
        </CBadge>
      )}
    </>
  );

  const navItem = (item, index, indent = false) => {
    const { component, name, badge, icon, ...rest } = stripNavMeta(item);
    const Component = component;
    const active = rest.to ? isNavPathActive(rest.to, pathname) : false;

    return (
      <Component as="div" key={index}>
        {rest.to || rest.href ? (
          <CNavLink
            {...(rest.to && { as: NavLink })}
            {...(rest.href && { target: "_blank", rel: "noopener noreferrer" })}
            {...rest}
            active={active}
            className="nav-link"
          >
            {navLink(name, icon, badge, indent)}
          </CNavLink>
        ) : (
          navLink(name, icon, badge, indent)
        )}
      </Component>
    );
  };

  const navGroup = (item, index, groupKey) => {
    const { component, name, icon, items: childItems, ...rest } =
      stripNavMeta(item);
    const Component = component;
    const hasActiveChild = groupContainsActivePath(item, pathname);

    return (
      <Component
        compact
        as="div"
        key={groupKey}
        className={classNames({
          "nav-group-has-active": hasActiveChild,
        })}
        toggler={navLink(name, icon)}
        visible={hasActiveChild ? true : undefined}
        {...rest}
      >
        {childItems?.map((child, childIndex) => {
          const childKey = `${groupKey}.${childIndex}`;
          return child.items
            ? navGroup(child, childIndex, childKey)
            : navItem(child, childIndex, true);
        })}
      </Component>
    );
  };

  return (
    <CSidebarNav as={SimpleBar} className="sidebar-nav-enhanced" compact>
      {items?.map((item, index) =>
        item.items
          ? navGroup(item, index, `${index}`)
          : navItem(item, index),
      )}
    </CSidebarNav>
  );
};

AppSidebarNav.propTypes = {
  items: PropTypes.arrayOf(PropTypes.any).isRequired,
};
