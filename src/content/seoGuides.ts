export interface GuideSection {
  h2: string;
  paragraphs?: string[];
  list?: string[];
}

export interface SeoGuide {
  slug: string;
  title: string;
  description: string;
  h1: string;
  summary: string;
  datePublished: string;
  readingTime: string;
  sections: GuideSection[];
  faqs: { q: string; a: string }[];
  related: string[];
}

export const seoGuides: SeoGuide[] = [
  {
    slug: "/resources/how-to-ship-from-china-to-ghana",
    title: "How to Ship from China to Ghana: Step-by-Step Guide",
    description:
      "A practical step-by-step guide to importing from China to Ghana: finding suppliers, using a China warehouse address, shipping marks, sea vs air freight and collection.",
    h1: "How to Ship from China to Ghana: A Step-by-Step Guide",
    summary:
      "If you are importing from China for the first time, this guide walks through the whole process in the order it actually happens.",
    datePublished: "2026-03-06",
    readingTime: "7 min read",
    sections: [
      {
        h2: "Step 1: Decide what you are buying",
        paragraphs: [
          "Before you contact a freight forwarder, know roughly what your goods are, how many cartons there will be and whether anything is restricted (batteries, liquids, aerosols, powders, branded goods). This determines whether you ship by sea or air and whether the cargo is accepted at all.",
        ],
      },
      {
        h2: "Step 2: Open a shipping account and get your shipping mark",
        paragraphs: [
          "Your shipping mark is the code that ties parcels in a busy Chinese warehouse to you. Create an account, note your code, and use it on every order. Parcels without a mark are the single most common cause of delays.",
        ],
      },
      {
        h2: "Step 3: Give your supplier the China warehouse address",
        paragraphs: [
          "Copy the warehouse address exactly as published, including the mark. Sea cargo and air cargo may go to different warehouse locations, so confirm which one applies before your supplier books a courier.",
        ],
      },
      {
        h2: "Step 4: Choose sea or air freight",
        list: [
          "Sea freight — priced by volume (CBM); best for bulky, heavy, non-urgent stock",
          "Air freight — priced by chargeable weight; best for small, light, urgent or high-value goods",
        ],
      },
      {
        h2: "Step 5: Let your cargo consolidate",
        paragraphs: [
          "If you are buying from several suppliers, wait until all parcels arrive at the warehouse before releasing the shipment. One consolidated shipment is normally cheaper and easier to manage than several separate ones.",
        ],
      },
      {
        h2: "Step 6: Track, pay and collect",
        paragraphs: [
          "Follow the shipment stages in your dashboard and by SMS. When your cargo is ready in Ghana, settle the invoice, then collect with valid ID or request delivery to your address.",
        ],
      },
      {
        h2: "Common first-time mistakes",
        list: [
          "Forgetting the shipping mark on cartons",
          "Letting suppliers use oversized boxes full of air",
          "Ordering restricted items for air freight",
          "Not keeping the supplier invoice and packing list",
          "Assuming a courier tracking number covers the whole journey",
        ],
      },
    ],
    faqs: [
      {
        q: "Do I need to travel to China to import?",
        a: "No. Suppliers or market agents deliver to our China warehouse and we handle the rest, so most importers never travel.",
      },
      {
        q: "How do I pay my supplier?",
        a: "Payment to your supplier is arranged directly between you and them. Our charges cover receiving, consolidating and shipping your cargo.",
      },
    ],
    related: [
      "/resources/how-cbm-is-calculated",
      "/resources/sea-freight-vs-air-freight",
      "/shipping-from-china-to-ghana",
    ],
  },
  {
    slug: "/resources/how-cbm-is-calculated",
    title: "How CBM Is Calculated for Sea Freight (With Examples)",
    description:
      "Learn how CBM is calculated for sea freight from China to Ghana, how volume affects your shipping invoice, and how better packing reduces the volume you pay for.",
    h1: "How CBM Is Calculated for Sea Freight",
    summary:
      "Sea freight is priced by volume, not weight. Understanding CBM lets you estimate cost before your supplier ships.",
    datePublished: "2026-03-06",
    readingTime: "5 min read",
    sections: [
      {
        h2: "What CBM means",
        paragraphs: [
          "CBM stands for cubic metre. For each carton, multiply length × width × height in metres. Add the results for every carton to get the shipment volume.",
        ],
      },
      {
        h2: "Worked example",
        paragraphs: [
          "A carton measuring 60cm × 40cm × 50cm is 0.6 × 0.4 × 0.5 = 0.12 CBM. Ten identical cartons are 1.2 CBM. If your rate is quoted per CBM, your freight charge is that rate multiplied by 1.2.",
        ],
      },
      {
        h2: "Measure the outside, not the goods",
        paragraphs: [
          "Volume is based on the external carton dimensions. A small item in a large box is charged for the large box, which is why supplier packaging matters so much.",
        ],
      },
      {
        h2: "How to reduce your CBM",
        list: [
          "Ask suppliers to use boxes sized to the goods",
          "Request that soft goods be compressed and re-boxed",
          "Combine several small orders into fewer cartons",
          "Ask us about repackaging before your cargo is loaded",
          "Avoid unnecessary internal void fill",
        ],
      },
      {
        h2: "CBM vs chargeable weight",
        paragraphs: [
          "Sea freight normally follows volume. Air freight uses chargeable weight — the greater of actual weight and volumetric weight — so dense cargo behaves very differently between the two modes.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can I calculate my CBM before shipping?",
        a: "Yes. Ask your supplier for the carton dimensions and count, then apply the formula above for a close estimate.",
      },
      {
        q: "Why is my measured CBM higher than my estimate?",
        a: "Usually because the supplier's final packaging is larger than quoted, or extra cartons were added. Final volume is measured on the actual cargo at the warehouse.",
      },
    ],
    related: [
      "/sea-freight-china-to-ghana",
      "/cargo-consolidation-china-to-ghana",
      "/resources/how-to-ship-from-china-to-ghana",
    ],
  },
  {
    slug: "/resources/sea-freight-vs-air-freight",
    title: "Sea Freight vs Air Freight from China to Ghana",
    description:
      "Compare sea freight and air freight from China to Ghana: pricing basis, speed, cargo restrictions and which mode suits your goods as an importer in Ghana.",
    h1: "Sea Freight vs Air Freight from China to Ghana",
    summary:
      "The right mode depends on your cargo's size, weight, value and how urgently you need it. Here is how the two compare.",
    datePublished: "2026-03-06",
    readingTime: "5 min read",
    sections: [
      {
        h2: "How each is priced",
        paragraphs: [
          "Sea freight is charged by volume in CBM. Air freight is charged on chargeable weight, the greater of actual and volumetric weight. That single difference drives most of the decision.",
        ],
      },
      {
        h2: "Speed",
        paragraphs: [
          "Air freight is much faster. Sea freight takes considerably longer because of sailing schedules, consolidation cut-offs and port processes, but it carries far more volume for the money.",
        ],
      },
      {
        h2: "Which cargo suits sea freight",
        list: [
          "Shop stock and bulk orders",
          "Furniture, machinery and spare parts",
          "Packaging materials and heavy goods",
          "Anything you can plan for weeks ahead",
        ],
      },
      {
        h2: "Which cargo suits air freight",
        list: [
          "Samples before a bulk order",
          "Urgent restocks and fast-moving fashion",
          "Small, light, high-value items",
          "Parts blocking a repair or installation",
        ],
      },
      {
        h2: "Restrictions to check first",
        paragraphs: [
          "Batteries, liquids, aerosols, powders and magnets are tightly regulated by airlines and are often refused. Confirm with our team before your supplier ships anything in these categories.",
        ],
      },
      {
        h2: "Using both together",
        paragraphs: [
          "Many importers split an order: urgent items by air, the bulk by sea. Both shipments are tracked separately in your dashboard.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is air freight ever cheaper than sea freight?",
        a: "For very small, light consignments the total cost can be close, because sea freight has fixed handling costs too. Compare quotes for your actual cartons.",
      },
      {
        q: "Which mode is safer for fragile goods?",
        a: "Air freight involves less handling and a shorter journey, but proper packing matters more than the mode itself.",
      },
    ],
    related: [
      "/sea-freight-china-to-ghana",
      "/air-freight-china-to-ghana",
      "/resources/how-cbm-is-calculated",
    ],
  },
  {
    slug: "/resources/china-shipping-mark-guide",
    title: "Shipping Marks Explained: Why Yours Matters",
    description:
      "What a shipping mark is, why every carton sent to a China warehouse needs one, and how to give your supplier the right details so your cargo is never unmatched.",
    h1: "Shipping Marks Explained",
    summary:
      "A shipping mark is the label that connects a carton in a busy Chinese warehouse to your account. Without it, cargo cannot be matched.",
    datePublished: "2026-03-06",
    readingTime: "4 min read",
    sections: [
      {
        h2: "What a shipping mark is",
        paragraphs: [
          "It is your unique customer code, written clearly on every carton and included on the delivery note your supplier gives the courier in China. Our warehouse team uses it to record cargo against your account.",
        ],
      },
      {
        h2: "Where it must appear",
        list: [
          "On at least two sides of every carton",
          "On the courier waybill or delivery note",
          "In the message you send your supplier",
        ],
      },
      {
        h2: "What to send your supplier",
        paragraphs: [
          "Send the warehouse address exactly as published, your shipping mark, the number of cartons and a short description of the goods. Ask the supplier to confirm the courier tracking number once dispatched.",
        ],
      },
      {
        h2: "If a parcel arrives unmarked",
        paragraphs: [
          "Contact our team immediately with the courier tracking number, the sender's name and a description of the contents. The sooner you report it, the better the chance of identifying the cargo.",
        ],
      },
    ],
    faqs: [
      {
        q: "Where do I find my shipping mark?",
        a: "It is your customer code, shown in your account dashboard after you sign up.",
      },
      {
        q: "Can I use one mark for several suppliers?",
        a: "Yes — that is exactly how consolidation works. All suppliers use the same mark and we group the parcels together.",
      },
    ],
    related: ["/china-warehouse", "/cargo-consolidation-china-to-ghana", "/resources/how-to-ship-from-china-to-ghana"],
  },
];

export const seoGuideBySlug = (slug: string) => seoGuides.find((g) => g.slug === slug);
