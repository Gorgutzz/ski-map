export const attribution =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://openskimap.org/">OpenSkiMap.org</a>'

export const tileUrl =
  'http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';

export const defaultMapState = {
  lat: 39.8283,
  lng: -98.5795,
  zoom: 4,
  minZoom: 2,
  activeResort: null,
}

export function getMarkerColor(m) {
    return "black";
}
