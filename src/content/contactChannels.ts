// Official contact channels and service-specific WhatsApp messages.
export const FREIGHT_WHATSAPP = "233208878817";
export const CUSTOMER_SERVICE_WHATSAPP = "233555709463";
export const CUSTOMER_SERVICE_CALL = "+233307001743";
export const CONTACT_EMAIL = "Amoliga92@gmail.com";
export const BUY_YUAN_URL = "https://wa.link/uo00f7";
export const REPACKING_FORM_URL = "https://forms.gle/4vHq2uZGDMAGvrwu5";

export function whatsappLink(phone: string, message: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export type ServiceKey = "newCustomer" | "visa" | "port" | "freight" | "customerService";

export const SERVICE_WHATSAPP: Record<ServiceKey, { phone: string; message: string }> = {
  newCustomer: {
    phone: FREIGHT_WHATSAPP,
    message: "Hello Amoliga Elite, I am a new customer (I live outside Ghana) and I would like to start shipping with you. Please guide me.",
  },
  visa: { phone: FREIGHT_WHATSAPP, message: "Hello Amoliga Elite, I need assistance with a China visa application." },
  port: { phone: FREIGHT_WHATSAPP, message: "Hello Amoliga Elite, I need help with port clearance for my cargo." },
  freight: { phone: FREIGHT_WHATSAPP, message: "Hello Amoliga Elite, I have a freight enquiry (sea / air / RoRo)." },
  customerService: {
    phone: CUSTOMER_SERVICE_WHATSAPP,
    message: "Hello Amoliga Elite Customer Service, I would like some information about my shipment.",
  },
};

export const serviceWhatsappLink = (key: ServiceKey) =>
  whatsappLink(SERVICE_WHATSAPP[key].phone, SERVICE_WHATSAPP[key].message);
