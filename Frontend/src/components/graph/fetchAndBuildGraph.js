// fetchAndBuildGraph.js

import axios from "axios";
import Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";
import { centrality } from "graphology-metrics";
import modularity from "graphology-communities-louvain";
import { density } from "graphology-metrics/graph";

const colorPalette = {
  nodeDefault: "#D3D3D3",       // Light Gray
  nodeHighlighted: "#A9A9A9",   // Dark Gray
  edgeDefault: "#A0A0A0",       // Medium Gray
  edgeHighlighted: "#505050",   // Very Dark Gray
  // Updated communities with more contrast and neutral tones
  communities: [
    "#FF0000", // Red
    "#0000FF", // Blue
    "#FFFF00", // Yellow
    "#FF00FF", // Purple
    "#00FFFF", // Cyan
    "#FFA500", // Orange
    "#C0C0C0", // Silver
    "#A9A9A9", // Dark Gray
    "#D3D3D3", // Light Gray
    "#F5F5F5", // Whitesmoke
    "#E0E0E0", // Gainsboro
    "#F8F8F8", // Near White
    "#FFFFFF", // White
    "#B0B0B0", // Silver
  ],
  // Use colors of varying shades for the edge types
  sender: "#6A5ACD",      // Slate Blue
  receiver: "#9370DB",    // Medium Purple
  mentioned: "#BA55D3",   // Medium Orchid
  author: "#FF69B4",      // Hot Pink
  waypoint: "#D8BFD8",    // Thistle
};

