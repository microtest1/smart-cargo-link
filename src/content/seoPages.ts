export interface SeoSection {
  h2: string;
  paragraphs?: string[];
  list?: string[];
}

export interface SeoFaq {
  q: string;
  a: string;
}

export interface SeoPage {
  slug: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  serviceName: string;
  sections: SeoSection[];
  faqs: SeoFaq[];
  related: string[];
  cta: { label: string; to: string };
}

const trackingCta = { label: "Track your shipment", to: "/track" };
const accountCta = { label: "Create a free account", to: "/signup" };

export const seoPages: SeoPage[] = [
  {
    slug: "/shipping-from-china-to-ghana",
    title: "Shipping from China to Ghana | Amoliga Elite Freight",
    description:
      "Ship goods from China to Ghana with Amoliga Elite Freight & Logistics — sea freight, air freight, cargo consolidation, China warehouse intake and delivery in Ghana.",
    h1: "Shipping from China to Ghana",
    intro:
      "Amoliga Elite Freight & Logistics moves cargo from suppliers and markets across China to Ghana. We receive your goods at our China warehouse, consolidate them, ship by sea or air, and hand them over to you in Ghana with tracking at every stage.",
    primaryKeyword: "shipping from China to Ghana",
    secondaryKeywords: [
      "China to Ghana shipping",
      "shipping goods from China to Ghana",
      "import from China to Ghana",
      "China cargo shipping Ghana",
    ],
    serviceName: "China to Ghana freight forwarding",
    sections: [
      {
        h2: "How our China to Ghana shipping service works",
        paragraphs: [
          "You create a free account, receive your unique shipping mark, and give that mark plus our China warehouse address to your supplier. When your cargo reaches the warehouse we record it against your account.",
        ],
        list: [
          "Create an account and get your shipping mark",
          "Send your supplier our China warehouse address",
          "We receive, check and record your goods",
          "Your cargo is consolidated into a container or air shipment",
          "You follow each stage from your dashboard",
          "You collect in Ghana or request delivery",
        ],
      },
      {
        h2: "Sea freight and air freight options",
        paragraphs: [
          "Sea freight suits bulky, heavy and non-urgent goods and is charged by volume in CBM. Air freight suits small, light, urgent or high-value goods and is charged mainly by weight. Most importers use sea freight for stock and air freight for samples and replacements.",
        ],
      },
      {
        h2: "Cargo consolidation from multiple suppliers",
        paragraphs: [
          "If you buy from several suppliers, each one can ship separately to our China warehouse. We hold the parcels under your shipping mark and consolidate them into a single shipment, which normally reduces cost compared with shipping each parcel on its own.",
        ],
      },
      {
        h2: "What you can ship",
        paragraphs: [
          "We handle general merchandise, clothing, shoes, accessories, electronics accessories, spare parts, machinery, household goods, packaging materials and shop stock. Restricted and prohibited items are not accepted — confirm with our team before your supplier ships anything unusual.",
        ],
      },
      {
        h2: "Tracking and support",
        paragraphs: [
          "Every shipment moves through clear stages, from warehouse receipt through transit to arrival and pickup readiness. You get updates in your dashboard and by SMS, and you can check status any time on our shipment tracking page.",
        ],
      },
    ],
    faqs: [
      {
        q: "How long does shipping from China to Ghana take?",
        a: "Sea freight is the slower option and air freight is considerably faster. Actual transit time depends on sailing schedules, consolidation timing and port clearance, so contact our team for the current estimate for your route.",
      },
      {
        q: "How much does it cost to ship from China to Ghana?",
        a: "Sea freight is quoted per CBM and air freight mainly by weight, so cost depends on the size, weight and nature of your goods. Send us your dimensions and weight for a current quote — we do not publish fixed rates because they change.",
      },
      {
        q: "Do I need an account to ship?",
        a: "Yes. Your free account gives you a unique shipping mark so we can match your parcels at the China warehouse and show you tracking in your dashboard.",
      },
    ],
    related: [
      "/sea-freight-china-to-ghana",
      "/air-freight-china-to-ghana",
      "/cargo-consolidation-china-to-ghana",
      "/china-warehouse",
    ],
    cta: accountCta,
  },
  {
    slug: "/sea-freight-china-to-ghana",
    title: "Sea Freight from China to Ghana | Amoliga Elite Freight",
    description:
      "Sea freight from China to Ghana with Amoliga Elite Freight & Logistics. LCL and FCL container shipping to Tema Port, CBM-based pricing and full shipment tracking.",
    h1: "Sea Freight from China to Ghana",
    intro:
      "Sea freight is the main way importers move volume from China to Ghana. We consolidate cargo at our China warehouse, load it into containers and route it to Ghana through Tema Port, with each stage visible in your account.",
    primaryKeyword: "sea freight China to Ghana",
    secondaryKeywords: [
      "sea cargo China to Ghana",
      "LCL shipping China to Ghana",
      "FCL shipping China to Ghana",
      "container shipping China to Ghana",
    ],
    serviceName: "Sea freight forwarding from China to Ghana",
    sections: [
      {
        h2: "LCL and FCL sea freight",
        paragraphs: [
          "LCL (less than container load) means your cargo shares a container with other shippers — the normal choice when you do not have enough volume to justify a full container. FCL (full container load) means the whole container is yours, which usually gives a better rate per CBM once your volume is large enough.",
        ],
      },
      {
        h2: "How CBM pricing works",
        paragraphs: [
          "Sea freight is charged by volume. CBM (cubic metre) is length × width × height in metres for each carton, added together for the shipment. Well-packed, regularly shaped cartons take less volume and therefore cost less than loose or oversized packaging.",
        ],
      },
      {
        h2: "Shipping to Tema Port",
        paragraphs: [
          "Containers arriving in Ghana are handled at Tema Port. Once a container is discharged and processed, we update its status and notify the customers whose cargo is inside so they can prepare for pickup or delivery.",
        ],
      },
      {
        h2: "Packing advice for sea cargo",
        list: [
          "Ask suppliers to use strong double-wall cartons",
          "Label every carton with your shipping mark",
          "Avoid oversized boxes with empty space inside",
          "Wrap fragile goods properly — sea cargo is handled many times",
          "Keep supplier invoices and packing lists for your records",
        ],
      },
    ],
    faqs: [
      {
        q: "Is sea freight cheaper than air freight from China to Ghana?",
        a: "For bulky or heavy goods, sea freight is normally the more economical option because it is priced by volume rather than weight. Very small, light consignments can sometimes be close in cost, so compare both for your specific cargo.",
      },
      {
        q: "What is the minimum volume for LCL shipping?",
        a: "Small consignments are accepted through consolidation. Contact our team with your carton dimensions so we can confirm the minimum that applies to your shipment.",
      },
      {
        q: "Which port in Ghana do containers arrive at?",
        a: "Sea cargo for our customers is routed through Tema Port.",
      },
    ],
    related: [
      "/container-shipping-china-to-ghana",
      "/cargo-consolidation-china-to-ghana",
      "/shipping-to-tema-ghana",
      "/air-freight-china-to-ghana",
    ],
    cta: accountCta,
  },
  {
    slug: "/air-freight-china-to-ghana",
    title: "Air Freight from China to Ghana | Amoliga Elite Freight",
    description:
      "Air freight from China to Ghana for urgent, light and high-value cargo. Weight-based pricing, China warehouse intake and shipment tracking with Amoliga Elite Freight.",
    h1: "Air Freight from China to Ghana",
    intro:
      "Air freight is the option when time matters more than volume: samples, replacement parts, fashion drops, electronics accessories and any stock you need in Ghana quickly.",
    primaryKeyword: "air freight China to Ghana",
    secondaryKeywords: [
      "air cargo China to Ghana",
      "fast shipping from China to Ghana",
      "China to Ghana air shipping",
    ],
    serviceName: "Air freight forwarding from China to Ghana",
    sections: [
      {
        h2: "When to choose air freight",
        list: [
          "Samples you need to approve before a bulk order",
          "Urgent restocks for a shop or online store",
          "Small, light, high-value items",
          "Spare parts holding up a repair or installation",
        ],
      },
      {
        h2: "How air freight is priced",
        paragraphs: [
          "Air freight is charged on chargeable weight — the greater of the actual weight and the volumetric weight calculated from the carton dimensions. Compact, dense cargo is therefore much more economical by air than large, light cargo.",
        ],
      },
      {
        h2: "Goods that cannot travel by air",
        paragraphs: [
          "Batteries, liquids, aerosols, powders, magnets and other regulated items face strict airline rules and are often refused. Tell our team what you are buying before your supplier ships so we can advise on the right mode.",
        ],
      },
    ],
    faqs: [
      {
        q: "How fast is air freight from China to Ghana?",
        a: "Air freight is significantly faster than sea freight. Exact timing depends on flight availability, consolidation cut-offs and clearance, so ask our team for the current estimate.",
      },
      {
        q: "Can I combine air and sea freight?",
        a: "Yes. Many customers send urgent items by air and the bulk of the same order by sea. Both shipments appear separately in your dashboard.",
      },
    ],
    related: [
      "/sea-freight-china-to-ghana",
      "/shipping-from-china-to-ghana",
      "/china-warehouse",
    ],
    cta: accountCta,
  },
  {
    slug: "/cargo-consolidation-china-to-ghana",
    title: "Cargo Consolidation China to Ghana | Amoliga Elite Freight",
    description:
      "Consolidate cargo from multiple Chinese suppliers into one shipment to Ghana. Warehouse intake, repackaging, CBM measurement and combined sea or air shipping.",
    h1: "Cargo Consolidation from China to Ghana",
    intro:
      "Consolidation means several supplier deliveries are combined into a single shipment under your shipping mark. It is the standard approach for importers buying from different factories and markets in China.",
    primaryKeyword: "cargo consolidation China to Ghana",
    secondaryKeywords: [
      "consolidated shipping China to Ghana",
      "groupage shipping China to Ghana",
      "China warehouse consolidation Ghana",
      "LCL freight China to Ghana",
    ],
    serviceName: "Cargo consolidation from China to Ghana",
    sections: [
      {
        h2: "How consolidation works",
        list: [
          "Each supplier ships to our China warehouse quoting your shipping mark",
          "We receive and record each parcel against your account",
          "You decide when to release the cargo for shipping",
          "We measure the consolidated volume in CBM",
          "Everything travels together as one shipment to Ghana",
        ],
      },
      {
        h2: "Why importers consolidate",
        paragraphs: [
          "Shipping five parcels separately usually costs more than shipping the same goods once. Consolidation also gives you one set of documents, one arrival date to plan around and one collection in Ghana instead of chasing several deliveries.",
        ],
      },
      {
        h2: "Repackaging and volume reduction",
        paragraphs: [
          "Suppliers often use boxes far larger than the goods inside, and you pay for that empty space. Where it is safe to do so we can repack cargo to reduce CBM. Request repackaging before your goods are loaded.",
        ],
      },
      {
        h2: "Understanding your CBM",
        paragraphs: [
          "Your invoice is based on the measured volume of the consolidated cargo. Read our guide on how CBM is calculated so you can estimate volume before your supplier ships.",
        ],
      },
    ],
    faqs: [
      {
        q: "How long can my goods stay in the China warehouse?",
        a: "Goods are held while you complete your other purchases. Ask our team about the current free storage window before your parcels arrive so you can plan your consolidation.",
      },
      {
        q: "Can you tell me when each supplier delivers?",
        a: "Yes. Each receipt is recorded against your shipping mark and you are notified, so you can see what has arrived and what is still outstanding.",
      },
    ],
    related: [
      "/china-warehouse",
      "/sea-freight-china-to-ghana",
      "/resources/how-cbm-is-calculated",
      "/shipping-from-china-to-ghana",
    ],
    cta: accountCta,
  },
  {
    slug: "/container-shipping-china-to-ghana",
    title: "Container Shipping China to Ghana | LCL & FCL | Amoliga Elite",
    description:
      "Container shipping from China to Ghana. LCL groupage and FCL container loading, Tema Port arrival handling and container-level tracking with Amoliga Elite Freight.",
    h1: "Container Shipping from China to Ghana",
    intro:
      "Cargo moving by sea from China to Ghana travels in containers. Whether you share space with other importers or book a full container, your goods are tracked at container level in your dashboard.",
    primaryKeyword: "container shipping China to Ghana",
    secondaryKeywords: [
      "FCL shipping China to Ghana",
      "LCL shipping China to Ghana",
      "sea cargo China to Ghana",
    ],
    serviceName: "Container shipping from China to Ghana",
    sections: [
      {
        h2: "Shared containers (LCL)",
        paragraphs: [
          "Most customers ship LCL. Your consolidated cargo is loaded alongside other importers' goods, and you pay for the volume you occupy. It is the practical option for shop stock and mixed orders.",
        ],
      },
      {
        h2: "Full containers (FCL)",
        paragraphs: [
          "Once your volume is large enough, a full container usually gives a better rate per CBM and less handling of your cargo. Talk to our team about switching from LCL to FCL as your import volumes grow.",
        ],
      },
      {
        h2: "Container tracking in your dashboard",
        paragraphs: [
          "Each container we ship has its own reference. Your account shows which container your cargo is loaded in and the stage that container has reached, from loading in China to arrival and readiness for pickup in Ghana.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can I see which container my goods are in?",
        a: "Yes. Sign in to your dashboard and open your cargo — the container reference and its current stage are shown there.",
      },
      {
        q: "Should I choose LCL or FCL?",
        a: "LCL suits smaller and mixed consignments; FCL becomes worthwhile when your volume regularly fills a container. Send us your typical CBM and we will advise.",
      },
    ],
    related: [
      "/sea-freight-china-to-ghana",
      "/shipping-to-tema-ghana",
      "/cargo-consolidation-china-to-ghana",
    ],
    cta: trackingCta,
  },
  {
    slug: "/china-warehouse",
    title: "China Warehouse Address for Ghana Shipping | Amoliga Elite",
    description:
      "Send your supplier purchases to the Amoliga Elite China warehouse. Goods are received under your shipping mark, consolidated and shipped to Ghana by sea or air.",
    h1: "Our China Warehouse for Ghana Shipping",
    intro:
      "Our China warehouse is the collection point for goods heading to Ghana. Suppliers deliver there, we record the cargo under your shipping mark, and your consolidated shipment leaves for Ghana from that point.",
    primaryKeyword: "China warehouse for Ghana shipping",
    secondaryKeywords: [
      "China warehouse consolidation Ghana",
      "Guangzhou to Ghana shipping",
      "Yiwu to Ghana shipping",
      "Shenzhen to Ghana shipping",
    ],
    serviceName: "China warehouse receipt and consolidation",
    sections: [
      {
        h2: "Getting the warehouse address",
        paragraphs: [
          "The current warehouse addresses — air cargo and sea cargo are handled at different locations — are published on our homepage warehouse section. Always copy the address exactly as shown and include your shipping mark, because parcels without a mark cannot be matched to an account.",
        ],
      },
      {
        h2: "Your shipping mark",
        paragraphs: [
          "Every customer account has a unique code. That code is your shipping mark and must appear on every carton and on the delivery note your supplier gives the courier in China.",
        ],
      },
      {
        h2: "Buying from Guangzhou, Yiwu, Shenzhen and Shanghai",
        paragraphs: [
          "Suppliers and market agents anywhere in mainland China can send goods to the warehouse using domestic courier or trucking. Customers buying in Guangzhou, Yiwu, Shenzhen, Shanghai and the surrounding manufacturing regions all use the same process.",
        ],
      },
      {
        h2: "What happens after arrival",
        list: [
          "Cargo is checked in against your shipping mark",
          "You are notified that the goods were received",
          "Parcels are held for consolidation with your other orders",
          "Volume is measured and the shipment is loaded",
          "Tracking continues until pickup in Ghana",
        ],
      },
    ],
    faqs: [
      {
        q: "What if my supplier forgets the shipping mark?",
        a: "Unmarked parcels are difficult to match. Contact our team immediately with the courier tracking number, sender name and a description of the goods so we can try to identify them.",
      },
      {
        q: "Do you inspect goods at the warehouse?",
        a: "We check cartons on receipt and record them against your account. We do not open sealed cartons to verify supplier contents unless you specifically arrange it.",
      },
    ],
    related: [
      "/cargo-consolidation-china-to-ghana",
      "/shipping-from-china-to-ghana",
      "/sea-freight-china-to-ghana",
    ],
    cta: accountCta,
  },
  {
    slug: "/shipping-to-tema-ghana",
    title: "Shipping from China to Tema, Ghana | Amoliga Elite Freight",
    description:
      "Sea cargo from China to Tema Port, Ghana. Container arrival handling, pickup in Tema and onward delivery to Accra, Kumasi and Tamale with Amoliga Elite Freight.",
    h1: "Shipping from China to Tema, Ghana",
    intro:
      "Tema Port is where sea cargo from China enters Ghana. This page explains what happens when your container arrives, how to collect your goods and how delivery works to other cities.",
    primaryKeyword: "China to Tema shipping",
    secondaryKeywords: [
      "sea freight China to Tema Ghana",
      "China to Tema Port shipping",
      "China to Accra shipping",
      "China to Kumasi shipping",
    ],
    serviceName: "China to Tema Port sea freight",
    sections: [
      {
        h2: "When your container reaches Tema Port",
        paragraphs: [
          "After the vessel is discharged, the container goes through port and destination processes before cargo can be released. We update the container status in the system as it moves through these stages and notify the customers whose goods are on board.",
        ],
      },
      {
        h2: "Collecting your cargo",
        paragraphs: [
          "Once your shipment is marked ready, settle the invoice in your account and collect with valid ID. Keep your shipping mark and shipment reference handy — they are how your cartons are identified.",
        ],
      },
      {
        h2: "Delivery to Accra, Kumasi and Tamale",
        paragraphs: [
          "If you cannot collect in person, request delivery from your dashboard. You choose a delivery partner and enter the address, and the cost is calculated based on the destination before you confirm.",
        ],
      },
    ],
    faqs: [
      {
        q: "Do you handle customs clearance?",
        a: "Destination handling is part of our service. Duties and any charges assessed at the port depend on your goods and current Ghana Customs requirements — ask our team what applies to your shipment.",
      },
      {
        q: "Can someone else collect on my behalf?",
        a: "Yes, with your written authorisation and the collector's valid ID. Inform our team in advance.",
      },
    ],
    related: [
      "/sea-freight-china-to-ghana",
      "/door-to-door-shipping-china-ghana",
      "/container-shipping-china-to-ghana",
    ],
    cta: trackingCta,
  },
  {
    slug: "/door-to-door-shipping-china-ghana",
    title: "Door to Door Shipping China to Ghana | Amoliga Elite Freight",
    description:
      "Door to door shipping from China to Ghana: supplier pickup to our China warehouse, sea or air freight, then delivery to your address in Accra, Tema, Kumasi or Tamale.",
    h1: "Door to Door Shipping from China to Ghana",
    intro:
      "Door to door means you do not have to handle the middle of the journey. Your supplier delivers to our China warehouse, we ship the cargo, and we arrange delivery to your address in Ghana.",
    primaryKeyword: "door to door shipping China to Ghana",
    secondaryKeywords: [
      "China to Ghana door to door",
      "delivery from China to Accra",
      "China to Ghana logistics",
    ],
    serviceName: "Door to door shipping from China to Ghana",
    sections: [
      {
        h2: "What door to door covers",
        list: [
          "Receipt of supplier deliveries at our China warehouse",
          "Consolidation and loading",
          "Sea or air freight to Ghana",
          "Destination handling on arrival",
          "Delivery to your address in Ghana",
        ],
      },
      {
        h2: "Requesting delivery in Ghana",
        paragraphs: [
          "When your shipment is ready, open it in your dashboard and request delivery. Choose a delivery partner, enter your location and contact details, and confirm — the delivery charge is shown before you pay.",
        ],
      },
      {
        h2: "Tracking the final leg",
        paragraphs: [
          "Delivery requests appear in your account with their own status, so you can see when a partner has been assigned and when your goods are on the way.",
        ],
      },
    ],
    faqs: [
      {
        q: "Which cities do you deliver to?",
        a: "Deliveries are arranged across Ghana, including Accra, Tema, Kumasi and Tamale. The charge depends on the destination and is shown before you confirm.",
      },
      {
        q: "Can I still collect myself?",
        a: "Yes. Delivery is optional — you can collect your cargo instead once it is marked ready.",
      },
    ],
    related: ["/shipping-to-tema-ghana", "/shipping-from-china-to-ghana", "/shipment-tracking"],
    cta: accountCta,
  },
  {
    slug: "/freight-forwarding-ghana",
    title: "Freight Forwarding Company in Ghana | Amoliga Elite Freight",
    description:
      "Amoliga Elite Freight & Logistics is a Ghana-based freight forwarding and logistics company handling China to Ghana sea freight, air freight and cargo consolidation.",
    h1: "Freight Forwarding & Logistics Company in Ghana",
    intro:
      "Amoliga Elite Freight & Logistics is a Ghanaian freight forwarding and logistics company focused on the China–Ghana trade route. We work with importers, traders and businesses moving goods from Chinese suppliers into Ghana.",
    primaryKeyword: "freight forwarding company in Ghana",
    secondaryKeywords: [
      "logistics company in Ghana",
      "shipping company in Ghana",
      "China shipping agent in Ghana",
      "freight forwarder China to Ghana",
    ],
    serviceName: "Freight forwarding services in Ghana",
    sections: [
      {
        h2: "What a freight forwarder does for you",
        paragraphs: [
          "A freight forwarder organises the movement of your goods: receiving cargo, consolidating it, booking freight space, managing documents and coordinating destination handling. You deal with one company instead of suppliers, couriers, carriers and port agents separately.",
        ],
      },
      {
        h2: "Our services",
        list: [
          "China warehouse receipt and cargo consolidation",
          "Sea freight (LCL and FCL) from China to Ghana",
          "Air freight for urgent and light cargo",
          "Repackaging to reduce shipping volume",
          "Destination handling and pickup coordination in Ghana",
          "Delivery across Ghana on request",
          "Online tracking, invoicing and payment",
        ],
      },
      {
        h2: "Who we work with",
        paragraphs: [
          "Market traders, retail shops, online sellers, construction and workshop businesses, and individuals importing personal goods all use the same platform: an account, a shipping mark and tracked shipments.",
        ],
      },
      {
        h2: "Talk to our team",
        paragraphs: [
          "Call +233 30 700 1743 or +233 20 887 8817, or email aeflogistics@gmail.com. Our manager is Elizabeth Amoliga.",
        ],
      },
    ],
    faqs: [
      {
        q: "Are you based in Ghana or China?",
        a: "We are a Ghana-based company operating with a receiving warehouse in China, so you are served locally in Ghana while your goods are handled at origin.",
      },
      {
        q: "Do you work with small importers?",
        a: "Yes. Consolidation means small consignments can ship economically alongside larger cargo.",
      },
    ],
    related: [
      "/shipping-from-china-to-ghana",
      "/cargo-consolidation-china-to-ghana",
      "/shipment-tracking",
    ],
    cta: accountCta,
  },
  {
    slug: "/shipment-tracking",
    title: "Track Your Shipment from China to Ghana | Amoliga Elite",
    description:
      "Track your China to Ghana shipment with Amoliga Elite Freight & Logistics. Enter a tracking number to see the current stage, from warehouse receipt to ready for pickup.",
    h1: "Track Your Shipment from China to Ghana",
    intro:
      "Every shipment we handle moves through defined stages so you always know where your cargo is. Use the tracking page to check a tracking number, or sign in for the full history of all your shipments.",
    primaryKeyword: "track shipment China to Ghana",
    secondaryKeywords: [
      "China to Ghana shipment tracking",
      "cargo tracking Ghana",
      "container tracking Ghana",
    ],
    serviceName: "China to Ghana shipment tracking",
    sections: [
      {
        h2: "How to track",
        list: [
          "Open the tracking page",
          "Enter your tracking number or shipping mark",
          "Review the current stage and history",
          "Sign in for invoices, container details and delivery requests",
        ],
      },
      {
        h2: "What the stages mean",
        paragraphs: [
          "Tracking follows your cargo from receipt at the China warehouse, through loading and transit, to arrival in Ghana and readiness for pickup or delivery. You also receive SMS updates as the status changes.",
        ],
      },
      {
        h2: "Courier tracking numbers",
        paragraphs: [
          "If your supplier gave you a Chinese courier tracking number, that covers the domestic leg to our warehouse. Our tracking takes over once the cargo is received and recorded under your shipping mark.",
        ],
      },
    ],
    faqs: [
      {
        q: "Why can't I find my tracking number?",
        a: "Tracking becomes available after your cargo is received and recorded at the warehouse. If your supplier has just dispatched, allow time for delivery and check-in, then try again or contact our team.",
      },
      {
        q: "Do I get notifications?",
        a: "Yes. Status changes trigger SMS and in-app notifications on the number and account linked to your shipment.",
      },
    ],
    related: ["/shipping-from-china-to-ghana", "/door-to-door-shipping-china-ghana", "/freight-forwarding-ghana"],
    cta: trackingCta,
  },
];

export const seoPageBySlug = (slug: string) => seoPages.find((p) => p.slug === slug);
