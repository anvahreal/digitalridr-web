export const NIGERIA_COUNTRY = "Nigeria";

export const LOCATION_AREAS = {
  Lagos: [
    "Abule Egba",
    "Agidingbi",
    "Agege",
    "Ajah",
    "Akoka",
    "Alagbado",
    "Alapere",
    "Alausa",
    "Alimosho",
    "Amuwo Odofin",
    "Anthony Village",
    "Apapa",
    "Badagry",
    "Banana Island",
    "Bariga",
    "Berger",
    "Bode Thomas",
    "Costain",
    "Dolphin Estate",
    "Ebute Metta",
    "Egbeda",
    "Eko Atlantic",
    "Epe",
    "Festac Town",
    "Gbagada",
    "Gowon Estate",
    "Ibeju Lekki",
    "Idimu",
    "Igando",
    "Ikeja GRA",
    "Ikorodu",
    "Ikotun",
    "Ikoyi",
    "Ilupeju",
    "Ipaja",
    "Isolo",
    "Iyana Ipaja",
    "Jakande",
    "Jibowu",
    "Ketu",
    "Lagos Island",
    "Lekki Phase 1",
    "Lekki Phase 2",
    "Magodo",
    "Maryland",
    "Mile 2",
    "Mushin",
    "Obalende",
    "Ogba",
    "Ogudu",
    "Ojo",
    "Ojodu",
    "Ojota",
    "Okota",
    "Omole Phase 1",
    "Omole Phase 2",
    "Onikan",
    "Onipanu",
    "Opebi",
    "Oshodi",
    "Palmgrove",
    "Raji Oba",
    "Sangotedo",
    "Satellite Town",
    "Shomolu",
    "Surulere",
    "Victoria Garden City (VGC)",
    "Victoria Island (VI)",
    "Yaba",
  ],
  Abuja: [
    "Asokoro",
    "Maitama",
    "Wuse",
    "Wuse 2",
    "Garki",
    "Garki 2",
    "Central Business District",
    "Jabi",
    "Utako",
    "Wuye",
    "Gwarinpa",
    "Life Camp",
    "Katampe",
    "Jahi",
    "Kado",
    "Mabushi",
    "Guzape",
    "Apo",
    "Lokogoma",
    "Galadimawa",
    "Durumi",
    "Lugbe",
    "Kubwa",
    "Dawaki",
    "Mpape",
    "Karu",
    "Nyanya",
  ],
} as const;

export type StateCity = keyof typeof LOCATION_AREAS;

export const SUPPORTED_STATE_CITIES = Object.keys(LOCATION_AREAS) as StateCity[];

export const getAreasForStateCity = (stateCity: string) =>
  (LOCATION_AREAS[stateCity as StateCity] || LOCATION_AREAS.Lagos).slice().sort();

export const getStateCityForArea = (area: string): StateCity => {
  const match = SUPPORTED_STATE_CITIES.find((stateCity) =>
    LOCATION_AREAS[stateCity].some((knownArea) => knownArea === area)
  );

  return match || "Lagos";
};

export const POPULAR_DESTINATIONS = [
  "Lagos",
  "Abuja",
  "Ikoyi",
  "Lekki Phase 1",
  "Victoria Island (VI)",
  "Ikeja GRA",
  "Maitama",
  "Wuse 2",
  "Asokoro",
  "Jabi",
];

export const FEATURED_DESTINATIONS = [
  {
    name: "Ikoyi",
    stateCity: "Lagos",
    count: "120+ stays",
    img: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400",
  },
  {
    name: "Lekki Phase 1",
    stateCity: "Lagos",
    count: "340+ stays",
    img: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400",
  },
  {
    name: "Maitama",
    stateCity: "Abuja",
    count: "New stays",
    img: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=400",
  },
  {
    name: "Wuse 2",
    stateCity: "Abuja",
    count: "New stays",
    img: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400",
  },
];

export const getMapQuery = ({
  address,
  location,
  city,
  country = NIGERIA_COUNTRY,
}: {
  address?: string | null;
  location?: string | null;
  city?: string | null;
  country?: string | null;
}) =>
  [address, location, city || (location ? getStateCityForArea(location) : ""), country]
    .filter(Boolean)
    .join(", ");
