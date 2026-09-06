// Suggestions are a convenience, not an exhaustive catalogue or validation rule.
const modelsByBrand: Record<string, string[]> = {
  "Alfa Romeo": ["Giulietta", "Giulia", "Stelvio", "Tonale"],
  "Audi": ["A1", "A3", "A4", "A5", "A6", "Q2", "Q3", "Q5", "Q7"],
  "BMW": ["1 Serisi", "2 Serisi", "3 Serisi", "4 Serisi", "5 Serisi", "X1", "X3", "X5", "i4"],
  "BYD": ["Atto 3", "Dolphin", "Seal", "Seal U"],
  "Chery": ["Omoda 5", "Tiggo 7 Pro", "Tiggo 8 Pro"],
  "Citroën": ["C3", "C3 Aircross", "C4", "C4 X", "C5 Aircross", "Berlingo"],
  "Dacia": ["Duster", "Sandero", "Logan", "Jogger", "Spring"],
  "Fiat": ["Egea", "Linea", "Punto", "500", "500X", "Doblo", "Fiorino"],
  "Ford": ["Fiesta", "Focus", "Mondeo", "Puma", "Kuga", "Ranger", "Tourneo Courier"],
  "Honda": ["Civic", "City", "Jazz", "Accord", "HR-V", "CR-V"],
  "Hyundai": ["i10", "i20", "i30", "Accent", "Elantra", "Bayon", "Kona", "Tucson", "IONIQ 5"],
  "Jeep": ["Renegade", "Compass", "Avenger", "Grand Cherokee"],
  "Kia": ["Picanto", "Rio", "Ceed", "Cerato", "Stonic", "Sportage", "Sorento", "EV6"],
  "Land Rover": ["Defender", "Discovery", "Range Rover", "Range Rover Evoque", "Range Rover Sport"],
  "Mazda": ["2", "3", "6", "CX-3", "CX-5", "MX-5"],
  "Mercedes-Benz": ["A Serisi", "B Serisi", "C Serisi", "E Serisi", "S Serisi", "CLA", "GLA", "GLB", "GLC", "Vito"],
  "MG": ["ZS", "HS", "MG4"],
  "MINI": ["Cooper", "Countryman", "Clubman"],
  "Nissan": ["Micra", "Juke", "Qashqai", "X-Trail", "Navara"],
  "Opel": ["Corsa", "Astra", "Insignia", "Mokka", "Crossland", "Grandland", "Combo"],
  "Peugeot": ["208", "308", "408", "508", "2008", "3008", "5008", "Rifter"],
  "Renault": ["Clio", "Megane", "Symbol", "Taliant", "Captur", "Kadjar", "Austral", "Koleos", "Fluence", "Kangoo"],
  "SEAT": ["Ibiza", "Leon", "Arona", "Ateca"],
  "Škoda": ["Fabia", "Scala", "Octavia", "Superb", "Kamiq", "Karoq", "Kodiaq"],
  "Suzuki": ["Swift", "Vitara", "S-Cross", "Jimny"],
  "Tesla": ["Model 3", "Model Y", "Model S", "Model X"],
  "Togg": ["T10X"],
  "Toyota": ["Yaris", "Corolla", "Auris", "Avensis", "C-HR", "RAV4", "Hilux", "Proace City"],
  "Volkswagen": ["Polo", "Golf", "Passat", "Jetta", "T-Roc", "T-Cross", "Tiguan", "Touareg", "Caddy", "Transporter"],
  "Volvo": ["S60", "S90", "V40", "V60", "XC40", "XC60", "XC90", "EX30"],
};
export const vehicleBrands = Object.keys(modelsByBrand).sort((a, b) => a.localeCompare(b, "tr"));
function normalize(value: string) { return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i"); }
export function getModelSuggestions(brand: string): string[] {
  const aliases: Record<string, string> = { vw: "Volkswagen", mercedes: "Mercedes-Benz", citroen: "Citroën", skoda: "Škoda" };
  const search = normalize(brand);
  const key = aliases[search] ?? vehicleBrands.find((item) => normalize(item) === search);
  return key ? modelsByBrand[key] : [];
}
