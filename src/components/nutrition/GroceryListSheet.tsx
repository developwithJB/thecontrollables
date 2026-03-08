import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Loader2, X, Check, Copy, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GroceryItem {
  name: string;
  quantity: string;
  note?: string;
}

interface GroceryCategory {
  name: string;
  items: GroceryItem[];
}

interface GroceryList {
  categories: GroceryCategory[];
  summary: string;
}

interface GroceryListSheetProps {
  userId: string;
}

export function GroceryListSheet({ userId }: GroceryListSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [groceryList, setGroceryList] = useState<GroceryList | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const generate = useMutation({
    mutationFn: async () => {
      const today = new Date();
      const start_date = format(today, "yyyy-MM-dd");
      const end_date = format(addDays(today, 6), "yyyy-MM-dd");

      const { data, error } = await supabase.functions.invoke("ai-grocery-list", {
        body: { start_date, end_date },
      });
      if (error) throw error;
      return data as GroceryList;
    },
    onSuccess: (data) => {
      setGroceryList(data);
      setCheckedItems(new Set());
    },
    onError: (err: any) => {
      toast({
        title: "Grocery list failed",
        description: err?.message || "Could not generate list",
        variant: "destructive",
      });
    },
  });

  const handleOpen = () => {
    setIsOpen(true);
    if (!groceryList) generate.mutate();
  };

  const toggleItem = (key: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getFormattedText = () => {
    if (!groceryList) return "";
    return groceryList.categories
      .map((cat) => {
        const items = cat.items.map((item) => `  ${item.quantity} ${item.name}${item.note ? ` (${item.note})` : ""}`).join("\n");
        return `${cat.name}:\n${items}`;
      })
      .join("\n\n");
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getFormattedText());
    toast({ title: "Copied!", description: "Grocery list copied to clipboard." });
  };

  const handleShare = async () => {
    const text = getFormattedText();
    const title = "🛒 Weekly Grocery List";

    if (navigator.share) {
      try {
        await navigator.share({ title, text });
        return;
      } catch {
        // User cancelled or share failed — fall through to mailto
      }
    }

    // Fallback: open mailto
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(text);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const totalItems = groceryList?.categories.reduce((s, c) => s + c.items.length, 0) ?? 0;
  const checkedCount = checkedItems.size;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-xs h-7 w-full"
        onClick={handleOpen}
      >
        <ShoppingCart className="w-3 h-3 mr-1" />
        Grocery List
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl max-h-[85vh] overflow-auto"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-border rounded-full" />
              </div>

              <div className="px-4 pb-6 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                    <div>
                      <h2 className="text-base font-semibold text-foreground">Weekly Grocery List</h2>
                      {groceryList && (
                        <p className="text-[11px] text-muted-foreground">
                          {checkedCount}/{totalItems} items · {groceryList.summary}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {groceryList && (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleShare} title="Share">
                          <Share2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyToClipboard} title="Copy">
                          <Copy className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Loading */}
                {generate.isPending && (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground">Compiling ingredients...</p>
                  </div>
                )}

                {/* Empty state */}
                {groceryList && groceryList.categories.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">{groceryList.summary}</p>
                  </div>
                )}

                {/* Grocery categories */}
                {groceryList && groceryList.categories.length > 0 && (
                  <div className="space-y-4">
                    {groceryList.categories.map((cat) => (
                      <div key={cat.name}>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                          {cat.name}
                        </h3>
                        <div className="space-y-0.5">
                          {cat.items.map((item) => {
                            const key = `${cat.name}:${item.name}`;
                            const isChecked = checkedItems.has(key);
                            return (
                              <button
                                key={key}
                                onClick={() => toggleItem(key)}
                                className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors hover:bg-accent/30 ${
                                  isChecked ? "opacity-50" : ""
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                                    isChecked
                                      ? "bg-primary border-primary"
                                      : "border-border"
                                  }`}
                                >
                                  {isChecked && <Check className="w-3 h-3 text-primary-foreground" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className={`text-xs ${isChecked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                    {item.name}
                                  </span>
                                </div>
                                <span className="text-[11px] text-muted-foreground flex-shrink-0">
                                  {item.quantity}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Regenerate */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-muted-foreground"
                      onClick={() => generate.mutate()}
                      disabled={generate.isPending}
                    >
                      {generate.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <ShoppingCart className="w-3 h-3 mr-1" />
                      )}
                      Regenerate List
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
