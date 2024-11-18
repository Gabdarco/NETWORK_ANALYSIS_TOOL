import React, { useEffect } from 'react';
import { Image } from 'primereact/image';

const Biography = ({ nodeData }) => {
  // useEffect(() => {
  //   console.log('Biography nodeData', nodeData);
  // }, [nodeData]);

  return nodeData.data.person.biography ? (
    <div>
      <p>{nodeData.data.person.biography}</p>
    </div>
  ) : (
    <p>No biography is available for {nodeData.data.person.fullName} yet.</p>
  );
};

export default Biography;