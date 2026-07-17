import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui";

const Page401 = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-7xl font-bold tracking-tight text-primary!">401</h1>
        <h4 className="mt-4 text-xl font-semibold text-foreground">
          Unauthorized Access
        </h4>
        <p className="mt-2 text-sm text-muted-foreground">
          You don&apos;t have permission to access this page. Please contact
          your administrator if you believe this is an error.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button type="button" onClick={() => navigate("/dashboard")}>
            Go to Dashboard
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/login")}
          >
            Login with Different Account
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Page401;
