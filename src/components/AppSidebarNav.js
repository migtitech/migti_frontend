import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import classNames from "classnames";
import { ChevronDown } from "lucide-react";

import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";

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

const NavBadge = ({ badge }) => {
  if (!badge) return null;
  return (
    <span
      className="badge ms-auto"
      {...(badge.style ? { style: badge.style } : {})}
    >
      {badge.text}
    </span>
  );
};

const NavLinkContent = ({ icon, name, badge, indent }) => (
  <>
    {icon
      ? icon
      : indent && (
          <span className="nav-icon">
            <span className="nav-icon-bullet"></span>
          </span>
        )}
    {name && <span className="app-sidebar__label">{name}</span>}
    <NavBadge badge={badge} />
  </>
);

const NavItem = ({ item, indent = false, onNavigate }) => {
  const { pathname } = useLocation();
  const { name, badge, icon, to, href } = stripNavMeta(item);
  const active = to ? isNavPathActive(to, pathname) : false;

  if (to) {
    return (
      <li className="nav-item">
        <NavLink
          to={to}
          className={classNames("nav-link", { active })}
          title={typeof name === "string" ? name : undefined}
          onClick={() => onNavigate?.()}
        >
          <NavLinkContent
            icon={icon}
            name={name}
            badge={badge}
            indent={indent}
          />
        </NavLink>
      </li>
    );
  }

  if (href) {
    return (
      <li className="nav-item">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="nav-link"
          title={typeof name === "string" ? name : undefined}
          onClick={() => onNavigate?.()}
        >
          <NavLinkContent
            icon={icon}
            name={name}
            badge={badge}
            indent={indent}
          />
        </a>
      </li>
    );
  }

  return (
    <li className="nav-item">
      <span className="nav-link">
        <NavLinkContent icon={icon} name={name} badge={badge} indent={indent} />
      </span>
    </li>
  );
};

const NavGroup = ({ item, onNavigate, forceOpen = false }) => {
  const { pathname } = useLocation();
  const { name, icon, items: childItems } = stripNavMeta(item);
  const hasActiveChild = groupContainsActivePath(item, pathname);
  const [open, setOpen] = useState(hasActiveChild);

  // Auto-expand when navigation (route change, deep link, browser back/
  // forward) lands on a route inside this group — without this, groups
  // only ever reflect their state at first mount.
  useEffect(() => {
    if (hasActiveChild) setOpen(true);
  }, [hasActiveChild]);

  const isOpen = forceOpen || open;

  return (
    <li
      className={classNames("nav-group", {
        show: isOpen,
        "nav-group-has-active": hasActiveChild,
      })}
    >
      <button
        type="button"
        className="nav-group-toggle"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={isOpen}
        title={typeof name === "string" ? name : undefined}
      >
        <NavLinkContent icon={icon} name={name} />
        <ChevronDown className="nav-group-caret" size={16} />
      </button>
      {isOpen && (
        <ul className="nav-group-items">
          {childItems?.map((child, childIndex) =>
            child.items ? (
              <NavGroup
                key={childIndex}
                item={child}
                onNavigate={onNavigate}
                forceOpen={forceOpen}
              />
            ) : (
              <NavItem
                key={childIndex}
                item={child}
                indent
                onNavigate={onNavigate}
              />
            ),
          )}
        </ul>
      )}
    </li>
  );
};

export const AppSidebarNav = ({ items, onNavigate, forceOpenAll = false }) => {
  return (
    <SimpleBar className="app-sidebar__nav sidebar-nav-enhanced">
      <ul className="nav flex-column">
        {items?.map((item, index) =>
          item.items ? (
            <NavGroup
              key={index}
              item={item}
              onNavigate={onNavigate}
              forceOpen={forceOpenAll}
            />
          ) : (
            <NavItem key={index} item={item} onNavigate={onNavigate} />
          ),
        )}
      </ul>
    </SimpleBar>
  );
};

AppSidebarNav.propTypes = {
  items: PropTypes.arrayOf(PropTypes.any).isRequired,
  onNavigate: PropTypes.func,
  forceOpenAll: PropTypes.bool,
};
