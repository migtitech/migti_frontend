import React from "react";
import { RotateCw, Home, AlertTriangle } from "lucide-react";
import { Button } from "../ui";

const ErrorFallback = ({ error, onRetry, onGoHome }) => {
  const handleRetry = () => {
    if (typeof onRetry === "function") {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    if (typeof onGoHome === "function") {
      onGoHome();
    } else {
      window.location.hash = "#/";
      window.location.reload();
    }
  };

  return (
    <div
      className="flex min-h-screen flex-row items-center bg-muted"
      role="alert"
      aria-live="assertive"
    >
      <div className="mx-auto w-full max-w-screen-xl px-4">
        <div className="flex justify-center">
          <div className="w-full text-center md:w-1/2">
            <div>
              <div className="mb-4">
                <AlertTriangle className="mx-auto h-16 w-16 text-warning!" />
              </div>
              <h1 className="mb-2 text-3xl font-semibold">
                Something went wrong
              </h1>
              <p className="mb-4 text-muted-foreground">
                We're sorry, but something unexpected happened. Please try again
                or go back to the home page.
              </p>
              {process.env.NODE_ENV === "development" && error && (
                <pre
                  className="mb-4 rounded bg-muted p-3 text-left text-xs"
                  style={{ maxHeight: 200, overflow: "auto" }}
                >
                  {error?.message || String(error)}
                </pre>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" onClick={handleRetry}>
                <RotateCw />
                Reload page
              </Button>
              <Button type="button" variant="outline" onClick={handleGoHome}>
                <Home />
                Go to home
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback;
