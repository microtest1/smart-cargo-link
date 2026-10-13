import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  HelpCircle, MessageCircle, Phone, Mail, Search,
  ExternalLink, Send, Package, Landmark, Headphones,
  Truck, Monitor, Warehouse
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const supportContacts = [
  {
    icon: Package,
    title: "Chief Warehouse Manager (China)",
    badge: "China Warehouse",
    phone: "",
    phoneDisplay: "",
    reasons: [
      "Questions about goods received at the China warehouse",
      "Warehouse package verification",
      "Shipping mark issues",
      "Package confirmation from suppliers",
    ],
  },
  {
    icon: Landmark,
    title: "Billing Officer",
    badge: "Billing & Payments",
    phone: "0307001743",
    phoneDisplay: "030 700 1743",
    reasons: [
      "Invoice inquiries",
      "Payment confirmation",
      "Billing clarification",
      "Financial transactions related to shipment",
    ],
  },
  {
    icon: Headphones,
    title: "Customer Service & Feedback",
    badge: "Complaints & Support",
    phone: "0208878817",
    phoneDisplay: "020 887 8817",
    reasons: [
      "General customer inquiries",
      "Feedback about services",
      "Complaints or service issues",
      "Account assistance",
    ],
  },
  {
    icon: Truck,
    title: "Delivery Request Support",
    badge: "Delivery",
    phone: "0555709463",
    phoneDisplay: "055 570 9463",
    reasons: [
      "Requesting delivery for goods",
      "Delivery scheduling",
      "Delivery follow-ups",
      "Shipment arrival confirmation",
    ],
  },
  {
    icon: Monitor,
    title: "ICT Support & Tracking Assistance",
    badge: "Technical",
    phone: "0307001745",
    phoneDisplay: "030 700 1745",
    reasons: [
      "Shipment tracking issues",
      "Platform technical problems",
      "Login or system errors",
      "Tracking code verification",
    ],
  },
  {
    icon: Warehouse,
    title: "Southern Zone National Warehouse Manager",
    badge: "Southern Zone",
    phone: "0307001746",
    phoneDisplay: "030 700 1746",
    reasons: [
      "Southern region shipment coordination",
      "Warehouse handling issues",
      "Delivery arrangements within the southern zone",
    ],
  },
  {
    icon: Warehouse,
    title: "Northern Zone & Northern Warehouse Manager",
    badge: "Northern Zone",
    phone: "0307001744",
    phoneDisplay: "030 700 1744",
    reasons: [
      "Northern region shipment coordination",
      "Warehouse management for northern deliveries",
      "Regional logistics inquiries",
    ],
  },
];

const faqs = [
  {
    question: "How do I track my shipment?",
    answer: "You can track your shipment by going to the Shipments page and entering your tracking number. You can also use the Smart Search feature to find your shipment using natural language queries."
  },
  {
    question: "What payment methods are accepted?",
    answer: "We accept MTN MoMo, Vodafone Cash, AirtelTigo Money, and debit/credit cards. You can manage your payment methods in the Payment Methods section of your profile."
  },
  {
    question: "How long does shipping from China take?",
    answer: "Standard shipping from China to Ghana typically takes 2-4 weeks depending on the shipping method and customs clearance."
  },
  {
    question: "What is my unique code used for?",
    answer: "Your unique code (e.g., AEF_00001) is used to identify your packages at our warehouses. Make sure to include this code when shipping items to our China warehouse address."
  },
  {
    question: "How do I request delivery?",
    answer: "Once your shipment arrives at our Ghana warehouse, you can request delivery through the app. Go to your container details and tap 'Request Delivery' to schedule a delivery."
  },
];

export default function HelpSupport() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [contactForm, setContactForm] = useState({ subject: "", message: "" });

  const filteredContacts = supportContacts.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.badge.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.reasons.some(r => r.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = async () => {
    if (!contactForm.subject || !contactForm.message) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    setIsSending(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSending(false);
    setIsContactDialogOpen(false);
    setContactForm({ subject: "", message: "" });
    toast({ title: "Message Sent", description: "We'll get back to you within 24 hours." });
  };

  return (
    <AppLayout title="Customer Support">
      <div className="px-4 py-5 space-y-5 pb-28">
        {/* Hero */}
        <div className="text-center">
          <h1 className="font-display font-bold text-2xl mb-2">Amoliga Elite Customer Support</h1>
          <h2 className="text-sm font-semibold text-primary mb-1">Service Directory</h2>
          <p className="text-muted-foreground text-xs leading-relaxed max-w-md mx-auto">
            For quick assistance, please contact the appropriate department based on your request. This helps us resolve your issue faster and more efficiently.
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search departments, services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>

        {/* Quick Contact Bar */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            className="flex flex-col items-center gap-1 h-auto py-3 rounded-xl"
            onClick={() => window.open("https://wa.me/233208878817", "_blank")}
          >
            <MessageCircle className="w-5 h-5 text-green-600" />
            <span className="text-[10px]">WhatsApp</span>
          </Button>
          <Button
            variant="outline"
            className="flex flex-col items-center gap-1 h-auto py-3 rounded-xl"
            onClick={() => window.location.href = "tel:+233307001743"}
          >
            <Phone className="w-5 h-5 text-primary" />
            <span className="text-[10px]">Call Us</span>
          </Button>
          <Button
            variant="outline"
            className="flex flex-col items-center gap-1 h-auto py-3 rounded-xl"
            onClick={() => setIsContactDialogOpen(true)}
          >
            <Mail className="w-5 h-5 text-accent" />
            <span className="text-[10px]">Email</span>
          </Button>
        </div>

        <Separator />

        {/* Support Directory */}
        <div className="space-y-3">
          {filteredContacts.map((contact) => (
            <Card key={contact.phone} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center gap-3 p-4 pb-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <contact.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm leading-tight">{contact.title}</h3>
                    <Badge variant="secondary" className="text-[10px] mt-1">{contact.badge}</Badge>
                  </div>
                </div>

                <div className="px-4 pb-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">When to contact:</p>
                  <ul className="space-y-1">
                    {contact.reasons.map((reason, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <span className="text-primary mt-0.5">•</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>

                {contact.phone && (
                <div className="border-t border-border px-4 py-2.5">
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full rounded-lg"
                    onClick={() => window.location.href = `tel:${contact.phone}`}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Call Now — {contact.phoneDisplay}
                  </Button>
                </div>
                )}
              </CardContent>
            </Card>
          ))}

          {filteredContacts.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No matching departments found.</p>
          )}
        </div>

        <Separator />

        {/* FAQs */}
        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Frequently Asked Questions
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {filteredFaqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left text-sm">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            {filteredFaqs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No results found.</p>
            )}
          </CardContent>
        </Card>

        {/* Email Dialog */}
        <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Contact Support</DialogTitle>
              <DialogDescription>Send us a message and we'll respond within 24 hours</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input placeholder="What's your issue about?" value={contactForm.subject} onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea placeholder="Describe your issue..." rows={5} value={contactForm.message} onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsContactDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSendMessage} disabled={isSending}>
                {isSending ? "Sending..." : <><Send className="w-4 h-4 mr-2" /> Send Message</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
