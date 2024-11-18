import React, { useState, useEffect } from "react";
import { AutoComplete } from "primereact/autocomplete";

const FilterTool = ({ graph, setGraph, originalGraph, onFilterChange }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [selectedTerms, setSelectedTerms] = useState([]);

  useEffect(() => {
    const allNodeLabels = originalGraph.nodes
      .map((node) => node.data?.person?.fullName || node.label)
      .filter((label) => label !== undefined);
    setSuggestions(allNodeLabels);
  }, [originalGraph]);

  const searchSuggestions = (event) => {
    const query = event.query.toLowerCase();
    const filtered = suggestions.filter(
      (item) =>
        item.toLowerCase().includes(query) && !selectedTerms.includes(item)
    );
    setFilteredSuggestions(filtered);
  };

  const filterGraph = (selectedNodes) => {
    if (selectedNodes.length === 0) {
      onFilterChange(originalGraph, selectedNodes);
      return;
    }

    const filteredNodes = originalGraph.nodes.filter(
      (node) =>
        (node.data?.person?.fullName !== undefined &&
          selectedNodes.includes(node.data.person.fullName)) ||
        (node.label !== undefined && selectedNodes.includes(node.label))
    );

    const connectedNodeIds = new Set(filteredNodes.map((node) => node.id));
    const immediateConnections = new Set();

    originalGraph.edges.forEach((edge) => {
      if (connectedNodeIds.has(edge.source)) {
        immediateConnections.add(edge.target);
      }
      if (connectedNodeIds.has(edge.target)) {
        immediateConnections.add(edge.source);
      }
    });

    const allFilteredNodes = originalGraph.nodes.filter(
      (node) =>
        connectedNodeIds.has(node.id) || immediateConnections.has(node.id)
    );

    const filteredEdges = originalGraph.edges.filter(
      (edge) =>
        (connectedNodeIds.has(edge.source) &&
          immediateConnections.has(edge.target)) ||
        (connectedNodeIds.has(edge.target) &&
          immediateConnections.has(edge.source))
    );

    const filteredGraph = { nodes: allFilteredNodes, edges: filteredEdges };
    onFilterChange(filteredGraph, selectedNodes);
  };

  const handleChange = (e) => {
    const terms = e.value;
    setSelectedTerms(terms);
    filterGraph(terms);
  };

  return (
    <AutoComplete
      value={selectedTerms}
      suggestions={filteredSuggestions}
      completeMethod={searchSuggestions}
      multiple
      onChange={handleChange}
      placeholder="Search..."
    />
  );
};

export default FilterTool;
