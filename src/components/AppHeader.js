import React, { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  CContainer,
  CHeader,
  CHeaderNav,
  CHeaderToggler,
  CNavLink,
  CNavItem,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilMenu } from "@coreui/icons";

import { AppBreadcrumb } from "./index";
import { AppHeaderDropdown, AppHeaderNotifications } from "./header/index";
import { useAuth } from "../context/AuthContext";

const AppHeader = () => {
  const { user } = useAuth();
  const isPurchaseManager =
    String(user?.role || "").toLowerCase() === "purchase_manager";
  const headerRef = useRef();

  const dispatch = useDispatch();
  const sidebarShow = useSelector((state) => state.sidebarShow);

  useEffect(() => {
    const handleScroll = () => {
      headerRef.current &&
        headerRef.current.classList.toggle(
          "shadow-sm",
          document.documentElement.scrollTop > 0,
        );
    };

    document.addEventListener("scroll", handleScroll);
    return () => document.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <CHeader position="sticky" className="mb-4 p-0" ref={headerRef}>
      <CContainer
        className={`border-bottom px-4${isPurchaseManager ? " py-2" : ""}`}
        fluid
      >
        <CHeaderToggler
          onClick={() => dispatch({ type: "set", sidebarShow: !sidebarShow })}
          style={{ marginInlineStart: "-14px" }}
        >
          <CIcon icon={cilMenu} size="lg" />
        </CHeaderToggler>
        {!isPurchaseManager && (
          <CHeaderNav className="d-none d-md-flex">
            <CNavItem>
              <CNavLink to="/dashboard" as={NavLink}>
                Dashboard
              </CNavLink>
            </CNavItem>
          </CHeaderNav>
        )}
        <CHeaderNav className="ms-auto">
          <AppHeaderNotifications />
          <li className="nav-item py-1">
            <div className="vr h-100 mx-2 text-body text-opacity-75"></div>
          </li>
          <AppHeaderDropdown />
        </CHeaderNav>
      </CContainer>
      <CContainer className="px-4" fluid>
        <AppBreadcrumb />
      </CContainer>
    </CHeader>
  );
};

export default AppHeader;
