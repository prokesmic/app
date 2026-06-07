import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { getMonitorOverview } from "@/lib/monitor/queries";
import { isTelegramConfigured } from "@/lib/notify/telegram";
import { MonitorControls } from "@/components/monitor/monitor-controls";
import { TargetActions } from "@/components/monitor/target-actions";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Globe,
  XCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

const COUNTRY_FLAG: Record<string, string> = { CZ: "🇨🇿", US: "🇺🇸", DE: "🇩🇪", CH: "🇨🇭" };

function statusBadge(status: string) {
  switch (status) {
    case "IN_STOCK":
      return <Badge className="bg-green-600 text-white">In stock</Badge>;
    case "OUT_OF_STOCK":
      return <Badge variant="secondary">Out of stock</Badge>;
    case "ERROR":
      return <Badge variant="destructive">Error</Badge>;
    case "PENDING":
      return <Badge variant="outline">Not checked</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
}

export default async function MonitorPage() {
  const data = await getMonitorOverview();
  const telegramReady = isTelegramConfigured();

  const inStockTargets = data.targets.filter((t) => t.status === "IN_STOCK");

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mac Studio M3 Ultra Monitor</h1>
          <p className="text-sm text-muted-foreground">
            {data.product?.specSummary ?? "Base M3 Ultra config"} · trusted sellers in 🇨🇿 🇺🇸 🇩🇪 🇨🇭
          </p>
        </div>
        <MonitorControls telegramReady={telegramReady} />
      </div>

      {/* Notification / config warnings */}
      {!telegramReady ? (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 py-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>
              Telegram alerts are <b>not configured</b>. Set{" "}
              <code className="rounded bg-muted px-1">TELEGRAM_BOT_TOKEN</code> and{" "}
              <code className="rounded bg-muted px-1">TELEGRAM_CHAT_ID</code> to receive
              instant notifications. Checks still run and are recorded below.
            </span>
          </CardContent>
        </Card>
      ) : null}

      {data.totals.needsConfig > 0 ? (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 py-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>
              {data.totals.needsConfig} target(s) need setup before they can alert: Apple
              targets need a regional part number, and reseller targets need an exact product
              URL (search/listing pages never alert, to avoid false positives). Use the ✎ edit
              button on flagged rows — see MONITOR.md.
            </span>
          </CardContent>
        </Card>
      ) : null}

      {/* In-stock banner */}
      {inStockTargets.length > 0 ? (
        <Card className="border-green-600/50 bg-green-600/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              Available now ({inStockTargets.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {inStockTargets.map((t) => (
              <a
                key={t.id}
                href={t.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-md border bg-background p-3 text-sm hover:bg-accent"
              >
                <span>
                  {COUNTRY_FLAG[t.country] ?? t.country} <b>{t.sellerName}</b> — {t.label}
                </span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  {t.price != null ? `${t.price.toLocaleString()} ${t.currency}` : ""}
                  <ExternalLink className="h-4 w-4" />
                </span>
              </a>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Targets monitored" value={data.totals.targets} sub={`${data.totals.active} active`} />
        <Stat
          label="In stock"
          value={data.totals.inStock}
          accent={data.totals.inStock > 0 ? "text-green-600" : undefined}
        />
        <Stat label="Out of stock" value={data.totals.outOfStock} />
        <Stat
          label="Errors / unknown"
          value={data.totals.error + data.totals.unknown}
          accent={data.totals.error > 0 ? "text-destructive" : undefined}
        />
      </div>

      {/* Per-country + last run */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4" /> Coverage by country
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(data.byCountry).map(([country, c]) => (
              <div key={country} className="rounded-lg border p-3">
                <div className="text-lg">{COUNTRY_FLAG[country] ?? ""} {country}</div>
                <div className="text-sm text-muted-foreground">{c.total} sellers</div>
                <div className={c.inStock > 0 ? "text-sm font-medium text-green-600" : "text-sm text-muted-foreground"}>
                  {c.inStock} in stock
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Last run</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {data.lastRun ? (
              <div className="space-y-1">
                <div className="text-muted-foreground">
                  {formatDistanceToNow(new Date(data.lastRun.startedAt), { addSuffix: true })} · {data.lastRun.trigger}
                </div>
                <div>Checked {data.lastRun.targetsChecked} targets</div>
                <div>Alerts sent: {data.lastRun.alertsSent}</div>
                {data.lastRun.errorCount > 0 ? (
                  <div className="text-destructive">{data.lastRun.errorCount} errors</div>
                ) : null}
              </div>
            ) : (
              <div className="text-muted-foreground">No runs yet — click “Run check now”.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Targets table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Monitored sellers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Trust</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Checked</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.targets.map((t) => (
                <TableRow key={t.id} className={!t.isActive ? "opacity-50" : undefined}>
                  <TableCell className="text-lg">{COUNTRY_FLAG[t.country] ?? t.country}</TableCell>
                  <TableCell>
                    <a href={t.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                      {t.sellerName}
                    </a>
                    <div className="text-xs text-muted-foreground">{t.label}</div>
                    {t.needsConfig ? (
                      <span className="text-xs text-amber-600">⚠ {t.needsConfigReason}</span>
                    ) : null}
                    {t.error ? <div className="text-xs text-destructive">{t.error}</div> : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.trustTier === "AUTHORIZED" ? "outline" : "secondary"}>
                      {t.trustTier === "AUTHORIZED" ? "Authorized" : "Marketplace"}
                    </Badge>
                  </TableCell>
                  <TableCell>{statusBadge(t.status)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {t.price != null ? `${t.price.toLocaleString()} ${t.currency}` : "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {t.checkedAt ? formatDistanceToNow(new Date(t.checkedAt), { addSuffix: true }) : "never"}
                  </TableCell>
                  <TableCell>
                    <TargetActions id={t.id} url={t.url} isActive={t.isActive} strategy={t.strategy} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No alerts yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.recentAlerts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    {a.status === "SENT" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    {a.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {a.channel} · {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                    {a.error ? ` · ${a.error}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Separator />
      <p className="text-xs text-muted-foreground">
        Always-on: run <code className="rounded bg-muted px-1">npx tsx scripts/monitor.ts --watch</code> on a
        host, or schedule <code className="rounded bg-muted px-1">POST /api/monitor/run</code> via cron /
        GitHub Actions. See MONITOR.md.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number;
  sub?: string;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-2xl font-bold ${accent ?? ""}`}>{value}</div>
        {sub ? <div className="text-xs text-muted-foreground">{sub}</div> : null}
      </CardContent>
    </Card>
  );
}
