import React from "react";

const AppFooter = () => {
  return (
    <footer className="footer px-4 d-flex align-items-center border-top">
      <div>
        <span className="fw-semibold">ERP</span>
        <span className="ms-1">
          &copy; {new Date().getFullYear()} Migti Industrial Private Limited
        </span>
      </div>
    </footer>
  );
};

export default React.memo(AppFooter);