const fetchAndBuildGraph = async (
  nodesUrl,
  edgesUrl,
  filters,
  edgeTypeFilters,
  body,
  selectedTerms,
  dateRange
) => {
  const nodes = [];
  const edges = [];
  let metrics = null;
  const nodeIds = new Set();
  const edgeIds = new Set();

  const generateRandomSoftColor = () => {
    const colors = colorPalette.communities;
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const getEdgeColor = (type) => {
    const edgeColors = {
      document: "#A0A0A0",      // Medium Gray
      organization: "#808080",  // Gray
      religion: "#696969",      // Dim Gray
      relationship: "#505050",  // Dark Gray
      sender: colorPalette.sender,
      receiver: colorPalette.receiver,
      mentioned: colorPalette.mentioned,
      author: colorPalette.author,
      waypoint: colorPalette.waypoint,
      Unknown: "#B0B0B0",        // Silver
    };
    return edgeColors[type] || generateRandomSoftColor();
  };

  try {
    console.log("Fetching nodes and edges...");
    const [nodesResponse, edgesResponse] = await Promise.all([
      axios.post(nodesUrl, body),
      axios.post(edgesUrl, body),
    ]);

    const nodesData = nodesResponse.data;
    const edgesData = edgesResponse.data;

    console.log("nodesData", nodesData, "edgesData", edgesData);

    // Process nodes
    const nodesArray = nodesData;
    nodesArray.forEach((node) => {
      const newNode = {
        id: node.id,
        label:
          node.fullName ||
          node.organizationDesc ||
          node.religionDesc ||
          node.relationDesc ||
          node.documentTitle ||
          "Unknown",
        size: 15,
        color: colorPalette.nodeDefault,
        borderColor: "#95A5A6",
        borderWidth: 2,
        highlighted: false,
        group: node.group, // Ensure 'group' is defined,
        date: node.date,
        ...node,
      };

      if (!nodeIds.has(newNode.id)) {
        nodes.push(newNode);
        nodeIds.add(newNode.id);
      }
    });

    // Process edges
    const edgesArray = edgesData.edges || edgesData;
    edgesArray.forEach((edge) => {
      if (edge.from !== edge.to) {
        const edgeId = `edge-${edge.from}-${edge.to}`;

        if (edgeIds.has(edgeId)) return;
        const newEdge = {
          id: edgeId,
          source: edge.from,
          target: edge.to,
          color: getEdgeColor(edge.type),
          size: 2,
          hidden: false,
          opacity: 0.7,
          date: edge.document?.date,
          label: edge.type || "Unknown", // Ensure label is set
          ...edge,
        };

        // Handle different role types
        switch (edge.roleID) {
          case 1:
            newEdge.label = "Sender";
            break;
          case 2:
            newEdge.label = "Receiver";
            break;
          case 3:
            newEdge.label = "Mentioned";
            break;
          case 4:
            newEdge.label = "Author";
            break;
          case 5:
            newEdge.label = "Waypoint";
            break;
          default:
            break;
        }

        edges.push(newEdge);
        edgeIds.add(edgeId);
      }
    });

    // Apply filtering
    const graph = buildGraph(
      nodes,
      edges,
      filters,
      edgeTypeFilters,
      selectedTerms,
      dateRange
    );

    // Compute metrics
    metrics = computeMetrics(graph);

    return { graph, metrics };
  } catch (error) {
    console.error("Error fetching or building graph:", error);
    throw error;
  }
};

const buildGraph = (
  nodes,
  edges,
  filters,
  edgeTypeFilters,
  selectedTerms,
  dateRange
) => {
  const graph = new Graph({ multi: true });

  // Helper function to extract year from various date formats
  const extractYear = (date) => {
    if (typeof date === "number") {
      return date;
    }

    if (typeof date === "string") {
      const yearMatch = date.match(/^(\d{4})/);
      if (yearMatch) {
        const year = parseInt(yearMatch[1], 10);
        if (!isNaN(year)) {
          return year;
        }
      }
    }

    return undefined;
  };

  // Create a map for quick node lookup by ID
  const nodeMap = new Map();
  nodes.forEach((node) => {
    nodeMap.set(node.id, node);
  });

  const terms = Array.isArray(selectedTerms) ? selectedTerms : [];
  const [startDate, endDate] = dateRange;

  // Step 1: Filter nodes based on selected filters, terms
  const filteredNodesMatchingTerms = nodes.filter((node) => {
    // Check if any group filters are active
    const isGroupFilterActive = Object.values(filters).some((value) => value);
    const groupMatch = isGroupFilterActive ? filters[node.group] : true;

    // Check if any term filters are active
    const isTermFilterActive = terms.length > 0;
    // Updated termMatch to handle partial and case-insensitive matches
    const termMatch = isTermFilterActive
      ? terms.some(term =>
          node.label.toLowerCase().includes(term.toLowerCase())
        )
      : true;

    // Include the node only if it matches all active filters
    return groupMatch && termMatch;
  });

  // Step 2: Extract IDs of nodes that match the filters
  const matchedNodeIds = new Set(
    filteredNodesMatchingTerms.map((node) => node.id)
  );

  // Step 3: Find immediate connections (neighbors) of the matched nodes
  const immediateConnectedNodeIds = new Set();

  edges.forEach((edge) => {
    if (matchedNodeIds.has(edge.source)) {
      immediateConnectedNodeIds.add(edge.target);
    }
    if (matchedNodeIds.has(edge.target)) {
      immediateConnectedNodeIds.add(edge.source);
    }
  });

  // Step 4: Identify all 'document' nodes that match and their connections
  const documentNodes = filteredNodesMatchingTerms.filter(
    (node) => node.group === "document"
  );
  const documentNodeIds = new Set(documentNodes.map((node) => node.id));

  const documentConnectedNodeIds = new Set();

  edges.forEach((edge) => {
    if (documentNodeIds.has(edge.source)) {
      const targetNode = nodeMap.get(edge.target);
      // Only add target node if it has passed group and term filters
      if (targetNode && filters[targetNode.group] && matchedNodeIds.has(targetNode.id)) {
        documentConnectedNodeIds.add(edge.target);
      }
    }
    if (documentNodeIds.has(edge.target)) {
      const sourceNode = nodeMap.get(edge.source);
      if (sourceNode && filters[sourceNode.group] && matchedNodeIds.has(sourceNode.id)) {
        documentConnectedNodeIds.add(edge.source);
      }
    }
  });

  // Step 5: Combine all relevant node IDs
  const combinedNodeIds = new Set([
    ...matchedNodeIds,
    ...immediateConnectedNodeIds,
    ...documentNodeIds,
    ...documentConnectedNodeIds,
  ]);

  // Step 6: Filter nodes to include only those in combinedNodeIds and match group filters
  const filteredNodesByGroup = nodes.filter((node) => {
    const groupMatch = filters[node.group];
    const isInCombined = combinedNodeIds.has(node.id);
    return groupMatch && isInCombined;
  });

  const filteredNodeIdsByGroup = new Set(
    filteredNodesByGroup.map((node) => node.id)
  );

  // Step 7: Filter edges based on type and connected nodes
  const filteredEdges = edges.filter(
    (edge) =>
      filteredNodeIdsByGroup.has(edge.source) &&
      filteredNodeIdsByGroup.has(edge.target) &&
      edge.label &&
      edgeTypeFilters[edge.label]
  );

  // Step 8: Collect connected node IDs
  const connectedNodeIds = new Set();
  filteredEdges.forEach((edge) => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });

  // Step 9: Ensure only connected nodes are included
  const finalFilteredNodes = filteredNodesByGroup.filter((node) =>
    connectedNodeIds.has(node.id)
  );

  // Step 10: Add nodes to the graph
  finalFilteredNodes.forEach((node) => {
    graph.addNode(node.id, {
      ...node,
      data: {
        ...(node.personID && { person: { ...node } }),
        ...(node.organizationID && { organization: { ...node } }),
        ...(node.religionID && { religion: { ...node } }),
        ...(node.documentID && { document: { ...node } }),
      },
      color:
        node.group !== "document"
          ? colorPalette.nodeDefault
          : colorPalette.communities[
              Math.floor(Math.random() * colorPalette.communities.length)
            ],
    });
  });

  const getEdgeColor = (type) => {
    const edgeColors = {
      document: "#A0A0A0",      // Medium Gray
      organization: "#808080",  // Gray
      religion: "#696969",      // Dim Gray
      relationship: "#505050",  // Dark Gray
      sender: colorPalette.sender,
      receiver: colorPalette.receiver,
      mentioned: colorPalette.mentioned,
      author: colorPalette.author,
      waypoint: colorPalette.waypoint,
      Unknown: "#B0B0B0",        // Silver
    };
    return edgeColors[type] 
  };

  // Step 11: Add edges to the graph
  filteredEdges.forEach((edge) => {
    graph.addEdge(edge.source, edge.target, {
      ...edge,
      color: getEdgeColor(edge.type),
    });
  });

  // Step 12: Filter out document nodes outside the date range using node.date
  if (startDate !== undefined && endDate !== undefined) {
    const documentNodesToRemove = [];
    graph.forEachNode((nodeId, nodeAttributes) => {
      if (nodeAttributes.group === "document") {
        const nodeDate = nodeAttributes.date;
        const year = extractYear(nodeDate);
        if (year !== undefined) {
          if (year < startDate || year > endDate) {
            documentNodesToRemove.push(nodeId);
          }
        } else {
          // Optionally, remove nodes without a valid date
          documentNodesToRemove.push(nodeId);
        }
      }
    });

    // Remove the nodes after traversal to avoid modifying the graph during iteration
    documentNodesToRemove.forEach((nodeId) => {
      graph.dropNode(nodeId);
    });
  }

  return graph;
};

const computeMetrics = (graph) => {
  const metrics = {};

  metrics.totalNodes = graph.order;
  metrics.totalEdges = graph.size;
  metrics.density = density(graph).toFixed(4);

  metrics.degreeCentrality = centrality.degree(graph);
  metrics.betweennessCentrality = centrality.betweenness(graph);
  metrics.closenessCentrality = centrality.closeness(graph);

  const communities = modularity(graph);

  const communityColors = {};
  let colorIndex = 0;
  graph.forEachNode((node, attributes) => {
    const communityId = communities[node];
    if (!communityColors[communityId]) {
      communityColors[communityId] =
        colorPalette.communities[colorIndex % colorPalette.communities.length];
      colorIndex += 1;
    }
    graph.setNodeAttribute(node, "community", communityId);
    graph.setNodeAttribute(node, "color", communityColors[communityId]);
  });

  metrics.modularity = communities;

  return metrics;
};

export default fetchAndBuildGraph;
