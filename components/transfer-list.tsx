"use client";

import { Badge } from "@/components/ui/badge";
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Transfer = {
  id: string;
  status: string;
  createdAt: Date;
  quote: {
    sourceCurrency: string;
    targetCurrency: string;
    sourceAmount: string;
    targetAmount: string;
    feeAmount: string;
  };
};

type Props = {
  transfers: Transfer[];
  isLoading: boolean;
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  processing: "default",
  completed: "secondary",
  failed: "destructive",
};

export function TransferList({ transfers, isLoading }: Props) {
  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading transfers...</p>
    );
  }

  if (transfers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No transfers yet</CardTitle>
          <CardDescription>
            Save a quote and submit it as a transfer to get started.
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
            <TableHead className="text-right">Sent</TableHead>
            <TableHead className="text-right">Received</TableHead>
            <TableHead className="text-right">Fee</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transfers.map((t) => (
            <TableRow key={t.id}>
              <TableCell>{t.quote.sourceCurrency}</TableCell>
              <TableCell>{t.quote.targetCurrency}</TableCell>
              <TableCell className="text-right">
                {formatAmount(t.quote.sourceAmount)}
              </TableCell>
              <TableCell className="text-right">
                {formatAmount(t.quote.targetAmount)}
              </TableCell>
              <TableCell className="text-right">
                {formatAmount(t.quote.feeAmount)}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant[t.status] ?? "outline"}>
                  {t.status}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(t.createdAt).toLocaleDateString()}
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
