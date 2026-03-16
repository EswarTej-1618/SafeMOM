import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Navigation, MapPin } from "lucide-react";
import { io } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";


export const LiveLocationCard = () => {
  const { isMother } = useAuth();
  const [gps, setGps] = useState<{ latitude: number | null; longitude: number | null; source: "hardware" | "mobile" | null }>({
    latitude: null,
    longitude: null,
    source: null,
  });
  const lastHardwareGpsTimestamp = useRef<number>(0);


  useEffect(() => {
    // Setup WebSocket connection — hardware sensor data takes PRIORITY
    const socket = io(import.meta.env.VITE_API_URL || "http://localhost:3001");
    
    socket.on('stepsUpdate', (data) => {
      if (data.vitals && data.vitals.gps) {
        const v = data.vitals;
        if (v.gps.latitude != null && v.gps.longitude != null) {
          // If source is hardware, stamp the timestamp so mobile knows hardware is active
          if (v.gps.source !== 'mobile') {
            lastHardwareGpsTimestamp.current = Date.now();
          }
          setGps({
            latitude: v.gps.latitude,
            longitude: v.gps.longitude,
            source: v.gps.source || "hardware"
          });
        }
      }
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error in LiveLocationCard:', error);
    });

    // Mobile GPS: starts watching immediately, but only posts/shows if hardware is silent for 5 minutes
    let watchId: number;
    if (isMother && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const now = Date.now();
          const hardwareIsActive = now - lastHardwareGpsTimestamp.current < 300000;

          if (!hardwareIsActive) {
            // Hardware has been silent for 5+ minutes — use mobile GPS
            setGps({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              source: "mobile"
            });

            fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/steps/update`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                source: 'mobile',
              })
            }).catch(err => console.error("Error posting mobile GPS:", err));
          }
          // If hardware IS active, don't override — let socket handle it
        },
        (error) => console.error("Error watching mobile GPS:", error),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    }

    return () => {
      socket.disconnect();
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    }
  }, []);

  const handleTrackClick = () => {
    if (gps.latitude && gps.longitude) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${gps.latitude},${gps.longitude}`, '_blank');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="h-full"
    >
      <div className="glass-card h-full rounded-2xl p-6 md:p-8 border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.1)] relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-blue-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                <Navigation className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Live Location</h2>
            </div>
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleTrackClick}
              disabled={!gps.latitude}
              className="gap-2 border-blue-500/30 hover:bg-blue-500/10 text-blue-600 dark:text-blue-400"
            >
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">Track</span>
            </Button>
          </div>
          
          <div className="flex-1 flex flex-col justify-center gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background/50 rounded-2xl p-4 border border-border">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Latitude</p>
                <p className="text-sm md:text-base font-mono font-bold text-foreground truncate">
                  {gps.latitude !== null ? gps.latitude.toFixed(6) : "Searching..."}
                </p>
              </div>
              <div className="bg-background/50 rounded-2xl p-4 border border-border">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Longitude</p>
                <p className="text-sm md:text-base font-mono font-bold text-foreground truncate">
                  {gps.longitude !== null ? gps.longitude.toFixed(6) : "Searching..."}
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
              <span className={`w-2 h-2 rounded-full ${gps.latitude !== null ? 'bg-blue-500 animate-pulse' : 'bg-muted'} `} />
              {gps.latitude !== null 
                ? `GPS Signal Active (${gps.source === 'hardware' ? 'Hardware Sensor' : 'Mobile Device'})` 
                : 'Waiting for Signal'}
            </div>
            <p className="text-xs text-muted-foreground">Updates in real-time</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
