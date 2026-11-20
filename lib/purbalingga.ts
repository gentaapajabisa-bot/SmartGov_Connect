export const PURBALINGGA_CENTER = {
  lat: -7.3908,
  lng: 109.3633,
  zoom: 12,
};

export const KECAMATAN_PURBALINGGA = [
  "Bobotsari",
  "Bojongsari",
  "Bukateja",
  "Kaligondang",
  "Kalimanah",
  "Karanganyar",
  "Karangjambu",
  "Karangmoncol",
  "Karangreja",
  "Kejobong",
  "Kemangkon",
  "Kertanegara",
  "Kutasari",
  "Mrebet",
  "Padamara",
  "Pengadegan",
  "Purbalingga",
  "Rembang",
] as const;

export interface EmergencyContact {
  id: number;
  agency_name: string;
  category: string;
  phone_number: string;
  address?: string;
}

export const DEFAULT_EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    id: 1,
    agency_name: "Layanan Darurat Terpadu Purbalingga",
    category: "Darurat Umum",
    phone_number: "112",
    address: "Pusat Panggilan Darurat Kabupaten Purbalingga",
  },
  {
    id: 2,
    agency_name: "Polres Purbalingga",
    category: "Kepolisian",
    phone_number: "(0281) 891110",
    address: "Jl. Mayjen Sungkono No. 1, Kalimanah, Purbalingga",
  },
  {
    id: 3,
    agency_name: "Call Center Polri (Polres Purbalingga)",
    category: "Kepolisian",
    phone_number: "110",
    address: "Layanan Kepolisian 24 Jam Kabupaten Purbalingga",
  },
  {
    id: 4,
    agency_name: "Damkar & Penyelamatan Kab. Purbalingga",
    category: "Pemadam Kebakaran",
    phone_number: "(0281) 891113",
    address: "Jl. Letkol Isdiman, Purbalingga",
  },
  {
    id: 5,
    agency_name: "BPBD Kabupaten Purbalingga",
    category: "Kebencanaan",
    phone_number: "(0281) 893232",
    address: "Jl. Jend. Ahmad Yani No. 55, Purbalingga",
  },
  {
    id: 6,
    agency_name: "IGD RSUD dr. R. Goeteng Taroenadibrata",
    category: "Medis & Ambulans",
    phone_number: "(0281) 891016",
    address: "Jl. Tentara Pelajar No. 22, Purbalingga",
  },
];
