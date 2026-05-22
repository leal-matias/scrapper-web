export interface Business {
  name: string;
  website?: string;
  address?: string;
  phone?: string;
  instagram?: string;
}

export interface ContactInfo {
  businessName: string;
  sourceUrl: string;
  emails: string[];
  phones: string[];
}

export interface ScrapeResult {
  business: Business;
  contact: ContactInfo | null;
  error?: string;
}
