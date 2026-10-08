import { useState, useEffect, useRef, useCallback } from 'react';

export function useCrowdSocket(url) {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState('DISCONNECTED');
  const wsRef = useRef(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus('CONNECTING');
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('CONNECTED');
    };

    ws.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      if (parsed.error || parsed.message) {
        console.log("WS Message:", parsed);
        if (parsed.message === "Video stream ended.") {
           setStatus('DISCONNECTED');
        }
        return;
      }
      
      setData(parsed);
      setHistory(prev => {
        const newHistory = [...prev, parsed];
        if (newHistory.length > 60) {
          return newHistory.slice(newHistory.length - 60);
        }
        return newHistory;
      });
    };

    ws.onclose = () => {
      setStatus('DISCONNECTED');
    };

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
      setStatus('ERROR');
    };
  }, [url]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return { data, history, status, connect, disconnect };
}
