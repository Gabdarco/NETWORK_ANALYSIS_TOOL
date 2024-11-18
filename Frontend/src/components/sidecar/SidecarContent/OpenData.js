import React from 'react';
import { Button } from 'primereact/button';
import { Accordion, AccordionTab } from 'primereact/accordion';

const OpenData = ({ nodeData }) => {
  const { LODLOC, LODVIAF, LODwikiData } = nodeData.data.person;

  const openDataLinks = [
    { label: "LODLOC", url: LODLOC, customName: "Library of Congress" },
    { label: "LODVIAF", url: LODVIAF, customName: "Virtual International Authority File" },
    { label: "LODwikiData", url: LODwikiData, customName: "WikiData" }
  ].filter(link => link.url !== null);

  const renderHeader = (node, index) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span>{node.customName}</span>
      <Button
        icon="pi pi-external-link"
        className="p-button-rounded p-button-text"
        onClick={() => window.open(node.url, "_blank")}
      />
    </div>
  );

  return (
    <div className="sidecarBody">
      {openDataLinks.length > 0 ? (
        <Accordion multiple style={{ width: "100%", flexGrow: 1 }}>
          {openDataLinks.map((item, index) => (
            <AccordionTab key={index} header={renderHeader(item, index)}>
              <div style={{ overflow: "auto", height: "100%", maxHeight: "45vh" }}>
                <p>Link: <a href={item.url} target="_blank" rel="noopener noreferrer">{item.url}</a></p>
              </div>
            </AccordionTab>
          ))}
        </Accordion>
      ) : (
        <p>No open data found for {nodeData.data.person.fullName} yet.</p>
      )}
    </div>
  );
};

export default OpenData;