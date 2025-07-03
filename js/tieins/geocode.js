const ORS_API_KEY = '5b3ce3597851110001cf6248ae776a511fb745d0ac34924af2617b9e';

export async function geocodeLocation(query) {
  const url = `https://api.openrouteservice.org/geocode/search?api_key=${ORS_API_KEY}&text=${encodeURIComponent(query)}&size=1`;
  console.log(url)
  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding failed");
  const data = await res.json();
  if (!data.features || data.features.length === 0) return null;
  const [lon, lat] = data.features[0].geometry.coordinates;
  return { lat, lon };
}
