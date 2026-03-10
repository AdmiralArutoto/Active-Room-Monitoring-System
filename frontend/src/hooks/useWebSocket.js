import { useEffect, useRef, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const WS_URL = API_URL.replace(/^http/, 'ws');

const RECONNECT_BASE = 1000;
const RECONNECT_MAX = 10000;

export default function useWebSocket() {
  const [sensorStates, setSensorStates] = useState({});
  const wsRef = useRef(null);
  const retryRef = useRef(0);
  const unmountedRef = useRef(false);

  useEffect(() => {
    unmountedRef.current = false;

    function connect() {
      const token = sessionStorage.getItem('token');
      if (!token) return;

      const ws = new WebSocket(`${WS_URL}/ws?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        retryRef.current = 0;
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);

        if (msg.type === 'snapshot') {
          setSensorStates(msg.states);
        } else if (msg.type === 'state_changed') {
          setSensorStates((prev) => ({
            ...prev,
            [msg.sensor_key]: {
              sensor_id: msg.sensor_id,
              state: msg.state,
              ts: msg.ts,
            },
          }));
        }
      };

      ws.onclose = () => {
        if (unmountedRef.current) return;
        const delay = Math.min(RECONNECT_BASE * 2 ** retryRef.current, RECONNECT_MAX);
        retryRef.current++;
        setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      unmountedRef.current = true;
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  return sensorStates;
}
