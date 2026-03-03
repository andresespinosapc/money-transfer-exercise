"use client";

import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Quote = {
  id: string;
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: string;
  targetAmount: string;
  exchangeRate: string;
  feeAmount: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
};

type Props = {
  quotes: Quote[];
  isLoading: boolean;
  onTransferCreated: () => void;
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  saved: "default",
  accepted: "secondary",
  expired: "destructive",
};

export function QuoteList({ quotes, isLoading, onTransferCreated }: Props) {
  const createTransfer = trpc.transfer.create.useMutation({
    onSuccess: () => {
      onTransferCreated();
    },
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading quotes...</p>;
  }

  if (quotes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No quotes yet</CardTitle>
          <CardDescription>
            Create your first quote to get started.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead className="text-right">Send</TableHead>
            <TableHead className="text-right">Receive</TableHead>
            <TableHead className="text-right">Fee</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotes.map((q) => (
            <TableRow key={q.id}>
              <TableCell>{q.sourceCurrency}</TableCell>
              <TableCell>{q.targetCurrency}</TableCell>
              <TableCell className="text-right">
                {formatAmount(q.sourceAmount)}
              </TableCell>
              <TableCell className="text-right">
                {formatAmount(q.targetAmount)}
              </TableCell>
              <TableCell className="text-right">
                {formatAmount(q.feeAmount)}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant[q.status] ?? "outline"}>
                  {q.status}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(q.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                {q.status === "saved" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={createTransfer.isPending}
                    onClick={() => createTransfer.mutate({ quoteId: q.id })}
                  >
                    Transfer
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function formatAmount(value: string) {
  return parseFloat(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
