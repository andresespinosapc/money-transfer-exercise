"use client";

import { trpc } from "@/lib/trpc";
import { QuoteList } from "@/components/quote-list";
import { TransferList } from "@/components/transfer-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardPage() {
  const quotes = trpc.quote.list.useQuery();
  const transfers = trpc.transfer.list.useQuery();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link href="/dashboard/quote/new">
          <Button>New Quote</Button>
        </Link>
      </div>

      <Tabs defaultValue="quotes">
        <TabsList>
          <TabsTrigger value="quotes">Quotes</TabsTrigger>
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
        </TabsList>
        <TabsContent value="quotes" className="mt-4">
          <QuoteList
            quotes={quotes.data ?? []}
            isLoading={quotes.isLoading}
            onTransferCreated={() => {
              quotes.refetch();
              transfers.refetch();
            }}
          />
        </TabsContent>
        <TabsContent value="transfers" className="mt-4">
          <TransferList
            transfers={transfers.data ?? []}
            isLoading={transfers.isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
