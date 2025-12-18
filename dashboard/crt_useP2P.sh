cd ~/repos/mycelial-dashboard/dashboard

cat > src/hooks/useP2P.ts << 'EOF'
import { useState, useEffect, useCallback, useRef } from 'react';

export interface GraphNode {
  id: string;
  label: string;
  reputation?: number;
  isLocal?: boolean;
}

export interface GraphLink {
  source: string;
  target: string;
  strength?: number;
}

export interface ChatMessage {
  id: string;
  from: string;
  content: string;
  timestamp: Date;
}

export interface NormalizedPeer {
  id: string;
  address: string;
  connected: boolean;
  reputation?: number;
  lastSeen?: Date;
}

export function useP2P() {
  const [connected, setConnected] = useState(false);
  const [localPeerId, setLocalPeerId] = useState<string>('local-' + Math.random().toString(36).slice(2, 10));
  const [peers, setPeers] = useState<Map<string, NormalizedPeer>>(new Map());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const wsUrl = import.meta.env.VITE_P2P_WS_URL || import.meta.env.VITE_WS_URL || 'ws://localhost:9090/api/v1/events';

  // Generate graph data from peers
  const graphData = useCallback((): { nodes: GraphNode[]; links: GraphLink[] } => {
    const nodes: GraphNode[] = [
      { id: localPeerId, label: 'You', isLocal: true, reputation: 100 }
    ];
    const links: GraphLink[] = [];

    peers.forEach((peer, peerId) => {
      nodes.push({
        id: peerId,
        label: peerId.slice(0, 8),
        reputation: peer.reputation || 50,
        isLocal: false,
      });
      links.push({
        source: localPeerId,
        target: peerId,
        strength: peer.connected ? 1 : 0.3,
      });
    });

    return { nodes, links };
  }, [localPeerId, peers]);

  // Send chat message
  const sendChat = useCallback((content: string, to?: string) => {
    const message: ChatMessage = {
      id: Math.random().toString(36).slice(2),
      from: localPeerId,
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, message]);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat',
        data: { content, to }
      }));
    }
  }, [localPeerId]);

  // WebSocket connection
  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 5;

    const connect = () => {
      if (!isMounted || retryCount >= maxRetries) return;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          console.log('P2P WebSocket connected');
          setConnected(true);
          retryCount = 0;

          // Subscribe to events
          ws.send(JSON.stringify({
            type: 'subscribe',
            topics: ['nodes', 'workloads', 'cluster']
          }));
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'node_added' || data.type === 'node_updated') {
              const node = data.data;
              setPeers(prev => {
                const next = new Map(prev);
                next.set(node.id, {
                  id: node.id,
                  address: node.address || '',
                  connected: node.status === 'Ready',
                  reputation: 50,
                  lastSeen: new Date(),
                });
                return next;
              });
            }
          } catch (e) {
            console.error('Failed to parse WebSocket message:', e);
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          console.log('P2P WebSocket disconnected');
          setConnected(false);
          wsRef.current = null;

          // Reconnect with backoff
          retryCount++;
          if (retryCount < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
            reconnectTimeoutRef.current = setTimeout(connect, delay);
          }
        };

        ws.onerror = (error) => {
          console.error('P2P WebSocket error:', error);
        };
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [wsUrl]);

  return {
    connected,
    localPeerId,
    peers,
    messages,
    sendChat,
    graphData,
  };
}

export default useP2P;
EOF
