// EdgeTypeFilter.js
import React, { useState } from "react";
import { Checkbox } from "primereact/checkbox";
import { Accordion, AccordionTab } from 'primereact/accordion'


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
    // Add an Accordion to group the checkboxes
    <div
    style={{
      position: "absolute"
    }}
    >
    <Accordion multiple>
      <AccordionTab header="Filter Connections">
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
      </AccordionTab>
    </Accordion>
    </div>
  );
};

export default EdgeTypeFilter;
