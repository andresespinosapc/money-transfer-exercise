"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export type QuotePreview = {
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: string;
  targetAmount: string;
  exchangeRate: string;
  feePercentage: string;
  feeAmount: string;
};

type Props = {
  preview: QuotePreview;
  onSave: () => void;
  onReset: () => void;
  isSaving: boolean;
  saveError?: string;
};

export function QuoteResult({
  preview,
  onSave,
  onReset,
  isSaving,
  saveError,
}: Props) {
  const feePercent = (parseFloat(preview.feePercentage) * 100).toFixed(2);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quote Summary</CardTitle>
        <CardDescription>Review your transfer details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Row
            label="You send"
            value={`${formatAmount(preview.sourceAmount)} ${preview.sourceCurrency}`}
          />
          <Row
            label="Exchange rate"
            value={`1 ${preview.sourceCurrency} = ${parseFloat(preview.exchangeRate).toFixed(4)} ${preview.targetCurrency}`}
          />
          <Row
            label={`Fee (${feePercent}%)`}
            value={`-${formatAmount(preview.feeAmount)} ${preview.sourceCurrency}`}
          />
          <Separator />
          <Row
            label="They receive"
            value={`${formatAmount(preview.targetAmount)} ${preview.targetCurrency}`}
            bold
          />
        </div>

        {saveError && <p className="text-sm text-destructive">{saveError}</p>}

        <div className="flex gap-2">
          <Button onClick={onSave} disabled={isSaving} className="flex-1">
            {isSaving ? "Saving..." : "Save Quote"}
          </Button>
          <Button variant="outline" onClick={onReset}>
            Start Over
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}

function formatAmount(value: string) {
  return parseFloat(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
