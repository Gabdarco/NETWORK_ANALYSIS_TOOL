// EdgeTypeFilter.js
import React, { useState } from "react";
import { Checkbox } from "primereact/checkbox";

const EdgeTypeFilter = ({ onChange }) => {
  const edgeTypes = ["document", "organization", "relationship", "religion"];
  const [selectedEdgeTypes, setSelectedEdgeTypes] = useState(["document", "organization", "relationship", "religion"]);

  const handleEdgeTypeChange = (e) => {
    const { value, checked } = e.target;
    let updatedEdgeTypes;
    if (checked) {
      updatedEdgeTypes = [...selectedEdgeTypes, value];
    } else {
      updatedEdgeTypes = selectedEdgeTypes.filter((type) => type !== value);
    }
    setSelectedEdgeTypes(updatedEdgeTypes);
    onChange(updatedEdgeTypes);
  };

  return (
    <div
    style={{
      position: "absolute",
      bottom: "10px",
      right: "10px",
      background: "white",
      color: "black",
      padding: "20px", // Increased padding for more space
      borderRadius: "8px",
      boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
      fontSize: "16px", // Increased font size
      lineHeight: "1.8", // Increased line height for more space between lines
    }}
    >
      <h4>Filter Connections</h4>
      {edgeTypes.map((type) => (
        <div key={type} className="p-field-checkbox">
          <Checkbox
            inputId={type}
            value={type}
            checked={selectedEdgeTypes.includes(type)}
            onChange={handleEdgeTypeChange}
          />
          <label htmlFor={type} style={{ marginLeft: "5px" }}>
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </label>
        </div>
      ))}
    </div>
  );
};

export default EdgeTypeFilter;
