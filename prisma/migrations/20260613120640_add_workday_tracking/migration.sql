-- Workday Tracking module: employer groups, global estimation settings, and
-- per-student cumulative workday snapshots used to estimate internship progress.

-- CreateTable
CREATE TABLE "EmployerGroup" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "cutoffDay" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WorkdaySettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "workdaysPerWeek" INTEGER NOT NULL DEFAULT 6,
    "requiredWorkdays" INTEGER NOT NULL DEFAULT 0,
    "updatedBy" INTEGER,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WorkdayRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "studentId" INTEGER NOT NULL,
    "employerGroupId" INTEGER NOT NULL,
    "cumulativeWorkdays" INTEGER NOT NULL,
    "dataYear" INTEGER NOT NULL,
    "dataMonth" INTEGER NOT NULL,
    "uploadedBy" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkdayRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WorkdayRecord_employerGroupId_fkey" FOREIGN KEY ("employerGroupId") REFERENCES "EmployerGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WorkdayRecord_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployerGroup_name_key" ON "EmployerGroup"("name");

-- CreateIndex
CREATE UNIQUE INDEX "WorkdayRecord_studentId_key" ON "WorkdayRecord"("studentId");

-- CreateIndex
CREATE INDEX "WorkdayRecord_employerGroupId_idx" ON "WorkdayRecord"("employerGroupId");
