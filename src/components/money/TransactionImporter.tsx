import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TransactionImporterProps {
  userId: string;
  onComplete: () => void;
  onCancel: () => void;
}

interface ParsedRow {
  date: string;
  description: string;
  amount: number;
  category?: string;
}

export function TransactionImporter({ userId, onComplete, onCancel }: TransactionImporterProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  const parseCSV = useCallback((text: string) => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    // Detect delimiter
    const firstLine = lines[0];
    const delimiter = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ",";

    const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase().replace(/"/g, ""));

    // Find column indices
    const dateIdx = headers.findIndex((h) => /^(date|trans.*date|posting.*date|transaction_date)$/i.test(h));
    const descIdx = headers.findIndex((h) => /^(description|memo|narrative|details|payee|name)$/i.test(h));
    const amountIdx = headers.findIndex((h) => /^(amount|value|sum)$/i.test(h));
    const debitIdx = headers.findIndex((h) => /^(debit|withdrawal|charge)$/i.test(h));
    const creditIdx = headers.findIndex((h) => /^(credit|deposit|payment)$/i.test(h));
    const categoryIdx = headers.findIndex((h) => /^(category|type|class)$/i.test(h));

    if (dateIdx === -1 || descIdx === -1) return [];

    const rows: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ""));
      if (cols.length < 2) continue;

      const rawDate = cols[dateIdx];
      const description = cols[descIdx];
      if (!rawDate || !description) continue;

      let amount = 0;
      if (amountIdx >= 0) {
        amount = parseFloat(cols[amountIdx]?.replace(/[,$]/g, "") || "0");
      } else if (debitIdx >= 0 || creditIdx >= 0) {
        const debit = debitIdx >= 0 ? parseFloat(cols[debitIdx]?.replace(/[,$]/g, "") || "0") : 0;
        const credit = creditIdx >= 0 ? parseFloat(cols[creditIdx]?.replace(/[,$]/g, "") || "0") : 0;
        amount = credit - debit;
      }

      // Parse date — try common formats
      const parsedDate = parseDate(rawDate);
      if (!parsedDate) continue;

      rows.push({
        date: parsedDate,
        description,
        amount,
        category: categoryIdx >= 0 ? cols[categoryIdx] : undefined,
      });
    }
    return rows;
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    const text = await f.text();
    const rows = parseCSV(text);
    setParsed(rows);
    if (rows.length === 0) {
      toast({ title: "Could not parse CSV", description: "Check that your file has date and description columns.", variant: "destructive" });
    }
  };

  const handleImport = async () => {
    if (parsed.length === 0) return;
    setImporting(true);
    try {
      const txns = parsed.map((r) => ({
        user_id: userId,
        description: r.description.slice(0, 500),
        amount: r.amount,
        transaction_date: r.date,
        category: r.category?.slice(0, 100) || null,
        account_id: null,
        budget_bucket_id: null,
        is_pending: false,
        external_transaction_id: null,
      }));

      // Batch insert (Supabase handles up to 1000 rows)
      const batchSize = 500;
      let imported = 0;
      for (let i = 0; i < txns.length; i += batchSize) {
        const batch = txns.slice(i, i + batchSize);
        const { error } = await supabase.from("transactions").insert(batch);
        if (error) throw error;
        imported += batch.length;
      }

      setResult({ imported, skipped: 0 });
      toast({ title: `${imported} transactions imported` });
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Import Transactions from CSV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {result ? (
          <div className="text-center py-4">
            <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">{result.imported} transactions imported</p>
            <div className="flex gap-2 justify-center mt-3">
              <Button size="sm" onClick={onComplete}>Done</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-2">Upload a bank statement CSV</p>
              <input type="file" accept=".csv,.tsv,.txt" onChange={handleFileSelect} className="hidden" id="csv-upload" />
              <Button asChild size="sm" variant="outline">
                <label htmlFor="csv-upload" className="cursor-pointer">Choose File</label>
              </Button>
              {file && <p className="text-xs text-muted-foreground mt-2">{file.name}</p>}
            </div>

            {parsed.length > 0 && (
              <>
                <div className="border border-border rounded-lg p-3">
                  <p className="text-sm font-medium text-foreground mb-2">Preview ({parsed.length} rows)</p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {parsed.slice(0, 10).map((r, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1">
                        <div className="flex-1 truncate">
                          <span className="text-muted-foreground mr-2">{r.date}</span>
                          <span className="text-foreground">{r.description}</span>
                        </div>
                        <span className={Number(r.amount) >= 0 ? "text-primary" : "text-foreground"}>
                          {Number(r.amount) >= 0 ? "+" : "-"}${Math.abs(r.amount).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {parsed.length > 10 && (
                      <p className="text-xs text-muted-foreground text-center">+{parsed.length - 10} more</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" onClick={handleImport} disabled={importing}>
                    {importing ? "Importing..." : `Import ${parsed.length} Transactions`}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function parseDate(raw: string): string | null {
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // Try MM/DD/YYYY or M/D/YYYY
  const mdy = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;
  // Try DD/MM/YYYY (if day > 12)
  const dmy = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmy && parseInt(dmy[1]) > 12) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  // Try Date.parse as last resort
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  return null;
}
