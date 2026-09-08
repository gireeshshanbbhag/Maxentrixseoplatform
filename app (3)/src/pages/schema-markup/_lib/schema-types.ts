// Schema type definitions and default field templates
export type SchemaFieldDef = {
  key: string;
  label: string;
  type: "text" | "url" | "date" | "number" | "textarea" | "select";
  required?: boolean;
  options?: string[];
  placeholder?: string;
  hint?: string;
};

export type SchemaTypeDef = {
  type: string;
  label: string;
  description: string;
  icon: string;
  fields: SchemaFieldDef[];
};

export const SCHEMA_TYPES: SchemaTypeDef[] = [
  {
    type: "Article",
    label: "Article",
    description: "Blog posts, news articles, editorial content",
    icon: "📄",
    fields: [
      { key: "headline", label: "Headline", type: "text", required: true, placeholder: "Article title (max 110 chars)" },
      { key: "description", label: "Description", type: "textarea", placeholder: "Brief description of the article" },
      { key: "author.name", label: "Author Name", type: "text", required: true, placeholder: "John Smith" },
      { key: "author.url", label: "Author Profile URL", type: "url", placeholder: "https://example.com/author/john" },
      { key: "datePublished", label: "Date Published", type: "date", required: true },
      { key: "dateModified", label: "Date Modified", type: "date" },
      { key: "image", label: "Featured Image URL", type: "url", placeholder: "https://example.com/image.jpg" },
      { key: "publisher.name", label: "Publisher Name", type: "text", required: true },
      { key: "publisher.logo", label: "Publisher Logo URL", type: "url" },
    ],
  },
  {
    type: "Product",
    label: "Product",
    description: "E-commerce products with price, availability, and reviews",
    icon: "🛍️",
    fields: [
      { key: "name", label: "Product Name", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea", required: true },
      { key: "image", label: "Product Image URL", type: "url", required: true },
      { key: "brand.name", label: "Brand Name", type: "text" },
      { key: "sku", label: "SKU", type: "text", placeholder: "ABC-12345" },
      { key: "offers.price", label: "Price", type: "text", required: true, placeholder: "29.99" },
      { key: "offers.priceCurrency", label: "Currency", type: "select", options: ["USD", "EUR", "GBP", "CAD", "AUD", "INR"], required: true },
      { key: "offers.availability", label: "Availability", type: "select", options: ["InStock", "OutOfStock", "PreOrder", "LimitedAvailability"] },
      { key: "aggregateRating.ratingValue", label: "Rating (0-5)", type: "number", placeholder: "4.5" },
      { key: "aggregateRating.reviewCount", label: "Review Count", type: "number", placeholder: "128" },
    ],
  },
  {
    type: "FAQPage",
    label: "FAQ Page",
    description: "FAQ sections that appear as rich results in search",
    icon: "❓",
    fields: [
      { key: "faq.1.question", label: "Question 1", type: "text", required: true, placeholder: "What is..." },
      { key: "faq.1.answer", label: "Answer 1", type: "textarea", required: true },
      { key: "faq.2.question", label: "Question 2", type: "text", placeholder: "How do I..." },
      { key: "faq.2.answer", label: "Answer 2", type: "textarea" },
      { key: "faq.3.question", label: "Question 3", type: "text" },
      { key: "faq.3.answer", label: "Answer 3", type: "textarea" },
      { key: "faq.4.question", label: "Question 4", type: "text" },
      { key: "faq.4.answer", label: "Answer 4", type: "textarea" },
    ],
  },
  {
    type: "LocalBusiness",
    label: "Local Business",
    description: "Physical business locations with address and contact details",
    icon: "🏢",
    fields: [
      { key: "name", label: "Business Name", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "telephone", label: "Phone Number", type: "text", placeholder: "+1-555-123-4567" },
      { key: "email", label: "Email", type: "text" },
      { key: "url", label: "Website URL", type: "url", required: true },
      { key: "address.streetAddress", label: "Street Address", type: "text", required: true },
      { key: "address.addressLocality", label: "City", type: "text", required: true },
      { key: "address.addressRegion", label: "State/Region", type: "text" },
      { key: "address.postalCode", label: "Postal Code", type: "text" },
      { key: "address.addressCountry", label: "Country Code", type: "text", placeholder: "US", hint: "2-letter ISO code" },
      { key: "openingHours", label: "Opening Hours", type: "text", placeholder: "Mo-Fr 09:00-17:00" },
      { key: "priceRange", label: "Price Range", type: "select", options: ["$", "$$", "$$$", "$$$$"] },
      { key: "aggregateRating.ratingValue", label: "Rating (0-5)", type: "number" },
      { key: "aggregateRating.reviewCount", label: "Review Count", type: "number" },
    ],
  },
  {
    type: "BreadcrumbList",
    label: "Breadcrumbs",
    description: "Navigation breadcrumbs for enhanced search appearance",
    icon: "🍞",
    fields: [
      { key: "item.1.name", label: "Level 1 Name", type: "text", required: true, placeholder: "Home" },
      { key: "item.1.url", label: "Level 1 URL", type: "url", required: true, placeholder: "https://example.com" },
      { key: "item.2.name", label: "Level 2 Name", type: "text", placeholder: "Category" },
      { key: "item.2.url", label: "Level 2 URL", type: "url" },
      { key: "item.3.name", label: "Level 3 Name", type: "text", placeholder: "Page" },
      { key: "item.3.url", label: "Level 3 URL", type: "url" },
    ],
  },
  {
    type: "HowTo",
    label: "How-To",
    description: "Step-by-step instructional content",
    icon: "🔧",
    fields: [
      { key: "name", label: "How-To Title", type: "text", required: true, placeholder: "How to..." },
      { key: "description", label: "Description", type: "textarea" },
      { key: "totalTime", label: "Total Time", type: "text", placeholder: "PT30M", hint: "ISO 8601 duration, e.g. PT30M = 30 minutes" },
      { key: "step.1.name", label: "Step 1 Name", type: "text", required: true, placeholder: "Prepare materials" },
      { key: "step.1.text", label: "Step 1 Instructions", type: "textarea", required: true },
      { key: "step.2.name", label: "Step 2 Name", type: "text" },
      { key: "step.2.text", label: "Step 2 Instructions", type: "textarea" },
      { key: "step.3.name", label: "Step 3 Name", type: "text" },
      { key: "step.3.text", label: "Step 3 Instructions", type: "textarea" },
    ],
  },
  {
    type: "Event",
    label: "Event",
    description: "Concerts, conferences, webinars, and other events",
    icon: "📅",
    fields: [
      { key: "name", label: "Event Name", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "startDate", label: "Start Date & Time", type: "text", required: true, placeholder: "2025-06-15T19:00:00", hint: "ISO 8601 format" },
      { key: "endDate", label: "End Date & Time", type: "text" },
      { key: "location.name", label: "Venue Name", type: "text" },
      { key: "location.address.streetAddress", label: "Street Address", type: "text" },
      { key: "location.address.addressLocality", label: "City", type: "text" },
      { key: "offers.price", label: "Ticket Price", type: "text", placeholder: "Free or 99.99" },
      { key: "offers.url", label: "Ticket URL", type: "url" },
      { key: "organizer.name", label: "Organizer", type: "text" },
    ],
  },
  {
    type: "Organization",
    label: "Organization",
    description: "Company/brand identity for Knowledge Panel",
    icon: "🏛️",
    fields: [
      { key: "name", label: "Organization Name", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "url", label: "Website URL", type: "url", required: true },
      { key: "logo", label: "Logo URL", type: "url" },
      { key: "telephone", label: "Phone", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "sameAs.linkedin", label: "LinkedIn URL", type: "url" },
      { key: "sameAs.twitter", label: "Twitter/X URL", type: "url" },
      { key: "sameAs.facebook", label: "Facebook URL", type: "url" },
      { key: "foundingDate", label: "Founding Date", type: "date" },
      { key: "numberOfEmployees", label: "Number of Employees", type: "number" },
    ],
  },
  {
    type: "Person",
    label: "Person",
    description: "Author or individual profile",
    icon: "👤",
    fields: [
      { key: "name", label: "Full Name", type: "text", required: true },
      { key: "description", label: "Bio", type: "textarea" },
      { key: "url", label: "Profile URL", type: "url" },
      { key: "image", label: "Photo URL", type: "url" },
      { key: "jobTitle", label: "Job Title", type: "text" },
      { key: "worksFor.name", label: "Employer", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "sameAs.linkedin", label: "LinkedIn URL", type: "url" },
      { key: "sameAs.twitter", label: "Twitter/X URL", type: "url" },
    ],
  },
];

/** Build a complete JSON-LD object from flat form field values */
export function buildJsonLd(schemaType: string, fieldValues: Record<string, string>): Record<string, unknown> {
  const obj: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": schemaType,
  };

  for (const [flatKey, value] of Object.entries(fieldValues)) {
    if (!value) continue;
    setNestedValue(obj, flatKey, value, schemaType);
  }

  return obj;
}

