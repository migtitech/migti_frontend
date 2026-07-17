import React from "react";
import SidebarPageShell from "./SidebarPageShell";

const createSidebarPlaceholderPage = (title, description) => {
  const Page = () => (
    <SidebarPageShell title={title} description={description} />
  );
  Page.displayName = `SidebarPage(${title})`;
  return Page;
};

export default createSidebarPlaceholderPage;
