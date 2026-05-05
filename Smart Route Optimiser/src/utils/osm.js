/**
 * OSM and Overpass API utility functions
 */

export const fetchOSMData = async (bbox) => {
  const [south, west, north, east] = bbox;
  const query = `
    [out:json][timeout:25];
    (
      way["highway"](${south},${west},${north},${east});
    );
    out body;
    >;
    out skel qt;
  `;

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query,
  });

  if (!response.ok) {
    throw new Error('Failed to fetch data from OSM');
  }

  return response.json();
};

export const buildGraphFromOSM = (data, dijkstraInstance, calculateDistance) => {
  const nodes = new Map();
  const nodesInWays = new Set();
  
  // First pass: add all nodes and track which ones are in ways
  data.elements.forEach(element => {
    if (element.type === 'node') {
      nodes.set(element.id, [element.lat, element.lon]);
    } else if (element.type === 'way' && element.nodes) {
      element.nodes.forEach(nodeId => nodesInWays.add(nodeId));
    }
  });

  // Second pass: add nodes to Dijkstra only if they are in ways
  nodes.forEach((coords, id) => {
    if (nodesInWays.has(id)) {
      dijkstraInstance.addNode(id, coords);
    }
  });

  // Third pass: add edges from ways
  data.elements.forEach(element => {
    if (element.type === 'way' && element.nodes) {
      for (let i = 0; i < element.nodes.length - 1; i++) {
        const node1Id = element.nodes[i];
        const node2Id = element.nodes[i+1];
        
        const node1Coords = nodes.get(node1Id);
        const node2Coords = nodes.get(node2Id);
        
        if (node1Coords && node2Coords) {
          const distance = calculateDistance(
            node1Coords[0], node1Coords[1],
            node2Coords[0], node2Coords[1]
          );
          
          let multiplier = 1;
          const highway = element.tags?.highway;
          if (highway === 'motorway' || highway === 'trunk') multiplier = 0.8;
          if (highway === 'residential' || highway === 'unclassified') multiplier = 1.5;
          if (highway === 'service') multiplier = 2.0;
          
          dijkstraInstance.addEdge(node1Id, node2Id, distance * multiplier, element.tags);
        }
      }
    }
  });
};

export const findNearestNode = (lat, lon, data) => {
  let minDistance = Infinity;
  let nearestNodeId = null;
  
  const nodesInWays = new Set();
  data.elements.forEach(el => {
    if (el.type === 'way') el.nodes.forEach(id => nodesInWays.add(id));
  });

  data.elements.forEach(element => {
    if (element.type === 'node' && nodesInWays.has(element.id)) {
      const dist = Math.sqrt(Math.pow(lat - element.lat, 2) + Math.pow(lon - element.lon, 2));
      if (dist < minDistance) {
        minDistance = dist;
        nearestNodeId = element.id;
      }
    }
  });

  return nearestNodeId;
};

