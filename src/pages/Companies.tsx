import { AppLayout } from "@/components/layout/AppLayout";
import { CompanyCard } from "@/components/company/CompanyCard";
import amoligaLogo from "@/assets/amoliga-logo.png";

// Company info - Amoliga Elite Freight
const companyInfo = {
  id: "1",
  name: "Amoliga Elite Freight & Logistics",
  logo: amoligaLogo,
  manager: "Elizabeth Amoliga",
  phone: "+233 30 700 1743",
  phone2: "+233 20 887 8817",
  email: "aeflogistics@gmail.com",
  whatsapp: "+233 20 887 8817",
  chinaAddress: "Room 505, Building A, International Trade Center, Guangzhou, China",
  ghanaAddress: "No. 15 Liberation Road, Airport Residential Area, Accra, Ghana",
  services: "Business & Personal Shipping Services. Reliable shipping from China to Ghana & West Africa within 45 days.",
};

export default function Companies() {
  return (
    <AppLayout title="About Us">
      <div className="px-4 py-5 space-y-5">
        {/* Header */}
        <div>
          <h1 className="font-display font-bold text-2xl mb-1">About Amoliga Elite</h1>
          <p className="text-muted-foreground text-sm">
            Your trusted partner for Ghana-China shipping
          </p>
        </div>

        {/* Company Info */}
        <div className="animate-scale-in">
          <CompanyCard {...companyInfo} />
        </div>

        {/* Info Banner */}
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 mt-6">
          <p className="text-sm text-center text-muted-foreground">
            Contact us today to start shipping with Amoliga Elite Freight & Logistics.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
