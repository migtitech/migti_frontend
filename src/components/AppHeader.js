import React, { useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Menu } from "lucide-react";

import { AppBreadcrumb } from "./index";
import { AppHeaderDropdown, AppHeaderNotifications } from "./header/index";

const AppHeader = () => {
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
    <header className="header sticky-top mb-4 p-0" ref={headerRef}>
      <div className="container-fluid border-bottom px-4 d-flex align-items-center gap-2">
        <button
          type="button"
          className="btn btn-sm bg-transparent border-0 p-1"
          style={{ marginInlineStart: "-6px" }}
          onClick={() => dispatch({ type: "set", sidebarShow: !sidebarShow })}
          aria-label="Toggle sidebar"
        >
          <Menu size={22} />
        </button>
        <div className="d-none d-sm-block min-w-0">
          <AppBreadcrumb />
        </div>
        <ul className="nav ms-auto items-center">
          <AppHeaderNotifications />
          <li className="nav-item py-1">
            <div className="vr h-full mx-2 text-body text-opacity-75"></div>
          </li>
          <AppHeaderDropdown />
        </ul>
      </div>
    </header>
  );
};

export default AppHeader;
