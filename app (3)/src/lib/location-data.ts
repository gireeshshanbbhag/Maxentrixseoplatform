// Static location data for keyword rank tracking

export type Country = { code: string; name: string; locationName: string };
export type State = { name: string; code: string; country: string };
export type City = { name: string; state: string; country: string };

export const COUNTRIES: Country[] = [
  { code: "IN", name: "India", locationName: "India" },
  { code: "US", name: "United States", locationName: "United States" },
  { code: "GB", name: "United Kingdom", locationName: "United Kingdom" },
  { code: "AU", name: "Australia", locationName: "Australia" },
  { code: "CA", name: "Canada", locationName: "Canada" },
  { code: "DE", name: "Germany", locationName: "Germany" },
  { code: "FR", name: "France", locationName: "France" },
  { code: "SG", name: "Singapore", locationName: "Singapore" },
  { code: "AE", name: "UAE", locationName: "United Arab Emirates" },
  { code: "PK", name: "Pakistan", locationName: "Pakistan" },
  { code: "BD", name: "Bangladesh", locationName: "Bangladesh" },
  { code: "NZ", name: "New Zealand", locationName: "New Zealand" },
  { code: "ZA", name: "South Africa", locationName: "South Africa" },
  { code: "NG", name: "Nigeria", locationName: "Nigeria" },
  { code: "PH", name: "Philippines", locationName: "Philippines" },
  { code: "MY", name: "Malaysia", locationName: "Malaysia" },
  { code: "ID", name: "Indonesia", locationName: "Indonesia" },
  { code: "BR", name: "Brazil", locationName: "Brazil" },
  { code: "MX", name: "Mexico", locationName: "Mexico" },
  { code: "JP", name: "Japan", locationName: "Japan" },
  { code: "KR", name: "South Korea", locationName: "South Korea" },
  { code: "IT", name: "Italy", locationName: "Italy" },
  { code: "ES", name: "Spain", locationName: "Spain" },
  { code: "NL", name: "Netherlands", locationName: "Netherlands" },
];

// India States & Union Territories
export const INDIA_STATES: State[] = [
  { name: "Andhra Pradesh", code: "AP", country: "IN" },
  { name: "Arunachal Pradesh", code: "AR", country: "IN" },
  { name: "Assam", code: "AS", country: "IN" },
  { name: "Bihar", code: "BR", country: "IN" },
  { name: "Chhattisgarh", code: "CG", country: "IN" },
  { name: "Goa", code: "GA", country: "IN" },
  { name: "Gujarat", code: "GJ", country: "IN" },
  { name: "Haryana", code: "HR", country: "IN" },
  { name: "Himachal Pradesh", code: "HP", country: "IN" },
  { name: "Jharkhand", code: "JH", country: "IN" },
  { name: "Karnataka", code: "KA", country: "IN" },
  { name: "Kerala", code: "KL", country: "IN" },
  { name: "Madhya Pradesh", code: "MP", country: "IN" },
  { name: "Maharashtra", code: "MH", country: "IN" },
  { name: "Manipur", code: "MN", country: "IN" },
  { name: "Meghalaya", code: "ML", country: "IN" },
  { name: "Mizoram", code: "MZ", country: "IN" },
  { name: "Nagaland", code: "NL", country: "IN" },
  { name: "Odisha", code: "OD", country: "IN" },
  { name: "Punjab", code: "PB", country: "IN" },
  { name: "Rajasthan", code: "RJ", country: "IN" },
  { name: "Sikkim", code: "SK", country: "IN" },
  { name: "Tamil Nadu", code: "TN", country: "IN" },
  { name: "Telangana", code: "TS", country: "IN" },
  { name: "Tripura", code: "TR", country: "IN" },
  { name: "Uttar Pradesh", code: "UP", country: "IN" },
  { name: "Uttarakhand", code: "UK", country: "IN" },
  { name: "West Bengal", code: "WB", country: "IN" },
  // Union Territories
  { name: "Andaman and Nicobar Islands", code: "AN", country: "IN" },
  { name: "Chandigarh", code: "CH", country: "IN" },
  { name: "Dadra and Nagar Haveli and Daman and Diu", code: "DD", country: "IN" },
  { name: "Delhi", code: "DL", country: "IN" },
  { name: "Jammu and Kashmir", code: "JK", country: "IN" },
  { name: "Ladakh", code: "LA", country: "IN" },
  { name: "Lakshadweep", code: "LD", country: "IN" },
  { name: "Puducherry", code: "PY", country: "IN" },
];

