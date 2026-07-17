import React from "react";
import { Search } from "lucide-react";
import { Button, Input } from "../../../components/ui";

const Page404 = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-7xl font-bold tracking-tight text-primary!">404</h1>
        <h4 className="mt-4 text-xl font-semibold text-foreground">
          Oops! You&apos;re lost.
        </h4>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you are looking for was not found.
        </p>
        <div className="mt-6 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="What are you looking for?"
              className="pl-8"
            />
          </div>
          <Button type="button">Search</Button>
        </div>
      </div>
    </div>
  );
};

export default Page404;
