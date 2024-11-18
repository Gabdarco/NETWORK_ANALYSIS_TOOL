// SigmaGraph.js

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Sigma,
  RelativeSize,
  ForceAtlas2,
  RandomizeNodePositions,
} from "react-sigma";
import LoadingBar from "react-top-loading-bar";
import fetchAndBuildGraph from "./fetchAndBuildGraph";
import "./sigma.css";
import { AutoComplete } from "primereact/autocomplete";
import { Slider } from '@mui/material';
import { debounce } from 'lodash'; // Install lodash if not already
import {
  FormControl,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Toast } from 'primereact/toast'; // Import Toast from primereact

export default function SigmaGraph({
  onNodeClick,
  onNodeHover,
  handleNodeunHover,
  showEdges,
  nodesUrl, 
  edgesUrl,
  body,
  edgeFilters,
  onMetricsUpdate
}) {
  const [filters, setFilters] = useState({
    person: true,
    organization: true,
    religion: true,
    document: true,
  });
  const [edgeTypeFilters, setEdgeTypeFilters] = useState(edgeFilters);
  const [selectedElement, setSelectedElement] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [metrics, setMetrics] = useState(null);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const sigmaRef = useRef(null);
  const showEdgesRef = useRef(showEdges);
  const [layoutKey, setLayoutKey] = useState(0);
  const [suggestions, setSuggestions] = useState([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [selectedTerms, setSelectedTerms] = useState([]);
  const [hasSuggestions, setHasSuggestions] = useState(false);
  const [minDate, setMinDate] = useState(1600);
  const [maxDate, setMaxDate] = useState(1800);
  const [dateValue, setDateValue] = useState([1680, 1800]); // [startDate, endDate]
  const [commitedDateValue, setCommitedDateValue] = useState([1680, 1700]);
  const toast = useRef(null); // Create a ref for Toast


  const handleZoomIn = () => {
      let sigmaInstance = sigmaRef.current.sigma;
      
      const camera = sigmaInstance.cameras[0];
      if (camera) {
        const newRatio = camera.ratio / 1.9; // Increase zoom by 20%
        camera.ratio = newRatio;
        sigmaInstance.refresh();
      }
    
  };

  const handleZoomOut = () => {
      const sigmaInstance = sigmaRef.current.sigma;
      const camera = sigmaInstance.cameras[0];
      if (camera) {
        const newRatio = camera.ratio * 1.9; // Decrease zoom by ~16.7%
        camera.ratio = newRatio;
        sigmaInstance.refresh();
      }
  };

  




  useEffect(() => {
    showEdgesRef.current = showEdges;
  }, [showEdges]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingProgress(30); // Start loading

        // Define your endpoints
        // const nodesUrl = "http://localhost:4000/nodes";
        // const edgesUrl = "http://localhost:4000/edges";

        // Fetch and build the graph with filters and date range
        const { graph, metrics: computedMetrics } = await fetchAndBuildGraph(
          nodesUrl,
          edgesUrl,
          filters,
          edgeTypeFilters,
          body,               // 'body' parameter
          selectedTerms,    // 'selectedTerms' parameter
          commitedDateValue // 'dateRange' parameter
        );

        // Convert Graphology graph to plain object with nodes and edges arrays
        const nodes = graph.nodes().map((nodeId) => ({
          id: nodeId,
          ...graph.getNodeAttributes(nodeId),
        }));

        const edges = graph.edges().map((edgeId) => ({
          id: edgeId,
          source: graph.source(edgeId),
          target: graph.target(edgeId),
          ...graph.getEdgeAttributes(edgeId),
        }));

        // Reset node positions
        nodes.forEach((node) => {
          node.x = Math.random();
          node.y = Math.random();
        });

        setGraphData({ nodes, edges });
        setMetrics(computedMetrics);
        if (onMetricsUpdate) {
          onMetricsUpdate(computedMetrics); // Pass metrics to parent
        }

        // Set suggestions after data is fetched
        if (!hasSuggestions) {
          const allNodeLabels = nodes
            .map((node) => node.label)
            .filter((label) => label !== undefined);

          // Extract keywords from document nodes
          const documentKeywords = nodes
            .filter((node) => node.group === 'document' && Array.isArray(node.keywords))
            .flatMap((node) => node.keywords)
            .filter((keyword) => keyword !== undefined);

          // Combine labels and keywords, removing duplicates
          const combinedSuggestions = Array.from(
            new Set([...allNodeLabels, ...documentKeywords])
          );

          setSuggestions(combinedSuggestions);
          setHasSuggestions(true);
        }

        setLayoutKey((prevKey) => prevKey + 1); // Force re-render to apply layout
        setLoadingProgress(70); // Data fetched
      } catch (error) {
        console.error("Error fetching graph data:", error);
        let errorMessage = error.message || "An error occurred while fetching graph data";
        if (error.message === "mnemonist/fixed-stack: `capacity` should be a positive number."){
          errorMessage = "No valid nodes or edges found for creating the graph";
        }
        if (toast.current) {
          toast.current.show({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage,
            life: 3000
          });
        }
      } finally {
        setLoadingProgress(100); // Loading complete
      }
    };

    fetchData();
  }, [filters, edgeTypeFilters, selectedTerms, commitedDateValue, onMetricsUpdate]);

  const handleNodeClick = useCallback(
    (event) => {
      const nodeId = event.data.node.id;
      const nodeData = graphData.nodes.find((node) => node.id === nodeId);

      onNodeClick(nodeData);
    },
    [graphData, onNodeClick]
  );

  const handleEdgeClick = useCallback(
    (event) => {
      const edgeId = event.data.edge.id;
      const edgeData = graphData.edges.find((edge) => edge.id === edgeId);
      setSelectedElement({
        type: "edge",
        data: edgeData,
      });
    },
    [graphData]
  );

  const handleNodeHover = useCallback(
    (event) => {
      const sigmaInstance = sigmaRef.current.sigma;
      const graphInstance = sigmaInstance.graph;

      const connectedEdges = graphInstance
        .edges()
        .filter(
          (edge) =>
            edge.source === event.data.node.id ||
            edge.target === event.data.node.id
        );

      // Show all edges connected to the node
      connectedEdges.forEach((edge) => {
        graphInstance.edges(edge.id).hidden = false;
      });

      // Hide all edges not connected to the node
      graphInstance.edges().forEach((edge) => {
        if (
          edge.source !== event.data.node.id &&
          edge.target !== event.data.node.id
        ) {
          graphInstance.edges(edge.id).hidden = true;
        }
      });

      onNodeHover(event.data.node);
      sigmaInstance.refresh();
    },
    [onNodeHover]
  );

  const handleNodeOut = useCallback(
    (event) => {
      const sigmaInstance = sigmaRef.current.sigma;
      const graphInstance = sigmaInstance.graph;

      if (showEdgesRef.current) {
        // Show all edges
        graphInstance.edges().forEach((edge) => {
          graphInstance.edges(edge.id).hidden = false;
        });
      } else {
        // Hide all edges
        graphInstance.edges().forEach((edge) => {
          graphInstance.edges(edge.id).hidden = true;
        });
      }

      handleNodeunHover();
      sigmaInstance.refresh();
    },
    [handleNodeunHover]
  );

  const handleChange = (e) => {
    setSelectedTerms(e.value);
  };

  const handleSearch = (e) => {
    const query = e.query.toLowerCase();
    const filtered = suggestions.filter(
      (item) =>
        item.toLowerCase().includes(query) && !selectedTerms.includes(item)
    );
    setFilteredSuggestions(filtered);
  };

  const handleTimeRangeChange = (event, newValue) => {
    setDateValue(newValue);
  };

  const handleTimeRangeChangeCommitted = useCallback(
    debounce((event, newValue) => {
      setCommitedDateValue(newValue);
    }, 300),
    []
  );

  return (
    <div className="container">
      <LoadingBar
        color="#f11946"
        progress={loadingProgress}
        onLoaderFinished={() => setLoadingProgress(0)}
      />

<Toast ref={toast} />


 {/* Filters Container Positioned at Bottom Right */}
 <Box
  sx={{
    position: 'absolute',
    bottom: { xs: 50, sm: 75, md: 100 },
    right: { xs: 10, sm: 20, md: 0 },
    padding: { xs: 1, sm: 2 },
    borderRadius: 1,
    boxShadow: 3,
    maxWidth: { xs: 200, sm: 250, md: 300 },
    width: '90%',
    zIndex: 100,
    maxHeight: '80vh',
    backgroundColor: '#282936',
    overflowY: 'auto',
  }}
>
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Node Filters */}
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon style={{ color: 'white' }} />}
          aria-controls="node-filters-content"
          id="node-filters-header"
          sx={{ backgroundColor: '#282936', color: 'white', padding: 0 }}
        >
          <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.2rem' }, paddingLeft: '5px' }}>
            Node Filters
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ backgroundColor: '#282936', color: 'white', padding: 1 }}>
          <FormGroup>
            {Object.keys(filters).map((nodeType) => (
              <FormControlLabel
                key={nodeType}
                control={
                  <Checkbox
                    checked={filters[nodeType]}
                    onChange={(e) => {
                      setFilters({
                        ...filters,
                        [nodeType]: e.target.checked,
                      });
                    }}
                    name={nodeType}
                    sx={{ color: 'white' }}
                  />
                }
                label={nodeType}
              />
            ))}
          </FormGroup>
        </AccordionDetails>
      </Accordion>

    {/* Edge Filters */}
    <Accordion>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon style={{ color: 'white' }} />}
        aria-controls="edge-filters-content"
        id="edge-filters-header"
        sx={{ backgroundColor: '#282936', color: 'white', padding: 0 }}
      >
        <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.2rem' }, paddingLeft: '5px' }}>
          Connection Filters
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ backgroundColor: '#282936', color: 'white', padding: 1 }}>
        <FormGroup>
          {Object.keys(edgeTypeFilters).map((edgeType) => (
            <FormControlLabel
              key={edgeType}
              control={
                <Checkbox
                  checked={edgeTypeFilters[edgeType]}
                  onChange={(e) => {
                    setEdgeTypeFilters({
                      ...edgeTypeFilters,
                      [edgeType]: e.target.checked,
                    });
                  }}
                  name={edgeType}
                  sx={{ color: 'white' }}
                />
              }
              label={edgeType}
            />
          ))}
        </FormGroup>
      </AccordionDetails>
    </Accordion>


    {/* Legend */}
    <Accordion>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon style={{ color: 'white' }} />}
        aria-controls="legend-content"
        id="legend-header"
        sx={{ backgroundColor: '#282936', color: 'white', padding: 0 }}
      >
        <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.2rem' }, paddingLeft: '5px' }}>
          Legend
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ backgroundColor: '#282936', color: 'white', padding: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {/* Nodes Section */}
          <Accordion defaultExpanded>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon style={{ color: 'white' }} />}
              aria-controls="nodes-content"
              id="nodes-header"
              sx={{ backgroundColor: '#3a3a4f', color: 'white', padding: 0 }}
            >
              <Typography variant="subtitle1" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' }, paddingLeft: '5px' }}>
                Nodes
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ backgroundColor: '#3a3a4f', color: 'white', padding: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '15px',
                    height: '15px',
                    backgroundColor: '#D3D3D3',
                    marginRight: '10px',
                  }}
                ></span>
                <span>Default Node</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '15px',
                    height: '15px',
                    backgroundColor: '#A9A9A9',
                    marginRight: '10px',
                  }}
                ></span>
                <span>Highlighted Node</span>
              </div>
            </AccordionDetails>
          </Accordion>
          
          {/* Edges Section */}
          <Accordion defaultExpanded>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon style={{ color: 'white' }} />}
              aria-controls="edges-content"
              id="edges-header"
              sx={{ backgroundColor: '#3a3a4f', color: 'white', padding: 0 }}
            >
              <Typography variant="subtitle1" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' }, paddingLeft: '5px' }}>
                Edges
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ backgroundColor: '#3a3a4f', color: 'white', padding: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '15px',
                    height: '2px',
                    backgroundColor: '#A0A0A0',
                    marginRight: '10px',
                  }}
                ></span>
                <span>Default Edge</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '15px',
                    height: '2px',
                    backgroundColor: '#505050',
                    marginRight: '10px',
                  }}
                ></span>
                <span>Highlighted Edge</span>
              </div>
              
              {/* Edge Types */}
              <Accordion defaultExpanded>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon style={{ color: 'white' }} />}
                  aria-controls="edge-types-content"
                  id="edge-types-header"
                  sx={{ backgroundColor: '#4a4a5f', color: 'white', padding: 0 }}
                >
                  <Typography variant="subtitle2" sx={{ fontSize: { xs: '0.8rem', sm: '0.9rem' }, paddingLeft: '5px' }}>
                    Edge Types
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ backgroundColor: '#4a4a5f', color: 'white', padding: 1 }}>
                  {[
                    { type: 'document', color: '#A0A0A0' },
                    { type: 'organization', color: '#808080' },
                    { type: 'religion', color: '#696969' },
                    { type: 'relationship', color: '#505050' },
                    { type: 'sender', color: '#6A5ACD' },
                    { type: 'receiver', color: '#9370DB' },
                    { type: 'mentioned', color: '#BA55D3' },
                    { type: 'author', color: '#FF69B4' },
                    { type: 'waypoint', color: '#D8BFD8' },
                    { type: 'Unknown', color: '#B0B0B0' },
                  ].map((edgeType, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '15px',
                          height: '2px',
                          backgroundColor: edgeType.color,
                        }}
                      ></span>
                      <span>{edgeType.type}</span>
                    </div>
                  ))}
                </AccordionDetails>
              </Accordion>
            </AccordionDetails>
          </Accordion>
          
          {/* Communities Section */}
          <Accordion defaultExpanded>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon style={{ color: 'white' }} />}
              aria-controls="communities-content"
              id="communities-header"
              sx={{ backgroundColor: '#3a3a4f', color: 'white', padding: 0 }}
            >
              <Typography variant="subtitle1" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' }, paddingLeft: '5px' }}>
                Communities
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ backgroundColor: '#3a3a4f', color: 'white', padding: 1 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {[
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
                ].map((color, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '15px',
                        height: '15px',
                        backgroundColor: color,
                      }}
                    ></span>
                    <span>{`Community ${index + 1}`}</span>
                  </div>
                ))}
              </div>
            </AccordionDetails>
          </Accordion>
          
        </div>
      </AccordionDetails>
    </Accordion>
  </Box>
