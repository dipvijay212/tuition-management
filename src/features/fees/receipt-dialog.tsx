"use client";
import { useState } from "react";
import { Receipt, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatINR, formatDate } from "@/lib/utilities/format";

type ReceiptData = {
  receiptNo: string;
  studentName: string;
  admissionNo: string;
  amount: number;
  paymentDate: string;
  method: string;
  reference?: string | null;
  items?: { description: string; amount: number }[];
};

export function ReceiptDialog({ receipt }: { receipt: ReceiptData }) {
  const [open, setOpen] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="text-xs text-primary hover:underline">
            <Receipt className="size-3.5 mr-1" />
            {receipt.receiptNo}
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-8">
            <DialogTitle>Fee Receipt</DialogTitle>
            <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden">
              <Printer className="size-3.5 mr-1" /> Print
            </Button>
          </div>
          <DialogDescription>Receipt No: {receipt.receiptNo}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 rounded-xl border p-4 bg-muted/10 text-sm">
          <div className="grid grid-cols-2 gap-2 border-b pb-3">
            <div>
              <span className="text-xs text-muted-foreground uppercase">Student</span>
              <div className="font-semibold text-foreground">{receipt.studentName}</div>
              <div className="text-xs text-muted-foreground">Adm: {receipt.admissionNo}</div>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground uppercase">Date</span>
              <div className="font-medium text-foreground">{formatDate(receipt.paymentDate)}</div>
              <div className="text-xs text-muted-foreground uppercase">{receipt.method}</div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between py-1 border-b text-xs uppercase text-muted-foreground font-medium">
              <span>Item Description</span>
              <span>Amount</span>
            </div>
            {(receipt.items && receipt.items.length > 0) ? (
              receipt.items.map((it, idx) => (
                <div key={idx} className="flex justify-between py-1 text-xs">
                  <span>{it.description}</span>
                  <span className="font-medium">{formatINR(it.amount)}</span>
                </div>
              ))
            ) : (
              <div className="flex justify-between py-1 text-xs">
                <span>Tuition / Course Fee Payment</span>
                <span className="font-medium">{formatINR(receipt.amount)}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between border-t pt-3 font-bold text-base">
            <span>Total Paid</span>
            <span className="text-primary">{formatINR(receipt.amount)}</span>
          </div>

          {receipt.reference && (
            <div className="text-xs text-muted-foreground pt-1">
              Ref: <span className="font-mono">{receipt.reference}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

