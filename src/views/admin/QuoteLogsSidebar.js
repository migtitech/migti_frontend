import React, { useEffect, useMemo, useState } from "react";
import rateLogService from "../../services/rateLogService";
import { dateFormatter } from "../../utils/dateFormatter";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
  Spinner,
} from "../../components/ui";

const sidebarWidth = 380;

const formatMoney = (value) => {
  const amount = Number(value);
  if (Number.isNaN(amount)) return "0.00";
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const QuoteLogsSidebar = ({
  refreshKey = 0,
  isOpen = false,
  onToggle = () => {},
  showFloatingToggle = true,
}) => {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [industryOptions, setIndustryOptions] = useState([]);
  const [industrySearchText, setIndustrySearchText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [industryName, setIndustryName] = useState("");

  const fetchLogs = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await rateLogService.getAll({
        pageNumber: 1,
        pageSize: 100,
        search: searchText,
        industryName,
      });
      const data = res?.data ?? res;
      const result = data?.data ?? data;
      setLogs(result?.items || []);
      setIndustryOptions(result?.filters?.industries || []);
    } catch (_err) {
      if (!silent) {
        setLogs([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, industryName]);

  useEffect(() => {
    fetchLogs({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchLogs({ silent: true });
    }, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, industryName]);

  const logCount = useMemo(() => logs.length, [logs]);
  const visibleIndustryOptions = useMemo(() => {
    const normalizedSearch = industrySearchText.trim().toLowerCase();
    const filtered = !normalizedSearch
      ? industryOptions
      : industryOptions.filter((name) =>
          name.toLowerCase().includes(normalizedSearch),
        );
    return filtered.slice(0, 20);
  }, [industryOptions, industrySearchText]);

  return (
    <>
      {showFloatingToggle && (
        <div
          className="fixed bottom-4 z-[3000] transition-[right] duration-200"
          style={{ right: isOpen ? sidebarWidth + 12 : 12 }}
        >
          <Button type="button" onClick={onToggle}>
            {isOpen ? "Hide Quote Logs" : "Show Quote Logs"}
          </Button>
        </div>
      )}

      <Sheet open={isOpen} onOpenChange={(open) => !open && onToggle()}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-[380px]">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <SheetTitle>Quote Logs</SheetTitle>
              <Badge variant="info">{logCount}</Badge>
            </div>
          </SheetHeader>

          <SheetBody>
            <div className="mb-3 space-y-1.5">
              <Label className="text-xs">Search</Label>
              <Input
                placeholder="Product, variants, description"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>

            <div className="mb-4 space-y-1.5">
              <Label className="text-xs">Search client</Label>
              <Input
                placeholder="Type to search industries"
                value={industrySearchText}
                onChange={(e) => setIndustrySearchText(e.target.value)}
              />
              <Label className="text-xs">Client</Label>
              <Select
                value={industryName}
                onChange={(e) => setIndustryName(e.target.value)}
              >
                <option value="">All clients</option>
                {visibleIndustryOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
              <div className="mt-1 text-sm text-muted-foreground">
                Showing {visibleIndustryOptions.length} of{" "}
                {industryOptions.length} clients
              </div>
            </div>

            {loading ? (
              <div className="py-4 text-center">
                <Spinner size="sm" className="mx-auto" />
              </div>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No rate logs found.
              </p>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <Card
                    key={log._id || `${log.product_title}-${log.created_at}`}
                  >
                    <CardContent className="px-3 py-2">
                      <div className="font-semibold text-foreground">
                        {log.product_title || "Untitled product"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {log.description || "No description"}
                      </div>
                      <div className="mt-1 text-sm">
                        <strong>Variants:</strong>{" "}
                        {(log.variants || []).join(", ") || "—"}
                      </div>
                      <div className="mt-1 flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          {log.industry_name || "Unknown client"}
                        </span>
                        <span className="font-bold text-primary!">
                          Rs {formatMoney(log.amount)}
                          {log.unit ? ` / ${log.unit}` : ""}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        <strong>Date:</strong>{" "}
                        {dateFormatter(log.created_at, "—")}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default QuoteLogsSidebar;
