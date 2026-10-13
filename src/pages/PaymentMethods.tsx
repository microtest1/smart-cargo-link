import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Phone, 
  Smartphone,
  CheckCircle2,
  Star
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PaymentMethod {
  id: string;
  type: "momo" | "vodafone" | "airteltigo" | "card";
  name: string;
  details: string;
  isDefault: boolean;
}

const paymentProviders = [
  { id: "momo", name: "MTN MoMo", icon: Phone, color: "bg-yellow-500" },
  { id: "vodafone", name: "Vodafone Cash", icon: Smartphone, color: "bg-red-500" },
  { id: "airteltigo", name: "AirtelTigo Money", icon: Smartphone, color: "bg-blue-500" },
  { id: "card", name: "Debit/Credit Card", icon: CreditCard, color: "bg-gray-700" },
];

export default function PaymentMethods() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    { id: "1", type: "momo", name: "MTN MoMo", details: "024 XXX XXXX", isDefault: true },
  ]);

  const handleAddPaymentMethod = () => {
    if (!selectedProvider) {
      toast({ title: "Error", description: "Please select a payment provider", variant: "destructive" });
      return;
    }

    if (selectedProvider === "card") {
      if (!cardNumber || !cardName || !cardExpiry) {
        toast({ title: "Error", description: "Please fill in all card details", variant: "destructive" });
        return;
      }
    } else {
      if (!phoneNumber) {
        toast({ title: "Error", description: "Please enter your phone number", variant: "destructive" });
        return;
      }
    }

    const provider = paymentProviders.find(p => p.id === selectedProvider);
    const newMethod: PaymentMethod = {
      id: Date.now().toString(),
      type: selectedProvider as PaymentMethod["type"],
      name: provider?.name || "",
      details: selectedProvider === "card" ? `**** **** **** ${cardNumber.slice(-4)}` : phoneNumber,
      isDefault: paymentMethods.length === 0,
    };

    setPaymentMethods(prev => [...prev, newMethod]);
    setIsAddDialogOpen(false);
    setSelectedProvider(null);
    setPhoneNumber("");
    setCardNumber("");
    setCardName("");
    setCardExpiry("");

    toast({ title: "Success", description: "Payment method added successfully" });
  };

  const handleSetDefault = (id: string) => {
    setPaymentMethods(prev => prev.map(m => ({
      ...m,
      isDefault: m.id === id
    })));
    toast({ title: "Default Updated", description: "Default payment method updated" });
  };

  const handleDelete = (id: string) => {
    const method = paymentMethods.find(m => m.id === id);
    if (method?.isDefault && paymentMethods.length > 1) {
      toast({ title: "Error", description: "Cannot delete default payment method. Set another as default first.", variant: "destructive" });
      return;
    }
    setPaymentMethods(prev => prev.filter(m => m.id !== id));
    toast({ title: "Deleted", description: "Payment method removed" });
  };

  return (
    <AppLayout title="Payment Methods">
      <div className="px-4 py-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-2xl mb-1">Payment Methods</h1>
            <p className="text-muted-foreground text-sm">Manage your payment options</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Payment Method</DialogTitle>
                <DialogDescription>Choose a payment provider and enter your details</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                  {paymentProviders.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => setSelectedProvider(provider.id)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                        selectedProvider === provider.id
                          ? "border-accent bg-accent/10"
                          : "border-border hover:border-accent/50"
                      )}
                    >
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white", provider.color)}>
                        <provider.icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-medium text-center">{provider.name}</span>
                    </button>
                  ))}
                </div>

                {selectedProvider && selectedProvider !== "card" && (
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input
                      placeholder="024 XXX XXXX"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                )}

                {selectedProvider === "card" && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Card Number</Label>
                      <Input
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Name on Card</Label>
                      <Input
                        placeholder="John Doe"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Expiry Date</Label>
                      <Input
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddPaymentMethod}>Add Method</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Payment Methods List */}
        <div className="space-y-3">
          {paymentMethods.map((method) => {
            const provider = paymentProviders.find(p => p.id === method.type);
            const Icon = provider?.icon || CreditCard;
            
            return (
              <Card key={method.id} className={cn(
                "transition-all",
                method.isDefault && "ring-2 ring-accent"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center text-white",
                      provider?.color || "bg-gray-500"
                    )}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{method.name}</h3>
                        {method.isDefault && (
                          <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">Default</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{method.details}</p>
                    </div>
                    <div className="flex gap-2">
                      {!method.isDefault && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSetDefault(method.id)}
                          title="Set as default"
                        >
                          <Star className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(method.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {paymentMethods.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-medium mb-1">No payment methods</p>
            <p className="text-sm text-muted-foreground mb-4">
              Add a payment method to get started
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Payment Method
            </Button>
          </div>
        )}

        {/* Payment Info */}
        <Card className="bg-accent/5 border-accent/20">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm mb-1">Secure Payments</h4>
                <p className="text-xs text-muted-foreground">
                  Your payment information is encrypted and secure. We support MTN MoMo, Vodafone Cash, AirtelTigo Money, and debit/credit cards.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