</Box>

      <div className="sigma-container">
        <AutoComplete
          value={selectedTerms}
          suggestions={filteredSuggestions}
          completeMethod={handleSearch}
          multiple
          onChange={handleChange}
          placeholder="Search..."
        />
        {graphData.nodes.length > 0 && (
          <>
          <Sigma
            key={layoutKey} // Force re-render on layoutKey change
            graph={graphData}
            style={{ width: "100%", height: "80vh" }}
            onClickNode={handleNodeClick}
            onClickEdge={handleEdgeClick}
            onOverNode={handleNodeHover}
            onOutNode={handleNodeOut}
            settings={{
              hideEdgesOnMove: false, // Keep edges visible during movements
              drawEdges: true,        // Ensure edges are drawn
              clone: false,           // Prevent cloning the graph
            }}
            ref={sigmaRef}
          >
            <RandomizeNodePositions />
            <ForceAtlas2
              key={layoutKey} // Ensure layout restarts when layoutKey changes
              barnesHutOptimize={true}
              barnesHutTheta={0.5}
              linLogMode={false}
              outboundAttractionDistribution={false}
              adjustSizes={false}
              edgeWeightInfluence={0}
              scalingRatio={3}
              strongGravityMode={false}
              gravity={0.01}
              slowDown={5}
              startingIterations={1}
              worker={true} // Set worker to true
              // timeout={5000}
            />
            <RelativeSize initialSize={15} />
          </Sigma>
        <div className="card flex " style={{ bottom: 100, postion: 'fixed' }}>
          {/* Zoom Controls */}
    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', padding: '10px' }}>
    <Button 
            variant="contained" 
            color="primary" 
            onClick={handleZoomIn}
            aria-label="Zoom In"
            size="small"
          >
            Zoom In
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleZoomOut}
            aria-label="Zoom Out"
            size="small"
          >
            Zoom Out
          </Button>
    </div>
          <Slider 
            value={Array.isArray(dateValue) ? dateValue : [minDate, maxDate]}
            onChange={handleTimeRangeChange}
            onChangeCommitted={handleTimeRangeChangeCommitted}
            valueLabelDisplay="auto"
            min={minDate}
            max={maxDate}
            step={5}
            style={{width: "20%"}}
          />
        </div>
          </>
        )}

      </div>

      {/* Optional: Display selected element and metrics */}
      {/* 
      {selectedElement && (
        <div style={{ marginTop: "20px" }}>
          <h3>Selected {selectedElement.type}</h3>
          <pre>{JSON.stringify(selectedElement.data, null, 2)}</pre>
        </div>
      )}

      {metrics && (
        <div style={{ marginTop: "20px" }}>
          <h3>Graph Metrics</h3>
          <pre>{JSON.stringify(metrics, null, 2)}</pre>
        </div>
      )} 
      */}
    </div>
  );
}