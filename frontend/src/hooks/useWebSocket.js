import { useEffect, useRef, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const WS_URL = API_URL.replace(/^http/, 'ws');

const RECONNECT_BASE = 1000;
const RECONNECT_MAX = 10000;

export default function useWebSocket(onStateChange, onStatus) {
  const [sensorStates, setSensorStates] = useState({});
  const wsRef = useRef(null);
  const retryRef = useRef(0);
  const unmountedRef = useRef(false);
  // Keep the latest callbacks without re-opening the socket on every render.
  const cbRef = useRef(onStateChange);
  cbRef.current = onStateChange;
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;

  useEffect(() => {
    unmountedRef.current = false;

    function connect() {
      const token = sessionStorage.getItem('token');
      if (!token) return;

      statusRef.current?.('connecting');
      const ws = new WebSocket(`${WS_URL}/ws?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        retryRef.current = 0;
        statusRef.current?.('open');
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
          cbRef.current?.(msg);
        } else if (msg.type === 'sensor_deactivated') {
          setSensorStates((prev) => {
            const next = { ...prev };
            delete next[msg.sensor_key];
            return next;
          });
        }
      };

      ws.onclose = () => {
        if (unmountedRef.current) return;
        statusRef.current?.('closed');
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
