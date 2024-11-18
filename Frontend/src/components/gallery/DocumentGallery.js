import React, { useState, useEffect } from "react";
import { Card } from "primereact/card";
import Sidecar from '../sidecar/Sidecar';
import { Dialog } from 'primereact/dialog';
import { v4 as uuidv4 } from 'uuid';

const DocumentsGallery = ({ documents, filters, setDialogs }) => {
  const flist = filters || [];

  useEffect(() => {
    console.log(documents);
  }, [documents]);

  const formatName = (name) => {
    const names = name.split(",");
    for(let i = 0; i < names.length; i++) {
      names[i] = names[i].split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
    }
    return names.join(", ");
  };

  const handleOpenClick = (document) => {
    const id = uuidv4();
    setDialogs(prevDialogs => [...prevDialogs, { id, nodeData: { data: { document } } }]);
  };

  const createDocumentCard = (document, index) => {
    const sender = document.author ? formatName(document.author) : null;
    const receiver = document.receiver ? formatName(document.receiver) : null;
    const date = document.sortingDate;
    let bio = document.abstract;
    if (!bio) {
      bio = "No abstract available";
    }

    return (
      <div
        key={document.document || index}
        className="gallery-item"
        onClick={() => handleOpenClick(document)}
      >
<Card className="gallery-card">
          <div className="gallery-text">
            {sender && <div className="gallery-title">{`From: ${sender}`}</div>}
            {receiver && <div className="gallery-title">{`To: ${receiver}`}</div>}
            {date && <div className="gallery-subtitle">{`Date: ${date}`}</div>}
            <div className="letter-subtitle"> {`Document ID: ${document.importID}`}</div>
            <div className="gallery-bio">{bio}</div>

          </div>
        </Card>
              </div>
    );
  };

  return (
    <div className="gallery">
      {documents
        .filter(
          (document) =>
            flist.length === 0 ||
            flist.some((filter) =>
              `${document.receiver} ${document.author} ${document.sortingDate}`
                .toLowerCase()
                .includes(filter.code.toLowerCase())
            )
        )
        .map((document, index) => createDocumentCard(document, index))}
    </div>
  );
};

export default DocumentsGallery;