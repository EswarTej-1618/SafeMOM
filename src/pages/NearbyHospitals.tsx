import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Navigation, Hospital as HospitalIcon, MapPin, Loader2, Phone, AlertTriangle, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet's default icon path issues
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

// Calculate distance
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(2);
}

// Custom icons
const createHospitalIcon = () => {
  return L.divIcon({
    className: "bg-transparent border-0",
    html: `<div class="bg-destructive border-2 border-white rounded-full w-8 h-8 flex items-center justify-center text-sm shadow-[0_2px_6px_rgba(0,0,0,0.4)]">🏥</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

const createUserIcon = () => {
  return L.divIcon({
    className: "bg-transparent border-0",
    html: `<div class="bg-primary border-2 border-white rounded-full w-6 h-6 shadow-[0_2px_6px_rgba(0,0,0,0.5)]"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

interface Hospital {
  id: number;
  lat: number;
  lon: number;
  name: string;
  phone: string;
  emergency: boolean;
  address: string;
  distance: string;
}

const NearbyHospitals = () => {
  const { isMother, loading } = useAuth();
  
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  const [query, setQuery] = useState("");
  const [specificHospitalQuery, setSpecificHospitalQuery] = useState("");
  const [radius, setRadius] = useState("2000");
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [searching, setSearching] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Enter a location or click "Use Current Location"');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  
  const hospitalMarkersRef = useRef<L.Marker[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userCircleRef = useRef<L.Circle | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current).setView([20.5937, 78.9629], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Auto-locate on first load
  useEffect(() => {
    const timer = setTimeout(() => {
      locateAndFindHospitals();
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearHospitals = useCallback(() => {
    if (!mapRef.current) return;
    hospitalMarkersRef.current.forEach((m) => mapRef.current?.removeLayer(m));
    hospitalMarkersRef.current = [];
    setHospitals([]);
  }, []);

  const showUserLocationInfo = useCallback((lat: number, lng: number, label = "Your Location") => {
    if (!mapRef.current) return;
    
    if (userMarkerRef.current) mapRef.current.removeLayer(userMarkerRef.current);
    if (userCircleRef.current) mapRef.current.removeLayer(userCircleRef.current);

    const rad = parseInt(radius, 10);

    userMarkerRef.current = L.marker([lat, lng], { icon: createUserIcon() })
      .addTo(mapRef.current)
      .bindPopup(`<b>${label}</b>`)
      .openPopup();

    userCircleRef.current = L.circle([lat, lng], {
      radius: rad,
      color: "hsl(var(--primary))",
      fillColor: "hsl(var(--primary))",
      fillOpacity: 0.1,
      weight: 2,
      dashArray: "6, 6",
    }).addTo(mapRef.current);
    
    // Remember the user's location if it's their actual location
    if (label === "Your Current Location") {
      setUserLocation({ lat, lng });
    }
  }, [radius]);

  const fetchHospitals = async (lat: number, lng: number) => {
    const rad = parseInt(radius, 10);
    setStatusMsg("Searching for hospitals nearby...");
    setSearching(true);
    clearHospitals(); // Clear old results immediately

    const overpassQuery = `
      [out:json][timeout:25];
      (
        node["amenity"="hospital"](around:${rad},${lat},${lng});
        way["amenity"="hospital"](around:${rad},${lat},${lng});
        node["amenity"="clinic"](around:${rad},${lat},${lng});
        node["healthcare"="hospital"](around:${rad},${lat},${lng});
      );
      out center;
    `;

    const endpoints = [
      "https://overpass-api.de/api/interpreter",
      "https://lz4.overpass-api.de/api/interpreter",
      "https://overpass.kumi.systems/api/interpreter",
      "https://z.overpass-api.de/api/interpreter"
    ];

    try {
      let data = null;
      let success = false;
      
      for (const endpoint of endpoints) {
        try {
          const url = `${endpoint}?data=${encodeURIComponent(overpassQuery)}`;
          const response = await fetch(url);
          
          if (!response.ok) {
            continue; // Try next endpoint
          }
          
          data = await response.json();
          success = true;
          break; // Stop trying if successful
        } catch (err) {
          console.warn(`Endpoint ${endpoint} failed, trying next...`);
        }
      }

      if (!success || !data) {
        throw new Error("All Overpass API endpoints failed.");
      }
      
      if (!data.elements || data.elements.length === 0) {
        setStatusMsg("No hospitals found nearby. Try increasing the radius.");
        setSearching(false);
        return;
      }

      const foundHospitals: Hospital[] = [];

      data.elements.forEach((hospital: any, index: number) => {
        const hLat = hospital.lat || hospital.center?.lat;
        const hLng = hospital.lon || hospital.center?.lon;

        if (!hLat || !hLng) return;

        const name = hospital.tags?.name || `Hospital ${index + 1}`;
        const phone = hospital.tags?.phone || hospital.tags?.["contact:phone"] || "N/A";
        const emergency = hospital.tags?.emergency === "yes";
        const address = hospital.tags?.["addr:street"]
          ? `${hospital.tags["addr:housenumber"] || ""} ${hospital.tags["addr:street"]}`
          : "Address not available";

        // Calculate distance from their actual GPS location if available, otherwise from the search center
        const distanceLat = userLocation ? userLocation.lat : lat;
        const distanceLng = userLocation ? userLocation.lng : lng;
        const distance = getDistance(distanceLat, distanceLng, hLat, hLng);

        foundHospitals.push({ id: hospital.id || index, lat: hLat, lon: hLng, name, phone, emergency, address, distance });

        if (mapRef.current) {
          const marker = L.marker([hLat, hLng], { icon: createHospitalIcon() })
            .addTo(mapRef.current)
            .bindPopup(`
              <div class="min-w-[180px] font-sans">
                <b class="text-destructive text-[15px] flex items-center gap-1"><span class="text-xl">🏥</span> ${name}</b>
                <hr class="my-2 border-border"/>
                <div class="text-sm">
                  <p class="mb-1">📞 <b>Phone:</b> ${phone}</p>
                  <p class="mb-1">📍 <b>Address:</b> ${address}</p>
                  <p class="mb-1">📏 <b>Distance:</b> ${distance} km</p>
                </div>
              </div>
            `);
          hospitalMarkersRef.current.push(marker);
        }
      });

      // Sort by distance
      foundHospitals.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
      setHospitals(foundHospitals);
      setStatusMsg(`Found ${foundHospitals.length} hospitals nearby.`);

      if (hospitalMarkersRef.current.length > 0 && mapRef.current) {
        const group = L.featureGroup([userMarkerRef.current!, ...hospitalMarkersRef.current].filter(Boolean) as L.Marker[]);
        mapRef.current.fitBounds(group.getBounds().pad(0.1));
      }
    } catch (error) {
      console.error(error);
      setStatusMsg("Error fetching hospitals. Please try again.");
      toast.error("Failed to fetch hospitals.");
    } finally {
      setSearching(false);
    }
  };

  const searchAndFindHospitals = async () => {
    if (!query.trim()) {
      toast.error("Please enter a city or area name.");
      return;
    }

    setSearching(true);
    setStatusMsg("Looking up location...");

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.length === 0) {
        toast.error("Location not found! Try a different name.");
        setStatusMsg("Location not found.");
        setSearching(false);
        return;
      }

      const { lat, lon, display_name } = data[0];
      const parsedLat = parseFloat(lat);
      const parsedLon = parseFloat(lon);
      
      if (mapRef.current) {
        mapRef.current.setView([parsedLat, parsedLon], 14);
      }
      
      showUserLocationInfo(parsedLat, parsedLon, display_name);
      await fetchHospitals(parsedLat, parsedLon);
    } catch (error) {
      console.error(error);
      setStatusMsg("Error finding location.");
      toast.error("Error looking up location.");
      setSearching(false);
    }
  };

  const searchSpecificHospital = async () => {
    if (!specificHospitalQuery.trim()) {
      toast.error("Please enter a hospital name.");
      return;
    }

    setSearching(true);
    setStatusMsg("Finding specific hospital...");

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(specificHospitalQuery)}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.length === 0) {
        toast.error("Hospital not found! Try adding city name.");
        setStatusMsg("Hospital not found.");
        setSearching(false);
        return;
      }

      const { lat, lon, display_name, type } = data[0];
      const parsedLat = parseFloat(lat);
      const parsedLon = parseFloat(lon);
      
      clearHospitals();
      
      let distance = "Unknown";
      if (userLocation) {
        distance = getDistance(userLocation.lat, userLocation.lng, parsedLat, parsedLon);
      } else {
        toast.info("Distance unavailable. Please 'Use Current Location' first to track distance.");
      }
      
      const hospitalName = display_name.split(',')[0] || "Found Hospital";
      
      const singleHospital: Hospital = {
        id: 99999,
        lat: parsedLat,
        lon: parsedLon,
        name: hospitalName,
        phone: "N/A",
        emergency: type === "hospital" || data[0].class === "amenity",
        address: display_name,
        distance: distance !== "Unknown" ? distance : "0.00"
      };

      setHospitals([singleHospital]);
      setStatusMsg(`Found ${hospitalName}.`);
      
      if (mapRef.current) {
        mapRef.current.setView([parsedLat, parsedLon], 16);
        const marker = L.marker([parsedLat, parsedLon], { icon: createHospitalIcon() })
          .addTo(mapRef.current)
          .bindPopup(`
            <div class="min-w-[180px] font-sans">
              <b class="text-destructive text-[15px] flex items-center gap-1"><span class="text-xl">🏥</span> ${hospitalName}</b>
              <hr class="my-2 border-border"/>
              <div class="text-sm">
                <p class="mb-1">📍 <b>Address:</b> ${display_name.substring(0, 60)}...</p>
                ${distance !== "Unknown" ? `<p class="mb-1 text-primary font-medium">📏 <b>Distance:</b> ${distance} km from you</p>` : ""}
              </div>
            </div>
          `);
          
        hospitalMarkersRef.current.push(marker);
        setTimeout(() => marker.openPopup(), 500);
      }
    } catch (error) {
      console.error(error);
      setStatusMsg("Error finding hospital.");
      toast.error("Error looking up hospital.");
    } finally {
      setSearching(false);
    }
  };

  const locateAndFindHospitals = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }

    setSearching(true);
    setStatusMsg("Getting your current location...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (mapRef.current) {
          mapRef.current.setView([lat, lng], 14);
        }
        showUserLocationInfo(lat, lng, "Your Current Location");
        await fetchHospitals(lat, lng);
      },
      (err) => {
        console.error(err);
        toast.error("Unable to access location. Please check your browser permissions.");
        setStatusMsg("Location access denied.");
        setSearching(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const flyToHospital = (lat: number, lng: number, index: number) => {
    if (mapRef.current) {
      mapRef.current.flyTo([lat, lng], 16, { duration: 1.5 });
      const marker = hospitalMarkersRef.current[index];
      if (marker) {
        // slight delay to let flyTo finish panning before opening popup
        setTimeout(() => marker.openPopup(), 500);
      }
    }
  };

  if (loading) return null;
  if (!isMother) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 pt-24 pb-12 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="h-full flex flex-col gap-6"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <HospitalIcon className="w-8 h-8 text-destructive" />
                Nearby Hospitals
              </h1>
              <p className="text-muted-foreground mt-1">Find emergency services and clinics in your area.</p>
            </div>
            
            <div className="flex bg-muted/50 rounded-full px-4 py-2 items-center gap-2 text-sm text-muted-foreground font-medium">
              <Activity className="w-4 h-4 text-primary" />
              {statusMsg}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 lg:h-[calc(100vh-220px)] lg:min-h-[600px]">
            {/* Left Panel - Controls & List */}
            <div className="lg:col-span-1 flex flex-col gap-4 lg:h-full lg:overflow-hidden">
              <Card className="rounded-2xl border-border/50 shadow-sm shrink-0">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Location Search</CardTitle>
                  <CardDescription>Enter a city or use your device GPS</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Enter city or area..."
                      className="pl-9"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && searchAndFindHospitals()}
                      disabled={searching}
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Select value={radius} onValueChange={setRadius} disabled={searching}>
                        <SelectTrigger>
                          <SelectValue placeholder="Radius" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1000">1 km radius</SelectItem>
                          <SelectItem value="2000">2 km radius</SelectItem>
                          <SelectItem value="5000">5 km radius</SelectItem>
                          <SelectItem value="10000">10 km radius</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={searchAndFindHospitals} disabled={searching || !query.trim()} className="px-5">
                      {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                    </Button>
                  </div>
                  
                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-border"></div>
                    <span className="flex-shrink-0 mx-4 text-muted-foreground text-xs uppercase font-medium">or</span>
                    <div className="flex-grow border-t border-border"></div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full relative overflow-hidden group border-primary/20 hover:border-primary hover:bg-primary/5 transition-all"
                    onClick={locateAndFindHospitals}
                    disabled={searching}
                  >
                    <Navigation className="mr-2 h-4 w-4 text-primary group-hover:animate-pulse" />
                    Use Current Location
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border/50 shadow-sm flex-1 flex flex-col overflow-hidden min-h-[400px] lg:min-h-0">
                <CardHeader className="pb-3 border-b border-border/50 shrink-0">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>Hospitals Found</span>
                    <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-sm">
                      {hospitals.length}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                  {hospitals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center h-full text-muted-foreground">
                      <HospitalIcon className="h-12 w-12 mb-3 opacity-20" />
                      <p>No hospitals loaded yet.</p>
                      <p className="text-sm mt-1">Search or use your location to find nearby health facilities.</p>
                    </div>
                  ) : (
                    <div className="overflow-y-auto p-4 space-y-3 flex-1">
                      {hospitals.map((hospital, index) => (
                        <div 
                          key={hospital.id || index}
                          onClick={() => flyToHospital(hospital.lat, hospital.lon, index)}
                          className="group relative flex flex-col gap-2 p-3 rounded-xl border border-transparent hover:border-destructive/30 hover:bg-destructive/5 cursor-pointer bg-muted/30 transition-all duration-200"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-foreground text-sm flex-1 leading-tight group-hover:text-destructive transition-colors">
                              {hospital.name}
                            </h4>
                          </div>
                          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate" title={hospital.address}>{hospital.address}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 shrink-0" />
                                <span>{hospital.phone}</span>
                              </div>
                              <span className="font-medium bg-background px-2 py-0.5 rounded-md shadow-sm border border-border">
                                {hospital.distance} km
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Panel - Map */}
            <div className="lg:col-span-2 relative h-[500px] lg:h-full lg:min-h-0 rounded-2xl overflow-hidden shadow-md border border-border">
              {/* Map Top Search */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 w-[90%] sm:w-[80%] max-w-md bg-card/95 backdrop-blur-sm rounded-full shadow-lg p-1.5 flex gap-2 border border-border items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search specific hospital..."
                    className="pl-9 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-10 shadow-none"
                    value={specificHospitalQuery}
                    onChange={(e) => setSpecificHospitalQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchSpecificHospital()}
                    disabled={searching}
                  />
                </div>
                <Button 
                  onClick={searchSpecificHospital} 
                  disabled={searching || !specificHospitalQuery.trim()} 
                  className="rounded-full px-5 h-10 shrink-0 shadow-sm"
                >
                  Find
                </Button>
              </div>

              {searching && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-[1000] flex flex-col items-center justify-center">
                  <div className="bg-card p-4 rounded-xl shadow-lg flex flex-col items-center">
                    <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                    <p className="font-medium text-foreground">Scanning area...</p>
                  </div>
                </div>
              )}
              <div ref={mapContainerRef} className="w-full h-full z-0" />
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default NearbyHospitals;
