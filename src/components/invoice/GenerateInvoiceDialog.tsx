import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateInvoice } from "@/hooks/useInvoices";
import { useShipments } from "@/hooks/useShipments";
import { Receipt, Loader2, Package } from "lucide-react";

interface GenerateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedShipmentId?: string;
}

export function GenerateInvoiceDialog({ open, onOpenChange, preselectedShipmentId }: GenerateInvoiceDialogProps) {
  const [shipmentId, setShipmentId] = useState(preselectedShipmentId || "");
  const [amount, setAmount] = useState("");
  const [taxAmount, setTaxAmount] = useState("");
  const [notes, setNotes] = useState("");
  
  const { shipments } = useShipments();
  const createInvoice = useCreateInvoice();
  
  // Only show shipments that have arrived
  const arrivedShipments = shipments.filter(s => s.status === "arrived" || s.status === "delivered");
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!shipmentId || !amount) return;
    
    await createInvoice.mutateAsync({
      shipment_id: shipmentId,
      amount: parseFloat(amount),
      tax_amount: taxAmount ? parseFloat(taxAmount) : 0,
      notes: notes || undefined,
    });
    
    // Reset form and close
    setShipmentId("");
    setAmount("");
    setTaxAmount("");
    setNotes("");
    onOpenChange(false);
  };
  
  const selectedShipment = shipments.find(s => s.id === shipmentId);
  const totalAmount = (parseFloat(amount) || 0) + (parseFloat(taxAmount) || 0);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-accent" />
            Generate Invoice
          </DialogTitle>
          <DialogDescription>
            Create an invoice for your arrived shipment
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shipment">Select Shipment</Label>
            <Select value={shipmentId} onValueChange={setShipmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a shipment" />
              </SelectTrigger>
              <SelectContent>
                {arrivedShipments.length === 0 ? (
                  <div className="p-3 text-center text-sm text-muted-foreground">
                    No arrived shipments available
                  </div>
                ) : (
                  arrivedShipments.map((shipment) => (
                    <SelectItem key={shipment.id} value={shipment.id}>
                      {shipment.tracking_number} - {shipment.product}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          {selectedShipment && (
            <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
              <p><strong>Product:</strong> {selectedShipment.product}</p>
              <p><strong>Route:</strong> {selectedShipment.origin} → {selectedShipment.destination}</p>
              {selectedShipment.weight && <p><strong>Weight:</strong> {selectedShipment.weight} kg</p>}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (GH₵)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax">Tax Amount (GH₵)</Label>
              <Input
                id="tax"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={taxAmount}
                onChange={(e) => setTaxAmount(e.target.value)}
              />
            </div>
          </div>
          
          {amount && (
            <div className="p-3 bg-accent/10 rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>GH₵ {(parseFloat(amount) || 0).toFixed(2)}</span>
              </div>
              {taxAmount && parseFloat(taxAmount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Tax:</span>
                  <span>GH₵ {parseFloat(taxAmount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold mt-2 pt-2 border-t border-border">
                <span>Total:</span>
                <span>GH₵ {totalAmount.toFixed(2)}</span>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full"
            disabled={!shipmentId || !amount || createInvoice.isPending}
          >
            {createInvoice.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Receipt className="w-4 h-4 mr-2" />
            )}
            Generate Invoice
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