/** Special JSON-LD builder for FAQPage */
function buildFaqJsonLd(fieldValues: Record<string, string>): Record<string, unknown> {
  const mainEntity: { "@type": string; name: string; acceptedAnswer: { "@type": string; text: string } }[] = [];

  for (let i = 1; i <= 10; i++) {
    const question = fieldValues[`faq.${i}.question`];
    const answer = fieldValues[`faq.${i}.answer`];
    if (question && answer) {
      mainEntity.push({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      });
    }
  }

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity,
  };
}

/** Special JSON-LD builder for BreadcrumbList */
function buildBreadcrumbJsonLd(fieldValues: Record<string, string>): Record<string, unknown> {
  const itemListElement: { "@type": string; position: number; name: string; item: string }[] = [];

  for (let i = 1; i <= 10; i++) {
    const name = fieldValues[`item.${i}.name`];
    const url = fieldValues[`item.${i}.url`];
    if (name && url) {
      itemListElement.push({ "@type": "ListItem", position: i, name, item: url });
    }
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement,
  };
}

/** Special JSON-LD builder for HowTo */
function buildHowToJsonLd(fieldValues: Record<string, string>): Record<string, unknown> {
  const steps: { "@type": string; name: string; text: string }[] = [];

  for (let i = 1; i <= 10; i++) {
    const name = fieldValues[`step.${i}.name`];
    const text = fieldValues[`step.${i}.text`];
    if (name || text) {
      steps.push({ "@type": "HowToStep", name: name ?? "", text: text ?? "" });
    }
  }

  const base: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: fieldValues["name"] ?? "",
  };
  if (fieldValues["description"]) base.description = fieldValues["description"];
  if (fieldValues["totalTime"]) base.totalTime = fieldValues["totalTime"];
  if (steps.length) base.step = steps;
  return base;
}

