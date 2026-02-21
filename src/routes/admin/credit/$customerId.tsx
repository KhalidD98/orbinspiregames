import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/credit/$customerId")({
  component: CustomerDetailPage,
});

type TransactionType =
  | "buy_in"
  | "purchase"
  | "adjustment"
  | "correction"
  | "migration";

const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  buy_in: "Buy-in",
  purchase: "Purchase",
  adjustment: "Adjustment",
  correction: "Correction",
  migration: "Migration",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function CustomerDetailPage() {
  const { customerId } = Route.useParams();
  const customer = useQuery(api.customers.get, {
    customerId: customerId as any,
  });
  const transactions = useQuery(api.transactions.listByCustomer, {
    customerId: customerId as any,
  });
  const currentUser = useQuery(api.users.current);

  const createTransaction = useMutation(api.transactions.create);
  const updateTransaction = useMutation(api.transactions.update);
  const removeTransaction = useMutation(api.transactions.remove);

  const [addCreditOpen, setAddCreditOpen] = useState(false);
  const [useCreditOpen, setUseCreditOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Transaction form state
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TransactionType>("buy_in");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  // Pagination
  const [page, setPage] = useState(0);
  const pageSize = 10;

  // Edit form state
  const [editAmount, setEditAmount] = useState("");
  const [editType, setEditType] = useState<TransactionType>("buy_in");
  const [editDescription, setEditDescription] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const isManagerOrOwner =
    currentUser?.role === "manager" || currentUser?.role === "owner";
  const isOwner = currentUser?.role === "owner";

  const resetForm = () => {
    setAmount("");
    setType("buy_in");
    setDescription("");
    setNotes("");
  };

  const handleAddCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid positive amount");
      return;
    }
    setSubmitting(true);
    try {
      await createTransaction({
        customerId: customerId as any,
        amount: parsedAmount,
        type,
        description: description || undefined,
        notes: notes || undefined,
      });
      toast.success(`Added ${formatCurrency(parsedAmount)} credit`);
      setAddCreditOpen(false);
      resetForm();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add credit",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUseCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid positive amount");
      return;
    }
    setSubmitting(true);
    try {
      await createTransaction({
        customerId: customerId as any,
        amount: -parsedAmount,
        type,
        description: description || undefined,
        notes: notes || undefined,
      });
      toast.success(`Used ${formatCurrency(parsedAmount)} credit`);
      setUseCreditOpen(false);
      resetForm();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to use credit",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (tx: any) => {
    setEditingTransaction(tx);
    setEditAmount(Math.abs(tx.amount).toString());
    setEditType(tx.type);
    setEditDescription(tx.description || "");
    setEditNotes(tx.notes || "");
    setEditDialogOpen(true);
  };

  const handleEditTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;
    const parsedAmount = parseFloat(editAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid positive amount");
      return;
    }
    setSubmitting(true);
    try {
      // Preserve the sign of the original amount
      const finalAmount =
        editingTransaction.amount < 0 ? -parsedAmount : parsedAmount;
      await updateTransaction({
        id: editingTransaction._id,
        amount: finalAmount,
        type: editType,
        description: editDescription || undefined,
        notes: editNotes || undefined,
      });
      toast.success("Transaction updated");
      setEditDialogOpen(false);
      setEditingTransaction(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update transaction",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try {
      await removeTransaction({ id: transactionId as any });
      toast.success("Transaction deleted");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete transaction",
      );
    }
  };

  if (customer === undefined || transactions === undefined) {
    return (
      <div className="py-8 text-center text-muted-foreground">Loading...</div>
    );
  }

  if (customer === null) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">Customer not found.</p>
        <Link
          to="/admin/credit"
          className="text-primary underline-offset-4 hover:underline mt-2 inline-block"
        >
          Back to search
        </Link>
      </div>
    );
  }

  const balance = customer.balance ?? 0;

  const transactionFormFields = (
    isEdit: boolean,
    currentAmount: string,
    setCurrentAmount: (v: string) => void,
    currentType: TransactionType,
    setCurrentType: (v: TransactionType) => void,
    currentDescription: string,
    setCurrentDescription: (v: string) => void,
    currentNotes: string,
    setCurrentNotes: (v: string) => void,
  ) => (
    <>
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-amount" : "amount"}>Amount *</Label>
        <Input
          id={isEdit ? "edit-amount" : "amount"}
          type="number"
          step="0.01"
          min="0.01"
          value={currentAmount}
          onChange={(e) => setCurrentAmount(e.target.value)}
          placeholder="0.00"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-type" : "type"}>Type</Label>
        <Select
          value={currentType}
          onValueChange={(v) => setCurrentType(v as TransactionType)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="buy_in">Buy-in</SelectItem>
            <SelectItem value="purchase">Purchase</SelectItem>
            <SelectItem value="adjustment">Adjustment</SelectItem>
            <SelectItem value="correction">Correction</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-description" : "description"}>
          Description
        </Label>
        <Textarea
          id={isEdit ? "edit-description" : "description"}
          value={currentDescription}
          onChange={(e) => setCurrentDescription(e.target.value)}
          placeholder="Optional description"
          rows={2}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-notes" : "notes"}>Notes</Label>
        <Textarea
          id={isEdit ? "edit-notes" : "notes"}
          value={currentNotes}
          onChange={(e) => setCurrentNotes(e.target.value)}
          placeholder="Optional notes"
          rows={2}
        />
      </div>
    </>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Back link */}
      <Link
        to="/admin/credit"
        className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
      >
        &larr; Back to search
      </Link>

      {/* Customer Info & Balance */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">
                {customer.firstName} {customer.lastName}
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                {customer.phoneNumber}
                {customer.email && (
                  <span className="ml-3">{customer.email}</span>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Balance</p>
              <p
                className={`text-4xl font-bold ${
                  balance >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(balance)}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {/* Add Credit Dialog */}
            <Dialog
              open={addCreditOpen}
              onOpenChange={(open) => {
                setAddCreditOpen(open);
                if (!open) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button>Add Credit</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Credit</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddCredit} className="space-y-4">
                  {transactionFormFields(
                    false,
                    amount,
                    setAmount,
                    type,
                    setType,
                    description,
                    setDescription,
                    notes,
                    setNotes,
                  )}
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setAddCreditOpen(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Adding..." : "Add Credit"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Use Credit Dialog */}
            <Dialog
              open={useCreditOpen}
              onOpenChange={(open) => {
                setUseCreditOpen(open);
                if (!open) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button variant="outline">Use Credit</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Use Credit</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUseCredit} className="space-y-4">
                  {transactionFormFields(
                    false,
                    amount,
                    setAmount,
                    type,
                    setType,
                    description,
                    setDescription,
                    notes,
                    setNotes,
                  )}
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setUseCreditOpen(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="destructive"
                      disabled={submitting}
                    >
                      {submitting ? "Processing..." : "Use Credit"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Edit Transaction Dialog */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setEditingTransaction(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditTransaction} className="space-y-4">
            {transactionFormFields(
              true,
              editAmount,
              setEditAmount,
              editType,
              setEditType,
              editDescription,
              setEditDescription,
              editNotes,
              setEditNotes,
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditDialogOpen(false);
                  setEditingTransaction(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {!transactions || transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No transactions yet.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Notes</TableHead>
                    {isManagerOrOwner && <TableHead className="w-24">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions
                    .slice(page * pageSize, (page + 1) * pageSize)
                    .map((tx) => (
                    <TableRow key={tx._id}>
                      <TableCell>{formatDate(tx.createdAt)}</TableCell>
                      <TableCell>
                        <span
                          className={`font-medium ${
                            tx.amount >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {tx.amount >= 0 ? "+" : ""}
                          {formatCurrency(tx.amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {TRANSACTION_TYPE_LABELS[
                            tx.type as TransactionType
                          ] ?? tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {tx.description || "-"}
                      </TableCell>
                      <TableCell>{tx.employeeName}</TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {tx.notes || "-"}
                      </TableCell>
                      {isManagerOrOwner && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(tx)}
                            >
                              Edit
                            </Button>
                            {isOwner && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() =>
                                  handleDeleteTransaction(tx._id)
                                }
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {transactions.length > pageSize && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, transactions.length)} of {transactions.length}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage(page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={(page + 1) * pageSize >= transactions.length}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