// Major Indian cities grouped by state
export const INDIA_CITIES: Record<string, string[]> = {
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Solapur", "Thane", "Navi Mumbai", "Kolhapur", "Amravati"],
  "Delhi": ["New Delhi", "Delhi", "Noida", "Gurgaon", "Faridabad", "Ghaziabad"],
  "Karnataka": ["Bengaluru", "Mysuru", "Hubli", "Mangaluru", "Belagavi", "Kalaburagi", "Davanagere"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Vellore", "Erode"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Khammam", "Karimnagar", "Ramagundam"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Gandhinagar"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Agra", "Varanasi", "Meerut", "Allahabad", "Ghaziabad", "Noida", "Bareilly"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Bardhaman"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Kota", "Bikaner", "Ajmer", "Udaipur"],
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Tirupati"],
  "Bihar": ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain", "Rewa"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali"],
  "Haryana": ["Gurgaon", "Faridabad", "Panipat", "Ambala", "Hisar", "Rohtak"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Palakkad"],
  "Assam": ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Korba", "Durg"],
  "Chandigarh": ["Chandigarh"],
  "Goa": ["Panaji", "Vasco da Gama", "Margao", "Mapusa"],
  "Himachal Pradesh": ["Shimla", "Solan", "Dharamsala", "Mandi"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rishikesh"],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag"],
};

// Major Indian districts (key districts per state)
export const INDIA_DISTRICTS: Record<string, string[]> = {
  "Maharashtra": ["Mumbai City", "Mumbai Suburban", "Pune", "Nagpur", "Nashik", "Thane", "Aurangabad", "Solapur", "Kolhapur", "Satara", "Raigad", "Ratnagiri"],
  "Karnataka": ["Bengaluru Urban", "Bengaluru Rural", "Mysuru", "Tumkur", "Mandya", "Dakshina Kannada", "Belagavi", "Kalaburagi"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Vellore", "Erode", "Dindigul"],
  "Telangana": ["Hyderabad", "Rangareddy", "Medchal", "Warangal", "Nizamabad", "Karimnagar", "Khammam"],
  "Andhra Pradesh": ["Visakhapatnam", "Krishna", "Guntur", "Nellore", "Chittoor", "Kurnool", "Kadapa", "West Godavari", "East Godavari"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar", "Anand", "Mehsana"],
  "Uttar Pradesh": ["Lucknow", "Kanpur Nagar", "Agra", "Varanasi", "Allahabad", "Meerut", "Ghaziabad", "Gautam Buddha Nagar", "Bareilly"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Kota", "Ajmer", "Bikaner", "Udaipur", "Alwar"],
  "West Bengal": ["Kolkata", "Howrah", "North 24 Parganas", "South 24 Parganas", "Purba Burdwan", "Bardhaman"],
  "Delhi": ["Central Delhi", "East Delhi", "New Delhi", "North Delhi", "South Delhi", "West Delhi"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain", "Sagar"],
  "Bihar": ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga", "Nalanda"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "SAS Nagar (Mohali)", "Bathinda"],
  "Haryana": ["Gurgaon", "Faridabad", "Hisar", "Ambala", "Rohtak", "Panipat", "Karnal"],
  "Kerala": ["Thiruvananthapuram", "Ernakulam", "Kozhikode", "Thrissur", "Kollam", "Malappuram", "Palakkad"],
  "Odisha": ["Khurda", "Cuttack", "Ganjam", "Sundargarh", "Sambalpur"],
  "Jharkhand": ["Ranchi", "Dhanbad", "Bokaro", "East Singhbhum", "West Singhbhum"],
  "Chhattisgarh": ["Raipur", "Durg", "Bilaspur", "Korba", "Rajnandgaon"],
  "Assam": ["Kamrup Metropolitan", "Dibrugarh", "Nagaon", "Cachar", "Jorhat"],
};

/**
 * Build a human-readable location label from country/state/city/district.
 */
export function buildLocationName(params: {
  country?: string;
  state?: string;
  city?: string;
  district?: string;
}): string {
  const { country, state, city, district } = params;

  const countryObj = COUNTRIES.find((c) => c.code === country || c.name === country);
  const countryName = countryObj?.locationName ?? country ?? "India";

  const parts: string[] = [];

  // Most specific first
  if (city) parts.push(city);
  else if (district) parts.push(district);

  if (state) parts.push(state);
  parts.push(countryName);

  return parts.join(",");
}

/** Country code → numeric location code (legacy, kept for reference) */
export const COUNTRY_LOCATION_CODES: Record<string, number> = {
  IN: 2356, US: 2840, GB: 2826, AU: 2036, CA: 2124, DE: 2276,
  FR: 2250, SG: 2702, AE: 2784, NZ: 2554, ZA: 2710, PK: 2586,
  BD: 2050, NG: 2566, PH: 2608, MY: 2458, ID: 2360, BR: 2076,
  MX: 2484, JP: 2392, KR: 2410, IT: 2380, ES: 2724, NL: 2528,
};
