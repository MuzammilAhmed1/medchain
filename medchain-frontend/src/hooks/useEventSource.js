import { useEffect, useRef, useState } from "react";
import { getToken, BASE_URL } from "../services/apiClient";

export function useEventSource(eventHandlers = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const handlersRef = useRef(eventHandlers);

  handlersRef.current = eventHandlers;

  useEffect(() => {
    let isMounted = true;

    function connect() {
      const token = getToken();
      const streamUrl = `${BASE_URL}/v1/events/stream${token ? `?token=${encodeURIComponent(token)}` : ""}`;

      const es = new EventSource(streamUrl);
      eventSourceRef.current = es;

      es.onopen = () => {
        if (isMounted) setIsConnected(true);
      };

      es.onerror = () => {
        if (isMounted) {
          setIsConnected(false);
          es.close();
          // Auto-reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
      };

      // Register custom event listeners
      const knownEvents = Array.from(new Set([
        "COLD_CHAIN_READING",
        "COLD_CHAIN_ALERT",
        "ANOMALY_DETECTED",
        "TRANSFER_UPDATED",
        "SHIPMENT_LOCATION_UPDATED",
        "NOTIFICATION",
        "BLOCKCHAIN_UPDATED",
        ...Object.keys(handlersRef.current || {})
      ]));

      knownEvents.forEach((eventName) => {
        es.addEventListener(eventName, (e) => {
          if (!handlersRef.current) return;
          try {
            const data = JSON.parse(e.data);
            if (handlersRef.current[eventName]) {
              handlersRef.current[eventName](data);
            }
            if (handlersRef.current["*"]) {
              handlersRef.current["*"](eventName, data);
            }
          } catch (err) {
            console.error(`Error parsing SSE data for ${eventName}:`, err);
          }
        });
      });
    }

    connect();

    return () => {
      isMounted = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return { isConnected };
}
