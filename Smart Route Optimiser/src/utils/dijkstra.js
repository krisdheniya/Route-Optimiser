/**
 * Dijkstra's Algorithm implementation for route finding
 */
export class Dijkstra {
  constructor() {
    this.graph = new Map();
  }

  addNode(nodeId, coordinates) {
    if (!this.graph.has(nodeId)) {
      this.graph.set(nodeId, {
        id: nodeId,
        coords: coordinates,
        edges: []
      });
    }
  }

  addEdge(node1, node2, weight, tags = {}) {
    if (this.graph.has(node1) && this.graph.has(node2)) {
      this.graph.get(node1).edges.push({ to: node2, weight, tags });
      this.graph.get(node2).edges.push({ to: node1, weight, tags });
    }
  }

  findShortestPath(startNode, endNode) {
    const distances = new Map();
    const previous = new Map();
    const priorityQueue = new PriorityQueue();

    this.graph.forEach((_, nodeId) => {
      distances.set(nodeId, Infinity);
    });

    distances.set(startNode, 0);
    priorityQueue.push(startNode, 0);

    while (!priorityQueue.isEmpty()) {
      const { node: currentNodeId } = priorityQueue.pop();

      if (currentNodeId === endNode) {
        return this.reconstructPath(previous, endNode);
      }

      const nodeData = this.graph.get(currentNodeId);
      if (!nodeData) continue;

      for (const edge of nodeData.edges) {
        const distance = distances.get(currentNodeId) + edge.weight;

        if (distance < distances.get(edge.to)) {
          distances.set(edge.to, distance);
          previous.set(edge.to, currentNodeId);
          priorityQueue.push(edge.to, distance);
        }
      }
    }

    return null;
  }

  reconstructPath(previous, endNode) {
    const path = [];
    let current = endNode;
    while (current !== undefined) {
      const nodeData = this.graph.get(current);
      if (nodeData) {
        path.unshift(nodeData.coords);
      }
      current = previous.get(current);
    }
    return path;
  }
}

class PriorityQueue {
  constructor() {
    this.values = [];
  }

  push(node, priority) {
    this.values.push({ node, priority });
    this.sort();
  }

  pop() {
    return this.values.shift();
  }

  isEmpty() {
    return this.values.length === 0;
  }

  sort() {
    this.values.sort((a, b) => a.priority - b.priority);
  }
}

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};
