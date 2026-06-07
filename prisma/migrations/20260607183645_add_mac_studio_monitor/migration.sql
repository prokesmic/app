-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specSummary" TEXT NOT NULL,
    "family" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Seller" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "trustTier" TEXT NOT NULL DEFAULT 'AUTHORIZED',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MonitorTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "strategy" TEXT NOT NULL DEFAULT 'http-match',
    "config" TEXT NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "intervalSec" INTEGER NOT NULL DEFAULT 180,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MonitorTarget_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MonitorTarget_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "targetId" TEXT NOT NULL,
    "runId" TEXT,
    "status" TEXT NOT NULL,
    "price" REAL,
    "currency" TEXT,
    "rawSignal" TEXT,
    "httpStatus" INTEGER,
    "responseMs" INTEGER,
    "error" TEXT,
    "checkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockSnapshot_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "MonitorTarget" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockSnapshot_runId_fkey" FOREIGN KEY ("runId") REFERENCES "MonitorRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "targetId" TEXT NOT NULL,
    "snapshotId" TEXT,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" DATETIME,
    CONSTRAINT "Alert_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "MonitorTarget" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Alert_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "StockSnapshot" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MonitorRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "trigger" TEXT NOT NULL DEFAULT 'manual',
    "targetsTotal" INTEGER NOT NULL DEFAULT 0,
    "targetsChecked" INTEGER NOT NULL DEFAULT 0,
    "inStockCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "alertsSent" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Seller_slug_key" ON "Seller"("slug");

-- CreateIndex
CREATE INDEX "MonitorTarget_isActive_country_idx" ON "MonitorTarget"("isActive", "country");

-- CreateIndex
CREATE UNIQUE INDEX "MonitorTarget_sellerId_url_key" ON "MonitorTarget"("sellerId", "url");

-- CreateIndex
CREATE INDEX "StockSnapshot_targetId_checkedAt_idx" ON "StockSnapshot"("targetId", "checkedAt");

-- CreateIndex
CREATE INDEX "StockSnapshot_status_idx" ON "StockSnapshot"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Alert_snapshotId_key" ON "Alert"("snapshotId");

-- CreateIndex
CREATE INDEX "Alert_targetId_createdAt_idx" ON "Alert"("targetId", "createdAt");

-- CreateIndex
CREATE INDEX "MonitorRun_startedAt_idx" ON "MonitorRun"("startedAt");
