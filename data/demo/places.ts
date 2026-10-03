export type Place = { id: string; name: string; city: string; address: string; coordinates: [number, number] };

// Approximate landmark coordinates for the hackathon, not verified pickup entrances.
export const places: Place[] = [
  { id: 'ayala', name: 'Ayala Triangle Gardens', city: 'Makati', address: 'Paseo de Roxas, Salcedo Village', coordinates: [121.0238, 14.5573] },
  { id: 'bgc', name: 'Bonifacio High Street', city: 'Taguig', address: '9th Avenue, Bonifacio Global City', coordinates: [121.0510, 14.5508] },
  { id: 'moa', name: 'SM Mall of Asia', city: 'Pasay', address: 'Seaside Boulevard, Bay City', coordinates: [120.9819, 14.5351] },
  { id: 'rizal', name: 'Rizal Park', city: 'Manila', address: 'Roxas Boulevard, Ermita', coordinates: [120.9794, 14.5826] },
  { id: 'eastwood', name: 'Eastwood City', city: 'Quezon City', address: 'Eastwood Avenue, Bagumbayan', coordinates: [121.0795, 14.6098] },
  { id: 'megamall', name: 'SM Megamall', city: 'Mandaluyong', address: 'EDSA, Ortigas Center', coordinates: [121.0560, 14.5848] },
  { id: 'capitol', name: 'Capitol Commons', city: 'Pasig', address: 'Meralco Avenue, Ortigas Center', coordinates: [121.0634, 14.5730] },
  { id: 'greenhills', name: 'Greenhills Shopping Center', city: 'San Juan', address: 'Ortigas Avenue, Greenhills', coordinates: [121.0494, 14.6017] },
  { id: 'alabang', name: 'Alabang Town Center', city: 'Muntinlupa', address: 'Alabang–Zapote Road, Ayala Alabang', coordinates: [121.0298, 14.4237] },
  { id: 'laspinas', name: 'SM Southmall', city: 'Las Piñas', address: 'Alabang–Zapote Road, Almanza', coordinates: [121.0107, 14.4325] },
  { id: 'paranaque', name: 'Parañaque City Hall', city: 'Parañaque', address: 'San Antonio Avenue, San Antonio', coordinates: [121.0223, 14.4705] },
  { id: 'marikina', name: 'Marikina Sports Center', city: 'Marikina', address: 'Sumulong Highway, Santo Niño', coordinates: [121.1000, 14.6333] },
  { id: 'caloocan', name: 'Bonifacio Monument', city: 'Caloocan', address: 'Monumento, Grace Park', coordinates: [120.9841, 14.6570] },
  { id: 'malabon', name: 'Malabon City Hall', city: 'Malabon', address: 'F. Sevilla Boulevard, San Agustin', coordinates: [120.9567, 14.6603] },
  { id: 'navotas', name: 'Navotas City Hall', city: 'Navotas', address: 'M. Naval Street, Sipac-Almacen', coordinates: [120.9470, 14.6665] },
  { id: 'valenzuela', name: 'Valenzuela People’s Park', city: 'Valenzuela', address: 'MacArthur Highway, Karuhatan', coordinates: [120.9756, 14.6922] },
  { id: 'pateros', name: 'Pateros Municipal Hall', city: 'Pateros', address: 'B. Morcilla Street, Poblacion', coordinates: [121.0685, 14.5442] },
];
export const findPlace = (id: string) => places.find((place) => place.id === id);
