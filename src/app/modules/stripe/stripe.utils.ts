import config from "../../../config/config";

// Helper function to ensure URL has proper scheme
export const getValidRedirectUrl = (path: string): string => {
  const baseUrl = config.client_url || "http://localhost:3000";

  // If baseUrl already has a scheme, use it as is
  if (baseUrl.startsWith("http://") || baseUrl.startsWith("https://")) {
    return `${baseUrl}${path}`;
  }

  // If no scheme, default to https
  return `https://${baseUrl}${path}`;
};

// Helper function to format address object to string
export const formatAddress = (address: any): string => {
  if (!address) return "N/A";

  // If address is already a string, return it
  if (typeof address === "string") return address;

  // If address is an object, format it
  if (typeof address === "object") {
    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.zip) parts.push(address.zip);
    if (address.country) parts.push(address.country);

    return parts.length > 0 ? parts.join(", ") : "N/A";
  }

  return "N/A";
};
