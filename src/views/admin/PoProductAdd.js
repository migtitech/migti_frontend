import React, { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Spinner,
} from "../../components/ui";
import { poProductsBucketService } from "../../services/deliveryApprovalService";
import { toastError } from "../../utils/toast";

const parseListResponse = (res) => {
  const block = res?.data;
  if (!block || typeof block !== "object") return [];
  return Array.isArray(block.data) ? block.data : [];
};

const PoProductAdd = () => {
  const navigate = useNavigate();
  const wrapperRef = useRef(null);

  const [poCode, setPoCode] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [searched, setSearched] = useState(false);
  const [searchedCode, setSearchedCode] = useState("");

  /* ── close dropdown on outside click ── */
  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  /* ── fetch suggestions as user types ── */
  useEffect(() => {
    const term = poCode.trim();
    if (!term) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const t = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const res = await poProductsBucketService.poCodeSuggestions(term);
        const list = res?.data ?? [];
        setSuggestions(Array.isArray(list) ? list : []);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [poCode]);

  const handleSelectSuggestion = (code) => {
    setPoCode(code);
    setShowSuggestions(false);
    doSearch(code);
  };

  const doSearch = useCallback(
    async (code) => {
      const term = (code ?? poCode).trim();
      if (!term) return;
      setLoading(true);
      setSearched(false);
      setSearchedCode(term);
      try {
        const res = await poProductsBucketService.list({
          search: term,
          deliverySubStatus: "all",
          pageSize: 100,
        });
        setProducts(parseListResponse(res));
        setSearched(true);
      } catch (e) {
        toastError(e?.message || "Failed to fetch products");
      } finally {
        setLoading(false);
      }
    },
    [poCode],
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      setShowSuggestions(false);
      doSearch();
    }
    if (e.key === "Escape") setShowSuggestions(false);
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate("/po-products")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h5 className="mb-0 text-lg font-semibold">Add Sales Order Product</h5>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Search by Sales Order Code</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full md:w-2/5">
              <Label>Sales Order Code</Label>
              <div className="relative mt-1" ref={wrapperRef}>
                <Input
                  placeholder="Type Sales Order code…"
                  value={poCode}
                  onChange={(e) => setPoCode(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() =>
                    suggestions.length > 0 && setShowSuggestions(true)
                  }
                  autoFocus
                  autoComplete="off"
                />

                {/* Spinner inside input */}
                {suggestLoading && (
                  <Spinner
                    size="sm"
                    className="absolute opacity-50"
                    style={{ right: 10, top: 10 }}
                  />
                )}

                {/* Suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <ul
                    className="absolute mb-0 w-full list-none rounded-md border border-border bg-background p-0 shadow-sm"
                    style={{ zIndex: 1050, top: "calc(100% + 2px)" }}
                  >
                    {suggestions.map((s) => (
                      <li
                        key={s}
                        onMouseDown={() => handleSelectSuggestion(s)}
                        className="cursor-pointer px-3 py-2 font-mono text-sm hover:bg-muted"
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div>
              <Button
                type="button"
                onClick={() => {
                  setShowSuggestions(false);
                  doSearch();
                }}
                disabled={loading || !poCode.trim()}
              >
                {loading ? (
                  <Spinner size="sm" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {searched && (
        <>
          {products.length === 0 ? (
            <div className="py-5 text-center text-muted-foreground">
              No products found for <strong>{searchedCode}</strong>.
            </div>
          ) : (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                {products.length} product{products.length !== 1 ? "s" : ""}{" "}
                found for <strong>{searchedCode}</strong> — click one to add it.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {products.map((p) => (
                  <div
                    key={p._id}
                    onClick={() =>
                      navigate("/po-products/create", {
                        state: { product: p },
                      })
                    }
                    className="flex h-full cursor-pointer flex-col gap-1 rounded-md border border-border p-3 transition-shadow hover:ring-2 hover:ring-primary"
                  >
                    <div
                      className="truncate font-semibold"
                      title={p.productName}
                    >
                      {p.productName || "—"}
                    </div>
                    {p.rawProductCode && (
                      <div className="truncate font-mono text-sm text-muted-foreground">
                        {p.rawProductCode}
                      </div>
                    )}
                    <div className="mt-auto flex justify-between pt-2 text-sm text-muted-foreground">
                      <span>
                        Qty: <strong>{p.quantity ?? "—"}</strong>
                        {p.unit ? ` ${p.unit}` : ""}
                      </span>
                      <span
                        className="inline-flex items-center rounded-full bg-foreground px-2 py-0.5 font-mono text-background"
                        style={{ fontSize: "0.65rem" }}
                      >
                        {p.poCode || "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default PoProductAdd;
