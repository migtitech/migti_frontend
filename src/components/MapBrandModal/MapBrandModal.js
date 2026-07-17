import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Spinner,
} from "../ui";
import brandService from "../../services/brandService";
import StatusBadge from "../StatusBadge/StatusBadge";
import { cn } from "../../lib/utils";
import { toastError } from "../../utils/toast";

const MapBrandModal = ({ visible, onClose, onAdd, mappedBrandIds = [] }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [searching, setSearching] = useState(false);

  const handleClose = () => {
    setSearchTerm("");
    setBrands([]);
    setSelectedBrand(null);
    onClose();
  };

  useEffect(() => {
    const query = searchTerm.trim();
    if (!query) {
      setBrands([]);
      setSelectedBrand(null);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await brandService.getAll({
          pageNumber: 1,
          pageSize: 5,
          search: query,
          status: "active",
        });
        if (cancelled) return;
        const data = res?.data || res;
        const results = (data?.brands || [])
          .filter((brand) => !mappedBrandIds.includes(brand._id))
          .slice(0, 5);
        setBrands(results);
        setSelectedBrand(null);
      } catch (err) {
        if (!cancelled) toastError(err?.message || "Failed to search brands");
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const handleAdd = () => {
    if (!selectedBrand) return;
    onAdd(selectedBrand);
    handleClose();
  };

  return (
    <Dialog open={!!visible} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Map Brand</DialogTitle>
        </DialogHeader>
        <div className="px-6 py-4">
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search brand by name"
              className="pl-8"
            />
            {searching && (
              <Spinner
                size="sm"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
            )}
          </div>

          {searchTerm.trim() && !searching && brands.length === 0 && (
            <div className="mb-4 text-sm text-muted-foreground">
              No matching brands.
            </div>
          )}

          {brands.length > 0 && (
            <div className="mb-4 divide-y divide-border overflow-hidden rounded-lg border border-border">
              {brands.map((brand) => (
                <button
                  key={brand._id}
                  type="button"
                  onClick={() => setSelectedBrand(brand)}
                  className={cn(
                    "block w-full px-4 py-3 text-left transition-colors hover:bg-muted",
                    selectedBrand?._id === brand._id &&
                      "bg-accent text-accent-foreground",
                  )}
                >
                  <div className="font-semibold">{brand.name}</div>
                  {brand.description ? (
                    <div className="text-sm text-muted-foreground">
                      {brand.description.substring(0, 80)}
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          )}

          {selectedBrand && (
            <div className="rounded-lg border border-border bg-muted p-4">
              <div className="mb-2 font-semibold">Brand details</div>
              <div className="mb-2 text-sm">
                <span className="text-muted-foreground">Name: </span>
                {selectedBrand.name}
              </div>
              <div className="mb-2 text-sm">
                <span className="text-muted-foreground">Description: </span>
                {selectedBrand.description || "—"}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Status:</span>
                <StatusBadge status={selectedBrand.status} />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!selectedBrand}>
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MapBrandModal;
