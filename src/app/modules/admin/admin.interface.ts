export interface IInviteTenant {
  name: string;
  email: string;
  phoneNumber: string;
  propertyId: string;
  spotId: string;
}

export interface ICreateProperty {
  name: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  amenities: string[];
  totalLots: number;
  images?: string[];
  rules?: string[];
}

export interface IUpdateProperty {
  name?: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  amenities?: string[];
  totalLots?: number;
  availableLots?: number;
  isActive?: boolean;
  images?: string[];
  rules?: string[];
}
