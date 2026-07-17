import React from "react";
import { Search } from "lucide-react";
import { Input } from "../components/ui";

/**
 * Search input used by list pages that filter on the server. Same
 * value/onChange contract as before — only the presentation changed.
 */
const Filtered = ({ searchTerm, setSearchTerm, placeholder = "Search..." }) => {
  return (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="pl-9"
      />
    </div>
  );
};

export default Filtered;
