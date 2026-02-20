import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/import")({
  component: ImportPage,
});

// --- CSV Parsing ---

interface ParsedRow {
  phoneNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  balance: string;
  issues: string[];
}

/**
 * Parses a single CSV line respecting quoted fields.
 * Handles fields wrapped in double-quotes and escaped quotes ("").
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // Peek ahead: escaped quote ("") vs end of quoted field
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip the second quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }

  fields.push(current.trim());
  return fields;
}

/**
 * Normalises a header string to a known column key, returning null if
 * the header is unrecognised.
 */
function normalizeHeader(
  raw: string,
): "phoneNumber" | "firstName" | "lastName" | "email" | "balance" | null {
  const h = raw.toLowerCase().replace(/[^a-z]/g, "");
  if (h === "phonenumber" || h === "phone") return "phoneNumber";
  if (h === "firstname" || h === "first") return "firstName";
  if (h === "lastname" || h === "last") return "lastName";
  if (h === "email") return "email";
  if (h === "balance") return "balance";
  return null;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  const headerFields = parseCsvLine(lines[0]);
  const columnMap = headerFields.map(normalizeHeader);

  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);

    const row: ParsedRow = {
      phoneNumber: "",
      firstName: "",
      lastName: "",
      email: "",
      balance: "",
      issues: [],
    };

    for (let j = 0; j < columnMap.length; j++) {
      const key = columnMap[j];
      if (key) {
        row[key] = values[j] ?? "";
      }
    }

    // Validate required fields
    if (!row.phoneNumber) row.issues.push("Missing phone number");
    if (!row.firstName) row.issues.push("Missing first name");
    if (!row.lastName) row.issues.push("Missing last name");

    // Validate balance
    if (!row.balance) {
      row.issues.push("Missing balance");
    } else if (isNaN(Number(row.balance))) {
      row.issues.push("Balance is not a valid number");
    }

    rows.push(row);
  }

  return rows;
}

// --- Import Results ---

interface ImportResults {
  customersCreated: number;
  customersMatched: number;
  transactionsCreated: number;
  errors: string[];
}

// --- Component ---

function ImportPage() {
  const user = useQuery(api.users.current);
  const importCSV = useMutation(api.import.importCSVData);

  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResults | null>(null);

  // Loading
  if (user === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Access control: owner only
  if (!user || user.role !== "owner") {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Only the store owner can access the CSV import tool.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResults(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = parseCSV(text);
      setParsedRows(rows);

      if (rows.length === 0) {
        toast.error("No data rows found in CSV. Check that the file has a header row and at least one data row.");
      } else {
        toast.success(`Parsed ${rows.length} row${rows.length === 1 ? "" : "s"} from ${file.name}`);
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read the file.");
    };
    reader.readAsText(file);
  };

  const validRows = parsedRows.filter((r) => r.issues.length === 0);
  const invalidRows = parsedRows.filter((r) => r.issues.length > 0);

  const handleImport = async () => {
    if (validRows.length === 0) {
      toast.error("No valid rows to import.");
      return;
    }

    setImporting(true);
    try {
      const payload = validRows.map((row) => ({
        phoneNumber: row.phoneNumber,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email || undefined,
        balance: Number(row.balance),
      }));

      const res = await importCSV({ rows: payload });
      setResults(res);
      toast.success("Import completed successfully.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Import failed. Please try again.",
      );
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setParsedRows([]);
    setFileName("");
    setResults(null);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">CSV Import</h1>
        <p className="text-muted-foreground">
          Import customer data and balances from a CSV file.
        </p>
      </div>

      {/* Step 1: File Upload */}
      <Card>
        <CardHeader>
          <CardTitle>1. Select CSV File</CardTitle>
          <CardDescription>
            Upload a CSV with columns: phoneNumber, firstName, lastName, email
            (optional), balance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <label
              htmlFor="csv-upload"
              className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Choose File
            </label>
            <input
              id="csv-upload"
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="sr-only"
            />
            <span className="text-sm text-muted-foreground">
              {fileName || "No file selected"}
            </span>
          </div>

          {parsedRows.length > 0 && (
            <div className="flex items-center gap-3">
              <Badge variant="secondary">
                {parsedRows.length} row{parsedRows.length !== 1 && "s"} parsed
              </Badge>
              <Badge variant="default">
                {validRows.length} valid
              </Badge>
              {invalidRows.length > 0 && (
                <Badge variant="destructive">
                  {invalidRows.length} with issues
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Clear
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Preview Table */}
      {parsedRows.length > 0 && !results && (
        <Card>
          <CardHeader>
            <CardTitle>2. Review Data</CardTitle>
            <CardDescription>
              Verify the parsed data below. Rows with issues are highlighted in
              red and will be skipped during import.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[28rem] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>First Name</TableHead>
                    <TableHead>Last Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row, idx) => {
                    const hasIssues = row.issues.length > 0;
                    return (
                      <TableRow
                        key={idx}
                        className={hasIssues ? "bg-destructive/5" : ""}
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell
                          className={
                            !row.phoneNumber ? "text-destructive font-medium" : ""
                          }
                        >
                          {row.phoneNumber || "\u2014"}
                        </TableCell>
                        <TableCell
                          className={
                            !row.firstName ? "text-destructive font-medium" : ""
                          }
                        >
                          {row.firstName || "\u2014"}
                        </TableCell>
                        <TableCell
                          className={
                            !row.lastName ? "text-destructive font-medium" : ""
                          }
                        >
                          {row.lastName || "\u2014"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.email || "\u2014"}
                        </TableCell>
                        <TableCell
                          className={`text-right ${
                            !row.balance || isNaN(Number(row.balance))
                              ? "text-destructive font-medium"
                              : ""
                          }`}
                        >
                          {row.balance || "\u2014"}
                        </TableCell>
                        <TableCell>
                          {hasIssues ? (
                            <span
                              className="text-xs text-destructive"
                              title={row.issues.join("; ")}
                            >
                              {row.issues.join("; ")}
                            </span>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-green-300 text-green-700"
                            >
                              OK
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Import */}
      {parsedRows.length > 0 && !results && (
        <Card>
          <CardHeader>
            <CardTitle>3. Import</CardTitle>
            <CardDescription>
              {validRows.length > 0
                ? `Ready to import ${validRows.length} valid row${validRows.length !== 1 ? "s" : ""}. ${
                    invalidRows.length > 0
                      ? `${invalidRows.length} row${invalidRows.length !== 1 ? "s" : ""} with issues will be skipped.`
                      : ""
                  }`
                : "No valid rows to import. Fix the issues above first."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleImport}
              disabled={importing || validRows.length === 0}
              size="lg"
            >
              {importing
                ? "Importing..."
                : `Import ${validRows.length} Row${validRows.length !== 1 ? "s" : ""}`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
            <CardDescription>
              The import has completed. Here is a summary.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold">{results.customersCreated}</p>
                <p className="text-sm text-muted-foreground">
                  Customers Created
                </p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold">{results.customersMatched}</p>
                <p className="text-sm text-muted-foreground">
                  Customers Matched
                </p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold">
                  {results.transactionsCreated}
                </p>
                <p className="text-sm text-muted-foreground">
                  Transactions Created
                </p>
              </div>
            </div>

            {results.errors.length > 0 && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
                <p className="mb-2 font-medium text-destructive">
                  {results.errors.length} error{results.errors.length !== 1 && "s"} during import:
                </p>
                <ul className="list-inside list-disc space-y-1 text-sm text-destructive">
                  {results.errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button variant="outline" onClick={handleReset}>
              Import Another File
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