function setNestedValue(obj: Record<string, unknown>, dotPath: string, value: string, schemaType: string): void {
  // Skip fields handled by special builders
  if (schemaType === "FAQPage" && dotPath.startsWith("faq.")) return;
  if (schemaType === "BreadcrumbList" && dotPath.startsWith("item.")) return;
  if (schemaType === "HowTo" && (dotPath.startsWith("step.") || dotPath === "name" || dotPath === "description" || dotPath === "totalTime")) return;

  const parts = dotPath.split(".");

  // Handle sameAs arrays
  if (parts[0] === "sameAs") {
    const existing = (obj["sameAs"] as string[]) ?? [];
    existing.push(value);
    obj["sameAs"] = existing;
    return;
  }

  // Nested object path
  if (parts.length === 1) {
    obj[parts[0]] = value;
  } else if (parts.length === 2) {
    const parent = (obj[parts[0]] as Record<string, unknown>) ?? {};
    parent[parts[1]] = value;
    obj[parts[0]] = { "@type": inferNestedType(parts[0]), ...parent };
  } else if (parts.length === 3) {
    const grandParent = (obj[parts[0]] as Record<string, unknown>) ?? {};
    const parent = (grandParent[parts[1]] as Record<string, unknown>) ?? {};
    parent[parts[2]] = value;
    grandParent[parts[1]] = { "@type": inferNestedType(parts[1]), ...parent };
    obj[parts[0]] = { "@type": inferNestedType(parts[0]), ...grandParent };
  }
}

function inferNestedType(key: string): string {
  const typeMap: Record<string, string> = {
    author: "Person",
    publisher: "Organization",
    brand: "Brand",
    offers: "Offer",
    aggregateRating: "AggregateRating",
    address: "PostalAddress",
    location: "Place",
    organizer: "Organization",
    worksFor: "Organization",
  };
  return typeMap[key] ?? "Thing";
}

/** Public method for building JSON-LD from field values */
export function buildJsonLdForType(schemaType: string, fieldValues: Record<string, string>): Record<string, unknown> {
  if (schemaType === "FAQPage") return buildFaqJsonLd(fieldValues);
  if (schemaType === "BreadcrumbList") return buildBreadcrumbJsonLd(fieldValues);
  if (schemaType === "HowTo") return buildHowToJsonLd(fieldValues);
  return buildJsonLd(schemaType, fieldValues);
}
