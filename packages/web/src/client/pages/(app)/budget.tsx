import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiGet, apiPatch } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Wallet,
  Receipt,
  X,
} from "lucide-react";

interface CategorySpending {
  category: string;
  total: number;
  itemCount: number;
  averagePerItem: number;
}

interface SpendingInsight {
  period: "week" | "month";
  total: number;
  itemCount: number;
  averagePerItem: number;
  byCategory: CategorySpending[];
  byStore: { store: string; total: number; itemCount: number }[];
  comparison?: {
    previousTotal: number;
    changePercent: number;
    trend: "up" | "down" | "stable";
  };
  budget?: {
    monthlyBudget: number;
    percentUsed: number;
    remaining: number;
    status: "on_track" | "heads_up" | "over";
  };
  insights: string[];
}

const baht = (n: number) => `฿${n.toFixed(2)}`;

const fmtDate = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

interface ReceiptRow {
  id: string;
  merchant: string | null;
  purchasedAt: string | null;
  currency: string | null;
  total: number | null;
  itemCount: number;
  createdAt: string;
}

interface ReceiptDetail {
  receipt: ReceiptRow;
  items: {
    id: string;
    name: string;
    quantity: number;
    price: number | null;
    category: string | null;
  }[];
}

function TrendChip({ comparison }: { comparison: NonNullable<SpendingInsight["comparison"]> }) {
  const pct = Math.abs(Math.round(comparison.changePercent));
  const { trend } = comparison;
  const Icon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const tone =
    trend === "up"
      ? "text-amber-600 dark:text-amber-400"
      : trend === "down"
        ? "text-pixie-sage-600 dark:text-pixie-glow-sage"
        : "text-pixie-charcoal-100 dark:text-pixie-mist-300";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${tone}`}>
      <Icon className="w-3.5 h-3.5" />
      {trend === "stable" ? "About the same as last month" : `${pct}% vs last month`}
    </span>
  );
}

export default function BudgetPage() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");
  const [openReceiptId, setOpenReceiptId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["budget", user?.homeId],
    queryFn: () =>
      apiGet<{ week: SpendingInsight; month: SpendingInsight }>(
        `/api/homes/${user!.homeId}/budget`,
        token!,
      ),
    enabled: !!token && !!user?.homeId,
  });

  const { data: prefsData } = useQuery({
    queryKey: ["preferences", user?.id],
    queryFn: () =>
      apiGet<{ monthlyBudget: number | null }>(
        `/api/users/me/preferences?homeId=${user!.homeId}`,
        token!,
      ),
    enabled: !!token && !!user?.homeId,
  });

  const { data: receiptsData } = useQuery({
    queryKey: ["receipts", user?.homeId],
    queryFn: () =>
      apiGet<ReceiptRow[]>(`/api/homes/${user!.homeId}/receipts`, token!),
    enabled: !!token && !!user?.homeId,
  });
  const receipts = receiptsData?.data ?? [];

  const { data: receiptDetailData } = useQuery({
    queryKey: ["receipt", user?.homeId, openReceiptId],
    queryFn: () =>
      apiGet<ReceiptDetail>(
        `/api/homes/${user!.homeId}/receipts/${openReceiptId}`,
        token!,
      ),
    enabled: !!token && !!user?.homeId && !!openReceiptId,
  });
  const receiptDetail = receiptDetailData?.data;
  const receiptItemsSum = (receiptDetail?.items ?? []).reduce(
    (s, it) => s + (it.price ?? 0),
    0,
  );
  const receiptMismatch =
    receiptDetail?.receipt.total != null &&
    Math.abs(receiptItemsSum - receiptDetail.receipt.total) > 1;

  const monthlyBudget = prefsData?.data?.monthlyBudget ?? null;

  const saveBudget = useMutation({
    mutationFn: (value: number | null) =>
      apiPatch("/api/users/me/preferences", token!, {
        monthlyBudget: value,
        homeId: user?.homeId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preferences"] });
      queryClient.invalidateQueries({ queryKey: ["budget"] });
      setEditing(false);
      toast.success("Monthly budget saved");
    },
    onError: () => toast.error("Failed to save budget"),
  });

  const month = data?.data?.month;
  const week = data?.data?.week;
  const budget = month?.budget;

  const statusTone = (status: string) =>
    status === "over"
      ? "bg-amber-400"
      : status === "heads_up"
        ? "bg-amber-300"
        : "bg-pixie-sage-500";

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full bg-pixie-cream-50 dark:bg-pixie-dusk-50">
      <h2 className="text-xl font-semibold font-display text-pixie-charcoal-300 dark:text-pixie-mist-100">
        Spending
      </h2>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-6 h-6 border-2 border-pixie-sage-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* Totals */}
          <Card>
            <CardContent className="pt-6 space-y-1">
              <p className="text-xs font-medium text-pixie-charcoal-100 dark:text-pixie-mist-300 uppercase tracking-wider">
                This month
              </p>
              <p className="text-3xl font-semibold font-display text-pixie-charcoal-300 dark:text-pixie-mist-100">
                {baht(month?.total ?? 0)}
              </p>
              <p className="text-sm text-pixie-charcoal-100 dark:text-pixie-mist-300">
                {month?.itemCount ?? 0} priced item
                {(month?.itemCount ?? 0) !== 1 ? "s" : ""} · This week {baht(week?.total ?? 0)}
              </p>
              {month?.comparison && (
                <div className="pt-1">
                  <TrendChip comparison={month.comparison} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly budget */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-pixie-sage-500 dark:text-pixie-glow-sage" />
                  <CardTitle className="text-lg">Monthly Budget</CardTitle>
                </div>
                {!editing && (
                  <button
                    onClick={() => {
                      setBudgetInput(monthlyBudget ? String(monthlyBudget) : "");
                      setEditing(true);
                    }}
                    className="text-sm text-pixie-sage-600 dark:text-pixie-glow-sage hover:underline"
                  >
                    {monthlyBudget ? "Edit" : "Set budget"}
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {editing ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    placeholder="e.g. 8000"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    className="flex-1"
                    autoFocus
                  />
                  <Button
                    onClick={() =>
                      saveBudget.mutate(budgetInput ? Number(budgetInput) : null)
                    }
                    disabled={saveBudget.isPending}
                  >
                    Save
                  </Button>
                  <Button variant="ghost" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              ) : budget ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-pixie-charcoal-200 dark:text-pixie-mist-200">
                      {baht(month?.total ?? 0)} of {baht(budget.monthlyBudget)}
                    </span>
                    <span className="text-pixie-charcoal-100 dark:text-pixie-mist-300">
                      {budget.remaining >= 0
                        ? `${baht(budget.remaining)} left`
                        : `${baht(Math.abs(budget.remaining))} over`}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-pixie-cream-200 dark:bg-pixie-dusk-300 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${statusTone(budget.status)}`}
                      style={{ width: `${Math.min(budget.percentUsed, 100)}%` }}
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm text-pixie-charcoal-100 dark:text-pixie-mist-300">
                  Set a monthly budget and I'll gently track how you're doing —
                  no judgment, just a heads-up.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Category breakdown */}
          {month && month.byCategory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Where it went this month</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {month.byCategory.slice(0, 8).map((c) => {
                  const pct = month.total > 0 ? (c.total / month.total) * 100 : 0;
                  return (
                    <div key={c.category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize text-pixie-charcoal-200 dark:text-pixie-mist-200">
                          {c.category}
                        </span>
                        <span className="text-pixie-charcoal-100 dark:text-pixie-mist-300">
                          {baht(c.total)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-pixie-cream-200 dark:bg-pixie-dusk-300 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-pixie-sage-400 dark:bg-pixie-glow-sage"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* By store */}
          {month && month.byStore.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Where you shopped</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {month.byStore.slice(0, 8).map((s) => {
                  const pct = month.total > 0 ? (s.total / month.total) * 100 : 0;
                  return (
                    <div key={s.store}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-pixie-charcoal-200 dark:text-pixie-mist-200">
                          {s.store}
                        </span>
                        <span className="text-pixie-charcoal-100 dark:text-pixie-mist-300">
                          {baht(s.total)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-pixie-cream-200 dark:bg-pixie-dusk-300 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-pixie-sage-400 dark:bg-pixie-glow-sage"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Recent receipts */}
          {receipts.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-pixie-sage-500 dark:text-pixie-glow-sage" />
                  <CardTitle className="text-lg">Recent receipts</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="divide-y divide-pixie-cream-200 dark:divide-pixie-dusk-300">
                  {receipts.slice(0, 10).map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setOpenReceiptId(r.id)}
                      className="flex w-full items-center justify-between gap-3 py-2.5 text-left"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-pixie-charcoal-200 dark:text-pixie-mist-200">
                          {r.merchant || "Receipt"}
                        </p>
                        <p className="text-xs text-pixie-charcoal-100 dark:text-pixie-mist-300">
                          {fmtDate(r.purchasedAt ?? r.createdAt)} · {r.itemCount}{" "}
                          item{r.itemCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <span className="text-sm font-medium text-pixie-charcoal-300 dark:text-pixie-mist-100 shrink-0">
                        {r.total != null ? baht(r.total) : "—"}
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pixie insights */}
          {month && month.insights.length > 0 && (
            <Card>
              <CardContent className="pt-6 space-y-2">
                {month.insights.map((line, i) => (
                  <p
                    key={i}
                    className="flex items-start gap-2 text-sm text-pixie-charcoal-200 dark:text-pixie-mist-200"
                  >
                    <Sparkles className="w-4 h-4 text-pixie-sage-500 dark:text-pixie-glow-sage shrink-0 mt-0.5" />
                    {line}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Receipt detail */}
      {openReceiptId && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40"
          onClick={() => setOpenReceiptId(null)}
        >
          <div
            className="bg-pixie-cream-50 dark:bg-pixie-dusk-50 rounded-t-3xl max-h-[85dvh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-pixie-cream-200 dark:border-pixie-dusk-300 shrink-0">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold font-display text-pixie-charcoal-300 dark:text-pixie-mist-100 truncate">
                  {receiptDetail?.receipt.merchant || "Receipt"}
                </h2>
                <p className="text-xs text-pixie-charcoal-100 dark:text-pixie-mist-300">
                  {fmtDate(
                    receiptDetail?.receipt.purchasedAt ??
                      receiptDetail?.receipt.createdAt,
                  )}
                </p>
              </div>
              <button
                onClick={() => setOpenReceiptId(null)}
                className="p-1 hover:bg-pixie-cream-200 dark:hover:bg-pixie-dusk-300 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-pixie-charcoal-200 dark:text-pixie-mist-200" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {(receiptDetail?.items ?? []).map((it) => (
                <div key={it.id} className="flex justify-between gap-3 text-sm">
                  <span className="text-pixie-charcoal-200 dark:text-pixie-mist-200">
                    {it.quantity > 1 ? `${it.quantity}× ` : ""}
                    {it.name}
                  </span>
                  <span className="text-pixie-charcoal-100 dark:text-pixie-mist-300 shrink-0">
                    {it.price != null ? baht(it.price) : "—"}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-pixie-cream-200 dark:border-pixie-dusk-300 bg-white dark:bg-pixie-dusk-100 shrink-0 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-pixie-charcoal-100 dark:text-pixie-mist-300">
                  Items total
                </span>
                <span className="text-pixie-charcoal-300 dark:text-pixie-mist-100 font-medium">
                  {baht(receiptItemsSum)}
                </span>
              </div>
              {receiptDetail?.receipt.total != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-pixie-charcoal-100 dark:text-pixie-mist-300">
                    Receipt total
                  </span>
                  <span className="text-pixie-charcoal-300 dark:text-pixie-mist-100 font-medium">
                    {baht(receiptDetail.receipt.total)}
                  </span>
                </div>
              )}
              {receiptMismatch && (
                <p className="text-xs text-amber-600 dark:text-amber-400 pt-1">
                  These don't quite match — a price may be off or a line was
                  missed.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
